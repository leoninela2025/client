import { decodeJwt } from "jose";
import { getAddress } from "viem";

const serverUrl = "http://localhost:4567"
const facilitatorUrl = "http://localhost:3002";
const receiptServiceUrl = "http://localhost:4568";

// From ack/demos/payments/src/constants.ts
const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const chainId = "eip155:84532";
const x402NetworkString = "base-sepolia";


async function createJwt(payload, signer, account) {
    // A simplified JWT creation for the browser, using jose.
    // NOTE: This is a HACK for the demo.
    const { SignJWT } = await import('jose');

    // For demo purposes, we generate a dummy key because we can't access the wallet's private key.
    // This JWT will be parsable but NOT cryptographically verifiable against the user's DID.
    // We use a symmetric key for simplicity as the signature is not meant to be verified later.
    const secret = new TextEncoder().encode('a-dummy-secret-for-demo-token-that-is-32-bytes');

    const jwt = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' }) // Using symmetric alg, as the key is not public
        .setIssuer(`did:pkh:${chainId}:${account}`)
        .sign(secret);

    // Because we can't access the wallet's private key, we can't properly sign a JWT
    // that is verifiable against the user's public DID. The receipt service needs a JWT,
    // so we create one that is parsable but not verifiable. We will adjust the receipt
    // service to handle this for the demo.
    return jwt;
}


export function generateSteps(watchId, purpose, walletClient, account) {
    let path;
    switch (purpose) {
        case 'logistics':
            path = 'logistics/quote';
            break;
        case 'warranty':
            path = 'warranty/check';
            break;
    }

    return [
        {
            label: `Step 1: Request ${purpose} Quote`,
            action: async (log) => {
                log(`📡 Sending request to ${purpose} API...`);
                try {
                    const res = await fetch(`${serverUrl}/${path}/${watchId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                    });

                    if (res.status === 402) {
                        log('💰 Payment Required: Step is gated by a 402 response.');
                        const data = await res.json();
                        log('✅ Quote challenge received:');
                        log(JSON.stringify(data, null, 2));
                        return data.paymentToken;
                    } else {
                        log(`❌ Something went wrong when fetching ${purpose} quote: Response code - ${res.status}`);
                        throw new Error(`Failed to get quote challenge. Status: ${res.status}`);
                    }
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            }
        },
        {
            label: 'Step 2: Settle micro-payment with Facilitator',
            action: async (log, paymentToken) => {
                log('✍️ Preparing transaction for facilitator...');
                if (!paymentToken) throw new Error("No payment token available");

                const decodedPaymentToken = decodeJwt(paymentToken);
                const paymentOption = decodedPaymentToken.paymentOptions.find(opt => opt.network === chainId);

                if (!paymentOption) throw new Error("No matching payment option found in token.");

                const nonceForSigning = `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex')}`;
                const validAfterTimestamp = BigInt(Math.floor(Date.now() / 1000) - 60);
                const deadlineTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600);
                const tokenNameForDomain = "USDC"; // As expected by facilitator

                const domain = {
                    name: tokenNameForDomain,
                    version: "2",
                    chainId: 84532, // Base Sepolia Chain ID
                    verifyingContract: usdcAddress,
                };

                const transferAuthorisationTypes = {
                    TransferWithAuthorization: [
                        { name: "from", type: "address" },
                        { name: "to", type: "address" },
                        { name: "value", type: "uint256" },
                        { name: "validAfter", type: "uint256" },
                        { name: "validBefore", type: "uint256" },
                        { name: "nonce", type: "bytes32" }
                    ]
                };

                const messageToSign = {
                    from: account,
                    to: getAddress(paymentOption.recipient),
                    value: BigInt(paymentOption.amount),
                    validAfter: validAfterTimestamp,
                    validBefore: deadlineTimestamp,
                    nonce: nonceForSigning
                };

                log("Please sign the transaction in your wallet...");
                const signature = await walletClient.signTypedData({
                    account,
                    domain,
                    types: transferAuthorisationTypes,
                    primaryType: "TransferWithAuthorization",
                    message: messageToSign,
                });
                log("✅ Signature obtained!");

                const x402PaymentPayload = {
                    x402Version: 1,
                    scheme: "exact",
                    network: x402NetworkString,
                    payload: {
                        signature,
                        authorization: {
                            ...messageToSign,
                            value: messageToSign.value.toString(),
                            validAfter: messageToSign.validAfter.toString(),
                            validBefore: messageToSign.validBefore.toString(),
                        },
                    },
                };

                const x402PaymentRequirements = {
                    scheme: "exact",
                    network: x402NetworkString,
                    maxAmountRequired: paymentOption.amount.toString(),
                    resource: receiptServiceUrl,
                    description: `Payment for option ${paymentOption.id}`,
                    mimeType: "application/json",
                    payTo: getAddress(paymentOption.recipient),
                    maxTimeoutSeconds: 60,
                    asset: usdcAddress,
                    extra: {
                        name: tokenNameForDomain,
                        version: domain.version,
                    },
                };

                log('📡 Sending signed transaction to facilitator...');
                const facilitatorResponse = await fetch(`${facilitatorUrl}/settle`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        paymentPayload: x402PaymentPayload,
                        paymentRequirements: x402PaymentRequirements,
                    }),
                });

                if (!facilitatorResponse.ok) {
                    const errorBody = await facilitatorResponse.text();
                    log(`❌ Error from x402 Facilitator (${facilitatorResponse.status}): ${errorBody}`);
                    throw new Error("Failed to settle payment via x402 Facilitator.");
                }

                const facilitatorJson = await facilitatorResponse.json();
                log("✅ Payment settled by facilitator:");
                log(JSON.stringify(facilitatorJson, null, 2));
                return facilitatorJson.transaction;
            },
        },
        {
            label: 'Step 3: Request verifiable receipt',
            action: async (log, paymentToken, settlementTxnHash) => {
                log('📡 Requesting verifiable receipt from receipt service...');

                const receiptServicePayload = {
                    paymentToken: paymentToken,
                    metadata: {
                        txHash: settlementTxnHash,
                        network: chainId,
                    },
                    payerDid: `did:pkh:${chainId}:${account}`,
                };
                
                // Note: The JWT created here is not properly signed with the user's DID private key
                // because we don't have access to it. The receipt service will need to be adjusted
                // to handle this for the demo.
                const signedPayloadForReceiptService = await createJwt(receiptServicePayload, walletClient, account);

                const receiptServiceApiResponse = await fetch(receiptServiceUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ payload: signedPayloadForReceiptService }),
                });

                if (!receiptServiceApiResponse.ok) {
                    const errorBody = await receiptServiceApiResponse.text();
                    log(`❌ Error from Receipt Service (${receiptServiceApiResponse.status}): ${errorBody}`);
                    throw new Error("Failed to get receipt from Receipt Service.");
                }

                const { receipt } = await receiptServiceApiResponse.json();
                log("✅ Verifiable Receipt obtained!");
                log(receipt);
                return receipt;
            },
        },
        {
            label: `Step 4: Obtaining ${purpose} quote`,
            action: async (log, receiptToken) => {
                log(`📡 Accessing protected resource with receipt...`);
                try {
                    const res = await fetch(`${serverUrl}/${path}/${watchId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${receiptToken}`,
                        },
                    });

                    if (!res.ok) {
                        const errorText = await res.text();
                        log(`❌ Unable to verify transaction: ${errorText}`);
                        throw new Error(`Failure in verifying transaction. Status: ${res.status}`);
                    }

                    const data = await res.json();
                    log(`✅ Successfully fetched: ${data.message}`);
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            },
        },
    ]
}
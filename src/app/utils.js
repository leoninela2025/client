const serverUrl = "http://localhost:4567"


export function generateSteps(watchId, purpose) {
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
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    if (res.status === 402) {
                        log('💰 Payment Required: Step is gated by a 402 response.');
                        const data = JSON.parse(await res.text()); // Store immediately in ref
                        console.log('Payment token from response:', data.paymentToken);
                        log('✅ Quote received:');
                        log(JSON.stringify(data, null, 2));

                        // Return the token so it can be used in subsequent steps
                        return data.paymentToken;
                    } else {
                        log(`❌ Something went wrong when fetching ${purpose} quote: Response code - ${res.status}`);
                    }
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            }
        },
        {
            label: 'Step 2: Settling micro-payment on chain (Base SDK)',
            action: async (log, payToken) => {
                log('📡 Sending request to facilitator to settle the payment');

                try {
                    // Get the payment token from the ref (which is updated immediately)
                    const tokenToUse = payToken;
                    console.log('Using payment token:', tokenToUse);

                    if (!tokenToUse) {
                        throw new Error("No payment token available");
                    }

                    const res = await fetch(`${serverUrl}/onchain-settlement/${purpose}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            'paymentToken': tokenToUse
                        })
                    });

                    if (res.status !== 200) {
                        throw new Error("Failure in settling on chain");
                    } else {
                        const data = JSON.parse(await res.text());
                        log(`✅ Payment made, transaction details:`);
                        log(JSON.stringify(data, null, 2));
                        return data.facilitatorJson["transaction"]
                    }
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            },
        },
        {
            label: 'Step 3: Requesting verifiable receipt using transaction hash (Catena SDK)',
            action: async (log, paymentToken, txnHash) => {
                log('📡 Sending request to receipt service to verify the payment...');


                try {
                    const requestBody = {
                        'paymentToken': paymentToken,
                        'settlementTxnHash': txnHash
                    }
                    const res = await fetch(`${serverUrl}/get-receipt/${purpose}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (res.status !== 200) {
                        throw new Error("Failure obtaining receipt ❌");

                    } else {
                        const data = JSON.parse(await res.text());
                        log(`✅ Transaction verified, receipt:`);
                        log(JSON.stringify(data, null, 2));
                        return data.receipt

                    }
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            },
        },
        {
            label: `Step 4: Obtaining ${purpose} quote for selected watch`,
            action: async (log, receiptToken) => {
                log(`📡 Sending request to ${purpose} API using authorization token obtained from receipt service`);

                try {
                    const res = await fetch(`${serverUrl}/${path}/${watchId}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${receiptToken}`
                        },
                    });

                    if (res.status !== 200) {
                        log(`❌ Unable to verify transaction`);
                        throw new Error("Failure in verifying transaction");
                    }

                    const data = JSON.parse(await res.text());
                    console.log(data);
                    log(`✅ Successfully fetched: ${data.message}`);
                } catch (err) {
                    log(`❌ Request failed: ${err.message}`);
                    throw err;
                }
            },
        },
    ]
}
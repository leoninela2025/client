'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProgressStepper from '../app/components/ProgressStepper';
import { generateSteps } from "./utils";
import { createWalletClient, custom } from 'viem';
import { baseSepolia } from 'viem/chains';

export default function Page() {
    const [showStepper, setShowStepper] = useState({});
    const [stepperRunIdLogistics, setStepperRunIdLogistics] = useState({});
    const [stepperRunIdWarranty, setStepperRunIdWarranty] = useState({});
    const [walletClient, setWalletClient] = useState(null);
    const [account, setAccount] = useState(null);

    const imageLocations = ['/swatch.png', '/guess_charolette.png', '/fossil.png'];

    const handleConnect = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const client = createWalletClient({
                    chain: baseSepolia, // You can change this to your target chain
                    transport: custom(window.ethereum)
                });
                const [address] = await client.requestAddresses();
                setWalletClient(client);
                setAccount(address);
            } catch (error) {
                console.error("Error connecting to wallet:", error);
                alert("Failed to connect wallet. See console for details.");
            }
        } else {
            alert('MetaMask is not installed. Please install it to use this feature.');
        }
    };

    return (
        <div>
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px'
            }}>
                <button
                    onClick={handleConnect}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Connect Wallet'}
                </button>
            </div>
            <div
                className="grid gap-x-12 gap-y-16 w-full"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                }}
            >
                {imageLocations.map((_, index) => (
                    <div
                        key={index + 1}
                        className="flex flex-col items-center"
                    >
                        <Link
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                if (!account) {
                                    alert('Please connect your wallet first!');
                                    return;
                                }
                                setShowStepper((prev) => ({ ...prev, [index + 1]: true }));
                            }}
                            className="flex items-center justify-center mb-4"
                        >
                            <Image
                                src={imageLocations[index]}
                                alt={`Watch #${index + 1}`}
                                width={180}
                                height={38}
                            />
                        </Link>

                        {showStepper[index + 1] && (
                            <div className="mb-4">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setStepperRunIdLogistics((prev) => ({
                                                ...prev,
                                                [index + 1]: (prev[index + 1] || 0) + 1,
                                            }));
                                        }}
                                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                    >
                                        Retry logistics quote
                                    </button>

                                    <button
                                        onClick={() => {
                                            setStepperRunIdWarranty((prev) => ({
                                                ...prev,
                                                [index + 1]: (prev[index + 1] || 0) + 1,
                                            }));
                                        }}
                                        className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                    >
                                        Retry warranty check
                                    </button>
                                </div>
                            </div>
                        )}

                        {showStepper[index + 1] && (
                            <div className="w-full">
                                <ProgressStepper
                                    key={`logistics-${stepperRunIdLogistics[index + 1] || 0}`}
                                    steps={generateSteps(index + 1, 'logistics', walletClient, account)}
                                    purpose="logistics"
                                />

                                <ProgressStepper
                                    key={`warranty-${stepperRunIdWarranty[index + 1] || 0}`}
                                    steps={generateSteps(index + 1, 'warranty', walletClient, account)}
                                    purpose="warranty"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
'use client';

import * as Progress from '@radix-ui/react-progress';
import {useEffect, useRef, useState} from 'react';

export default function ProgressStepper({ steps, purpose }) {
    const [statuses, setStatuses] = useState(Array(steps.length).fill('pending'));
    const [logsByStep, setLogsByStep] = useState(Array(steps.length).fill([]));

    const [expandedSteps, setExpandedSteps] = useState(
        Array(steps.length).fill(false) // start all collapsed
    );

    const txHashRef = useRef('');
    const paymentTokenRef = useRef('');
    const receiptToken  = useRef('');



    const hasRunRef =
        useRef(false);


    useEffect(() => {
        const runSteps = async () => {
            if (hasRunRef.current) return;
            hasRunRef.current = true;
            for (let i = 0; i < steps.length; i++) {
                updateStatus(i, 'in-progress');
                try {
                    if (i === 0) {
                        paymentTokenRef.current = await steps[i].action((msg) => log(i, msg))

                    }
                    else if (i === 1) {
                        txHashRef.current = await steps[i].action((msg) => log(i, msg), paymentTokenRef.current);
                    }
                    else if (i === 2) {
                        receiptToken.current = await steps[i].action((msg) => log(i, msg), paymentTokenRef.current, txHashRef.current);
                    }
                    else {
                        await steps[i].action((msg) => log(i, msg), receiptToken.current);
                    }
                    updateStatus(i, 'completed');
                    log(i, `✅ Completed: ${steps[i].label}`);
                } catch (e) {
                    updateStatus(i, 'failed');
                    log(i, `❌ Failed: ${steps[i].label} - ${e.message || e}`);
                    break;
                }
            }
        };

        runSteps();

    }, []);

    const updateStatus = (index, status) => {
        setStatuses((prev) => {
            const newStatuses = [...prev];
            newStatuses[index] = status;
            return newStatuses;
        });

        if (status === 'in-progress') {
            setExpandedSteps((prev) => {
                const newExpanded = [...prev];
                newExpanded[index] = true; // auto-expand this step
                return newExpanded;
            });
        }
    };


    const log = (stepIndex, message) => {
        setLogsByStep((prev) => {
            const updated = [...prev];
            updated[stepIndex] = [...(updated[stepIndex] || []), message];
            return updated;
        });
    };

    const getProgressValue = () => {
        const completed = statuses.filter((s) => s === 'completed').length;
        return (completed / steps.length) * 100;
    };

    const toggleStep = (index) => {
        setExpandedSteps((prev) => {
            const newExpanded = [...prev];
            newExpanded[index] = !newExpanded[index];
            return newExpanded;
        });
    };

    return (
        <div className="w-full p-4 space-y-4">
            {/* Progress bar */}
            <Progress.Root
                className="relative overflow-hidden bg-gray-200 rounded-full h-4"
                value={getProgressValue()}
            >
                <Progress.Indicator
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${getProgressValue()}%` }}
                />
            </Progress.Root>
            {(() => {
                switch (purpose) {
                    case 'logistics':
                        return <div style={{ fontStyle: 'italic' }}>Requesting logistics</div>;
                    case 'warranty':
                        return <div style={{ fontStyle: 'italic' }}>Checking warranty</div>;
                    default:
                        return null;
                }
            })()}

            {/* Expand / Collapse All */}
            <div className="flex gap-4 mb-4">
                <button
                    onClick={() =>
                        setExpandedSteps(Array(steps.length).fill(true))
                    }
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                    Expand All
                </button>
                <button
                    onClick={() =>
                        setExpandedSteps(Array(steps.length).fill(false))
                    }
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                >
                    Collapse All
                </button>
            </div>

            {/* Steps list */}
            <ul className="space-y-2">
                {steps.map((step, i) => (
                    <li
                        key={i}
                        className="rounded border border-gray-200"
                    >
                        {/* Step header */}
                        <div
                            onClick={() => toggleStep(i)}
                            className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100"
                        >
            <span
                className={`w-3 h-3 rounded-full ${
                    statuses[i] === 'completed'
                        ? 'bg-green-500'
                        : statuses[i] === 'in-progress'
                            ? 'bg-yellow-400'
                            : statuses[i] === 'failed'
                                ? 'bg-red-500'
                                : 'bg-gray-300'
                }`}
            ></span>
                            <span className="font-medium">{step.label}</span>
                            <span className="ml-auto text-gray-500">
              {expandedSteps[i] ? '▾' : '▸'}
            </span>
                        </div>

                        {/* Log box */}
                        {expandedSteps[i] && (
                            <div
                                className="bg-black text-white p-2 text-sm font-mono max-h-40 overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {logsByStep[i]?.map((log, j) => (
                                    <div key={j}>{log}</div>
                                ))}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            {txHashRef.current && (
                <div className="pt-4 text-center text-sm text-gray-600">
                    View your transaction on{' '}
                    <a
                        href={`https://sepolia.basescan.org/tx/${txHashRef.current}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        Base Sepolia Etherscan
                    </a>
                </div>
            )}
        </div>
    );

}

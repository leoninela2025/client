'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ProgressStepper from '../app/components/ProgressStepper';
import {generateSteps} from "./utils";

export default function Page() {

    const [showStepper, setShowStepper] = useState({});
    const [stepperRunIdLogistics, setStepperRunIdLogistics] = useState({});
    const [stepperRunIdWarranty, setStepperRunIdWarranty] = useState({});


    const imageLocations = ['/swatch.png', '/guess_charolette.png', '/fossil.png']



    return (
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
                    {/* Watch Image */}
                    <Link
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowStepper((prev) => ({...prev, [index + 1]: true}));
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

                    {/* Progress Stepper */}
                    {showStepper[index + 1] && (
                        <div className="w-full">
                            <ProgressStepper
                                key={`logistics-${stepperRunIdLogistics[index + 1] || 0}`}
                                steps={generateSteps(index + 1, 'logistics')}
                                purpose="logistics"
                            />

                            <ProgressStepper
                                key={`warranty-${stepperRunIdWarranty[index + 1] || 0}`}
                                steps={generateSteps(index + 1, 'warranty')}
                                purpose="warranty"
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>

    );
}
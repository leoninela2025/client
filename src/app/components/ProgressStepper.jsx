'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function ProgressStepper({ steps, purpose, onComplete, start }) {
    const [statuses, setStatuses] = useState(Array(steps.length).fill('pending'));
    const [logsByStep, setLogsByStep] = useState(Array(steps.length).fill([]));
    const [accordionValue, setAccordionValue] = useState([]);

    const txHashRef = useRef('');
    const paymentTokenRef = useRef('');
    const receiptToken  = useRef('');
    const hasRunRef = useRef(false);

    useEffect(() => {
        const runSteps = async () => {
            if (hasRunRef.current || !start) return;
            hasRunRef.current = true;
            let allStepsCompleted = true;

            setAccordionValue([`item-0`]);

            for (let i = 0; i < steps.length; i++) {
                updateStatus(i, 'in-progress');
                try {
                    if (i === 0) {
                        paymentTokenRef.current = await steps[i].action((msg) => log(i, msg))
                    } else if (i === 1) {
                        txHashRef.current = await steps[i].action((msg) => log(i, msg), paymentTokenRef.current);
                    } else if (i === 2) {
                        receiptToken.current = await steps[i].action((msg) => log(i, msg), paymentTokenRef.current, txHashRef.current);
                    } else {
                        await steps[i].action((msg) => log(i, msg), receiptToken.current);
                    }
                    updateStatus(i, 'completed');
                    log(i, `✅ Completed: ${steps[i].label}`);
                    
                    if (i + 1 < steps.length) {
                        setAccordionValue(prev => [...prev, `item-${i+1}`]);
                    }
                } catch (e) {
                    updateStatus(i, 'failed');
                    log(i, `❌ Failed: ${steps[i].label} - ${e.message || e}`);
                    allStepsCompleted = false;
                    break;
                }
            }
            if (allStepsCompleted && onComplete) {
                onComplete();
            }
        };

        runSteps();
    }, [start, steps]);

    const updateStatus = (index, status) => {
        setStatuses((prev) => {
            const newStatuses = [...prev];
            newStatuses[index] = status;
            return newStatuses;
        });
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
    
    const expandAll = () => {
        setAccordionValue(steps.map((_, i) => `item-${i}`));
    }
    
    const collapseAll = () => {
        setAccordionValue([]);
    }

    return (
        <div className="w-full space-y-4">
            <p className="text-sm text-muted-foreground capitalize italic">
              {purpose === 'logistics' ? 'Requesting logistics' : 'Checking warranty'}
            </p>

            <Progress value={getProgressValue()} className="w-full" />
            
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
                <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
            </div>

            <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">
                {steps.map((step, i) => (
                    <AccordionItem value={`item-${i}`} key={i}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <span className={cn("w-3 h-3 rounded-full", {
                                    'bg-green-500': statuses[i] === 'completed',
                                    'bg-yellow-400 animate-pulse': statuses[i] === 'in-progress',
                                    'bg-red-500': statuses[i] === 'failed',
                                    'bg-muted': statuses[i] === 'pending'
                                })} />
                                <span className="font-medium text-sm text-left">{step.label}</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                             <div className="bg-muted text-muted-foreground rounded-md p-3 text-xs font-mono max-h-40 overflow-y-auto">
                                {(logsByStep[i]?.length > 0) ? logsByStep[i].map((log, j) => (
                                    <div key={j}>{log}</div>
                                )) : "No logs yet."}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
            
            {txHashRef.current && (
                <div className="pt-4 text-center text-sm text-muted-foreground">
                    View your transaction on{' '}
                    <a
                        href={`https://sepolia.basescan.org/tx/${txHashRef.current}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Base Sepolia Etherscan
                    </a>
                </div>
            )}
        </div>
    );
}

'use client';

import {
  useAuthModal,
  useLogout,
  useSigner,
  useUser,
} from "@account-kit/react";
import Image from 'next/image';
import { useState } from 'react';
import ProgressStepper from './components/ProgressStepper';
import { generateSteps } from "./utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export default function Page() {
    const [showStepper, setShowStepper] = useState({});
    const [stepperRunIdLogistics, setStepperRunIdLogistics] = useState({});
    const [stepperRunIdWarranty, setStepperRunIdWarranty] = useState({});
    const [logisticsComplete, setLogisticsComplete] = useState({});
    const [showWalletAlert, setShowWalletAlert] = useState(false);

    const { openAuthModal } = useAuthModal();
    const { logout } = useLogout();
    const user = useUser();
    const { signer, status: signerStatus } = useSigner() || {};

    const products = [
        { name: "ChronoMark", model: "Mark II", image: "/swatch.png" },
        { name: "Guess", model: "Charolette", image: "/guess_charolette.png" },
        { name: "Fossil", model: "Chrono", image: "/fossil.png" },
    ];

    const handleStartPurchase = (index) => {
        if (!user) {
            setShowWalletAlert(true);
            return;
        }
        setShowStepper((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    const isConnected = user != null;

    return (
        <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <h1 className="text-xl font-bold">Modern Timepieces</h1>
                    {signerStatus === 'initializing' ? <Button>Loading...</Button> :
                        <Button onClick={!isConnected ? openAuthModal : logout}>
                            {isConnected ? `Sign Out` : 'Sign In'}
                        </Button>
                    }
                </div>
            </header>

            <main className="flex-grow container py-8">
                <div
                    className="grid gap-8"
                    style={{
                        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                    }}
                >
                    {products.map((product, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader>
                                <CardTitle>{product.name}</CardTitle>
                                <CardDescription>{product.model} Edition</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <div className="bg-muted rounded-lg flex items-center justify-center p-4 mb-4">
                                     <Image
                                        src={product.image}
                                        alt={`Watch: ${product.name}`}
                                        width={200}
                                        height={200}
                                        className="object-contain h-[200px]"
                                    />
                                </div>
                                
                                {showStepper[index] && <Separator className="my-4" />}

                                {showStepper[index] && (
                                    <div className="space-y-4">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setStepperRunIdLogistics((prev) => ({
                                                        ...prev,
                                                        [index]: (prev[index] || 0) + 1,
                                                    }));
                                                }}
                                            >
                                                Retry logistics
                                            </Button>

                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={!logisticsComplete[index]}
                                                onClick={() => {
                                                    setStepperRunIdWarranty((prev) => ({
                                                        ...prev,
                                                        [index]: (prev[index] || 0) + 1,
                                                    }));
                                                }}
                                            >
                                                Retry warranty
                                            </Button>
                                        </div>

                                        <ProgressStepper
                                            key={`logistics-${stepperRunIdLogistics[index] || 0}`}
                                            steps={generateSteps(index + 1, 'logistics', signer, user?.smartAccountAddress)}
                                            purpose="logistics"
                                            start={true}
                                            onComplete={() => {
                                                setLogisticsComplete((prev) => ({...prev, [index]: true}))
                                            }}
                                        />

                                        {logisticsComplete[index] && <ProgressStepper
                                            key={`warranty-${stepperRunIdWarranty[index] || 0}`}
                                            steps={generateSteps(index + 1, 'warranty', signer, user?.smartAccountAddress)}
                                            purpose="warranty"
                                            start={logisticsComplete[index]}
                                        />}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full" onClick={() => handleStartPurchase(index)}>
                                    {showStepper[index] ? "Hide Purchase Details" : "Order Now"}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </main>

            <AlertDialog open={showWalletAlert} onOpenChange={setShowWalletAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Please Sign In</AlertDialogTitle>
                        <AlertDialogDescription>
                            To begin the purchase process, you need to sign in with your wallet.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            setShowWalletAlert(false);
                            openAuthModal();
                        }}>Sign In</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
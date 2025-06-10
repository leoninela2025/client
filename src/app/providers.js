"use client";

import { AlchemyAccountProvider } from "@account-kit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "../config";

const queryClient = new QueryClient();

export const Providers = ({ children, initialState }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AlchemyAccountProvider
        config={config}
        queryClient={queryClient}
        initialState={initialState}
      >
        {children}
      </AlchemyAccountProvider>
    </QueryClientProvider>
  );
}; 
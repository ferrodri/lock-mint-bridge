'use client';

import { RainbowKitProvider, darkTheme, getDefaultConfig, lightTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { WagmiProvider, http } from 'wagmi';
import { baseSepolia, optimismSepolia } from 'wagmi/chains';

// Arkiv Blue — keeps RainbowKit's modal accent on-brand.
const ARKIV_BLUE = '#181EA9';

const wagmiConfig = getDefaultConfig({
  appName: 'Lock-Mint Bridge',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [optimismSepolia, baseSepolia],
  transports: {
    [optimismSepolia.id]: http(),
    [baseSepolia.id]: http()
  },
  ssr: true
});

type ProvidersProps = {
  children: React.ReactNode;
};

export const Providers = ({ children }: ProvidersProps) => {
  /**
   * Client-only usage (polling), no server prefetch/hydration, so the useState initializer is the documented, correct setup.
   *
   * @see {@link https://tanstack.com/query/latest/docs/framework/react/guides/ssr}
   */
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ThemedProviders>{children}</ThemedProviders>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

const ThemedProviders = ({ children }: ProvidersProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <>
      <RainbowKitProvider
        theme={isDark ? darkTheme({ accentColor: ARKIV_BLUE }) : lightTheme({ accentColor: ARKIV_BLUE })}
        modalSize="compact"
        initialChain={optimismSepolia}
      >
        {children}
      </RainbowKitProvider>
      <ToastContainer position="bottom-right" theme={isDark ? 'dark' : 'light'} autoClose={4000} hideProgressBar />
    </>
  );
};

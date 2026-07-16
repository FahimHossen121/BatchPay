'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { darkTheme, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { cookieToInitialState, type State, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from 'next-themes';
import { config } from '@/rainbowKitConfig';

const rainbowKitTheme = {
  lightMode: lightTheme({
    accentColor: '#0969da',
    accentColorForeground: '#ffffff',
    borderRadius: 'small',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
  darkMode: darkTheme({
    accentColor: '#58a6ff',
    accentColorForeground: '#0d1117',
    borderRadius: 'small',
    fontStack: 'system',
    overlayBlur: 'small',
  }),
};

function WalletProviders({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState: State | undefined;
}) {
  const { resolvedTheme } = useTheme();
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  const rainbowKitThemeMode =
    mounted && resolvedTheme === 'light' ? rainbowKitTheme.lightMode : rainbowKitTheme.darkMode;

  useEffect(() => {
    const timeout = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={rainbowKitThemeMode}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({
  children,
  wagmiCookie,
}: {
  children: React.ReactNode;
  wagmiCookie: string | null;
}) {
  const [initialState] = useState(() => cookieToInitialState(config, wagmiCookie));

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <WalletProviders initialState={initialState}>{children}</WalletProviders>
    </ThemeProvider>
  );
}

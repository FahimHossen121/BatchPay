'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { darkTheme, lightTheme, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from 'next-themes';
import { config } from '@/rainbowKitConfig';

const queryClient = new QueryClient();

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

function WalletProviders({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          theme={resolvedTheme === 'light' ? rainbowKitTheme.lightMode : rainbowKitTheme.darkMode}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <WalletProviders>{children}</WalletProviders>
    </ThemeProvider>
  );
}

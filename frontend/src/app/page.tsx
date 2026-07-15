'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">BatchPay</h1>
      <p className="text-sm text-gray-500">
        Gas-efficient ERC20 batch transfer
      </p>
      <ConnectButton />
    </main>
  );
}
'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useReadContracts } from 'wagmi';
import { isAddress } from 'viem';
import { erc20Abi } from '@/erc20Abi';

export default function Home() {
  const [tokenInput, setTokenInput] = useState('');

  const tokenAddress = isAddress(tokenInput) ? tokenInput : undefined;

  const { data, isLoading, isError } = useReadContracts({
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'name' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'symbol' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'decimals' },
    ],
    query: { enabled: !!tokenAddress },
  });

  const [name, symbol, decimals] = data ?? [];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">BatchPay</h1>
      <p className="text-sm text-gray-500">Gas-efficient ERC20 batch transfer</p>
      <ConnectButton />

      <input
        type="text"
        placeholder="Token address (0x...)"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        className="border rounded px-3 py-2 w-96 text-sm"
      />

      {tokenInput && !tokenAddress && (
        <p className="text-sm text-red-500">This doesn&apos;t look like a valid address.</p>
      )}

      {tokenAddress && isLoading && (
        <p className="text-sm text-gray-500">Loading token info...</p>
      )}

      {tokenAddress && isError && (
        <p className="text-sm text-red-500">
          This doesn&apos;t look like a valid ERC20 token.
        </p>
      )}

      {tokenAddress && name?.result && symbol?.result && decimals?.result !== undefined && (
        <div className="text-sm text-center">
          <p className="font-medium">{name.result} ({symbol.result})</p>
          <p className="text-gray-500">Decimals: {decimals.result}</p>
        </div>
      )}
    </main>
  );
}
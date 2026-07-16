'use client';

import { useState } from 'react';
import { useReadContracts } from 'wagmi';
import { isAddress } from 'viem';
import { erc20Abi } from '@/lib/erc20Abi';
import { RecipientInput } from '@/components/RecipientInput';
import type { ParsedEntry } from '@/lib/parseRecipients';

export default function Home() {
  const [tokenInput, setTokenInput] = useState('');
  const [entries, setEntries] = useState<ParsedEntry[] | null>(null);

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
      <p className="text-sm text-[var(--color-text-secondary)]">Gas-efficient ERC20 batch transfer</p>

      <input
        type="text"
        placeholder="Token address (0x...)"
        value={tokenInput}
        onChange={(e) => setTokenInput(e.target.value)}
        className="w-full max-w-96 rounded-md border bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]"
        style={{ borderColor: 'var(--color-border)' }}
      />

      {tokenInput && !tokenAddress && (
        <p className="text-sm text-[var(--color-error)]">This doesn&apos;t look like a valid address.</p>
      )}

      {tokenAddress && isLoading && (
        <p className="text-sm text-[var(--color-text-secondary)]">Loading token info...</p>
      )}

      {tokenAddress && isError && (
        <p className="text-sm text-[var(--color-error)]">
          This doesn&apos;t look like a valid ERC20 token.
        </p>
      )}

      {tokenAddress && name?.result && symbol?.result && decimals?.result !== undefined && (
        <>
          <div className="text-sm text-center">
            <p className="font-medium">{name.result} ({symbol.result})</p>
            <p className="text-[var(--color-text-secondary)]">Decimals: {decimals.result}</p>
          </div>

          <RecipientInput onValidEntries={setEntries} />

          {entries && (
            <p className="text-sm text-[var(--color-text-secondary)]">
              Ready to preview {entries.length} recipient{entries.length !== 1 ? 's' : ''}.
            </p>
          )}
        </>
      )}
    </main>
  );
}

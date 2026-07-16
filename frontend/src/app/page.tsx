'use client';

import { useMemo, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { formatUnits, isAddress } from 'viem';
import { erc20Abi } from '@/lib/erc20Abi';
import { RecipientInput } from '@/components/RecipientInput';
import { toContractArrays, type ParsedEntry } from '@/lib/parseRecipients';

type TransferPreview =
  | {
      error: null;
      recipientCount: number;
      totalRaw: bigint;
      totalFormatted: string;
    }
  | {
      error: string;
    };

function getDecimalPlaceError(entries: ParsedEntry[], tokenDecimals: number) {
  for (const [index, entry] of entries.entries()) {
    const decimalPart = entry.amount.split('.')[1] ?? '';

    if (decimalPart.length > tokenDecimals) {
      return `Entry ${index + 1}: "${entry.amount}" has ${decimalPart.length} decimal places, but this token only supports ${tokenDecimals}.`;
    }
  }

  return null;
}

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
  const tokenName = name?.result;
  const tokenSymbol = symbol?.result;
  const tokenDecimals = decimals?.result;
  const tokenLoaded =
    tokenAddress &&
    typeof tokenName === 'string' &&
    typeof tokenSymbol === 'string' &&
    typeof tokenDecimals === 'number';

  const preview = useMemo<TransferPreview | null>(() => {
    if (!entries || typeof tokenDecimals !== 'number') return null;

    const decimalPlaceError = getDecimalPlaceError(entries, tokenDecimals);
    if (decimalPlaceError) {
      return { error: decimalPlaceError };
    }

    try {
      const { amounts } = toContractArrays(entries, tokenDecimals);
      const totalRaw = amounts.reduce((total, amount) => total + amount, BigInt(0));

      return {
        error: null,
        recipientCount: entries.length,
        totalRaw,
        totalFormatted: formatUnits(totalRaw, tokenDecimals),
      };
    } catch {
      return {
        error: `One or more amounts has more decimal places than this token supports (${tokenDecimals}).`,
      };
    }
  }, [entries, tokenDecimals]);

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

      {tokenLoaded && (
        <>
          <div className="text-sm text-center">
            <p className="font-medium">{tokenName} ({tokenSymbol})</p>
            <p className="text-[var(--color-text-secondary)]">Decimals: {tokenDecimals}</p>
          </div>

          <RecipientInput onValidEntries={setEntries} />

          <div
            className="w-full max-w-96 rounded-md border bg-[var(--color-bg-secondary)] p-4 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <p className="font-medium">Token compatibility notice</p>
            <p className="mt-1 text-[var(--color-text-secondary)]">
              BatchPay is designed for standard ERC20 tokens. Fee-on-transfer or rebasing tokens may not behave as expected.
            </p>
          </div>

          {preview?.error && (
            <p className="text-sm text-[var(--color-error)]">{preview.error}</p>
          )}

          {preview && preview.error === null && (
            <div
              className="w-full max-w-96 rounded-md border bg-[var(--color-bg-secondary)] p-4 text-sm"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <p className="font-medium">Preview</p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                <dt className="text-[var(--color-text-secondary)]">Token</dt>
                <dd className="text-right">{tokenName} ({tokenSymbol})</dd>
                <dt className="text-[var(--color-text-secondary)]">Recipients</dt>
                <dd className="text-right">{preview.recipientCount}</dd>
                <dt className="text-[var(--color-text-secondary)]">Total</dt>
                <dd className="text-right">{preview.totalFormatted} {tokenSymbol}</dd>
                <dt className="text-[var(--color-text-secondary)]">Raw units</dt>
                <dd className="break-all text-right">{preview.totalRaw.toString()}</dd>
              </dl>
            </div>
          )}
        </>
      )}
    </main>
  );
}

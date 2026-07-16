'use client';

import { useState, useMemo, useEffect } from 'react';
import { parsePairedInput, parseCombinedInput, type ParsedEntry } from '@/lib/parseRecipients';

type Mode = 'paired' | 'combined';

export function RecipientInput({
  onValidEntries,
}: {
  onValidEntries: (entries: ParsedEntry[] | null) => void;
}) {
  const [mode, setMode] = useState<Mode>('paired');
  const [recipientsText, setRecipientsText] = useState('');
  const [amountsText, setAmountsText] = useState('');
  const [combinedText, setCombinedText] = useState('');

  const result = useMemo(() => {
    if (mode === 'paired') {
      if (!recipientsText && !amountsText) return null;
      return parsePairedInput(recipientsText, amountsText);
    } else {
      if (!combinedText) return null;
      return parseCombinedInput(combinedText);
    }
  }, [mode, recipientsText, amountsText, combinedText]);

  useEffect(() => {
    onValidEntries(result?.success ? result.entries : null);
  }, [result, onValidEntries]);

  function switchMode(next: Mode) {
    const hasInput = recipientsText || amountsText || combinedText;
    if (hasInput && !confirm('Switching input mode will clear your current entries. Continue?')) {
      return;
    }
    setRecipientsText('');
    setAmountsText('');
    setCombinedText('');
    setMode(next);
  }

  const modeButtonClass =
    'rounded-md border px-3 py-1 transition-colors hover:bg-[var(--color-bg-secondary)]';
  const activeModeButtonClass =
    'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]';
  const inactiveModeButtonClass =
    'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]';
  const inputClass =
    'rounded-md border bg-[var(--color-bg-secondary)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent)]';

  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => switchMode('paired')}
          className={`${modeButtonClass} ${mode === 'paired' ? activeModeButtonClass : inactiveModeButtonClass}`}
        >
          Paired lists
        </button>
        <button
          type="button"
          onClick={() => switchMode('combined')}
          className={`${modeButtonClass} ${mode === 'combined' ? activeModeButtonClass : inactiveModeButtonClass}`}
        >
          Combined (address,amount)
        </button>
      </div>

      {mode === 'paired' ? (
        <>
          <textarea
            placeholder={'Recipients — one per line or comma-separated\n0xABC...\n0xDEF...'}
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            className={`${inputClass} h-28`}
          />
          <textarea
            placeholder={'Amounts — same order as recipients\n5.5\n10'}
            value={amountsText}
            onChange={(e) => setAmountsText(e.target.value)}
            className={`${inputClass} h-28`}
          />
        </>
      ) : (
        <textarea
          placeholder={'One per line: address,amount\n0xABC...,5.5\n0xDEF...,10'}
          value={combinedText}
          onChange={(e) => setCombinedText(e.target.value)}
          className={`${inputClass} h-40`}
        />
      )}

      {result && !result.success && (
        <p className="text-sm text-[var(--color-error)]">{result.error}</p>
      )}
      {result && result.success && (
        <p className="text-sm text-[var(--color-success)]">
          {result.entries.length} recipient{result.entries.length !== 1 ? 's' : ''} parsed successfully.
        </p>
      )}
    </div>
  );
}

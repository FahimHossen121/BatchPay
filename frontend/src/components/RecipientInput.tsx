'use client';

import { useState, useMemo } from 'react';
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

  useMemo(() => {
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

  return (
    <div className="flex flex-col gap-3 w-96">
      <div className="flex gap-2 text-sm">
        <button
          onClick={() => switchMode('paired')}
          className={`px-3 py-1 rounded ${mode === 'paired' ? 'bg-black text-white' : 'bg-gray-200'}`}
        >
          Paired lists
        </button>
        <button
          onClick={() => switchMode('combined')}
          className={`px-3 py-1 rounded ${mode === 'combined' ? 'bg-black text-white' : 'bg-gray-200'}`}
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
            className="border rounded px-3 py-2 text-sm h-28"
          />
          <textarea
            placeholder={'Amounts — same order as recipients\n5.5\n10'}
            value={amountsText}
            onChange={(e) => setAmountsText(e.target.value)}
            className="border rounded px-3 py-2 text-sm h-28"
          />
        </>
      ) : (
        <textarea
          placeholder={'One per line: address,amount\n0xABC...,5.5\n0xDEF...,10'}
          value={combinedText}
          onChange={(e) => setCombinedText(e.target.value)}
          className="border rounded px-3 py-2 text-sm h-40"
        />
      )}

      {result && !result.success && (
        <p className="text-sm text-red-500">{result.error}</p>
      )}
      {result && result.success && (
        <p className="text-sm text-green-600">
          {result.entries.length} recipient{result.entries.length !== 1 ? 's' : ''} parsed successfully.
        </p>
      )}
    </div>
  );
}
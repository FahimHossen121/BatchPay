import { isAddress, parseUnits } from 'viem';

export type ParsedEntry = { address: string; amount: string };

export type ParseResult =
  | { success: true; entries: ParsedEntry[] }
  | { success: false; error: string };

function buildResult(entries: ParsedEntry[]): ParseResult {
  if (entries.length === 0) {
    return { success: false, error: 'Recipient list is empty.' };
  }
  for (const [i, entry] of entries.entries()) {
    if (!isAddress(entry.address)) {
      return { success: false, error: `Line ${i + 1}: "${entry.address}" is not a valid address.` };
    }
    if (!entry.amount || isNaN(Number(entry.amount)) || Number(entry.amount) <= 0) {
      return { success: false, error: `Line ${i + 1}: "${entry.amount}" is not a valid positive amount.` };
    }
  }
  return { success: true, entries };
}

export function parsePairedInput(recipientsRaw: string, amountsRaw: string): ParseResult {
  const recipients = recipientsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  const amounts = amountsRaw.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

  if (recipients.length !== amounts.length) {
    return {
      success: false,
      error: `Recipient count (${recipients.length}) doesn't match amount count (${amounts.length}).`,
    };
  }

  const entries = recipients.map((address, i) => ({ address, amount: amounts[i] }));
  return buildResult(entries);
}

export function parseCombinedInput(raw: string): ParseResult {
  const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);

  const entries: ParsedEntry[] = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.split(',').map((s) => s.trim());
    if (parts.length !== 2) {
      return { success: false, error: `Line ${i + 1}: expected "address,amount", got "${line}".` };
    }
    entries.push({ address: parts[0], amount: parts[1] });
  }

  return buildResult(entries);
}

export function toContractArrays(
  entries: ParsedEntry[],
  decimals: number
): { recipients: `0x${string}`[]; amounts: bigint[] } {
  return {
    recipients: entries.map((e) => e.address as `0x${string}`),
    amounts: entries.map((e) => parseUnits(e.amount, decimals)),
  };
}
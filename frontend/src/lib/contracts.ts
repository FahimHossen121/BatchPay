import { anvil, sepolia } from 'wagmi/chains';

const ANVIL_BATCHPAY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export function getBatchPayAddress(chainId: number | undefined): `0x${string}` | undefined {
  if (!chainId) return undefined;

  if (chainId === anvil.id) {
    return (process.env.NEXT_PUBLIC_BATCHPAY_ADDRESS || ANVIL_BATCHPAY_ADDRESS) as `0x${string}`;
  }

  if (chainId === sepolia.id && process.env.NEXT_PUBLIC_BATCHPAY_ADDRESS) {
    return process.env.NEXT_PUBLIC_BATCHPAY_ADDRESS as `0x${string}`;
  }

  return undefined;
}

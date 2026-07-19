import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { BaseError, formatUnits, UserRejectedRequestError } from 'viem';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// A wallet rejection (user declined the signature) is a cancel, not a failure — callers ignore it silently.
export function isUserRejection(error: unknown): boolean {
  return error instanceof BaseError && Boolean(error.walk((e) => e instanceof UserRejectedRequestError));
}

export function formatBalance(value: bigint | undefined, decimals = 18): string {
  if (!value) {
    return '0';
  }
  const amount = parseFloat(formatUnits(value, decimals));
  if (amount === 0) {
    return '0';
  }
  if (amount < 0.01) {
    return '<0.01';
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// viem/wagmi errors carry a concise `shortMessage`; prefer it over the raw message.
export function toErrorMessage(error: unknown): string {
  if (error instanceof BaseError) {
    return error.shortMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

export function shortAddress({
  address,
  startLength,
  endLength
}: {
  address: `0x${string}`;
  startLength: number;
  endLength: number;
}) {
  return address && [address.substring(0, startLength), address.substring(address.length - endLength)].join('...');
}

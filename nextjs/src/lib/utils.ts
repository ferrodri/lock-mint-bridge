import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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

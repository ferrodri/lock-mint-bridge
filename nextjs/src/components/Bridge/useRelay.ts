'use client';

import { useEffect } from 'react';
import { useBridgeContext } from './context';

// No relayer yet: once the lock confirms we simulate the destination mint after this delay.
// Real relayer/event polling of the destination token's balanceOf on Base Sepolia would replace the timer.
export const DESTINATION_MOCK_MS = 12_000;

// TODO: this once we have the relayer
// Owns the destination leg: while waiting, drives the flow to complete once the mint lands.
export function useRelay() {
  const { phase, complete } = useBridgeContext();

  useEffect(() => {
    if (phase !== 'waiting') {
      return;
    }
    const timer = setTimeout(() => complete(), DESTINATION_MOCK_MS);
    return () => clearTimeout(timer);
  }, [phase, complete]);
}

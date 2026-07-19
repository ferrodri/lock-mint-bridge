import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Base Sepolia is intentionally not a connectable wallet chain (so it triggers the switch
// prompt). This read-only client lets us still query Token B state on Base.
export const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

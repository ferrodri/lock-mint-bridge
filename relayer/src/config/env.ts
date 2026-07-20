import { z } from 'zod';
import type { Account, Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const httpRpcUrl = z.url({ protocol: /^https?$/, hostname: /.+/, error: 'must be an http:// or https:// URL' });

const schema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SOURCE_RPC_URL: httpRpcUrl,
  DEST_RPC_URL: httpRpcUrl,
  RELAYER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'must be 0x-prefixed 32-byte hex')
});

export interface AppEnv {
  databaseUrl: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  sourceRpcUrl: string;
  destRpcUrl: string;
  relayerAccount: Account;
  relayerAddress: Address;
}

let cached: AppEnv | null = null;

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  if (cached) return cached;
  const parsed = schema.parse(env);
  const relayerAccount = privateKeyToAccount(parsed.RELAYER_PRIVATE_KEY as `0x${string}`);

  cached = {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    sourceRpcUrl: parsed.SOURCE_RPC_URL,
    destRpcUrl: parsed.DEST_RPC_URL,
    relayerAccount,
    relayerAddress: relayerAccount.address.toLowerCase() as Address
  };
  return cached;
}

import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from 'viem';
import { DEST_CHAIN, SOURCE_CHAIN } from '../config/chains';
import type { AppEnv } from '../config/env';

export interface RpcClients {
  // Reads lock events on the source chain.
  sourceClient: PublicClient;
  // Reads head/receipts and broadcasts deliver() txs on the destination chain.
  destClient: PublicClient;
  destWallet: WalletClient;
}

export function buildRpcClients(env: AppEnv): RpcClients {
  const sourceClient = createPublicClient({
    chain: SOURCE_CHAIN,
    transport: http(env.sourceRpcUrl, { batch: true })
  }) as PublicClient;

  const destClient = createPublicClient({
    chain: DEST_CHAIN,
    transport: http(env.destRpcUrl, { batch: true })
  }) as PublicClient;

  const destWallet = createWalletClient({
    account: env.relayerAccount,
    chain: DEST_CHAIN,
    transport: http(env.destRpcUrl)
  });

  return { sourceClient, destClient, destWallet };
}

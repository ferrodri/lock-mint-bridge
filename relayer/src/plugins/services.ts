import fp from 'fastify-plugin';
import type { PublicClient } from 'viem';
import { loadEnv } from '../config/env';
import { FeesPerGasCache } from '../services/feesPerGasCache';
import { LockVerifier } from '../services/lockVerifier';
import { MintProcessor } from '../services/mintProcessor';
import { MintSender } from '../services/mintSender';
import { Reconciler } from '../services/reconciler';
import { buildRpcClients } from '../services/rpcClients';
import { StuckTransactionMonitor } from '../services/stuckTransactionMonitor';

export default fp(
  async (fastify) => {
    const env = loadEnv();
    const log = fastify.log;

    const { sourceClient, destClient, destWallet } = buildRpcClients(env);

    // The POST /locks route decodes the lock receipt on the source chain.
    fastify.decorate('sourceClient', sourceClient);

    // Fee cache must be populated before the sender signs anything.
    const feesPerGasCache = new FeesPerGasCache(destClient, log);
    await feesPerGasCache.fetch();
    feesPerGasCache.start();

    const mintSender = new MintSender(fastify.db, destClient, destWallet, feesPerGasCache, env.relayerAddress, log);

    // Resolve in-flight work from a previous run before accepting new work.
    await new Reconciler(fastify.db, destClient, mintSender, log).run();

    // Pull-based verification of frontend-submitted locks (source chain), then mint (dest chain).
    const verifier = new LockVerifier(fastify.db, sourceClient, log);
    verifier.start();

    const processor = new MintProcessor(fastify.db, mintSender, log);
    processor.start();

    const stuckMonitor = new StuckTransactionMonitor(fastify.db, mintSender, log);
    stuckMonitor.start();

    fastify.addHook('onClose', async () => {
      verifier.stop();
      processor.stop();
      stuckMonitor.stop();
      feesPerGasCache.stop();
    });
  },
  { name: 'services', dependencies: ['db'] }
);

declare module 'fastify' {
  interface FastifyInstance {
    sourceClient: PublicClient;
  }
}

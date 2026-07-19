import { join } from 'node:path';
import AutoLoad from '@fastify/autoload';
import type { FastifyPluginAsync } from 'fastify';

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  });

  // `dirNameRoutePrefix: false` — route files self-prefix (e.g. routes/locks/index.ts
  // registers `/locks/:hash`). Without this autoload would add the directory name
  // as a second prefix, yielding `/locks/locks/...`.
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    dirNameRoutePrefix: false,
    options: opts
  });
};

export default app;
export { app };

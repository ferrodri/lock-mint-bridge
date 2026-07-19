import { join } from 'node:path'
import AutoLoad from '@fastify/autoload'
import { FastifyPluginAsync } from 'fastify'

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  })

  // `dirNameRoutePrefix: false` — route files self-prefix (e.g. routes/transfers/index.ts
  // registers `/transfers/:sourceTxHash`). Without this autoload would add the directory name
  // as a second prefix, yielding `/transfers/transfers/...`.
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    dirNameRoutePrefix: false,
    options: opts,
  })
}

export default app
export { app }

import fp from 'fastify-plugin';
import type { FastifySensibleOptions } from '@fastify/sensible';
import sensible from '@fastify/sensible';

// Adds ergonomic HTTP error helpers. @see https://github.com/fastify/fastify-sensible
export default fp<FastifySensibleOptions>(async (fastify) => {
  fastify.register(sensible);
});

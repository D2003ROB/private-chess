import { defineConfig } from 'vitest/config';

// The real engine, driven end to end. Kept out of `pnpm test` because it loads
// 7 MB of WebAssembly and searches for real; run it with `pnpm test:engine`.
export default defineConfig({
  test: {
    include: ['test-engine/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});

import { defineConfig } from 'vitest/config';

// Depth-4 perft lives in `*.perft.ts` and is excluded from the default run —
// it counts millions of nodes and belongs in `pnpm test:perft`, not in CI.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});

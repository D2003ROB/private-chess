import { defineConfig } from 'vitest/config';

// The deep perft run: minutes, not milliseconds, because every node copies the
// whole position. Correctness is the point here, not speed.
export default defineConfig({
  test: {
    include: ['src/**/*.perft.ts'],
    testTimeout: 900_000,
    hookTimeout: 900_000,
  },
});

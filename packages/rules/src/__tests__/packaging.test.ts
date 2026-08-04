import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../', import.meta.url));
const IMPORTS = /^import\s+(?:type\s+)?[^;]*?from\s+'([^']+)';/gm;

function sources(): string[] {
  return readdirSync(SRC).filter((entry) => entry.endsWith('.ts'));
}

function read(file: string): string {
  return readFileSync(SRC + file, 'utf8');
}

describe('packaging', () => {
  // The API imports this package, so it must never drag a dependency — Zod
  // included — into the server. Enforced here rather than left to review,
  // because a plain `import { FILES }` would look harmless in a diff.
  it('imports nothing at runtime: every cross-package import is type-only', () => {
    expect(sources().length).toBeGreaterThan(0);

    for (const file of sources()) {
      for (const [statement, specifier] of read(file).matchAll(IMPORTS)) {
        if (specifier?.startsWith('.')) continue;
        expect(`${file}: ${statement}`).toMatch(/: import type /);
      }
    }
  });

  /**
   * Attack detection must not reach the move generator, even transitively:
   * `legalMoves` calls `isSquareAttacked` to validate its candidates, so the
   * recursion would not terminate. A static check because the failure mode is
   * a stack overflow in an unrelated test, days later.
   */
  it('keeps isSquareAttacked out of the move generator', () => {
    const reachable = new Set<string>();
    const visit = (file: string) => {
      if (reachable.has(file)) return;
      reachable.add(file);

      for (const [, specifier] of read(file).matchAll(IMPORTS)) {
        if (specifier?.startsWith('./')) visit(specifier.replace('./', '').replace('.js', '.ts'));
      }
    };

    visit('attacks.ts');

    expect([...reachable].sort()).toEqual(['attacks.ts', 'board.ts', 'offsets.ts']);
    expect(reachable.has('moves.ts')).toBe(false);
    expect(reachable.has('apply.ts')).toBe(false);
  });
});

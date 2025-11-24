# Testing & Quality

## Commands
- Engine unit/e2e tests: `npm test -w engine` (Vitest). Watch: `npm run test:watch -w engine`.
- Lint all workspaces: `npm run lint` or per-package `npm run lint -w engine|client|server`.
- No automated server/client tests yet; add Vitest/React Testing Library or supertest as needed.

## Where Tests Live
- Engine specs sit beside implementations under `engine/src`:
  - `game/turn-loop.test.ts` and `game/ai.e2e.test.ts`: action flow, combat/movement, AI integration
  - `game/rules.test.ts`: yield/city growth/build gating
  - `map/map-generator.test.ts`: world generation constraints
- Client currently has no automated tests; add Vitest/RTL suites as UI logic grows.

## What to Cover
- New actions: happy-path applyAction, invalid input/turn-order, side effects (visibility, diplomacy offers, production/tech progress).
- Rule changes: yields, growth costs, build eligibility (`canBuild`), terrain movement restrictions.
- Map gen tweaks: reproducibility with seed, guarantees for starting spots (food/prod requirements), river/overlay counts if adjusted.
- AI changes: deterministic decisions when seeded, safety limits on loop iterations.

## Patterns & Tips
- Engine code is pure TypeScript; prefer direct function calls with in-memory `GameState` fixtures. Use small helper factories when tests repeat setup.
- Seed map generation with a fixed `settings.seed` to avoid flakiness.
- If you add UI tests, mock engine imports rather than duplicating fixtures; keep render tree small (test components in isolation).

## Quality Gates to Aim For
- Run `npm test -w engine` and `npm run lint` before commits.
- Avoid modifying `dist/` outputs; tests should consume `src` to stay readable.***

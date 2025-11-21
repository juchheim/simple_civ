# Repository Guidelines

## Project Structure & Module Organization
- Monorepo managed with npm workspaces: `engine` (pure TypeScript game logic), `client` (React + Vite UI), `server` (Express API + MongoDB), shared root config in `package.json`/`tsconfig.json`.
- Source lives in `*/src`; built output in `*/dist`. Tests currently live alongside engine source files (e.g., `engine/src/game/turn-loop.test.ts`).
- Documentation sits in `docs/` (rulebook, spec, changelog); keep architecture notes there rather than in code comments.

## Build, Test, and Development Commands
- Install deps: `npm install` (root).
- Run both app layers in dev: `npm run dev` (spawns workspace dev scripts; `client` via Vite, `server` via ts-node-dev).
- Targeted dev: `npm run dev -w client` or `npm run dev -w server`.
- Build all packages: `npm run build`; per package: `npm run build -w engine|client|server`.
- Tests (engine/Vitest): `npm test` or `npm test -w engine`. Watch mode: `npm run test:watch -w engine`.
- Lint: `npm run lint` or per workspace `npm run lint -w <pkg>`.

## Coding Style & Naming Conventions
- TypeScript across the repo; prefer named exports and module-relative imports.
- Indentation uses 4 spaces; double quotes are standard; keep semicolons consistent with existing files.
- Components use PascalCase filenames (`client/src/components/TechTree.tsx`); utilities and engine modules favor kebab-case (`map-generator.ts`).
- Run ESLint before committing; Prettier is available—use default formatting when files drift.

## Testing Guidelines
- Vitest powers engine tests; place unit/feature specs next to implementation as `<feature>.test.ts` and longer flows as `.e2e.test.ts`.
- Aim for deterministic tests (no random seeds without seeding); cover new rules, yields, and AI branches when adding logic.
- No formal coverage gate yet—still add assertions for new public functions and regressions you touch.

## Commit & Pull Request Guidelines
- No existing Git history here; follow Conventional Commits for consistency (`feat(engine): add hill yield bonus`, `fix(client): prevent null selection`).
- Keep commits focused and small; include relevant workspace in the scope when possible.
- PRs should explain intent, affected packages, testing performed (`npm test -w engine`, manual UI steps), and link issues. Add screenshots/GIFs for UI-affecting changes.

## Security & Configuration Tips
- Server expects `MONGO_URI` and optional `PORT` in environment; use a local `.env` (not committed) and ensure Mongo is reachable before running `npm run dev -w server`.
- Do not commit secrets or production database URLs; prefer placeholders in examples (e.g., `mongodb://localhost:27017/simple-civ`).

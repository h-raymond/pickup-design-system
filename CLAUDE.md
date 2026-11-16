# Pickup design system: agent guide

- **Definition of done for interface code:** `docs/QUALITY_BAR.md`. Read it before building or reviewing UI.
- **Before committing or opening a PR for UI built from Figma:** run the `pickup-figma-quality-loop` skill (`.claude/skills/pickup-figma-quality-loop/`). A separate agent compares the Figma input with the code, fixes the code until it meets the bar and matches the design, and writes a report to `reports/quality/`. No PASS, no PR.
- **Figma is read-only** for agents in this repo. Fix the code, never the design.
- **Checks:** `npm run quality` (tokens, design-system components, JSDoc, clean code; exits 1 on failure) and `npm run typecheck`.
- **Layout:** design-system components and tokens live in `src/` (tokens in `src/tokens/tokens.css`), the prototype app in `app/`, and Code Connect templates in `src/**/*.figma.ts` and `figma/icons/`.
- **Scratch output:** screenshots and loop data go in `.quality/`, which is gitignored. Reports in `reports/quality/` are committed.

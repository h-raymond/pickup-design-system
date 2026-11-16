---
name: pickup-figma-quality-loop
description: Use when interface code has been built or changed from Figma context fetched with the Figma MCP (get_design_context, get_screenshot, Code Layers) and is about to be committed or opened as a pull request, or when asked whether a build matches its Figma design and Pickup's quality bar.
---

# Pickup: quality loop before the PR

## Overview
Code built from Figma doesn't go into a commit or pull request until it has passed a **quality loop**. A separate agent compares the Figma input with the code output, measures the code against `docs/QUALITY_BAR.md`, and **fixes the code** until it meets the bar and matches the design.

**Core principles:**
- **Figma is the input and is read-only.** The loop changes code, never the design.
- **The agent that built the code doesn't certify it.** A separate agent verifies, with measured evidence.

## When it runs
```
fetch Figma context (MCP) → agent builds the code → QUALITY LOOP → commit → PR
```
Run it every time, before `git commit` or `gh pr create`, for any change built from Figma context. A follow-up change to the same feature gets a new loop.

## Figma is read-only
- **Allowed:** `get_design_context`, `get_screenshot`, `get_metadata`, `get_variable_defs`, `download_assets`, `get_code_connect_map`, reading Code Layer source with ReadMcpResource, and `use_figma` scripts that only **read** (return data or `node.screenshot()`).
- **Not allowed:** any call that creates, edits, moves or deletes nodes, variables, styles, comments or Code Connect mappings. Not even temporarily, and not to make a screenshot possible.
- **If the design looks wrong,** don't change it. Note it under "Next steps for design" in the report.

## Step 1: save the Figma input to disk (main session)
Subagents can call Figma tools but **can't read MCP resources**, so the main session saves the reference first, under `.quality/<feature>/reference/` (gitignored). The context fetched for the build is the input. Save that same input, not a newer version:

| Figma input | Save |
| --- | --- |
| Frame, component or instance | `get_screenshot` for each frame (download with `curl -L -o <node-id>.png`). Also `get_design_context` output as `<node-id>.context.md` and `get_variable_defs` as `variables.json` |
| Code Layer (`CODE_INSTANCE`) | The Code Layer's source files (ReadMcpResource) for the screens that were built, saved as text. For an image, try `get_screenshot`, then `download_assets` (its `export`). If both fail, use no pixel image: the verifier compares against the source and `node.screenshot()` from a read-only `use_figma` call |
| Every frame or screen | One entry in `reference/frames.json`: `{ nodeId, name, width, height, png \| null, source \| null, buildUrl }`. `buildUrl` is the app route or Storybook story that renders that screen |

## Step 2: run the loop (separate verifier agent)
- **Dispatch a fresh agent** with `verifier-prompt.md` from this folder, slots filled in. Each loop:
  1. **Measure the code:** `npm run quality` and `npm run typecheck`.
  2. **Measure the visuals:** `node scripts/quality/visual.mjs capture …` and `… diff …` for each frame.
  3. **Classify** every visual difference as mismatch, intentional or noise (QUALITY_BAR §5).
  4. **Fix** the code for every FAIL and every mismatch, then re-measure.
- **It stops when:**
  - every bar passes and no mismatches are left (**PASS**), or
  - two loops in a row fix nothing (**BLOCKED**), or
  - loop 5 ends.
- **It writes the report** with `report-template.md` to `reports/quality/YYYY-MM-DD-<feature>.md`.

## Step 3: the gate (main session)
- **Re-run `npm run quality` and `npm run typecheck` yourself.** Gate on the exit codes, not on the verifier's summary.
- **PASS:** commit the code together with the report. Open the PR with the report's summary and bar table in the description.
- **BLOCKED or FAIL:** don't commit or open the PR. Show the user what's open and what needs a decision (from the report), and continue only when they decide.

## Quick reference
| Command | Purpose |
| --- | --- |
| `npm run quality -- --scope <dir>` | Tokens, design-system components, JSDoc, clean code; exits 1 on FAIL |
| `npm run typecheck` | Types for the library and the app |
| `node scripts/quality/visual.mjs capture <url> <out.png> --width W --height H` | Captures the build at the Figma frame size |
| `node scripts/quality/visual.mjs diff <figma.png> <build.png> <diff.png>` | Pixel diff; prints `{ mismatch }` |

## Red flags: stop
| Thought | Reality |
| --- | --- |
| "I'll tweak the Figma frame so it matches." | Figma is the input. Fix the code. |
| "I'll add a temp node in Figma to get a screenshot." | That's a write. Use the read-only fallbacks in step 1. |
| "It looks right, I'll commit and verify later." | The loop runs before the commit. No PASS, no PR. |
| "The builder already checked it." | A separate agent verifies, with files on disk as evidence. |
| "I'll loosen the audit or exempt it to get green." | Don't edit the bar. A `token-exempt` needs a real reason and goes in the report. |
| "The diff ratio is low, so it matches." | Classify every difference. The ratio is a signal, not the verdict. |

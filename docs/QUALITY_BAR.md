# Pickup quality bar for interface code

This is the standard for every interface built at Pickup, whether a person or an agent writes it.
A build is **done** when it meets every bar below and the verification report says so.

**Who this is for:** developers, designers, and AI agents who build or review Pickup interfaces. If you are picking up someone else's work, start here, then read the feature's latest report in `reports/quality/`.

---

## 1. The measurable bars

`npm run quality` measures these. They are pass/fail, not targets to work towards.

| Bar | Requirement | How it is measured |
| --- | --- | --- |
| **Foundations** | **100%** of foundational values come from design tokens | Every color, font, font size, line height, letter spacing, spacing (padding, margin, gap), radius and shadow in app CSS and inline styles must be `var(--…)` or `calc()` built on tokens |
| **Design-system adoption** | **At least 75%** of interface elements are design-system components | Design-system elements (anything imported from `@figma/pickup-design-system`) divided by those plus raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, `<dialog>`, `<progress>` |
| **Documentation** | **100%** of exported functions and components have a JSDoc comment | Every `export function` and exported arrow or function component |
| **Clean code** | Zero blocking findings | No `any`, no `console.*`, no file over 300 lines, no `TODO` without an owner |
| **Visual parity** | The build matches the Figma reference | Screenshot diff plus a written review of each frame, see section 5 |

### Allowed raw values in foundational properties
- **These are always fine:** `0`, `1px` (hairline borders), `auto`, `none`, `inherit`, `transparent`, `currentColor`, `100%` and unitless numbers.
- **Anything else needs a token.** Tokens live in `src/tokens/tokens.css`, named exactly as in Figma. For spacing, use `calc(var(--spacing) * n)`.
- **If no token fits,** don't invent a value silently. Mark the line `/* token-exempt: <reason> */` and list it in the report so design can decide whether it becomes a token.
- **Exemptions are for genuine gaps,** such as a one-off illustration offset or a third-party color. Never use one to skip work.

---

## 2. How we build interfaces

1. **Design system first.** Use the component from `@figma/pickup-design-system` that matches the Figma component. Check `README.md` for the Figma → React mapping. Figma variant values become lower-case props: `Variant=Destructive` becomes `variant="destructive"`.
2. **Extend, don't fork.** If a component is close but missing something, add an optional prop to the design-system component in `src/components/…`, document it, and add a story. Don't rebuild it locally or style over it with CSS overrides.
3. **Raw elements need a reason.** A raw `<button>` or `<input>` is acceptable only when no design-system component expresses the pattern, such as a list row that is a button. Give it a comment saying why, and take its focus, hover and disabled states from tokens.
4. **States are real.** Hover, pressed and focus are CSS interaction states. Disabled and invalid are props. Every interactive element has a visible `:focus-visible` ring using `--ring`.
5. **Layout in CSS, not inline.** Use classes in the feature stylesheet. Inline `style` only holds dynamic values such as computed positions or progress widths, never colors or spacing.
6. **Icons** come from `@heroicons/react`, which the design system ships. A custom glyph becomes a small named component with a comment explaining why it isn't a Heroicon.
7. **Assets** are downloaded into the repo. Never reference temporary Figma asset URLs at runtime.
8. **Accessibility basics:**
   - Every control has a name: a visible label or `aria-label`.
   - Images that carry meaning have `alt`.
   - Live status changes are announced (`role="status"` or `aria-live`).
   - Dialogs manage focus and Escape.

## 3. Clean, slim code

- **One responsibility per file:**
  - screens in `screens/`
  - feature logic in `features/<name>/`
  - shared app chrome in `components/`
  - data and mocks in `lib/` or `features/<name>/data.ts`
- **Files stay under 300 lines.** Split by responsibility, not arbitrarily.
- **Name things after what they are in the product,** not how they look: `CheckoutHeader`, not `TopBar2`.
- **No dead code:**
  - no commented-out blocks
  - no unused props or exports
  - no `any`
- **Prefer plain data and small functions** over clever abstractions. A new developer should understand a screen by reading it top to bottom.
- **Prototype-only behaviour is labelled where it lives,** with a `Prototype:` comment. Examples are mock latency, scenario switches and auto-advancing timers.

## 4. How we comment

Comments explain **why** and **what it maps to**, never what the next line obviously does.

- **Every exported component or function gets a JSDoc block.** The first line says what it is. If it maps to a Figma node, add that too, as `Figma: "<name>" (<node-id>)`.
  ```tsx
  /** ItemCard: Figma component "Item Card" (110:125). Marketplace listing card with a product-image slot. */
  export const ItemCard = …
  ```
- **Props carry a one-line `/** */`** when the name alone doesn't say which Figma property it maps to, or what its default means.
- **Non-obvious decisions get a short inline comment:** a workaround, an accessibility reason, or a deliberate difference from Figma.
- **Token exemptions use `/* token-exempt: <reason> */`.**
- **TODOs name an owner:** `TODO(lfehre): …`.

## 5. Visual parity

- **Each frame or screen in the Figma reference is captured from the build** at the same viewport, by `scripts/quality/visual.mjs`, and diffed.
- **The diff ratio is a signal, not the verdict.** Fonts and anti-aliasing always differ a little. The reviewer looks at both images and the diff, and writes down every difference in one of three groups:
  - **Mismatch:** layout, spacing, color, copy, missing or extra elements, wrong component or variant, wrong asset. Fix it.
  - **Intentional:** design-system conventions that win over the drawing, such as a DS component that renders slightly differently from a detached Figma layer. Keep it and list it for design.
  - **Rendering noise:** font hinting or sub-pixel offsets. Ignore.
- **A frame passes** when it has no unresolved mismatches.

## 6. Before the PR

- **Code built from Figma passes the quality loop** (`.claude/skills/pickup-figma-quality-loop/`) before it is committed or opened as a pull request.
- **The loop only reads Figma.** It changes code, never the design. Design issues it finds go into the report as next steps for design.
- **The PR description includes the report's summary and bar table.**

## 7. Handover

Every feature build leaves behind:
- **Code** that passes `npm run quality` and `npm run typecheck`.
- **A story per screen or state** in Storybook, so people can review it without clicking through.
- **A report** in `reports/quality/<date>-<feature>.md`, using the template in `.claude/skills/pickup-figma-quality-loop/report-template.md`. It has a short summary, the bar results, what was fixed, what's left, and separate next steps for **dev** and for **design**.

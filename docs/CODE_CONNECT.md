# Code Connect for Spotify AI Day

Target: [Pickup — Spotify AI Day](https://www.figma.com/design/yTOUYxkA0nmz0lOm58iM8M/Pickup-Spotify-AI-Day?node-id=66-306).
Source: [h-raymond/pickup-design-system](https://github.com/h-raymond/pickup-design-system).

All 1,207 parserless `.figma.ts` templates target this file: 21 Pickup
components and 1,186 Heroicon components. The icon generator uses the same file
URL, so regenerating icons preserves the destination. The npm import name stays
`@figma/pickup-design-system`, matching this package's existing public exports.

## Property mappings

| Figma component | Code | Mappings |
| --- | --- | --- |
| Button | Button | Label → children; Variant → variant; Size → size; Disabled state → disabled; Trailing icon + Icon swap → trailingIcon |
| Icon button | IconButton | Variant → variant; Size → size; Disabled state → disabled; Icon swap → icon |
| Text field | Input / Textarea | Type chooses the export; visible Value text → placeholder; Variant → variant; Invalid / Disabled states → invalid / disabled |
| Select | Select | Visible Value text → option text; Variant → variant; Size → size; Invalid / Disabled states → invalid / disabled |
| Switch | Switch | Size → size; Checked → defaultChecked; Invalid / Disabled states → invalid / disabled |
| Search field | SearchField | Value → placeholder and accessible label; Variant → variant; Clear → onClear callback presence; Invalid / Disabled states → invalid / disabled |
| Badge | Badge | Label → children; Variant → variant |
| Checkbox | Checkbox | Checked True → defaultChecked; Indeterminate → checked="indeterminate"; Invalid / Disabled states → invalid / disabled |
| Summary card | SummaryCard | Visible title / metadata text → title / meta |
| Card | Card | Variant → variant; Size → size; visible text → CardTitle / CardDescription |
| Page header | PageHeader | Visible heading → title; back action callback supplied as an integration placeholder |
| Page menu | PageMenu / PageMenuItem | Visible row labels → children; child icon instances → icon through executeTemplate() |
| Empty | Empty | Title → title; Description → description; Icon swap → icon; Action visibility + nested instance → action through executeTemplate() |
| Skeleton stack | SkeletonStack | No exposed properties |
| Sticky action bar | StickyActionBar | Visible button labels → composed Button children |
| Accordion | Accordion / AccordionItem | Title → title; Content → children; Expanded state → defaultOpen |
| Popover | Popover | Trigger → trigger button text; Title → title; Content → children; Open state → defaultOpen |
| Tooltip | TooltipContent | Text → children; Side → side; the Figma node is a bubble without a trigger |
| Alert | Alert | Title → title; Description → description; Variant → variant; Default variant Icon swap → icon |
| Item Card | ItemCard | Title / Price / Distance → matching props; Product image slot → image fragment; nested Badge label → condition |
| pickup-logo | PickupLogo | No exposed properties |

Hover, Pressed, Focus and Focused are native interaction/CSS states, not invented
React props. All variant options are explicitly handled. Text values are emitted
as quoted JavaScript string expressions so quotes, braces and newlines remain
valid JSX. Missing icon instances emit `null` or omit optional props.

The code components render some children internally: ItemCard owns the condition
Badge and save button; PageHeader owns its back icon; SearchField owns its search
and clear icons. Their templates map the data these APIs accept rather than
duplicating those internal children. The Popover trigger and StickyActionBar
buttons have text layers rather than configurable child instances in this file.

SummaryCard's image fill is not exposed as a component property or slot; supply
`imageSrc` from application data when integrating. Navigation, save and clear
handlers are explicit integration placeholders. No app-specific variables,
routes, or image URLs are fabricated in the generated snippets. Accessible
labels marked TODO must be filled in for the action in its application context.

## Validate and publish

```sh
npm run figma:check
npm run typecheck
npm run figma:parse -- --skip-update-check --exit-on-unreadable-files
```

`figma:check` checks all 21 components against the Figma property snapshot in
`docs/code-connect-properties.json` (read on 2026-11-17). It evaluates all variant
and boolean combinations with normal text, special characters, multiple slot
children, absent slots, and missing instances: 909 rendered examples. It checks
complete variant/property coverage, typechecks those examples against the actual
React exports, checks all 1,186 Heroicons exports, and verifies all target URLs.
This is a local runtime simulation, not a Figma Dev Mode visual verification.
Refresh the property snapshot through `get_context_for_code_connect` when the
Figma component definitions change.

All 1,207 templates were published through the Code Connect CLI on 2026-11-17.
Figma read-back confirmed `hasTemplate: true` for all 1,384 connected component
instances/variants in the linked selection. Live snippets were also checked for
Button, SearchField, Checkbox, TooltipContent, SummaryCard, and ItemCard,
including its Product image slot and condition label.

The connector initially saved source links without the supplied executable
templates; the CLI publication replaced those source-only mappings. To republish,
put `FIGMA_ACCESS_TOKEN=...` in the gitignored `.env` file and run:

```sh
node --env-file=.env node_modules/@figma/code-connect/bin/figma connect publish --skip-update-check --exit-on-unreadable-files --force --batch-size 100
```

Normal CLI validation requires `file_content:read` in addition to Code Connect
write scope. The initial publication used `--skip-validation` with a write-scoped
token after the component definitions had already been checked through Figma MCP
and `npm run figma:check` had passed. Repeat those checks before using that flag
with a token that lacks file-read access. `--force` replaces conflicting
source-only mappings. Keep the token out of Git.

The existing `npm run quality` app audit fails on pre-existing CSS token,
documentation and file-length findings in `app/src`. This Code Connect change
does not modify the app implementation or its CSS.

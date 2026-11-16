# Quality report: {{feature}}

**Date:** {{YYYY-MM-DD}} · **Figma:** {{file / node links}} · **Scope:** `{{code scope}}` · **Verdict:** {{PASS / BLOCKED / FAIL}} after {{n}} loops

## Summary
{{Two or three sentences: does the code meet the Pickup quality bar and match the Figma input? Is it ready to commit and open a PR? If not, what's blocking it?}}

## Bar results (final loop)
| Bar | First build | Final | Target | Status |
| --- | --- | --- | --- | --- |
| Foundations (tokens) | {{%}} | {{%}} | 100% | {{PASS/FAIL}} |
| Design-system components | {{%}} | {{%}} | ≥ 75% | {{PASS/FAIL}} |
| Documented exports | {{%}} | {{%}} | 100% | {{PASS/FAIL}} |
| Clean code | {{n findings}} | {{n findings}} | 0 | {{PASS/FAIL}} |
| Visual parity | {{frames with mismatches}} | {{frames with mismatches}} | 0 | {{PASS/FAIL}} |

## Visual parity by frame
| Frame | Diff | Mismatches left | Intentional differences |
| --- | --- | --- | --- |
| {{name (node)}} | {{0.034}} | {{none / list}} | {{list}} |

## What the loops fixed
- {{Short entries, each with file:line where useful}}

## Still open
- {{Anything not fixed, with the reason (blocked, needs a decision, out of scope)}}

## Next steps for dev
- {{Concrete code actions, in priority order}}

## Next steps for design
- {{Observations only; the loop never edits Figma. Design system or file actions, such as: token gaps found (the value and where it's used), Figma layers that are detached from DS components, variants or states missing in Figma, copy to confirm}}

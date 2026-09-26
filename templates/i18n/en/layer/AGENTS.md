# AGENTS.md — layer __LAYER__

This file is the guardrail for layer `__LAYER__`. It complements the parent
instructions, so always read all three levels:

- `AGENTS.md` (root) — global project rules
- `src/AGENTS.md` — rules shared by all layers
- `src/__LAYER__/AGENTS.md` — this file

More specific instructions take precedence. If this file conflicts with the
global rules in the root, stop the work and ask the user for a decision.

## Layer responsibility

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Dependency direction

__DEPENDS_ON__

## Layer structure

```text
src/__LAYER__/
  AGENTS.md        # this file — layer guardrails
  README.md        # layer purpose and how to run it
  src/             # layer production code
  tests/           # unit/ and integration/
  docs/            # documentation and decisions/ (ADR)
<!--#if full-->
  .cursor/         # SOURCE OF TRUTH for the layer's agent configuration
  .github/         # composite action and layer pipeline definition
<!--#endif-->
```
<!--#if full-->

## Layer agent configuration

- The source of truth is `.cursor/` in this layer. The root `.cursor/` is a generated mirror.
- After every change to `.cursor/` run: `__SYNC_CMD__`
- Never edit `.cursor/rules/generated/**` — it is overwritten by sync.
<!--#endif-->

## Before finishing work

- [ ] The change respects the dependency direction.
- [ ] The layer structure is valid: `__VERIFY_CMD__`
- [ ] Tests pass: `__TEST_CMD__`
<!--#if full-->
- [ ] The agent configuration is in sync: `__SYNC_CHECK_CMD__`
<!--#endif-->
- [ ] Every non-trivial decision is recorded as an ADR in `docs/decisions/`.

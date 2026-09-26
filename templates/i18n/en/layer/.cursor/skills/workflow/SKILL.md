---
name: __LAYER_SLUG__-workflow
description: Workflow for layer __LAYER_TITLE__. Use when implementing, testing or reviewing changes in src/__LAYER__/.
---

# Workflow of layer __LAYER_TITLE__

## Before you start

Read the instructions of all three levels: `AGENTS.md` (root), `src/AGENTS.md`
and `src/__LAYER__/AGENTS.md`. The more specific instructions take precedence.

## Layer responsibility

__RESPONSIBILITY__

## Guardrails

__GUARDRAILS__

## Procedure

1. Verify that the request belongs to this layer.
2. Make the smallest possible change in `src/`.
3. Add or update tests in `tests/unit/` or `tests/integration/`.
4. Run `__TEST_CMD__`.
5. Verify the layer structure: `__VERIFY_CMD__`.
6. Record every non-trivial decision as an ADR in `docs/decisions/`.
<!--#if full-->
7. When changing `.cursor/`, run `__SYNC_CMD__`.
<!--#endif-->

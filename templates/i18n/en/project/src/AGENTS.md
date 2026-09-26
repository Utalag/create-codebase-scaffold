# src/AGENTS.md — shared rules for all layers

This file complements the global [AGENTS.md](../AGENTS.md) and applies to all
layers in `src/`. Each layer has its own `AGENTS.md` that refines these rules —
more specific instructions take precedence.

## Required layer anatomy

```text
src/<Layer>/
  AGENTS.md        # layer guardrails + links to parents
  README.md        # layer purpose, how to run and test it
  src/             # layer production code
  tests/           # unit/ and integration/
  docs/            # README.md and decisions/ (ADR)
<!--#if full-->
  .cursor/         # SOURCE OF TRUTH for the layer's agent configuration
  .github/         # local composite action and layer pipeline definition
<!--#endif-->
```

## Dependency direction

Dependencies may only point inward. A layer may import only layers that are
more inward than itself.

__LAYER_TABLE__

In particular, the following is forbidden:

__DEPENDENCY_RULES__

## Layer roles

__LAYER_ROLES__

## Forbidden practices

- Cross-imports between sibling layers against the dependency direction.
- Business logic in adapters, data or the entry layer.
- Direct access to a database, network or filesystem from the domain or application layer.
- Creating a new layer by hand instead of using `__NEW_LAYER_CMD__`.
<!--#if full-->
- Editing generated files in `.cursor/rules/generated/**`.
<!--#endif-->

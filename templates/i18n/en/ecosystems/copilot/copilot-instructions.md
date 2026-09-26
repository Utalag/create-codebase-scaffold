# __PROJECT_NAME__ — instructions for GitHub Copilot

This project is layered. Follow the guidance in these files, in this order:

1. `AGENTS.md` (root) — global project rules.
2. `src/AGENTS.md` — rules shared by all layers.
3. `src/<Layer>/AGENTS.md` — guardrails of the specific layer.
4. `src/<Layer>/README.md` — what the layer does and how to run it.

## Architecture

__ARCH_LABEL__ — __ARCH_DESCRIPTION__

Layers: __LAYER_LIST__

In particular, the following is forbidden:

__DEPENDENCY_RULES__

## Conventions

- A new layer is created with the script: `__NEW_LAYER_CMD__`
- Layer verification: `__VERIFY_CMD__`
- Layer tests: `__TEST_CMD__`
- Keep business logic out of the entry and data layers.
<!--#if full-->
- The layer's agent configuration lives in `src/<Layer>/.cursor/` (source of truth); the
  root `.cursor/` is a generated mirror — do not edit `.cursor/rules/generated/**`.
<!--#endif-->

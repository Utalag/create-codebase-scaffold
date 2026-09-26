# __PROJECT_NAME__ — instructions for agents

This file is the entry point for every AI agent working in this repository.
It applies to the whole tree. More specific instructions in subfolders take
precedence.

## Instruction inheritance chain

Before working in a specific layer, read all levels in this order:

1. `AGENTS.md` (this file) — global project rules.
2. `src/AGENTS.md` — rules shared by all layers.
3. `src/<Layer>/AGENTS.md` — guardrails of the specific layer.
4. `src/<Layer>/README.md` — what the layer does and how to run it.

## Architecture

The project uses the **__ARCH_LABEL__** architecture: __ARCH_DESCRIPTION__

Layers: __LAYER_LIST__

Dependency direction:

__DEPENDENCY_MERMAID__

Dependencies may only point inward. In particular, the following is forbidden:

__DEPENDENCY_RULES__

## Conventions

- A new layer is created with the script: `__NEW_LAYER_CMD__`
- Layer tests are run with: `__TEST_CMD__`
- Layer structure verification: `__VERIFY_CMD__`
- Write paths in documentation with forward slashes (`src/Domain/...`), never with `\`.
- Every non-trivial layer decision belongs in `src/<Layer>/docs/decisions/` as an ADR.
<!--#if full-->
- The source of truth for a layer's agent configuration is `src/<Layer>/.cursor/`. The
  root `.cursor/` is a generated mirror — never edit `.cursor/rules/generated/**`.
- After changing `src/<Layer>/.cursor/`, run `__SYNC_CMD__`
  and verify `__SYNC_CHECK_CMD__` before committing.
<!--#endif-->

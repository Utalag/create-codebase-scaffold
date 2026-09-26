# __PROJECT_NAME__

Guidance for Claude. The full rules are in `AGENTS.md` (root), `src/AGENTS.md`
and the `AGENTS.md` of the individual layers — read them before you start working.

## Architecture

__ARCH_LABEL__ — __ARCH_DESCRIPTION__

Layers: __LAYER_LIST__

Dependency direction:

__DEPENDENCY_MERMAID__

In particular, the following is forbidden:

__DEPENDENCY_RULES__

## Conventions

- A new layer is created with the script: `__NEW_LAYER_CMD__`
- Layer verification: `__VERIFY_CMD__`
- Layer tests: `__TEST_CMD__`
- Record every non-trivial layer decision as an ADR in `src/<Layer>/docs/decisions/`.
<!--#if full-->
- After changing `src/<Layer>/.cursor/` run `__SYNC_CMD__`; never edit `.cursor/rules/generated/**`.
<!--#endif-->

# Project layers

The project uses the **__ARCH_LABEL__** architecture: __ARCH_DESCRIPTION__

Each layer is a separate folder in `src/` with its own guardrails, tests and
documentation.

## Overview

__LAYER_TABLE__

## Layer roles

__LAYER_ROLES__

## Dependency direction

__DEPENDENCY_MERMAID__

In particular, the following is forbidden:

__DEPENDENCY_RULES__

## Layer anatomy

Every layer has the same structure:

```text
src/<Layer>/
  AGENTS.md        # layer guardrails + links to the parent instructions
  README.md        # layer purpose, how to run and test it
  src/             # layer production code
  tests/           # unit/ and integration/
  docs/            # README.md and decisions/ (ADR)
<!--#if full-->
  .cursor/         # SOURCE OF TRUTH for the layer's agent configuration
  .github/         # composite action and layer pipeline definition
<!--#endif-->
```

The structure is enforced by `scripts/verify-layer.__SCRIPT_EXT__`.

## Creating a new layer

```text
__NEW_LAYER_CMD__
```

For known layers the generator inserts specific guardrails; for unknown ones it
inserts a generic set with `TODO:` markers that must be replaced. As long as any
`TODO:` markers remain in `AGENTS.md`, the layer will not pass the
`scripts/verify-layer.__SCRIPT_EXT__` check.

# __PROJECT_NAME__

A language-neutral, layered project ready for AI-agent-driven development.

## Architecture

**__ARCH_LABEL__** — __ARCH_DESCRIPTION__

Every layer in `src/` has its own guardrails for agents, its own tests and its
own documentation. The shared rules live in `AGENTS.md` and `src/AGENTS.md`.

Details about the layers and the dependency direction: [`docs/layers.md`](docs/layers.md).
How the agent configuration works: [`docs/agent-config.md`](docs/agent-config.md).

## Structure

```text
__PROJECT_TREE__
```

## Quick start

```text
# Create a new layer
__NEW_LAYER_CMD__

# Verify the layer structure
__VERIFY_CMD__

# Run the layer tests
__TEST_CMD__
```
<!--#if full-->

```text
# Sync the agent configuration into root .cursor/
__SYNC_CMD__

# Verify the configuration is not stale
__SYNC_CHECK_CMD__
```
<!--#endif-->

## How to work with a layer

1. Find the layer responsibility in `src/<Layer>/README.md` and the guardrails in `src/<Layer>/AGENTS.md`.
2. Implement the smallest change that respects the dependency direction.
3. Add tests in `src/<Layer>/tests/`.
4. Run the layer tests and verification (see Quick start).

## Scripts

Manual usage of the scripts is documented in [`scripts/README.md`](scripts/README.md).

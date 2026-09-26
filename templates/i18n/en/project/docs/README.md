# Project documentation

This folder holds documentation for the whole project. Documentation for a
specific layer belongs in `src/<Layer>/docs/`.

## Contents

- [`layers.md`](layers.md) — overview of the layers, their responsibilities and the dependency direction.
<!--#if full-->
- [`agent-config.md`](agent-config.md) — how the agent configuration works across layers.
<!--#endif-->

## What goes where

| Document type | Location |
| --- | --- |
| Global conventions and guidance for agents | `AGENTS.md` (root) |
| Shared rules for layers | `src/AGENTS.md` |
| Guardrails of a single layer | `src/<Layer>/AGENTS.md` |
| Layer architecture decisions (ADR) | `src/<Layer>/docs/decisions/` |
| Project and tooling documentation | `docs/` |

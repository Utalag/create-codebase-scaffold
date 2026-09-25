# Scripts

Node.js scripts for managing layers in this project. They are the only
supported way to create, rename and retire a layer, so every layer keeps the
same anatomy and the same dependency direction. No dependencies, no build step.

Requirements: Node.js 18+.

## new-layer.mjs — create a layer

```bash
node scripts/new-layer.mjs --name Billing
```

- `--name` is the layer name in PascalCase (`Billing`, `AntiFraud`).
- The layer is created in `src/<Name>/` with its full anatomy.
- Guardrails and dependency direction come from the layer archetype in
  `scripts/layer-presets.json`. A known archetype gets concrete guardrails;
  an unknown one gets a generic set with `DOPLŇ:` markers you must replace.
- The layer is added to the layer map in `.scaffold.json`.
- `--force` overwrites existing files. Without it, existing files are never
  touched — the script only adds what is missing.

The script never edits existing project files. After it runs, add the new layer
to `src/AGENTS.md` and `docs/layers.md` manually; the script only reminds you.
<!--#if full-->
With `machinery=full` it also runs `sync-agent-config.mjs` for you, so the root
`.cursor/` mirror is immediately consistent and `--check` passes without a
manual step.
<!--#endif-->

## rename-layer.mjs — rename a layer

```bash
node scripts/rename-layer.mjs --name Billing --to Invoicing           # dry-run
node scripts/rename-layer.mjs --name Billing --to Invoicing --yes     # apply
```

Atomically renames `src/<Old>` to `src/<New>` and rewrites every reference: the
`.scaffold.json` map, the instruction files, the documentation and the layer's
own files (PascalCase name, kebab-case slug and title). It is not delete +
create, so the layer content is preserved.
<!--#if full-->
It then runs the sync (same loop as `new-layer`), so the root `.cursor/` mirror
uses the new slug.
<!--#endif-->
Without `--yes` (or with `--dry-run`) it only prints the plan and changes
nothing.

## delete-layer.mjs — soft-retire a layer

```bash
node scripts/delete-layer.mjs --name Billing          # dry-run
node scripts/delete-layer.mjs --name Billing --yes    # apply
```

Retires a layer **without deleting its content**:

- renames `src/<Layer>` to `src/_retired-<Layer>` and writes `RETIRED.md` inside,
- removes the layer from `.scaffold.json` and from references in instructions
  and documentation,
- removes its agent artifacts from root `.cursor/`,
<!--#if full-->
- runs the sync (same loop as `new-layer`),
<!--#endif-->
- keeps the retired folder out of the live map: `sync`, `verify-layer` and CI
  ignore `_retired-*` directories.

Hard delete — actually removing the folder — is left to the user; the script
never does it. Without `--yes` (or with `--dry-run`) it only prints the plan.

## verify-layer.mjs — check a layer

```bash
node scripts/verify-layer.mjs --layer Billing
```

Read-only. Checks the layer anatomy, that `AGENTS.md` links to `src/AGENTS.md`,
has a `## Guardrails` section, and contains no unfilled `DOPLŇ:` markers.
Exits non-zero on problems. When `.scaffold.json` says `full`, it also checks
the layer's `.cursor/` and `.github/`. Retired layers (`_retired-*`) are never
treated as active.

## test-layer.mjs — run layer tests

```bash
node scripts/test-layer.mjs --layer Billing
```

Stack-neutral runner. A layer defines its own entry point in
`src/<Layer>/tests/run.mjs`, which receives `--layer`. If the runner does not
exist, the layer is skipped with a message and exit code 0, so CI does not fail
on layers without tests yet.

<!--#if full-->
## sync-agent-config.mjs — mirror agent config

```bash
node scripts/sync-agent-config.mjs
node scripts/sync-agent-config.mjs --check
```

Each layer owns its agent configuration in `src/<Layer>/.cursor/`. This script
mirrors it into the root `.cursor/`:

| Source | Target |
| --- | --- |
| `rules/*.mdc` | `.cursor/rules/generated/<slug>/*.mdc` |
| `agents/*.md` | `.cursor/agents/<slug>-*.md` |
| `skills/<x>/**` | `.cursor/skills/<slug>-<x>/**` |

`--check` writes nothing and exits non-zero when the mirror is missing, stale,
or contains orphans. Use it before committing and in CI.

The script writes only to root `.cursor/`, and only for files tracked in
`.cursor/.generated-manifest.json`. It never modifies the sources in
`src/<Layer>/.cursor/`.
<!--#endif-->

## Conventions

<!--#if full-->
- Never edit `.cursor/rules/generated/**` — it is generated.
- After changing `src/<Layer>/.cursor/`, run the sync.
<!--#endif-->
- Layer names are PascalCase; artifact names use their kebab-case slug
  (`AntiFraud` -> `anti-fraud`).
- Retired layers live in `src/_retired-*` and are ignored by sync, verify and CI.

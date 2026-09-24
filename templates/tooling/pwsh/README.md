# Scripts

PowerShell scripts for managing layers in this project. They are the only
supported way to create a layer, so every layer keeps the same anatomy and the
same dependency direction.

Requirements: PowerShell 7+ (`pwsh`). Windows PowerShell 5.1 also works.

## new-layer.ps1 — create a layer

```powershell
pwsh -File scripts/new-layer.ps1 -Name Billing
```

- `-Name` is the layer name in PascalCase (`Billing`, `AntiFraud`).
- The layer is created in `src/<Name>/` with its full anatomy.
- Guardrails and dependency direction come from the layer archetype in
  `scripts/layer-presets.json`. A known archetype gets concrete guardrails;
  an unknown one gets a generic set with `DOPLŇ:` markers you must replace.
- `-Force` overwrites existing files. Without it, existing files are never
  touched — the script only adds what is missing.

The script never edits existing project files. After it runs, add the new layer
to `src/AGENTS.md` and `docs/layers.md` manually; the script only reminds you.

## verify-layer.ps1 — check a layer

```powershell
pwsh -File scripts/verify-layer.ps1 -Layer Billing
```

Read-only. Checks the layer anatomy, that `AGENTS.md` links to `src/AGENTS.md`,
has a `## Guardrails` section, and contains no unfilled `DOPLŇ:` markers.
Exits non-zero on problems. When `.scaffold.json` says `full`, it also checks
the layer's `.cursor/` and `.github/`.

## test-layer.ps1 — run layer tests

```powershell
pwsh -File scripts/test-layer.ps1 -Layer Billing
```

Stack-neutral runner. A layer defines its own entry point in
`src/<Layer>/tests/run.ps1`, which receives `-Layer`. If the runner does not
exist, the layer is skipped with a message and exit code 0, so CI does not fail
on layers without tests yet.

<!--#if full-->
## sync-agent-config.ps1 — mirror agent config

```powershell
pwsh -File scripts/sync-agent-config.ps1
pwsh -File scripts/sync-agent-config.ps1 -Check
```

Each layer owns its agent configuration in `src/<Layer>/.cursor/`. This script
mirrors it into the root `.cursor/`:

| Source | Target |
| --- | --- |
| `rules/*.mdc` | `.cursor/rules/generated/<slug>/*.mdc` |
| `agents/*.md` | `.cursor/agents/<slug>-*.md` |
| `skills/<x>/**` | `.cursor/skills/<slug>-<x>/**` |

`-Check` writes nothing and exits non-zero when the mirror is missing, stale, or
contains orphans. Use it before committing and in CI.

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

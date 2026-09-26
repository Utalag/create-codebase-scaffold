---
name: layer-management
description: Creates and checks architectural layers in src/ via the script. Use when a new layer should be created, or when a layer's structure, configuration or tests need to be verified.
disable-model-invocation: true
---

# Layer management

Layers are never created by manually copying folders — always with the script, so
that the uniform layer anatomy and the correct dependency direction are preserved.

## Creating a new layer

1. Ask the user for the layer name in PascalCase (e.g. `Billing`, `AntiFraud`)
   and its responsibility.
2. Create the layer with the script:

   ```text
   __NEW_LAYER_CMD__
   ```

3. Fill in the guardrails in `src/<Layer>/AGENTS.md`. The script inserts a default
   set; for an unknown layer it contains `TODO:` markers that you must replace with
   specific rules.
<!--#if full-->
4. Sync the agent configuration:

   ```text
   __SYNC_CMD__
   ```
<!--#endif-->
5. Verify the layer structure:

   ```text
   __VERIFY_CMD__
   ```

6. Run the layer tests:

   ```text
   __TEST_CMD__
   ```

## Checking a layer

When checking a layer, verify in turn:

1. `src/<Layer>/AGENTS.md` contains no `TODO:` markers and has a `## Guardrails` section.
2. The layer does not violate the dependency direction from `src/AGENTS.md`.
3. The layer structure matches the required anatomy (`AGENTS.md`, `README.md`, `src/`,
   `tests/unit`, `tests/integration`, `docs/decisions`).
4. The layer tests pass.

Report deviations and propose a concrete fix. Verify the structure with the script
above, not by hand.

## Rules

- The script never overwrites existing files. Overwriting is forced only by an
  explicit overwrite flag, and only with the user's consent.
- Never create a layer by manually copying folders, and never create layer files by hand.
- When a request does not belong to the chosen layer, say so and suggest the right layer.

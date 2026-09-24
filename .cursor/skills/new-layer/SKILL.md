---
name: new-layer
description: Založí novou architektonickou vrstvu v src/ se všemi guardrails, testy a dokumentací. Použij, když uživatel chce přidat vrstvu, modul nebo "layer" do tohoto repozitáře.
disable-model-invocation: true
---

# Založení nové vrstvy

Vrstvy se nikdy nezakládají ručním kopírováním složek. Vždy přes generátor,
aby zůstala zachována jednotná anatomie vrstvy.

## Postup

1. Zjisti název vrstvy od uživatele (lowercase, pomlčky, např. `billing`).
2. Spusť generátor:

   ```powershell
   pwsh -File scripts/new-layer.ps1 -Name <vrstva>
   ```

3. Uprav `src/<vrstva>/AGENTS.md` — doplň konkrétní guardrails vrstvy.
   Generátor vloží výchozí sadu; ta musí být zpřesněna pro reálnou odpovědnost vrstvy.
4. Synchronizuj root agentní konfiguraci:

   ```powershell
   pwsh -File scripts/sync-agent-config.ps1
   ```

5. Ověř výsledek:

   ```powershell
   pwsh -File scripts/sync-agent-config.ps1 -Check
   pwsh -File scripts/test-layer.ps1 -Layer <vrstva>
   ```

## Co generátor vytvoří

- `AGENTS.md` — guardrails vrstvy s odkazy na rodičovské `AGENTS.md`
- `README.md` — účel vrstvy
- `.cursor/rules/<vrstva>-standards.mdc` — zdroj pravdy pro pravidla
- `.cursor/agents/<vrstva>-dev.md` — zdroj pravdy pro subagenta vrstvy
- `.cursor/skills/<vrstva>-workflow/SKILL.md` — zdroj pravdy pro skill vrstvy
- `.github/actions/setup-layer/action.yml` — lokální composite action
- `.github/workflows/<vrstva>.yml` — definice pipeline vrstvy
- `src/` — produkční kód
- `tests/unit/`, `tests/integration/` — testy
- `docs/README.md`, `docs/decisions/` — dokumentace a ADR

## Pravidla

- Nikdy needituj `.cursor/rules/generated/**` — je přepsáno syncem.
- Novou vrstvu vždy přidej do matice v `.github/workflows/ci.yml`.
- Pokud vrstva porušuje směr závislostí, zvol jiné umístění odpovědnosti.

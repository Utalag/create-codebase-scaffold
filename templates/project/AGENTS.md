# __PROJECT_NAME__ — instrukce pro agenty

Tento soubor je vstupní bod pro každého AI agenta pracujícího v tomto repozitáři.
Platí pro celý strom. Konkrétnější instrukce v podřízených složkách mají přednost.

## Řetěz dědičnosti instrukcí

Před prací v konkrétní vrstvě si přečti všechny úrovně v tomto pořadí:

1. `AGENTS.md` (tento soubor) — globální pravidla projektu.
2. `src/AGENTS.md` — pravidla společná všem vrstvám.
3. `src/<Layer>/AGENTS.md` — guardrails konkrétní vrstvy.
4. `src/<Layer>/README.md` — co vrstva dělá a jak ji spustit.

## Architektura

Projekt používá architekturu **__ARCH_LABEL__**: __ARCH_DESCRIPTION__

Vrstvy: __LAYER_LIST__

Směr závislostí:

__DEPENDENCY_MERMAID__

Závislosti smějí směřovat pouze dovnitř. Zakázané je zejména:

__DEPENDENCY_RULES__

## Konvence

- Nová vrstva se zakládá skriptem: `__NEW_LAYER_CMD__`
- Testy vrstvy se spouštějí: `__TEST_CMD__`
- Ověření struktury vrstvy: `__VERIFY_CMD__`
- Cesty v dokumentaci piš s dopřednými lomítky (`src/Domain/...`), nikdy s `\`.
- Každé netriviální rozhodnutí vrstvy patří do `src/<Layer>/docs/decisions/` jako ADR.
<!--#if full-->
- Zdroj pravdy agentní konfigurace vrstvy je `src/<Layer>/.cursor/`. Root `.cursor/`
  je generované zrcadlo — nikdy needituj `.cursor/rules/generated/**`.
- Po změně `src/<Layer>/.cursor/` spusť `__SYNC_CMD__`
  a před commitem ověř `__SYNC_CHECK_CMD__`.
<!--#endif-->

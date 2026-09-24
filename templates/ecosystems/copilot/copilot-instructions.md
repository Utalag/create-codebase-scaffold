# __PROJECT_NAME__ — instrukce pro GitHub Copilot

Tento projekt je vrstvený. Řiď se pokyny v těchto souborech, v uvedeném pořadí:

1. `AGENTS.md` (root) — globální pravidla projektu.
2. `src/AGENTS.md` — pravidla společná všem vrstvám.
3. `src/<Layer>/AGENTS.md` — guardrails konkrétní vrstvy.
4. `src/<Layer>/README.md` — co vrstva dělá a jak ji spustit.

## Architektura

__ARCH_LABEL__ — __ARCH_DESCRIPTION__

Vrstvy: __LAYER_LIST__

Zakázané je zejména:

__DEPENDENCY_RULES__

## Konvence

- Nová vrstva se zakládá skriptem: `__NEW_LAYER_CMD__`
- Ověření vrstvy: `__VERIFY_CMD__`
- Testy vrstvy: `__TEST_CMD__`
- Drž business logiku mimo vstupní a datovou vrstvu.
<!--#if full-->
- Agentní konfigurace vrstvy je v `src/<Layer>/.cursor/` (zdroj pravdy); root `.cursor/`
  je generované zrcadlo — needituj `.cursor/rules/generated/**`.
<!--#endif-->

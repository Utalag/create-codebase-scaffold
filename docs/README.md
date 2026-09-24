# Projektová dokumentace

Tato složka obsahuje dokumentaci k celému repozitáři (šabloně). Dokumentace
konkrétní vrstvy patří do `src/<vrstva>/docs/`.

## Obsah

- [`agent-config.md`](agent-config.md) — jak funguje agentní konfigurace napříč vrstvami.
- [`layers.md`](layers.md) — přehled vrstev, jejich odpovědností a směru závislostí.

## Kam co patří

| Typ dokumentu | Umístění |
| --- | --- |
| Globální konvence a návod pro agenty | `AGENTS.md` (root) |
| Společná pravidla vrstev | `src/AGENTS.md` |
| Guardrails jedné vrstvy | `src/<vrstva>/AGENTS.md` |
| Rozhodnutí o architektuře vrstvy (ADR) | `src/<vrstva>/docs/decisions/` |
| Dokumentace šablony a nástrojů | `docs/` |

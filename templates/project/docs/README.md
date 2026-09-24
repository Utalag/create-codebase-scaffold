# Projektová dokumentace

Tato složka obsahuje dokumentaci k celému projektu. Dokumentace konkrétní vrstvy
patří do `src/<Layer>/docs/`.

## Obsah

- [`layers.md`](layers.md) — přehled vrstev, jejich odpovědností a směru závislostí.
<!--#if full-->
- [`agent-config.md`](agent-config.md) — jak funguje agentní konfigurace napříč vrstvami.
<!--#endif-->

## Kam co patří

| Typ dokumentu | Umístění |
| --- | --- |
| Globální konvence a návod pro agenty | `AGENTS.md` (root) |
| Společná pravidla vrstev | `src/AGENTS.md` |
| Guardrails jedné vrstvy | `src/<Layer>/AGENTS.md` |
| Rozhodnutí o architektuře vrstvy (ADR) | `src/<Layer>/docs/decisions/` |
| Dokumentace projektu a nástrojů | `docs/` |

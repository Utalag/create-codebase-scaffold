# __PROJECT_NAME__

Jazykově neutrální, vrstvený projekt připravený pro vývoj řízený AI agenty.

## Architektura

**__ARCH_LABEL__** — __ARCH_DESCRIPTION__

Každá vrstva v `src/` má vlastní guardrails pro agenty, vlastní testy a vlastní
dokumentaci. Společná pravidla jsou v `AGENTS.md` a `src/AGENTS.md`.

Podrobnosti o vrstvách a směru závislostí: [`docs/layers.md`](docs/layers.md).
Jak funguje agentní konfigurace: [`docs/agent-config.md`](docs/agent-config.md).

## Struktura

```text
__PROJECT_TREE__
```

## Rychlý start

```text
# Založ novou vrstvu
__NEW_LAYER_CMD__

# Ověř strukturu vrstvy
__VERIFY_CMD__

# Spusť testy vrstvy
__TEST_CMD__
```
<!--#if full-->

```text
# Synchronizuj agentní konfiguraci do root .cursor/
__SYNC_CMD__

# Ověř, že konfigurace není zastaralá
__SYNC_CHECK_CMD__
```
<!--#endif-->

## Jak pracovat s vrstvou

1. Zjisti odpovědnost vrstvy v `src/<Layer>/README.md` a guardrails v `src/<Layer>/AGENTS.md`.
2. Implementuj nejmenší změnu, která respektuje směr závislostí.
3. Doplň testy v `src/<Layer>/tests/`.
4. Spusť testy a ověření vrstvy (viz Rychlý start).

## Skripty

Manuální použití skriptů je popsané v [`scripts/README.md`](scripts/README.md)
(česky v [`scripts/README.cs.md`](scripts/README.cs.md)).

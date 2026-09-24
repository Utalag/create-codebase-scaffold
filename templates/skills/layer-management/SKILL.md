---
name: layer-management
description: Zakládá a kontroluje architektonické vrstvy ve src/ přes skript. Použij, když má vzniknout nová vrstva, nebo když je potřeba ověřit strukturu, konfiguraci či testy vrstvy.
disable-model-invocation: true
---

# Správa vrstev

Vrstvy se nikdy nezakládají ručním kopírováním složek — vždy skriptem, aby
zůstala zachována jednotná anatomie vrstvy a správný směr závislostí.

## Založení nové vrstvy

1. Zjisti od uživatele název vrstvy v PascalCase (např. `Billing`, `AntiFraud`)
   a její odpovědnost.
2. Založ vrstvu skriptem:

   ```text
   __NEW_LAYER_CMD__
   ```

3. Doplň guardrails v `src/<Layer>/AGENTS.md`. Skript vloží výchozí sadu;
   u neznámé vrstvy obsahuje markery `DOPLŇ:`, které musíš nahradit konkrétními
   pravidly.
<!--#if full-->
4. Synchronizuj agentní konfiguraci:

   ```text
   __SYNC_CMD__
   ```
<!--#endif-->
5. Ověř strukturu vrstvy:

   ```text
   __VERIFY_CMD__
   ```

6. Spusť testy vrstvy:

   ```text
   __TEST_CMD__
   ```

## Kontrola vrstvy

Při kontrole vrstvy postupně ověř:

1. `src/<Layer>/AGENTS.md` neobsahuje markery `DOPLŇ:` a má sekci `## Guardrails`.
2. Vrstva neporušuje směr závislostí ze `src/AGENTS.md`.
3. Struktura vrstvy odpovídá povinné anatomii (`AGENTS.md`, `README.md`, `src/`,
   `tests/unit`, `tests/integration`, `docs/decisions`).
4. Testy vrstvy procházejí.

Odchylky nahlas a navrhni konkrétní opravu. Strukturu ověř skriptem výše, ne ručně.

## Pravidla

- Skript nikdy nepřepisuje existující soubory. Přepsání vynutíš jen výslovným
  přepínačem pro přepsání, a to pouze po souhlasu uživatele.
- Nezakládej vrstvu ručním kopírováním složek ani nevytvářej soubory vrstvy ručně.
- Když požadavek nepatří do zvolené vrstvy, řekni to a doporuč správnou vrstvu.

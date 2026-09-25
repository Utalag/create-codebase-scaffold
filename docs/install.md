# Instalační guide

Jak dostat `create-codebase-scaffold` na stroj a spustit ho. Jde o **generátor** —
ten se instaluje. Vygenerovaný projekt se neinstaluje, jen se v něm píše kód.

## 1. Požadavky

| Požadavek | Proč | Poznámka |
| --- | --- | --- |
| Node.js **>= 20** | generátor používá ESM, `node --test` a `node:readline/promises` | `node --version` |
| `git` | jen pro `--git-init` | bez něj se vygeneruje vše ostatní |
| PowerShell 7+ (`pwsh`) | jen když generuješ projekt s `--tooling pwsh` | pro `--tooling node` není potřeba |

`node` stačí jeden — generátor sám žádné závislosti nemá a `npm install` v repu
generátoru nic nestahuje.

## 2. Spuštění bez instalace (ze zdrojů)

Zatím doporučená cesta. Balíček není publikovaný v npm registru, takže
`npx create-codebase-scaffold` skončí chybou `404 Not Found`.

```bash
git clone <adresa-repa> create-codebase-scaffold
cd create-codebase-scaffold
node bin/create.js my-app
```

Repozitář funguje přímo ze zdrojů — `bin/create.js` si zbytek dotáhne z `lib/`
a `templates/` relativně, takže se nic neinstaluje a nic nekopíruje.

## 3. Instalace z npm

Až bude balíček publikovaný, půjdou i tyto dvě varianty. Do té doby platí
varianta ze zdrojů.

```bash
# jednorázově, bez instalace
npx create-codebase-scaffold my-app

# globálně, příkaz zůstane v PATH
npm install -g create-codebase-scaffold
create-codebase-scaffold my-app
```

Z lokální kopie se dá příkaz zaregistrovat i přes `npm link`, což se hodí při
vývoji generátoru:

```bash
npm link                       # v repu generátoru
create-codebase-scaffold my-app
npm unlink -g create-codebase-scaffold
```

## 4. Ověření instalace

Trojice příkazů, která nic nezapisuje:

```bash
node bin/create.js --version   # vypíše verzi z package.json
node bin/create.js --help      # vypíše volby a zásadu nedestruktivnosti
node bin/create.js --list      # vypíše presety a jejich vrstvy
```

Když `--version` projde, máš funkční generátor.

## 5. První projekt

```bash
# interaktivní průvodce — doptá se na preset, tooling, machinery a ekosystémy
node bin/create.js my-app

# neinteraktivně
node bin/create.js my-api --preset hexagonal --tooling node --machinery full \
  --agents cursor,claude

# volný seznam vrstev místo presetu
node bin/create.js app --layers Domain,Application,Adapters,Shared
```

Bez `--tooling` se použije výchozí **`node`** (generátor je sám Node CLI, takže
na Linux/macOS greenfieldu nic dalšího nepotřebuješ). PowerShell je explicitní
opt-in přes `--tooling pwsh`.

Než začneš zapisovat, ověř, že projekt je v pořádku:

```bash
cd my-api
node scripts/verify-layer.mjs --layer Domain   # u --tooling pwsh: pwsh -File scripts/verify-layer.ps1 -Layer Domain
```

Existující soubor generátor nikdy nepřepíše. Opakované spuštění nad hotovým
projektem je proto bezpečné; přepis vynutíš jen `--force`. Chceš-li nejdřív
vidět plán, použij `--dry-run`.

## 6. Odinstalace

| Způsob instalace | Jak pryč |
| --- | --- |
| ze zdrojů | smazat naklonovanou složku |
| přes `npx` | nic se neinstaluje, není co uklízet |
| globálně | `npm uninstall -g create-codebase-scaffold` |
| přes `npm link` | `npm unlink -g create-codebase-scaffold` |

Vygenerované projekty jsou samostatné složky — odinstalace generátoru se jich
nijak nedotkne.

## 7. Řešení problémů

| Projev | Příčina a řešení |
| --- | --- |
| `404 Not Found - GET .../create-codebase-scaffold` | balíček ještě není v npm registru; použij variantu ze zdrojů (část 2) |
| `Neznámá volba: '--foo'` | překlep v názvu volby; CLI neznámé volby odmítne, neignoruje je |
| `Neznámý ekosystém: ...` | `--agents` bere jen `cursor`, `copilot`, `codex`, `claude` nebo `all` |
| `Neplatná hodnota pro --tooling` | povoleno je `pwsh` nebo `node` |
| `pwsh: not found` | zvol `--tooling node`, nebo doinstaluj PowerShell 7 |
| `verify-layer` hlásí nevyplněné placeholdery | v `AGENTS.md` vrstvy zůstaly markery `DOPLŇ:`; nahraď je konkrétními guardrails |
| příkaz `create-codebase-scaffold` není nalezen | globální instalace nebo `npm link` neproběhly, nebo `PATH` neobsahuje npm prefix |

## Související dokumentace

- [`generator.md`](generator.md) — jak generátor funguje a jaké má volby.
- [`templates.md`](templates.md) — šablony, placeholdery a podmínky.
- [`agent-config.md`](agent-config.md) — rozdíl mezi `machinery=full` a `lean`.

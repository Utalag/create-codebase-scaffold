# Vrstvy, presety a archetypy

Jak generátor skládá vrstvy vygenerovaného projektu. Zdroj pravdy je
[`lib/presets.js`](../lib/presets.js) — tenhle dokument ho popisuje, ale
needituj ho místo něj.

> Tohle je dokumentace **generátoru**. Vygenerovaný projekt dostane vlastní
> `docs/layers.md` (šablona [`templates/project/docs/layers.md`](../templates/project/docs/layers.md)),
> kde jsou konkrétní vrstvy daného projektu.

## Presety

Preset určuje **které** vrstvy projekt má a jak smějí záviset. Vybereš ho volbou
`--preset`; volný seznam vrstev přes `--layers` ho přebije.

| Preset | Vrstvy | Archetypy vrstev |
| --- | --- | --- |
| `clean` | Domain, Application, Infrastructure, Presentation, Shared | `domain`, `application`, `infrastructure`, `presentation`, `shared` |
| `hexagonal` | Domain, Application, Adapters, Shared | `domain`, `application`, `adapters`, `shared` |
| `layered` | Presentation, Business, Data, Shared | `presentation`, `business`, `data`, `shared` |
| `vertical-slice` | Features, Infrastructure, Shared | `features`, `infrastructure`, `shared` |
| `custom` | podle `--layers` | odhadne se z názvu (viz níže) |

### Směr závislostí v presetech

Pojmenované presety nesou **explicitní** směr závislostí. Ten má přednost před
`canonicalDeps` archetypu a propisuje se do `src/AGENTS.md`, `AGENTS.md` vrstvy
a `docs/layers.md` vygenerovaného projektu.

| Preset | Vrstva | Smí záviset na |
| --- | --- | --- |
| `clean` | Presentation | Application, Shared |
| | Infrastructure | Application, Domain, Shared |
| | Application | Domain, Shared |
| | Domain | Shared |
| | Shared | — |
| `hexagonal` | Adapters | Application, Domain, Shared |
| | Application | Domain, Shared |
| | Domain | Shared |
| | Shared | — |
| `layered` | Presentation | Business, Shared |
| | Business | Data, Shared |
| | Data | Shared |
| | Shared | — |
| `vertical-slice` | Features | Shared |
| | Infrastructure | Shared |
| | Shared | — |

Povolené závislosti se vždy **filtrují na vrstvy, které v projektu skutečně
existují**. Když tedy volný seznam vrstev `Data` neobsahuje, vrstva `Business`
zůstane jen u `Shared` — nikdy nevznikne odkaz na neexistující vrstvu.

## Archetypy

Archetyp je šablona odpovědnosti a guardrails. Preset mapuje názvy vrstev na
archetypy; volný seznam vrstev je odhaduje z názvu.

| Archetyp | Smí záviset na (`canonicalDeps`) | Odpovědnost |
| --- | --- | --- |
| `domain` | Shared | Čistá business logika, entity, invarianty |
| `application` | Domain, Shared | Orchestrace use-case, definice portů |
| `infrastructure` | Application, Domain, Shared | Implementace portů, veškerý vnější přístup |
| `presentation` | Application, Shared | Vstupní bod, validace, mapování |
| `shared` | — | Průřezové primitivy bez závislostí |
| `adapters` | Application, Domain, Shared | Řídící i řízené adaptéry na hranici aplikace |
| `business` | Data, Shared | Business pravidla bez znalosti transportu a úložiště |
| `data` | Shared | Repozitáře, mapování, dotazy, transakce |
| `features` | Shared | Vertikální řez jednou funkcionalitou |
| `default` | `null` (nutno doplnit) | Obecná sada s markery `DOPLŇ:` |

### `domain`

**Odpovědnost:** Čistá business logika. Entita, value object, doménová služba
a invarianty. Vrstva neví nic o tom, jak je aplikace spuštěna ani odkud přicházejí
data.

**Guardrails:**

- Žádné I/O: nesmí sahat na databázi, síť, filesystem, systémový čas ani náhodu.
- Žádné frameworky, anotace ani serializace závislé na infrastruktuře.
- Veškerá logika je deterministická a testovatelná bez mocků a bez běžícího prostředí.
- Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry, nikdy jako volání uvnitř.
- Entita chrání své invarianty: neplatný stav nesmí být možné vytvořit.
- Doménové chyby jsou explicitní typy, ne obecné výjimky ani návratové kódy.

### `application`

**Odpovědnost:** Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět
a řídí tok mezi doménou a adaptéry.

**Guardrails:**

- Neobsahuje business pravidla — ta patří do `Domain`.
- Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.
- Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.
- Transakční hranice, idempotence a řazení kroků patří sem.
- Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.
- Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.

### `infrastructure`

**Odpovědnost:** Implementace portů a veškerý přístup k vnějšímu světu: databáze,
HTTP klienti, filesystem, fronty, cache, e-maily.

**Guardrails:**

- Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.
- Implementuje porty definované v `Application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Chyby adaptérů překládá na explicitní chyby doménového typu.
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.
- Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).

### `presentation`

**Odpovědnost:** Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti
zpráv. Překládá vnější vstup na volání use-case.

**Guardrails:**

- Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.
- Neobsahuje business logiku ani přímý přístup k datům.
- Volá výhradně use-casy z `Application`.
- Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.
- Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.

### `shared`

**Odpovědnost:** Průřezové primitivy bez závislostí: výsledkové typy, chybová
hierarchie, hodnotové utility, společné typy.

**Guardrails:**

- Nesmí záviset na žádné jiné vrstvě.
- Nesmí obsahovat business logiku konkrétní domény.
- Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.
- Bez stavu, bez I/O, bez konfigurace.
- Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.

### `adapters`

**Odpovědnost:** Adaptéry na hranici aplikace: řídící (HTTP, CLI, konzumenti)
i řízené (perzistence, klienti, fronty). Překládají vnější svět na volání portů.

**Guardrails:**

- Vlastní veškerý kontakt s vnějším světem; doména ani aplikace nesmí volat vnějšek přímo.
- Implementuje porty definované v `Application`; nikdy je nedefinuje ani nemění.
- Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.
- Řídící a řízené adaptéry drž oddělené (např. `inbound/` a `outbound/`).
- Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátované v kódu.

### `business`

**Odpovědnost:** Business logika a pravidla aplikace. Zpracovává požadavky
a rozhoduje o chování; nezná transport ani konkrétní úložiště.

**Guardrails:**

- Obsahuje veškerá business pravidla a invarianty; nezná HTTP ani databázi.
- Přistupuje k datům výhradně přes rozhraní vrstvy `Data`, nikdy přímo.
- Je deterministická a testovatelná bez běžícího prostředí.
- Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry.
- Chyby vyjadřuje explicitními typy, ne návratovými kódy.

### `data`

**Odpovědnost:** Přístup k datům a perzistenci: repozitáře, mapování a dotazy.
Vlastní veškerou komunikaci s úložištěm.

**Guardrails:**

- Vlastní veškerý přístup k databázi, souborům a externím úložištím.
- Neobsahuje business pravidla — pouze čtení, zápis a mapování.
- Vystavuje rozhraní, přes která k němu přistupuje vrstva `Business`.
- Transakce a dávkové operace řeší zde, ne ve vyšších vrstvách.
- Konfigurace připojení se čte z prostředí.

### `features`

**Odpovědnost:** Vertikální řez jednou funkcionalitou od vstupu po výstup, včetně
vlastních pravidel a přístupu k datům.

**Guardrails:**

- Každá feature je samostatná a nezávislá na ostatních featurách.
- Feature vlastní svou logiku i přístup k datům; nesdílí modely s jinými featurami.
- Sdílené primitivy patří do `Shared`, ne do feature.
- Nevstupuje do jiných vrstev kromě `Shared`.
- Drž feature malou a čitelnou; při růstu ji rozděl na dílčí featuru.

### `default`

Archetyp pro vrstvu, kterou generátor nezná. Nemá `canonicalDeps`, takže směr
závislostí zůstane nedoplněný, a v odpovědnosti i guardrails zůstanou markery
`DOPLŇ:`. Dokud tam jsou, `verify-layer` vrstvu odmítne — guardrails mají být
konkrétní, ne obecné fráze.

## Jak se archetyp vybere

Pro každou vrstvu se hledá v tomto pořadí:

1. **Přesná shoda** klíče archetypu s názvem vrstvy (`Shared` → `shared`).
2. **Shoda podle slugu** — z názvu se udělá kebab-case a porovná se slugy
   archetypů (`AntiFraud` → `anti-fraud`).
3. **`default`** — obecná sada s markery `DOPLŇ:`.

Název vrstvy je vždy PascalCase; normalizaci a slug řeší
[`lib/naming.js`](../lib/naming.js) (viz [`generator.md`](generator.md)).

Volný seznam vrstev bere směr závislostí **jen** z `canonicalDeps` archetypu —
preset s explicitními závislostmi se u `--layers` nepoužije. U známých jmen
(`Domain`, `Business`, `Shared`, …) to vyjde stejně, u neznámých vznikne
`default` s neúplným směrem závislostí.

## Kde co měnit

| Chci změnit | Kde |
| --- | --- |
| Odpovědnost nebo guardrails archetypu | [`lib/presets.js`](../lib/presets.js) (`ARCHETYPES`) |
| Vrstvy nebo směr závislostí presetu | [`lib/presets.js`](../lib/presets.js) (`PRESETS`) |
| Text guardrails ve vygenerovaném projektu | [`templates/layer/AGENTS.md`](../templates/layer/AGENTS.md) |
| Dokumentaci vrstev ve vygenerovaném projektu | [`templates/project/docs/layers.md`](../templates/project/docs/layers.md) |

Po každé změně platí: `npm test` prochází a presety odkazují jen na definované
archetypy. Přesný postup je v [`templates.md`](templates.md).

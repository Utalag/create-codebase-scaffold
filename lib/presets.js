import { layerSlug, layerTitle } from './naming.js';
import { DEFAULT_LANG, normalizeLang } from './i18n.js';

/**
 * Archetypy vrstev.
 *
 * Archetyp určuje odpovědnost a guardrails vrstvy. Konkrétní název vrstvy se
 * na archetyp mapuje buď explicitně (preset), nebo odhadem podle slugu názvu
 * (volný seznam vrstev). Neznámý archetyp dostane generickou sadu s markery
 * `DOPLŇ:` (cs) / `TODO:` (en), které je nutné doplnit.
 *
 * Texty jsou dvojjazyčné: výchozí pole (`responsibility`, `guardrails`) jsou
 * česky, anglická varianta je v `en`. Konkrétní jazyk vybírá `localizedArchetype`.
 *
 * `canonicalDeps` je směr závislostí odvozený od archetypu; u pojmenovaných
 * presetů se používá jako výchozí hodnota, u volného seznamu vrstev jako
 * jediný zdroj. Vždy se filtruje na vrstvy, které v projektu skutečně existují.
 */
export const ARCHETYPES = {
  domain: {
    responsibility:
      'Čistá business logika. Entita, value object, doménová služba a invarianty. ' +
      'Vrstva neví nic o tom, jak je aplikace spuštěna ani odkud přicházejí data.',
    canonicalDeps: ['Shared'],
    guardrails: [
      'Žádné I/O: nesmí sahat na databázi, síť, filesystem, systémový čas ani náhodu.',
      'Žádné frameworky, anotace ani serializace závislé na infrastruktuře.',
      'Veškerá logika je deterministická a testovatelná bez mocků a bez běžícího prostředí.',
      'Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry, nikdy jako volání uvnitř.',
      'Entita chrání své invarianty: neplatný stav nesmí být možné vytvořit.',
      'Doménové chyby jsou explicitní typy, ne obecné výjimky ani návratové kódy.',
    ],
    en: {
      responsibility:
        'Pure business logic. Entities, value objects, domain services and invariants. ' +
        'The layer knows nothing about how the application runs or where data comes from.',
      guardrails: [
        'No I/O: must not touch a database, network, filesystem, system clock or randomness.',
        'No infrastructure-dependent frameworks, annotations or serialization.',
        'All logic is deterministic and testable without mocks or a running environment.',
        'External influences (time, IDs, configuration) arrive as parameters, never as internal calls.',
        'The entity protects its invariants: an invalid state must not be constructible.',
        'Domain errors are explicit types, not generic exceptions or return codes.',
      ],
    },
  },
  application: {
    responsibility:
      'Orchestrace use-case. Definuje porty (rozhraní) pro vnější svět a řídí tok ' +
      'mezi doménou a adaptéry.',
    canonicalDeps: ['Domain', 'Shared'],
    guardrails: [
      'Neobsahuje business pravidla — ta patří do `Domain`.',
      'Definuje porty (rozhraní) pro vnější svět, ale nikdy je neimplementuje.',
      'Nesmí přímo volat databázi, HTTP, filesystem, frontu ani cache.',
      'Transakční hranice, idempotence a řazení kroků patří sem.',
      'Každý use-case má jednu veřejnou vstupní metodu a explicitní vstupní i výstupní typ.',
      'Závislosti na vnějšku dostává vstřikované přes konstruktor jako porty.',
    ],
    en: {
      responsibility:
        'Use-case orchestration. Defines ports (interfaces) for the outside world and ' +
        'drives the flow between the domain and adapters.',
      guardrails: [
        'Contains no business rules — those belong in `Domain`.',
        'Defines ports (interfaces) for the outside world but never implements them.',
        'Must not call a database, HTTP, filesystem, queue or cache directly.',
        'Transaction boundaries, idempotence and step ordering belong here.',
        'Each use case has one public entry method and explicit input and output types.',
        'External dependencies are injected through the constructor as ports.',
      ],
    },
  },
  infrastructure: {
    responsibility:
      'Implementace portů a veškerý přístup k vnějšímu světu: databáze, HTTP klienti, ' +
      'filesystem, fronty, cache, e-maily.',
    canonicalDeps: ['Application', 'Domain', 'Shared'],
    guardrails: [
      'Vlastní veškerý přístup k vnějšímu světu. Žádná jiná vrstva nesmí volat vnějšek přímo.',
      'Implementuje porty definované v `Application`; nikdy je nedefinuje ani nemění.',
      'Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.',
      'Chyby adaptérů překládá na explicitní chyby doménového typu.',
      'Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátovaná v kódu.',
      'Každý adaptér je testovatelný proti reálné závislosti (testcontainers, lokální služba).',
    ],
    en: {
      responsibility:
        'Port implementations and all access to the outside world: databases, HTTP clients, ' +
        'filesystem, queues, cache, e-mail.',
      guardrails: [
        'Owns all access to the outside world. No other layer may call the outside directly.',
        'Implements the ports defined in `Application`; never defines or changes them.',
        'Contains no business logic — only translation between the domain model and the outside.',
        'Translates adapter errors into explicit domain error types.',
        'Configuration and secrets are read from the environment, never hardcoded.',
        'Every adapter is testable against a real dependency (testcontainers, local service).',
      ],
    },
  },
  presentation: {
    responsibility:
      'Vstupní bod aplikace: HTTP handlery, CLI příkazy, konzumenti zpráv. Překládá ' +
      'vnější vstup na volání use-case.',
    canonicalDeps: ['Application', 'Shared'],
    guardrails: [
      'Obsahuje pouze validaci vstupu, mapování na use-case a formátování výstupu.',
      'Neobsahuje business logiku ani přímý přístup k datům.',
      'Volá výhradně use-casy z `Application`.',
      'Mapování chyb domény na transportní odpovědi patří sem, ale rozhodnutí o chybě ne.',
      'Žádná pravidla ani invarianty — pouze překlad mezi vnějším a vnitřním světem.',
    ],
    en: {
      responsibility:
        'The application entry point: HTTP handlers, CLI commands, message consumers. ' +
        'Translates external input into use-case calls.',
      guardrails: [
        'Contains only input validation, mapping to a use case and output formatting.',
        'Contains no business logic and no direct data access.',
        'Calls only use cases from `Application`.',
        'Mapping domain errors to transport responses belongs here, but the error decision does not.',
        'No rules or invariants — only translation between the external and internal world.',
      ],
    },
  },
  shared: {
    responsibility:
      'Průřezové primitivy bez závislostí: výsledkové typy, chybová hierarchie, ' +
      'hodnotové utility, společné typy.',
    canonicalDeps: [],
    guardrails: [
      'Nesmí záviset na žádné jiné vrstvě.',
      'Nesmí obsahovat business logiku konkrétní domény.',
      'Změna zde má dopad na všechny vrstvy — drž ji minimální a stabilní.',
      'Bez stavu, bez I/O, bez konfigurace.',
      'Preferuj primitiva a typy před obecnými frameworky a "utils" kontejnery.',
    ],
    en: {
      responsibility:
        'Cross-cutting dependency-free primitives: result types, error hierarchy, ' +
        'value utilities, shared types.',
      guardrails: [
        'Must not depend on any other layer.',
        'Must not contain business logic of a specific domain.',
        'A change here affects all layers — keep it minimal and stable.',
        'No state, no I/O, no configuration.',
        'Prefer primitives and types over generic frameworks and "utils" containers.',
      ],
    },
  },
  adapters: {
    responsibility:
      'Adaptéry na hranici aplikace: řídící (HTTP, CLI, konzumenti) i řízené ' +
      '(perzistence, klienti, fronty). Překládají vnější svět na volání portů.',
    canonicalDeps: ['Application', 'Domain', 'Shared'],
    guardrails: [
      'Vlastní veškerý kontakt s vnějším světem; doména ani aplikace nesmí volat vnějšek přímo.',
      'Implementuje porty definované v `Application`; nikdy je nedefinuje ani nemění.',
      'Neobsahuje business logiku — pouze překlad mezi doménovým modelem a vnějškem.',
      'Řídící a řízené adaptéry drž oddělené (např. `inbound/` a `outbound/`).',
      'Konfigurace a tajemství se čtou z prostředí, nikdy nejsou zadrátované v kódu.',
    ],
    en: {
      responsibility:
        'Adapters at the application boundary: driving (HTTP, CLI, consumers) and driven ' +
        '(persistence, clients, queues). They translate the outside world into port calls.',
      guardrails: [
        'Owns all contact with the outside world; the domain and application must not call the outside directly.',
        'Implements the ports defined in `Application`; never defines or changes them.',
        'Contains no business logic — only translation between the domain model and the outside.',
        'Keep driving and driven adapters separate (e.g. `inbound/` and `outbound/`).',
        'Configuration and secrets are read from the environment, never hardcoded.',
      ],
    },
  },
  business: {
    responsibility:
      'Business logika a pravidla aplikace. Zpracovává požadavky a rozhoduje o chování; ' +
      'nezná transport ani konkrétní úložiště.',
    canonicalDeps: ['Data', 'Shared'],
    guardrails: [
      'Obsahuje veškerá business pravidla a invarianty; nezná HTTP ani databázi.',
      'Přistupuje k datům výhradně přes rozhraní vrstvy `Data`, nikdy přímo.',
      'Je deterministická a testovatelná bez běžícího prostředí.',
      'Vnější vlivy (čas, ID, konfigurace) přicházejí jako parametry.',
      'Chyby vyjadřuje explicitními typy, ne návratovými kódy.',
    ],
    en: {
      responsibility:
        'Business logic and application rules. Processes requests and decides behaviour; ' +
        'it knows neither transport nor a concrete store.',
      guardrails: [
        'Contains all business rules and invariants; it knows neither HTTP nor a database.',
        'Accesses data exclusively through interfaces of the `Data` layer, never directly.',
        'Is deterministic and testable without a running environment.',
        'External influences (time, IDs, configuration) arrive as parameters.',
        'Expresses errors with explicit types, not return codes.',
      ],
    },
  },
  data: {
    responsibility:
      'Přístup k datům a perzistenci: repozitáře, mapování a dotazy. Vlastní veškerou ' +
      'komunikaci s úložištěm.',
    canonicalDeps: ['Shared'],
    guardrails: [
      'Vlastní veškerý přístup k databázi, souborům a externím úložištím.',
      'Neobsahuje business pravidla — pouze čtení, zápis a mapování.',
      'Vystavuje rozhraní, přes která k němu přistupuje vrstva `Business`.',
      'Transakce a dávkové operace řeší zde, ne ve vyšších vrstvách.',
      'Konfigurace připojení se čte z prostředí.',
    ],
    en: {
      responsibility:
        'Data access and persistence: repositories, mapping and queries. Owns all ' +
        'communication with the store.',
      guardrails: [
        'Owns all access to databases, files and external stores.',
        'Contains no business rules — only reads, writes and mapping.',
        'Exposes interfaces through which the `Business` layer accesses it.',
        'Transactions and batch operations are handled here, not in higher layers.',
        'Connection configuration is read from the environment.',
      ],
    },
  },
  features: {
    responsibility:
      'Vertikální řez jednou funkcionalitou od vstupu po výstup, včetně vlastních ' +
      'pravidel a přístupu k datům.',
    canonicalDeps: ['Shared'],
    guardrails: [
      'Každá feature je samostatná a nezávislá na ostatních featurách.',
      'Feature vlastní svou logiku i přístup k datům; nesdílí modely s jinými featurami.',
      'Sdílené primitivy patří do `Shared`, ne do feature.',
      'Nevstupuje do jiných vrstev kromě `Shared`.',
      'Drž feature malou a čitelnou; při růstu ji rozděl na dílčí featuru.',
    ],
    en: {
      responsibility:
        'A vertical slice of one feature from input to output, including its own ' +
        'rules and data access.',
      guardrails: [
        'Each feature is self-contained and independent of the others.',
        'A feature owns its logic and data access; it does not share models with other features.',
        'Shared primitives belong in `Shared`, not in a feature.',
        'It does not enter other layers besides `Shared`.',
        'Keep the feature small and readable; when it grows, split it into sub-features.',
      ],
    },
  },
  default: {
    responsibility:
      'DOPLŇ: Popiš odpovědnost vrstvy jednou konkrétní větou. Co je jejím výhradním ' +
      'vlastnictvím a co do ní naopak nepatří?',
    canonicalDeps: null,
    guardrails: [
      'DOPLŇ: Formuluj 4-6 konkrétních, kontrolovatelných zákazů a povinností.',
      'DOPLŇ: Uveď, co do vrstvy nepatří, i když to na první pohled souvisí.',
      'DOPLŇ: Uveď, jak se vrstva testuje a co musí být v testech zakázané.',
      'Výchozí: dodrž směr závislostí z `AGENTS.md` a nevytvářej nové křížové závislosti.',
    ],
    en: {
      responsibility:
        'TODO: Describe the layer responsibility in one concrete sentence. What does it ' +
        'exclusively own, and what does not belong in it?',
      guardrails: [
        'TODO: Formulate 4-6 concrete, checkable prohibitions and duties.',
        'TODO: State what does not belong in the layer, even if it seems related.',
        'TODO: State how the layer is tested and what must be forbidden in tests.',
        'Default: follow the dependency direction from `AGENTS.md` and do not create new cross-layer dependencies.',
      ],
    },
  },
};

/**
 * Pojmenované architektonické presety.
 *
 * `dependencies` je explicitní směr závislostí (vnější -> vnitřnější). Přesně
 * určuje, co smí která vrstva importovat, a promítá se do `src/AGENTS.md`.
 */
export const PRESETS = {
  clean: {
    id: 'clean',
    label: 'Clean Architecture',
    description: 'Domain, Application, Infrastructure, Presentation, Shared.',
    layers: ['Domain', 'Application', 'Infrastructure', 'Presentation', 'Shared'],
    dependencies: {
      Presentation: ['Application', 'Shared'],
      Infrastructure: ['Application', 'Domain', 'Shared'],
      Application: ['Domain', 'Shared'],
      Domain: ['Shared'],
      Shared: [],
    },
  },
  hexagonal: {
    id: 'hexagonal',
    label: 'Hexagonal (Ports & Adapters)',
    description: 'Domain, Application, Adapters, Shared.',
    layers: ['Domain', 'Application', 'Adapters', 'Shared'],
    dependencies: {
      Adapters: ['Application', 'Domain', 'Shared'],
      Application: ['Domain', 'Shared'],
      Domain: ['Shared'],
      Shared: [],
    },
  },
  layered: {
    id: 'layered',
    label: 'Classic Layered (N-tier)',
    description: 'Presentation, Business, Data, Shared.',
    layers: ['Presentation', 'Business', 'Data', 'Shared'],
    dependencies: {
      Presentation: ['Business', 'Shared'],
      Business: ['Data', 'Shared'],
      Data: ['Shared'],
      Shared: [],
    },
  },
  'vertical-slice': {
    id: 'vertical-slice',
    label: 'Vertical Slice',
    description: 'Features, Infrastructure, Shared.',
    layers: ['Features', 'Infrastructure', 'Shared'],
    dependencies: {
      Features: ['Shared'],
      Infrastructure: ['Shared'],
      Shared: [],
    },
  },
  custom: {
    id: 'custom',
    label: 'Vlastní seznam vrstev',
    description: 'Vrstvy zadané uživatelem; závislosti se odvodí od známých archetypů.',
    layers: null,
    dependencies: null,
    en: {
      label: 'Custom layer list',
      description: 'Layers entered by the user; dependencies are derived from known archetypes.',
    },
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

/** Vrátí lokalizovaný label/description presetu pro daný jazyk. */
export function presetInfo(preset, lang = DEFAULT_LANG) {
  if (normalizeLang(lang) === 'en' && preset.en) {
    return {
      label: preset.en.label ?? preset.label,
      description: preset.en.description ?? preset.description,
    };
  }

  return { label: preset.label, description: preset.description };
}

/** Vrátí lokalizovanou odpovědnost a guardrails archetypu. */
export function localizedArchetype(archetype, lang = DEFAULT_LANG) {
  if (normalizeLang(lang) === 'en' && archetype.en) {
    return {
      responsibility: archetype.en.responsibility,
      guardrails: [...archetype.en.guardrails],
    };
  }

  return { responsibility: archetype.responsibility, guardrails: [...archetype.guardrails] };
}

/** Najde archetyp pro název vrstvy: přesnou shodu, jinak shodu podle slugu, jinak `default`. */
function resolveArchetype(layerName) {
  if (Object.prototype.hasOwnProperty.call(ARCHETYPES, layerName)) {
    return layerName;
  }

  const slug = layerSlug(layerName);
  const match = Object.keys(ARCHETYPES).find((key) => layerSlug(key) === slug);
  return match ?? 'default';
}

function dedupe(list) {
  return [...new Set(list)];
}

/** Převede seznam závislostí na prose s explicitně vyjmenovanými zakázanými vrstvami. */
function describeDependencies(allowedDeps, known, lang) {
  const english = normalizeLang(lang) === 'en';

  if (!known) {
    return english
      ? 'TODO: List which layers this layer may import and which it never may. ' +
          'Derive it from the dependency direction in `src/AGENTS.md`.'
      : 'DOPLŇ: Vyjmenuj, které vrstvy smí tato vrstva importovat a které nikdy. ' +
          'Odvoď to od směru závislostí v `src/AGENTS.md`.';
  }

  if (allowedDeps.length === 0) {
    return english ? 'Must not depend on any other layer.' : 'Nesmí záviset na žádné jiné vrstvě.';
  }

  const allowed = allowedDeps.map((name) => `\`${name}\``).join(', ');
  return english ? `May depend only on ${allowed}.` : `Smí záviset pouze na ${allowed}.`;
}

function describeForbidden(layerName, allowedDeps, allNames) {
  const forbidden = allNames.filter((name) => name !== layerName && !allowedDeps.includes(name));
  return forbidden;
}

/**
 * Sestaví normalizovaný model architektury z presetu nebo volného seznamu vrstev.
 *
 * @param {{ presetId?: string, layers?: string[], lang?: 'cs'|'en' }} options
 * @returns {{
 *   id: string, label: string, description: string,
 *   layerNames: string[],
 *   edges: Array<{ from: string, to: string }>,
 *   layers: Array<{
 *     name: string, title: string, slug: string, archetype: string, known: boolean,
 *     responsibility: string, guardrails: string[],
 *     allowedDeps: string[], forbiddenDeps: string[], dependsOnProse: string
 *   }>
 * }}
 */
export function buildArchitecture({ presetId = 'clean', layers, lang = DEFAULT_LANG } = {}) {
  const isCustomList = Array.isArray(layers) && layers.length > 0;
  const preset = PRESETS[presetId] ?? PRESETS.clean;
  const info = presetInfo(preset, lang);

  const layerNames = dedupe(isCustomList ? layers : preset.layers ?? []);
  const present = new Set(layerNames);

  const model = layerNames.map((name) => {
    const archetype = resolveArchetype(name);
    const archetypeDef = ARCHETYPES[archetype];
    const localized = localizedArchetype(archetypeDef, lang);
    const known = archetypeDef.canonicalDeps !== null;

    let rawDeps;
    if (!isCustomList && preset.dependencies && preset.dependencies[name]) {
      rawDeps = preset.dependencies[name];
    } else if (archetypeDef.canonicalDeps) {
      rawDeps = archetypeDef.canonicalDeps;
    } else {
      rawDeps = [];
    }

    const allowedDeps = dedupe(rawDeps.filter((dep) => present.has(dep) && dep !== name));

    return {
      name,
      title: layerTitle(name),
      slug: layerSlug(name),
      archetype,
      known,
      responsibility: localized.responsibility,
      guardrails: localized.guardrails,
      allowedDeps,
      forbiddenDeps: describeForbidden(name, allowedDeps, layerNames),
      dependsOnProse: describeDependencies(allowedDeps, known, lang),
    };
  });

  const edges = [];
  for (const layer of model) {
    for (const dep of layer.allowedDeps) {
      edges.push({ from: layer.name, to: dep });
    }
  }

  return {
    id: isCustomList ? 'custom' : preset.id,
    label: isCustomList ? presetInfo(PRESETS.custom, lang).label : info.label,
    description: isCustomList ? presetInfo(PRESETS.custom, lang).description : info.description,
    layerNames,
    edges,
    layers: model,
  };
}

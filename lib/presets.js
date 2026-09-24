import { layerSlug, layerTitle } from './naming.js';

/**
 * Archetypy vrstev.
 *
 * Archetyp určuje odpovědnost a guardrails vrstvy. Konkrétní název vrstvy se
 * na archetyp mapuje buď explicitně (preset), nebo odhadem podle slugu názvu
 * (volný seznam vrstev). Neznámý archetyp dostane generickou sadu s markery
 * `DOPLŇ:`, které je nutné doplnit.
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
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

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
function describeDependencies(allowedDeps, known) {
  if (!known) {
    return (
      'DOPLŇ: Vyjmenuj, které vrstvy smí tato vrstva importovat a které nikdy. ' +
      'Odvoď to od směru závislostí v `src/AGENTS.md`.'
    );
  }

  if (allowedDeps.length === 0) {
    return 'Nesmí záviset na žádné jiné vrstvě.';
  }

  const allowed = allowedDeps.map((name) => `\`${name}\``).join(', ');
  return `Smí záviset pouze na ${allowed}.`;
}

function describeForbidden(layerName, allowedDeps, allNames) {
  const forbidden = allNames.filter((name) => name !== layerName && !allowedDeps.includes(name));
  return forbidden;
}

/**
 * Sestaví normalizovaný model architektury z presetu nebo volného seznamu vrstev.
 *
 * @param {{ presetId?: string, layers?: string[] }} options
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
export function buildArchitecture({ presetId = 'clean', layers } = {}) {
  const isCustomList = Array.isArray(layers) && layers.length > 0;
  const preset = PRESETS[presetId] ?? PRESETS.clean;

  const layerNames = dedupe(isCustomList ? layers : preset.layers ?? []);
  const present = new Set(layerNames);

  const model = layerNames.map((name) => {
    const archetype = resolveArchetype(name);
    const archetypeDef = ARCHETYPES[archetype];
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
      responsibility: archetypeDef.responsibility,
      guardrails: [...archetypeDef.guardrails],
      allowedDeps,
      forbiddenDeps: describeForbidden(name, allowedDeps, layerNames),
      dependsOnProse: describeDependencies(allowedDeps, known),
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
    label: isCustomList ? PRESETS.custom.label : preset.label,
    description: isCustomList ? PRESETS.custom.description : preset.description,
    layerNames,
    edges,
    layers: model,
  };
}

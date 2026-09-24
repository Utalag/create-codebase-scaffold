# __PROJECT_NAME__

Pokyny pro Claude. Úplná pravidla jsou v `AGENTS.md` (root), `src/AGENTS.md`
a `AGENTS.md` jednotlivých vrstev — přečti je, než začneš pracovat.

## Architektura

__ARCH_LABEL__ — __ARCH_DESCRIPTION__

Vrstvy: __LAYER_LIST__

Směr závislostí:

__DEPENDENCY_MERMAID__

Zakázané je zejména:

__DEPENDENCY_RULES__

## Konvence

- Nová vrstva se zakládá skriptem: `__NEW_LAYER_CMD__`
- Ověření vrstvy: `__VERIFY_CMD__`
- Testy vrstvy: `__TEST_CMD__`
- Každé netriviální rozhodnutí vrstvy zapiš jako ADR do `src/<Layer>/docs/decisions/`.
<!--#if full-->
- Po změně `src/<Layer>/.cursor/` spusť `__SYNC_CMD__`; nikdy needituj `.cursor/rules/generated/**`.
<!--#endif-->

# 0001 — Zaznamenáváme architektonická rozhodnutí jako ADR

- Status: accepted
- Datum: __YEAR__

## Kontext

Netriviální rozhodnutí (volba technologie, hranice vrstvy, tvar portu) se v týmu
snadno ztratí. Bez záznamu se stejné otázky řeší opakovaně a není vidět, proč
bylo rozhodnutí přijato.

## Rozhodnutí

Každé netriviální rozhodnutí vrstvy zapisujeme jako ADR do
`src/__LAYER__/docs/decisions/` s názvem `NNNN-kratky-nazev.md`, číslovaným
vzestupně od `0001`.

## Šablona ADR

```markdown
# NNNN — Krátký název rozhodnutí

- Status: proposed | accepted | deprecated | superseded
- Datum: YYYY-MM-DD

## Kontext

Jaká situace rozhodnutí vyvolala, jaká omezení platí.

## Rozhodnutí

Co přesně jsme se rozhodli udělat.

## Důsledky

Co je díky tomu jednodušší a co naopak složitější.

## Alternativy

Jaké jiné možnosti jsme zvažovali a proč jsme je zamítli.
```

## Důsledky

- Pozitivní: rozhodnutí je dohledatelné a nový člen týmu získá kontext.
- Pozitivní: agenti mají jasnou oporu při návrhu změn.
- Negativní: zápis ADR je další krok, který je nutné nepodcenit.

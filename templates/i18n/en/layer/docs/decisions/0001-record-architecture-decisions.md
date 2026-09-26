# 0001 — We record architecture decisions as ADRs

- Status: accepted
- Date: __YEAR__

## Context

Non-trivial decisions (technology choice, layer boundary, port shape) are easily
lost in a team. Without a record the same questions get solved repeatedly and it
is not visible why a decision was made.

## Decision

We record every non-trivial layer decision as an ADR in
`src/__LAYER__/docs/decisions/` named `NNNN-short-name.md`, numbered ascending
from `0001`.

## ADR template

```markdown
# NNNN — Short decision title

- Status: proposed | accepted | deprecated | superseded
- Date: YYYY-MM-DD

## Context

What situation triggered the decision, which constraints apply.

## Decision

What exactly we decided to do.

## Consequences

What becomes easier and what becomes harder because of it.

## Alternatives

Which other options we considered and why we rejected them.
```

## Consequences

- Positive: the decision is traceable and a new team member gains context.
- Positive: agents have a clear basis when designing changes.
- Negative: writing the ADR is an extra step that must not be underestimated.

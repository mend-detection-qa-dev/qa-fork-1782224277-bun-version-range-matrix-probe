# bun-version-range-matrix-probe

Probe #16 — Tier 4 (official-docs gap), `bun-version-range-matrix-probe`.

## Patterns

This probe exercises all seven semver version-constraint operators documented in
`docs/BUN_COVERAGE_PLAN.md §3.3` (C1–C7), each bound to a separate direct dependency:

| ID | Operator | Package | Declared constraint | Resolved version |
|----|----------|---------|--------------------|--------------------|
| C1 | Caret `^` | `lodash` | `^4.17.0` | `4.18.1` |
| C2 | Tilde `~` | `is-odd` | `~3.0.0` | `3.0.1` |
| C3 | Exact pin | `left-pad` | `1.3.0` | `1.3.0` |
| C4 | Wildcard `*` | `is-even` | `*` | `1.0.0` |
| C5 | Compound AND | `tslib` | `>=2.0.0 <3.0.0` | `2.8.1` |
| C6 | Compound OR | `ms` | `^2.0.0 \|\| ^3.0.0` | `2.1.3` |
| C7 | Pre-release lower bound | `zod` | `^4.0.0-beta.1` | `4.4.3` |

## Why one probe

This is a pure semver-syntax stress test. Every operator corresponds to a distinct
code path in a semver resolution library. Bundling all seven into a single probe means:

- A failure localises immediately to the operator — if `tslib` is missing, the compound
  AND parser is the bug; if `zod` is wrong, the pre-release handling is the bug.
- A single ReportPortal step captures all seven assertions together; divergence from
  `expected-tree.json` is trivially attributable to the operator whose dep is missing
  or mis-versioned.
- Probe size stays minimal (7 direct deps + 3 transitives = 10 packages total).

## Mend config

No `.whitesource` file is emitted with this probe.

Rationale: Bun is NOT in the Mend `install-tool` supported list. The `scanSettings.versioning`
block cannot pin a Bun toolchain version. Detection is lockfile-driven only — Mend reads
`bun.lock` (text JSONC format, Bun 1.1+) statically without executing any install step.
Emitting `.whitesource` would have no effect on the scanned result and would introduce
noise into the comparator baseline. This limitation is tracked in
`docs/BUN_COVERAGE_PLAN.md §4` ("Bun not in install-tool list") and is the subject of
probe #24 (`bun-not-in-install-tool-probe`).

## Operator to dep to resolved-version table

Full resolution decision matrix (see `expected-tree.json::version_constraint_observations`
for failure mode documentation per operator):

| Operator | Catalog ID | Dep | Declared | Resolved | Resolution rule |
|----------|-----------|-----|----------|----------|-----------------|
| Caret `^` | C1 | `lodash` | `^4.17.0` | `4.18.1` | Allows minor+patch bumps above floor; picks highest 4.x.y |
| Tilde `~` | C2 | `is-odd` | `~3.0.0` | `3.0.1` | Allows patch bumps only; highest 3.0.x |
| Exact | C3 | `left-pad` | `1.3.0` | `1.3.0` | No operator = exact pin; must match verbatim |
| Wildcard `*` | C4 | `is-even` | `*` | `1.0.0` | Resolves to latest dist-tag; non-deterministic pre-lock |
| Compound AND | C5 | `tslib` | `>=2.0.0 <3.0.0` | `2.8.1` | Both bounds satisfied simultaneously; highest in intersection |
| Compound OR | C6 | `ms` | `^2.0.0 \|\| ^3.0.0` | `2.1.3` | Either sub-range satisfies; no stable ms@3.x at generation time |
| Pre-release `^` | C7 | `zod` | `^4.0.0-beta.1` | `4.4.3` | Pre-release lower bound; stable 4.x satisfies the range |

### Transitive dependency graph

```
lodash@4.18.1       (no deps)
is-odd@3.0.1
  └── is-number@6.0.0   (no deps)
left-pad@1.3.0      (no deps)
is-even@1.0.0
  └── is-odd@0.1.2      (different instance — version-separated from direct is-odd@3.0.1)
        └── is-number@3.0.0  (no deps — different instance from is-number@6.0.0)
tslib@2.8.1         (no deps)
ms@2.1.3            (no deps)
zod@4.4.3           (no deps)
```

Total: 7 direct + 3 transitive = 10 packages.

Notable: two `is-odd` instances (3.0.1 direct via C2 tilde, and 0.1.2 transitive via
`is-even`) and two `is-number` instances (6.0.0 via is-odd@3.0.1, and 3.0.0 via
is-odd@0.1.2). Mend must report both version-separated instances; deduplication to a
single version is a false negative.

## Failure modes by operator

| Operator | Expected Mend symptom if broken |
|----------|--------------------------------|
| C1 caret | `lodash` reported at `4.17.0` (floor version) instead of `4.18.1` |
| C2 tilde | `is-odd` reported at `3.0.0` (floor) instead of `3.0.1`; or treated as caret |
| C3 exact | `left-pad` at any version other than `1.3.0` |
| C4 wildcard | `is-even` missing entirely, or at a stale version from a re-resolved dist-tag |
| C5 compound AND | `tslib` missing (parser dropped the dep on seeing space-separated bounds) |
| C6 compound OR | `ms` missing (parser rejected the `\|\|` token) or at wrong version |
| C7 pre-release | `zod` missing (parser rejects pre-release string) or at `4.0.0-beta.1` (pinned to lower bound) |

## Mend resolver notes

The UA javascript resolver (npm fallback path) is the closest analog for Bun. Key
behaviors that affect this probe:

- The resolver reads `bun.lock` in JSONC format (JSON with comments and trailing commas).
  If the JSONC parser is strict, comments in `bun.lock` will cause a parse error and
  the entire tree will be empty. This probe's lockfile includes inline JSONC comments
  for each operator — this is intentional to surface that failure mode.
- Compound AND and OR ranges (`>=a <b`, `^a || ^b`) are the most likely to be
  mis-handled because many semver parsers only tokenise simple constraints.
- Pre-release lower bounds (`^4.0.0-beta.1`) are explicitly documented as a frequent
  failure class in the Bun resolver gap analysis.

## Probe metadata

- Pattern: `basic-registry` (constraint-syntax stress test)
- Target: `local`
- Bun version under test: `1.1.30` (text `bun.lock` format)
- Lockfile format: `bun.lock` (JSONC, Bun 1.1+)
- Install-tool key: NOT in install-tool list — no `.whitesource` emitted
- `pm_version_tested` in expected-tree.json: `1.1.30`

Tracked in: `docs/BUN_COVERAGE_PLAN.md §11.4` entry #16

# Scholarly Integrity

AD FONTES treats research provenance as a data-contract problem only where the
repository exposes a reliable data contract. This document records the
current boundary so infrastructure checks do not manufacture certainty about
historical claims.

## What Infrastructure v1 observed

The v1 audit inspects JSON data rather than guessing at JavaScript object
literals or free-form prose. Current data contains fields such as `source`,
`cite`, `references`, `provenance`, and `evidence`. These fields are useful
research metadata, but their shapes and meanings are not one uniform
bibliography relation.

The production JSON audit did not find `sourceId` or `source_id` references.
The repository does contain `schemas/source.schema.json`, which defines a
structured source record, but the current production data does not establish a
single `sourceId → bibliography entry` catalog that can be resolved without
inventing a new schema.

## Enforced when structurally possible

`scripts/scholarly_integrity.py` reports the observed fields and enforces only
these contracts:

- JSON documents in the auditable scope must parse.
- A structured bibliography, references, or sources catalog with stable IDs
  must not contain empty or duplicate catalog IDs.
- If production data later contains `sourceId`/`source_id` together with such a
  catalog, every referenced ID must resolve to a catalog entry.
- The repository-integrity checker separately protects non-empty,
  collection-scoped IDs and literal file references.

Run the audit with:

```bash
python scripts/scholarly_integrity.py
```

The report is machine-readable with `--report path/to/report.json` and uses
`NOT YET ENFORCEABLE` when the required relation is not present.

## Not a machine check in v1

Free-text `source`, `cite`, and `evidence` values are inventoried but are not
treated as proof of a bibliography entry. The checker does not assess whether
a historical assertion is true, infer authorial intent, fill missing
bibliography, or accept an AI-generated historical assertion as evidence.
Those questions require traceable primary or scholarly sources and human
review.

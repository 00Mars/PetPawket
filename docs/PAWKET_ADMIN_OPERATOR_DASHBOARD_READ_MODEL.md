# Pawket Admin Operator Dashboard Read Model

Last updated: 2026-05-29

Status: read-only dashboard model for a future desktop UI. No UI is implemented.

## Purpose

The operator dashboard read model gives a future desktop shell one structured object to render the current pipeline state.

It is not a public page, not an official report, and not production ledger truth.

## Dashboard Sections

The dashboard model organizes these sections:

- `quarantine`
- `staged_source_events`
- `draft_finance_records`
- `review_queue`
- `proposed_ledger_records`
- `proposed_journal_entries`
- `evidence`
- `commit_gate`
- `test_only_ledger`
- `reporting`
- `report_package_gate`
- `report_review_queue`
- `production_disabled_gates`
- `blockers`
- `warnings`

## Read Model Contents

The dashboard should expose IDs, counts, statuses, warnings, blockers, missing evidence, review state, and disabled production gates.

It should not expose raw document bodies or decrypted blobs.

## Rebuildability

The dashboard read model is disposable. It should be recreated from local vault records and policy constants whenever the operator opens or refreshes the future desktop shell.

## Current Code Boundary

`buildOperatorDashboardReadModel()` creates an in-memory dashboard object. The current phase does not write dashboard cache files.

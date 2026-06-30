# Pawket Admin Pipeline Status View Model

Last updated: 2026-05-29

Status: production-disabled read model. This is not production finance truth.

## Purpose

The pipeline status view model summarizes the entire Pawket Admin finance pipeline from source intake through report review metadata.

The model is a projection. It can be rebuilt from the underlying append-only records and should never be treated as the source of truth.

## Sections

The view model should include status summaries for:

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

## Summaries

Each section should expose:

- Record count.
- Stable record IDs.
- Visible status counts.
- Latest visible timestamp where available.
- Blocking status signals.
- Warning status signals.

## Non-Production Rule

Pipeline status is allowed for operator awareness only. It cannot enable final ledger commits, official balances, official reports, or final exports.

## Current Code Boundary

`buildPipelineStatusViewModel()` creates this projection in memory and `validateDesktopShellViewModel()` rejects any model that claims production, write, official balance, official report, final export, production source mode, or raw document-content behavior.

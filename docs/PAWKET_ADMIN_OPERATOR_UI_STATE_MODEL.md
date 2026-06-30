# Pawket Admin Operator UI State Model

Status: read-only, local-only, non-production model.

The operator UI state model is an in-memory shape for a future desktop UI. It is derived from the desktop operator shell view model and must never be treated as finance truth.

## Core Fields

- `ui_state_type`
- `policy_version`
- `generated_at`
- `source_view_model_type`
- `production_enabled`
- `read_only`
- `local_only`
- `official_balance_status`
- `official_report_status`
- `final_export_status`
- `source_mode`
- `raw_document_content_included`
- `mutation_actions_enabled`
- `export_actions_enabled`
- `panels`
- `navigation`
- `status_badges`
- `attention_queue`
- `ui_state_hash`

## Panel Rules

Panel summaries may include counts, status labels, read-only/local-only flags, and attention levels. They must not include raw source payloads, raw document bodies, decrypted document content, private story text, assistance narratives, customer details, donor details, medical-adjacent details, or export package data.

## Safe Panels

- Overview
- Pipeline
- Evidence
- Ledger Proposals
- Test-Only Ledger
- Reporting
- Report Packages
- Report Review
- Blockers
- Warnings
- Disabled Production Gates
- Audit Notes

## Validation Rules

Validation must reject:

- `production_enabled: true`
- `read_only: false`
- `local_only: false`
- enabled official balances, official reports, or final exports
- raw document content
- mutation actions
- export actions
- missing safe panel summaries

The UI state is a projection only. It can be discarded and rebuilt from the underlying append-only metadata.

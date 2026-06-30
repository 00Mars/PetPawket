# Pawket Admin Desktop Contract Guardrail Baseline

Status: expected non-production baseline for desktop contract inspection.

## Required Disabled States

Every inspected snapshot must match these values:

- `production_enabled: false`
- `read_only: true`
- `local_only: true`
- `stdout_only: true`
- `in_memory_only: true`
- `packaged_app: false`
- `official_balance_status: disabled`
- `official_report_status: disabled`
- `final_export_status: disabled`
- `raw_document_content_included: false`
- `mutation_actions_enabled: false`
- `export_actions_enabled: false`
- `connector_networking_enabled: false`
- `document_upload_enabled: false`
- `public_route_enabled: false`
- `runtime_snapshot_persistence_enabled: false`

## Count Baselines

The baseline requires at least:

- 13 safe desktop panels.
- 18 disabled actions.
- 10 packaging blockers.

These are minimums, not production readiness signals.

## Required Disabled Production Gates

The inspected contract must still surface disabled gates for:

- live ledger commit
- production live ledger write
- official balances
- official reports
- final exports
- mutation actions
- export actions
- document upload
- connector networking
- desktop packaging

## Banner And Sample Binding

The smoke summary must preserve its non-production banner, and the inspection report must include:

```text
PAWKET ADMIN DESKTOP CONTRACT INSPECTION — NON-PRODUCTION
```

When the default sample vault is used, the sample preview binding must remain `available_demo_only`.

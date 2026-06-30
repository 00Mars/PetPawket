# Pawket Admin Desktop Navigation Model

Status: metadata-only navigation model for a future local desktop shell. The current implementation adds a read-only local panel navigation/focus contract scaffold that remains in memory and prints only a non-production stdout summary.

The navigation model describes which safe read-only panels a future desktop shell may display. It does not create routes, browser pages, public assets, or desktop windows.

The panel navigation contract is built from validated panel render contracts. It adds selection state, focus metadata, keyboard action metadata, attention routing, and disabled-action surfaces without creating UI controls or persisted runtime state.

## Navigation Item Shape

- `panel_id`
- `label`
- `enabled`
- `read_only`
- `local_only`
- `badge_count`
- `attention_level`

## Safe Panels

- `overview`
- `pipeline`
- `evidence`
- `ledger_proposals`
- `test_only_ledger`
- `reporting`
- `report_packages`
- `report_review`
- `blockers`
- `warnings`
- `disabled_production_gates`
- `audit_notes`
- `sample_vault_preview`

## Disabled Actions

Navigation metadata must keep these actions disabled:

- live ledger commit
- production live ledger write
- official balances
- official reports
- final exports
- PDF/CSV/XLSX/ZIP export
- public impact claims
- raw document content display
- document upload
- connector networking
- production source mode
- mutation actions
- export actions
- persisted navigation state
- persisted focus state

Navigation validation rejects unknown panels, mutable items, non-local items, and any enabled production/export behavior.

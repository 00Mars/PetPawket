# Pawket Admin Desktop Panel State Bindings

Status: read-only panel binding model.

Panel bindings connect scaffold panels to safe UI adapter state keys.

Each binding must include:

- `panel_id`
- `label`
- `source_view_model`
- `ui_state_key`
- `enabled: true`
- `read_only: true`
- `mutation_actions_enabled: false`
- `export_actions_enabled: false`
- `raw_document_content_allowed: false`
- `production_authority: false`

## Allowed Bindings

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
- Sample Vault Preview

Bindings may expose counts, status labels, blockers, warnings, and safe metadata identifiers only. They must not expose raw document content, edit actions, ledger commit actions, connector actions, upload actions, or export actions.

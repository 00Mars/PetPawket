# Pawket Admin Desktop Shell Panels

Status: read-only panel registry.

The scaffold allows these future desktop panels only:

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

Every panel must declare:

- `panel_id`
- `label`
- `source_view_model`
- `read_only: true`
- `mutation_actions_enabled: false`
- `export_actions_enabled: false`
- `raw_document_content_allowed: false`

Panels may show counts, status labels, warnings, blockers, disabled gate labels, and metadata identifiers. They must not include raw document contents, edit buttons, approval buttons, export buttons, connector actions, upload actions, or production-posting actions.

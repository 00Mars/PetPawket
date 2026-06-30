# Pawket Admin Operator Preview Runner

Status: local-only, stdout-only, read-only runner.

The operator preview runner proves the current safe display chain:

```text
vault path
-> operator shell read model
-> desktop UI adapter
-> CLI preview
-> stdout
```

It is not a packaged desktop app, browser route, finance editor, production ledger interface, report generator, or export generator.

## Purpose

- Read a local Pawket Admin vault path.
- Load existing local NDJSON metadata records.
- Build the desktop operator shell view model.
- Pass that view model through the desktop UI adapter.
- Print the plain-text local preview to stdout.

## Current Code

- `utils/pawketAdminOperatorPreviewRunner.js`
- `scripts/pawketAdminOperatorPreview.js`
- package script: `npm run pawket-admin:preview -- --vault <vault-path>`
- sample smoke script: `npm run pawket-admin:preview:sample`

## Required Output Labels

Every preview/result object must include:

```json
{
  "production_enabled": false,
  "read_only": true,
  "local_only": true,
  "stdout_only": true,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_view",
  "raw_document_content_included": false,
  "mutation_actions_enabled": false,
  "export_actions_enabled": false
}
```

## Boundary

The runner writes no files. It prints preview text to stdout only. Errors and usage messages may be printed to stderr/stdout as appropriate, but the runner must not create finance records, cache files, reports, exports, routes, official balances, or production ledger truth.

The sample smoke script points the same runner at `data/finance/security/sample-vault/`, which is fake demo-only data for local validation. It is not a production vault or public demo.

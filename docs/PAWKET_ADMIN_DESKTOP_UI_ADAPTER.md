# Pawket Admin Desktop UI Adapter

Status: production-disabled local adapter design. This is not an Electron, Tauri, browser, or public website UI.

The desktop UI adapter is the first UI-facing layer above `utils/pawketAdminDesktopOperatorShell.js`. It consumes in-memory local operator shell view models and reshapes them into safe UI-ready state for a future Pawket Admin desktop shell.

It does not read or write production ledger truth. It does not create files, exports, routes, packaged installers, official reports, official balances, document uploads, connector network calls, or public impact claims.

## Purpose

- Convert local operator shell view models into UI-ready metadata.
- Preserve the read-only, local-only, non-production boundary.
- Provide safe panel summaries, navigation metadata, status badges, attention items, and a plain-text CLI preview.
- Keep a future desktop UI from reaching directly into the finance pipeline records.

## Required Output Fields

Every adapter output must include:

```json
{
  "production_enabled": false,
  "read_only": true,
  "local_only": true,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_view",
  "raw_document_content_included": false,
  "mutation_actions_enabled": false,
  "export_actions_enabled": false
}
```

## Allowed Behavior

- Consume in-memory view models from the desktop operator shell.
- Build UI state, navigation, panel summaries, badges, and attention queue records.
- Render a plain-text CLI preview labeled non-production.
- Validate that the adapter output remains read-only, local-only, and non-production.

## Blocked Behavior

- Production ledger commits.
- Live ledger writes.
- Official balances or official reports.
- Final export packages or files.
- PDF, CSV, XLSX, or ZIP output.
- Raw document content.
- Public website routes or assets.
- Document upload, production encryption, connector networking, tax filing, or insurance workflows.

## Current Implementation

`utils/pawketAdminDesktopUiAdapter.js` is a pure adapter. It does not mutate pipeline records and has no write function. Its verifier functions check for forbidden adapter artifacts, public paths, and export artifacts.

# Pawket Admin Desktop Operator Shell

Last updated: 2026-05-29

Status: first production-disabled operator shell read model. No desktop UI, Electron/Tauri shell, public browser UI, production ledger interface, or export generator is implemented. The later desktop shell scaffold documents how a future packaged shell may consume this read model while remaining local-only, read-only, and non-production.

## Purpose

The desktop operator shell is the first local read-only layer for a future Pawket Admin desktop application.

It answers what currently exists in the Pawket Admin pipeline without changing any pipeline records:

- Quarantined connector bundles.
- Staged source events.
- Draft finance records.
- Review queue items.
- Proposed ledger records.
- Proposed journal entries.
- Evidence manifests.
- Commit-gate evidence integration records.
- Test-only immutable ledger entries.
- Report manifests.
- Export intents.
- Preview packages.
- Report review queue records.
- Redaction outcomes and reviewer notes.
- Visible blockers, warnings, missing evidence, unresolved risks, and disabled production gates.

## Boundary

This layer is a view-model layer only.

It may:

- Read existing local NDJSON records.
- Summarize counts.
- Summarize statuses.
- Summarize blockers and warnings.
- Build in-memory dashboard models.
- Build in-memory pipeline status models.

It must not:

- Mutate existing pipeline records.
- Create production ledger truth.
- Create official balances.
- Create official reports.
- Create final exports.
- Create PDF, CSV, XLSX, or ZIP files.
- Store raw document content.
- Store files under `public/`.
- Start connector networking.
- Implement document upload.

## Required View Model Labels

Every desktop operator shell view model must include:

```json
{
  "production_enabled": false,
  "read_only": true,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_view",
  "raw_document_content_included": false
}
```

## Current Code Boundary

`utils/pawketAdminDesktopOperatorShell.js` creates read-only local view models in memory. It does not write audit events because it does not mutate Pawket Admin records.

`utils/pawketAdminDesktopShellScaffold.js` is the separate architecture scaffold for a future local desktop shell. It may reference this operator shell read model, but it does not package an app, create routes, enable mutation actions, enable export actions, or write Pawket Admin records.

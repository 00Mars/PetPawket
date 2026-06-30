# Pawket Admin Reporting Guardrails

Last updated: 2026-05-29

Status: production-disabled reporting guardrails. Report packages and final exports remain blocked.

## Required Labels

All outputs from this layer must be labeled:

- `non_production_preview`
- `not_official_accounting`
- `not_for_tax_filing`
- `not_for_investor_reliance`

## Blocked Outputs

This layer must not create:

- IRS final exports.
- Accountant final exports.
- Investor final reports.
- Foundation final reports.
- Public impact reports.
- Official balances.
- Production report packages.
- Public impact claims.
- PDF/CSV/XLSX/ZIP exports.

## Privacy And Redaction

Report manifests must reference a required redaction profile.

Public impact previews must not include private donor, customer, assistance, story, medical-adjacent, minor/family, partner-confidential, or legal-confidential data unless future review creates a public-safe approved artifact.

Missing evidence and privacy warnings must be surfaced. They must not be hidden by a report manifest.

## Allowed Current Behavior

Allowed:

- Read proposed/test-only records.
- Build projections.
- Calculate simulated balances.
- Build reconciliation previews.
- Create report manifest metadata.
- Create export-intent metadata from a report manifest.
- Create preview-only package metadata after approval checks.
- Append audit events for manifest writes.
- Append audit events for export-intent and preview-package writes.
- Build read-only desktop operator shell view models over report manifests, export intents, preview packages, and report review queue metadata.

Not allowed:

- Create official balances.
- Create final exports.
- Create tax/accountant/investor/foundation/public report packages.
- Create PDF, CSV, XLSX, ZIP, or official export package files.
- Treat proposed or test-only records as production truth.
- Let desktop operator shell views create official reports, official balances, final exports, public impact claims, or raw document output.

## Current Code Boundary

`verifyNoOfficialReportsOrBalances()` checks that this phase has not created official balance files, final report packages, or final export files.

`verifyNoFinalExportFiles()` in the report package gate checks that export-intent and preview-package operations did not create final export artifacts.

`verifyNoDesktopShellExports()` in the desktop operator shell checks that read-only operator views have not produced PDF, CSV, XLSX, ZIP, official report, official balance, final export, public impact export, or production-ledger artifacts.

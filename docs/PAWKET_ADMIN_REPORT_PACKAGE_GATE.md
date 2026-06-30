# Pawket Admin Report Package Gate

Last updated: 2026-05-29

Status: production-disabled report package and export-intent model. No final report package generation is implemented.

## Purpose

The report package gate records a request to shape a future report package without creating that package. It exists so Pawket Admin can preserve export intent, approval checks, redaction requirements, evidence state, and final-export blockers before any official export system is reviewed.

Report manifests are metadata only. Report package requests are export intent, not final exports. Approval in this phase may create preview package metadata only; it must not create PDF, CSV, XLSX, ZIP, IRS, accountant, investor, foundation, public impact, or official report files.

## Concepts

Report package request:

- A request to package one report manifest for a recipient purpose.
- Must reference a report manifest.
- Must state source mode, period, recipient type, requester, and redaction profile.
- Must remain non-production.

Export intent:

- The auditable declaration that someone wants a package shaped.
- Not an export and not a generated file.
- Must preserve report type, source IDs, evidence manifest IDs, privacy warnings, redaction warnings, missing evidence warnings, and export-risk flags.

Redaction profile enforcement:

- Each report type has a required redaction profile.
- Public impact previews require the `public_impact_report` profile.
- Investor summaries require the `investor_summary` profile.
- Accountant previews require the `accountant_pack` profile.
- IRS support previews require the `irs_support_pack` profile.

Preview-only package record:

- Metadata showing a request passed the preview package gate.
- Does not contain raw document content.
- Does not create a final export path.
- Does not create official reports or balances.

## Statuses

Report package statuses:

- `requested`
- `manifest_validated`
- `redaction_profile_validated`
- `evidence_checked`
- `privacy_checked`
- `approval_required`
- `approved_for_preview_package`
- `blocked_pending_review`
- `final_export_disabled`
- `rejected`
- `superseded`

`approved_for_preview_package` does not mean final export. It means a preview-only package metadata record may be created.

`final_export_disabled` is the expected production-safe state until legal, accounting, tax, privacy, and security review approves a real export system.

## Audit Requirements

Every export-intent and preview-package write must append an audit event.

Audit metadata should include:

- Report manifest ID.
- Export intent ID.
- Preview package ID, when present.
- Report type.
- Source mode.
- Period.
- Requested recipient type.
- Actor.
- Role.
- Production status.
- Final export status.
- Confirmation that no final export was created.

## Blocked Final Export Behavior

Current code must not create:

- PDF files.
- CSV files.
- XLSX files.
- ZIP archives.
- IRS exports.
- Accountant exports.
- Investor exports.
- Foundation exports.
- Public impact exports.
- Official report packages.
- Official balances.

The package gate can only write:

- `manifests/export-intent-records.ndjson`
- `manifests/report-preview-packages.ndjson`

## Current Code Boundary

`utils/pawketAdminReportPackageGate.js` creates and validates export-intent metadata, validates preview package approvals, creates preview-only package records, writes metadata records, appends audit events, rejects public paths, and verifies no final export artifacts exist.

It does not generate report files, exports, official balances, production reports, live ledger commits, raw document blobs, tax reports, insurance workflows, or UI.

## Report Review Queue Boundary

Export-intent and preview-package records may enter the report review queue for review, decision, supersession, redaction outcome, and reviewer-note metadata.

Review approval still does not create final exports. The final-export-disabled boundary remains active after review.

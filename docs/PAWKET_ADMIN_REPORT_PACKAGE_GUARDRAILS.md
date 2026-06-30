# Pawket Admin Report Package Guardrails

Last updated: 2026-05-29

Status: blocked final-export guardrails for preview package metadata.

## Hard Blocks

Current Pawket Admin report package code must not create:

- Final package files.
- Official reports.
- IRS reports.
- Accountant reports.
- Investor reports.
- Foundation reports.
- Public impact reports.
- Official balances.
- PDF files.
- CSV files.
- XLSX files.
- ZIP archives.
- Raw document blobs.
- Public website finance/admin files.

## Public Impact Guardrails

Public impact previews must not include:

- Private donor data.
- Private customer data.
- CHARM/CHERISH assistance data.
- Story-sensitive data.
- Medical-adjacent data.
- Minor or family-sensitive data.
- Raw document content.

Public impact previews must use public-safe or redacted evidence and aggregate language by default.

## Required Labels

All preview records must preserve non-production labels:

- `non_production_preview`
- `not_official_report`
- `not_final_export`
- `not_for_tax_filing`

## Blocked Export Evidence

Blocked exports must still preserve:

- Export intent record.
- Actor.
- Role.
- Requested report type.
- Redaction profile.
- Blockers.
- Warnings.
- Audit event.

## Current Code Boundary

`verifyNoFinalExportFiles()` checks that report package gate operations did not create final export artifacts. Allowed files are metadata only:

- `manifests/export-intent-records.ndjson`
- `manifests/report-preview-packages.ndjson`

The report review queue extends this guardrail to review item, decision, supersession, redaction outcome, and reviewer note metadata. It also verifies no final export artifacts exist.

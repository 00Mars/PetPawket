# Pawket Admin Report Manifests

Last updated: 2026-05-29

Status: non-production report manifest model. Final reports and exports are not implemented.

## Purpose

Report manifests describe what a future report preview would include without generating an export package or official report.

They preserve the report type, source mode, scope, included records, excluded records, evidence manifests, redaction profile, privacy warnings, missing evidence warnings, production status, actor, timestamp, and manifest hash.

## Manifest Types

- `internal_management_preview`
- `accountant_pack_preview`
- `irs_support_preview`
- `investor_summary_preview`
- `foundation_pack_preview`
- `public_impact_preview`
- `security_audit_preview`

## Fields

Report manifests should include:

- `report_manifest_id`
- `report_type`
- `source_mode`
- `period`
- `entity_scope`
- `fund_scope`
- `class_scope`
- `included_record_ids`
- `excluded_record_ids`
- `evidence_manifest_ids`
- `required_redaction_profile`
- `privacy_warnings`
- `missing_evidence_warnings`
- `production_status`
- `generated_by`
- `generated_at`
- `manifest_hash`

## Production Statuses

- `proposed_only`
- `test_only`
- `non_production_preview`
- `blocked_pending_review`
- `production_disabled`

## Current Code Boundary

`createReportManifest()` creates metadata only. `writeReportManifest()` writes to:

- `manifests/report-manifests.ndjson`

It does not create PDFs, CSVs, XLSX files, ZIPs, final exports, official reports, or official balances.

## Package Gate Relationship

A report manifest may feed an export-intent record, but the manifest itself is still metadata only.

The package gate must re-check report type, source mode, recipient purpose, redaction profile, privacy warnings, missing evidence warnings, final-export status, and approval role before creating preview-package metadata.

Report manifests do not authorize final exports. `approved_for_preview_package` in the package gate still means final export remains disabled.

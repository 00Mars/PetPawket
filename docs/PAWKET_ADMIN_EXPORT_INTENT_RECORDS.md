# Pawket Admin Export Intent Records

Last updated: 2026-05-29

Status: metadata-only export-intent record model. Final exports remain disabled.

## Purpose

An export intent record preserves the fact that a Pawket Admin actor requested a report package preview. It is an audit and review artifact, not a final export.

## Record Shape

Export intent records should include:

- `export_intent_id`
- `report_manifest_id`
- `requested_report_type`
- `source_mode`
- `period`
- `entity_scope`
- `fund_scope`
- `class_scope`
- `requested_by`
- `requested_at`
- `intended_recipient_type`
- `required_redaction_profile`
- `included_record_ids`
- `evidence_manifest_ids`
- `privacy_warnings`
- `redaction_warnings`
- `missing_evidence_warnings`
- `export_risk_flags`
- `approval_status`
- `production_status`
- `final_export_status`
- `audit_event_id`

The current helper also records `required_nonproduction_labels`, `final_export_created: false`, and an `intent_hash`.

## Production Statuses

- `preview_only`
- `non_production`
- `blocked_pending_review`
- `production_disabled`

## Final Export Statuses

- `not_generated`
- `disabled`
- `blocked`
- `future_review_required`

## Rules

- Report type must be a preview type.
- Source mode must be `proposed` or `test_only`.
- Production source mode is rejected.
- Required redaction profile must match the report type.
- Final export paths are rejected.
- Public impact intent must not include private donor, customer, assistance, story, medical-adjacent, minor, family, or raw document context.
- Investor intent must use aggregate/sanitized profile boundaries.
- Accountant/IRS intent must remain controlled and non-production.

## Current Code Boundary

`createExportIntentRecord()` creates metadata only. `writeExportIntentRecord()` writes to `manifests/export-intent-records.ndjson` and appends an audit event.

No final package file is generated.

## Review Queue Relationship

An export intent can be linked to a `report_review_item`. Review decisions may approve preview metadata, reject the intent, request changes, or supersede it.

The export intent remains append-only evidence of request intent. It is not edited when a review decision is recorded.

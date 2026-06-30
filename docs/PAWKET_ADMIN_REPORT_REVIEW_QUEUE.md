# Pawket Admin Report Review Queue

Last updated: 2026-05-29

Status: production-disabled report review queue. No final export generation is implemented.

## Purpose

The report review queue lets Pawket Admin review export intents and preview package records before any future report package can exist.

This queue is a review workflow only. It does not create PDF, CSV, XLSX, ZIP, official report, official balance, IRS, accountant, investor, foundation, public impact, or production export files.

## Review Item Shape

Review items should include:

- `report_review_item_id`
- `export_intent_id`
- `preview_package_id`
- `report_manifest_id`
- `report_type`
- `source_mode`
- `period`
- `intended_recipient_type`
- `required_redaction_profile`
- `assigned_role`
- `review_status`
- `production_status`
- `final_export_status`
- `included_record_ids`
- `evidence_manifest_ids`
- `privacy_warnings`
- `redaction_warnings`
- `missing_evidence_warnings`
- `export_risk_flags`
- `created_by`
- `created_at`
- `updated_at`
- `review_item_hash`

## Review Statuses

- `queued`
- `in_review`
- `needs_redaction_review`
- `needs_changes`
- `approved_for_preview_package`
- `rejected`
- `superseded`
- `blocked_pending_review`
- `final_export_disabled`

## Role Policy

- Internal management previews: Owner Root or Finance Admin.
- Accountant pack previews: Owner Root, Finance Admin, or Accountant Export User.
- IRS support previews: Owner Root.
- Investor summary previews: Owner Root or Finance Admin.
- Foundation pack previews: Owner Root or Foundation Admin.
- Public impact previews: Owner Root.
- Security audit previews: Owner Root.

## Allowed Write Target

Review items write only to:

- `manifests/report-review-queue.ndjson`

## Current Code Boundary

`createReportReviewItem()` and `validateReportReviewItem()` create and validate review queue metadata only. `writeReportReviewRecord()` appends review items and audit events. Final exports remain disabled.

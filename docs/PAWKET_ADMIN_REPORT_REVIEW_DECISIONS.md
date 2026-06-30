# Pawket Admin Report Review Decisions

Last updated: 2026-05-29

Status: append-only report review decisions. Decisions do not generate final exports.

## Purpose

Report review decisions record whether a preview-package/export intent may proceed as preview metadata, needs changes, is rejected, or is superseded.

## Decision Shape

Decision records should include:

- `report_review_decision_id`
- `report_review_item_id`
- `export_intent_id`
- `preview_package_id`
- `report_manifest_id`
- `report_type`
- `source_mode`
- `period`
- `decision`
- `previous_review_status`
- `resulting_review_status`
- `decided_by`
- `decider_role`
- `decided_at`
- `reason`
- `blockers`
- `warnings`
- `rejection_history`
- `production_status`
- `final_export_status`
- `decision_hash`

## Allowed Decisions

- `approved_for_preview_package`
- `rejected`
- `needs_changes`
- `superseded`

`approved_for_preview_package` means preview metadata can continue. It does not authorize final exports.

## Rejection History

Rejections are append-only. A rejected preview request must preserve:

- Review item ID.
- Export intent ID.
- Preview package ID.
- Reason.
- Rejecting actor.
- Timestamp.
- Blockers and warnings.

## Allowed Write Target

Decision records write only to:

- `manifests/report-review-decisions.ndjson`

## Current Code Boundary

`recordReportReviewDecision()` and `validateReportReviewDecision()` create and validate decision metadata only. `writeReportReviewRecord()` appends the record and an audit event.

# Pawket Admin Report Preview Supersession

Last updated: 2026-05-29

Status: append-only supersession metadata. Supersession does not edit old preview records.

## Purpose

Supersession records preserve the lineage when one report review item, export intent, or preview package replaces another.

Supersession is required because preview package metadata must not be silently edited or deleted.

## Supersession Shape

Supersession records should include:

- `supersession_id`
- `original_review_item_id`
- `superseding_review_item_id`
- `original_export_intent_id`
- `superseding_export_intent_id`
- `original_preview_package_id`
- `superseding_preview_package_id`
- `report_type`
- `source_mode`
- `period`
- `superseded_by`
- `superseder_role`
- `superseded_at`
- `reason`
- `old_preview_lineage`
- `new_preview_lineage`
- `production_status`
- `final_export_status`
- `supersession_hash`

## Rules

- Preserve old preview lineage.
- Preserve new preview lineage.
- Do not edit the old preview package.
- Do not delete the old export intent.
- Do not generate final exports.
- Append an audit event.

## Allowed Write Target

Supersession records write only to:

- `manifests/report-preview-supersessions.ndjson`

## Current Code Boundary

`supersedeReportReviewItem()` creates supersession metadata only. `writeReportReviewRecord()` appends the record and an audit event.

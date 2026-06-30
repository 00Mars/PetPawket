# Pawket Admin Report Review Audit Notes

Last updated: 2026-05-29

Status: audit-linked reviewer notes. Notes do not generate final exports.

## Purpose

Reviewer notes preserve decision context for report preview review without editing the underlying export intent, preview package, review item, decision, or supersession.

## Note Shape

Reviewer notes should include:

- `report_reviewer_note_id`
- `report_review_item_id`
- `export_intent_id`
- `preview_package_id`
- `note_text`
- `note_type`
- `created_by`
- `created_role`
- `created_at`
- `audit_event_id`
- `note_hash`

## Rules

- Notes are append-only.
- Notes must not contain raw document content.
- Notes must not contain final export paths.
- Notes must append an audit event.
- Notes must remain internal metadata only.

## Allowed Write Target

Reviewer notes write only to:

- `manifests/report-reviewer-notes.ndjson`

## Current Code Boundary

`appendReportReviewerNote()` writes reviewer notes and audit events. It does not create exports, official reports, official balances, or public impact claims.

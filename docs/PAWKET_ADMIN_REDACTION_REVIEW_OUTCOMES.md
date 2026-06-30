# Pawket Admin Redaction Review Outcomes

Last updated: 2026-05-29

Status: redaction review metadata. No redacted export files are generated.

## Purpose

Redaction review outcomes record whether a preview package's redaction posture is acceptable for its intended report type.

This is especially important for public impact previews, investor summaries, donor-related previews, CHARM/CHERISH assistance context, story records, and medical-adjacent evidence.

## Outcome Shape

Outcome records should include:

- `redaction_review_outcome_id`
- `target_type`
- `target_id`
- `report_review_item_id`
- `export_intent_id`
- `preview_package_id`
- `report_type`
- `source_mode`
- `required_redaction_profile`
- `outcome`
- `reviewed_by`
- `reviewer_role`
- `reviewed_at`
- `reason`
- `blockers`
- `warnings`
- `privacy_warnings`
- `redaction_warnings`
- `export_risk_flags`
- `production_status`
- `final_export_status`
- `outcome_hash`

## Allowed Outcomes

- `redaction_approved`
- `redaction_required`
- `public_safe`
- `blocked_privacy`
- `rejected`

## Public And Investor Blocks

Public impact review must use `public_impact_report` and must not approve private donor, customer, assistance, story, medical-adjacent, minor/family, or raw document context.

Investor review must use `investor_summary` and must remain aggregate or sanitized.

## Allowed Write Target

Redaction review outcomes write only to:

- `manifests/redaction-review-outcomes.ndjson`

## Current Code Boundary

`recordRedactionReviewOutcome()` creates redaction review metadata only. It blocks unsafe public and investor profiles before any preview package can be treated as review-approved.

# Pawket Admin Review Queue

Last updated: 2026-05-27

Status: draft review queue model. Review queue decisions do not write live ledger records in this pass.

## Purpose

The review queue groups draft finance records so a future human reviewer can decide what must happen before ledger approval.

The queue is the boundary between automated draft interpretation and human financial judgment.

## Core Fields

Each review queue item should include:

- `review_item_id`
- `draft_record_ids`
- `source_event_ids`
- `review_type`
- `review_status`
- `assigned_role`
- `required_documents`
- `missing_documents`
- `warnings`
- `risk_flags`
- `reviewer_notes`
- `decision`
- `decided_by`
- `decided_at`
- `audit_event_id`

## Review Statuses

Allowed review statuses:

- `unreviewed`
- `needs_mapping`
- `needs_documents`
- `ready_for_review`
- `approved_for_ledger_later`
- `rejected`
- `superseded`

`approved_for_ledger_later` is a holding state. It does not create a journal entry, transaction, official balance, report, or public impact claim.

The ledger approval boundary may use this status as one required input for proposed ledger record creation. The status alone is not enough; role, document, period, mapping, calculation-rule, risk, and audit checks are still required.

## Risk Flags

Supported risk flags:

- `missing_document`
- `unsupported_event_type`
- `tax_mapping_needed`
- `donation_mapping_needed`
- `care_credit_liability_review`
- `restricted_fund_review`
- `refund_reversal_needed`
- `duplicate_possible`
- `amount_mismatch`
- `privacy_review_needed`

Risk flags should remain visible until they are resolved, accepted, rejected, or superseded by a future reviewed decision.

## Review Types

Initial review types include:

- `commerce_finance_review`
- `payment_review`
- `refund_review`
- `subscription_review`
- `mission_finance_review`
- `care_credit_review`
- `rewards_review`
- `impact_story_review`
- `pawket_pal_value_review`

## Decisions

Allowed decisions in the current utility:

- `needs_mapping`
- `needs_documents`
- `ready_for_review`
- `approved_for_ledger_later`
- `rejected`
- `superseded`

Decision updates append a new review queue record and an audit event. They do not edit the prior queue record in place.

## Role Boundary

Default assignment is intentionally conservative:

- Commerce, payment, refund, and subscription items: `bookkeeper`
- Mission, restricted fund, donation, and story/privacy items: `foundation_admin`
- Care Credit and reward liability items: `finance_admin`

Production role policy still needs security, accounting, legal, privacy, and ops review.

## Current Skeleton Behavior

`utils/pawketAdminNormalization.js` writes review queue records to:

- `events/review-queue.ndjson`

Decision updates append records to the same file to preserve history.

The helper does not:

- Write the live ledger.
- Approve transactions.
- Update balances.
- Attach real source documents.
- Run tax reports.
- Launch Care Credit or CHARM workflows.
- Publish impact proof.

## Proposed Ledger Handoff

Approved review queue items may be handed to `utils/pawketAdminLedgerApproval.js` for proposed-record validation.

That layer may append:

- `events/proposed-ledger-records.ndjson`
- `proposed_ledger_records_written` audit events
- `proposed_ledger_records_decision_marked` audit events

It must not create final journal entries, official transactions, balances, customer-visible Care Credit values, CHARM assistance statuses, tax exports, or public reports.

# Pawket Admin Draft Finance Records

Last updated: 2026-05-27

Status: draft finance record model. Draft records are interpretations only and do not affect official balances.

## Purpose

Draft finance records are normalized interpretations of staged source events.

They help Pawket Admin prepare for future accounting review without granting connector events authority over the books.

## Core Fields

Each draft finance record should include:

- `draft_record_id`
- `staged_event_id`
- `source_bundle_id`
- `source_event_id`
- `connector_id`
- `idempotency_key`
- `draft_type`
- `entity_id`
- `fund_id`
- `class_id`
- `account_hint`
- `category_hint`
- `subcategory_hint`
- `gross_amount`
- `discount_amount`
- `tax_amount`
- `fee_amount`
- `net_amount`
- `currency`
- `customer_ref`
- `vendor_ref`
- `order_ref`
- `product_refs`
- `calculation_rule_hint`
- `document_requirements`
- `confidence_score`
- `review_status`
- `risk_flags`
- `warnings`
- `rejection_reason`
- `created_at`
- `updated_at`

## Meaning

Draft finance records are:

- Interpretations.
- Review inputs.
- Mapping candidates.
- Traceability anchors.

Draft finance records are not:

- Accounting truth.
- Journal entries.
- Posted transactions.
- Customer balances.
- Care Credit balances.
- CHARM assistance awards.
- Tax filings.
- Public impact proof.

## Editing And Correction

Draft records can be edited, rejected, or superseded before ledger approval.

Future production behavior should preserve history instead of silently replacing draft records. Corrections should create new draft versions and audit events.

## Review Boundary

A draft can become eligible for future ledger approval only after:

- Required source evidence exists.
- Document requirements are satisfied.
- Entity, fund, class, account, category, and subcategory are reviewed.
- Calculation rule hints are resolved.
- Risk flags are cleared or accepted.
- Period state allows changes.
- The responsible human role approves the draft for a later ledger step.

The current normalization implementation does not perform that ledger step.

## Proposed Ledger Boundary

The next implementation layer may transform reviewed draft records into proposed ledger records after approval-boundary checks.

That transformation must preserve:

- Draft record ids.
- Staged event ids.
- Source event ids.
- Source bundle ids.
- Connector ids and idempotency keys.
- Document requirements and document links.
- Risk flags and accepted deferrals.
- Calculation-rule references.

Proposed records are still not accounting truth. They can be rejected, superseded, revised, or approved for a future final commit before any live ledger write exists.

## Current Skeleton Behavior

`utils/pawketAdminNormalization.js` writes draft finance records to:

- `events/draft-finance-records.ndjson`

It does not write:

- `events/live-ledger.ndjson`
- `events/finance-transactions.ndjson`
- `events/journal-entries.ndjson`
- `ledger/`
- `journal/`
- balances
- tax reports
- public reports

`utils/pawketAdminLedgerApproval.js` can read draft records and create proposed ledger records in `events/proposed-ledger-records.ndjson`, but it also avoids final journal entries and live ledger files.

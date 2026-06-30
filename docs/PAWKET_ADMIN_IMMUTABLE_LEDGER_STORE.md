# Pawket Admin Immutable Ledger Store

Last updated: 2026-05-29

Status: future immutable ledger store design. Current code creates only test-only immutable ledger artifacts and does not create production ledger truth.

## Purpose

The future live ledger must be immutable and append-only. Once a journal entry is committed, Pawket Admin must not silently edit or delete it. Corrections, reversals, and adjustments must be new linked entries.

## Future Entry Fields

Future immutable journal entries and lines should preserve:

- `journal_entry_id`
- `journal_line_id`
- `source_proposed_journal_entry_id`
- `source_proposed_ledger_record_ids`
- `source_draft_record_ids`
- `source_review_item_ids`
- `source_event_ids`
- `source_bundle_ids`
- `evidence_manifest_id`
- `commit_gate_record_id`
- `entity_id`
- `fund_id`
- `class_id`
- `account_id`
- `account_type`
- `normal_balance`
- `debit_amount`
- `credit_amount`
- `currency`
- `transaction_date`
- `effective_period`
- `description`
- `document_links`
- `calculation_rule_ids`
- `committed_by`
- `committed_at`
- `audit_event_id`
- `previous_ledger_hash`
- `ledger_entry_hash`
- `correction_of`
- `adjustment_for`
- `reversal_of`
- `immutable_status`

## Immutable Statuses

- `committed`
- `corrected_by_later_entry`
- `reversed_by_later_entry`
- `adjusted_by_later_entry`
- `superseded_before_commit`
- `voided_before_commit`

## Rules

- No silent edit.
- No delete.
- Correction requires a new entry.
- Reversal requires a new entry.
- Adjustment requires a new entry.
- Previous hash chain is required.
- Linked source lineage is required.
- Evidence manifest integrity is required.
- Audit event ID is required.

## Current Test-Only Store

The current test-only immutable store is:

- `events/test-immutable-ledger-entries.ndjson`

The file supports hash-chain validation for the final commit model. It is not production ledger truth and must not be used for accountant, tax, investor, CHARM, CHERISH, Care Credit, reward, or public reporting outputs.

## Read Model Boundary

The test-only immutable store can feed non-production read models and simulated balances.

Read models must preserve source IDs, evidence manifest IDs, period, entity, fund, class, currency, and non-production labels. They must not create official balances or final reporting packages.

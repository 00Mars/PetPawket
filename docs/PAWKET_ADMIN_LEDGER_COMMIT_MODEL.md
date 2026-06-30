# Pawket Admin Ledger Commit Model

Last updated: 2026-05-29

Status: future live ledger model. Production live commit is not implemented in this pass.

## Purpose

This document defines the future shape of committed ledger truth so the current proposed-journal and commit-gate scaffolding can aim at a controlled target.

The current code may validate commit eligibility, create metadata-only evidence manifests, create disabled production commit records, and create test-only commit artifacts. It does not create production journal entries, live ledger records, balances, tax reports, Care Credit balances, CHARM assistance records, encrypted document blobs, or public impact proof.

## Future Journal Entry Fields

Future committed journal entries should include:

- `journal_entry_id`
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
- `currency`
- `transaction_date`
- `effective_period`
- `description`
- `document_links`
- `commit_evidence_manifest_id`
- `commit_gate_evidence_integration_id`
- `calculation_rule_id`
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

## Future Journal Line Fields

Future committed journal lines should include:

- `journal_line_id`
- `journal_entry_id`
- `account_id`
- `debit_amount`
- `credit_amount`
- `currency`
- `description`
- `source_proposed_ledger_record_id`
- `document_links`
- `calculation_rule_id`

## Commit Rules

Future committed entries must:

- Be append-only.
- Preserve source traceability.
- Preserve document links.
- Preserve the commit evidence manifest hash.
- Preserve commit-gate evidence integration status and blockers.
- Preserve calculation rule references.
- Respect period-close rules.
- Create audit events.
- Preserve previous ledger hash and ledger entry hash.
- Never overwrite proposed records, source events, or prior committed entries.

## Current Disabled Gate

`utils/pawketAdminLiveLedgerGate.js` defines the disabled production commit policy and a test-only immutable ledger entry shape. The test-only store uses:

- `events/test-immutable-ledger-entries.ndjson`

This file is not a production ledger. It exists only to validate append-only hash-chain behavior and commit-gate readiness without creating official journal entries.

## Production Blockers

Before real commits exist, Pet Pawket needs accounting, tax, security, legal, privacy, charity, and ops review for:

- Chart of accounts.
- Entity/fund/class model.
- Period close policy.
- Document evidence policy.
- Evidence deferral and redaction policy.
- Export redaction profile policy.
- Care Credit liability accounting.
- CHARM and CHERISH restricted-fund treatment.
- Tax and sales tax handling.
- Export and retention rules.
- Production encryption and key management.

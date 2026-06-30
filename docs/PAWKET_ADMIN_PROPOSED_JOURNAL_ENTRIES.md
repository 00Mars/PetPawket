# Pawket Admin Proposed Journal Entries

Last updated: 2026-05-29

Status: proposed journal-entry grouping model. Proposed journal entries are not final ledger truth.

## Purpose

Proposed journal entries group proposed ledger records into accounting proposals that can be validated before any final ledger commit exists.

The current chain is:

`staged source events -> draft finance records -> review queue items -> proposed ledger records -> proposed journal entries -> evidence coverage manifest -> commit-gate evidence integration -> disabled production commit gate -> future live ledger commit`

The final live ledger commit remains out of scope.

## Core Fields

Each proposed journal entry should include:

- `proposed_journal_entry_id`
- `source_proposed_ledger_record_ids`
- `source_review_item_ids`
- `source_draft_record_ids`
- `source_event_ids`
- `source_bundle_ids`
- `entity_id`
- `fund_id`
- `class_id`
- `effective_period`
- `transaction_date`
- `description`
- `journal_type`
- `currency`
- `total_debits`
- `total_credits`
- `balance_status`
- `document_coverage_status`
- `commit_evidence_manifest_id`, future/optional
- `approval_status`
- `commit_status`
- `risk_flags`
- `created_by`
- `created_at`
- `updated_at`

## Journal Types

Initial journal types:

- `sale`
- `payment`
- `refund`
- `donation`
- `pledge`
- `care_credit_liability`
- `reward_cost`
- `subscription`
- `packet_sale`
- `pack_sale`
- `impact_nonfinancial`
- `asset_review_nonfinancial`
- `adjustment`
- `correction`

## Balance Rule

Financial proposed journal entries must balance:

- Total debits equal total credits.
- Currency is consistent.
- Source proposed ledger records remain traceable.

Non-financial proof, story, impact, and Pawket Pal asset/IP review records should stay out of debit/credit journal balancing unless a reviewed cost, sale, liability, or asset value exists.

## Traceability

Every proposed journal entry must trace back to:

- Proposed ledger records.
- Draft finance records.
- Review queue item decisions.
- Staged source events.
- Connector bundles.
- Documents or approved deferrals.
- Commit evidence manifest once generated.
- Commit-gate evidence integration.
- Disabled production commit record if a production commit was requested while disabled.
- Calculation rules.
- Audit events.

## Current Skeleton Behavior

`utils/pawketAdminJournalCommitGate.js` can group proposed ledger records and write proposed journal entries to:

- `events/proposed-journal-entries.ndjson`

This file is still pre-ledger. It is not `events/journal-entries.ndjson`, `events/live-ledger.ndjson`, or official ledger truth.

`utils/pawketAdminEvidence.js` can create a commit evidence manifest for a proposed journal entry. The manifest preserves source proposed-ledger, draft, source-event, and bundle IDs; lists required, linked, missing, and deferred evidence; includes privacy/redaction warnings; and stores a deterministic manifest hash.

`utils/pawketAdminLiveLedgerGate.js` can validate a proposed journal entry against the disabled live-ledger commit gate and write a disabled production commit record or test-only immutable ledger entry. Those records are still not final ledger truth.

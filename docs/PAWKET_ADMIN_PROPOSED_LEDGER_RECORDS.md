# Pawket Admin Proposed Ledger Records

Last updated: 2026-05-28

Status: proposed-ledger model. Proposed records are not final ledger truth.

## Purpose

Proposed ledger records are pre-ledger accounting lines generated from reviewed draft finance records.

They let Pawket Admin test mapping, balancing, documents, and review state before any official ledger commit exists.

The next layer groups these records into proposed journal entries. Proposed journal entries are also pre-ledger records and do not post balances.

## Core Fields

Each proposed ledger record should include:

- `proposed_ledger_record_id`
- `source_draft_record_ids`
- `source_review_item_id`
- `source_bundle_ids`
- `source_event_ids`
- `entity_id`
- `fund_id`
- `class_id`
- `account_id`
- `account_type`
- `debit_amount`
- `credit_amount`
- `currency`
- `description`
- `transaction_date`
- `effective_period`
- `document_links`
- `calculation_rule_id`
- `approval_status`
- `approval_role_required`
- `risk_flags`
- `created_at`
- `updated_at`

## Meaning

Proposed ledger records are:

- Pre-ledger records.
- Accounting mapping proposals.
- Balance-test inputs.
- Audit-traceable review artifacts.

Proposed ledger records are not:

- Posted journal entries.
- Official transactions.
- Customer balances.
- Care Credit balances.
- CHARM assistance awards.
- Tax reports.
- Public impact proof.

## Balance Rule

Financial proposed records must balance when grouped as a proposed journal entry:

- Total debits must equal total credits.
- Currency must be consistent.
- Empty proposed record groups are rejected.

Non-financial review records, such as story impact review or Pawket Pal asset/IP review without explicit cost or sale, should stay out of balanced journal-entry validation.

## Correction Model

Proposed records may be:

- `proposed`
- `needs_revision`
- `approved_for_future_commit`
- `rejected`
- `superseded`

Those statuses still do not write the live ledger.

Rejected or superseded proposed records should remain visible as history. Corrections should create new proposed records and audit events.

## Traceability

Every proposed ledger record must trace back to:

- Source draft record ids.
- Source review item id.
- Source bundle ids.
- Source event ids.
- Entity, fund, and class.
- Account mapping.
- Calculation rule reference.
- Document links or documented deferrals.
- Audit event.

## Proposed Journal Handoff

Proposed ledger records can be grouped into proposed journal entries only after source IDs, entity/fund/class, account, currency, period, document links, calculation rules, and risk flags are preserved.

The grouping layer may write:

- `events/proposed-journal-entries.ndjson`

It must not write:

- `events/journal-entries.ndjson`
- `events/live-ledger.ndjson`
- `events/final-ledger.ndjson`
- official balance files

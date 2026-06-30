# Pawket Admin Correction And Adjustment Model

Last updated: 2026-05-29

Status: correction and adjustment planning model. Current code creates proposed correction/adjustment records and proposed ledger correction records only.

## Purpose

Finance history should be append-only once committed. Corrections should preserve what happened, why it changed, who changed it, and which source proof supports the change.

## Record Types

Correction entry:

- Fixes an error in a prior proposed or committed entry.
- Must reference the target entry and reason.

Adjustment entry:

- Records a later-period adjustment without rewriting the original period.
- Must reference the original entry, affected period, and correction period.

Reversal entry:

- Reverses a prior entry with equal and opposite lines.
- Must preserve source and reason.

Supersession:

- Replaces a proposed record before final commit.
- Must preserve the superseded record as history.

Voiding before commit:

- May reject or supersede proposed records before final commit.
- Must not delete the original proposal.

Correcting after commit:

- Must create a new committed correction, adjustment, or reversal entry.
- Must not mutate the original committed entry.

## Required Fields

Correction and adjustment requests should include:

- `request_type`
- `target_entry_id`
- `source_proposed_journal_entry_id`
- `source_proposed_ledger_record_ids`
- `source_event_ids`
- `source_bundle_ids`
- `document_links`
- `reason`
- `actor`
- `period_status`
- `correction_period`
- `audit_event_id`

## Audit Events

Every correction, adjustment, reversal, void, rejection, or supersession must produce an audit event.

The audit event should include:

- Target entry.
- Request type.
- Reason.
- Actor.
- Role.
- Source proof.
- Whether a closed or locked period is involved.

## Current Skeleton Behavior

`utils/pawketAdminJournalCommitGate.js` can validate correction/adjustment requests and write proposed correction/adjustment records to:

- `events/proposed-corrections-adjustments.ndjson`

It does not edit original records and does not write live ledger truth.

`utils/pawketAdminLiveLedgerGate.js` can write proposed ledger correction records to:

- `events/proposed-ledger-correction-records.ndjson`

Those records require target entry, reason, source/proof reference, and an authorized actor. They do not edit original test-only or proposed records and do not write official live ledger truth.

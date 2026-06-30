# Pawket Admin Staged Source Events

Last updated: 2026-05-27

Status: staged source-event model. Staged events are not accounting truth and do not write the live ledger. They may feed draft-only normalization.

## Purpose

Staged source events are validated connector events copied out of quarantine into a reviewable source-event staging area.

They preserve source evidence while keeping a hard boundary before accounting normalization and ledger approval.

## Core Fields

Each staged source event should include:

- `staged_event_id`
- `source_bundle_id`
- `source_event_id`
- `connector_id`
- `event_type`
- `occurred_at`
- `source_record_id`
- `idempotency_key`
- `payload_hash`
- `normalized_preview`
- `validation_status`
- `staging_status`
- `rejection_reason`
- `created_at`

## Meaning

Staged source events are:

- Source evidence.
- Connector intake records.
- Inputs for future normalization.
- Traceability anchors.

Staged source events are not:

- Journal entries.
- Accounting transactions.
- Live ledger lines.
- Customer balances.
- Care Credit balances.
- CHARM assistance awards.
- Insurance referrals.
- Tax exports.
- Public impact proof by themselves.

## Future Normalization

The next normalization layer maps staged source events into draft finance records.

Examples:

- `order.created` may become draft revenue, tax liability, discount, COGS, donation pledge, and rewards source candidates.
- `refund.issued` may become draft refund, revenue reversal, donation pledge reversal, points reversal, and future Care Credit reversal candidates.
- `donation.created` may become donation-source evidence, donor acknowledgment candidate, and fund allocation candidate.
- `charm_pledge.created` may become mission pledge evidence only after legal/accounting review.

Draft normalization now exists as a plaintext test skeleton in `utils/pawketAdminNormalization.js`.

Draft finance records and review queue items are still not live ledger truth.

## Future Approval

Only after normalization and human approval should records move toward the live financial ledger.

Required future gates:

- Source document coverage.
- Calculation rule version.
- Entity/fund/class mapping.
- Period state.
- Privacy and consent review where relevant.
- Accounting/tax review where relevant.
- Role-based approval.
- Audit event.

## Current Skeleton Behavior

`utils/pawketAdminImportState.js` writes staged source event records to:

- `events/staged-source-events.ndjson`

It does not write:

- `events/live-ledger.ndjson`
- `ledger/`
- journal entries
- finance transactions
- customer balances
- Care Credit ledgers
- CHARM assistance ledgers

`verifyNoLiveLedgerWrites(vaultPath)` exists as a test guardrail for this boundary.

## Current Draft Normalization Boundary

`utils/pawketAdminNormalization.js` can write:

- `events/draft-finance-records.ndjson`
- `events/review-queue.ndjson`

It must not write:

- `events/live-ledger.ndjson`
- `events/finance-transactions.ndjson`
- `events/journal-entries.ndjson`
- `ledger/`
- `journal/`

Future ledger approval must be a separate permissioned workflow.

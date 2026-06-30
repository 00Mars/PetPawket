# Pawket Admin Import State Machine

Last updated: 2026-05-27

Status: connector intake state machine. This layer stages source events only; later normalization may create draft finance records, but neither layer writes live ledger records.

## Purpose

The import state machine controls how connector bundles move from quarantine into staged source events.

Flow:

`quarantine -> validation -> staged source events`

Staged source events are evidence. They are not accounting truth.

The next layer may map staged events into draft finance records and review queue items. Those draft records are also not accounting truth. A future human approval and live ledger phase must remain separate.

## States

Allowed states:

- `received`
- `quarantined`
- `schema_validated`
- `signature_pending`
- `signature_verified_mock`
- `payload_hash_verified`
- `idempotency_checked`
- `staged`
- `rejected`
- `superseded`
- `import_failed`

## Allowed Transitions

Baseline transitions:

- `received -> quarantined`
- `quarantined -> schema_validated`
- `schema_validated -> signature_pending`
- `signature_pending -> signature_verified_mock`
- `signature_verified_mock -> payload_hash_verified`
- `payload_hash_verified -> idempotency_checked`
- `idempotency_checked -> staged`
- any active validation state -> `rejected`
- `staged -> superseded`
- any active validation state -> `import_failed`

Direct transitions from `quarantined` to `staged` are not allowed.

Terminal or near-terminal states:

- `rejected`
- `superseded`
- `import_failed`

## Rules

- Quarantined bundles are immutable.
- Validation creates new audit events.
- Rejection preserves original evidence.
- Staging creates staged source events only.
- No staged event may write to the live ledger.
- Duplicate idempotency keys are rejected.
- Replayed cursor ranges are flagged.
- Missing signature/HMAC placeholder is rejected.
- Hash mismatch is rejected.
- Schema version mismatch is rejected.
- Unsupported event type is rejected unless an explicit development option allows it.
- Every transition is audited in production.

## Validation Requirements

Bundle validation requires:

- `bundle_id`
- `schema_version`
- `connector_id`
- `generated_at`
- `cursor_start`
- `cursor_end`
- `record_count`
- `payload_hash`
- `signature` or `hmac` placeholder
- `events`

Each event requires:

- `event_id`
- `event_type`
- `occurred_at`
- `source_record_id`
- `idempotency_key`
- `payload`

## Supported Event Types

Supported for this phase:

- `order.created`
- `payment.received`
- `refund.issued`
- `subscription.created`
- `subscription.cancelled`
- `pawket_packet.purchased`
- `pawket_pick.selected`
- `donation.created`
- `care_credit.planned`
- `charm_pledge.created`
- `story.submitted`
- `pawket_pal.created`

These event types are staged evidence only. They do not activate Care Credit balances, CHARM assistance, insurance workflows, public story usage, Pawket Pal value claims, tax exports, or live ledger entries.

## Rejection Rules

Reject a bundle if:

- Required bundle fields are missing.
- Required event fields are missing.
- `record_count` does not match `events.length`.
- `schema_version` is unsupported.
- Signature/HMAC placeholder is missing.
- Payload hash fails a provided expected-hash check.
- Duplicate idempotency keys exist within the bundle.
- Idempotency keys already exist in staged source events.
- Unsupported event type appears and unsupported types are not explicitly allowed.

Rejected bundles remain evidence. Rejection creates a rejection record and an audit event.

## Replay And Cursor Handling

This pass records cursor fields and rejects duplicate idempotency keys.

Future production handling should:

- Store connector cursor history.
- Reject or flag replayed cursor ranges.
- Detect cursor gaps.
- Require manual review for out-of-order high-water marks.

## Audit Events

State transitions and staging should create audit events:

- `connector_import_state_transitioned`
- `connector_bundle_staged`
- `connector_bundle_rejected`
- `connector_bundle_import_failed`
- `connector_bundle_superseded`

The audit event should include:

- Bundle id.
- Connector id.
- Previous state.
- Next state.
- Actor.
- Reason.
- Validation errors, if applicable.
- Staged event count, if applicable.

## Out Of Scope

This pass does not implement:

- Real signature verification.
- Real HMAC verification.
- Real payload decryption.
- Network connector pulls.
- Live accounting normalization into ledger truth.
- Human approval workflow that writes the ledger.
- Live ledger writes.
- UI.

## Next Boundary

`utils/pawketAdminNormalization.js` may read staged source events and create:

- `events/draft-finance-records.ndjson`
- `events/review-queue.ndjson`

Those records are draft-only and review-only. They do not create transactions, journal entries, official balances, tax reports, Care Credit balances, CHARM assistance records, or public impact proof.

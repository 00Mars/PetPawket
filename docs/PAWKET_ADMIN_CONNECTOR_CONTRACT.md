# Pawket Admin Connector Contract

Last updated: 2026-05-27

Status: read-only connector contract baseline. No live connector endpoint is implemented in this pass. Current code stages source events only after quarantine and validation.

## Principle

The website is a source node, not the finance authority.

Pawket Admin imports or pulls connector bundles. The connector provides source-event evidence. Pawket Admin decides whether the bundle is received, quarantined, validated, staged, rejected, superseded, or failed.

Staging is not a live ledger import. Staged source events remain evidence until a future human review and normalization phase maps them into draft accounting records.

The connector must never:

- Write to the vault.
- Modify ledger records.
- Access decrypted source documents.
- Request exports.
- Bypass audit events.
- Act as a human admin.
- Use customer auth as finance admin auth.
- Serve static finance data from `public/`.

## Source Node Responsibilities

A connector node may eventually provide:

- Order source events.
- Refund source events.
- Payment processor summary events.
- Subscription source events.
- Pawket Pack, Packet, or Pick operational events.
- Pawket Network source events.
- Sanitized impact source events, if approved.
- Minimal referral metadata, if approved.

Care Credit balances, CHARM assistance records, insurance metadata, private stories, medical details, hardship details, and private Pawket Pal or HeartCode data remain blocked until data-boundary and legal/privacy review explicitly approves the scope.

## Bundle Shape

A connector bundle should include:

- `bundle_id`
- `schema_version`
- `connector_id`
- `connector_type`
- `source_node_authority`
- `generated_at`
- `idempotency_key`
- `cursor`
- `cursor_start`
- `cursor_end`
- `record_count`
- `payload_hash`
- `encryption`
- `signature`
- `events`
- `redacted_payload_preview`, if safe for local fixture or debugging
- `import_policy`

`source_node_authority` should be `source_node_read_only`.

`import_policy.can_write_to_vault` must be `false`.

`import_policy.requires_quarantine` should be `true`.

## Encryption Concept

Production connector payloads should be encrypted for Pawket Admin.

This pass does not implement encryption. It records the required future fields:

- Payload encryption algorithm.
- Key id.
- Encrypted payload reference or encrypted payload.
- Nonce or IV handling.
- Payload hash.
- Signature or HMAC status.

Exact algorithm and key handling require security review.

## Signature Or HMAC Concept

Connector bundles should be authenticated.

The bundle should carry either a signature or HMAC verification structure chosen by security review.

Required concept fields:

- Algorithm.
- Key id.
- Signed fields.
- Signature or HMAC value.
- Verification status after Pawket Admin checks it.

The repo must never contain real connector secrets.

## Idempotency

Every connector bundle must include an idempotency key.

Every event inside a staging-capable connector bundle must also include its own `idempotency_key`.

Pawket Admin should reject duplicate idempotency keys for the same connector unless the duplicate is an exact replay already marked as processed.

Idempotency protects against:

- Double importing an order.
- Double counting a refund.
- Double importing a donation source event.
- Retrying a failed sync in a way that changes totals.

## Cursor-Based Incremental Sync

Connector sync should be cursor-based.

Cursor fields should include:

- Previous cursor.
- Next cursor.
- Source high-water mark.
- Event count.
- Generated timestamp.

Pawket Admin should store cursor state only after a bundle is validated and approved for import.

## Payload Hash

Each bundle should include a payload hash.

The hash should cover the canonical source payload or encrypted payload according to the security-reviewed format. It should be recorded in the audit event.

## Quarantine

All connector bundles should land in quarantine first.

Quarantine reasons include:

- Unknown connector id.
- Unknown schema version.
- Signature or HMAC failure.
- Payload hash mismatch.
- Duplicate idempotency key.
- Cursor gap.
- Unexpected event type.
- Restricted data included.
- Payload cannot be decrypted.
- Period already closed.

Quarantined bundles should not change ledger truth.

Current skeleton behavior stores quarantine evidence and later staged source-event evidence only. It does not update accounts, funds, transactions, customer balances, Care Credit balances, CHARM assistance records, inventory, tax records, or public impact proof.

## Staging Lifecycle

Current validated connector intake is:

1. `received`
2. `quarantined`
3. `schema_validated`
4. `signature_pending`
5. `signature_verified_mock`
6. `payload_hash_verified`
7. `idempotency_checked`
8. `staged` or `rejected`

The mock signature state is a development placeholder only. Production must replace it with security-reviewed signature or HMAC verification.

Supported staged source-event types for this phase:

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

These event types are source evidence only. They do not launch Care Credit, CHARM assistance, insurance referral behavior, public story usage, Pawket Pal value claims, tax exports, or live ledger entries.

## Import Review

Pawket Admin import review should verify:

1. Connector identity.
2. Schema version.
3. Signature or HMAC.
4. Payload hash.
5. Idempotency key.
6. Cursor continuity.
7. Event type allowlist.
8. Sensitive field exclusion.
9. Period status.
10. Required source ids and timestamps.

Only after review should connector events become staged source events. A later normalization and approval phase is required before any finance record becomes ledger truth.

## Audit Events

Required connector audit event sequence:

- `connector_bundle_received`
- `connector_bundle_quarantined`
- `connector_import_state_transitioned`, where applicable
- `connector_bundle_validated`, where applicable
- `connector_bundle_staged` or `connector_bundle_rejected`

Future reviewed ledger imports must use a separate audit event and must not reuse `connector_bundle_staged` as approval.

Connector import audit events should include:

- Bundle id.
- Connector id.
- Schema version.
- Payload hash.
- Idempotency key.
- Cursor.
- Validation outcome.
- Quarantine reason, if any.
- Staged event count, if any.
- Explicit `live_ledger_write: false` metadata for staging events.

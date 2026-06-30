# Pawket Admin Live Ledger Disabled Commit Gate

Last updated: 2026-05-29

Status: disabled production commit model and validation scaffold. Production live ledger commits remain blocked pending legal, accounting, tax, security, privacy, charity, and operations review.

## Purpose

The live-ledger commit gate is the final boundary before accounting truth exists.

The current code may validate a proposed journal entry, record that a production commit was requested while disabled, and create test-only immutable ledger artifacts. It must not create production journal entries, official live ledger records, balances, tax exports, Care Credit balances, CHARM assistance disbursement records, or public impact claims.

## Record Types

Proposed journal entry:

- Grouped accounting proposal.
- Not ledger truth.
- Must trace back to proposed ledger records, draft records, review items, source events, connector bundles, and evidence.

Test-only commit:

- Explicit test artifact created only when `enableTestCommit === true`.
- Stored in a test-only file.
- Hash-chained for integrity tests.
- Not production ledger truth.

Disabled production commit record:

- Evidence that a proposed journal entry reached the production commit gate while production commit remains disabled.
- Preserves blockers, warnings, source IDs, evidence manifest ID, and audit event ID.
- Does not post accounting truth.

Future production live commit:

- Out of scope until reviewed.
- Must be append-only and immutable.
- Must create official journal entries and journal lines only through a reviewed commit path.

## Required Checks

Before a proposed journal entry can be considered eligible for a future live commit, Pawket Admin must verify:

- Required role authority.
- Explicit commit intent.
- Proposed journal approval status.
- Open period status.
- Balance status.
- Evidence manifest presence and hash.
- Document coverage status.
- Missing evidence or approved deferrals.
- Source traceability back through the full intake chain.
- Calculation rule references for financial entries.
- Unresolved high-risk flag handling.
- Audit context and reason.
- Production commit policy status.

## Commit Gate Statuses

- `not_requested`
- `validation_failed`
- `eligible_but_production_disabled`
- `test_commit_allowed`
- `test_committed`
- `production_commit_blocked`
- `production_commit_future_review_required`
- `rejected`
- `superseded`

## Blocked Production Behavior

Production live commit is currently disabled by policy.

Current code must not write:

- `events/journal-entries.ndjson`
- `events/live-ledger.ndjson`
- `events/final-ledger.ndjson`
- `events/balances.ndjson`
- `ledger/journal-entries.ndjson`
- `ledger/live-ledger.ndjson`
- `ledger/final-ledger.ndjson`
- `ledger/balances.ndjson`

## Safe Test-Only Behavior

Current code may write only these live-ledger-gate files:

- `events/disabled-production-commit-records.ndjson`
- `events/test-immutable-ledger-entries.ndjson`
- `events/proposed-ledger-correction-records.ndjson`

These files are validation and planning artifacts only. They do not become official ledger truth.

## Current Code Boundary

`utils/pawketAdminLiveLedgerGate.js` defines the disabled production commit policy, role authorization checks, period checks, balance/integrity checks, readiness validation, disabled production commit records, test-only immutable ledger entries, hash-chain verification, proposed correction records, and official live-ledger file guards.

## Reporting Read Boundary

The reporting read model may inspect disabled production commit records and test-only immutable ledger entries as non-production inputs.

It must label summaries as proposed, test-only, simulated, or non-production. It must not treat disabled commit records or test-only entries as production ledger truth, official balances, tax reports, investor reports, foundation reports, public impact reports, or final exports.

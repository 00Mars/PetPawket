# Pawket Admin Final Commit Gate

Last updated: 2026-05-29

Status: final commit-gate model and test-only validation scaffold. Production live ledger commit remains blocked pending review.

## Purpose

The final commit gate is the last control before any future live ledger write. It prevents proposed journal entries from becoming ledger truth automatically.

This pass can validate commit eligibility, create disabled production commit records, and create explicitly enabled test-only commit artifacts. It must not create production live ledger truth.

## Required Checks

Before a proposed journal entry can become eligible for future commit, Pawket Admin must confirm:

- Required commit role is present.
- Proposed journal entry status is appropriate for commit-gate review.
- Financial entries are balanced.
- Non-financial entries are marked `nonfinancial_not_required`.
- Document coverage is complete or explicitly deferred with approved risk handling.
- Commit evidence manifest exists or can be generated from current source document metadata.
- Redaction and privacy warnings are reviewed for the requested commit/export purpose.
- Effective period is open.
- Source traceability is complete.
- Calculation rule references exist where required.
- Unresolved risk flags are resolved, accepted, or blocked.
- Audit context exists.
- Append-only write model is enforced.
- Evidence manifest ID and hash are preserved.
- Production commit policy is checked and remains disabled.

## Commit Roles

Initial role posture:

- `owner_root`: may commit in future production policy.
- `finance_admin`: may commit finance-scoped entries if production policy approves.
- `accountant_export_user`: may review/export but may not commit unless separately configured in the future.
- `bookkeeper`: may prepare but not commit.
- `connector_node`: may never commit.
- `investor_read_only`: may never commit.
- `foundation_admin`: may commit only foundation-scoped entries if future role policy explicitly allows.

## Commit Status

Current proposed journal entries use:

- `not_committed`

The test-only commit helper writes a separate artifact and does not update live ledger state.

## No Silent Edits

Final committed entries must never be silently edited or deleted.

Future corrections must be append-only correction, adjustment, or reversal entries with:

- Reason.
- Actor.
- Role.
- Source proof.
- Audit event.
- Trace back to the original committed entry.

## Current Skeleton Behavior

`utils/pawketAdminJournalCommitGate.js` can validate a final commit gate.

It returns:

- `eligible`
- `can_commit`
- `blockers`
- `warnings`
- `required_role`
- `commit_mode`

When `enableTestCommit` is not true, commit mode remains validation-only and live ledger writing remains disabled.

When `enableTestCommit` is true, the helper can write only:

- `events/test-ledger-commits.ndjson`

It must not write:

- `events/journal-entries.ndjson`
- `events/live-ledger.ndjson`
- `events/final-ledger.ndjson`
- official balance files

The evidence metadata layer can create commit evidence manifests in:

- `manifests/commit-evidence-manifests.ndjson`

Those manifests are proof snapshots for proposed journal entries. They are not final ledger commits.

The document-vault interface layer can create commit-gate evidence integration records in:

- `manifests/commit-gate-evidence-integration.ndjson`

Those records summarize evidence blockers and warnings for the commit gate. They are not final ledger commits.

`utils/pawketAdminLiveLedgerGate.js` adds the disabled production live-ledger commit gate.

It can write:

- `events/disabled-production-commit-records.ndjson`
- `events/test-immutable-ledger-entries.ndjson`
- `events/proposed-ledger-correction-records.ndjson`

It must not write:

- `events/journal-entries.ndjson`
- `events/live-ledger.ndjson`
- `events/final-ledger.ndjson`
- `events/balances.ndjson`
- `ledger/journal-entries.ndjson`
- `ledger/live-ledger.ndjson`
- `ledger/final-ledger.ndjson`
- `ledger/balances.ndjson`

The new helper treats production commit as disabled even when role, period, balance, evidence, lineage, calculation-rule, and audit checks pass.

## Reporting Read Boundary

The final commit gate can be read by reporting-preview tools to show blockers, warnings, evidence coverage, period status, and source lineage.

Those reports are previews only. They cannot become IRS/accountant/investor/foundation/public reports, official balances, or production ledger truth until production reporting and live commit are separately reviewed and enabled.

# Pawket Admin Ledger Period Enforcement

Last updated: 2026-05-29

Status: period enforcement model and validation helper. Production period close and live commit are not implemented.

## Period States

Open period:

- Normal future commit target.
- Proposed journal entries may pass period validation.

Soft closed period:

- Requires explicit override by an authorized role.
- Override must be audited.
- Production use requires accounting review.

Closed period:

- Rejects normal live ledger commit.
- Corrections should be made through a future reviewed adjustment flow into an open period.

Locked period:

- Rejects current commits.
- Only a future documented correction model may apply.

Correction period:

- Allows proposed correction, adjustment, or reversal validation only.
- Production correction commit remains disabled.

## Period Reopen

A future period reopen must require:

- Reopen request.
- Reason.
- Authorized approver.
- Scope.
- Audit event.
- New adjustment/correction entries.

Closed periods must not be silently modified.

## Commit Period Check

The commit gate must verify the proposed journal entry effective period before any future live ledger commit:

- `open` may pass.
- `soft_closed` requires override.
- `closed` rejects normal commit.
- `locked` rejects current commit.
- `correction_period` requires correction, adjustment, or reversal type.

## Current Code Boundary

`validateLedgerPeriodForCommit()` implements the current helper. It is not a full period close system and does not reopen, lock, or post to periods.

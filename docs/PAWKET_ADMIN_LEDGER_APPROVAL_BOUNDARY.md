# Pawket Admin Ledger Approval Boundary

Last updated: 2026-05-28

Status: proposed-ledger approval boundary. This pass creates proposed ledger records only. It does not create final live ledger records or official journal entries.

## Purpose

The ledger approval boundary prevents connector events, draft interpretations, or review queue decisions from becoming accounting truth automatically.

The controlled chain is:

`staged source events -> draft finance records -> review queue items -> approval checks -> proposed ledger records -> proposed journal entries -> final commit gate -> future live ledger write`

The final live ledger write remains out of scope.

## Record Types

Source event:

- Evidence from a connector or source system.
- Not accounting truth.

Draft finance record:

- A normalized interpretation of a staged source event.
- Not accounting truth.
- Can be corrected, rejected, or superseded.

Proposed ledger record:

- A pre-ledger accounting proposal created only after approval boundary checks.
- Not accounting truth.
- Can be rejected, superseded, or approved for a future commit.

Proposed journal entry:

- A grouped accounting proposal built from proposed ledger records.
- Not accounting truth.
- Must balance if financial.
- Non-financial proof/impact records remain outside debit/credit balancing.

Journal entry:

- A final posted accounting entry in a future live ledger.
- Final journal entries remain future work.

Live ledger truth:

- The final posted accounting record.
- Not implemented in this pass.

## Approval Roles

Initial role expectations:

- `bookkeeper`: commerce, payment, refund, and subscription preparation.
- `finance_admin`: rewards, Care Credit liability review, proposed-ledger review, and finance mapping.
- `foundation_admin`: CHARM, future CHERISH, restricted fund, donation, and impact-related review.
- `owner_root`: high-trust override and final future commit authority.

Production role permissions still require security, accounting, legal, privacy, and ops review.

## Required Checks

Before draft records can become proposed ledger records, Pawket Admin should check:

- Review queue item status is `approved_for_ledger_later`.
- Required approval role is present.
- Required documents are complete or explicitly deferred with risk flags.
- Draft records are not rejected or superseded.
- Entity, fund, and class mappings exist.
- Account mapping exists.
- Calculation rule reference exists where required.
- Effective period is open.
- High-risk flags are resolved or explicitly allowed.
- Audit event will be written.
- Live ledger write remains disabled.

## Document Coverage

Document coverage must be checked before proposed ledger generation.

Examples:

- Sales: order source evidence.
- Payment: payment processor evidence.
- Refund: refund source evidence.
- Donation: donor/source evidence.
- CHARM pledge: pledge rule and source order/campaign evidence.
- Care Credit: calculation rule and customer/account evidence.
- Pawket Pal: HeartCode, story, asset, and IP/rights references.

## Period Checks

The boundary only allows proposed ledger records for open periods in this pass.

Closed or locked periods must be rejected unless a future period reopen workflow creates its own audit events and adjustment policy.

## Rejection And Correction Model

Failed approval checks should not edit source events, draft records, review items, or audit events in place.

Corrections should create new records or decision events that preserve:

- Source draft ids.
- Source review item id.
- Source event ids.
- Rejection reason.
- Actor.
- Audit event id.

## No Automatic Live Ledger Writes

`approved_for_ledger_later` and `approved_for_future_commit` are not live ledger writes.

They are pre-commit states only. A future ledger commit must be separate, permissioned, period-aware, audited, and reversible only through correction entries.

## Proposed Journal And Commit-Gate Boundary

After proposed ledger records exist, the next safe layer may:

- Group proposed ledger records into proposed journal entries.
- Validate proposed journal balance.
- Validate final commit-gate eligibility.
- Write test-only commit artifacts when explicitly enabled.
- Write proposed correction/adjustment records.

It still must not write final journal entries, live ledger records, official balances, Care Credit balances, CHARM assistance truth, tax reports, or public impact proof.

## Why This Boundary Exists

This boundary protects Pet Pawket from:

- Double-counting connector events.
- Treating source data as accounting truth.
- Posting to closed periods.
- Misclassifying restricted funds.
- Creating Care Credit liability without review.
- Publishing unreviewed impact proof.
- Making tax or investor reports from unapproved draft records.
- Silent edits to finance history.

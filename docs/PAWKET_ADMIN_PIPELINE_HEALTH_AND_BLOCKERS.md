# Pawket Admin Pipeline Health And Blockers

Last updated: 2026-05-29

Status: production-disabled blocker and warning summary model.

## Purpose

Pipeline health summarizes what prevents Pawket Admin records from moving toward future production truth.

The summary must keep blockers visible rather than hiding them behind counts.

## Blocker Families

Blockers include:

- Missing evidence.
- Missing document types.
- Unresolved risk flags.
- Privacy blockers.
- Redaction blockers.
- Rejected review decisions.
- Rejected redaction outcomes.
- Blocked report/package statuses.
- Disabled production live-ledger gate.
- Disabled official balances.
- Disabled official reports.
- Disabled final exports.
- Production source mode rejection.
- Raw document inclusion rejection.

## Warning Families

Warnings include:

- Privacy warnings.
- Redaction warnings.
- Missing evidence warnings.
- Report warnings.
- Export risk flags.
- Commit warnings.
- Duplicate idempotency warnings.
- Refund/reversal warnings.
- Donation payable warnings.
- Care Credit liability warnings.
- CHARM/CHERISH payable warnings.

## Health Rule

The pipeline can be operationally useful while still blocked from production. A green read model does not mean accounting approval, tax approval, privacy approval, or production readiness.

## Current Code Boundary

`summarizePipelineBlockers()` and `summarizePipelineWarnings()` gather visible blocker and warning signals from existing local records without changing those records.

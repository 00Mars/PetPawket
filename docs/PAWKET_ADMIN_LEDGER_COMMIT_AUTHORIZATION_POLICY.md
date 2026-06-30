# Pawket Admin Ledger Commit Authorization Policy

Last updated: 2026-05-29

Status: authorization model and validation scaffold. Production live ledger commit remains disabled.

## Roles

Owner Root:

- Future authority: all scopes after production review.
- Current status: may pass validation, but production commit is disabled.

Finance Admin:

- Future authority: operating entries if reviewed policy allows.
- Current status: may pass operating-scope validation, but production commit is disabled.

Foundation Admin:

- Future authority: foundation-scoped entries only if reviewed policy allows.
- Current status: may pass foundation-scope validation, but production commit is disabled.

Bookkeeper:

- Future authority: prepare and review only.
- Current status: cannot final commit.

Accountant Export User:

- Future authority: review/export only unless a later reviewed policy changes this.
- Current status: cannot final commit.

Investor Read-Only:

- Future authority: never commit.
- Current status: cannot final commit.

Connector Node:

- Future authority: never commit.
- Current status: cannot final commit.

## Commit Actor Requirements

Every commit attempt or disabled commit record must preserve:

- Actor ID.
- Role.
- Reason or audit context.
- Target proposed journal entry.
- Source lineage.
- Evidence manifest ID.
- Audit event ID.

## Separation Of Duties

Future production policy should evaluate:

- Whether the preparer and committer must be different users.
- Whether high-risk entries require dual control.
- Whether foundation entries require foundation-role participation.
- Whether Care Credit liability, restricted funds, CHARM/CHERISH assistance, or tax-sensitive entries require extra review.

## High-Risk Overrides

High-risk overrides must be explicit, role-limited, reasoned, and audited. An override must not erase the original risk flag.

## Current Code Boundary

`validateCommitAuthorization()` rejects Connector Node, Investor Read-Only, Bookkeeper, and Accountant Export User for final commit authority. Owner Root, Finance Admin, and Foundation Admin may pass only the validation policy for their allowed scope. Production posting remains disabled even when authorization passes.

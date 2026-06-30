# Pawket Admin Period Close Model

Last updated: 2026-05-28

Status: period-close planning model. This pass validates open-period eligibility only.

## Purpose

Period close protects financial history from silent edits after reports, tax work, foundation reporting, investor reporting, or public impact claims have relied on it.

## Period States

Open period:

- Drafts and proposed ledger records may be prepared.
- Proposed journal entries may be prepared.
- Test-only commit artifacts may be created when explicitly enabled.
- Future live ledger commits may be allowed only after approval rules exist.

Closed period:

- Reports have been generated or reviewed.
- Records should not be silently changed.
- Corrections require adjustment entries.

Locked period:

- Higher-trust state after accounting/tax/foundation review.
- Changes require Owner Root or approved high-trust workflow.

Correction period:

- A later period where correction or adjustment entries may be posted.
- Does not rewrite the original source evidence.

## Adjustment Entry

An adjustment entry should:

- Reference the original source, draft, proposed ledger record, or ledger record.
- Include a reason.
- Include actor and role.
- Include document support.
- Include an audit event.

## Period Reopen

A period reopen requires:

- Explicit reopen reason.
- Owner Root or approved high-trust role.
- Affected period id.
- Affected report ids, if any.
- Expected correction type.
- Audit event.

## Audit Requirements

Period close, lock, reopen, and adjustment actions must be audit logged.

Audit metadata should include:

- Period id.
- Entity.
- Fund/class scope, if any.
- Actor.
- Role.
- Reason.
- Prior status.
- New status.
- Related report ids.

## No Silent Edits

Closed periods cannot be silently edited because reports, tax records, investor updates, donor acknowledgments, restricted-fund records, or public impact claims may already depend on them.

Corrections must be new records, not hidden mutations.

## Commit-Gate Rule

The final commit gate must reject financial commits for closed or locked periods unless a reviewed reopen, correction-period, or adjustment-entry workflow exists.

The current skeleton only validates open-period eligibility and creates test-only commit artifacts. It does not create production live ledger entries.

# Pawket Admin Evidence Coverage Layer

Status: first coverage model and plaintext test scaffold.

The evidence coverage layer answers one question before any future live ledger commit or export: what evidence supports this number, decision, story, promise, report, or proposed journal entry?

## Concepts

- `evidence requirement`: a document type required by a draft, review item, proposed ledger record, proposed journal entry, report, export, assistance record, donation, or public impact claim.
- `evidence link`: a metadata relationship between a source document and the target record it supports.
- `complete coverage`: all required document types are linked and usable.
- `incomplete coverage`: one or more requirements are missing.
- `approved deferral`: explicit, audited permission to proceed with a known missing requirement.
- `rejected evidence`: a linked document was reviewed and rejected.
- `redaction pending`: evidence exists but privacy/redaction review is incomplete.
- `export restricted`: evidence may support internal review but cannot be included in an export without policy approval.
- `privacy blocked`: evidence cannot be used for the requested purpose.
- `proof manifest`: hashable snapshot of evidence state at decision time.

## Coverage Statuses

- `not_required`
- `missing`
- `partial`
- `complete`
- `deferred_approved`
- `rejected`
- `privacy_blocked`
- `redaction_required`

## Chain Impact

Draft finance records use evidence coverage to decide whether a review queue item needs documents.

Review queue items use evidence coverage to assign risk flags and reviewer work.

Proposed ledger records carry document links and calculation-rule evidence forward.

Proposed journal entries use evidence coverage before final commit-gate eligibility.

The final commit gate must block or flag entries with missing required evidence unless an explicit approved deferral exists and policy allows that deferral.

Commit-gate evidence integration records summarize manifest coverage, missing documents, approved deferrals, privacy warnings, redaction warnings, and export profile blockers before any future live ledger commit can be considered.

Exports must check evidence coverage, redaction state, privacy class, export profile allowlists, and purpose. Public exports must aggregate or use only privacy-safe approved stories and impact proof.

## Report Impact

- IRS/accountant packs need receipts, invoices, order/payment/refund evidence, bank/payment processor evidence, sales tax support, COGS support, and reconciliation support.
- Investor packs need metrics backed by source records without leaking private customer, donor, story, or assistance data.
- Foundation reports need donor, restriction, award, payment, and outcome evidence with donor and assistance privacy intact.
- Public impact reports need only privacy-safe, approved, aggregated or consented proof.

## Current Code Boundary

`evaluateEvidenceCoverage()` maps target requirements to supported document types, checks linked documents, applies active deferrals, and returns missing documents, privacy warnings, redaction warnings, and risk flags.

`createCommitGateEvidenceIntegrationRecord()` turns an evidence manifest into a commit-gate summary record. It does not post journal entries.

This is a metadata/checking layer only. It does not upload documents, decrypt blobs, generate tax reports, or write live ledger truth.

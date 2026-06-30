# Pawket Admin Ledger Read Model

Last updated: 2026-05-29

Status: production-disabled read model. This is projection and reporting-preview scaffolding only.

## Purpose

The ledger read model lets Pawket Admin inspect proposed and test-only records without turning them into accounting truth.

Read models answer:

- What proposed records exist?
- What test-only immutable records exist?
- What source events, drafts, reviews, bundles, and evidence manifests support them?
- Which entity, fund, class, period, currency, journal type, and risk flags are involved?
- What is still missing before production truth could ever be considered?

## Read Model Types

`proposed-ledger-read-model`:

- Projects proposed ledger records.
- Useful for account-level proposed debit/credit previews.
- Not posted accounting truth.

`proposed-journal-read-model`:

- Projects grouped proposed journal entries.
- Useful for period/entity/fund/class/journal-type review.
- Not posted accounting truth.

`test-only-ledger-read-model`:

- Projects explicitly enabled test-only immutable ledger entries.
- Useful for hash-chain and future commit-shape validation.
- Not posted accounting truth.

`evidence-read-model`:

- Projects commit evidence manifests, source documents, deferrals, privacy warnings, and redaction warnings.
- Useful for seeing what support exists and what is missing.

`reconciliation-read-model`:

- Compares source event totals to proposed/test-only preview totals.
- Useful for finding variances and missing evidence.
- Not official reconciliation.

`report-manifest-read-model`:

- Defines report manifest metadata for preview/report planning.
- Does not generate report packages or final exports.

`report-package-gate-read-model`:

- Reads report manifests into export-intent and preview-package metadata.
- Preserves package blockers, approval state, redaction profile, recipient purpose, and final-export-disabled status.
- Does not generate report packages or final exports.

## Projection Rules

Read models are projections, not source truth.

They can be rebuilt from:

- Connector quarantine records.
- Staged source events.
- Draft finance records.
- Review queue decisions.
- Proposed ledger records.
- Proposed journal entries.
- Evidence manifests.
- Test-only immutable ledger entries.
- Audit events.

## Non-Production Labels

Every production-disabled read model must be labeled as:

- proposed
- simulated
- test-only
- non-production

These labels must remain visible in generated records and report manifests.

## Blocked Behavior

Read models must not create:

- Production journal entries.
- Official balances.
- IRS/accountant/investor/foundation/public final reports.
- Public impact claims.
- Export packages.
- Tax filings.
- Live ledger truth.
- Preview package metadata that implies a final export exists.

## Current Code Boundary

`utils/pawketAdminReportingReadModel.js` builds proposed journal read projections, test-only ledger read projections, simulated balances, reconciliation previews, and non-production report manifests. It writes only `manifests/report-manifests.ndjson`.

`utils/pawketAdminReportPackageGate.js` can create export-intent and preview-package metadata from report manifests. It writes only `manifests/export-intent-records.ndjson` and `manifests/report-preview-packages.ndjson`, and final exports remain disabled.

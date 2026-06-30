# Pawket Admin Ledger Balance And Integrity

Last updated: 2026-05-29

Status: integrity model and validation helper. Production ledger posting remains disabled.

## Balance Requirements

Financial proposed journal entries must have:

- Total debits equal total credits.
- Currency present and consistent.
- Balance status `balanced`.
- Account references available through proposed ledger records or future journal lines.

Non-financial proof, impact, story, and Pawket Pal review records may use:

- `balance_status: nonfinancial_not_required`
- `journal_type: impact_nonfinancial`
- `journal_type: asset_review_nonfinancial`

Non-financial records must not be forced into debit/credit balancing unless a reviewed financial cost, asset value, liability, sale, or expense exists.

## Integrity Requirements

Future committed ledger entries must preserve:

- Entity consistency.
- Fund consistency.
- Class consistency.
- Account normal balance validation.
- Source lineage integrity.
- Evidence manifest integrity.
- Document link integrity.
- Calculation rule version integrity.
- Ledger hash-chain continuity.
- No orphan journal lines.
- No orphan committed entries.
- No proposed records committed without a commit-gate record.

## Hash Chain

Future immutable ledger entries should use:

- `previous_ledger_hash`
- `ledger_entry_hash`

The hash should be calculated from canonical entry content excluding `ledger_entry_hash`. This is not a replacement for encryption, signatures, backups, or external audit review.

## Current Code Boundary

`validateLedgerBalanceIntegrity()` checks source lineage, debit/credit balance, non-financial exemptions, currency, and line orphan checks where lines are present.

`verifyTestImmutableLedgerChain()` validates the test-only immutable ledger hash chain in `events/test-immutable-ledger-entries.ndjson`.

`calculateSimulatedBalances()` in the reporting read-model layer can preview balances from proposed or test-only records. Those balances are explicitly simulated and non-production; they are not official balances and must not be used for tax, investor, public, CHARM, CHERISH, or Care Credit reporting.

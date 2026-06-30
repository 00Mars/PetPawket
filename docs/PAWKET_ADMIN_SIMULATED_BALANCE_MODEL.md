# Pawket Admin Simulated Balance Model

Last updated: 2026-05-29

Status: simulated balance model only. No official balances are created.

## Purpose

Simulated balances preview what balances would look like if proposed or test-only records were interpreted through the baseline chart of accounts.

They are useful for validating whether mapping, normal balance, source lineage, and period grouping rules make sense before any production ledger exists.

## Rules

- Simulated only.
- Derived from proposed records or test-only immutable records.
- Grouped by entity, fund, class, account, period, and currency.
- Labeled non-production.
- Not official accounting balances.
- Not tax support.
- Not investor support without review.
- Not public reporting support.

## Fields

Simulated balance records should include:

- `simulated_balance_id`
- `source_mode`: `proposed` or `test_only`
- `entity_id`
- `fund_id`
- `class_id`
- `account_id`
- `account_type`
- `normal_balance`
- `period`
- `currency`
- `debit_total`
- `credit_total`
- `simulated_balance`
- `source_record_ids`
- `evidence_manifest_ids`
- `warnings`
- `generated_at`
- `generated_by`

## Normal Balance

Debit-normal accounts calculate:

- `debit_total - credit_total`

Credit-normal accounts calculate:

- `credit_total - debit_total`

This is a preview helper, not an accounting policy approval.

## Current Code Boundary

`calculateSimulatedBalances()` rejects production source modes and labels output as simulated/non-production. It does not write official balance files.

## Package Gate Boundary

Simulated balances may be referenced by report manifests and preview-package intent only as non-production support.

They must not appear as official balances in accountant, IRS, investor, foundation, public impact, or internal final exports.

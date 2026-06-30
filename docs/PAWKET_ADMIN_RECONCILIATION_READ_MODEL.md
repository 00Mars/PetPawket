# Pawket Admin Reconciliation Read Model

Last updated: 2026-05-29

Status: reconciliation preview model only. No official reconciliation is created.

## Purpose

The reconciliation read model compares source events to proposed or test-only preview records so Pawket Admin can find review work before production ledger truth exists.

## Concepts

Proposed reconciliation:

- Compares source events to proposed ledger/journal records.

Test-only reconciliation:

- Compares source events to test-only immutable ledger entries.

Source system total:

- Amount summarized from source events.

Proposed ledger total:

- Amount summarized from proposed records.

Test-only ledger total:

- Amount summarized from test-only records.

Variance:

- Difference between source total and preview ledger total.

Unreconciled source events:

- Source events without linked proposed/test-only records.

Unreconciled records:

- Proposed/test-only records without matching source events.

## Warning Families

The preview should surface:

- Missing payment evidence.
- Duplicate idempotency warnings.
- Refund/reversal warnings.
- Donation payable mismatch.
- Care Credit liability mismatch.
- CHARM/CHERISH payable mismatch.

## Guardrail

This model is not official reconciliation. It only identifies what would need review.

## Current Code Boundary

`buildReconciliationPreview()` returns source totals, preview ledger totals, variance, unreconciled source IDs, unreconciled record IDs, duplicate idempotency warnings, refund warnings, donation warnings, Care Credit warnings, and CHARM/CHERISH warnings.

## Package Gate Boundary

Reconciliation previews may feed report manifests and export-intent warnings, but they do not create official reconciliation.

Missing evidence, variance, duplicate idempotency, refund/reversal, donation payable, Care Credit liability, or CHARM/CHERISH payable warnings must remain visible in preview-package metadata.

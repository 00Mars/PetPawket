# Pawket Admin Sample Vault Harness

Status: local-only, fake-data smoke harness. This is not a production vault, real ledger, public demo, browser route, export generator, or packaged desktop app.

## Purpose

The sample vault harness gives developers a controlled fake vault for exercising the existing operator preview chain:

```text
sample vault fixture
-> operator preview runner
-> operator shell read model
-> UI adapter
-> CLI preview
-> stdout
```

## Current Code

- `data/finance/security/sample-vault/`
- `utils/pawketAdminSampleVaultHarness.js`
- `tests/pawketAdminSampleVaultHarness.test.js`
- `npm run pawket-admin:preview:sample`

## Boundary

The harness may read tiny local NDJSON fixtures and run the preview runner. It must not mutate records, write reports, create exports, create official balances, store raw document content, add public files, start connector networking, or mark anything as production truth.

Every harness output and sample record is labeled demo, read-only, local-only, and non-production.

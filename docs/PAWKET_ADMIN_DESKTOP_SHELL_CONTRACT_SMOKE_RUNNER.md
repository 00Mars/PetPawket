# Pawket Admin Desktop Shell Contract Smoke Runner

Status: local-only stdout smoke runner. This is not a packaged desktop app, browser UI, public route, production UI, finance editor, ledger posting interface, report generator, or export generator.

## Purpose

The desktop shell contract smoke runner proves the safe local chain:

```text
sample vault
-> operator shell read model
-> desktop UI adapter state
-> desktop shell scaffold registry
-> desktop shell composition contract
-> stdout-only contract summary
```

The runner exists only to validate that the already-built read-only components can be assembled into one app-shell contract without creating finance truth, reports, balances, exports, routes, packages, or files.

The desktop contract inspection layer consumes this smoke summary for a separate in-memory guardrail baseline comparison. The smoke runner itself still does not persist summaries or inspection snapshots.

## Current Code

- `utils/pawketAdminDesktopContractSmokeRunner.js`
- `scripts/pawketAdminDesktopContractSmoke.js`
- `tests/pawketAdminDesktopContractSmokeRunner.test.js`
- `npm run pawket-admin:desktop-contract:smoke`

## Boundary

The runner may read local sample-vault NDJSON records, build in-memory view models, validate the app-shell contract, and print a plain-text summary to stdout.

It must not mutate vault records, write cache files, create PDF/CSV/XLSX/ZIP output, create official balances, create official reports, create final exports, add public routes, include raw document content, connect live connectors, upload documents, package a desktop app, or mark any state as production truth.

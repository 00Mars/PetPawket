# Pawket Admin Desktop Contract Inspection

Status: local-only, stdout-only guardrail inspection layer. This is not a packaged desktop app, browser UI, public route, production UI, finance editor, ledger posting interface, report generator, export generator, or runtime snapshot persistence system.

## Purpose

The desktop contract inspection layer compares the current desktop contract smoke summary against the expected non-production guardrail baseline.

Safe chain:

```text
sample vault or provided safe vault
-> desktop contract smoke runner
-> normalized inspection snapshot in memory
-> expected guardrail baseline comparison
-> stdout-only inspection report
```

The inspection layer exists to catch accidental drift such as enabled exports, enabled official reports, missing disabled gates, public paths, persisted runtime snapshots, packaged-app claims, document upload, connector networking, raw document content, or production source mode.

## Current Code

- `utils/pawketAdminDesktopContractInspection.js`
- `scripts/pawketAdminDesktopContractInspection.js`
- `tests/pawketAdminDesktopContractInspection.test.js`
- `npm run pawket-admin:desktop-contract:inspect`

## Boundary

The inspection layer may read the local sample vault or an explicitly supplied safe vault path, build the existing smoke summary, normalize an in-memory inspection snapshot, compare it with a static guardrail baseline, and print a plain-text report to stdout.

It must not persist inspection snapshots, mutate vault records, write cache files, create PDF/CSV/XLSX/ZIP output, create official balances, create official reports, create final exports, add public routes, include raw document content, connect live connectors, upload documents, package a desktop app, or mark any state as production truth.

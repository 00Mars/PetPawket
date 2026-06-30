# Pawket Admin Desktop Panel Render Inputs

Status: local-only input contract.

The renderer accepts a local vault path from:

- default: `data/finance/security/sample-vault`
- `--vault <path>`
- `--vault=<path>`
- `PAWKET_ADMIN_VAULT_PATH`

The implementation may also honor existing desktop contract smoke/inspection vault environment variables so all local runners share conventions.

## Consumed Utilities

The panel renderer should reuse:

- `utils/pawketAdminDesktopContractSmokeRunner.js`
- `utils/pawketAdminDesktopContractInspection.js`
- `utils/pawketAdminDesktopShellComposition.js`
- existing desktop panel bindings
- existing shell scaffold panel registry

It must not reimplement NDJSON reading, UI adapter state shaping, scaffold validation, app-shell composition, or guardrail baseline comparison unless a narrow adapter is needed.

## Input Rejection

The renderer fails closed when the vault path is missing, does not exist, is not a directory, includes a `public/` segment, points at export/report/balance/snapshot/runtime-state artifact locations, contains malformed NDJSON, or fails smoke/inspection/contract validation.

Input validation is read-only. It must not write repair files, caches, panel state, reports, exports, balances, or audit events.

# Pawket Admin Desktop Panel Render Failure Modes

Status: fail-closed behavior for the panel renderer scaffold.

The renderer returns a nonzero result and writes a safe error to stderr when:

- the vault path is missing or unsafe
- the vault path includes `public/`
- the vault path points at export, report, balance, snapshot, runtime panel-state, or production artifact locations
- local NDJSON records are malformed
- the desktop contract smoke runner cannot build the app-shell contract
- desktop contract inspection fails guardrail comparison
- panel render contracts fail validation
- the region map fails validation
- the summary surface fails validation
- any production, mutation, export, connector, upload, public route, packaged app, raw document, official balance, official report, final export, or runtime-state persistence flag is enabled

Failures must not write files, create logs in the vault, create runtime snapshots, persist panel state, create reports, create exports, create balances, mutate records, or expose raw document content.

# Pawket Admin Desktop Contract Smoke Failure Modes

Status: safe-failure contract.

The smoke runner returns a nonzero result and writes the validation error to stderr when:

- the vault path does not exist
- the vault path is not a directory
- the vault path is under `public/`
- the vault path points at an export/report/balance/production artifact location
- local NDJSON is malformed
- the operator shell read model fails validation
- the UI adapter state fails validation
- the desktop shell scaffold fails validation
- the composed app-shell contract fails validation
- stdout-only or read-only guardrails fail
- forbidden export/report/balance/public artifacts are detected

Failure output must not write files, create logs in the vault, create reports, create exports, create balances, mutate records, or expose raw document content.

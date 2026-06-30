# Pawket Admin Desktop Contract Smoke Inputs

Status: local-only non-production input contract.

## Supported Inputs

The smoke runner accepts a local vault path from:

- default: `data/finance/security/sample-vault`
- `--vault <path>`
- `--vault=<path>`
- `PAWKET_ADMIN_VAULT_PATH`
- `PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH`
- `PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH`

`--help` is safe and does not read or write the vault.

## Read Sources

The runner reads the same safe NDJSON sources used by the operator preview path:

- quarantine bundle metadata
- staged source events
- draft finance records
- review queue items
- proposed ledger records
- proposed journal entries
- evidence manifests
- commit-gate evidence integration records
- test-only immutable ledger entries
- report manifests
- export intents
- preview packages
- report review queue records
- report review decisions
- supersessions
- redaction outcomes
- reviewer notes

Missing files read as empty collections. Malformed NDJSON fails safely with a nonzero result and stderr message.

## Input Guardrails

Input paths must not be under `public/` and must not point at export, official-report, official-balance, final-export, production-report, or production-ledger artifact locations.

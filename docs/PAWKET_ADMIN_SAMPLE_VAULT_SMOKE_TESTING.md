# Pawket Admin Sample Vault Smoke Testing

Status: local preview smoke test only.

Run:

```bash
npm run pawket-admin:preview:sample
```

This executes:

```text
node scripts/pawketAdminOperatorPreview.js --vault data/finance/security/sample-vault
```

Expected output starts with:

```text
PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION
```

The preview is stdout-only. It must not create files, reports, balances, exports, public routes, or live ledger records.

The fixture intentionally includes:

- A clean staged/draft/proposed path.
- Missing evidence.
- An unresolved risk flag.
- A rejected report review.
- Privacy and redaction blockers.
- Disabled production gates.

Those states let the operator preview prove that counts, blockers, warnings, and non-production guardrails are visible.

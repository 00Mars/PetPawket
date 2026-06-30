# Pawket Admin Operator CLI Preview

Status: local terminal preview only.

The CLI preview is a plain-text rendering of the desktop UI adapter output. It is intended for local inspection while the packaged desktop UI remains unbuilt.

## Required Banner

Every CLI preview must clearly include:

```text
PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION
```

## Allowed Content

- Non-production/read-only/local-only labels.
- Panel names, counts, status labels, and attention levels.
- Short attention queue messages for blockers and warnings.
- Disabled production gate reminders.

## Forbidden Content

- Raw document content.
- Decrypted blobs.
- Final report data.
- Official balances.
- Tax/accountant/investor/foundation/public export output.
- Public impact claims.
- Private assistance, donor, customer, story, or medical-adjacent details.

## Output Boundary

The CLI preview returns text in memory. It must not write `.txt`, `.pdf`, `.csv`, `.xlsx`, `.zip`, or any other report/export artifact.

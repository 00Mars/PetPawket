# Pawket Admin Operator Preview Output

Status: stdout-only local preview output.

The runner prints only the rendered CLI preview text to stdout on success.

Required banner:

```text
PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION
```

## Output Content

The preview may include:

- source mode
- read-only/local-only labels
- official balance/report/final export disabled labels
- panel names and counts
- attention queue messages for blockers and warnings
- disabled production gate reminders

## Forbidden Output

The preview must not include:

- raw document content
- decrypted blobs
- private source payload bodies
- official balance claims
- final report content
- tax/accountant/investor/foundation/public export output
- public impact claims

## File Boundary

The runner must not write rendered preview text to disk. It must not create `.txt`, `.pdf`, `.csv`, `.xlsx`, `.zip`, report, balance, or export files.

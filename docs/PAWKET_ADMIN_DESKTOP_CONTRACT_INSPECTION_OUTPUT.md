# Pawket Admin Desktop Contract Inspection Output

Status: stdout-only report shape.

## Required Banner

Successful output must include:

```text
PAWKET ADMIN DESKTOP CONTRACT INSPECTION — NON-PRODUCTION
```

## Safe Fields

The stdout report may include only safe status and count fields:

- inspection status
- baseline comparison status
- matched guardrail count
- failed guardrail count
- missing guardrail count
- unexpected unsafe state count
- panel count
- disabled action count
- packaging blocker count
- attention item count
- disabled production gate count
- sample preview binding status
- official balance/report/export disabled status
- stdout-only and in-memory-only status

## Forbidden Output Content

The report must not include raw document content, private payloads, source event payload bodies, real customer/donor/vendor/person data, generated export paths, persisted snapshot paths, official report claims, official balance claims, or production ledger truth.

## Runtime Behavior

The rendered report is printed to stdout only. It is not saved to disk, exposed through a browser route, attached to an export, or treated as an audit event.

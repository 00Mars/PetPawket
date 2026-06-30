# Pawket Admin Desktop Contract Smoke Output

Status: stdout-only non-production output.

The smoke runner prints a short plain-text summary headed:

```text
PAWKET ADMIN DESKTOP CONTRACT SMOKE - NON-PRODUCTION
```

Runtime output uses the Unicode dash form:

```text
PAWKET ADMIN DESKTOP CONTRACT SMOKE — NON-PRODUCTION
```

## Summary Fields

Every smoke summary/result must include:

```json
{
  "production_enabled": false,
  "read_only": true,
  "local_only": true,
  "stdout_only": true,
  "packaged_app": false,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_desktop_contract_smoke",
  "raw_document_content_included": false,
  "mutation_actions_enabled": false,
  "export_actions_enabled": false,
  "connector_networking_enabled": false,
  "document_upload_enabled": false,
  "public_route_enabled": false
}
```

The text summary includes counts/status only:

- contract validation status
- panel count
- disabled action count
- packaging blocker count
- attention item count
- disabled production gate count
- sample preview binding status
- official balance/report/final export disabled status

It must not include raw document content, private payload bodies, real records, generated export paths, or production claims.

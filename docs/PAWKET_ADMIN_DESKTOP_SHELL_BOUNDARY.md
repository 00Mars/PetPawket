# Pawket Admin Desktop Shell Boundary

Status: disabled production boundary.

Every desktop shell scaffold state must keep:

```json
{
  "production_enabled": false,
  "read_only": true,
  "local_only": true,
  "packaged_app": false,
  "official_balance_status": "disabled",
  "official_report_status": "disabled",
  "final_export_status": "disabled",
  "source_mode": "local_non_production_desktop_scaffold",
  "raw_document_content_included": false,
  "mutation_actions_enabled": false,
  "export_actions_enabled": false,
  "connector_networking_enabled": false,
  "document_upload_enabled": false,
  "public_route_enabled": false
}
```

## Allowed Inputs

- Existing operator shell view model metadata.
- Existing desktop UI adapter state metadata.
- Sample vault preview metadata.

## Forbidden Outputs

- Production ledger truth.
- Official balances.
- Official reports.
- Final exports.
- Public web routes.
- Raw document content.
- Connector network calls.
- Document uploads.
- Packaged installers.

Any future UI shell must preserve this boundary until production review explicitly replaces it.

# Pawket Admin Desktop Panel Attention Routing

Status: in-memory attention routing metadata for the read-only desktop panel scaffold.

## Purpose

Attention routing maps safe blocker and warning categories to safe panels only. It is designed for a future local desktop shell to know where an operator should look without opening raw documents, exports, reports, public routes, or mutation flows.

## Routes

- `missing_evidence -> evidence`
- `unresolved_risk -> blockers`
- `rejected_review -> report_review`
- `privacy_blocker -> blockers`
- `redaction_blocker -> warnings`
- `disabled_production_gate -> disabled_production_gates`
- `packaging_blocker -> disabled_production_gates`
- `malformed_local_record -> blockers`

The implementation may also map source-specific aliases, such as `rejected_report_review`, to the same safe `report_review` panel.

## Route Rules

Every route must declare:

- `route_mode: panel_summary_only`
- `read_only: true`
- `opens_raw_documents: false`
- `opens_exports: false`
- `opens_reports: false`
- `opens_public_routes: false`
- `mutation_flow_enabled: false`
- `export_flow_enabled: false`
- `production_authority: false`

Attention routing is a pointer to a summary panel, not a workflow launcher.

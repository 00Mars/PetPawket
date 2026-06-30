# Pawket Admin Desktop Panel Render Output

Status: stdout-only summary contract.

Successful output must include:

```text
PAWKET ADMIN DESKTOP PANEL CONTRACTS — NON-PRODUCTION
```

## Safe Summary Fields

The stdout summary may include only:

- panel contract count
- enabled panel count
- disabled panel count
- warning panel count
- attention item count
- disabled production gate count
- inspection status
- baseline comparison status
- official balance/report/export disabled status
- stdout-only and in-memory-only status

## Region Metadata

The in-memory region map may define:

- `header`
- `left_nav`
- `main_panel`
- `attention_rail`
- `footer_status`

Regions are metadata only. They are not DOM nodes, browser routes, packaged-app windows, or persisted UI state.

## Forbidden Output

The renderer must not output raw document content, private payload bodies, full financial records, generated report contents, export paths, official balance claims, official report claims, production ledger truth, runtime snapshot paths, or persisted panel-state paths.

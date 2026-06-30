# Pawket Admin Desktop Panel Focus Model

Status: metadata-only focus model for future local desktop navigation.

## Purpose

The focus model describes safe keyboard and focus order metadata over already-validated panel render contracts. It does not create browser focus behavior, routes, persistent focus storage, mutation controls, or export controls.

## Selection State

Selection state remains in memory only:

- `selected_panel_id`
- `default_panel_id`
- `allowed_panel_ids`
- `disabled_panel_ids`
- `selection_mode: in_memory_only`
- `persistence_enabled: false`
- `public_route_sync_enabled: false`
- `mutation_side_effects_enabled: false`
- `export_side_effects_enabled: false`

The default selected panel is `overview` when available.

## Focus Metadata

Focus metadata may include:

- `focus_region_order`
- `focusable_panel_ids`
- `focusable_region_ids`
- `trap_focus_enabled: false`
- `browser_route_focus_enabled: false`
- `persistence_enabled: false`
- `raw_document_focus_allowed: false`
- `mutation_control_focus_allowed: false`
- `export_control_focus_allowed: false`

## Keyboard Map

The current keyboard map is inert metadata only. Allowed action intentions:

- `move_next_panel`
- `move_previous_panel`
- `move_to_attention_rail`
- `move_to_main_panel`
- `move_to_disabled_gates`
- `open_help_overlay_read_only`

Every keyboard action must stay read-only, side-effect-free, non-persistent, export-disabled, mutation-disabled, and without production authority.

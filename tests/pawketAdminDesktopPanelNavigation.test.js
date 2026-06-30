import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDesktopPanelAttentionRouting,
  buildDesktopPanelDisabledActionSurfaces,
  buildDesktopPanelFocusModel,
  buildDesktopPanelKeyboardMap,
  buildDesktopPanelNavigationContract,
  buildDesktopPanelNavigationInput,
  buildDesktopPanelNavigationSummary,
  buildDesktopPanelSelectionState,
  getDesktopPanelNavigationPolicy,
  renderDesktopPanelNavigationSummaryText,
  resolveDesktopPanelNavigationVaultPath,
  runDesktopPanelNavigationInspection,
  validateDesktopPanelAttentionRouting,
  validateDesktopPanelDisabledActionSurfaces,
  validateDesktopPanelFocusModel,
  validateDesktopPanelKeyboardMap,
  validateDesktopPanelNavigationContract,
  validateDesktopPanelSelectionState,
  verifyDesktopPanelNavigationReadOnly,
  verifyDesktopPanelNavigationStdoutOnly,
  verifyNoDesktopPanelNavigationExports,
  verifyNoDesktopPanelNavigationPublicFiles,
  verifyNoDesktopPanelNavigationRuntimeState,
} from '../utils/pawketAdminDesktopPanelNavigation.js';

function tempDir(prefix = 'pawket-admin-nav-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sampleVaultPath() {
  return getDesktopPanelNavigationPolicy().default_sample_vault_path;
}

function sampleInput() {
  return buildDesktopPanelNavigationInput(sampleVaultPath());
}

function sampleContract() {
  return buildDesktopPanelNavigationContract(sampleInput());
}

function sampleSummary() {
  return buildDesktopPanelNavigationSummary(sampleContract());
}

test('desktop panel navigation policy loads with production disabled', () => {
  const policy = getDesktopPanelNavigationPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.in_memory_only, true);
  assert.equal(policy.stdout_only, true);
  assert.equal(policy.runtime_state_persistence_enabled, false);
  assert.equal(policy.navigation_state_persistence_enabled, false);
  assert.equal(policy.focus_state_persistence_enabled, false);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.required_navigation_banner, 'PAWKET ADMIN DESKTOP PANEL NAVIGATION — NON-PRODUCTION');
  assert.ok(policy.default_sample_vault_path.endsWith(path.join('data', 'finance', 'security', 'sample-vault')));
});

test('vault path resolves from default sample vault', () => {
  const policy = getDesktopPanelNavigationPolicy();
  const resolved = resolveDesktopPanelNavigationVaultPath([], {}, policy);

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'default_sample_vault');
  assert.equal(resolved.vault_path, path.resolve(policy.default_sample_vault_path));
});

test('vault path resolves from argv and environment', () => {
  const fromArgv = resolveDesktopPanelNavigationVaultPath(['--vault', sampleVaultPath()], {});
  const fromEquals = resolveDesktopPanelNavigationVaultPath([`--vault=${sampleVaultPath()}`], {});
  const fromEnv = resolveDesktopPanelNavigationVaultPath([], {
    PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_VAULT_PATH: sampleVaultPath(),
  });

  assert.equal(fromArgv.ok, true);
  assert.equal(fromArgv.source, 'argv');
  assert.equal(fromEquals.ok, true);
  assert.equal(fromEquals.source, 'argv');
  assert.equal(fromEnv.ok, true);
  assert.equal(fromEnv.source, 'env');
  assert.equal(fromEnv.vault_path, path.resolve(sampleVaultPath()));
});

test('help mode is safe and does not read or write the vault', () => {
  const result = runDesktopPanelNavigationInspection(['--help'], { PAWKET_ADMIN_VAULT_PATH: '/does/not/exist' }, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, true);
  assert.equal(result.help, true);
  assert.equal(result.exit_code, 0);
  assert.match(result.stdout_text, /Usage:/);
  assert.deepEqual(result.files_written, []);
});

test('navigation input uses existing panel renderer path conventions', () => {
  const input = sampleInput();

  assert.equal(input.navigation_input_type, 'desktop_panel_navigation_input');
  assert.equal(input.renderer_input.renderer_input_type, 'desktop_panel_renderer_input');
  assert.equal(input.panel_render_contracts.panel_render_contracts_type, 'desktop_panel_render_contract_set');
  assert.equal(input.region_map.region_map_type, 'desktop_panel_region_map');
  assert.equal(input.summary_surface.summary_surface_type, 'desktop_panel_summary_surface');
  assert.equal(input.attention_surface.attention_surface_type, 'desktop_panel_attention_surface');
  assert.ok(input.navigation_input_hash);
});

test('navigation contract is stdout-only in-memory local-only read-only non-production', () => {
  const contract = sampleContract();
  const validation = validateDesktopPanelNavigationContract(contract);

  assert.equal(validation.ok, true);
  assert.equal(contract.production_enabled, false);
  assert.equal(contract.read_only, true);
  assert.equal(contract.local_only, true);
  assert.equal(contract.in_memory_only, true);
  assert.equal(contract.stdout_only, true);
  assert.equal(contract.navigation_state_persistence_enabled, false);
  assert.equal(contract.focus_state_persistence_enabled, false);
  assert.equal(contract.panel_count, 13);
  assert.ok(contract.navigation_contract_hash);
});

test('navigation contract rejects unsafe top-level states', () => {
  const contract = sampleContract();

  for (const [field, unsafeValue] of [
    ['production_enabled', true],
    ['read_only', false],
    ['local_only', false],
    ['in_memory_only', false],
    ['stdout_only', false],
    ['runtime_state_persistence_enabled', true],
    ['navigation_state_persistence_enabled', true],
    ['focus_state_persistence_enabled', true],
    ['packaged_app', true],
    ['mutation_actions_enabled', true],
    ['export_actions_enabled', true],
    ['connector_networking_enabled', true],
    ['document_upload_enabled', true],
    ['public_route_enabled', true],
  ]) {
    const validation = validateDesktopPanelNavigationContract({ ...contract, [field]: unsafeValue });
    assert.equal(validation.ok, false, `${field} should be rejected`);
    assert.match(validation.errors.join(' '), new RegExp(field, 'i'));
  }
});

test('selection state defaults to Overview and rejects unsafe selection behavior', () => {
  const selection = sampleContract().selection_state;

  assert.equal(selection.selected_panel_id, 'overview');
  assert.equal(selection.default_panel_id, 'overview');
  assert.equal(validateDesktopPanelSelectionState(selection).ok, true);

  for (const [field, unsafeValue] of [
    ['selected_panel_id', 'not_a_panel'],
    ['persistence_enabled', true],
    ['public_route_sync_enabled', true],
    ['mutation_side_effects_enabled', true],
    ['export_side_effects_enabled', true],
  ]) {
    const validation = validateDesktopPanelSelectionState({ ...selection, [field]: unsafeValue });
    assert.equal(validation.ok, false, `${field} should be rejected`);
  }
});

test('selection state can be built directly from panel contracts', () => {
  const input = sampleInput();
  const selection = buildDesktopPanelSelectionState(input.panel_render_contracts);

  assert.equal(selection.selected_panel_id, 'overview');
  assert.equal(selection.selection_mode, 'in_memory_only');
  assert.equal(selection.persistence_enabled, false);
  assert.equal(selection.public_route_sync_enabled, false);
});

test('focus model includes safe region order and rejects unsafe focus behavior', () => {
  const contract = sampleContract();
  const focus = contract.focus_model;

  assert.deepEqual(focus.focus_region_order, ['header', 'left_nav', 'main_panel', 'attention_rail', 'footer_status']);
  assert.ok(focus.focusable_panel_ids.includes('overview'));
  assert.equal(validateDesktopPanelFocusModel(focus).ok, true);

  for (const [field, unsafeValue] of [
    ['persistence_enabled', true],
    ['raw_document_focus_allowed', true],
    ['mutation_control_focus_allowed', true],
    ['export_control_focus_allowed', true],
  ]) {
    const validation = validateDesktopPanelFocusModel({ ...focus, [field]: unsafeValue });
    assert.equal(validation.ok, false, `${field} should be rejected`);
  }
});

test('focus model can be built directly from panel contracts and regions', () => {
  const input = sampleInput();
  const focus = buildDesktopPanelFocusModel(input.panel_render_contracts, input.region_map);

  assert.equal(focus.focus_model_type, 'desktop_panel_focus_model');
  assert.equal(focus.trap_focus_enabled, false);
  assert.equal(focus.browser_route_focus_enabled, false);
  assert.equal(validateDesktopPanelFocusModel(focus).ok, true);
});

test('keyboard map includes read-only navigation actions and rejects side effects', () => {
  const keyboardMap = sampleContract().keyboard_map;
  const actionIds = keyboardMap.actions.map((action) => action.action_id);

  assert.ok(actionIds.includes('move_next_panel'));
  assert.ok(actionIds.includes('move_previous_panel'));
  assert.ok(actionIds.includes('move_to_attention_rail'));
  assert.ok(actionIds.includes('open_help_overlay_read_only'));
  assert.equal(validateDesktopPanelKeyboardMap(keyboardMap).ok, true);

  for (const [field, unsafeValue] of [
    ['side_effects_enabled', true],
    ['mutation_enabled', true],
    ['export_enabled', true],
    ['production_authority', true],
  ]) {
    const unsafe = {
      ...keyboardMap,
      actions: keyboardMap.actions.map((action, index) => (
        index === 0 ? { ...action, [field]: unsafeValue } : action
      )),
    };
    const validation = validateDesktopPanelKeyboardMap(unsafe);
    assert.equal(validation.ok, false, `${field} should be rejected`);
  }
});

test('keyboard map can be built directly from panel contracts and regions', () => {
  const input = sampleInput();
  const keyboardMap = buildDesktopPanelKeyboardMap(input.panel_render_contracts, input.region_map);

  assert.equal(keyboardMap.keyboard_map_type, 'desktop_panel_keyboard_map');
  assert.equal(keyboardMap.actions.length, 6);
  assert.equal(validateDesktopPanelKeyboardMap(keyboardMap).ok, true);
});

test('attention routing maps attention categories to safe panels', () => {
  const routing = sampleContract().attention_routing;
  const byType = Object.fromEntries(routing.routes.map((route) => [route.attention_type, route.target_panel_id]));

  assert.equal(byType.missing_evidence, 'evidence');
  assert.equal(byType.unresolved_risk, 'blockers');
  assert.equal(byType.rejected_review, 'report_review');
  assert.equal(byType.disabled_production_gate, 'disabled_production_gates');
  assert.equal(validateDesktopPanelAttentionRouting(routing).ok, true);
});

test('attention routing rejects raw document export report and public route targets', () => {
  const routing = sampleContract().attention_routing;

  for (const [field, unsafeValue] of [
    ['opens_raw_documents', true],
    ['opens_exports', true],
    ['opens_reports', true],
    ['opens_public_routes', true],
    ['mutation_flow_enabled', true],
    ['export_flow_enabled', true],
  ]) {
    const unsafe = {
      ...routing,
      routes: routing.routes.map((route, index) => (
        index === 0 ? { ...route, [field]: unsafeValue } : route
      )),
    };
    const validation = validateDesktopPanelAttentionRouting(unsafe);
    assert.equal(validation.ok, false, `${field} should be rejected`);
  }
});

test('attention routing can be built directly from panel contracts and surface', () => {
  const input = sampleInput();
  const routing = buildDesktopPanelAttentionRouting(input.panel_render_contracts, input.attention_surface);

  assert.equal(routing.attention_routing_type, 'desktop_panel_attention_routing');
  assert.equal(routing.attention_item_count, 45);
  assert.equal(routing.disabled_production_gate_count, 36);
});

test('disabled action surfaces exist for every panel and include blocked finance actions', () => {
  const surfaces = sampleContract().disabled_action_surfaces;
  const actionIds = surfaces.surfaces[0].disabled_actions.map((action) => action.action_id);

  assert.equal(surfaces.surfaces.length, 13);
  assert.ok(actionIds.includes('commit_ledger_entry'));
  assert.ok(actionIds.includes('create_official_report'));
  assert.ok(actionIds.includes('create_final_export'));
  assert.ok(actionIds.includes('generate_pdf'));
  assert.ok(actionIds.includes('generate_csv'));
  assert.ok(actionIds.includes('generate_xlsx'));
  assert.ok(actionIds.includes('generate_zip'));
  assert.ok(actionIds.includes('upload_document'));
  assert.ok(actionIds.includes('connect_live_connector'));
  assert.ok(actionIds.includes('package_desktop_app'));
  assert.equal(validateDesktopPanelDisabledActionSurfaces(surfaces).ok, true);
});

test('disabled action surfaces reject enabled mutation export or production actions', () => {
  const surfaces = sampleContract().disabled_action_surfaces;

  for (const [field, unsafeValue] of [
    ['enabled', true],
    ['side_effects_enabled', true],
    ['mutation_enabled', true],
    ['export_enabled', true],
    ['production_authority', true],
  ]) {
    const unsafe = {
      ...surfaces,
      surfaces: surfaces.surfaces.map((surface, surfaceIndex) => (
        surfaceIndex === 0
          ? {
            ...surface,
            disabled_actions: surface.disabled_actions.map((action, actionIndex) => (
              actionIndex === 0 ? { ...action, [field]: unsafeValue } : action
            )),
          }
          : surface
      )),
    };
    const validation = validateDesktopPanelDisabledActionSurfaces(unsafe);
    assert.equal(validation.ok, false, `${field} should be rejected`);
  }
});

test('disabled action surfaces can be built directly from panel contracts', () => {
  const input = sampleInput();
  const surfaces = buildDesktopPanelDisabledActionSurfaces(input.panel_render_contracts);

  assert.equal(surfaces.disabled_action_surfaces_type, 'desktop_panel_disabled_action_surfaces');
  assert.equal(surfaces.surfaces.length, 13);
  assert.equal(validateDesktopPanelDisabledActionSurfaces(surfaces).ok, true);
});

test('navigation summary includes safe status counts and disabled official states', () => {
  const summary = sampleSummary();

  assert.equal(summary.navigation_validation_status, 'passed');
  assert.equal(summary.selected_panel_id, 'overview');
  assert.equal(summary.allowed_panel_count, 13);
  assert.equal(summary.disabled_panel_count, 0);
  assert.equal(summary.focus_region_count, 5);
  assert.equal(summary.keyboard_action_count, 6);
  assert.equal(summary.attention_route_count, 9);
  assert.equal(summary.disabled_action_surface_count, 13);
  assert.equal(summary.disabled_action_count, 234);
  assert.equal(summary.official_balance_status, 'disabled');
  assert.equal(summary.official_report_status, 'disabled');
  assert.equal(summary.final_export_status, 'disabled');
});

test('rendered summary includes banner and safe counts only', () => {
  const summary = sampleSummary();
  const text = renderDesktopPanelNavigationSummaryText(summary);

  assert.match(text, /PAWKET ADMIN DESKTOP PANEL NAVIGATION — NON-PRODUCTION/);
  assert.match(text, /Navigation validation: passed/);
  assert.match(text, /Selected panel: overview/);
  assert.match(text, /Focus regions: 5/);
  assert.match(text, /Keyboard actions: 6/);
  assert.match(text, /Attention routes: 9/);
  assert.match(text, /Official balances: disabled/);
  assert.match(text, /Official reports: disabled/);
  assert.match(text, /Final exports: disabled/);
  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
});

test('rendered summary rejects raw document content', () => {
  assert.throws(
    () => renderDesktopPanelNavigationSummaryText({
      ...sampleSummary(),
      raw_document_content: 'PRIVATE DOCUMENT BODY',
    }),
    /raw document content/i
  );
});

test('runDesktopPanelNavigationInspection writes summary to stdout only', () => {
  let stdout = '';
  let stderr = '';
  const result = runDesktopPanelNavigationInspection(['--vault', sampleVaultPath()], {}, {
    stdout: { write(text) { stdout += text; } },
    stderr: { write(text) { stderr += text; } },
  });
  const stdoutOnly = verifyDesktopPanelNavigationStdoutOnly(result);

  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(stdoutOnly.ok, true);
  assert.match(stdout, /PAWKET ADMIN DESKTOP PANEL NAVIGATION — NON-PRODUCTION/);
  assert.equal(stderr, '');
  assert.deepEqual(result.files_written, []);
});

test('malformed local records produce safe nonzero result', () => {
  const vault = tempDir('pawket-admin-nav-bad-');
  writeFile(path.join(vault, 'events', 'staged-source-events.ndjson'), '{bad json}\n');
  const result = runDesktopPanelNavigationInspection(['--vault', vault], {}, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, false);
  assert.notEqual(result.exit_code, 0);
  assert.match(result.stderr_text, /Malformed NDJSON|Unexpected token|JSON/i);
  assert.equal(result.stdout_text, '');
});

test('public path usage is rejected', () => {
  const root = tempDir('pawket-admin-nav-public-');
  const publicVault = path.join(root, 'public', 'vault');
  fs.mkdirSync(publicVault, { recursive: true });
  const resolved = resolveDesktopPanelNavigationVaultPath(['--vault', publicVault], {});

  assert.equal(resolved.ok, false);
  assert.match(resolved.error, /public/i);
});

test('export artifacts are rejected', () => {
  const vault = tempDir('pawket-admin-nav-export-');
  writeFile(path.join(vault, 'exports', 'preview.pdf'), '');
  const verification = verifyNoDesktopPanelNavigationExports(vault);

  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('read-only verifier confirms no mutation write targets are created', () => {
  const vault = tempDir('pawket-admin-nav-ro-');
  const clean = verifyDesktopPanelNavigationReadOnly(vault);
  writeFile(path.join(vault, 'manifests', 'desktop-panel-navigation-contract.ndjson'), '{}\n');
  const dirty = verifyDesktopPanelNavigationReadOnly(vault);

  assert.equal(clean.ok, true);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.present_paths.length, 1);
});

test('runtime navigation and focus state verifier rejects persisted state files', () => {
  const vault = tempDir('pawket-admin-nav-runtime-');
  const clean = verifyNoDesktopPanelNavigationRuntimeState(vault);
  writeFile(path.join(vault, 'runtime', 'desktop-panel-navigation-state.json'), '{}');
  const dirty = verifyNoDesktopPanelNavigationRuntimeState(vault);

  assert.equal(clean.ok, true);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.navigation_state_persistence_enabled, false);
  assert.equal(dirty.focus_state_persistence_enabled, false);
});

test('public file verifier rejects public files under vault', () => {
  const vault = tempDir('pawket-admin-nav-pubfile-');
  writeFile(path.join(vault, 'nested', 'public', 'panel-navigation.json'), '{}');
  const verification = verifyNoDesktopPanelNavigationPublicFiles(vault);

  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('no official reports balances final exports public files or runtime state exist in sample vault', () => {
  const exportsVerification = verifyNoDesktopPanelNavigationExports(sampleVaultPath());
  const runtimeVerification = verifyNoDesktopPanelNavigationRuntimeState(sampleVaultPath());
  const publicVerification = verifyNoDesktopPanelNavigationPublicFiles(sampleVaultPath());
  const readOnlyVerification = verifyDesktopPanelNavigationReadOnly(sampleVaultPath());

  assert.equal(exportsVerification.ok, true);
  assert.equal(runtimeVerification.ok, true);
  assert.equal(publicVerification.ok, true);
  assert.equal(readOnlyVerification.ok, true);
});

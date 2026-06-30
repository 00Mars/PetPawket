import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDesktopPanelAttentionSurface,
  buildDesktopPanelRegionMap,
  buildDesktopPanelRenderContracts,
  buildDesktopPanelRendererInput,
  buildDesktopPanelRenderContract,
  buildDesktopPanelSummarySurface,
  getDesktopPanelRendererPolicy,
  renderDesktopPanelContractSummaryText,
  resolveDesktopPanelRendererVaultPath,
  runDesktopPanelRendererInspection,
  validateDesktopPanelRegionMap,
  validateDesktopPanelRenderContract,
  validateDesktopPanelSummarySurface,
  verifyDesktopPanelRendererReadOnly,
  verifyDesktopPanelRendererStdoutOnly,
  verifyNoDesktopPanelRendererExports,
  verifyNoDesktopPanelRendererPublicFiles,
  verifyNoDesktopPanelRendererRuntimeState,
} from '../utils/pawketAdminDesktopPanelRenderer.js';

function tempDir(prefix = 'pawket-admin-panels-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sampleVaultPath() {
  return getDesktopPanelRendererPolicy().default_sample_vault_path;
}

function sampleInput() {
  return buildDesktopPanelRendererInput(sampleVaultPath());
}

function samplePanelContracts() {
  return buildDesktopPanelRenderContracts(sampleInput());
}

function sampleSummarySurface() {
  return buildDesktopPanelSummarySurface(samplePanelContracts());
}

test('desktop panel renderer policy loads with production disabled', () => {
  const policy = getDesktopPanelRendererPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.stdout_only, true);
  assert.equal(policy.in_memory_only, true);
  assert.equal(policy.runtime_state_persistence_enabled, false);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.required_panel_render_banner, 'PAWKET ADMIN DESKTOP PANEL CONTRACTS — NON-PRODUCTION');
  assert.ok(policy.default_sample_vault_path.endsWith(path.join('data', 'finance', 'security', 'sample-vault')));
});

test('vault path resolves from default sample vault', () => {
  const policy = getDesktopPanelRendererPolicy();
  const resolved = resolveDesktopPanelRendererVaultPath([], {}, policy);

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'default_sample_vault');
  assert.equal(resolved.vault_path, path.resolve(policy.default_sample_vault_path));
});

test('vault path resolves from argv and equals argv', () => {
  const fromArgv = resolveDesktopPanelRendererVaultPath(['--vault', sampleVaultPath()], {});
  const fromEquals = resolveDesktopPanelRendererVaultPath([`--vault=${sampleVaultPath()}`], {});

  assert.equal(fromArgv.ok, true);
  assert.equal(fromArgv.source, 'argv');
  assert.equal(fromArgv.vault_path, path.resolve(sampleVaultPath()));
  assert.equal(fromEquals.ok, true);
  assert.equal(fromEquals.source, 'argv');
});

test('vault path resolves from environment', () => {
  const resolved = resolveDesktopPanelRendererVaultPath([], {
    PAWKET_ADMIN_VAULT_PATH: sampleVaultPath(),
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'env');
  assert.equal(resolved.vault_path, path.resolve(sampleVaultPath()));
});

test('help mode is safe and does not read or write the vault', () => {
  const result = runDesktopPanelRendererInspection(['--help'], { PAWKET_ADMIN_VAULT_PATH: '/does/not/exist' }, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, true);
  assert.equal(result.help, true);
  assert.equal(result.exit_code, 0);
  assert.match(result.stdout_text, /Usage:/);
  assert.deepEqual(result.files_written, []);
});

test('renderer input uses existing smoke inspection and composition path conventions', () => {
  const input = sampleInput();

  assert.equal(input.renderer_input_type, 'desktop_panel_renderer_input');
  assert.equal(input.app_shell_contract.app_shell_contract_type, 'desktop_app_shell_contract');
  assert.equal(input.smoke_summary.smoke_summary_type, 'desktop_contract_smoke_summary');
  assert.equal(input.inspection_report.inspection_report_type, 'desktop_contract_inspection_report');
  assert.equal(input.inspection_report.inspection_status, 'passed');
  assert.equal(input.panel_bindings.panel_bindings_type, 'desktop_panel_state_bindings');
  assert.ok(input.renderer_input_hash);
});

test('panel render contracts are stdout-only in-memory local-only read-only non-production', () => {
  const contracts = samplePanelContracts();

  assert.equal(contracts.panel_render_contracts_type, 'desktop_panel_render_contract_set');
  assert.equal(contracts.production_enabled, false);
  assert.equal(contracts.read_only, true);
  assert.equal(contracts.local_only, true);
  assert.equal(contracts.in_memory_only, true);
  assert.equal(contracts.stdout_only, true);
  assert.equal(contracts.contracts.length, 13);
  assert.ok(contracts.panel_render_contracts_hash);
});

test('panel render contract rejects unsafe top-level states', () => {
  const contract = samplePanelContracts().contracts[0];

  for (const [field, unsafeValue] of [
    ['production_enabled', true],
    ['read_only', false],
    ['local_only', false],
    ['in_memory_only', false],
    ['runtime_state_persistence_enabled', true],
    ['packaged_app', true],
    ['mutation_actions_enabled', true],
    ['export_actions_enabled', true],
    ['connector_networking_enabled', true],
    ['document_upload_enabled', true],
    ['public_route_enabled', true],
  ]) {
    const validation = validateDesktopPanelRenderContract({ ...contract, [field]: unsafeValue });
    assert.equal(validation.ok, false, `${field} should be rejected`);
    assert.match(validation.errors.join(' '), new RegExp(field, 'i'));
  }
});

test('panel render contract rejects unsafe panel controls', () => {
  const contract = samplePanelContracts().contracts[0];

  const rawValidation = validateDesktopPanelRenderContract({ ...contract, raw_document_content_allowed: true });
  const mutationValidation = validateDesktopPanelRenderContract({ ...contract, mutation_controls_allowed: true });
  const exportValidation = validateDesktopPanelRenderContract({ ...contract, export_controls_allowed: true });
  const authorityValidation = validateDesktopPanelRenderContract({ ...contract, production_authority: true });
  const routeValidation = validateDesktopPanelRenderContract({ ...contract, public_route_allowed: true });

  assert.equal(rawValidation.ok, false);
  assert.match(rawValidation.errors.join(' '), /raw document/i);
  assert.equal(mutationValidation.ok, false);
  assert.match(mutationValidation.errors.join(' '), /mutation controls/i);
  assert.equal(exportValidation.ok, false);
  assert.match(exportValidation.errors.join(' '), /export controls/i);
  assert.equal(authorityValidation.ok, false);
  assert.match(authorityValidation.errors.join(' '), /production_authority/i);
  assert.equal(routeValidation.ok, false);
  assert.match(routeValidation.errors.join(' '), /public_route_allowed/i);
});

test('panel contracts are created for all allowed panels', () => {
  const policy = getDesktopPanelRendererPolicy();
  const contracts = samplePanelContracts().contracts;
  const panelIds = contracts.map((contract) => contract.panel_id);

  assert.deepEqual(panelIds, policy.allowed_panels.map((panel) => panel.panel_id));
});

test('every panel contract is summary only and has no production authority', () => {
  for (const contract of samplePanelContracts().contracts) {
    const validation = validateDesktopPanelRenderContract(contract);

    assert.equal(validation.ok, true);
    assert.equal(contract.render_mode, 'summary_only');
    assert.equal(contract.data_scope, 'counts_status_and_guardrails_only');
    assert.equal(contract.production_authority, false);
    assert.equal(contract.public_route_allowed, false);
    assert.equal(contract.raw_document_content_allowed, false);
    assert.equal(contract.mutation_controls_allowed, false);
    assert.equal(contract.export_controls_allowed, false);
  }
});

test('single panel render contract can be built from a binding', () => {
  const input = sampleInput();
  const binding = input.panel_bindings.bindings[0];
  const contract = buildDesktopPanelRenderContract(binding, input.app_shell_contract, input.inspection_report);

  assert.equal(contract.panel_id, 'overview');
  assert.equal(contract.region_id, 'header');
  assert.equal(contract.render_mode, 'summary_only');
  assert.equal(validateDesktopPanelRenderContract(contract).ok, true);
});

test('region map includes all required screen regions', () => {
  const regionMap = buildDesktopPanelRegionMap(samplePanelContracts());
  const validation = validateDesktopPanelRegionMap(regionMap);

  assert.equal(validation.ok, true);
  assert.deepEqual(regionMap.regions.map((region) => region.region_id), [
    'header',
    'left_nav',
    'main_panel',
    'attention_rail',
    'footer_status',
  ]);
});

test('every region is local-only read-only non-production and blocks unsafe controls', () => {
  const regionMap = buildDesktopPanelRegionMap(samplePanelContracts());

  for (const region of regionMap.regions) {
    assert.equal(region.local_only, true);
    assert.equal(region.read_only, true);
    assert.equal(region.non_production, true);
    assert.equal(region.in_memory_only, true);
    assert.equal(region.raw_document_content_allowed, false);
    assert.equal(region.mutation_controls_allowed, false);
    assert.equal(region.export_controls_allowed, false);
    assert.equal(region.public_route_allowed, false);
  }
});

test('region map validation rejects unsafe region controls', () => {
  const regionMap = buildDesktopPanelRegionMap(samplePanelContracts());
  const unsafeRegionMap = {
    ...regionMap,
    regions: regionMap.regions.map((region, index) => (
      index === 0 ? { ...region, export_controls_allowed: true } : region
    )),
  };
  const validation = validateDesktopPanelRegionMap(unsafeRegionMap);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /export controls/i);
});

test('summary surface includes panel attention gate and inspection statuses', () => {
  const summary = sampleSummarySurface();
  const validation = validateDesktopPanelSummarySurface(summary);

  assert.equal(validation.ok, true);
  assert.equal(summary.panel_count, 13);
  assert.equal(summary.enabled_panel_count, 13);
  assert.equal(summary.disabled_panel_count, 0);
  assert.equal(summary.warning_panel_count, 3);
  assert.equal(summary.attention_item_count, 45);
  assert.equal(summary.disabled_production_gate_count, 36);
  assert.equal(summary.inspection_status, 'passed');
  assert.equal(summary.baseline_comparison_status, 'passed');
});

test('summary surface confirms official balances reports and final exports disabled', () => {
  const summary = sampleSummarySurface();

  assert.equal(summary.official_balance_status, 'disabled');
  assert.equal(summary.official_report_status, 'disabled');
  assert.equal(summary.final_export_status, 'disabled');
});

test('summary surface rejects official enabled states', () => {
  const validation = validateDesktopPanelSummarySurface({
    ...sampleSummarySurface(),
    official_report_status: 'enabled',
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /official balance/i);
});

test('attention surface preserves inspection attention and gate counts', () => {
  const input = sampleInput();
  const contracts = samplePanelContracts();
  const attentionSurface = buildDesktopPanelAttentionSurface(contracts, input.inspection_report);

  assert.equal(attentionSurface.attention_item_count, 45);
  assert.equal(attentionSurface.disabled_production_gate_count, 36);
  assert.equal(attentionSurface.inspection_status, 'passed');
  assert.ok(attentionSurface.attention_panel_ids.includes('blockers'));
  assert.ok(attentionSurface.attention_panel_ids.includes('warnings'));
  assert.ok(attentionSurface.attention_panel_ids.includes('disabled_production_gates'));
});

test('rendered summary includes required non-production banner and safe counts', () => {
  const summary = sampleSummarySurface();
  const text = renderDesktopPanelContractSummaryText(summary);

  assert.match(text, /PAWKET ADMIN DESKTOP PANEL CONTRACTS — NON-PRODUCTION/);
  assert.match(text, new RegExp(`Panel contracts: ${summary.panel_count}`));
  assert.match(text, new RegExp(`Attention items: ${summary.attention_item_count}`));
  assert.match(text, new RegExp(`Disabled production gates: ${summary.disabled_production_gate_count}`));
  assert.match(text, /Official balances: disabled/);
  assert.match(text, /Official reports: disabled/);
  assert.match(text, /Final exports: disabled/);
});

test('rendered summary does not include raw document content', () => {
  const text = renderDesktopPanelContractSummaryText(sampleSummarySurface());

  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
  assert.throws(
    () => renderDesktopPanelContractSummaryText({
      ...sampleSummarySurface(),
      raw_document_content: 'PRIVATE DOCUMENT BODY',
    }),
    /raw document content/i
  );
});

test('runDesktopPanelRendererInspection writes summary to stdout only', () => {
  let stdout = '';
  let stderr = '';
  const result = runDesktopPanelRendererInspection(['--vault', sampleVaultPath()], {}, {
    stdout: { write(text) { stdout += text; } },
    stderr: { write(text) { stderr += text; } },
  });
  const stdoutOnly = verifyDesktopPanelRendererStdoutOnly(result);

  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(stdoutOnly.ok, true);
  assert.match(stdout, /PAWKET ADMIN DESKTOP PANEL CONTRACTS — NON-PRODUCTION/);
  assert.equal(stderr, '');
  assert.deepEqual(result.files_written, []);
});

test('malformed local records produce safe nonzero result', () => {
  const vault = tempDir('pawket-admin-panels-bad-');
  writeFile(path.join(vault, 'events', 'staged-source-events.ndjson'), '{bad json}\n');
  const result = runDesktopPanelRendererInspection(['--vault', vault], {}, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, false);
  assert.notEqual(result.exit_code, 0);
  assert.match(result.stderr_text, /Malformed NDJSON|Unexpected token|JSON/i);
  assert.equal(result.stdout_text, '');
});

test('public path usage is rejected', () => {
  const root = tempDir('pawket-admin-panels-public-');
  const publicVault = path.join(root, 'public', 'vault');
  fs.mkdirSync(publicVault, { recursive: true });
  const resolved = resolveDesktopPanelRendererVaultPath(['--vault', publicVault], {});

  assert.equal(resolved.ok, false);
  assert.match(resolved.error, /public/i);
});

test('export artifacts are rejected', () => {
  const vault = tempDir('pawket-admin-panels-export-');
  writeFile(path.join(vault, 'exports', 'preview.pdf'), '');
  const verification = verifyNoDesktopPanelRendererExports(vault);

  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('read-only verifier confirms no mutation write targets are created', () => {
  const vault = tempDir('pawket-admin-panels-ro-');
  const clean = verifyDesktopPanelRendererReadOnly(vault);
  writeFile(path.join(vault, 'manifests', 'desktop-panel-render-contracts.ndjson'), '{}\n');
  const dirty = verifyDesktopPanelRendererReadOnly(vault);

  assert.equal(clean.ok, true);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.present_paths.length, 1);
});

test('runtime panel state verifier rejects persisted state files', () => {
  const vault = tempDir('pawket-admin-panels-runtime-');
  const clean = verifyNoDesktopPanelRendererRuntimeState(vault);
  writeFile(path.join(vault, 'runtime', 'desktop-panel-state.json'), '{}');
  const dirty = verifyNoDesktopPanelRendererRuntimeState(vault);

  assert.equal(clean.ok, true);
  assert.equal(dirty.ok, false);
  assert.equal(dirty.runtime_state_persistence_enabled, false);
});

test('public file verifier rejects public files under vault', () => {
  const vault = tempDir('pawket-admin-panels-pubfile-');
  writeFile(path.join(vault, 'nested', 'public', 'panel.json'), '{}');
  const verification = verifyNoDesktopPanelRendererPublicFiles(vault);

  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('no official reports balances or final exports are created in sample vault', () => {
  const exportsVerification = verifyNoDesktopPanelRendererExports(sampleVaultPath());
  const runtimeVerification = verifyNoDesktopPanelRendererRuntimeState(sampleVaultPath());
  const publicVerification = verifyNoDesktopPanelRendererPublicFiles(sampleVaultPath());
  const readOnlyVerification = verifyDesktopPanelRendererReadOnly(sampleVaultPath());

  assert.equal(exportsVerification.ok, true);
  assert.equal(runtimeVerification.ok, true);
  assert.equal(publicVerification.ok, true);
  assert.equal(readOnlyVerification.ok, true);
});

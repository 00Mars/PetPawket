import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildPipelineStatusViewModel,
} from '../utils/pawketAdminDesktopOperatorShell.js';
import {
  buildOperatorUiState,
} from '../utils/pawketAdminDesktopUiAdapter.js';
import {
  buildDesktopShellScaffoldState,
} from '../utils/pawketAdminDesktopShellScaffold.js';
import {
  buildSampleVaultRecords,
  getSampleVaultHarnessPolicy,
} from '../utils/pawketAdminSampleVaultHarness.js';
import {
  buildDesktopPanelStateBindings,
  buildDesktopSamplePreviewBinding,
  buildDesktopShellAttentionSurface,
  buildDesktopShellCompositionInput,
  buildDesktopShellStatusSurface,
  composeDesktopAppShellContract,
  getDesktopShellCompositionPolicy,
  validateDesktopAppShellContract,
  validateDesktopPanelStateBindings,
  validateDesktopSamplePreviewBinding,
  verifyDesktopCompositionCreatesNoExports,
  verifyDesktopCompositionCreatesNoPublicFiles,
  verifyDesktopCompositionHasNoExportActions,
  verifyDesktopCompositionHasNoProductionAuthority,
  verifyDesktopCompositionReadOnly,
} from '../utils/pawketAdminDesktopShellComposition.js';

function tempDir(prefix = 'pawket-admin-desktop-shell-composition-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function samplePreviewMetadata(overrides = {}) {
  const samplePolicy = getSampleVaultHarnessPolicy();
  return {
    demo: true,
    ok: true,
    stdout_only: true,
    sample_vault_path: samplePolicy.default_sample_vault_path,
    record_count: 19,
    stdout_text: 'PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION\nSample preview only.',
    preview_text: 'PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION',
    runner_used: 'pawket-admin-operator-preview-runner-v0',
    attention_types: [
      'missing_evidence',
      'unresolved_risk',
      'rejected_report_review',
      'privacy_blocker',
      'redaction_blocker',
      'disabled_production_gate',
    ],
    attention_messages: [
      'Sample missing evidence.',
      'Sample unresolved risk.',
      'Sample rejected report review.',
      'Sample privacy blocker.',
      'Sample redaction blocker.',
      'Production gates disabled.',
    ],
    preview_output_hash: 'f'.repeat(64),
    ...overrides,
  };
}

function sampleModels(overrides = {}) {
  const records = buildSampleVaultRecords();
  const viewModel = buildPipelineStatusViewModel(records);
  const uiState = buildOperatorUiState(viewModel);
  const samplePreview = samplePreviewMetadata();
  const scaffoldState = buildDesktopShellScaffoldState({
    operator_view_model: viewModel,
    operator_ui_state: uiState,
    sample_vault_preview: samplePreview,
  });
  return {
    operator_shell_read_model: viewModel,
    ui_state: uiState,
    scaffold_state: scaffoldState,
    sample_preview: samplePreview,
    ...overrides,
  };
}

function sampleContract(overrides = {}) {
  return composeDesktopAppShellContract(sampleModels(overrides));
}

test('desktop shell composition policy loads with production disabled', () => {
  const policy = getDesktopShellCompositionPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.allowed_panel_bindings.some((binding) => binding.panel_id === 'sample_vault_preview'));
});

test('composition input accepts operator shell UI adapter scaffold and optional sample preview metadata', () => {
  const input = buildDesktopShellCompositionInput(sampleModels());

  assert.equal(input.composition_input_type, 'desktop_shell_composition_input');
  assert.equal(input.operator_shell_read_model.view_model_type, 'pipeline_status');
  assert.equal(input.ui_state.ui_state_type, 'operator_ui_state');
  assert.equal(input.scaffold_state.scaffold_state_type, 'desktop_shell_scaffold_state');
  assert.equal(input.sample_preview_metadata.ok, true);
  assert.ok(input.composition_input_hash);
});

test('app shell contract is local-only read-only and non-production', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract(contract);

  assert.equal(validation.ok, true);
  assert.equal(contract.production_enabled, false);
  assert.equal(contract.read_only, true);
  assert.equal(contract.local_only, true);
  assert.equal(contract.packaged_app, false);
  assert.equal(contract.source_mode, 'local_non_production_desktop_shell_contract');
});

test('app shell contract rejects production enabled state', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('app shell contract rejects read only false state', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('app shell contract rejects packaged app true state', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, packaged_app: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /packaged_app/i);
});

test('app shell contract rejects mutation actions enabled', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, mutation_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /mutation_actions_enabled|Mutation action/i);
});

test('app shell contract rejects export actions enabled', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, export_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /export_actions_enabled|Export action/i);
});

test('app shell contract rejects connector networking enabled', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, connector_networking_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /connector_networking_enabled|Production authority/i);
});

test('app shell contract rejects document upload enabled', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, document_upload_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /document_upload_enabled|Production authority/i);
});

test('app shell contract rejects public route enabled', () => {
  const contract = sampleContract();
  const validation = validateDesktopAppShellContract({ ...contract, public_route_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /public_route_enabled|Production authority/i);
});

test('app shell contract includes required composed components', () => {
  const contract = sampleContract();

  assert.equal(contract.shell_boundary.boundary_type, 'desktop_shell_boundary');
  assert.equal(contract.panel_registry.registry_type, 'desktop_shell_panel_registry');
  assert.equal(contract.disabled_actions.registry_type, 'desktop_shell_disabled_actions');
  assert.equal(contract.packaging_blockers.registry_type, 'desktop_shell_packaging_blockers');
  assert.equal(contract.navigation_model.navigation_model_type, 'operator_desktop_navigation');
  assert.ok(contract.panel_summaries.overview);
  assert.ok(contract.status_badges.find((badge) => badge.badge_id === 'disabled_production_gates'));
  assert.ok(contract.attention_queue.items.length > 0);
});

test('panel bindings include all allowed panels', () => {
  const bindings = buildDesktopPanelStateBindings(sampleContract());
  const validation = validateDesktopPanelStateBindings(bindings);
  const panelIds = bindings.bindings.map((binding) => binding.panel_id);

  assert.equal(validation.ok, true);
  for (const panelId of [
    'overview',
    'pipeline',
    'evidence',
    'ledger_proposals',
    'test_only_ledger',
    'reporting',
    'report_packages',
    'report_review',
    'blockers',
    'warnings',
    'disabled_production_gates',
    'audit_notes',
    'sample_vault_preview',
  ]) {
    assert.ok(panelIds.includes(panelId), `missing ${panelId}`);
  }
});

test('every panel binding is read only and blocks mutation export raw content and production authority', () => {
  const bindings = buildDesktopPanelStateBindings(sampleContract());

  for (const binding of bindings.bindings) {
    assert.equal(binding.enabled, true);
    assert.equal(binding.read_only, true);
    assert.equal(binding.mutation_actions_enabled, false);
    assert.equal(binding.export_actions_enabled, false);
    assert.equal(binding.raw_document_content_allowed, false);
    assert.equal(binding.production_authority, false);
  }
});

test('panel binding validation rejects unsafe binding flags', () => {
  const bindings = buildDesktopPanelStateBindings(sampleContract());
  const unsafe = {
    ...bindings,
    bindings: bindings.bindings.map((binding) => (
      binding.panel_id === 'pipeline' ? { ...binding, production_authority: true } : binding
    )),
  };
  const validation = validateDesktopPanelStateBindings(unsafe);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_authority/i);
});

test('sample preview binding is demo only and preserves banner metadata', () => {
  const binding = buildDesktopSamplePreviewBinding(samplePreviewMetadata());
  const validation = validateDesktopSamplePreviewBinding(binding);

  assert.equal(validation.ok, true);
  assert.equal(binding.demo, true);
  assert.equal(binding.sample_only, true);
  assert.equal(binding.stdout_only, true);
  assert.equal(binding.nonproduction_banner_present, true);
});

test('sample preview binding rejects public paths', () => {
  const binding = buildDesktopSamplePreviewBinding(samplePreviewMetadata({
    sample_vault_path: path.join(os.tmpdir(), 'public', 'sample-vault'),
  }));
  const validation = validateDesktopSamplePreviewBinding(binding);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /public/i);
});

test('sample preview binding rejects export artifact paths', () => {
  const binding = buildDesktopSamplePreviewBinding(samplePreviewMetadata({
    sample_vault_path: path.join(os.tmpdir(), 'sample-vault', 'final-export.pdf'),
  }));
  const validation = validateDesktopSamplePreviewBinding(binding);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /export artifact/i);
});

test('status surface includes disabled production gates', () => {
  const surface = buildDesktopShellStatusSurface(sampleContract());

  assert.ok(surface.disabled_production_gates.includes('live_ledger_commit'));
  assert.ok(surface.disabled_production_gates.includes('create_final_export'));
  assert.ok(surface.packaging_blockers.includes('legal/accounting/tax/security/privacy review required'));
});

test('attention surface includes missing evidence unresolved risks report rejection privacy and redaction blockers', () => {
  const surface = buildDesktopShellAttentionSurface(sampleContract());

  assert.ok(surface.attention_types.includes('missing_evidence'));
  assert.ok(surface.attention_types.includes('unresolved_risk'));
  assert.ok(surface.attention_types.includes('rejected_report_review'));
  assert.ok(surface.attention_types.includes('privacy_blocker'));
  assert.ok(surface.attention_types.includes('redaction_blocker'));
});

test('verifier confirms no mutation actions', () => {
  const contract = sampleContract();

  assert.equal(verifyDesktopCompositionReadOnly(contract).ok, true);
  assert.equal(verifyDesktopCompositionReadOnly({ ...contract, mutation_actions_enabled: true }).ok, false);
});

test('verifier confirms no export actions', () => {
  const contract = sampleContract();

  assert.equal(verifyDesktopCompositionHasNoExportActions(contract).ok, true);
  assert.equal(verifyDesktopCompositionHasNoExportActions({ ...contract, export_actions_enabled: true }).ok, false);
});

test('verifier confirms no production authority', () => {
  const contract = sampleContract();

  assert.equal(verifyDesktopCompositionHasNoProductionAuthority(contract).ok, true);
  assert.equal(verifyDesktopCompositionHasNoProductionAuthority({ ...contract, production_enabled: true }).ok, false);
});

test('no official reports balances final exports or public files are created', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'manifests', 'desktop-shell-composition.example.ndjson'), '{}\n');

  assert.equal(verifyDesktopCompositionCreatesNoExports(vaultPath).ok, true);
  assert.equal(verifyDesktopCompositionCreatesNoPublicFiles(vaultPath).ok, true);
});

test('public path usage is rejected', () => {
  const verification = verifyDesktopCompositionCreatesNoPublicFiles(path.join(os.tmpdir(), 'public', 'composition'));

  assert.equal(verification.ok, false);
  assert.match(verification.errors.join(' '), /public/i);
});

test('export artifacts are rejected', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'reports', 'official-report.csv'), 'not a real export');

  const verification = verifyDesktopCompositionCreatesNoExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDesktopShellBoundary,
  buildDesktopShellDisabledActions,
  buildDesktopShellPackagingBlockers,
  buildDesktopShellPanelRegistry,
  buildDesktopShellScaffoldState,
  getDesktopShellScaffoldPolicy,
  validateDesktopShellBoundary,
  validateDesktopShellDisabledActions,
  validateDesktopShellPanelRegistry,
  validateDesktopShellScaffoldState,
  verifyDesktopShellCreatesNoExports,
  verifyDesktopShellCreatesNoPublicFiles,
  verifyDesktopShellHasNoExportActions,
  verifyDesktopShellHasNoMutationActions,
  verifyDesktopShellHasNoProductionAuthority,
} from '../utils/pawketAdminDesktopShellScaffold.js';

function tempDir(prefix = 'pawket-admin-desktop-shell-scaffold-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sampleState(overrides = {}) {
  return buildDesktopShellScaffoldState({
    generated_at: '2026-05-29T19:00:00Z',
    operator_view_model: {
      view_model_type: 'pipeline_status',
    },
    operator_ui_state: {
      ui_state_type: 'operator_ui_state',
    },
    sample_vault_preview: {
      ok: true,
      preview_text: 'PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION',
    },
    ...overrides,
  });
}

test('desktop shell scaffold policy loads with production disabled', () => {
  const policy = getDesktopShellScaffoldPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.allowed_panels.some((panel) => panel.panel_id === 'sample_vault_preview'));
});

test('desktop shell boundary is local-only read-only and non-production', () => {
  const boundary = buildDesktopShellBoundary();
  const validation = validateDesktopShellBoundary(boundary);

  assert.equal(validation.ok, true);
  assert.equal(boundary.production_enabled, false);
  assert.equal(boundary.read_only, true);
  assert.equal(boundary.local_only, true);
  assert.equal(boundary.packaged_app, false);
  assert.ok(boundary.boundary_hash);
});

test('scaffold state rejects production enabled state', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('scaffold state rejects read-only false state', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('scaffold state rejects packaged app true state', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, packaged_app: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /packaged_app/i);
});

test('scaffold state rejects mutation actions enabled', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, mutation_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /mutation_actions_enabled|Mutation action/i);
});

test('scaffold state rejects export actions enabled', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, export_actions_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /export_actions_enabled|Export action/i);
});

test('scaffold state rejects connector networking enabled', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, connector_networking_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /connector_networking_enabled/i);
});

test('scaffold state rejects document upload enabled', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, document_upload_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /document_upload_enabled/i);
});

test('scaffold state rejects public route enabled', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState({ ...state, public_route_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /public_route_enabled/i);
});

test('panel registry includes all safe panels', () => {
  const registry = buildDesktopShellPanelRegistry();
  const validation = validateDesktopShellPanelRegistry(registry);
  const panelIds = registry.panels.map((panel) => panel.panel_id);

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

test('every panel is read-only and disables mutation export and raw content', () => {
  const registry = buildDesktopShellPanelRegistry();

  for (const panel of registry.panels) {
    assert.equal(panel.read_only, true);
    assert.equal(panel.mutation_actions_enabled, false);
    assert.equal(panel.export_actions_enabled, false);
    assert.equal(panel.raw_document_content_allowed, false);
    assert.ok(panel.source_view_model);
  }
});

test('panel registry validation rejects unsafe panel flags', () => {
  const registry = buildDesktopShellPanelRegistry();
  const unsafe = {
    ...registry,
    panels: registry.panels.map((panel) => (
      panel.panel_id === 'pipeline' ? { ...panel, export_actions_enabled: true } : panel
    )),
  };
  const validation = validateDesktopShellPanelRegistry(unsafe);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /pipeline.*export actions/i);
});

test('disabled actions registry includes ledger commit report export document upload and network actions', () => {
  const registry = buildDesktopShellDisabledActions();
  const validation = validateDesktopShellDisabledActions(registry);
  const labels = registry.actions.map((action) => action.label);

  assert.equal(validation.ok, true);
  for (const label of [
    'create ledger entry',
    'commit ledger entry',
    'create official balance',
    'create official report',
    'create final export',
    'generate PDF',
    'generate CSV',
    'generate XLSX',
    'generate ZIP',
    'upload document',
    'connect live connector',
    'send accountant package',
    'send investor package',
    'send IRS package',
    'package desktop app',
  ]) {
    assert.ok(labels.includes(label), `missing ${label}`);
  }
});

test('disabled actions registry validation rejects enabled actions', () => {
  const registry = buildDesktopShellDisabledActions();
  const unsafe = {
    ...registry,
    actions: registry.actions.map((action) => (
      action.action_id === 'commit_ledger_entry' ? { ...action, enabled: true } : action
    )),
  };
  const validation = validateDesktopShellDisabledActions(unsafe);

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /commit_ledger_entry/i);
});

test('packaging blockers include legal accounting tax security privacy review', () => {
  const blockers = buildDesktopShellPackagingBlockers();
  const labels = blockers.blockers.map((blocker) => blocker.label);

  assert.ok(labels.includes('legal/accounting/tax/security/privacy review required'));
  assert.equal(blockers.packaging_status, 'blocked_pending_review');
});

test('packaging blockers include production encryption and raw document storage review', () => {
  const blockers = buildDesktopShellPackagingBlockers();
  const labels = blockers.blockers.map((blocker) => blocker.label);

  assert.ok(labels.includes('production encryption not reviewed'));
  assert.ok(labels.includes('raw document storage not reviewed'));
  assert.ok(labels.includes('local vault hardening required'));
});

test('scaffold state consumes operator view model UI state and sample preview metadata', () => {
  const state = sampleState();
  const validation = validateDesktopShellScaffoldState(state);

  assert.equal(validation.ok, true);
  assert.equal(state.source_view_model_type, 'pipeline_status');
  assert.equal(state.source_ui_state_type, 'operator_ui_state');
  assert.equal(state.sample_vault_preview_available, true);
  assert.ok(state.scaffold_state_hash);
});

test('verifier confirms no mutation actions', () => {
  const state = sampleState();

  assert.equal(verifyDesktopShellHasNoMutationActions(state).ok, true);
  assert.equal(verifyDesktopShellHasNoMutationActions({
    ...state,
    panel_registry: {
      ...state.panel_registry,
      panels: [{ ...state.panel_registry.panels[0], mutation_actions_enabled: true }],
    },
  }).ok, false);
});

test('verifier confirms no export actions', () => {
  const state = sampleState();

  assert.equal(verifyDesktopShellHasNoExportActions(state).ok, true);
  assert.equal(verifyDesktopShellHasNoExportActions({
    ...state,
    disabled_actions: {
      ...state.disabled_actions,
      actions: [{ ...state.disabled_actions.actions.find((action) => action.action_id === 'generate_pdf'), enabled: true }],
    },
  }).ok, false);
});

test('verifier confirms no production authority', () => {
  const state = sampleState();

  assert.equal(verifyDesktopShellHasNoProductionAuthority(state).ok, true);
  assert.equal(verifyDesktopShellHasNoProductionAuthority({ ...state, live_ledger_commits_enabled: true }).ok, false);
});

test('public path usage is rejected', () => {
  const publicPath = path.join(os.tmpdir(), 'public', 'pawket-admin-desktop-shell-scaffold');
  const verification = verifyDesktopShellCreatesNoPublicFiles(publicPath);

  assert.equal(verification.ok, false);
  assert.match(verification.errors.join(' '), /public/i);
});

test('export artifacts are rejected', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'reports', 'final-export.pdf'), 'not a real export');

  const verification = verifyDesktopShellCreatesNoExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('no official reports balances final exports or public files are created', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'manifests', 'desktop-shell-scaffold.example.ndjson'), '{}\n');

  assert.equal(verifyDesktopShellCreatesNoExports(vaultPath).ok, true);
  assert.equal(verifyDesktopShellCreatesNoPublicFiles(vaultPath).ok, true);
});

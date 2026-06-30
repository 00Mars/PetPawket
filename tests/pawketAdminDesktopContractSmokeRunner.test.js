import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDesktopContractFromVault,
  buildDesktopContractSmokeInput,
  buildDesktopContractSmokeSummary,
  getDesktopContractSmokeRunnerPolicy,
  renderDesktopContractSmokeSummaryText,
  resolveDesktopContractSmokeVaultPath,
  runDesktopContractSmoke,
  validateDesktopContractSmokeSummary,
  verifyDesktopContractSmokeReadOnly,
  verifyDesktopContractSmokeStdoutOnly,
  verifyNoDesktopContractSmokeExports,
  verifyNoDesktopContractSmokePublicFiles,
} from '../utils/pawketAdminDesktopContractSmokeRunner.js';

function tempDir(prefix = 'pawket-admin-desktop-contract-smoke-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sampleVaultPath() {
  return getDesktopContractSmokeRunnerPolicy().default_sample_vault_path;
}

function sampleSummary() {
  const contract = buildDesktopContractFromVault(sampleVaultPath());
  return buildDesktopContractSmokeSummary(contract);
}

test('desktop contract smoke runner policy loads with production disabled', () => {
  const policy = getDesktopContractSmokeRunnerPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.stdout_only, true);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.final_exports_enabled, false);
  assert.ok(policy.default_sample_vault_path.endsWith(path.join('data', 'finance', 'security', 'sample-vault')));
});

test('vault path resolves from default sample vault', () => {
  const policy = getDesktopContractSmokeRunnerPolicy();
  const resolved = resolveDesktopContractSmokeVaultPath([], {}, policy);

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'default_sample_vault');
  assert.equal(resolved.vault_path, path.resolve(policy.default_sample_vault_path));
});

test('vault path resolves from argv', () => {
  const vaultPath = sampleVaultPath();
  const resolved = resolveDesktopContractSmokeVaultPath(['--vault', vaultPath], {});

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'argv');
  assert.equal(resolved.vault_path, path.resolve(vaultPath));
});

test('vault path resolves from equals argv', () => {
  const vaultPath = sampleVaultPath();
  const resolved = resolveDesktopContractSmokeVaultPath([`--vault=${vaultPath}`], {});

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'argv');
  assert.equal(resolved.vault_path, path.resolve(vaultPath));
});

test('vault path resolves from environment', () => {
  const vaultPath = sampleVaultPath();
  const resolved = resolveDesktopContractSmokeVaultPath([], { PAWKET_ADMIN_VAULT_PATH: vaultPath });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'env');
  assert.equal(resolved.vault_path, path.resolve(vaultPath));
});

test('help mode is safe and does not read or write the vault', () => {
  const result = runDesktopContractSmoke(['--help'], { PAWKET_ADMIN_VAULT_PATH: '/does/not/exist' }, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, true);
  assert.equal(result.help, true);
  assert.equal(result.exit_code, 0);
  assert.match(result.stdout_text, /Usage:/);
  assert.deepEqual(result.files_written, []);
});

test('buildDesktopContractSmokeInput uses operator shell UI adapter scaffold and optional sample metadata', () => {
  const input = buildDesktopContractSmokeInput(sampleVaultPath());

  assert.equal(input.smoke_input_type, 'desktop_contract_smoke_input');
  assert.equal(input.operator_shell_read_model.view_model_type, 'pipeline_status');
  assert.equal(input.ui_state.ui_state_type, 'operator_ui_state');
  assert.equal(input.scaffold_state.scaffold_state_type, 'desktop_shell_scaffold_state');
  assert.equal(input.sample_preview.ok, true);
  assert.ok(input.smoke_input_hash);
});

test('buildDesktopContractFromVault composes a validated app shell contract', () => {
  const contract = buildDesktopContractFromVault(sampleVaultPath());

  assert.equal(contract.app_shell_contract_type, 'desktop_app_shell_contract');
  assert.equal(contract.operator_pipeline_status.view_model_type, 'pipeline_status');
  assert.equal(contract.ui_state.ui_state_type, 'operator_ui_state');
  assert.equal(contract.scaffold_state.scaffold_state_type, 'desktop_shell_scaffold_state');
  assert.equal(contract.sample_preview_binding.sample_preview_available, true);
  assert.ok(contract.app_shell_contract_hash);
});

test('smoke summary is stdout-only local-only read-only non-production', () => {
  const summary = sampleSummary();
  const validation = validateDesktopContractSmokeSummary(summary);

  assert.equal(validation.ok, true);
  assert.equal(summary.production_enabled, false);
  assert.equal(summary.read_only, true);
  assert.equal(summary.local_only, true);
  assert.equal(summary.stdout_only, true);
  assert.equal(summary.packaged_app, false);
  assert.equal(summary.source_mode, 'local_non_production_desktop_contract_smoke');
});

test('rendered summary includes the required non-production banner and validation status', () => {
  const text = renderDesktopContractSmokeSummaryText(sampleSummary());

  assert.match(text, /PAWKET ADMIN DESKTOP CONTRACT SMOKE — NON-PRODUCTION/);
  assert.match(text, /Contract validation: valid/);
});

test('rendered summary includes panel disabled action packaging blocker attention and gate counts', () => {
  const summary = sampleSummary();
  const text = renderDesktopContractSmokeSummaryText(summary);

  assert.match(text, new RegExp(`Panels: ${summary.panel_count}`));
  assert.match(text, new RegExp(`Disabled actions: ${summary.disabled_action_count}`));
  assert.match(text, new RegExp(`Packaging blockers: ${summary.packaging_blocker_count}`));
  assert.match(text, new RegExp(`Attention items: ${summary.attention_item_count}`));
  assert.match(text, new RegExp(`Disabled production gates: ${summary.disabled_production_gate_count}`));
});

test('rendered summary includes sample preview binding and disabled official states', () => {
  const text = renderDesktopContractSmokeSummaryText(sampleSummary());

  assert.match(text, /Sample preview binding: available_demo_only/);
  assert.match(text, /Official balances: disabled/);
  assert.match(text, /Official reports: disabled/);
  assert.match(text, /Final exports: disabled/);
});

test('rendered summary does not include raw document content', () => {
  const text = renderDesktopContractSmokeSummaryText(sampleSummary());

  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
  assert.throws(
    () => renderDesktopContractSmokeSummaryText({
      ...sampleSummary(),
      raw_document_content: 'PRIVATE DOCUMENT BODY',
    }),
    /raw document content/i
  );
});

test('validation rejects production enabled state', () => {
  const validation = validateDesktopContractSmokeSummary({ ...sampleSummary(), production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('validation rejects read only false state', () => {
  const validation = validateDesktopContractSmokeSummary({ ...sampleSummary(), read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('validation rejects local only false state', () => {
  const validation = validateDesktopContractSmokeSummary({ ...sampleSummary(), local_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /local_only/i);
});

test('validation rejects stdout only false state', () => {
  const validation = validateDesktopContractSmokeSummary({ ...sampleSummary(), stdout_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /stdout_only/i);
});

test('validation rejects packaged app and enabled action states', () => {
  const packagedValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), packaged_app: true });
  const mutationValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), mutation_actions_enabled: true });
  const exportValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), export_actions_enabled: true });

  assert.equal(packagedValidation.ok, false);
  assert.match(packagedValidation.errors.join(' '), /packaged_app/i);
  assert.equal(mutationValidation.ok, false);
  assert.match(mutationValidation.errors.join(' '), /mutation_actions_enabled/i);
  assert.equal(exportValidation.ok, false);
  assert.match(exportValidation.errors.join(' '), /export_actions_enabled/i);
});

test('validation rejects connector networking document upload and public route states', () => {
  const connectorValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), connector_networking_enabled: true });
  const uploadValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), document_upload_enabled: true });
  const publicRouteValidation = validateDesktopContractSmokeSummary({ ...sampleSummary(), public_route_enabled: true });

  assert.equal(connectorValidation.ok, false);
  assert.match(connectorValidation.errors.join(' '), /connector_networking_enabled/i);
  assert.equal(uploadValidation.ok, false);
  assert.match(uploadValidation.errors.join(' '), /document_upload_enabled/i);
  assert.equal(publicRouteValidation.ok, false);
  assert.match(publicRouteValidation.errors.join(' '), /public_route_enabled/i);
});

test('validation rejects official balance report and final export enabled states', () => {
  const validation = validateDesktopContractSmokeSummary({
    ...sampleSummary(),
    official_balance_status: 'enabled',
    official_report_status: 'enabled',
    final_export_status: 'enabled',
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /must remain disabled/i);
});

test('malformed local records produce a safe nonzero result', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'events', 'staged-source-events.ndjson'), '{"ok": true}\n{bad json}\n');
  let stdout = '';
  let stderr = '';
  const result = runDesktopContractSmoke(['--vault', vaultPath], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /line 2 is not valid JSON/i);
});

test('runDesktopContractSmoke writes summary to stdout only', () => {
  let stdout = '';
  let stderr = '';
  const result = runDesktopContractSmoke([], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(stderr, '');
  assert.equal(result.stderr_text, '');
  assert.match(stdout, /PAWKET ADMIN DESKTOP CONTRACT SMOKE — NON-PRODUCTION/);
  assert.equal(verifyDesktopContractSmokeStdoutOnly(result).ok, true);
});

test('public path usage is rejected', () => {
  const vaultPath = path.join(os.tmpdir(), 'public', 'pawket-admin-desktop-contract-smoke');

  assert.throws(
    () => verifyNoDesktopContractSmokePublicFiles(vaultPath),
    /must not be placed under public/i
  );
});

test('export artifacts are rejected', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'reports', 'official-report.pdf'), 'not a real export');

  const verification = verifyNoDesktopContractSmokeExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('read-only verifier confirms no mutation or write targets are created', () => {
  const vaultPath = sampleVaultPath();
  buildDesktopContractFromVault(vaultPath);
  const verification = verifyDesktopContractSmokeReadOnly(vaultPath);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
});

test('no official reports balances final exports or public files are created', () => {
  const vaultPath = sampleVaultPath();

  assert.equal(verifyNoDesktopContractSmokeExports(vaultPath).ok, true);
  assert.equal(verifyNoDesktopContractSmokePublicFiles(vaultPath).ok, true);
});

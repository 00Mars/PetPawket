import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildDesktopContractInspectionInput,
  buildDesktopContractInspectionReport,
  buildDesktopContractInspectionSnapshot,
  compareDesktopContractSnapshotToBaseline,
  getDesktopContractInspectionPolicy,
  getExpectedDesktopContractGuardrailBaseline,
  renderDesktopContractInspectionReportText,
  resolveDesktopContractInspectionVaultPath,
  runDesktopContractInspection,
  validateDesktopContractInspectionReport,
  validateDesktopContractInspectionSnapshot,
  verifyDesktopContractInspectionReadOnly,
  verifyDesktopContractInspectionStdoutOnly,
  verifyNoDesktopContractInspectionExports,
  verifyNoDesktopContractInspectionPublicFiles,
} from '../utils/pawketAdminDesktopContractInspection.js';

function tempDir(prefix = 'pawket-admin-desktop-contract-inspection-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(filePath, content = '') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sampleVaultPath() {
  return getDesktopContractInspectionPolicy().default_sample_vault_path;
}

function sampleInput() {
  return buildDesktopContractInspectionInput(sampleVaultPath());
}

function sampleSnapshot() {
  return buildDesktopContractInspectionSnapshot(sampleInput());
}

function sampleComparison() {
  return compareDesktopContractSnapshotToBaseline(
    sampleSnapshot(),
    getExpectedDesktopContractGuardrailBaseline()
  );
}

function sampleReport() {
  return buildDesktopContractInspectionReport(sampleComparison());
}

test('desktop contract inspection policy loads with production disabled', () => {
  const policy = getDesktopContractInspectionPolicy();

  assert.equal(policy.production_enabled, false);
  assert.equal(policy.read_only, true);
  assert.equal(policy.local_only, true);
  assert.equal(policy.stdout_only, true);
  assert.equal(policy.in_memory_only, true);
  assert.equal(policy.packaged_app, false);
  assert.equal(policy.runtime_snapshot_persistence_enabled, false);
  assert.ok(policy.default_sample_vault_path.endsWith(path.join('data', 'finance', 'security', 'sample-vault')));
});

test('expected guardrail baseline includes all required disabled states', () => {
  const baseline = getExpectedDesktopContractGuardrailBaseline();

  assert.equal(baseline.expected_fields.production_enabled, false);
  assert.equal(baseline.expected_fields.read_only, true);
  assert.equal(baseline.expected_fields.local_only, true);
  assert.equal(baseline.expected_fields.stdout_only, true);
  assert.equal(baseline.expected_fields.in_memory_only, true);
  assert.equal(baseline.expected_fields.packaged_app, false);
  assert.equal(baseline.expected_fields.official_balance_status, 'disabled');
  assert.equal(baseline.expected_fields.official_report_status, 'disabled');
  assert.equal(baseline.expected_fields.final_export_status, 'disabled');
  assert.equal(baseline.expected_fields.runtime_snapshot_persistence_enabled, false);
  assert.ok(baseline.required_disabled_production_gates.includes('final_exports'));
  assert.ok(baseline.baseline_hash);
});

test('vault path resolves from default sample vault', () => {
  const policy = getDesktopContractInspectionPolicy();
  const resolved = resolveDesktopContractInspectionVaultPath([], {}, policy);

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'default_sample_vault');
  assert.equal(resolved.vault_path, path.resolve(policy.default_sample_vault_path));
});

test('vault path resolves from argv', () => {
  const resolved = resolveDesktopContractInspectionVaultPath(['--vault', sampleVaultPath()], {});

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'argv');
  assert.equal(resolved.vault_path, path.resolve(sampleVaultPath()));
});

test('vault path resolves from equals argv', () => {
  const resolved = resolveDesktopContractInspectionVaultPath([`--vault=${sampleVaultPath()}`], {});

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'argv');
  assert.equal(resolved.vault_path, path.resolve(sampleVaultPath()));
});

test('vault path resolves from environment', () => {
  const resolved = resolveDesktopContractInspectionVaultPath([], {
    PAWKET_ADMIN_VAULT_PATH: sampleVaultPath(),
  });

  assert.equal(resolved.ok, true);
  assert.equal(resolved.source, 'env');
  assert.equal(resolved.vault_path, path.resolve(sampleVaultPath()));
});

test('help mode is safe and does not read or write the vault', () => {
  const result = runDesktopContractInspection(['--help'], { PAWKET_ADMIN_VAULT_PATH: '/does/not/exist' }, {
    stdout: { write() {} },
    stderr: { write() {} },
  });

  assert.equal(result.ok, true);
  assert.equal(result.help, true);
  assert.equal(result.exit_code, 0);
  assert.match(result.stdout_text, /Usage:/);
  assert.deepEqual(result.files_written, []);
});

test('inspection input uses existing desktop contract smoke runner path conventions', () => {
  const input = sampleInput();

  assert.equal(input.inspection_input_type, 'desktop_contract_inspection_input');
  assert.equal(input.smoke_runner_policy_version, 'pawket-admin-desktop-contract-smoke-runner-v0');
  assert.equal(input.app_shell_contract.app_shell_contract_type, 'desktop_app_shell_contract');
  assert.equal(input.smoke_summary.smoke_summary_type, 'desktop_contract_smoke_summary');
  assert.ok(input.inspection_input_hash);
});

test('inspection snapshot is stdout-only in-memory-only local-only read-only non-production', () => {
  const snapshot = sampleSnapshot();
  const validation = validateDesktopContractInspectionSnapshot(snapshot);

  assert.equal(validation.ok, true);
  assert.equal(snapshot.production_enabled, false);
  assert.equal(snapshot.read_only, true);
  assert.equal(snapshot.local_only, true);
  assert.equal(snapshot.stdout_only, true);
  assert.equal(snapshot.in_memory_only, true);
  assert.equal(snapshot.source_mode, 'local_non_production_desktop_contract_inspection');
});

test('inspection snapshot rejects production enabled state', () => {
  const validation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), production_enabled: true });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /production_enabled/i);
});

test('inspection snapshot rejects read only false state', () => {
  const validation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), read_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /read_only/i);
});

test('inspection snapshot rejects local only false state', () => {
  const validation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), local_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /local_only/i);
});

test('inspection snapshot rejects stdout only false state', () => {
  const validation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), stdout_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /stdout_only/i);
});

test('inspection snapshot rejects in memory only false state', () => {
  const validation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), in_memory_only: false });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(' '), /in_memory_only/i);
});

test('inspection snapshot rejects packaged app and enabled actions', () => {
  const packagedValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), packaged_app: true });
  const mutationValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), mutation_actions_enabled: true });
  const exportValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), export_actions_enabled: true });

  assert.equal(packagedValidation.ok, false);
  assert.match(packagedValidation.errors.join(' '), /packaged_app/i);
  assert.equal(mutationValidation.ok, false);
  assert.match(mutationValidation.errors.join(' '), /mutation_actions_enabled/i);
  assert.equal(exportValidation.ok, false);
  assert.match(exportValidation.errors.join(' '), /export_actions_enabled/i);
});

test('inspection snapshot rejects connector upload public route and runtime persistence states', () => {
  const connectorValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), connector_networking_enabled: true });
  const uploadValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), document_upload_enabled: true });
  const publicRouteValidation = validateDesktopContractInspectionSnapshot({ ...sampleSnapshot(), public_route_enabled: true });
  const persistenceValidation = validateDesktopContractInspectionSnapshot({
    ...sampleSnapshot(),
    runtime_snapshot_persistence_enabled: true,
  });

  assert.equal(connectorValidation.ok, false);
  assert.match(connectorValidation.errors.join(' '), /connector_networking_enabled/i);
  assert.equal(uploadValidation.ok, false);
  assert.match(uploadValidation.errors.join(' '), /document_upload_enabled/i);
  assert.equal(publicRouteValidation.ok, false);
  assert.match(publicRouteValidation.errors.join(' '), /public_route_enabled/i);
  assert.equal(persistenceValidation.ok, false);
  assert.match(persistenceValidation.errors.join(' '), /runtime_snapshot_persistence_enabled/i);
});

test('baseline comparison passes for safe sample vault contract', () => {
  const comparison = sampleComparison();

  assert.equal(comparison.baseline_comparison_status, 'passed');
  assert.equal(comparison.failed_guardrail_count, 0);
  assert.equal(comparison.missing_guardrail_count, 0);
  assert.equal(comparison.unexpected_unsafe_state_count, 0);
});

test('baseline comparison fails for missing required disabled production gate', () => {
  const snapshot = sampleSnapshot();
  snapshot.disabled_production_gates = snapshot.disabled_production_gates.filter((gate) => gate !== 'final_exports');
  const comparison = compareDesktopContractSnapshotToBaseline(snapshot, getExpectedDesktopContractGuardrailBaseline());

  assert.equal(comparison.baseline_comparison_status, 'failed');
  assert.ok(comparison.missing_guardrail_count > 0);
  assert.match(JSON.stringify(comparison.failed_guardrails), /final_exports/);
});

test('baseline comparison fails for enabled export action', () => {
  const snapshot = { ...sampleSnapshot(), export_actions_enabled: true };
  const comparison = compareDesktopContractSnapshotToBaseline(snapshot, getExpectedDesktopContractGuardrailBaseline());

  assert.equal(comparison.baseline_comparison_status, 'failed');
  assert.ok(comparison.failed_guardrail_count > 0);
  assert.match(JSON.stringify(comparison.failed_guardrails), /export_actions_enabled/);
});

test('baseline comparison fails for enabled official report balance or final export state', () => {
  const snapshot = {
    ...sampleSnapshot(),
    official_balance_status: 'enabled',
    official_report_status: 'enabled',
    final_export_status: 'enabled',
  };
  const comparison = compareDesktopContractSnapshotToBaseline(snapshot, getExpectedDesktopContractGuardrailBaseline());

  assert.equal(comparison.baseline_comparison_status, 'failed');
  assert.ok(comparison.failed_guardrail_count > 0);
  assert.match(JSON.stringify(comparison.failed_guardrails), /official_balance_status/);
  assert.match(JSON.stringify(comparison.failed_guardrails), /official_report_status/);
  assert.match(JSON.stringify(comparison.failed_guardrails), /final_export_status/);
});

test('inspection report validates as stdout-only local-only read-only non-production', () => {
  const report = sampleReport();
  const validation = validateDesktopContractInspectionReport(report);

  assert.equal(validation.ok, true);
  assert.equal(report.production_enabled, false);
  assert.equal(report.read_only, true);
  assert.equal(report.local_only, true);
  assert.equal(report.stdout_only, true);
  assert.equal(report.in_memory_only, true);
  assert.equal(report.inspection_status, 'passed');
});

test('rendered report includes required banner and comparison counts', () => {
  const report = sampleReport();
  const text = renderDesktopContractInspectionReportText(report);

  assert.match(text, /PAWKET ADMIN DESKTOP CONTRACT INSPECTION — NON-PRODUCTION/);
  assert.match(text, new RegExp(`Guardrails matched: ${report.matched_guardrail_count}`));
  assert.match(text, new RegExp(`Guardrails failed: ${report.failed_guardrail_count}`));
  assert.match(text, new RegExp(`Guardrails missing: ${report.missing_guardrail_count}`));
});

test('rendered report includes panel disabled action packaging blocker and gate counts', () => {
  const report = sampleReport();
  const text = renderDesktopContractInspectionReportText(report);

  assert.match(text, new RegExp(`Panels: ${report.panel_count}`));
  assert.match(text, new RegExp(`Disabled actions: ${report.disabled_action_count}`));
  assert.match(text, new RegExp(`Packaging blockers: ${report.packaging_blocker_count}`));
  assert.match(text, new RegExp(`Disabled production gates: ${report.disabled_production_gate_count}`));
});

test('rendered report includes sample preview binding and disabled official states', () => {
  const text = renderDesktopContractInspectionReportText(sampleReport());

  assert.match(text, /Sample preview binding: available_demo_only/);
  assert.match(text, /Official balances: disabled/);
  assert.match(text, /Official reports: disabled/);
  assert.match(text, /Final exports: disabled/);
});

test('rendered report does not include raw document content', () => {
  const text = renderDesktopContractInspectionReportText(sampleReport());

  assert.doesNotMatch(text, /PRIVATE DOCUMENT BODY/);
  assert.throws(
    () => renderDesktopContractInspectionReportText({
      ...sampleReport(),
      raw_document_content: 'PRIVATE DOCUMENT BODY',
    }),
    /raw document content/i
  );
});

test('runDesktopContractInspection writes report to stdout only', () => {
  let stdout = '';
  let stderr = '';
  const result = runDesktopContractInspection([], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, true);
  assert.equal(result.exit_code, 0);
  assert.equal(stderr, '');
  assert.equal(result.stderr_text, '');
  assert.match(stdout, /PAWKET ADMIN DESKTOP CONTRACT INSPECTION — NON-PRODUCTION/);
  assert.equal(verifyDesktopContractInspectionStdoutOnly(result).ok, true);
});

test('malformed local records produce a safe nonzero result', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'events', 'staged-source-events.ndjson'), '{"ok": true}\n{bad json}\n');
  let stdout = '';
  let stderr = '';
  const result = runDesktopContractInspection(['--vault', vaultPath], {}, {
    stdout: { write(chunk) { stdout += chunk; } },
    stderr: { write(chunk) { stderr += chunk; } },
  });

  assert.equal(result.ok, false);
  assert.equal(result.exit_code, 1);
  assert.equal(stdout, '');
  assert.match(stderr, /line 2 is not valid JSON/i);
});

test('public path usage is rejected', () => {
  const vaultPath = path.join(os.tmpdir(), 'public', 'pawket-admin-desktop-contract-inspection');

  assert.throws(
    () => verifyNoDesktopContractInspectionPublicFiles(vaultPath),
    /must not be placed under public/i
  );
});

test('export artifacts are rejected', () => {
  const vaultPath = tempDir();
  writeFile(path.join(vaultPath, 'reports', 'official-report.pdf'), 'not a real export');

  const verification = verifyNoDesktopContractInspectionExports(vaultPath);
  assert.equal(verification.ok, false);
  assert.equal(verification.present_paths.length, 1);
});

test('read-only verifier confirms no mutation write targets or snapshots are created', () => {
  const vaultPath = sampleVaultPath();
  runDesktopContractInspection([], {}, {
    stdout: { write() {} },
    stderr: { write() {} },
  });
  const verification = verifyDesktopContractInspectionReadOnly(vaultPath);

  assert.equal(verification.ok, true);
  assert.equal(verification.present_paths.length, 0);
  assert.equal(fs.existsSync(path.join(vaultPath, 'snapshots')), false);
});

test('no official reports balances final exports or public files are created', () => {
  const vaultPath = sampleVaultPath();

  assert.equal(verifyNoDesktopContractInspectionExports(vaultPath).ok, true);
  assert.equal(verifyNoDesktopContractInspectionPublicFiles(vaultPath).ok, true);
});

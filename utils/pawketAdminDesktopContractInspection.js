import fs from 'node:fs';
import path from 'node:path';
import {
  buildDesktopContractFromVault,
  buildDesktopContractSmokeSummary,
  getDesktopContractSmokeRunnerPolicy,
  validateDesktopContractSmokeSummary,
  verifyDesktopContractSmokeReadOnly,
  verifyNoDesktopContractSmokeExports,
  verifyNoDesktopContractSmokePublicFiles,
} from './pawketAdminDesktopContractSmokeRunner.js';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_CONTRACT_INSPECTION_VERSION = 'pawket-admin-desktop-contract-inspection-v0';

const REQUIRED_INSPECTION_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  stdout_only: true,
  in_memory_only: true,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_contract_inspection',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
  connector_networking_enabled: false,
  document_upload_enabled: false,
  public_route_enabled: false,
  runtime_snapshot_persistence_enabled: false,
});

const REQUIRED_DISABLED_PRODUCTION_GATES = Object.freeze([
  'live_ledger_commit',
  'production_live_ledger_write',
  'official_balances',
  'official_reports',
  'final_exports',
  'mutation_actions',
  'export_actions',
  'document_upload',
  'connector_networking',
  'desktop_packaging',
]);

const RAW_CONTENT_FIELDS = new Set([
  'raw_content',
  'rawDocumentContent',
  'file_contents',
  'file_content',
  'content_buffer',
  'document_blob',
  'blob_content',
  'raw_blob',
  'document_body',
  'raw_document_content',
  'decrypted_document_content',
]);

const FORBIDDEN_EXPORT_EXTENSIONS = new Set(['.pdf', '.csv', '.xlsx', '.zip']);

const FORBIDDEN_EXPORT_PATH_PATTERNS = Object.freeze([
  'official-report',
  'official-reports',
  'official-balance',
  'official-balances',
  'final-report',
  'final-export',
  'balance-report',
  'irs-export',
  'accountant-export',
  'investor-export',
  'foundation-export',
  'public-impact-export',
  'public-impact-claim',
  'production-report',
  'production-ledger',
  'runtime-snapshot',
  'desktop-contract-inspection-snapshot',
]);

const INSPECTION_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-contract-inspection.ndjson',
  'manifests/desktop-contract-inspection-snapshot.ndjson',
  'manifests/desktop-contract-inspection-report.ndjson',
  'reports/desktop-contract-inspection.txt',
  'reports/desktop-contract-inspection.json',
  'exports/desktop-contract-inspection.txt',
  'snapshots/desktop-contract-inspection.json',
  'ui/desktop-contract-inspection.json',
  'ui/desktop-contract-inspection.txt',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [value];
}

function unique(values) {
  return [...new Set(asArray(values).filter(Boolean))];
}

function baseInspectionFields() {
  return { ...REQUIRED_INSPECTION_FIELDS };
}

function writeIo(target, text) {
  if (!target) {
    return;
  }
  if (typeof target === 'function') {
    target(text);
    return;
  }
  if (typeof target.write === 'function') {
    target.write(text);
  }
}

function hashPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

function pathSegments(inputPath) {
  return path.resolve(inputPath).split(path.sep).filter(Boolean).map((segment) => segment.toLowerCase());
}

function pathHasPublicSegment(inputPath) {
  return pathSegments(inputPath).includes('public');
}

function listFilesRecursive(rootPath) {
  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const stat = fs.statSync(rootPath);
  if (stat.isFile()) {
    return [rootPath];
  }
  if (!stat.isDirectory()) {
    return [];
  }

  return fs.readdirSync(rootPath).flatMap((entry) => listFilesRecursive(path.join(rootPath, entry)));
}

function hasRawContent(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasRawContent(item));
  }
  if (!isPlainObject(value)) {
    return false;
  }
  return Object.entries(value).some(([key, nestedValue]) => (
    RAW_CONTENT_FIELDS.has(key) || hasRawContent(nestedValue)
  ));
}

function isForbiddenExportPath(filePath, rootPath, policy) {
  const relativePath = rootPath
    ? path.relative(rootPath, filePath).replaceAll(path.sep, '/').toLowerCase()
    : path.resolve(filePath).replaceAll(path.sep, '/').toLowerCase();
  const extension = path.extname(filePath).toLowerCase();
  return policy.forbidden_export_file_extensions.includes(extension) ||
    policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
}

function parseVaultPathArg(argv = []) {
  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--vault' || arg === '--vault-path') {
      return args[index + 1] || '';
    }
    if (String(arg).startsWith('--vault=')) {
      return String(arg).slice('--vault='.length);
    }
    if (String(arg).startsWith('--vault-path=')) {
      return String(arg).slice('--vault-path='.length);
    }
  }
  return '';
}

function usageText(policy = getDesktopContractInspectionPolicy()) {
  return [
    'Pawket Admin desktop contract inspection',
    '',
    'Usage:',
    '  npm run pawket-admin:desktop-contract:inspect',
    '  node scripts/pawketAdminDesktopContractInspection.js --vault <vault-path>',
    '  PAWKET_ADMIN_VAULT_PATH=<vault-path> node scripts/pawketAdminDesktopContractInspection.js',
    '',
    'Options:',
    '  --vault <path>      Local Pawket Admin vault path to read',
    '  --vault=<path>      Local Pawket Admin vault path to read',
    '  --help, -h          Show this help without reading or writing the vault',
    '',
    'Output:',
    `  ${policy.required_inspection_banner}`,
    '  stdout only; no files, snapshots, reports, balances, exports, routes, or ledger writes are created.',
  ].join('\n');
}

function assertVaultPath(inputPath, policy = getDesktopContractInspectionPolicy()) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Pawket Admin desktop contract inspection vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  if (pathHasPublicSegment(resolved)) {
    throw new Error('Pawket Admin desktop contract inspection files must not be placed under public/.');
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    throw new Error('Pawket Admin desktop contract inspection path must not point at export, report, balance, snapshot, or production artifact locations.');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Pawket Admin desktop contract inspection vault path does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Pawket Admin desktop contract inspection vault path must be a directory: ${resolved}`);
  }
  return resolved;
}

function smokeSummarySource(input = {}, policy = getDesktopContractInspectionPolicy()) {
  if (input.smoke_summary_type === 'desktop_contract_smoke_summary') {
    return {
      smokeSummary: input,
      appShellContract: null,
    };
  }
  if (input.app_shell_contract_type === 'desktop_app_shell_contract') {
    return {
      smokeSummary: buildDesktopContractSmokeSummary(input, policy.smoke_runner_policy),
      appShellContract: input,
    };
  }
  if (input.smoke_summary?.smoke_summary_type === 'desktop_contract_smoke_summary') {
    return {
      smokeSummary: input.smoke_summary,
      appShellContract: input.app_shell_contract || input.contract || null,
    };
  }
  if (input.app_shell_contract?.app_shell_contract_type === 'desktop_app_shell_contract') {
    return {
      smokeSummary: input.smoke_summary ||
        buildDesktopContractSmokeSummary(input.app_shell_contract, policy.smoke_runner_policy),
      appShellContract: input.app_shell_contract,
    };
  }
  throw new Error('Desktop contract inspection requires a smoke summary or app-shell contract.');
}

function fieldGuardrailRecords(snapshot, baseline) {
  return Object.entries(baseline.expected_fields).map(([field, expectedValue]) => {
    const actualValue = snapshot[field];
    if (actualValue === undefined) {
      return {
        guardrail_id: `field:${field}`,
        status: 'missing',
        expected: expectedValue,
        actual: null,
      };
    }
    return {
      guardrail_id: `field:${field}`,
      status: actualValue === expectedValue ? 'matched' : 'failed',
      expected: expectedValue,
      actual: actualValue,
    };
  });
}

function minimumGuardrailRecords(snapshot, baseline) {
  return [
    ['minimum_panel_count', 'panel_count'],
    ['minimum_disabled_action_count', 'disabled_action_count'],
    ['minimum_packaging_blocker_count', 'packaging_blocker_count'],
  ].map(([baselineKey, snapshotKey]) => {
    const expectedValue = baseline[baselineKey];
    const actualValue = snapshot[snapshotKey];
    return {
      guardrail_id: baselineKey,
      status: Number.isFinite(actualValue) && actualValue >= expectedValue ? 'matched' : 'failed',
      expected: expectedValue,
      actual: Number.isFinite(actualValue) ? actualValue : null,
    };
  });
}

function disabledGateGuardrailRecords(snapshot, baseline) {
  const actualGates = new Set(asArray(snapshot.disabled_production_gates));
  return baseline.required_disabled_production_gates.map((gate) => ({
    guardrail_id: `disabled_gate:${gate}`,
    status: actualGates.has(gate) ? 'matched' : 'missing',
    expected: gate,
    actual: actualGates.has(gate) ? gate : null,
  }));
}

function countGuardrails(guardrails, status) {
  return guardrails.filter((guardrail) => guardrail.status === status).length;
}

function unsafeGuardrails(guardrails) {
  return guardrails.filter((guardrail) => guardrail.status === 'failed' || guardrail.status === 'missing');
}

export function getDesktopContractInspectionPolicy() {
  const smokePolicy = getDesktopContractSmokeRunnerPolicy();

  return {
    policy_version: DESKTOP_CONTRACT_INSPECTION_VERSION,
    ...baseInspectionFields(),
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    default_sample_vault_path: smokePolicy.default_sample_vault_path,
    required_inspection_fields: { ...REQUIRED_INSPECTION_FIELDS },
    required_inspection_banner: 'PAWKET ADMIN DESKTOP CONTRACT INSPECTION — NON-PRODUCTION',
    required_smoke_banner: smokePolicy.required_smoke_banner,
    smoke_runner_policy: smokePolicy,
    minimum_panel_count: 13,
    minimum_disabled_action_count: 18,
    minimum_packaging_blocker_count: 10,
    required_disabled_production_gates: [...REQUIRED_DISABLED_PRODUCTION_GATES],
    required_sample_preview_binding_status: 'available_demo_only',
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_contract_inspection_write_targets: [...INSPECTION_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: Array.from(new Set([
      ...smokePolicy.blocked_production_actions,
      ...REQUIRED_DISABLED_PRODUCTION_GATES,
      'runtime_snapshot_persistence',
      'desktop_contract_inspection_file_write',
    ])),
  };
}

export function getExpectedDesktopContractGuardrailBaseline(policy = getDesktopContractInspectionPolicy()) {
  const baseline = {
    ...baseInspectionFields(),
    baseline_type: 'desktop_contract_guardrail_baseline',
    policy_version: policy.policy_version,
    expected_fields: { ...policy.required_inspection_fields },
    minimum_panel_count: policy.minimum_panel_count,
    minimum_disabled_action_count: policy.minimum_disabled_action_count,
    minimum_packaging_blocker_count: policy.minimum_packaging_blocker_count,
    required_disabled_production_gates: [...policy.required_disabled_production_gates],
    required_nonproduction_banner_present: true,
    required_smoke_nonproduction_banner_present: true,
    required_sample_preview_binding_status_when_sample_vault_used: policy.required_sample_preview_binding_status,
  };

  return {
    ...baseline,
    baseline_hash: hashPayload(baseline),
  };
}

export function resolveDesktopContractInspectionVaultPath(argv = [], env = {}, policy = getDesktopContractInspectionPolicy()) {
  const args = [...argv];
  if (args.includes('--help') || args.includes('-h')) {
    return {
      ok: true,
      help: true,
      exit_code: 0,
      usage: usageText(policy),
    };
  }

  const argvVaultPath = parseVaultPathArg(args);
  const vaultPath = argvVaultPath ||
    env.PAWKET_ADMIN_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_VAULT_PATH ||
    policy.default_sample_vault_path;

  try {
    return {
      ok: true,
      vault_path: assertVaultPath(vaultPath, policy),
      source: argvVaultPath ? 'argv' : (env.PAWKET_ADMIN_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_VAULT_PATH
        ? 'env'
        : 'default_sample_vault'),
    };
  } catch (error) {
    return {
      ok: false,
      exit_code: 2,
      error: error.message,
      usage: usageText(policy),
    };
  }
}

export function buildDesktopContractInspectionInput(vaultPathInput, policy = getDesktopContractInspectionPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const readOnly = verifyDesktopContractInspectionReadOnly(vaultPath, policy);
  if (!readOnly.ok) {
    throw new Error(`Desktop contract inspection read-only guard failed: ${readOnly.present_paths.join(', ')}`);
  }
  const noPublic = verifyNoDesktopContractInspectionPublicFiles(vaultPath, policy);
  if (!noPublic.ok) {
    throw new Error(`Desktop contract inspection public path guard failed: ${noPublic.present_paths.join(', ') || noPublic.errors.join(' ')}`);
  }
  const noExports = verifyNoDesktopContractInspectionExports(vaultPath, policy);
  if (!noExports.ok) {
    throw new Error(`Desktop contract inspection export guard failed: ${noExports.present_paths.join(', ') || noExports.errors.join(' ')}`);
  }

  const appShellContract = buildDesktopContractFromVault(vaultPath, policy.smoke_runner_policy);
  const smokeSummary = buildDesktopContractSmokeSummary(appShellContract, policy.smoke_runner_policy);
  const smokeValidation = validateDesktopContractSmokeSummary(smokeSummary, policy.smoke_runner_policy);
  if (!smokeValidation.ok) {
    throw new Error(`Desktop contract smoke summary rejected: ${smokeValidation.errors.join(' ')}`);
  }

  const inspectionInput = {
    ...baseInspectionFields(),
    inspection_input_type: 'desktop_contract_inspection_input',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    vault_path: vaultPath,
    smoke_runner_policy_version: policy.smoke_runner_policy.policy_version,
    app_shell_contract: appShellContract,
    smoke_summary: smokeSummary,
  };

  return {
    ...inspectionInput,
    inspection_input_hash: hashPayload(inspectionInput),
  };
}

export function buildDesktopContractInspectionSnapshot(smokeSummaryOrContract, policy = getDesktopContractInspectionPolicy()) {
  const { smokeSummary, appShellContract } = smokeSummarySource(smokeSummaryOrContract, policy);
  const smokeValidation = validateDesktopContractSmokeSummary(smokeSummary, policy.smoke_runner_policy);
  const disabledProductionGates = unique(
    appShellContract?.status_surface?.disabled_production_gates || smokeSummary.disabled_production_gates || []
  );
  const sampleVaultUsed = smokeSummary.sample_preview_binding_status === policy.required_sample_preview_binding_status;

  const snapshot = {
    ...baseInspectionFields(),
    inspection_snapshot_type: 'desktop_contract_inspection_snapshot',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    source_smoke_summary_hash: smokeSummary.smoke_summary_hash || '',
    app_shell_contract_hash: smokeSummary.app_shell_contract_hash || appShellContract?.app_shell_contract_hash || '',
    contract_validation_status: smokeSummary.contract_validation_status || 'invalid',
    contract_validation_errors: asArray(smokeSummary.contract_validation_errors),
    smoke_summary_validation_status: smokeValidation.ok ? 'valid' : 'invalid',
    smoke_summary_validation_errors: smokeValidation.errors,
    panel_count: smokeSummary.panel_count,
    disabled_action_count: smokeSummary.disabled_action_count,
    packaging_blocker_count: smokeSummary.packaging_blocker_count,
    attention_item_count: smokeSummary.attention_item_count,
    disabled_production_gate_count: smokeSummary.disabled_production_gate_count,
    disabled_production_gates: disabledProductionGates,
    sample_vault_used: sampleVaultUsed,
    sample_preview_binding_status: smokeSummary.sample_preview_binding_status,
    nonproduction_banner_present: true,
    smoke_nonproduction_banner_present: smokeValidation.ok,
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
    persisted_snapshot_path: '',
  };

  return {
    ...snapshot,
    inspection_snapshot_hash: hashPayload(snapshot),
  };
}

export function compareDesktopContractSnapshotToBaseline(
  snapshot,
  baseline = getExpectedDesktopContractGuardrailBaseline(),
  policy = getDesktopContractInspectionPolicy()
) {
  const validation = validateDesktopContractInspectionSnapshot(snapshot, policy);
  const guardrails = [
    ...fieldGuardrailRecords(snapshot || {}, baseline),
    ...minimumGuardrailRecords(snapshot || {}, baseline),
    ...disabledGateGuardrailRecords(snapshot || {}, baseline),
    {
      guardrail_id: 'nonproduction_banner_present',
      status: snapshot?.nonproduction_banner_present === baseline.required_nonproduction_banner_present ? 'matched' : 'failed',
      expected: baseline.required_nonproduction_banner_present,
      actual: snapshot?.nonproduction_banner_present ?? null,
    },
    {
      guardrail_id: 'smoke_nonproduction_banner_present',
      status: snapshot?.smoke_nonproduction_banner_present === baseline.required_smoke_nonproduction_banner_present ? 'matched' : 'failed',
      expected: baseline.required_smoke_nonproduction_banner_present,
      actual: snapshot?.smoke_nonproduction_banner_present ?? null,
    },
  ];

  if (snapshot?.sample_vault_used) {
    guardrails.push({
      guardrail_id: 'sample_preview_binding_status',
      status: snapshot.sample_preview_binding_status === baseline.required_sample_preview_binding_status_when_sample_vault_used
        ? 'matched'
        : 'failed',
      expected: baseline.required_sample_preview_binding_status_when_sample_vault_used,
      actual: snapshot.sample_preview_binding_status || null,
    });
  }

  for (const error of validation.errors) {
    guardrails.push({
      guardrail_id: `validation:${error}`,
      status: 'failed',
      expected: 'valid inspection snapshot',
      actual: error,
    });
  }

  const failedGuardrails = unsafeGuardrails(guardrails);
  const comparison = {
    ...baseInspectionFields(),
    comparison_type: 'desktop_contract_guardrail_comparison',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    baseline_hash: baseline.baseline_hash || hashPayload(baseline),
    inspection_snapshot_hash: snapshot?.inspection_snapshot_hash || '',
    baseline_comparison_status: failedGuardrails.length === 0 ? 'passed' : 'failed',
    matched_guardrail_count: countGuardrails(guardrails, 'matched'),
    failed_guardrail_count: countGuardrails(guardrails, 'failed'),
    missing_guardrail_count: countGuardrails(guardrails, 'missing'),
    unexpected_unsafe_state_count: failedGuardrails.length,
    guardrails,
    failed_guardrails: failedGuardrails,
    panel_count: snapshot?.panel_count || 0,
    disabled_action_count: snapshot?.disabled_action_count || 0,
    packaging_blocker_count: snapshot?.packaging_blocker_count || 0,
    attention_item_count: snapshot?.attention_item_count || 0,
    disabled_production_gate_count: snapshot?.disabled_production_gate_count || 0,
    sample_preview_binding_status: snapshot?.sample_preview_binding_status || 'not_available',
  };

  return {
    ...comparison,
    comparison_hash: hashPayload(comparison),
  };
}

export function buildDesktopContractInspectionReport(comparison, policy = getDesktopContractInspectionPolicy()) {
  const comparisonStatus = comparison?.baseline_comparison_status || 'failed';
  const report = {
    ...baseInspectionFields(),
    inspection_report_type: 'desktop_contract_inspection_report',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    inspection_status: comparisonStatus === 'passed' ? 'passed' : 'failed',
    baseline_comparison_status: comparisonStatus,
    matched_guardrail_count: comparison?.matched_guardrail_count || 0,
    failed_guardrail_count: comparison?.failed_guardrail_count || 0,
    missing_guardrail_count: comparison?.missing_guardrail_count || 0,
    unexpected_unsafe_state_count: comparison?.unexpected_unsafe_state_count || 0,
    panel_count: comparison?.panel_count || 0,
    disabled_action_count: comparison?.disabled_action_count || 0,
    packaging_blocker_count: comparison?.packaging_blocker_count || 0,
    attention_item_count: comparison?.attention_item_count || 0,
    disabled_production_gate_count: comparison?.disabled_production_gate_count || 0,
    sample_preview_binding_status: comparison?.sample_preview_binding_status || 'not_available',
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
    comparison_hash: comparison?.comparison_hash || '',
  };

  return {
    ...report,
    inspection_report_hash: hashPayload(report),
  };
}

export function renderDesktopContractInspectionReportText(report, policy = getDesktopContractInspectionPolicy()) {
  const validation = validateDesktopContractInspectionReport(report, policy);
  if (!validation.ok) {
    throw new Error(`Desktop contract inspection report rejected: ${validation.errors.join(' ')}`);
  }
  if (hasRawContent(report)) {
    throw new Error('Desktop contract inspection report must not include raw document content.');
  }

  return [
    policy.required_inspection_banner,
    `Inspection status: ${report.inspection_status}`,
    `Baseline comparison: ${report.baseline_comparison_status}`,
    `Guardrails matched: ${report.matched_guardrail_count}`,
    `Guardrails failed: ${report.failed_guardrail_count}`,
    `Guardrails missing: ${report.missing_guardrail_count}`,
    `Unexpected unsafe states: ${report.unexpected_unsafe_state_count}`,
    `Panels: ${report.panel_count}`,
    `Disabled actions: ${report.disabled_action_count}`,
    `Packaging blockers: ${report.packaging_blocker_count}`,
    `Attention items: ${report.attention_item_count}`,
    `Disabled production gates: ${report.disabled_production_gate_count}`,
    `Sample preview binding: ${report.sample_preview_binding_status}`,
    `Official balances: ${report.official_balance_status}`,
    `Official reports: ${report.official_report_status}`,
    `Final exports: ${report.final_export_status}`,
    `Output: stdout only | In memory only: ${report.in_memory_only}`,
    'No files, snapshots, reports, balances, exports, routes, or ledger writes created.',
  ].join('\n');
}

export function runDesktopContractInspection(argv = [], env = {}, io = {}, policy = getDesktopContractInspectionPolicy()) {
  const resolved = resolveDesktopContractInspectionVaultPath(argv, env, policy);
  if (resolved.help) {
    const stdoutText = `${resolved.usage}\n`;
    writeIo(io.stdout, stdoutText);
    return {
      ...baseInspectionFields(),
      ok: true,
      help: true,
      exit_code: 0,
      stdout_text: stdoutText,
      stderr_text: '',
      files_written: [],
    };
  }
  if (!resolved.ok) {
    const stderrText = `${resolved.error}\n\n${resolved.usage}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...baseInspectionFields(),
      ok: false,
      exit_code: resolved.exit_code || 2,
      error: resolved.error,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }

  try {
    const input = buildDesktopContractInspectionInput(resolved.vault_path, policy);
    const snapshot = buildDesktopContractInspectionSnapshot(input, policy);
    const baseline = getExpectedDesktopContractGuardrailBaseline(policy);
    const comparison = compareDesktopContractSnapshotToBaseline(snapshot, baseline, policy);
    const report = buildDesktopContractInspectionReport(comparison, policy);
    const text = `${renderDesktopContractInspectionReportText(report, policy)}\n`;
    if (report.inspection_status !== 'passed') {
      const stderrText = `Desktop contract inspection failed guardrail comparison: ${comparison.failed_guardrail_count} failed, ${comparison.missing_guardrail_count} missing.\n`;
      writeIo(io.stderr, stderrText);
      return {
        ...baseInspectionFields(),
        ok: false,
        exit_code: 1,
        vault_path: resolved.vault_path,
        vault_path_source: resolved.source,
        stdout_text: '',
        stderr_text: stderrText,
        files_written: [],
        report,
        comparison,
      };
    }

    writeIo(io.stdout, text);
    const result = {
      ...baseInspectionFields(),
      ok: true,
      exit_code: 0,
      vault_path: resolved.vault_path,
      vault_path_source: resolved.source,
      output_target: 'stdout',
      output_file_created: false,
      stdout_text: text,
      stderr_text: '',
      files_written: [],
      app_shell_contract_hash: input.app_shell_contract.app_shell_contract_hash,
      smoke_summary_hash: input.smoke_summary.smoke_summary_hash,
      snapshot,
      comparison,
      report,
    };
    const stdoutOnly = verifyDesktopContractInspectionStdoutOnly(result, policy);
    if (!stdoutOnly.ok) {
      throw new Error(`Desktop contract inspection stdout-only guard failed: ${stdoutOnly.errors.join(' ')}`);
    }
    return result;
  } catch (error) {
    const stderrText = `${error.message}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...baseInspectionFields(),
      ok: false,
      exit_code: 1,
      error: error.message,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }
}

export function validateDesktopContractInspectionSnapshot(snapshot, policy = getDesktopContractInspectionPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(snapshot)) {
    return { ok: false, errors: ['Desktop contract inspection snapshot is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_inspection_fields)) {
    if (snapshot[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  if (snapshot.official_balance_status !== 'disabled' ||
    snapshot.official_report_status !== 'disabled' ||
    snapshot.final_export_status !== 'disabled') {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (snapshot.output_target && snapshot.output_target !== 'stdout') {
    errors.push('Desktop contract inspection snapshot output_target must be stdout.');
  }
  if (snapshot.output_file_created === true) {
    errors.push('Desktop contract inspection snapshot must not create output files.');
  }
  if (asArray(snapshot.files_written).length > 0) {
    errors.push('Desktop contract inspection snapshot must not write files.');
  }
  if (snapshot.persisted_snapshot_path) {
    errors.push('Desktop contract inspection snapshot must not persist runtime snapshots.');
  }
  if (snapshot.contract_validation_status !== 'valid') {
    errors.push('Desktop contract inspection snapshot requires a valid app-shell contract.');
  }
  if (snapshot.smoke_summary_validation_status !== 'valid') {
    errors.push('Desktop contract inspection snapshot requires a valid smoke summary.');
  }
  if (!Number.isFinite(snapshot.panel_count) || snapshot.panel_count <= 0) {
    errors.push('Desktop contract inspection snapshot must include panel_count.');
  }
  if (!Number.isFinite(snapshot.disabled_action_count) || snapshot.disabled_action_count <= 0) {
    errors.push('Desktop contract inspection snapshot must include disabled_action_count.');
  }
  if (!Number.isFinite(snapshot.packaging_blocker_count) || snapshot.packaging_blocker_count <= 0) {
    errors.push('Desktop contract inspection snapshot must include packaging_blocker_count.');
  }
  if (!Number.isFinite(snapshot.attention_item_count)) {
    errors.push('Desktop contract inspection snapshot must include attention_item_count.');
  }
  if (!Number.isFinite(snapshot.disabled_production_gate_count) || snapshot.disabled_production_gate_count <= 0) {
    errors.push('Desktop contract inspection snapshot must include disabled_production_gate_count.');
  }
  if (!snapshot.sample_preview_binding_status) {
    errors.push('Desktop contract inspection snapshot must include sample_preview_binding_status.');
  }
  if (hasRawContent(snapshot)) {
    errors.push('Desktop contract inspection snapshot must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateDesktopContractInspectionReport(report, policy = getDesktopContractInspectionPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(report)) {
    return { ok: false, errors: ['Desktop contract inspection report is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_inspection_fields)) {
    if (report[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  if (report.inspection_report_type !== 'desktop_contract_inspection_report') {
    errors.push('inspection_report_type must be desktop_contract_inspection_report.');
  }
  if (!['passed', 'failed'].includes(report.inspection_status)) {
    errors.push('inspection_status must be passed or failed.');
  }
  if (!['passed', 'failed'].includes(report.baseline_comparison_status)) {
    errors.push('baseline_comparison_status must be passed or failed.');
  }
  for (const countField of [
    'matched_guardrail_count',
    'failed_guardrail_count',
    'missing_guardrail_count',
    'unexpected_unsafe_state_count',
    'panel_count',
    'disabled_action_count',
    'packaging_blocker_count',
    'attention_item_count',
    'disabled_production_gate_count',
  ]) {
    if (!Number.isFinite(report[countField]) || report[countField] < 0) {
      errors.push(`${countField} must be a non-negative number.`);
    }
  }
  if (report.output_target && report.output_target !== 'stdout') {
    errors.push('Desktop contract inspection report output_target must be stdout.');
  }
  if (report.output_file_created === true) {
    errors.push('Desktop contract inspection report must not create output files.');
  }
  if (asArray(report.files_written).length > 0) {
    errors.push('Desktop contract inspection report must not write files.');
  }
  if (report.official_balance_status !== 'disabled' ||
    report.official_report_status !== 'disabled' ||
    report.final_export_status !== 'disabled') {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (hasRawContent(report)) {
    errors.push('Desktop contract inspection report must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifyDesktopContractInspectionStdoutOnly(result, policy = getDesktopContractInspectionPolicy()) {
  const errors = [];

  if (!isPlainObject(result)) {
    return { ok: false, errors: ['Desktop contract inspection result is required.'] };
  }
  if (result.stdout_only !== true) {
    errors.push('stdout_only must be true.');
  }
  if (result.in_memory_only !== true) {
    errors.push('in_memory_only must be true.');
  }
  if (result.output_target && result.output_target !== 'stdout') {
    errors.push('output_target must be stdout.');
  }
  if (result.output_file_created === true) {
    errors.push('No output file may be created.');
  }
  if (asArray(result.files_written).length > 0) {
    errors.push('No files may be written.');
  }
  if (result.ok === true && result.stderr_text) {
    errors.push('Successful desktop contract inspection runs must not write stderr.');
  }
  if (result.ok === true && !String(result.stdout_text || '').includes(policy.required_inspection_banner)) {
    errors.push('Successful desktop contract inspection stdout must include the required banner.');
  }
  if (hasRawContent(result)) {
    errors.push('Desktop contract inspection result must not include raw document content.');
  }

  return {
    ok: errors.length === 0,
    errors,
    stdout_only: true,
    in_memory_only: true,
  };
}

export function verifyDesktopContractInspectionReadOnly(vaultPathInput, policy = getDesktopContractInspectionPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const inspectionMatches = policy.forbidden_contract_inspection_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const smokeReadOnly = verifyDesktopContractSmokeReadOnly(vaultPath, policy.smoke_runner_policy);
  const presentPaths = Array.from(new Set([
    ...inspectionMatches,
    ...smokeReadOnly.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    in_memory_only: true,
    present_paths: presentPaths,
    forbidden_contract_inspection_write_targets: [...policy.forbidden_contract_inspection_write_targets],
  };
}

export function verifyNoDesktopContractInspectionExports(vaultPathInput, policy = getDesktopContractInspectionPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const files = listFilesRecursive(vaultPath);
  const localMatches = files.filter((filePath) => isForbiddenExportPath(filePath, vaultPath, policy));
  const smokeExports = verifyNoDesktopContractSmokeExports(vaultPath, policy.smoke_runner_policy);
  const presentPaths = Array.from(new Set([
    ...localMatches,
    ...smokeExports.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(smokeExports.errors)],
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifyNoDesktopContractInspectionPublicFiles(vaultPathInput, policy = getDesktopContractInspectionPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));
  const smokePublic = verifyNoDesktopContractSmokePublicFiles(vaultPath);
  const presentPaths = Array.from(new Set([
    ...publicMatches,
    ...smokePublic.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(smokePublic.errors)],
    public_path_rejection: true,
    present_paths: presentPaths,
  };
}

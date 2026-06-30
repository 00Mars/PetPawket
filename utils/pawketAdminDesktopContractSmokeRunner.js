import fs from 'node:fs';
import path from 'node:path';
import {
  buildPipelineStatusViewModel,
  getDesktopOperatorShellPolicy,
  readNdjsonRecords,
  validateDesktopShellViewModel,
  verifyDesktopShellReadOnly,
  verifyNoDesktopShellExports,
  verifyNoDesktopShellPublicFiles,
} from './pawketAdminDesktopOperatorShell.js';
import {
  buildOperatorUiState,
  getDesktopUiAdapterPolicy,
  validateOperatorUiState,
  verifyNoUiAdapterExports,
  verifyNoUiAdapterPublicFiles,
  verifyUiAdapterReadOnly,
} from './pawketAdminDesktopUiAdapter.js';
import {
  buildDesktopShellScaffoldState,
  getDesktopShellScaffoldPolicy,
  validateDesktopShellScaffoldState,
  verifyDesktopShellCreatesNoExports,
  verifyDesktopShellCreatesNoPublicFiles,
} from './pawketAdminDesktopShellScaffold.js';
import {
  composeDesktopAppShellContract,
  getDesktopShellCompositionPolicy,
  validateDesktopAppShellContract,
  verifyDesktopCompositionCreatesNoExports,
  verifyDesktopCompositionCreatesNoPublicFiles,
  verifyDesktopCompositionHasNoExportActions,
  verifyDesktopCompositionHasNoProductionAuthority,
  verifyDesktopCompositionReadOnly,
} from './pawketAdminDesktopShellComposition.js';
import {
  getSampleVaultHarnessPolicy,
  runSampleVaultPreviewSmokeTest,
} from './pawketAdminSampleVaultHarness.js';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_CONTRACT_SMOKE_RUNNER_VERSION = 'pawket-admin-desktop-contract-smoke-runner-v0';

const REQUIRED_SMOKE_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  stdout_only: true,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_contract_smoke',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
  connector_networking_enabled: false,
  document_upload_enabled: false,
  public_route_enabled: false,
});

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
]);

const CONTRACT_SMOKE_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-contract-smoke-runner.ndjson',
  'manifests/desktop-contract-smoke-summary.ndjson',
  'reports/desktop-contract-smoke.txt',
  'reports/desktop-contract-smoke.json',
  'exports/desktop-contract-smoke.txt',
  'ui/desktop-contract-smoke.json',
  'ui/desktop-contract-smoke.txt',
]);

const VAULT_RECORD_SOURCES = Object.freeze({
  quarantine: 'quarantine/index.ndjson',
  staged_source_events: 'events/staged-source-events.ndjson',
  draft_finance_records: 'events/draft-finance-records.ndjson',
  review_queue: 'events/review-queue.ndjson',
  proposed_ledger_records: 'events/proposed-ledger-records.ndjson',
  proposed_journal_entries: 'events/proposed-journal-entries.ndjson',
  evidence_manifests: 'manifests/commit-evidence-manifests.ndjson',
  commit_gate_evidence_integration_records: 'manifests/commit-gate-evidence-integration.ndjson',
  test_only_immutable_ledger_entries: 'events/test-immutable-ledger-entries.ndjson',
  report_manifests: 'manifests/report-manifests.ndjson',
  export_intents: 'manifests/export-intent-records.ndjson',
  preview_packages: 'manifests/report-preview-packages.ndjson',
  report_review_items: 'manifests/report-review-queue.ndjson',
  report_review_decisions: 'manifests/report-review-decisions.ndjson',
  report_preview_supersessions: 'manifests/report-preview-supersessions.ndjson',
  redaction_review_outcomes: 'manifests/redaction-review-outcomes.ndjson',
  report_reviewer_notes: 'manifests/report-reviewer-notes.ndjson',
  disabled_production_commit_records: 'events/disabled-production-commit-records.ndjson',
  source_documents: 'documents/source-document-metadata.ndjson',
  evidence_deferrals: 'documents/evidence-deferrals.ndjson',
});

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

function baseSmokeFields() {
  return { ...REQUIRED_SMOKE_FIELDS };
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

function pathSegments(inputPath) {
  return path.resolve(inputPath).split(path.sep).filter(Boolean).map((segment) => segment.toLowerCase());
}

function pathHasPublicSegment(inputPath) {
  return pathSegments(inputPath).includes('public');
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

function usageText(policy = getDesktopContractSmokeRunnerPolicy()) {
  return [
    'Pawket Admin desktop contract smoke runner',
    '',
    'Usage:',
    '  npm run pawket-admin:desktop-contract:smoke',
    '  node scripts/pawketAdminDesktopContractSmoke.js --vault <vault-path>',
    '  PAWKET_ADMIN_VAULT_PATH=<vault-path> node scripts/pawketAdminDesktopContractSmoke.js',
    '',
    'Options:',
    '  --vault <path>      Local Pawket Admin vault path to read',
    '  --vault=<path>      Local Pawket Admin vault path to read',
    '  --help, -h          Show this help without reading or writing the vault',
    '',
    'Output:',
    `  ${policy.required_smoke_banner}`,
    '  stdout only; no files, reports, balances, exports, routes, or ledger writes are created.',
  ].join('\n');
}

function assertVaultPath(inputPath, policy = getDesktopContractSmokeRunnerPolicy()) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Pawket Admin desktop contract smoke vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  if (pathHasPublicSegment(resolved)) {
    throw new Error('Pawket Admin desktop contract smoke files must not be placed under public/.');
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    throw new Error('Pawket Admin desktop contract smoke path must not point at export, report, balance, or production artifact locations.');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Pawket Admin desktop contract smoke vault path does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Pawket Admin desktop contract smoke vault path must be a directory: ${resolved}`);
  }
  return resolved;
}

function readVaultRecords(vaultPath, policy) {
  const input = {
    generated_at: nowIso(),
    generated_by: 'desktop_contract_smoke_runner',
  };

  for (const [key, relativePath] of Object.entries(policy.vault_record_sources)) {
    input[key] = readNdjsonRecords(path.join(vaultPath, ...relativePath.split('/')));
  }

  return input;
}

function maybeBuildSamplePreviewMetadata(vaultPath, policy) {
  const samplePolicy = getSampleVaultHarnessPolicy();
  if (path.resolve(vaultPath) !== path.resolve(samplePolicy.default_sample_vault_path)) {
    return null;
  }

  const sampleOutput = runSampleVaultPreviewSmokeTest({ sampleVaultPath: vaultPath }, samplePolicy);
  if (!sampleOutput.ok) {
    throw new Error(`Sample preview smoke metadata rejected: ${(sampleOutput.errors || [sampleOutput.error]).filter(Boolean).join(' ')}`);
  }

  return {
    demo: true,
    ok: true,
    stdout_only: true,
    sample_vault_path: sampleOutput.sample_vault_path,
    record_count: sampleOutput.record_count,
    stdout_text: sampleOutput.stdout_text,
    preview_text: sampleOutput.preview_text,
    runner_used: sampleOutput.runner_used,
    attention_types: sampleOutput.attention_types,
    attention_messages: sampleOutput.attention_messages,
    preview_output_hash: sampleOutput.preview_output_hash,
    required_nonproduction_banner: policy.operator_preview_banner,
  };
}

function officialStateEnabled(record) {
  return record.official_balance_status !== 'disabled' ||
    record.official_report_status !== 'disabled' ||
    record.final_export_status !== 'disabled';
}

export function getDesktopContractSmokeRunnerPolicy() {
  const operatorPolicy = getDesktopOperatorShellPolicy();
  const uiPolicy = getDesktopUiAdapterPolicy();
  const scaffoldPolicy = getDesktopShellScaffoldPolicy();
  const compositionPolicy = getDesktopShellCompositionPolicy();
  const samplePolicy = getSampleVaultHarnessPolicy();

  return {
    policy_version: DESKTOP_CONTRACT_SMOKE_RUNNER_VERSION,
    ...baseSmokeFields(),
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    default_sample_vault_path: samplePolicy.default_sample_vault_path,
    required_smoke_fields: { ...REQUIRED_SMOKE_FIELDS },
    required_smoke_banner: 'PAWKET ADMIN DESKTOP CONTRACT SMOKE — NON-PRODUCTION',
    operator_preview_banner: uiPolicy.required_nonproduction_banner,
    vault_record_sources: { ...VAULT_RECORD_SOURCES },
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_contract_smoke_write_targets: [...CONTRACT_SMOKE_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: Array.from(new Set([
      ...operatorPolicy.blocked_production_actions,
      ...uiPolicy.blocked_production_actions,
      ...compositionPolicy.blocked_production_actions,
      ...scaffoldPolicy.disabled_action_templates.map((action) => action.action_id),
      'desktop_contract_file_write',
      'desktop_contract_public_route',
      'desktop_contract_packaging',
    ])),
  };
}

export function resolveDesktopContractSmokeVaultPath(argv = [], env = {}, policy = getDesktopContractSmokeRunnerPolicy()) {
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
    policy.default_sample_vault_path;

  try {
    return {
      ok: true,
      vault_path: assertVaultPath(vaultPath, policy),
      source: argvVaultPath ? 'argv' : (env.PAWKET_ADMIN_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH
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

export function buildDesktopContractSmokeInput(vaultPathInput, policy = getDesktopContractSmokeRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const readOnly = verifyDesktopContractSmokeReadOnly(vaultPath, policy);
  if (!readOnly.ok) {
    throw new Error(`Desktop contract smoke read-only guard failed: ${readOnly.present_paths.join(', ')}`);
  }
  const noPublic = verifyNoDesktopContractSmokePublicFiles(vaultPath);
  if (!noPublic.ok) {
    throw new Error(`Desktop contract smoke public path guard failed: ${noPublic.present_paths.join(', ') || noPublic.errors.join(' ')}`);
  }
  const noExports = verifyNoDesktopContractSmokeExports(vaultPath, policy);
  if (!noExports.ok) {
    throw new Error(`Desktop contract smoke export guard failed: ${noExports.present_paths.join(', ') || noExports.errors.join(' ')}`);
  }

  const pipelineRecords = readVaultRecords(vaultPath, policy);
  const operatorViewModel = buildPipelineStatusViewModel(pipelineRecords);
  const operatorValidation = validateDesktopShellViewModel(operatorViewModel);
  if (!operatorValidation.ok) {
    throw new Error(`Operator shell view model rejected: ${operatorValidation.errors.join(' ')}`);
  }

  const uiState = buildOperatorUiState(operatorViewModel);
  const uiValidation = validateOperatorUiState(uiState);
  if (!uiValidation.ok) {
    throw new Error(`Operator UI state rejected: ${uiValidation.errors.join(' ')}`);
  }

  const samplePreviewMetadata = maybeBuildSamplePreviewMetadata(vaultPath, policy);
  const scaffoldState = buildDesktopShellScaffoldState({
    operator_view_model: operatorViewModel,
    operator_ui_state: uiState,
    sample_vault_preview: samplePreviewMetadata || {},
  });
  const scaffoldValidation = validateDesktopShellScaffoldState(scaffoldState);
  if (!scaffoldValidation.ok) {
    throw new Error(`Desktop shell scaffold rejected: ${scaffoldValidation.errors.join(' ')}`);
  }

  const smokeInput = {
    ...baseSmokeFields(),
    smoke_input_type: 'desktop_contract_smoke_input',
    policy_version: policy.policy_version,
    generated_at: pipelineRecords.generated_at,
    vault_path: vaultPath,
    pipeline_records: pipelineRecords,
    operator_shell_read_model: operatorViewModel,
    ui_state: uiState,
    scaffold_state: scaffoldState,
    sample_preview: samplePreviewMetadata,
  };

  return {
    ...smokeInput,
    smoke_input_hash: sha256Hex(canonicalize(smokeInput)),
  };
}

export function buildDesktopContractFromVault(vaultPath, policy = getDesktopContractSmokeRunnerPolicy()) {
  const smokeInput = buildDesktopContractSmokeInput(vaultPath, policy);
  const appShellContract = composeDesktopAppShellContract(smokeInput);
  const validation = validateDesktopAppShellContract(appShellContract);
  if (!validation.ok) {
    throw new Error(`Desktop app-shell contract rejected: ${validation.errors.join(' ')}`);
  }
  return appShellContract;
}

export function buildDesktopContractSmokeSummary(appShellContract, policy = getDesktopContractSmokeRunnerPolicy()) {
  const validation = validateDesktopAppShellContract(appShellContract);
  const panelCount = asArray(appShellContract?.panel_registry?.panels).length;
  const disabledActionCount = asArray(appShellContract?.disabled_actions?.actions).length;
  const packagingBlockerCount = asArray(appShellContract?.packaging_blockers?.blockers).length;
  const attentionItemCount = asArray(appShellContract?.attention_queue?.items).length;
  const disabledProductionGateCount = asArray(appShellContract?.status_surface?.disabled_production_gates).length;
  const sampleBinding = appShellContract?.sample_preview_binding || {};
  const summary = {
    ...baseSmokeFields(),
    smoke_summary_type: 'desktop_contract_smoke_summary',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    contract_validation_status: validation.ok ? 'valid' : 'invalid',
    contract_validation_errors: validation.errors,
    app_shell_contract_type: appShellContract?.app_shell_contract_type || '',
    app_shell_contract_hash: appShellContract?.app_shell_contract_hash || '',
    panel_count: panelCount,
    disabled_action_count: disabledActionCount,
    packaging_blocker_count: packagingBlockerCount,
    attention_item_count: attentionItemCount,
    disabled_production_gate_count: disabledProductionGateCount,
    disabled_production_gates: asArray(appShellContract?.status_surface?.disabled_production_gates),
    sample_preview_binding_status: sampleBinding.sample_preview_available ? 'available_demo_only' : 'not_available',
    sample_preview_binding_hash: sampleBinding.sample_preview_binding_hash || '',
    read_only_status: appShellContract?.read_only === true ? 'read_only' : 'unsafe',
    local_only_status: appShellContract?.local_only === true ? 'local_only' : 'unsafe',
    non_production_status: appShellContract?.production_enabled === false ? 'non_production' : 'unsafe',
    official_balance_status: appShellContract?.official_balance_status,
    official_report_status: appShellContract?.official_report_status,
    final_export_status: appShellContract?.final_export_status,
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
    raw_document_content_included: false,
  };

  return {
    ...summary,
    smoke_summary_hash: sha256Hex(canonicalize(summary)),
  };
}

export function renderDesktopContractSmokeSummaryText(summary, policy = getDesktopContractSmokeRunnerPolicy()) {
  const validation = validateDesktopContractSmokeSummary(summary, policy);
  if (!validation.ok) {
    throw new Error(`Desktop contract smoke summary rejected: ${validation.errors.join(' ')}`);
  }
  if (hasRawContent(summary)) {
    throw new Error('Desktop contract smoke summary must not include raw document content.');
  }

  return [
    policy.required_smoke_banner,
    `Contract validation: ${summary.contract_validation_status}`,
    `Source mode: ${summary.source_mode}`,
    `Read only: ${summary.read_only} | Local only: ${summary.local_only} | Packaged app: ${summary.packaged_app}`,
    `Official balances: ${summary.official_balance_status} | Official reports: ${summary.official_report_status} | Final exports: ${summary.final_export_status}`,
    `Panels: ${summary.panel_count}`,
    `Disabled actions: ${summary.disabled_action_count}`,
    `Packaging blockers: ${summary.packaging_blocker_count}`,
    `Attention items: ${summary.attention_item_count}`,
    `Disabled production gates: ${summary.disabled_production_gate_count}`,
    `Sample preview binding: ${summary.sample_preview_binding_status}`,
    'Output: stdout only; no files, reports, balances, exports, routes, or ledger writes created.',
  ].join('\n');
}

export function runDesktopContractSmoke(argv = [], env = {}, io = {}, policy = getDesktopContractSmokeRunnerPolicy()) {
  const resolved = resolveDesktopContractSmokeVaultPath(argv, env, policy);
  if (resolved.help) {
    const stdoutText = `${resolved.usage}\n`;
    writeIo(io.stdout, stdoutText);
    return {
      ...baseSmokeFields(),
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
      ...baseSmokeFields(),
      ok: false,
      exit_code: resolved.exit_code || 2,
      error: resolved.error,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }

  try {
    const contract = buildDesktopContractFromVault(resolved.vault_path, policy);
    const summary = buildDesktopContractSmokeSummary(contract, policy);
    const text = `${renderDesktopContractSmokeSummaryText(summary, policy)}\n`;
    writeIo(io.stdout, text);
    const result = {
      ...baseSmokeFields(),
      ok: true,
      exit_code: 0,
      vault_path: resolved.vault_path,
      vault_path_source: resolved.source,
      output_target: 'stdout',
      output_file_created: false,
      stdout_text: text,
      stderr_text: '',
      files_written: [],
      app_shell_contract_hash: contract.app_shell_contract_hash,
      summary,
    };
    const stdoutOnly = verifyDesktopContractSmokeStdoutOnly(result, policy);
    if (!stdoutOnly.ok) {
      throw new Error(`Desktop contract smoke stdout-only guard failed: ${stdoutOnly.errors.join(' ')}`);
    }
    return result;
  } catch (error) {
    const stderrText = `${error.message}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...baseSmokeFields(),
      ok: false,
      exit_code: 1,
      error: error.message,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }
}

export function validateDesktopContractSmokeSummary(summary, policy = getDesktopContractSmokeRunnerPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(summary)) {
    return { ok: false, errors: ['Desktop contract smoke summary is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_smoke_fields)) {
    if (summary[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  if (officialStateEnabled(summary)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (summary.output_target && summary.output_target !== 'stdout') {
    errors.push('Desktop contract smoke summary output_target must be stdout.');
  }
  if (summary.output_file_created === true) {
    errors.push('Desktop contract smoke summary must not create output files.');
  }
  if (asArray(summary.files_written).length > 0) {
    errors.push('Desktop contract smoke summary must not write files.');
  }
  if (summary.contract_validation_status !== 'valid') {
    errors.push('Desktop contract smoke summary requires a valid composed app-shell contract.');
  }
  if (!Number.isFinite(summary.panel_count) || summary.panel_count <= 0) {
    errors.push('Desktop contract smoke summary must include panel_count.');
  }
  if (!Number.isFinite(summary.disabled_action_count) || summary.disabled_action_count <= 0) {
    errors.push('Desktop contract smoke summary must include disabled_action_count.');
  }
  if (!Number.isFinite(summary.packaging_blocker_count) || summary.packaging_blocker_count <= 0) {
    errors.push('Desktop contract smoke summary must include packaging_blocker_count.');
  }
  if (!Number.isFinite(summary.attention_item_count)) {
    errors.push('Desktop contract smoke summary must include attention_item_count.');
  }
  if (!Number.isFinite(summary.disabled_production_gate_count) || summary.disabled_production_gate_count <= 0) {
    errors.push('Desktop contract smoke summary must include disabled_production_gate_count.');
  }
  if (!summary.sample_preview_binding_status) {
    errors.push('Desktop contract smoke summary must include sample_preview_binding_status.');
  }
  if (hasRawContent(summary)) {
    errors.push('Desktop contract smoke summary must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifyDesktopContractSmokeStdoutOnly(result, policy = getDesktopContractSmokeRunnerPolicy()) {
  const errors = [];

  if (!isPlainObject(result)) {
    return { ok: false, errors: ['Desktop contract smoke result is required.'] };
  }
  if (result.stdout_only !== true) {
    errors.push('stdout_only must be true.');
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
    errors.push('Successful desktop contract smoke runs must not write stderr.');
  }
  if (result.ok === true && !String(result.stdout_text || '').includes(policy.required_smoke_banner)) {
    errors.push('Successful desktop contract smoke stdout must include the required banner.');
  }
  if (hasRawContent(result)) {
    errors.push('Desktop contract smoke result must not include raw document content.');
  }

  return {
    ok: errors.length === 0,
    errors,
    stdout_only: true,
  };
}

export function verifyDesktopContractSmokeReadOnly(vaultPathInput, policy = getDesktopContractSmokeRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const runnerMatches = policy.forbidden_contract_smoke_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const shellReadOnly = verifyDesktopShellReadOnly(vaultPath);
  const adapterReadOnly = verifyUiAdapterReadOnly(vaultPath);
  const presentPaths = Array.from(new Set([
    ...runnerMatches,
    ...shellReadOnly.present_paths,
    ...adapterReadOnly.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    present_paths: presentPaths,
    forbidden_contract_smoke_write_targets: [...policy.forbidden_contract_smoke_write_targets],
  };
}

export function verifyNoDesktopContractSmokeExports(vaultPathInput, policy = getDesktopContractSmokeRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const files = listFilesRecursive(vaultPath);
  const localMatches = files.filter((filePath) => isForbiddenExportPath(filePath, vaultPath, policy));
  const shellExports = verifyNoDesktopShellExports(vaultPath);
  const adapterExports = verifyNoUiAdapterExports(vaultPath);
  const scaffoldExports = verifyDesktopShellCreatesNoExports(vaultPath);
  const compositionExports = verifyDesktopCompositionCreatesNoExports(vaultPath);
  const presentPaths = Array.from(new Set([
    ...localMatches,
    ...shellExports.present_paths,
    ...adapterExports.present_paths,
    ...scaffoldExports.present_paths,
    ...compositionExports.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [
      ...asArray(shellExports.errors),
      ...asArray(adapterExports.errors),
      ...asArray(scaffoldExports.errors),
      ...asArray(compositionExports.errors),
    ],
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifyNoDesktopContractSmokePublicFiles(vaultPathInput) {
  const policy = getDesktopContractSmokeRunnerPolicy();
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));
  const shellPublic = verifyNoDesktopShellPublicFiles(vaultPath);
  const adapterPublic = verifyNoUiAdapterPublicFiles(vaultPath);
  const scaffoldPublic = verifyDesktopShellCreatesNoPublicFiles(vaultPath);
  const compositionPublic = verifyDesktopCompositionCreatesNoPublicFiles(vaultPath);
  const presentPaths = Array.from(new Set([
    ...publicMatches,
    ...shellPublic.present_paths,
    ...adapterPublic.present_paths,
    ...scaffoldPublic.present_paths,
    ...compositionPublic.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [
      ...asArray(shellPublic.errors),
      ...asArray(adapterPublic.errors),
      ...asArray(scaffoldPublic.errors),
      ...asArray(compositionPublic.errors),
    ],
    public_path_rejection: true,
    present_paths: presentPaths,
  };
}

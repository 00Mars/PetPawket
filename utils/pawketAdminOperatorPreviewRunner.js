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
  buildOperatorCliPreview,
  buildOperatorUiState,
  getDesktopUiAdapterPolicy,
  renderOperatorCliPreviewText as renderAdapterCliPreviewText,
  validateOperatorUiState,
  verifyNoUiAdapterExports,
  verifyNoUiAdapterPublicFiles,
  verifyUiAdapterReadOnly,
} from './pawketAdminDesktopUiAdapter.js';

export const OPERATOR_PREVIEW_RUNNER_VERSION = 'pawket-admin-operator-preview-runner-v0';

const REQUIRED_PREVIEW_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  stdout_only: true,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_view',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
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

const OPERATOR_PREVIEW_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/operator-preview-runner.ndjson',
  'manifests/operator-preview-output.ndjson',
  'reports/operator-preview.txt',
  'reports/operator-preview.json',
  'exports/operator-preview.txt',
  'ui/operator-preview.txt',
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

function usageText(policy = getOperatorPreviewRunnerPolicy()) {
  return [
    'Pawket Admin local operator preview runner',
    '',
    'Usage:',
    '  node scripts/pawketAdminOperatorPreview.js --vault <vault-path>',
    '  PAWKET_ADMIN_VAULT_PATH=<vault-path> node scripts/pawketAdminOperatorPreview.js',
    '',
    'Options:',
    '  --vault <path>      Local Pawket Admin vault path to read',
    '  --vault=<path>      Local Pawket Admin vault path to read',
    '  --help, -h          Show this help without reading or writing the vault',
    '',
    'Output:',
    `  ${policy.required_nonproduction_banner}`,
    '  stdout only; no files, reports, balances, exports, routes, or ledger writes are created.',
  ].join('\n');
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

function assertVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Pawket Admin operator preview vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);
  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin operator preview files must not be placed under public/.');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Pawket Admin operator preview vault path does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Pawket Admin operator preview vault path must be a directory: ${resolved}`);
  }
  return resolved;
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

function parseVaultPathArg(argv = []) {
  const args = [...argv];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--vault' || arg === '--vault-path') {
      return args[index + 1] || '';
    }
    if (arg.startsWith('--vault=')) {
      return arg.slice('--vault='.length);
    }
    if (arg.startsWith('--vault-path=')) {
      return arg.slice('--vault-path='.length);
    }
  }

  const positional = args.find((arg) => !String(arg).startsWith('-'));
  return positional || '';
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

function readVaultRecords(vaultPath) {
  const input = {
    generated_at: nowIso(),
    generated_by: 'operator_preview_runner',
  };

  for (const [key, relativePath] of Object.entries(VAULT_RECORD_SOURCES)) {
    input[key] = readNdjsonRecords(path.join(vaultPath, ...relativePath.split('/')));
  }

  return input;
}

function officialStateEnabled(record) {
  return record.official_balance_status !== 'disabled' ||
    record.official_report_status !== 'disabled' ||
    record.final_export_status !== 'disabled';
}

export function getOperatorPreviewRunnerPolicy() {
  const shellPolicy = getDesktopOperatorShellPolicy();
  const adapterPolicy = getDesktopUiAdapterPolicy();
  return {
    policy_version: OPERATOR_PREVIEW_RUNNER_VERSION,
    production_enabled: false,
    read_only: true,
    local_only: true,
    stdout_only: true,
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    mutation_actions_enabled: false,
    export_actions_enabled: false,
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    source_mode: 'local_non_production_view',
    raw_document_content_allowed: false,
    raw_document_content_included: false,
    allowed_source_modes: ['local_non_production_view'],
    required_preview_fields: { ...REQUIRED_PREVIEW_FIELDS },
    required_nonproduction_banner: adapterPolicy.required_nonproduction_banner,
    vault_record_sources: { ...VAULT_RECORD_SOURCES },
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_operator_preview_write_targets: [...OPERATOR_PREVIEW_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: Array.from(new Set([
      ...shellPolicy.blocked_production_actions,
      ...adapterPolicy.blocked_production_actions,
      'stdout_file_write',
      'preview_file_write',
      'public_route',
      'packaged_desktop_app',
    ])),
  };
}

export function resolveOperatorPreviewVaultPath(argv = [], env = {}, policy = getOperatorPreviewRunnerPolicy()) {
  const args = [...argv];
  if (args.includes('--help') || args.includes('-h')) {
    return {
      ok: true,
      help: true,
      exit_code: 0,
      usage: usageText(policy),
    };
  }

  const vaultPath = parseVaultPathArg(args) ||
    env.PAWKET_ADMIN_VAULT_PATH ||
    env.PAWKET_ADMIN_OPERATOR_VAULT_PATH ||
    env.PAWKET_ADMIN_OPERATOR_PREVIEW_VAULT_PATH ||
    '';

  if (!vaultPath) {
    return {
      ok: false,
      exit_code: 2,
      error: 'Pawket Admin operator preview vault path is required.',
      usage: usageText(policy),
    };
  }

  try {
    return {
      ok: true,
      vault_path: assertVaultPath(vaultPath),
      source: parseVaultPathArg(args) ? 'argv' : 'env',
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

export function buildOperatorPreviewFromViewModel(viewModel, policy = getOperatorPreviewRunnerPolicy()) {
  const shellValidation = validateDesktopShellViewModel(viewModel);
  if (!shellValidation.ok) {
    throw new Error(`Operator shell view model rejected: ${shellValidation.errors.join(' ')}`);
  }

  const uiState = buildOperatorUiState(viewModel);
  const uiValidation = validateOperatorUiState(uiState);
  if (!uiValidation.ok) {
    throw new Error(`Operator UI state rejected: ${uiValidation.errors.join(' ')}`);
  }

  const cliPreview = buildOperatorCliPreview(viewModel);
  const previewText = renderAdapterCliPreviewText(cliPreview);
  const preview = {
    ...REQUIRED_PREVIEW_FIELDS,
    preview_type: 'operator_preview_runner',
    policy_version: policy.policy_version,
    generated_at: viewModel.generated_at || nowIso(),
    view_model_type: viewModel.view_model_type,
    view_model_hash: viewModel.view_model_hash,
    ui_state_hash: uiState.ui_state_hash,
    cli_preview_hash: cliPreview.cli_preview_hash,
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
    ui_state: uiState,
    cli_preview: cliPreview,
    preview_text: previewText,
    runner_version: OPERATOR_PREVIEW_RUNNER_VERSION,
  };

  const validation = validateOperatorPreview(preview, policy);
  if (!validation.ok) {
    throw new Error(`Operator preview rejected: ${validation.errors.join(' ')}`);
  }

  return preview;
}

export function buildOperatorPreviewFromVault(vaultPathInput, policy = getOperatorPreviewRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput);
  const readOnly = verifyOperatorPreviewReadOnly(vaultPath, policy);
  if (!readOnly.ok) {
    throw new Error(`Operator preview read-only guard failed: ${readOnly.present_paths.join(', ')}`);
  }

  const noPublic = verifyNoOperatorPreviewPublicFiles(vaultPath);
  if (!noPublic.ok) {
    throw new Error(`Operator preview public path guard failed: ${noPublic.present_paths.join(', ')}`);
  }

  const noExports = verifyNoOperatorPreviewExports(vaultPath);
  if (!noExports.ok) {
    throw new Error(`Operator preview export guard failed: ${noExports.present_paths.join(', ')}`);
  }

  const input = readVaultRecords(vaultPath);
  const viewModel = buildPipelineStatusViewModel(input);
  return buildOperatorPreviewFromViewModel(viewModel, policy);
}

export function renderOperatorPreviewText(preview, policy = getOperatorPreviewRunnerPolicy()) {
  const validation = validateOperatorPreview(preview, policy);
  if (!validation.ok) {
    throw new Error(`Operator preview rejected: ${validation.errors.join(' ')}`);
  }
  return preview.preview_text || renderAdapterCliPreviewText(preview.cli_preview);
}

export function runOperatorPreview(argv = [], env = {}, io = {}, policy = getOperatorPreviewRunnerPolicy()) {
  const resolved = resolveOperatorPreviewVaultPath(argv, env, policy);
  if (resolved.help) {
    writeIo(io.stdout, `${resolved.usage}\n`);
    return {
      ...REQUIRED_PREVIEW_FIELDS,
      ok: true,
      help: true,
      exit_code: 0,
      stdout_text: `${resolved.usage}\n`,
      stderr_text: '',
      files_written: [],
    };
  }
  if (!resolved.ok) {
    const stderrText = `${resolved.error}\n\n${resolved.usage}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...REQUIRED_PREVIEW_FIELDS,
      ok: false,
      exit_code: resolved.exit_code || 2,
      error: resolved.error,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }

  try {
    const preview = buildOperatorPreviewFromVault(resolved.vault_path, policy);
    const text = `${renderOperatorPreviewText(preview, policy)}\n`;
    writeIo(io.stdout, text);
    const result = {
      ...REQUIRED_PREVIEW_FIELDS,
      ok: true,
      exit_code: 0,
      vault_path: resolved.vault_path,
      output_target: 'stdout',
      stdout_text: text,
      stderr_text: '',
      files_written: [],
      preview,
    };
    const stdoutOnly = verifyOperatorPreviewStdoutOnly(result, policy);
    if (!stdoutOnly.ok) {
      throw new Error(`Operator preview stdout-only guard failed: ${stdoutOnly.errors.join(' ')}`);
    }
    return result;
  } catch (error) {
    const stderrText = `${error.message}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...REQUIRED_PREVIEW_FIELDS,
      ok: false,
      exit_code: 1,
      error: error.message,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }
}

export function validateOperatorPreview(preview, policy = getOperatorPreviewRunnerPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(preview)) {
    return { ok: false, errors: ['Operator preview is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_preview_fields)) {
    if (preview[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }

  if (officialStateEnabled(preview)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (preview.output_target && preview.output_target !== 'stdout') {
    errors.push('Operator preview output_target must be stdout.');
  }
  if (preview.output_file_created === true) {
    errors.push('Operator preview must not create output files.');
  }
  if (asArray(preview.files_written).length > 0) {
    errors.push('Operator preview must not write files.');
  }
  if (!preview.preview_text && !preview.cli_preview) {
    errors.push('Operator preview must include preview_text or cli_preview.');
  }
  if (preview.preview_text && !String(preview.preview_text).includes(policy.required_nonproduction_banner)) {
    errors.push('Operator preview text must include the required non-production banner.');
  }
  if (hasRawContent(preview)) {
    errors.push('Operator preview must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifyOperatorPreviewStdoutOnly(result, policy = getOperatorPreviewRunnerPolicy()) {
  const errors = [];

  if (!isPlainObject(result)) {
    return { ok: false, errors: ['Operator preview result is required.'] };
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
    errors.push('Successful operator preview runs must not write stderr.');
  }
  if (result.ok === true && !String(result.stdout_text || '').includes(policy.required_nonproduction_banner)) {
    errors.push('Successful operator preview stdout must include the required banner.');
  }
  if (hasRawContent(result)) {
    errors.push('Operator preview result must not include raw document content.');
  }

  return {
    ok: errors.length === 0,
    errors,
    stdout_only: true,
  };
}

export function verifyOperatorPreviewReadOnly(vaultPathInput, policy = getOperatorPreviewRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput);
  const runnerMatches = policy.forbidden_operator_preview_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const shellReadOnly = verifyDesktopShellReadOnly(vaultPath);
  const adapterReadOnly = verifyUiAdapterReadOnly(vaultPath);
  const presentPaths = [
    ...runnerMatches,
    ...shellReadOnly.present_paths,
    ...adapterReadOnly.present_paths,
  ];

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    present_paths: presentPaths,
    forbidden_operator_preview_write_targets: [...policy.forbidden_operator_preview_write_targets],
  };
}

export function verifyNoOperatorPreviewExports(vaultPathInput, policy = getOperatorPreviewRunnerPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput);
  const files = listFilesRecursive(vaultPath);
  const localMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    const extension = path.extname(filePath).toLowerCase();
    return FORBIDDEN_EXPORT_EXTENSIONS.has(extension) ||
      policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
  });
  const shellExports = verifyNoDesktopShellExports(vaultPath);
  const adapterExports = verifyNoUiAdapterExports(vaultPath);
  const presentPaths = Array.from(new Set([
    ...localMatches,
    ...shellExports.present_paths,
    ...adapterExports.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifyNoOperatorPreviewPublicFiles(vaultPathInput) {
  const vaultPath = assertVaultPath(vaultPathInput);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));
  const shellPublic = verifyNoDesktopShellPublicFiles(vaultPath);
  const adapterPublic = verifyNoUiAdapterPublicFiles(vaultPath);
  const presentPaths = Array.from(new Set([
    ...publicMatches,
    ...shellPublic.present_paths,
    ...adapterPublic.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    public_path_rejection: true,
    present_paths: presentPaths,
  };
}

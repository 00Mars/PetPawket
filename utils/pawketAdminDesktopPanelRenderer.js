import fs from 'node:fs';
import path from 'node:path';
import {
  buildDesktopContractFromVault,
  buildDesktopContractSmokeSummary,
  getDesktopContractSmokeRunnerPolicy,
} from './pawketAdminDesktopContractSmokeRunner.js';
import {
  buildDesktopContractInspectionInput,
  buildDesktopContractInspectionReport,
  buildDesktopContractInspectionSnapshot,
  compareDesktopContractSnapshotToBaseline,
  getDesktopContractInspectionPolicy,
  getExpectedDesktopContractGuardrailBaseline,
  validateDesktopContractInspectionReport,
  verifyDesktopContractInspectionReadOnly,
  verifyNoDesktopContractInspectionExports,
  verifyNoDesktopContractInspectionPublicFiles,
} from './pawketAdminDesktopContractInspection.js';
import {
  getDesktopShellCompositionPolicy,
  validateDesktopAppShellContract,
} from './pawketAdminDesktopShellComposition.js';
import { getDesktopShellScaffoldPolicy } from './pawketAdminDesktopShellScaffold.js';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_PANEL_RENDERER_VERSION = 'pawket-admin-desktop-panel-renderer-v0';

const REQUIRED_PANEL_RENDER_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  in_memory_only: true,
  runtime_state_persistence_enabled: false,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_panel_render_contract',
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
  'runtime-snapshot',
  'desktop-contract-inspection-snapshot',
  'desktop-panel-render',
  'desktop-panel-state',
  'runtime-panel-state',
  'panel-render-state',
]);

const PANEL_RENDERER_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-panel-render-contracts.ndjson',
  'manifests/desktop-panel-render-summary.ndjson',
  'manifests/desktop-panel-region-map.ndjson',
  'reports/desktop-panel-render-summary.txt',
  'reports/desktop-panel-render-summary.json',
  'exports/desktop-panel-render-summary.txt',
  'snapshots/desktop-panel-render-contracts.json',
  'runtime/desktop-panel-state.json',
  'runtime/desktop-panel-render-state.json',
  'ui/desktop-panel-render-contracts.json',
  'ui/desktop-panel-state.json',
]);

const PANEL_REGION_IDS = Object.freeze([
  'header',
  'left_nav',
  'main_panel',
  'attention_rail',
  'footer_status',
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

function hashPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

function basePanelRenderFields() {
  return { ...REQUIRED_PANEL_RENDER_FIELDS };
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

function pathSegments(inputPath) {
  return path.resolve(inputPath).split(path.sep).filter(Boolean).map((segment) => segment.toLowerCase());
}

function pathHasPublicSegment(inputPath) {
  return pathSegments(inputPath).includes('public');
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

function usageText(policy = getDesktopPanelRendererPolicy()) {
  return [
    'Pawket Admin desktop panel contract renderer',
    '',
    'Usage:',
    '  npm run pawket-admin:desktop-panels:inspect',
    '  node scripts/pawketAdminDesktopPanelRenderer.js --vault <vault-path>',
    '  PAWKET_ADMIN_VAULT_PATH=<vault-path> node scripts/pawketAdminDesktopPanelRenderer.js',
    '',
    'Options:',
    '  --vault <path>      Local Pawket Admin vault path to read',
    '  --vault=<path>      Local Pawket Admin vault path to read',
    '  --help, -h          Show this help without reading or writing the vault',
    '',
    'Output:',
    `  ${policy.required_panel_render_banner}`,
    '  stdout only; no files, panel state, snapshots, reports, balances, exports, routes, or ledger writes are created.',
  ].join('\n');
}

function assertVaultPath(inputPath, policy = getDesktopPanelRendererPolicy()) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Pawket Admin desktop panel renderer vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  if (pathHasPublicSegment(resolved)) {
    throw new Error('Pawket Admin desktop panel renderer files must not be placed under public/.');
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    throw new Error('Pawket Admin desktop panel renderer path must not point at export, report, balance, snapshot, runtime-state, or production artifact locations.');
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`Pawket Admin desktop panel renderer vault path does not exist: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Pawket Admin desktop panel renderer vault path must be a directory: ${resolved}`);
  }
  return resolved;
}

function fieldMismatchErrors(record, requiredFields, label) {
  const errors = [];
  for (const [field, expectedValue] of Object.entries(requiredFields)) {
    if (record[field] !== expectedValue) {
      errors.push(`${label}.${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  return errors;
}

function officialStateEnabled(record) {
  return record?.official_balance_status !== 'disabled' ||
    record?.official_report_status !== 'disabled' ||
    record?.final_export_status !== 'disabled';
}

function panelBindingsFromInput(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (Array.isArray(input?.contracts)) {
    return input.contracts;
  }
  if (Array.isArray(input?.panel_render_contracts)) {
    return input.panel_render_contracts;
  }
  if (Array.isArray(input?.panel_bindings?.bindings)) {
    return input.panel_bindings.bindings;
  }
  if (Array.isArray(input?.app_shell_contract?.panel_bindings?.bindings)) {
    return input.app_shell_contract.panel_bindings.bindings;
  }
  if (Array.isArray(input?.appShellContract?.panel_bindings?.bindings)) {
    return input.appShellContract.panel_bindings.bindings;
  }
  return [];
}

function panelContractsFromInput(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (Array.isArray(input?.contracts)) {
    return input.contracts;
  }
  if (Array.isArray(input?.panel_render_contracts)) {
    return input.panel_render_contracts;
  }
  return [];
}

function regionForPanel(panelId) {
  if (panelId === 'overview') {
    return 'header';
  }
  if (panelId === 'sample_vault_preview' || panelId === 'audit_notes') {
    return 'footer_status';
  }
  if (['blockers', 'warnings', 'disabled_production_gates'].includes(panelId)) {
    return 'attention_rail';
  }
  return 'main_panel';
}

function warningPanel(panelId) {
  return ['blockers', 'warnings', 'disabled_production_gates'].includes(panelId);
}

function regionRecord(regionId, panelContracts, policy) {
  const panels = panelContracts
    .filter((contract) => contract.region_id === regionId)
    .map((contract) => contract.panel_id);
  return {
    region_id: regionId,
    label: regionId.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' '),
    panel_ids: panels,
    local_only: true,
    read_only: true,
    non_production: true,
    in_memory_only: true,
    raw_document_content_allowed: false,
    mutation_controls_allowed: false,
    export_controls_allowed: false,
    public_route_allowed: false,
    render_scope: 'counts_status_and_guardrails_only',
    policy_version: policy.policy_version,
  };
}

function firstContractValue(panelContracts, field, fallback) {
  const first = panelContracts.find((contract) => contract[field] !== undefined);
  return first ? first[field] : fallback;
}

export function getDesktopPanelRendererPolicy() {
  const smokePolicy = getDesktopContractSmokeRunnerPolicy();
  const inspectionPolicy = getDesktopContractInspectionPolicy();
  const scaffoldPolicy = getDesktopShellScaffoldPolicy();
  const compositionPolicy = getDesktopShellCompositionPolicy();

  return {
    policy_version: DESKTOP_PANEL_RENDERER_VERSION,
    ...basePanelRenderFields(),
    stdout_only: true,
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    raw_document_content_allowed: false,
    default_sample_vault_path: inspectionPolicy.default_sample_vault_path,
    required_panel_render_fields: { ...REQUIRED_PANEL_RENDER_FIELDS },
    required_panel_render_banner: 'PAWKET ADMIN DESKTOP PANEL CONTRACTS — NON-PRODUCTION',
    smoke_runner_policy: smokePolicy,
    inspection_policy: inspectionPolicy,
    composition_policy: compositionPolicy,
    allowed_panels: scaffoldPolicy.allowed_panels.map((panel) => ({
      panel_id: panel.panel_id,
      label: panel.label,
      source_view_model: panel.source_view_model,
      region_id: regionForPanel(panel.panel_id),
    })),
    allowed_region_ids: [...PANEL_REGION_IDS],
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_panel_renderer_write_targets: [...PANEL_RENDERER_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: Array.from(new Set([
      ...inspectionPolicy.blocked_production_actions,
      ...compositionPolicy.blocked_production_actions,
      'runtime_panel_state_persistence',
      'desktop_panel_renderer_file_write',
      'desktop_panel_public_route',
    ])),
  };
}

export function resolveDesktopPanelRendererVaultPath(argv = [], env = {}, policy = getDesktopPanelRendererPolicy()) {
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
    env.PAWKET_ADMIN_DESKTOP_PANEL_RENDERER_VAULT_PATH ||
    policy.default_sample_vault_path;

  try {
    return {
      ok: true,
      vault_path: assertVaultPath(vaultPath, policy),
      source: argvVaultPath ? 'argv' : (env.PAWKET_ADMIN_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_VAULT_PATH ||
        env.PAWKET_ADMIN_DESKTOP_PANEL_RENDERER_VAULT_PATH
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

export function buildDesktopPanelRendererInput(vaultPathInput, policy = getDesktopPanelRendererPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const readOnly = verifyDesktopPanelRendererReadOnly(vaultPath, policy);
  if (!readOnly.ok) {
    throw new Error(`Desktop panel renderer read-only guard failed: ${readOnly.present_paths.join(', ')}`);
  }
  const noPublic = verifyNoDesktopPanelRendererPublicFiles(vaultPath, policy);
  if (!noPublic.ok) {
    throw new Error(`Desktop panel renderer public path guard failed: ${noPublic.present_paths.join(', ') || noPublic.errors.join(' ')}`);
  }
  const noExports = verifyNoDesktopPanelRendererExports(vaultPath, policy);
  if (!noExports.ok) {
    throw new Error(`Desktop panel renderer export guard failed: ${noExports.present_paths.join(', ') || noExports.errors.join(' ')}`);
  }
  const noRuntimeState = verifyNoDesktopPanelRendererRuntimeState(vaultPath, policy);
  if (!noRuntimeState.ok) {
    throw new Error(`Desktop panel renderer runtime-state guard failed: ${noRuntimeState.present_paths.join(', ')}`);
  }

  const inspectionInput = buildDesktopContractInspectionInput(vaultPath, policy.inspection_policy);
  const inspectionSnapshot = buildDesktopContractInspectionSnapshot(inspectionInput, policy.inspection_policy);
  const baseline = getExpectedDesktopContractGuardrailBaseline(policy.inspection_policy);
  const inspectionComparison = compareDesktopContractSnapshotToBaseline(
    inspectionSnapshot,
    baseline,
    policy.inspection_policy
  );
  const inspectionReport = buildDesktopContractInspectionReport(inspectionComparison, policy.inspection_policy);
  const inspectionValidation = validateDesktopContractInspectionReport(inspectionReport, policy.inspection_policy);
  if (!inspectionValidation.ok) {
    throw new Error(`Desktop panel renderer inspection report rejected: ${inspectionValidation.errors.join(' ')}`);
  }
  if (inspectionReport.inspection_status !== 'passed') {
    throw new Error(`Desktop panel renderer requires a passing inspection report; got ${inspectionReport.inspection_status}.`);
  }

  const appShellContract = inspectionInput.app_shell_contract || buildDesktopContractFromVault(vaultPath, policy.smoke_runner_policy);
  const appShellValidation = validateDesktopAppShellContract(appShellContract, policy.composition_policy);
  if (!appShellValidation.ok) {
    throw new Error(`Desktop panel renderer app-shell contract rejected: ${appShellValidation.errors.join(' ')}`);
  }

  const smokeSummary = inspectionInput.smoke_summary || buildDesktopContractSmokeSummary(appShellContract, policy.smoke_runner_policy);
  const rendererInput = {
    ...basePanelRenderFields(),
    stdout_only: true,
    renderer_input_type: 'desktop_panel_renderer_input',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    vault_path: vaultPath,
    smoke_summary: smokeSummary,
    app_shell_contract: appShellContract,
    inspection_snapshot: inspectionSnapshot,
    inspection_comparison: inspectionComparison,
    inspection_report: inspectionReport,
    panel_bindings: appShellContract.panel_bindings,
  };

  return {
    ...rendererInput,
    renderer_input_hash: hashPayload(rendererInput),
  };
}

export function buildDesktopPanelRenderContract(
  panelBinding,
  appShellContract,
  inspectionReport,
  policy = getDesktopPanelRendererPolicy()
) {
  if (!isPlainObject(panelBinding)) {
    throw new Error('Desktop panel render contract requires a panel binding.');
  }

  const panelId = panelBinding.panel_id;
  const allowedPanel = policy.allowed_panels.find((panel) => panel.panel_id === panelId);
  const regionId = allowedPanel?.region_id || regionForPanel(panelId);
  const attentionItems = asArray(appShellContract?.attention_queue?.items);
  const disabledProductionGates = asArray(appShellContract?.status_surface?.disabled_production_gates);
  const panelContract = {
    ...basePanelRenderFields(),
    panel_render_contract_type: 'desktop_panel_render_contract',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    panel_id: panelId,
    label: panelBinding.label || allowedPanel?.label || panelId,
    region_id: regionId,
    source_view_model: panelBinding.source_view_model || allowedPanel?.source_view_model || '',
    ui_state_key: panelBinding.ui_state_key || '',
    enabled: panelBinding.enabled === true,
    state_available: panelBinding.state_available !== false,
    render_mode: 'summary_only',
    data_scope: 'counts_status_and_guardrails_only',
    read_only: true,
    production_authority: false,
    raw_document_content_allowed: false,
    mutation_controls_allowed: false,
    export_controls_allowed: false,
    navigation_target_allowed: true,
    public_route_allowed: false,
    warning_panel: warningPanel(panelId),
    inspection_status: inspectionReport?.inspection_status || 'failed',
    baseline_comparison_status: inspectionReport?.baseline_comparison_status || 'failed',
    source_attention_item_count: attentionItems.length,
    source_disabled_production_gate_count: disabledProductionGates.length,
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
  };

  return {
    ...panelContract,
    panel_render_contract_hash: hashPayload(panelContract),
  };
}

export function buildDesktopPanelRenderContracts(input, policy = getDesktopPanelRendererPolicy()) {
  const appShellContract = input?.app_shell_contract || input?.appShellContract || input;
  const inspectionReport = input?.inspection_report || input?.inspectionReport || {};
  const bindings = panelBindingsFromInput(input);
  if (!bindings.length) {
    throw new Error('Desktop panel renderer requires panel bindings.');
  }

  const contracts = bindings.map((binding) => (
    buildDesktopPanelRenderContract(binding, appShellContract, inspectionReport, policy)
  ));
  const validationErrors = contracts.flatMap((contract) => validateDesktopPanelRenderContract(contract, policy).errors);
  if (validationErrors.length) {
    throw new Error(`Desktop panel render contracts rejected: ${unique(validationErrors).join(' ')}`);
  }

  const contractSet = {
    ...basePanelRenderFields(),
    stdout_only: true,
    panel_render_contracts_type: 'desktop_panel_render_contract_set',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    app_shell_contract_hash: appShellContract?.app_shell_contract_hash || '',
    inspection_report_hash: inspectionReport?.inspection_report_hash || '',
    panel_count: contracts.length,
    contracts,
  };

  return {
    ...contractSet,
    panel_render_contracts_hash: hashPayload(contractSet),
  };
}

export function buildDesktopPanelRegionMap(panelContracts, policy = getDesktopPanelRendererPolicy()) {
  const contracts = panelContractsFromInput(panelContracts);
  const regionMap = {
    ...basePanelRenderFields(),
    stdout_only: true,
    region_map_type: 'desktop_panel_region_map',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    regions: policy.allowed_region_ids.map((regionId) => regionRecord(regionId, contracts, policy)),
  };

  return {
    ...regionMap,
    region_map_hash: hashPayload(regionMap),
  };
}

export function buildDesktopPanelSummarySurface(panelContracts, policy = getDesktopPanelRendererPolicy()) {
  const contracts = panelContractsFromInput(panelContracts);
  const panelCount = contracts.length;
  const enabledPanelCount = contracts.filter((contract) => contract.enabled === true).length;
  const disabledPanelCount = panelCount - enabledPanelCount;
  const warningPanelCount = contracts.filter((contract) => contract.warning_panel === true).length;
  const summarySurface = {
    ...basePanelRenderFields(),
    stdout_only: true,
    summary_surface_type: 'desktop_panel_summary_surface',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    panel_count: panelCount,
    enabled_panel_count: enabledPanelCount,
    disabled_panel_count: disabledPanelCount,
    warning_panel_count: warningPanelCount,
    attention_item_count: firstContractValue(contracts, 'source_attention_item_count', 0),
    disabled_production_gate_count: firstContractValue(contracts, 'source_disabled_production_gate_count', 0),
    inspection_status: firstContractValue(contracts, 'inspection_status', 'failed'),
    baseline_comparison_status: firstContractValue(contracts, 'baseline_comparison_status', 'failed'),
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
  };

  return {
    ...summarySurface,
    summary_surface_hash: hashPayload(summarySurface),
  };
}

export function buildDesktopPanelAttentionSurface(
  panelContracts,
  inspectionReport,
  policy = getDesktopPanelRendererPolicy()
) {
  const contracts = panelContractsFromInput(panelContracts);
  const attentionSurface = {
    ...basePanelRenderFields(),
    stdout_only: true,
    attention_surface_type: 'desktop_panel_attention_surface',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    attention_panel_ids: contracts.filter((contract) => warningPanel(contract.panel_id)).map((contract) => contract.panel_id),
    attention_item_count: inspectionReport?.attention_item_count ??
      firstContractValue(contracts, 'source_attention_item_count', 0),
    disabled_production_gate_count: inspectionReport?.disabled_production_gate_count ??
      firstContractValue(contracts, 'source_disabled_production_gate_count', 0),
    inspection_status: inspectionReport?.inspection_status || firstContractValue(contracts, 'inspection_status', 'failed'),
    baseline_comparison_status: inspectionReport?.baseline_comparison_status ||
      firstContractValue(contracts, 'baseline_comparison_status', 'failed'),
    failed_guardrail_count: inspectionReport?.failed_guardrail_count || 0,
    missing_guardrail_count: inspectionReport?.missing_guardrail_count || 0,
    unexpected_unsafe_state_count: inspectionReport?.unexpected_unsafe_state_count || 0,
    raw_document_content_included: false,
  };

  return {
    ...attentionSurface,
    attention_surface_hash: hashPayload(attentionSurface),
  };
}

export function renderDesktopPanelContractSummaryText(summary, policy = getDesktopPanelRendererPolicy()) {
  const validation = validateDesktopPanelSummarySurface(summary, policy);
  if (!validation.ok) {
    throw new Error(`Desktop panel contract summary rejected: ${validation.errors.join(' ')}`);
  }
  if (hasRawContent(summary)) {
    throw new Error('Desktop panel contract summary must not include raw document content.');
  }

  return [
    policy.required_panel_render_banner,
    `Panel contracts: ${summary.panel_count}`,
    `Enabled panels: ${summary.enabled_panel_count}`,
    `Disabled panels: ${summary.disabled_panel_count}`,
    `Warning panels: ${summary.warning_panel_count}`,
    `Attention items: ${summary.attention_item_count}`,
    `Disabled production gates: ${summary.disabled_production_gate_count}`,
    `Inspection status: ${summary.inspection_status}`,
    `Baseline comparison: ${summary.baseline_comparison_status}`,
    `Official balances: ${summary.official_balance_status}`,
    `Official reports: ${summary.official_report_status}`,
    `Final exports: ${summary.final_export_status}`,
    `Output: stdout only | In memory only: ${summary.in_memory_only}`,
    'No files, panel state, snapshots, reports, balances, exports, routes, or ledger writes created.',
  ].join('\n');
}

export function runDesktopPanelRendererInspection(argv = [], env = {}, io = {}, policy = getDesktopPanelRendererPolicy()) {
  const resolved = resolveDesktopPanelRendererVaultPath(argv, env, policy);
  if (resolved.help) {
    const stdoutText = `${resolved.usage}\n`;
    writeIo(io.stdout, stdoutText);
    return {
      ...basePanelRenderFields(),
      stdout_only: true,
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
      ...basePanelRenderFields(),
      stdout_only: true,
      ok: false,
      exit_code: resolved.exit_code || 2,
      error: resolved.error,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }

  try {
    const rendererInput = buildDesktopPanelRendererInput(resolved.vault_path, policy);
    const panelContracts = buildDesktopPanelRenderContracts(rendererInput, policy);
    const regionMap = buildDesktopPanelRegionMap(panelContracts, policy);
    const regionValidation = validateDesktopPanelRegionMap(regionMap, policy);
    if (!regionValidation.ok) {
      throw new Error(`Desktop panel region map rejected: ${regionValidation.errors.join(' ')}`);
    }
    const summarySurface = buildDesktopPanelSummarySurface(panelContracts, policy);
    const summaryValidation = validateDesktopPanelSummarySurface(summarySurface, policy);
    if (!summaryValidation.ok) {
      throw new Error(`Desktop panel summary surface rejected: ${summaryValidation.errors.join(' ')}`);
    }
    const attentionSurface = buildDesktopPanelAttentionSurface(
      panelContracts,
      rendererInput.inspection_report,
      policy
    );
    const text = `${renderDesktopPanelContractSummaryText(summarySurface, policy)}\n`;
    writeIo(io.stdout, text);

    const result = {
      ...basePanelRenderFields(),
      stdout_only: true,
      ok: true,
      exit_code: 0,
      vault_path: resolved.vault_path,
      vault_path_source: resolved.source,
      output_target: 'stdout',
      output_file_created: false,
      stdout_text: text,
      stderr_text: '',
      files_written: [],
      renderer_input_hash: rendererInput.renderer_input_hash,
      panel_render_contracts_hash: panelContracts.panel_render_contracts_hash,
      region_map_hash: regionMap.region_map_hash,
      summary_surface_hash: summarySurface.summary_surface_hash,
      attention_surface_hash: attentionSurface.attention_surface_hash,
      panel_contracts: panelContracts,
      region_map: regionMap,
      summary: summarySurface,
      attention_surface: attentionSurface,
      inspection_report: rendererInput.inspection_report,
    };
    const stdoutOnly = verifyDesktopPanelRendererStdoutOnly(result, policy);
    if (!stdoutOnly.ok) {
      throw new Error(`Desktop panel renderer stdout-only guard failed: ${stdoutOnly.errors.join(' ')}`);
    }
    return result;
  } catch (error) {
    const stderrText = `${error.message}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...basePanelRenderFields(),
      stdout_only: true,
      ok: false,
      exit_code: 1,
      error: error.message,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }
}

export function validateDesktopPanelRenderContract(panelContract, policy = getDesktopPanelRendererPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(panelContract)) {
    return { ok: false, errors: ['Desktop panel render contract is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(panelContract, policy.required_panel_render_fields, 'panel_render_contract'));
  if (panelContract.panel_render_contract_type !== 'desktop_panel_render_contract') {
    errors.push('panel_render_contract_type must be desktop_panel_render_contract.');
  }
  const allowedPanelIds = policy.allowed_panels.map((panel) => panel.panel_id);
  if (!allowedPanelIds.includes(panelContract.panel_id)) {
    errors.push(`Unsupported desktop panel: ${panelContract.panel_id || 'unknown'}.`);
  }
  if (!panelContract.label) {
    errors.push('Desktop panel render contract must include label.');
  }
  if (!policy.allowed_region_ids.includes(panelContract.region_id)) {
    errors.push(`Unsupported desktop panel region: ${panelContract.region_id || 'unknown'}.`);
  }
  if (!panelContract.source_view_model) {
    errors.push('Desktop panel render contract must include source_view_model.');
  }
  if (!panelContract.ui_state_key) {
    errors.push('Desktop panel render contract must include ui_state_key.');
  }
  if (panelContract.render_mode !== 'summary_only') {
    errors.push('Desktop panel render contract render_mode must be summary_only.');
  }
  if (panelContract.data_scope !== 'counts_status_and_guardrails_only') {
    errors.push('Desktop panel render contract data_scope must be counts_status_and_guardrails_only.');
  }
  if (panelContract.production_authority !== false) {
    errors.push('Desktop panel render contract production_authority must be false.');
  }
  if (panelContract.raw_document_content_allowed !== false) {
    errors.push('Desktop panel render contract must block raw document content.');
  }
  if (panelContract.mutation_controls_allowed !== false) {
    errors.push('Desktop panel render contract must block mutation controls.');
  }
  if (panelContract.export_controls_allowed !== false) {
    errors.push('Desktop panel render contract must block export controls.');
  }
  if (panelContract.navigation_target_allowed !== true) {
    errors.push('Desktop panel render contract navigation_target_allowed must be true.');
  }
  if (panelContract.public_route_allowed !== false) {
    errors.push('Desktop panel render contract public_route_allowed must be false.');
  }
  if (officialStateEnabled(panelContract)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (hasRawContent(panelContract)) {
    errors.push('Desktop panel render contract must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelRegionMap(regionMap, policy = getDesktopPanelRendererPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(regionMap)) {
    return { ok: false, errors: ['Desktop panel region map is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(regionMap, policy.required_panel_render_fields, 'region_map'));
  if (regionMap.region_map_type !== 'desktop_panel_region_map') {
    errors.push('region_map_type must be desktop_panel_region_map.');
  }
  const regions = asArray(regionMap.regions);
  const actualRegionIds = regions.map((region) => region.region_id);
  for (const regionId of policy.allowed_region_ids) {
    if (!actualRegionIds.includes(regionId)) {
      errors.push(`Missing desktop panel region: ${regionId}.`);
    }
  }
  for (const region of regions) {
    const label = region.region_id || 'unknown';
    if (!policy.allowed_region_ids.includes(region.region_id)) {
      errors.push(`Unsupported desktop panel region: ${label}.`);
    }
    if (region.local_only !== true) {
      errors.push(`Region ${label} must be local-only.`);
    }
    if (region.read_only !== true) {
      errors.push(`Region ${label} must be read-only.`);
    }
    if (region.non_production !== true) {
      errors.push(`Region ${label} must be non-production.`);
    }
    if (region.in_memory_only !== true) {
      errors.push(`Region ${label} must be in-memory only.`);
    }
    if (region.raw_document_content_allowed !== false) {
      errors.push(`Region ${label} must block raw document content.`);
    }
    if (region.mutation_controls_allowed !== false) {
      errors.push(`Region ${label} must block mutation controls.`);
    }
    if (region.export_controls_allowed !== false) {
      errors.push(`Region ${label} must block export controls.`);
    }
    if (region.public_route_allowed !== false) {
      errors.push(`Region ${label} must block public routes.`);
    }
  }
  if (hasRawContent(regionMap)) {
    errors.push('Desktop panel region map must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelSummarySurface(summarySurface, policy = getDesktopPanelRendererPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(summarySurface)) {
    return { ok: false, errors: ['Desktop panel summary surface is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(summarySurface, policy.required_panel_render_fields, 'summary_surface'));
  if (summarySurface.summary_surface_type !== 'desktop_panel_summary_surface') {
    errors.push('summary_surface_type must be desktop_panel_summary_surface.');
  }
  if (summarySurface.stdout_only !== true) {
    errors.push('Desktop panel summary surface must be stdout-only.');
  }
  for (const countField of [
    'panel_count',
    'enabled_panel_count',
    'disabled_panel_count',
    'warning_panel_count',
    'attention_item_count',
    'disabled_production_gate_count',
  ]) {
    if (!Number.isFinite(summarySurface[countField]) || summarySurface[countField] < 0) {
      errors.push(`${countField} must be a non-negative number.`);
    }
  }
  if (summarySurface.panel_count <= 0) {
    errors.push('Desktop panel summary surface must include panel_count.');
  }
  if (!['passed', 'failed'].includes(summarySurface.inspection_status)) {
    errors.push('inspection_status must be passed or failed.');
  }
  if (!['passed', 'failed'].includes(summarySurface.baseline_comparison_status)) {
    errors.push('baseline_comparison_status must be passed or failed.');
  }
  if (officialStateEnabled(summarySurface)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (summarySurface.output_target && summarySurface.output_target !== 'stdout') {
    errors.push('Desktop panel summary surface output_target must be stdout.');
  }
  if (summarySurface.output_file_created === true) {
    errors.push('Desktop panel summary surface must not create output files.');
  }
  if (asArray(summarySurface.files_written).length > 0) {
    errors.push('Desktop panel summary surface must not write files.');
  }
  if (hasRawContent(summarySurface)) {
    errors.push('Desktop panel summary surface must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function verifyDesktopPanelRendererStdoutOnly(result, policy = getDesktopPanelRendererPolicy()) {
  const errors = [];

  if (!isPlainObject(result)) {
    return { ok: false, errors: ['Desktop panel renderer result is required.'] };
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
    errors.push('Successful desktop panel renderer runs must not write stderr.');
  }
  if (result.ok === true && !String(result.stdout_text || '').includes(policy.required_panel_render_banner)) {
    errors.push('Successful desktop panel renderer stdout must include the required banner.');
  }
  if (hasRawContent(result)) {
    errors.push('Desktop panel renderer result must not include raw document content.');
  }

  return {
    ok: errors.length === 0,
    errors: unique(errors),
    stdout_only: true,
    in_memory_only: true,
  };
}

export function verifyDesktopPanelRendererReadOnly(vaultPathInput, policy = getDesktopPanelRendererPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const rendererMatches = policy.forbidden_panel_renderer_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const inspectionReadOnly = verifyDesktopContractInspectionReadOnly(vaultPath, policy.inspection_policy);
  const presentPaths = Array.from(new Set([
    ...rendererMatches,
    ...inspectionReadOnly.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    in_memory_only: true,
    present_paths: presentPaths,
    forbidden_panel_renderer_write_targets: [...policy.forbidden_panel_renderer_write_targets],
  };
}

export function verifyNoDesktopPanelRendererExports(vaultPathInput, policy = getDesktopPanelRendererPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const files = listFilesRecursive(vaultPath);
  const localMatches = files.filter((filePath) => isForbiddenExportPath(filePath, vaultPath, policy));
  const inspectionExports = verifyNoDesktopContractInspectionExports(vaultPath, policy.inspection_policy);
  const presentPaths = Array.from(new Set([
    ...localMatches,
    ...inspectionExports.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(inspectionExports.errors)],
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifyNoDesktopPanelRendererPublicFiles(vaultPathInput, policy = getDesktopPanelRendererPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));
  const inspectionPublic = verifyNoDesktopContractInspectionPublicFiles(vaultPath, policy.inspection_policy);
  const presentPaths = Array.from(new Set([
    ...publicMatches,
    ...inspectionPublic.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(inspectionPublic.errors)],
    public_path_rejection: true,
    present_paths: presentPaths,
  };
}

export function verifyNoDesktopPanelRendererRuntimeState(vaultPathInput, policy = getDesktopPanelRendererPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const directMatches = policy.forbidden_panel_renderer_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const files = listFilesRecursive(vaultPath);
  const runtimeMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    return relativePath.includes('runtime-panel-state') ||
      relativePath.includes('desktop-panel-state') ||
      relativePath.includes('panel-render-state') ||
      relativePath.includes('desktop-panel-render-contracts.json');
  });
  const presentPaths = Array.from(new Set([...directMatches, ...runtimeMatches]));

  return {
    ok: presentPaths.length === 0,
    in_memory_only: true,
    runtime_state_persistence_enabled: false,
    present_paths: presentPaths,
  };
}

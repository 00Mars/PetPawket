import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import {
  buildDesktopPanelAttentionSurface,
  buildDesktopPanelRegionMap,
  buildDesktopPanelRenderContracts,
  buildDesktopPanelRendererInput,
  buildDesktopPanelSummarySurface,
  getDesktopPanelRendererPolicy,
  verifyDesktopPanelRendererReadOnly,
  verifyDesktopPanelRendererStdoutOnly,
  verifyNoDesktopPanelRendererExports,
  verifyNoDesktopPanelRendererPublicFiles,
  verifyNoDesktopPanelRendererRuntimeState,
} from './pawketAdminDesktopPanelRenderer.js';

export const DESKTOP_PANEL_NAVIGATION_VERSION = 'pawket-admin-desktop-panel-navigation-v0';

const REQUIRED_NAVIGATION_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  in_memory_only: true,
  stdout_only: true,
  runtime_state_persistence_enabled: false,
  navigation_state_persistence_enabled: false,
  focus_state_persistence_enabled: false,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_panel_navigation_contract',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
  connector_networking_enabled: false,
  document_upload_enabled: false,
  public_route_enabled: false,
});

const KEYBOARD_ACTIONS = Object.freeze([
  ['move_next_panel', 'Move to next panel', 'next_panel'],
  ['move_previous_panel', 'Move to previous panel', 'previous_panel'],
  ['move_to_attention_rail', 'Move to attention rail', 'attention_rail'],
  ['move_to_main_panel', 'Move to main panel', 'main_panel'],
  ['move_to_disabled_gates', 'Move to disabled production gates', 'disabled_production_gates'],
  ['open_help_overlay_read_only', 'Open read-only help overlay', 'help_overlay_read_only'],
]);

const ATTENTION_ROUTES = Object.freeze([
  ['missing_evidence', 'evidence'],
  ['unresolved_risk', 'blockers'],
  ['rejected_review', 'report_review'],
  ['rejected_report_review', 'report_review'],
  ['privacy_blocker', 'blockers'],
  ['redaction_blocker', 'warnings'],
  ['disabled_production_gate', 'disabled_production_gates'],
  ['packaging_blocker', 'disabled_production_gates'],
  ['malformed_local_record', 'blockers'],
]);

const DISABLED_ACTIONS = Object.freeze([
  ['create_ledger_entry', 'create ledger entry', 'ledger'],
  ['commit_ledger_entry', 'commit ledger entry', 'ledger'],
  ['edit_finance_record', 'edit finance record', 'mutation'],
  ['approve_production_ledger', 'approve production ledger', 'ledger'],
  ['create_official_balance', 'create official balance', 'balance'],
  ['create_official_report', 'create official report', 'report'],
  ['create_final_export', 'create final export', 'export'],
  ['generate_pdf', 'generate PDF', 'export'],
  ['generate_csv', 'generate CSV', 'export'],
  ['generate_xlsx', 'generate XLSX', 'export'],
  ['generate_zip', 'generate ZIP', 'export'],
  ['upload_document', 'upload document', 'document'],
  ['connect_live_connector', 'connect live connector', 'connector'],
  ['publish_public_impact_claim', 'publish public impact claim', 'public'],
  ['send_accountant_package', 'send accountant package', 'export'],
  ['send_investor_package', 'send investor package', 'export'],
  ['send_irs_package', 'send IRS package', 'export'],
  ['package_desktop_app', 'package desktop app', 'packaging'],
]);

const NAVIGATION_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-panel-navigation-contract.ndjson',
  'manifests/desktop-panel-focus-model.ndjson',
  'manifests/desktop-panel-keyboard-map.ndjson',
  'manifests/desktop-panel-attention-routing.ndjson',
  'manifests/desktop-panel-disabled-action-surfaces.ndjson',
  'reports/desktop-panel-navigation-summary.txt',
  'reports/desktop-panel-navigation-summary.json',
  'exports/desktop-panel-navigation-summary.txt',
  'exports/desktop-panel-navigation-summary.json',
  'snapshots/desktop-panel-navigation-contract.json',
  'runtime/desktop-panel-navigation-state.json',
  'runtime/desktop-panel-focus-state.json',
  'ui/desktop-panel-navigation-contract.json',
  'ui/desktop-panel-focus-model.json',
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

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function baseNavigationFields() {
  return { ...REQUIRED_NAVIGATION_FIELDS };
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
  return [...new Set((values || []).filter(Boolean))];
}

function hashPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

function writeIo(stream, text) {
  if (stream && typeof stream.write === 'function') {
    stream.write(text);
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

function pathHasPublicSegment(inputPath) {
  return path.resolve(inputPath).split(path.sep).filter(Boolean).includes('public');
}

function isForbiddenExportPath(filePath, rootPath, policy) {
  const relativePath = rootPath
    ? path.relative(rootPath, filePath).replaceAll(path.sep, '/').toLowerCase()
    : path.resolve(filePath).replaceAll(path.sep, '/').toLowerCase();
  const extension = path.extname(filePath).toLowerCase();
  return policy.forbidden_export_file_extensions.includes(extension) ||
    policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
}

function assertVaultPath(inputPath, policy, label = 'Pawket Admin desktop panel navigation vault path') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error(`${label} is required.`);
  }
  const resolvedPath = path.resolve(inputPath);
  if (pathHasPublicSegment(resolvedPath)) {
    throw new Error(`${label} must not be under public/.`);
  }
  if (isForbiddenExportPath(resolvedPath, undefined, policy)) {
    throw new Error(`${label} must not point at report, balance, export, or ledger artifact paths.`);
  }
  return resolvedPath;
}

function parseVaultPathArg(argv) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--vault') {
      return argv[index + 1];
    }
    if (arg.startsWith('--vault=')) {
      return arg.slice('--vault='.length);
    }
  }
  return null;
}

function usageText() {
  return [
    'Usage: npm run pawket-admin:desktop-navigation:inspect -- [--vault <path>]',
    'Prints a local read-only non-production desktop panel navigation/focus contract summary to stdout.',
    'No files, exports, reports, balances, routes, runtime navigation state, focus state, or ledger writes are created.',
  ].join('\n');
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
  return record.official_balance_status !== 'disabled' ||
    record.official_report_status !== 'disabled' ||
    record.final_export_status !== 'disabled';
}

function panelContractsFromInput(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (Array.isArray(input?.contracts)) {
    return input.contracts;
  }
  if (Array.isArray(input?.panel_render_contracts?.contracts)) {
    return input.panel_render_contracts.contracts;
  }
  if (Array.isArray(input?.panel_contracts?.contracts)) {
    return input.panel_contracts.contracts;
  }
  if (Array.isArray(input?.panel_contracts)) {
    return input.panel_contracts;
  }
  return [];
}

function regionRecordsFromInput(input) {
  if (Array.isArray(input)) {
    return input;
  }
  if (Array.isArray(input?.regions)) {
    return input.regions;
  }
  if (Array.isArray(input?.region_map?.regions)) {
    return input.region_map.regions;
  }
  return [];
}

function panelLabel(panelContracts, panelId) {
  return panelContracts.find((contract) => contract.panel_id === panelId)?.label || panelId;
}

function safeActionRecord([actionId, label, category]) {
  return {
    action_id: actionId,
    label,
    category,
    enabled: false,
    unavailable: true,
    read_only: true,
    side_effects_enabled: false,
    mutation_enabled: false,
    export_enabled: false,
    persistence_enabled: false,
    production_authority: false,
  };
}

function requiredNavigationFieldErrors(record, label, policy) {
  const errors = fieldMismatchErrors(record, policy.required_navigation_fields, label);
  if (officialStateEnabled(record)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (hasRawContent(record)) {
    errors.push(`${label} must not include raw document content.`);
  }
  return errors;
}

export function getDesktopPanelNavigationPolicy() {
  const rendererPolicy = getDesktopPanelRendererPolicy();
  return {
    policy_version: DESKTOP_PANEL_NAVIGATION_VERSION,
    ...baseNavigationFields(),
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    raw_document_content_allowed: false,
    default_sample_vault_path: rendererPolicy.default_sample_vault_path,
    required_navigation_banner: 'PAWKET ADMIN DESKTOP PANEL NAVIGATION — NON-PRODUCTION',
    required_navigation_fields: { ...REQUIRED_NAVIGATION_FIELDS },
    renderer_policy: rendererPolicy,
    allowed_panels: rendererPolicy.allowed_panels.map((panel) => ({ ...panel })),
    allowed_region_ids: [...rendererPolicy.allowed_region_ids],
    default_panel_id: 'overview',
    keyboard_action_templates: KEYBOARD_ACTIONS.map(([action_id, label, target]) => ({ action_id, label, target })),
    attention_route_templates: ATTENTION_ROUTES.map(([attention_type, target_panel_id]) => ({
      attention_type,
      target_panel_id,
    })),
    disabled_action_templates: DISABLED_ACTIONS.map(([action_id, label, category]) => ({
      action_id,
      label,
      category,
    })),
    forbidden_export_file_extensions: Array.from(new Set([
      ...rendererPolicy.forbidden_export_file_extensions,
      ...FORBIDDEN_EXPORT_EXTENSIONS,
    ])),
    forbidden_export_paths: Array.from(new Set([
      ...rendererPolicy.forbidden_export_paths,
      ...FORBIDDEN_EXPORT_PATH_PATTERNS,
    ])),
    forbidden_navigation_write_targets: [...NAVIGATION_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: Array.from(new Set([
      ...rendererPolicy.blocked_production_actions,
      'desktop_panel_navigation_state_persistence',
      'desktop_panel_focus_state_persistence',
      'desktop_panel_navigation_file_write',
      'desktop_panel_navigation_public_route',
    ])),
  };
}

export function resolveDesktopPanelNavigationVaultPath(argv = [], env = {}, policy = getDesktopPanelNavigationPolicy()) {
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
  const envVaultPath = env.PAWKET_ADMIN_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_PANEL_RENDERER_VAULT_PATH ||
    env.PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_VAULT_PATH;
  const vaultPath = argvVaultPath || envVaultPath || policy.default_sample_vault_path;

  try {
    return {
      ok: true,
      vault_path: assertVaultPath(vaultPath, policy),
      source: argvVaultPath ? 'argv' : (envVaultPath ? 'env' : 'default_sample_vault'),
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

export function buildDesktopPanelNavigationInput(vaultPathInput, policy = getDesktopPanelNavigationPolicy()) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const readOnly = verifyDesktopPanelNavigationReadOnly(vaultPath, policy);
  if (!readOnly.ok) {
    throw new Error(`Desktop panel navigation read-only guard failed: ${readOnly.present_paths.join(', ')}`);
  }
  const noPublic = verifyNoDesktopPanelNavigationPublicFiles(vaultPath, policy);
  if (!noPublic.ok) {
    throw new Error(`Desktop panel navigation public path guard failed: ${noPublic.present_paths.join(', ') || noPublic.errors.join(' ')}`);
  }
  const noExports = verifyNoDesktopPanelNavigationExports(vaultPath, policy);
  if (!noExports.ok) {
    throw new Error(`Desktop panel navigation export guard failed: ${noExports.present_paths.join(', ') || noExports.errors.join(' ')}`);
  }
  const noRuntimeState = verifyNoDesktopPanelNavigationRuntimeState(vaultPath, policy);
  if (!noRuntimeState.ok) {
    throw new Error(`Desktop panel navigation runtime-state guard failed: ${noRuntimeState.present_paths.join(', ')}`);
  }

  const rendererInput = buildDesktopPanelRendererInput(vaultPath, policy.renderer_policy);
  const panelRenderContracts = buildDesktopPanelRenderContracts(rendererInput, policy.renderer_policy);
  const regionMap = buildDesktopPanelRegionMap(panelRenderContracts, policy.renderer_policy);
  const summarySurface = buildDesktopPanelSummarySurface(panelRenderContracts, policy.renderer_policy);
  const attentionSurface = buildDesktopPanelAttentionSurface(
    panelRenderContracts,
    rendererInput.inspection_report,
    policy.renderer_policy
  );

  const navigationInput = {
    ...baseNavigationFields(),
    navigation_input_type: 'desktop_panel_navigation_input',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    vault_path: vaultPath,
    renderer_input: rendererInput,
    panel_render_contracts: panelRenderContracts,
    region_map: regionMap,
    summary_surface: summarySurface,
    attention_surface: attentionSurface,
    inspection_report: rendererInput.inspection_report,
  };

  return {
    ...navigationInput,
    navigation_input_hash: hashPayload(navigationInput),
  };
}

export function buildDesktopPanelSelectionState(panelContracts, policy = getDesktopPanelNavigationPolicy()) {
  const contracts = panelContractsFromInput(panelContracts);
  const allowedPanelIds = contracts.map((contract) => contract.panel_id);
  const defaultPanelId = allowedPanelIds.includes(policy.default_panel_id)
    ? policy.default_panel_id
    : allowedPanelIds[0];
  const selectionState = {
    ...baseNavigationFields(),
    selection_state_type: 'desktop_panel_selection_state',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    selected_panel_id: defaultPanelId,
    default_panel_id: defaultPanelId,
    allowed_panel_ids: allowedPanelIds,
    disabled_panel_ids: contracts.filter((contract) => contract.enabled === false).map((contract) => contract.panel_id),
    selection_mode: 'in_memory_only',
    persistence_enabled: false,
    public_route_sync_enabled: false,
    mutation_side_effects_enabled: false,
    export_side_effects_enabled: false,
  };

  return {
    ...selectionState,
    selection_state_hash: hashPayload(selectionState),
  };
}

export function buildDesktopPanelFocusModel(panelContracts, regionMap, policy = getDesktopPanelNavigationPolicy()) {
  const contracts = panelContractsFromInput(panelContracts);
  const regions = regionRecordsFromInput(regionMap);
  const regionIds = regions.map((region) => region.region_id);
  const focusRegionOrder = policy.allowed_region_ids.filter((regionId) => regionIds.includes(regionId));
  const focusModel = {
    ...baseNavigationFields(),
    focus_model_type: 'desktop_panel_focus_model',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    focus_region_order: focusRegionOrder,
    focusable_panel_ids: contracts.filter((contract) => contract.enabled !== false).map((contract) => contract.panel_id),
    focusable_region_ids: focusRegionOrder,
    trap_focus_enabled: false,
    browser_route_focus_enabled: false,
    persistence_enabled: false,
    raw_document_focus_allowed: false,
    mutation_control_focus_allowed: false,
    export_control_focus_allowed: false,
  };

  return {
    ...focusModel,
    focus_model_hash: hashPayload(focusModel),
  };
}

export function buildDesktopPanelKeyboardMap(panelContracts, regionMap, policy = getDesktopPanelNavigationPolicy()) {
  const contracts = panelContractsFromInput(panelContracts);
  const regions = regionRecordsFromInput(regionMap);
  const allowedPanelIds = contracts.map((contract) => contract.panel_id);
  const allowedRegionIds = regions.map((region) => region.region_id);
  const keyboardMap = {
    ...baseNavigationFields(),
    keyboard_map_type: 'desktop_panel_keyboard_map',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    allowed_panel_ids: allowedPanelIds,
    allowed_region_ids: allowedRegionIds,
    actions: policy.keyboard_action_templates.map((template) => ({
      action_id: template.action_id,
      label: template.label,
      target: template.target,
      read_only: true,
      side_effects_enabled: false,
      mutation_enabled: false,
      export_enabled: false,
      persistence_enabled: false,
      production_authority: false,
    })),
  };

  return {
    ...keyboardMap,
    keyboard_map_hash: hashPayload(keyboardMap),
  };
}

export function buildDesktopPanelAttentionRouting(
  panelContracts,
  attentionSurface,
  policy = getDesktopPanelNavigationPolicy()
) {
  const contracts = panelContractsFromInput(panelContracts);
  const allowedPanelIds = contracts.map((contract) => contract.panel_id);
  const routes = policy.attention_route_templates.map((template) => ({
    route_id: `${template.attention_type}_to_${template.target_panel_id}`,
    attention_type: template.attention_type,
    target_panel_id: template.target_panel_id,
    target_panel_label: panelLabel(contracts, template.target_panel_id),
    route_mode: 'panel_summary_only',
    read_only: true,
    opens_raw_documents: false,
    opens_exports: false,
    opens_reports: false,
    opens_public_routes: false,
    mutation_flow_enabled: false,
    export_flow_enabled: false,
    production_authority: false,
    enabled: allowedPanelIds.includes(template.target_panel_id),
  }));
  const attentionRouting = {
    ...baseNavigationFields(),
    attention_routing_type: 'desktop_panel_attention_routing',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    attention_item_count: attentionSurface?.attention_item_count || 0,
    disabled_production_gate_count: attentionSurface?.disabled_production_gate_count || 0,
    routes,
  };

  return {
    ...attentionRouting,
    attention_routing_hash: hashPayload(attentionRouting),
  };
}

export function buildDesktopPanelDisabledActionSurfaces(
  panelContracts,
  policy = getDesktopPanelNavigationPolicy()
) {
  const contracts = panelContractsFromInput(panelContracts);
  const disabledActionSurfaces = {
    ...baseNavigationFields(),
    disabled_action_surfaces_type: 'desktop_panel_disabled_action_surfaces',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    surfaces: contracts.map((contract) => ({
      panel_id: contract.panel_id,
      label: contract.label,
      read_only: true,
      local_only: true,
      non_production: true,
      in_memory_only: true,
      mutation_controls_allowed: false,
      export_controls_allowed: false,
      production_authority: false,
      disabled_actions: DISABLED_ACTIONS.map((action) => safeActionRecord(action)),
    })),
  };

  return {
    ...disabledActionSurfaces,
    disabled_action_surfaces_hash: hashPayload(disabledActionSurfaces),
  };
}

export function buildDesktopPanelNavigationContract(
  panelRendererOutput,
  policy = getDesktopPanelNavigationPolicy()
) {
  const panelRenderContracts = panelRendererOutput?.panel_render_contracts ||
    panelRendererOutput?.panel_contracts ||
    panelRendererOutput;
  const contracts = panelContractsFromInput(panelRenderContracts);
  if (!contracts.length) {
    throw new Error('Desktop panel navigation requires panel render contracts.');
  }
  const regionMap = panelRendererOutput?.region_map ||
    buildDesktopPanelRegionMap(panelRenderContracts, policy.renderer_policy);
  const summarySurface = panelRendererOutput?.summary_surface ||
    panelRendererOutput?.summary ||
    buildDesktopPanelSummarySurface(panelRenderContracts, policy.renderer_policy);
  const attentionSurface = panelRendererOutput?.attention_surface ||
    buildDesktopPanelAttentionSurface(panelRenderContracts, panelRendererOutput?.inspection_report, policy.renderer_policy);
  const selectionState = buildDesktopPanelSelectionState(panelRenderContracts, policy);
  const focusModel = buildDesktopPanelFocusModel(panelRenderContracts, regionMap, policy);
  const keyboardMap = buildDesktopPanelKeyboardMap(panelRenderContracts, regionMap, policy);
  const attentionRouting = buildDesktopPanelAttentionRouting(panelRenderContracts, attentionSurface, policy);
  const disabledActionSurfaces = buildDesktopPanelDisabledActionSurfaces(panelRenderContracts, policy);

  const navigationContract = {
    ...baseNavigationFields(),
    navigation_contract_type: 'desktop_panel_navigation_contract',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    panel_render_contracts_hash: panelRenderContracts?.panel_render_contracts_hash || '',
    region_map_hash: regionMap?.region_map_hash || '',
    summary_surface_hash: summarySurface?.summary_surface_hash || '',
    attention_surface_hash: attentionSurface?.attention_surface_hash || '',
    panel_count: contracts.length,
    allowed_panel_count: selectionState.allowed_panel_ids.length,
    disabled_panel_count: selectionState.disabled_panel_ids.length,
    focus_region_count: focusModel.focus_region_order.length,
    keyboard_action_count: keyboardMap.actions.length,
    attention_route_count: attentionRouting.routes.length,
    disabled_action_surface_count: disabledActionSurfaces.surfaces.length,
    disabled_action_count: disabledActionSurfaces.surfaces.reduce((sum, surface) => (
      sum + asArray(surface.disabled_actions).length
    ), 0),
    selection_state: selectionState,
    focus_model: focusModel,
    keyboard_map: keyboardMap,
    attention_routing: attentionRouting,
    disabled_action_surfaces: disabledActionSurfaces,
    region_map: regionMap,
    summary_surface: summarySurface,
    attention_surface: attentionSurface,
  };

  return {
    ...navigationContract,
    navigation_contract_hash: hashPayload(navigationContract),
  };
}

export function buildDesktopPanelNavigationSummary(
  navigationContract,
  policy = getDesktopPanelNavigationPolicy()
) {
  const validation = validateDesktopPanelNavigationContract(navigationContract, policy);
  const summary = {
    ...baseNavigationFields(),
    navigation_summary_type: 'desktop_panel_navigation_summary',
    policy_version: policy.policy_version,
    generated_at: nowIso(),
    navigation_validation_status: validation.ok ? 'passed' : 'failed',
    selected_panel_id: navigationContract?.selection_state?.selected_panel_id || '',
    allowed_panel_count: navigationContract?.allowed_panel_count || 0,
    disabled_panel_count: navigationContract?.disabled_panel_count || 0,
    focus_region_count: navigationContract?.focus_region_count || 0,
    keyboard_action_count: navigationContract?.keyboard_action_count || 0,
    attention_route_count: navigationContract?.attention_route_count || 0,
    disabled_action_surface_count: navigationContract?.disabled_action_surface_count || 0,
    disabled_action_count: navigationContract?.disabled_action_count || 0,
    official_balance_status: 'disabled',
    official_report_status: 'disabled',
    final_export_status: 'disabled',
    output_target: 'stdout',
    output_file_created: false,
    files_written: [],
    validation_errors: validation.errors,
  };

  return {
    ...summary,
    navigation_summary_hash: hashPayload(summary),
  };
}

export function renderDesktopPanelNavigationSummaryText(summary, policy = getDesktopPanelNavigationPolicy()) {
  const errors = requiredNavigationFieldErrors(summary, 'navigation_summary', policy);
  if (summary.navigation_summary_type !== 'desktop_panel_navigation_summary') {
    errors.push('navigation_summary_type must be desktop_panel_navigation_summary.');
  }
  if (summary.output_target && summary.output_target !== 'stdout') {
    errors.push('Desktop panel navigation summary output_target must be stdout.');
  }
  if (summary.output_file_created === true) {
    errors.push('Desktop panel navigation summary must not create output files.');
  }
  if (asArray(summary.files_written).length > 0) {
    errors.push('Desktop panel navigation summary must not write files.');
  }
  if (errors.length) {
    throw new Error(`Desktop panel navigation summary rejected: ${unique(errors).join(' ')}`);
  }

  return [
    policy.required_navigation_banner,
    `Navigation validation: ${summary.navigation_validation_status}`,
    `Selected panel: ${summary.selected_panel_id}`,
    `Allowed panels: ${summary.allowed_panel_count}`,
    `Disabled panels: ${summary.disabled_panel_count}`,
    `Focus regions: ${summary.focus_region_count}`,
    `Keyboard actions: ${summary.keyboard_action_count}`,
    `Attention routes: ${summary.attention_route_count}`,
    `Disabled action surfaces: ${summary.disabled_action_surface_count}`,
    `Disabled actions: ${summary.disabled_action_count}`,
    `Official balances: ${summary.official_balance_status}`,
    `Official reports: ${summary.official_report_status}`,
    `Final exports: ${summary.final_export_status}`,
    `Output: stdout only | In memory only: ${summary.in_memory_only}`,
    'No files, navigation state, focus state, snapshots, reports, balances, exports, routes, or ledger writes created.',
  ].join('\n');
}

export function runDesktopPanelNavigationInspection(
  argv = [],
  env = {},
  io = {},
  policy = getDesktopPanelNavigationPolicy()
) {
  const resolved = resolveDesktopPanelNavigationVaultPath(argv, env, policy);
  if (resolved.help) {
    const stdoutText = `${resolved.usage}\n`;
    writeIo(io.stdout, stdoutText);
    return {
      ...baseNavigationFields(),
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
      ...baseNavigationFields(),
      ok: false,
      exit_code: resolved.exit_code || 2,
      error: resolved.error,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }

  try {
    const navigationInput = buildDesktopPanelNavigationInput(resolved.vault_path, policy);
    const navigationContract = buildDesktopPanelNavigationContract(navigationInput, policy);
    const validation = validateDesktopPanelNavigationContract(navigationContract, policy);
    if (!validation.ok) {
      throw new Error(`Desktop panel navigation contract rejected: ${validation.errors.join(' ')}`);
    }
    const summary = buildDesktopPanelNavigationSummary(navigationContract, policy);
    const text = `${renderDesktopPanelNavigationSummaryText(summary, policy)}\n`;
    writeIo(io.stdout, text);

    const result = {
      ...baseNavigationFields(),
      ok: true,
      exit_code: 0,
      vault_path: resolved.vault_path,
      vault_path_source: resolved.source,
      output_target: 'stdout',
      output_file_created: false,
      stdout_text: text,
      stderr_text: '',
      files_written: [],
      navigation_input_hash: navigationInput.navigation_input_hash,
      navigation_contract_hash: navigationContract.navigation_contract_hash,
      navigation_summary_hash: summary.navigation_summary_hash,
      navigation_contract: navigationContract,
      summary,
    };
    const stdoutOnly = verifyDesktopPanelNavigationStdoutOnly(result, policy);
    if (!stdoutOnly.ok) {
      throw new Error(`Desktop panel navigation stdout-only guard failed: ${stdoutOnly.errors.join(' ')}`);
    }
    return result;
  } catch (error) {
    const stderrText = `${error.message}\n`;
    writeIo(io.stderr, stderrText);
    return {
      ...baseNavigationFields(),
      ok: false,
      exit_code: 1,
      error: error.message,
      stdout_text: '',
      stderr_text: stderrText,
      files_written: [],
    };
  }
}

export function validateDesktopPanelNavigationContract(
  navigationContract,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(navigationContract)) {
    return { ok: false, errors: ['Desktop panel navigation contract is required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(navigationContract, 'navigation_contract', policy));
  if (navigationContract.navigation_contract_type !== 'desktop_panel_navigation_contract') {
    errors.push('navigation_contract_type must be desktop_panel_navigation_contract.');
  }
  if (!Number.isFinite(navigationContract.panel_count) || navigationContract.panel_count <= 0) {
    errors.push('panel_count must be a positive number.');
  }
  const selectionValidation = validateDesktopPanelSelectionState(navigationContract.selection_state, policy);
  const focusValidation = validateDesktopPanelFocusModel(navigationContract.focus_model, policy);
  const keyboardValidation = validateDesktopPanelKeyboardMap(navigationContract.keyboard_map, policy);
  const attentionValidation = validateDesktopPanelAttentionRouting(navigationContract.attention_routing, policy);
  const disabledActionValidation = validateDesktopPanelDisabledActionSurfaces(
    navigationContract.disabled_action_surfaces,
    policy
  );
  errors.push(
    ...selectionValidation.errors,
    ...focusValidation.errors,
    ...keyboardValidation.errors,
    ...attentionValidation.errors,
    ...disabledActionValidation.errors
  );

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelSelectionState(
  selectionState,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(selectionState)) {
    return { ok: false, errors: ['Desktop panel selection state is required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(selectionState, 'selection_state', policy));
  if (selectionState.selection_state_type !== 'desktop_panel_selection_state') {
    errors.push('selection_state_type must be desktop_panel_selection_state.');
  }
  const allowedPanelIds = asArray(selectionState.allowed_panel_ids);
  if (!allowedPanelIds.length) {
    errors.push('Selection state must include allowed_panel_ids.');
  }
  if (!allowedPanelIds.includes(selectionState.selected_panel_id)) {
    errors.push(`selected_panel_id is not allowed: ${selectionState.selected_panel_id || 'unknown'}.`);
  }
  if (!allowedPanelIds.includes(selectionState.default_panel_id)) {
    errors.push(`default_panel_id is not allowed: ${selectionState.default_panel_id || 'unknown'}.`);
  }
  if (selectionState.selection_mode !== 'in_memory_only') {
    errors.push('selection_mode must be in_memory_only.');
  }
  if (selectionState.persistence_enabled !== false) {
    errors.push('selection_state.persistence_enabled must be false.');
  }
  if (selectionState.public_route_sync_enabled !== false) {
    errors.push('selection_state.public_route_sync_enabled must be false.');
  }
  if (selectionState.mutation_side_effects_enabled !== false) {
    errors.push('selection_state.mutation_side_effects_enabled must be false.');
  }
  if (selectionState.export_side_effects_enabled !== false) {
    errors.push('selection_state.export_side_effects_enabled must be false.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelFocusModel(
  focusModel,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(focusModel)) {
    return { ok: false, errors: ['Desktop panel focus model is required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(focusModel, 'focus_model', policy));
  if (focusModel.focus_model_type !== 'desktop_panel_focus_model') {
    errors.push('focus_model_type must be desktop_panel_focus_model.');
  }
  const focusRegionOrder = asArray(focusModel.focus_region_order);
  if (!focusRegionOrder.length) {
    errors.push('focus_region_order is required.');
  }
  for (const regionId of focusRegionOrder) {
    if (!policy.allowed_region_ids.includes(regionId)) {
      errors.push(`Unsupported focus region: ${regionId}.`);
    }
  }
  if (focusModel.trap_focus_enabled !== false) {
    errors.push('trap_focus_enabled must be false.');
  }
  if (focusModel.browser_route_focus_enabled !== false) {
    errors.push('browser_route_focus_enabled must be false.');
  }
  if (focusModel.persistence_enabled !== false) {
    errors.push('focus_model.persistence_enabled must be false.');
  }
  if (focusModel.raw_document_focus_allowed !== false) {
    errors.push('raw_document_focus_allowed must be false.');
  }
  if (focusModel.mutation_control_focus_allowed !== false) {
    errors.push('mutation_control_focus_allowed must be false.');
  }
  if (focusModel.export_control_focus_allowed !== false) {
    errors.push('export_control_focus_allowed must be false.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelKeyboardMap(
  keyboardMap,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(keyboardMap)) {
    return { ok: false, errors: ['Desktop panel keyboard map is required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(keyboardMap, 'keyboard_map', policy));
  if (keyboardMap.keyboard_map_type !== 'desktop_panel_keyboard_map') {
    errors.push('keyboard_map_type must be desktop_panel_keyboard_map.');
  }
  const actions = asArray(keyboardMap.actions);
  const actionIds = actions.map((action) => action.action_id);
  for (const requiredAction of policy.keyboard_action_templates) {
    if (!actionIds.includes(requiredAction.action_id)) {
      errors.push(`Missing keyboard action: ${requiredAction.action_id}.`);
    }
  }
  for (const action of actions) {
    const label = action.action_id || 'unknown';
    if (action.read_only !== true) {
      errors.push(`Keyboard action ${label} must be read-only.`);
    }
    if (action.side_effects_enabled !== false) {
      errors.push(`Keyboard action ${label} side effects must be disabled.`);
    }
    if (action.mutation_enabled !== false) {
      errors.push(`Keyboard action ${label} mutation must be disabled.`);
    }
    if (action.export_enabled !== false) {
      errors.push(`Keyboard action ${label} export must be disabled.`);
    }
    if (action.persistence_enabled !== false) {
      errors.push(`Keyboard action ${label} persistence must be disabled.`);
    }
    if (action.production_authority !== false) {
      errors.push(`Keyboard action ${label} production authority must be false.`);
    }
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelAttentionRouting(
  attentionRouting,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(attentionRouting)) {
    return { ok: false, errors: ['Desktop panel attention routing is required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(attentionRouting, 'attention_routing', policy));
  if (attentionRouting.attention_routing_type !== 'desktop_panel_attention_routing') {
    errors.push('attention_routing_type must be desktop_panel_attention_routing.');
  }
  const routes = asArray(attentionRouting.routes);
  const routeTypes = routes.map((route) => route.attention_type);
  for (const requiredRoute of policy.attention_route_templates) {
    if (!routeTypes.includes(requiredRoute.attention_type)) {
      errors.push(`Missing attention route: ${requiredRoute.attention_type}.`);
    }
  }
  const allowedPanelIds = policy.allowed_panels.map((panel) => panel.panel_id);
  for (const route of routes) {
    const label = route.route_id || route.attention_type || 'unknown';
    if (!allowedPanelIds.includes(route.target_panel_id)) {
      errors.push(`Attention route ${label} must target a safe panel.`);
    }
    if (route.route_mode !== 'panel_summary_only') {
      errors.push(`Attention route ${label} route_mode must be panel_summary_only.`);
    }
    if (route.read_only !== true) {
      errors.push(`Attention route ${label} must be read-only.`);
    }
    if (route.opens_raw_documents !== false) {
      errors.push(`Attention route ${label} must not open raw documents.`);
    }
    if (route.opens_exports !== false) {
      errors.push(`Attention route ${label} must not open exports.`);
    }
    if (route.opens_reports !== false) {
      errors.push(`Attention route ${label} must not open reports.`);
    }
    if (route.opens_public_routes !== false) {
      errors.push(`Attention route ${label} must not open public routes.`);
    }
    if (route.mutation_flow_enabled !== false) {
      errors.push(`Attention route ${label} mutation flow must be disabled.`);
    }
    if (route.export_flow_enabled !== false) {
      errors.push(`Attention route ${label} export flow must be disabled.`);
    }
    if (route.production_authority !== false) {
      errors.push(`Attention route ${label} production authority must be false.`);
    }
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopPanelDisabledActionSurfaces(
  disabledActionSurfaces,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(disabledActionSurfaces)) {
    return { ok: false, errors: ['Desktop panel disabled action surfaces are required.'], warnings };
  }
  errors.push(...requiredNavigationFieldErrors(disabledActionSurfaces, 'disabled_action_surfaces', policy));
  if (disabledActionSurfaces.disabled_action_surfaces_type !== 'desktop_panel_disabled_action_surfaces') {
    errors.push('disabled_action_surfaces_type must be desktop_panel_disabled_action_surfaces.');
  }
  const surfaces = asArray(disabledActionSurfaces.surfaces);
  const surfacePanelIds = surfaces.map((surface) => surface.panel_id);
  for (const panel of policy.allowed_panels) {
    if (!surfacePanelIds.includes(panel.panel_id)) {
      errors.push(`Missing disabled action surface for panel: ${panel.panel_id}.`);
    }
  }
  const requiredActionIds = policy.disabled_action_templates.map((action) => action.action_id);
  for (const surface of surfaces) {
    const label = surface.panel_id || 'unknown';
    if (surface.read_only !== true) {
      errors.push(`Disabled action surface ${label} must be read-only.`);
    }
    if (surface.mutation_controls_allowed !== false) {
      errors.push(`Disabled action surface ${label} must block mutation controls.`);
    }
    if (surface.export_controls_allowed !== false) {
      errors.push(`Disabled action surface ${label} must block export controls.`);
    }
    if (surface.production_authority !== false) {
      errors.push(`Disabled action surface ${label} production authority must be false.`);
    }
    const actionIds = asArray(surface.disabled_actions).map((action) => action.action_id);
    for (const requiredActionId of requiredActionIds) {
      if (!actionIds.includes(requiredActionId)) {
        errors.push(`Disabled action surface ${label} is missing ${requiredActionId}.`);
      }
    }
    for (const action of asArray(surface.disabled_actions)) {
      const actionLabel = action.action_id || 'unknown';
      if (action.enabled !== false) {
        errors.push(`Disabled action ${actionLabel} must remain disabled.`);
      }
      if (action.unavailable !== true) {
        errors.push(`Disabled action ${actionLabel} must be unavailable.`);
      }
      if (action.side_effects_enabled !== false) {
        errors.push(`Disabled action ${actionLabel} side effects must be disabled.`);
      }
      if (action.mutation_enabled !== false) {
        errors.push(`Disabled action ${actionLabel} mutation must be disabled.`);
      }
      if (action.export_enabled !== false) {
        errors.push(`Disabled action ${actionLabel} export must be disabled.`);
      }
      if (action.production_authority !== false) {
        errors.push(`Disabled action ${actionLabel} production authority must be false.`);
      }
    }
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function verifyDesktopPanelNavigationStdoutOnly(
  result,
  policy = getDesktopPanelNavigationPolicy()
) {
  const errors = [];

  if (!isPlainObject(result)) {
    return { ok: false, errors: ['Desktop panel navigation result is required.'] };
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
    errors.push('Successful desktop panel navigation runs must not write stderr.');
  }
  if (result.ok === true && !String(result.stdout_text || '').includes(policy.required_navigation_banner)) {
    errors.push('Successful desktop panel navigation stdout must include the required banner.');
  }
  if (hasRawContent(result)) {
    errors.push('Desktop panel navigation result must not include raw document content.');
  }
  const rendererStdoutOnly = result.panel_renderer_result
    ? verifyDesktopPanelRendererStdoutOnly(result.panel_renderer_result, policy.renderer_policy)
    : { ok: true, errors: [] };
  errors.push(...asArray(rendererStdoutOnly.errors));

  return {
    ok: errors.length === 0,
    errors: unique(errors),
    stdout_only: true,
    in_memory_only: true,
  };
}

export function verifyDesktopPanelNavigationReadOnly(
  vaultPathInput,
  policy = getDesktopPanelNavigationPolicy()
) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const navigationMatches = policy.forbidden_navigation_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const rendererReadOnly = verifyDesktopPanelRendererReadOnly(vaultPath, policy.renderer_policy);
  const presentPaths = Array.from(new Set([
    ...navigationMatches,
    ...rendererReadOnly.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    in_memory_only: true,
    navigation_state_persistence_enabled: false,
    focus_state_persistence_enabled: false,
    present_paths: presentPaths,
    forbidden_navigation_write_targets: [...policy.forbidden_navigation_write_targets],
  };
}

export function verifyNoDesktopPanelNavigationExports(
  vaultPathInput,
  policy = getDesktopPanelNavigationPolicy()
) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const files = listFilesRecursive(vaultPath);
  const localMatches = files.filter((filePath) => isForbiddenExportPath(filePath, vaultPath, policy));
  const rendererExports = verifyNoDesktopPanelRendererExports(vaultPath, policy.renderer_policy);
  const presentPaths = Array.from(new Set([
    ...localMatches,
    ...rendererExports.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(rendererExports.errors)],
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

export function verifyNoDesktopPanelNavigationPublicFiles(
  vaultPathInput,
  policy = getDesktopPanelNavigationPolicy()
) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));
  const rendererPublic = verifyNoDesktopPanelRendererPublicFiles(vaultPath, policy.renderer_policy);
  const presentPaths = Array.from(new Set([
    ...publicMatches,
    ...rendererPublic.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    errors: [...asArray(rendererPublic.errors)],
    public_path_rejection: true,
    present_paths: presentPaths,
  };
}

export function verifyNoDesktopPanelNavigationRuntimeState(
  vaultPathInput,
  policy = getDesktopPanelNavigationPolicy()
) {
  const vaultPath = assertVaultPath(vaultPathInput, policy);
  const directMatches = policy.forbidden_navigation_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));
  const files = listFilesRecursive(vaultPath);
  const runtimeMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    return relativePath.includes('runtime-navigation-state') ||
      relativePath.includes('runtime-focus-state') ||
      relativePath.includes('panel-navigation-state') ||
      relativePath.includes('panel-focus-state') ||
      relativePath.includes('desktop-panel-navigation-contract.json') ||
      relativePath.includes('desktop-panel-focus-model.json');
  });
  const rendererRuntime = verifyNoDesktopPanelRendererRuntimeState(vaultPath, policy.renderer_policy);
  const presentPaths = Array.from(new Set([
    ...directMatches,
    ...runtimeMatches,
    ...rendererRuntime.present_paths,
  ]));

  return {
    ok: presentPaths.length === 0,
    in_memory_only: true,
    runtime_state_persistence_enabled: false,
    navigation_state_persistence_enabled: false,
    focus_state_persistence_enabled: false,
    present_paths: presentPaths,
  };
}

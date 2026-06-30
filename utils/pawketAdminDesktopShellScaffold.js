import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_SHELL_SCAFFOLD_VERSION = 'pawket-admin-desktop-shell-scaffold-v0';

const REQUIRED_SCAFFOLD_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_scaffold',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
  connector_networking_enabled: false,
  document_upload_enabled: false,
  public_route_enabled: false,
});

const SAFE_PANELS = Object.freeze([
  ['overview', 'Overview', 'operator_ui_state.panels.overview'],
  ['pipeline', 'Pipeline', 'operator_ui_state.panels.pipeline'],
  ['evidence', 'Evidence', 'operator_ui_state.panels.evidence'],
  ['ledger_proposals', 'Ledger Proposals', 'operator_ui_state.panels.ledger_proposals'],
  ['test_only_ledger', 'Test-Only Ledger', 'operator_ui_state.panels.test_only_ledger'],
  ['reporting', 'Reporting', 'operator_ui_state.panels.reporting'],
  ['report_packages', 'Report Packages', 'operator_ui_state.panels.report_packages'],
  ['report_review', 'Report Review', 'operator_ui_state.panels.report_review'],
  ['blockers', 'Blockers', 'operator_ui_state.panels.blockers'],
  ['warnings', 'Warnings', 'operator_ui_state.panels.warnings'],
  ['disabled_production_gates', 'Disabled Production Gates', 'operator_ui_state.panels.disabled_production_gates'],
  ['audit_notes', 'Audit Notes', 'operator_ui_state.panels.audit_notes'],
  ['sample_vault_preview', 'Sample Vault Preview', 'sample_vault_preview.cli_preview'],
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

const PACKAGING_BLOCKERS = Object.freeze([
  ['production_encryption_review', 'production encryption not reviewed', 'security'],
  ['raw_document_storage_review', 'raw document storage not reviewed', 'security'],
  ['live_ledger_commits_disabled', 'live ledger commits disabled', 'accounting'],
  ['official_balance_report_generation_disabled', 'official balance/report generation disabled', 'accounting'],
  ['final_export_generation_disabled', 'final export generation disabled', 'privacy'],
  ['connector_networking_disabled', 'connector networking disabled', 'security'],
  ['privacy_redaction_review_required', 'privacy/redaction review required', 'privacy'],
  ['legal_accounting_tax_security_privacy_review_required', 'legal/accounting/tax/security/privacy review required', 'cross_functional'],
  ['ui_security_review_required', 'UI security review required', 'security'],
  ['local_vault_hardening_required', 'local vault hardening required', 'security'],
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

function baseScaffoldFields() {
  return { ...REQUIRED_SCAFFOLD_FIELDS };
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

function fieldMismatchErrors(record, requiredFields, label) {
  const errors = [];
  for (const [field, expectedValue] of Object.entries(requiredFields)) {
    if (record[field] !== expectedValue) {
      errors.push(`${label}.${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  return errors;
}

function assertPath(inputPath, label = 'Pawket Admin desktop shell scaffold path') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error(`${label} is required.`);
  }
  return path.resolve(inputPath);
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

function collectFlagViolations(value, fieldName, badValue = true, pathParts = []) {
  const violations = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...collectFlagViolations(item, fieldName, badValue, [...pathParts, `[${index}]`]));
    });
    return violations;
  }
  if (!isPlainObject(value)) {
    return violations;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const nextPath = [...pathParts, key];
    if (key === fieldName && nestedValue === badValue) {
      violations.push(nextPath.join('.'));
    }
    violations.push(...collectFlagViolations(nestedValue, fieldName, badValue, nextPath));
  }
  return violations;
}

function actionRecord([action_id, label, category]) {
  return {
    action_id,
    label,
    category,
    enabled: false,
    read_only: true,
    local_only: true,
    mutation_actions_enabled: false,
    export_actions_enabled: false,
    production_authority_enabled: false,
    raw_document_content_allowed: false,
    reason: `${label} is disabled in the local non-production desktop shell scaffold.`,
  };
}

export function getDesktopShellScaffoldPolicy() {
  return {
    policy_version: DESKTOP_SHELL_SCAFFOLD_VERSION,
    ...baseScaffoldFields(),
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    raw_document_content_allowed: false,
    required_scaffold_fields: { ...REQUIRED_SCAFFOLD_FIELDS },
    allowed_panels: SAFE_PANELS.map(([panel_id, label, source_view_model]) => ({
      panel_id,
      label,
      source_view_model,
    })),
    disabled_action_templates: DISABLED_ACTIONS.map(actionRecord),
    packaging_blocker_templates: PACKAGING_BLOCKERS.map(([blocker_id, label, category]) => ({
      blocker_id,
      label,
      category,
      resolved: false,
      required_before_packaging: true,
    })),
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
  };
}

export function buildDesktopShellBoundary(policy = getDesktopShellScaffoldPolicy()) {
  const boundary = {
    ...baseScaffoldFields(),
    boundary_type: 'desktop_shell_boundary',
    policy_version: policy.policy_version,
    allowed_runtime: 'local_only_scaffold',
    consumes: [
      'operator_shell_view_model',
      'desktop_ui_adapter_state',
      'sample_vault_preview_metadata',
    ],
    forbidden_outputs: [
      'production_ledger_truth',
      'official_balances',
      'official_reports',
      'final_exports',
      'public_routes',
      'raw_document_content',
      'connector_network_calls',
      'document_uploads',
      'packaged_installers',
    ],
    future_boundaries_required: [
      'production_encryption_review',
      'desktop_auth_review',
      'local_vault_hardening',
      'UI_security_review',
      'legal_accounting_tax_security_privacy_review',
    ],
  };
  return {
    ...boundary,
    boundary_hash: hashPayload(boundary),
  };
}

export function buildDesktopShellPanelRegistry(policy = getDesktopShellScaffoldPolicy()) {
  const panels = policy.allowed_panels.map((panel) => ({
    ...baseScaffoldFields(),
    panel_id: panel.panel_id,
    label: panel.label,
    source_view_model: panel.source_view_model,
    read_only: true,
    mutation_actions_enabled: false,
    export_actions_enabled: false,
    raw_document_content_allowed: false,
    allowed_status_surfaces: [
      'counts',
      'status_labels',
      'warnings',
      'blockers',
      'disabled_gate_labels',
    ],
  }));
  const registry = {
    ...baseScaffoldFields(),
    registry_type: 'desktop_shell_panel_registry',
    policy_version: policy.policy_version,
    panels,
  };
  return {
    ...registry,
    panel_registry_hash: hashPayload(registry),
  };
}

export function buildDesktopShellDisabledActions(policy = getDesktopShellScaffoldPolicy()) {
  const disabledActions = {
    ...baseScaffoldFields(),
    registry_type: 'desktop_shell_disabled_actions',
    policy_version: policy.policy_version,
    actions: policy.disabled_action_templates.map((action) => ({ ...action })),
  };
  return {
    ...disabledActions,
    disabled_actions_hash: hashPayload(disabledActions),
  };
}

export function buildDesktopShellPackagingBlockers(policy = getDesktopShellScaffoldPolicy()) {
  const blockers = {
    ...baseScaffoldFields(),
    registry_type: 'desktop_shell_packaging_blockers',
    policy_version: policy.policy_version,
    packaging_status: 'blocked_pending_review',
    blockers: policy.packaging_blocker_templates.map((blocker) => ({ ...blocker })),
  };
  return {
    ...blockers,
    packaging_blockers_hash: hashPayload(blockers),
  };
}

export function buildDesktopShellScaffoldState(input = {}, policy = getDesktopShellScaffoldPolicy()) {
  const boundary = buildDesktopShellBoundary(policy);
  const panelRegistry = buildDesktopShellPanelRegistry(policy);
  const disabledActions = buildDesktopShellDisabledActions(policy);
  const packagingBlockers = buildDesktopShellPackagingBlockers(policy);
  const operatorViewModel = input.operator_view_model || input.view_model || {};
  const operatorUiState = input.operator_ui_state || input.ui_state || {};
  const sampleVaultPreview = input.sample_vault_preview || {};

  const scaffold = {
    ...baseScaffoldFields(),
    scaffold_state_type: 'desktop_shell_scaffold_state',
    policy_version: policy.policy_version,
    generated_at: input.generated_at || nowIso(),
    source_view_model_type: operatorViewModel.view_model_type || input.source_view_model_type || 'not_loaded',
    source_ui_state_type: operatorUiState.ui_state_type || input.source_ui_state_type || 'not_loaded',
    sample_vault_preview_available: Boolean(sampleVaultPreview.ok || sampleVaultPreview.preview_text),
    safe_status_surfaces: [
      'panel summaries',
      'status badges',
      'attention queue',
      'blockers',
      'warnings',
      'disabled production gates',
    ],
    boundary,
    panel_registry: panelRegistry,
    disabled_actions: disabledActions,
    packaging_blockers: packagingBlockers,
  };

  return {
    ...scaffold,
    scaffold_state_hash: hashPayload(scaffold),
  };
}

export function validateDesktopShellBoundary(boundary, policy = getDesktopShellScaffoldPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(boundary)) {
    return { ok: false, errors: ['Desktop shell boundary is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(boundary, policy.required_scaffold_fields, 'boundary'));
  if (boundary.boundary_type !== 'desktop_shell_boundary') {
    errors.push('boundary.boundary_type must be desktop_shell_boundary.');
  }
  if (hasRawContent(boundary)) {
    errors.push('Desktop shell boundary must not include raw document content.');
  }
  return { ok: errors.length === 0, errors, warnings };
}

export function validateDesktopShellPanelRegistry(panelRegistry, policy = getDesktopShellScaffoldPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(panelRegistry)) {
    return { ok: false, errors: ['Desktop shell panel registry is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(panelRegistry, policy.required_scaffold_fields, 'panel_registry'));

  const panels = asArray(panelRegistry.panels);
  const expectedPanelIds = policy.allowed_panels.map((panel) => panel.panel_id);
  const actualPanelIds = panels.map((panel) => panel.panel_id);
  for (const panelId of expectedPanelIds) {
    if (!actualPanelIds.includes(panelId)) {
      errors.push(`Missing desktop shell panel: ${panelId}.`);
    }
  }

  for (const panel of panels) {
    if (!expectedPanelIds.includes(panel.panel_id)) {
      errors.push(`Unsupported desktop shell panel: ${panel.panel_id || 'unknown'}.`);
    }
    if (!panel.source_view_model) {
      errors.push(`Panel ${panel.panel_id || 'unknown'} must declare source_view_model.`);
    }
    if (panel.read_only !== true) {
      errors.push(`Panel ${panel.panel_id || 'unknown'} must be read-only.`);
    }
    if (panel.mutation_actions_enabled !== false) {
      errors.push(`Panel ${panel.panel_id || 'unknown'} must disable mutation actions.`);
    }
    if (panel.export_actions_enabled !== false) {
      errors.push(`Panel ${panel.panel_id || 'unknown'} must disable export actions.`);
    }
    if (panel.raw_document_content_allowed !== false) {
      errors.push(`Panel ${panel.panel_id || 'unknown'} must block raw document content.`);
    }
    errors.push(...fieldMismatchErrors(panel, policy.required_scaffold_fields, `panel.${panel.panel_id || 'unknown'}`));
  }

  if (hasRawContent(panelRegistry)) {
    errors.push('Desktop shell panel registry must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateDesktopShellDisabledActions(disabledActions, policy = getDesktopShellScaffoldPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(disabledActions)) {
    return { ok: false, errors: ['Desktop shell disabled actions registry is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(disabledActions, policy.required_scaffold_fields, 'disabled_actions'));

  const actions = asArray(disabledActions.actions);
  const expectedActionIds = policy.disabled_action_templates.map((action) => action.action_id);
  const actualActionIds = actions.map((action) => action.action_id);
  for (const actionId of expectedActionIds) {
    if (!actualActionIds.includes(actionId)) {
      errors.push(`Missing disabled action: ${actionId}.`);
    }
  }

  for (const action of actions) {
    if (action.enabled !== false) {
      errors.push(`Disabled action ${action.action_id || 'unknown'} must not be enabled.`);
    }
    if (action.mutation_actions_enabled !== false) {
      errors.push(`Disabled action ${action.action_id || 'unknown'} must disable mutation actions.`);
    }
    if (action.export_actions_enabled !== false) {
      errors.push(`Disabled action ${action.action_id || 'unknown'} must disable export actions.`);
    }
    if (action.production_authority_enabled !== false) {
      errors.push(`Disabled action ${action.action_id || 'unknown'} must not have production authority.`);
    }
    if (action.raw_document_content_allowed !== false) {
      errors.push(`Disabled action ${action.action_id || 'unknown'} must block raw document content.`);
    }
  }

  if (hasRawContent(disabledActions)) {
    errors.push('Desktop shell disabled actions must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateDesktopShellScaffoldState(scaffoldState, policy = getDesktopShellScaffoldPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(scaffoldState)) {
    return { ok: false, errors: ['Desktop shell scaffold state is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(scaffoldState, policy.required_scaffold_fields, 'scaffold_state'));
  if (scaffoldState.scaffold_state_type !== 'desktop_shell_scaffold_state') {
    errors.push('scaffold_state.scaffold_state_type must be desktop_shell_scaffold_state.');
  }

  const boundaryValidation = validateDesktopShellBoundary(scaffoldState.boundary, policy);
  const panelValidation = validateDesktopShellPanelRegistry(scaffoldState.panel_registry, policy);
  const disabledValidation = validateDesktopShellDisabledActions(scaffoldState.disabled_actions, policy);
  const mutationVerification = verifyDesktopShellHasNoMutationActions(scaffoldState, policy);
  const exportVerification = verifyDesktopShellHasNoExportActions(scaffoldState, policy);
  const authorityVerification = verifyDesktopShellHasNoProductionAuthority(scaffoldState, policy);

  errors.push(
    ...boundaryValidation.errors,
    ...panelValidation.errors,
    ...disabledValidation.errors,
    ...mutationVerification.errors,
    ...exportVerification.errors,
    ...authorityVerification.errors
  );

  if (hasRawContent(scaffoldState)) {
    errors.push('Desktop shell scaffold state must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function verifyDesktopShellHasNoMutationActions(scaffoldState, policy = getDesktopShellScaffoldPolicy()) {
  const violations = collectFlagViolations(scaffoldState, 'mutation_actions_enabled', true);
  return {
    ok: violations.length === 0,
    errors: violations.map((fieldPath) => `Mutation action enabled at ${fieldPath}.`),
    mutation_actions_enabled: false,
  };
}

export function verifyDesktopShellHasNoExportActions(scaffoldState, policy = getDesktopShellScaffoldPolicy()) {
  const exportFlagViolations = collectFlagViolations(scaffoldState, 'export_actions_enabled', true);
  const enabledExportActions = asArray(scaffoldState?.disabled_actions?.actions).filter((action) => (
    action.enabled === true && /export|pdf|csv|xlsx|zip|package|report|irs|accountant|investor/i.test(action.action_id || action.label || '')
  ));
  const errors = [
    ...exportFlagViolations.map((fieldPath) => `Export action enabled at ${fieldPath}.`),
    ...enabledExportActions.map((action) => `Export-related action ${action.action_id || action.label} must remain disabled.`),
  ];
  return {
    ok: errors.length === 0,
    errors,
    export_actions_enabled: false,
  };
}

export function verifyDesktopShellHasNoProductionAuthority(scaffoldState, policy = getDesktopShellScaffoldPolicy()) {
  const errors = [];

  for (const [field, expectedValue] of Object.entries(policy.required_scaffold_fields)) {
    if (scaffoldState?.[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  if (scaffoldState?.production_reports_enabled === true) {
    errors.push('production_reports_enabled must remain false.');
  }
  if (scaffoldState?.official_balances_enabled === true) {
    errors.push('official_balances_enabled must remain false.');
  }
  if (scaffoldState?.official_reports_enabled === true) {
    errors.push('official_reports_enabled must remain false.');
  }
  if (scaffoldState?.final_exports_enabled === true) {
    errors.push('final_exports_enabled must remain false.');
  }
  if (scaffoldState?.live_ledger_commits_enabled === true) {
    errors.push('live_ledger_commits_enabled must remain false.');
  }

  return {
    ok: errors.length === 0,
    errors,
    production_authority_enabled: false,
  };
}

export function verifyDesktopShellCreatesNoPublicFiles(vaultPath) {
  const resolved = assertPath(vaultPath);
  const errors = [];

  if (pathHasPublicSegment(resolved)) {
    errors.push('Pawket Admin desktop shell scaffold files must not be placed under public/.');
  }

  const publicMatches = fs.existsSync(resolved)
    ? listFilesRecursive(resolved).filter((filePath) => path.relative(resolved, filePath).split(path.sep).includes('public'))
    : [];

  return {
    ok: errors.length === 0 && publicMatches.length === 0,
    errors,
    present_paths: publicMatches,
    public_path_rejection: true,
  };
}

export function verifyDesktopShellCreatesNoExports(vaultPath, policy = getDesktopShellScaffoldPolicy()) {
  const resolved = assertPath(vaultPath);
  const pathErrors = [];

  if (pathHasPublicSegment(resolved)) {
    pathErrors.push('Pawket Admin desktop shell scaffold files must not be placed under public/.');
  }
  if (!fs.existsSync(resolved)) {
    pathErrors.push(`Path does not exist: ${resolved}`);
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    pathErrors.push('Desktop shell scaffold path must not point at export, report, balance, or production artifacts.');
  }
  if (pathErrors.length) {
    return { ok: false, errors: pathErrors, present_paths: [] };
  }

  const files = listFilesRecursive(resolved);
  const presentPaths = files.filter((filePath) => isForbiddenExportPath(filePath, resolved, policy));
  return {
    ok: presentPaths.length === 0,
    errors: [],
    present_paths: presentPaths,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

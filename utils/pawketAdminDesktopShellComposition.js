import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';
import {
  buildPipelineStatusViewModel,
  getDesktopOperatorShellPolicy,
} from './pawketAdminDesktopOperatorShell.js';
import {
  buildOperatorAttentionQueue,
  buildOperatorNavigationModel,
  buildOperatorPanelSummaries,
  buildOperatorStatusBadges,
  buildOperatorUiState,
  getDesktopUiAdapterPolicy,
  validateOperatorNavigationModel,
  validateOperatorUiState,
} from './pawketAdminDesktopUiAdapter.js';
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
} from './pawketAdminDesktopShellScaffold.js';

export const DESKTOP_SHELL_COMPOSITION_VERSION = 'pawket-admin-desktop-shell-composition-v0';

const REQUIRED_CONTRACT_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  packaged_app: false,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_desktop_shell_contract',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
  connector_networking_enabled: false,
  document_upload_enabled: false,
  public_route_enabled: false,
});

const PANEL_UI_STATE_KEYS = Object.freeze({
  overview: 'panels.overview',
  pipeline: 'panels.pipeline',
  evidence: 'panels.evidence',
  ledger_proposals: 'panels.ledger_proposals',
  test_only_ledger: 'panels.test_only_ledger',
  reporting: 'panels.reporting',
  report_packages: 'panels.report_packages',
  report_review: 'panels.report_review',
  blockers: 'panels.blockers',
  warnings: 'panels.warnings',
  disabled_production_gates: 'panels.disabled_production_gates',
  audit_notes: 'panels.audit_notes',
  sample_vault_preview: 'sample_preview_binding',
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

const FORBIDDEN_COMPOSITION_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-shell-composition.ndjson',
  'manifests/desktop-app-shell-contract.ndjson',
  'manifests/desktop-panel-state-bindings.ndjson',
  'manifests/desktop-sample-preview-binding.ndjson',
  'reports/desktop-app-shell-contract.json',
  'ui/desktop-app-shell-contract.json',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nowIso() {
  return new Date().toISOString();
}

function baseContractFields() {
  return { ...REQUIRED_CONTRACT_FIELDS };
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

function assertPath(inputPath, label = 'Pawket Admin desktop shell composition path') {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error(`${label} is required.`);
  }
  return path.resolve(inputPath);
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

function fieldMismatchErrors(record, requiredFields, label) {
  const errors = [];
  for (const [field, expectedValue] of Object.entries(requiredFields)) {
    if (record[field] !== expectedValue) {
      errors.push(`${label}.${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  return errors;
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

function getPathValue(source, dottedPath) {
  return dottedPath.split('.').reduce((cursor, part) => (
    isPlainObject(cursor) ? cursor[part] : undefined
  ), source);
}

function looksLikeSafeFixturePath(inputPath) {
  const segments = pathSegments(inputPath);
  if (segments.includes('public')) {
    return false;
  }
  const joined = segments.join('/');
  return joined.includes('data/finance/security/sample-vault') ||
    joined.includes('data/finance/security') ||
    joined.includes('fixture') ||
    joined.includes('sample');
}

function shellContractLabels(sourceMode = 'local_non_production_desktop_shell_contract') {
  return {
    ...REQUIRED_CONTRACT_FIELDS,
    source_mode: sourceMode,
  };
}

function statusCountFromBadges(statusBadges = [], status) {
  return asArray(statusBadges).filter((badge) => badge.status === status || badge.severity === status).length;
}

function attentionTypes(attentionQueue = {}) {
  return unique(asArray(attentionQueue.items).map((item) => item.type));
}

function samplePreviewSource(input = {}) {
  return input.sample_preview ||
    input.sample_vault_preview ||
    input.sample_preview_metadata ||
    input.preview_output ||
    null;
}

function resolveOperatorViewModel(input = {}) {
  if (input.operator_shell_read_model) return input.operator_shell_read_model;
  if (input.operator_view_model) return input.operator_view_model;
  if (input.view_model) return input.view_model;
  if (input.pipeline_status_view_model) return input.pipeline_status_view_model;
  if (isPlainObject(input.pipeline_records)) {
    return buildPipelineStatusViewModel(input.pipeline_records);
  }
  if (isPlainObject(input.records)) {
    return buildPipelineStatusViewModel(input.records);
  }
  return buildPipelineStatusViewModel(input);
}

export function getDesktopShellCompositionPolicy() {
  const operatorPolicy = getDesktopOperatorShellPolicy();
  const uiPolicy = getDesktopUiAdapterPolicy();
  const scaffoldPolicy = getDesktopShellScaffoldPolicy();

  return {
    policy_version: DESKTOP_SHELL_COMPOSITION_VERSION,
    ...baseContractFields(),
    production_reports_enabled: false,
    official_balances_enabled: false,
    official_reports_enabled: false,
    final_exports_enabled: false,
    live_ledger_commits_enabled: false,
    raw_document_content_allowed: false,
    required_contract_fields: { ...REQUIRED_CONTRACT_FIELDS },
    allowed_panel_bindings: scaffoldPolicy.allowed_panels.map((panel) => ({
      panel_id: panel.panel_id,
      label: panel.label,
      source_view_model: panel.source_view_model,
      ui_state_key: PANEL_UI_STATE_KEYS[panel.panel_id] || `panels.${panel.panel_id}`,
    })),
    required_nonproduction_banner: uiPolicy.required_nonproduction_banner,
    allowed_source_modes: ['local_non_production_desktop_shell_contract'],
    allowed_sample_source_modes: ['sample_vault_non_production', 'local_non_production_view'],
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_composition_write_targets: [...FORBIDDEN_COMPOSITION_WRITE_TARGETS],
    blocked_production_actions: unique([
      ...operatorPolicy.blocked_production_actions,
      ...uiPolicy.blocked_production_actions,
      'desktop_packaging',
      'public_route',
      'document_upload',
      'connector_networking',
      'mutation_actions',
      'export_actions',
    ]),
  };
}

export function buildDesktopShellCompositionInput(input = {}, policy = getDesktopShellCompositionPolicy()) {
  const operatorViewModel = resolveOperatorViewModel(input);
  const uiState = input.operator_ui_state || input.ui_state || buildOperatorUiState(operatorViewModel);
  const navigationModel = input.navigation_model || uiState.navigation || buildOperatorNavigationModel(operatorViewModel);
  const panelSummaries = input.panel_summaries || uiState.panels || buildOperatorPanelSummaries(operatorViewModel);
  const statusBadges = input.status_badges || uiState.status_badges || buildOperatorStatusBadges(operatorViewModel);
  const attentionQueue = input.attention_queue || uiState.attention_queue || buildOperatorAttentionQueue(operatorViewModel);
  const samplePreview = samplePreviewSource(input);
  const scaffoldState = input.scaffold_state || buildDesktopShellScaffoldState({
    generated_at: input.generated_at,
    operator_view_model: operatorViewModel,
    operator_ui_state: uiState,
    sample_vault_preview: samplePreview || {},
  });

  const compositionInput = {
    ...shellContractLabels(),
    composition_input_type: 'desktop_shell_composition_input',
    policy_version: policy.policy_version,
    generated_at: input.generated_at || operatorViewModel.generated_at || uiState.generated_at || nowIso(),
    operator_shell_read_model: operatorViewModel,
    ui_state: uiState,
    navigation_model: navigationModel,
    panel_summaries: panelSummaries,
    status_badges: statusBadges,
    attention_queue: attentionQueue,
    scaffold_state: scaffoldState,
    shell_boundary: input.shell_boundary || scaffoldState.boundary || buildDesktopShellBoundary(),
    panel_registry: input.panel_registry || scaffoldState.panel_registry || buildDesktopShellPanelRegistry(),
    disabled_actions: input.disabled_actions || scaffoldState.disabled_actions || buildDesktopShellDisabledActions(),
    packaging_blockers: input.packaging_blockers || scaffoldState.packaging_blockers || buildDesktopShellPackagingBlockers(),
    sample_preview_metadata: samplePreview,
  };

  return {
    ...compositionInput,
    composition_input_hash: hashPayload(compositionInput),
  };
}

export function buildDesktopSamplePreviewBinding(samplePreviewInput = null, policy = getDesktopShellCompositionPolicy()) {
  const present = isPlainObject(samplePreviewInput) && Object.keys(samplePreviewInput).length > 0;
  const sampleVaultPath = present
    ? path.resolve(String(samplePreviewInput.sample_vault_path || samplePreviewInput.vault_path || 'data/finance/security/sample-vault'))
    : '';
  const previewText = present
    ? String(samplePreviewInput.preview_text || samplePreviewInput.stdout_text || samplePreviewInput.cli_preview_text || '')
    : '';
  const bannerPresent = previewText.includes(policy.required_nonproduction_banner) ||
    samplePreviewInput?.required_nonproduction_banner === policy.required_nonproduction_banner;

  const binding = {
    ...shellContractLabels(present ? 'sample_vault_non_production' : 'local_non_production_desktop_shell_contract'),
    sample_preview_binding_type: 'desktop_sample_preview_binding',
    policy_version: policy.policy_version,
    sample_preview_available: present,
    demo: true,
    sample_only: true,
    stdout_only: true,
    safe_fixture_path: present ? looksLikeSafeFixturePath(sampleVaultPath) : true,
    sample_vault_path: sampleVaultPath,
    runner_used: samplePreviewInput?.runner_used || samplePreviewInput?.runner_version || null,
    required_nonproduction_banner: policy.required_nonproduction_banner,
    nonproduction_banner_present: present ? bannerPresent : false,
    attention_types: unique(asArray(samplePreviewInput?.attention_types)),
    attention_messages: asArray(samplePreviewInput?.attention_messages).map((message) => String(message)),
    record_count: Number.isFinite(samplePreviewInput?.record_count) ? samplePreviewInput.record_count : 0,
    preview_output_hash: samplePreviewInput?.preview_output_hash || '',
    raw_document_content_included: false,
  };

  return {
    ...binding,
    sample_preview_binding_hash: hashPayload(binding),
  };
}

export function buildDesktopPanelStateBindings(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const panelRegistry = appShellContract?.panel_registry || buildDesktopShellPanelRegistry();
  const uiState = appShellContract?.ui_state || {};
  const bindings = asArray(panelRegistry.panels).map((panel) => {
    const uiStateKey = PANEL_UI_STATE_KEYS[panel.panel_id] || `panels.${panel.panel_id}`;
    const resolvedState = panel.panel_id === 'sample_vault_preview'
      ? appShellContract?.sample_preview_binding
      : getPathValue(uiState, uiStateKey);
    return {
      ...shellContractLabels(),
      panel_id: panel.panel_id,
      label: panel.label,
      source_view_model: panel.source_view_model,
      ui_state_key: uiStateKey,
      enabled: true,
      read_only: true,
      mutation_actions_enabled: false,
      export_actions_enabled: false,
      raw_document_content_allowed: false,
      production_authority: false,
      state_available: resolvedState !== undefined,
    };
  });

  const panelBindings = {
    ...shellContractLabels(),
    panel_bindings_type: 'desktop_panel_state_bindings',
    policy_version: policy.policy_version,
    bindings,
  };

  return {
    ...panelBindings,
    panel_bindings_hash: hashPayload(panelBindings),
  };
}

export function buildDesktopShellStatusSurface(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const statusBadges = asArray(appShellContract?.status_badges);
  const packagingBlockers = asArray(appShellContract?.packaging_blockers?.blockers);
  const disabledActions = asArray(appShellContract?.disabled_actions?.actions);
  const statusSurface = {
    ...shellContractLabels(),
    status_surface_type: 'desktop_shell_status_surface',
    policy_version: policy.policy_version,
    status_badges: statusBadges.map((badge) => ({
      badge_id: badge.badge_id,
      label: badge.label,
      status: badge.status,
      severity: badge.severity,
    })),
    disabled_production_gates: unique([
      ...policy.blocked_production_actions,
      ...disabledActions.map((action) => action.action_id),
    ]),
    packaging_blockers: packagingBlockers.map((blocker) => blocker.label || blocker.blocker_id),
    blocker_badge_count: statusCountFromBadges(statusBadges, 'blocker'),
    warning_badge_count: statusCountFromBadges(statusBadges, 'warning'),
  };

  return {
    ...statusSurface,
    status_surface_hash: hashPayload(statusSurface),
  };
}

export function buildDesktopShellAttentionSurface(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const attentionItems = asArray(appShellContract?.attention_queue?.items);
  const sampleTypes = asArray(appShellContract?.sample_preview_binding?.attention_types);
  const attentionSurface = {
    ...shellContractLabels(),
    attention_surface_type: 'desktop_shell_attention_surface',
    policy_version: policy.policy_version,
    total: attentionItems.length,
    attention_types: unique([
      ...attentionTypes(appShellContract?.attention_queue),
      ...sampleTypes,
    ]),
    items: attentionItems.map((item) => ({
      attention_id: item.attention_id,
      type: item.type,
      severity: item.severity,
      source: item.source,
      record_id: item.record_id,
      message: item.message,
    })),
    sample_attention_types: sampleTypes,
    raw_document_content_included: false,
  };

  return {
    ...attentionSurface,
    attention_surface_hash: hashPayload(attentionSurface),
  };
}

export function composeDesktopAppShellContract(input = {}, policy = getDesktopShellCompositionPolicy()) {
  const compositionInput = input.composition_input_type === 'desktop_shell_composition_input'
    ? input
    : buildDesktopShellCompositionInput(input, policy);
  const samplePreviewBinding = input.sample_preview_binding ||
    buildDesktopSamplePreviewBinding(compositionInput.sample_preview_metadata, policy);

  const contractBase = {
    ...shellContractLabels(),
    app_shell_contract_type: 'desktop_app_shell_contract',
    policy_version: policy.policy_version,
    generated_at: compositionInput.generated_at || nowIso(),
    shell_boundary: compositionInput.shell_boundary,
    panel_registry: compositionInput.panel_registry,
    disabled_actions: compositionInput.disabled_actions,
    packaging_blockers: compositionInput.packaging_blockers,
    operator_pipeline_status: compositionInput.operator_shell_read_model,
    ui_state: compositionInput.ui_state,
    navigation_model: compositionInput.navigation_model,
    panel_summaries: compositionInput.panel_summaries,
    status_badges: compositionInput.status_badges,
    attention_queue: compositionInput.attention_queue,
    sample_preview_binding: samplePreviewBinding,
    scaffold_state: compositionInput.scaffold_state,
  };

  const panelBindings = buildDesktopPanelStateBindings(contractBase, policy);
  const withPanelBindings = {
    ...contractBase,
    panel_bindings: panelBindings,
  };
  const statusSurface = buildDesktopShellStatusSurface(withPanelBindings, policy);
  const attentionSurface = buildDesktopShellAttentionSurface(withPanelBindings, policy);
  const contract = {
    ...withPanelBindings,
    status_surface: statusSurface,
    attention_surface: attentionSurface,
  };

  return {
    ...contract,
    app_shell_contract_hash: hashPayload(contract),
  };
}

export function validateDesktopSamplePreviewBinding(sampleBinding, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(sampleBinding)) {
    return { ok: false, errors: ['Desktop sample preview binding is required.'], warnings };
  }
  if (sampleBinding.sample_preview_binding_type !== 'desktop_sample_preview_binding') {
    errors.push('sample_preview_binding_type must be desktop_sample_preview_binding.');
  }
  if (sampleBinding.sample_preview_available) {
    if (sampleBinding.demo !== true || sampleBinding.sample_only !== true) {
      errors.push('Sample preview binding must be demo/sample only.');
    }
    if (sampleBinding.stdout_only !== true) {
      errors.push('Sample preview binding must preserve stdout-only semantics.');
    }
    if (!sampleBinding.nonproduction_banner_present) {
      errors.push('Sample preview binding must preserve non-production banner metadata.');
    }
    if (!sampleBinding.sample_vault_path) {
      errors.push('Sample preview binding must include a sample vault path.');
    } else {
      const resolvedPath = path.resolve(sampleBinding.sample_vault_path);
      if (pathHasPublicSegment(resolvedPath)) {
        errors.push('Sample preview binding must reject public paths.');
      }
      if (isForbiddenExportPath(resolvedPath, null, policy)) {
        errors.push('Sample preview binding must reject export artifact paths.');
      }
      if (!looksLikeSafeFixturePath(resolvedPath)) {
        errors.push('Sample preview binding must point to a safe fixture path.');
      }
    }
  }
  if (sampleBinding.raw_document_content_included !== false) {
    errors.push('Sample preview binding must not include raw document content.');
  }
  if (hasRawContent(sampleBinding)) {
    errors.push('Sample preview binding must not include raw document content payloads.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateDesktopPanelStateBindings(panelBindings, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(panelBindings)) {
    return { ok: false, errors: ['Desktop panel state bindings are required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(panelBindings, policy.required_contract_fields, 'panel_bindings'));
  if (panelBindings.panel_bindings_type !== 'desktop_panel_state_bindings') {
    errors.push('panel_bindings_type must be desktop_panel_state_bindings.');
  }

  const bindings = asArray(panelBindings.bindings);
  const expectedPanelIds = policy.allowed_panel_bindings.map((binding) => binding.panel_id);
  const actualPanelIds = bindings.map((binding) => binding.panel_id);
  for (const panelId of expectedPanelIds) {
    if (!actualPanelIds.includes(panelId)) {
      errors.push(`Missing desktop panel binding: ${panelId}.`);
    }
  }

  for (const binding of bindings) {
    const label = binding.panel_id || 'unknown';
    if (!expectedPanelIds.includes(binding.panel_id)) {
      errors.push(`Unsupported desktop panel binding: ${label}.`);
    }
    if (!binding.source_view_model) {
      errors.push(`Panel binding ${label} must declare source_view_model.`);
    }
    if (!binding.ui_state_key) {
      errors.push(`Panel binding ${label} must declare ui_state_key.`);
    }
    if (binding.enabled !== true) {
      errors.push(`Panel binding ${label} must be enabled.`);
    }
    if (binding.read_only !== true) {
      errors.push(`Panel binding ${label} must be read-only.`);
    }
    if (binding.mutation_actions_enabled !== false) {
      errors.push(`Panel binding ${label} must disable mutation actions.`);
    }
    if (binding.export_actions_enabled !== false) {
      errors.push(`Panel binding ${label} must disable export actions.`);
    }
    if (binding.raw_document_content_allowed !== false) {
      errors.push(`Panel binding ${label} must block raw document content.`);
    }
    if (binding.production_authority !== false) {
      errors.push(`Panel binding ${label} must have production_authority false.`);
    }
    errors.push(...fieldMismatchErrors(binding, policy.required_contract_fields, `panel_binding.${label}`));
  }

  if (hasRawContent(panelBindings)) {
    errors.push('Desktop panel state bindings must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function validateDesktopAppShellContract(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(appShellContract)) {
    return { ok: false, errors: ['Desktop app shell contract is required.'], warnings };
  }
  errors.push(...fieldMismatchErrors(appShellContract, policy.required_contract_fields, 'app_shell_contract'));
  if (appShellContract.app_shell_contract_type !== 'desktop_app_shell_contract') {
    errors.push('app_shell_contract_type must be desktop_app_shell_contract.');
  }

  const boundaryValidation = validateDesktopShellBoundary(appShellContract.shell_boundary);
  const panelRegistryValidation = validateDesktopShellPanelRegistry(appShellContract.panel_registry);
  const disabledActionsValidation = validateDesktopShellDisabledActions(appShellContract.disabled_actions);
  const scaffoldValidation = validateDesktopShellScaffoldState(appShellContract.scaffold_state);
  const uiValidation = validateOperatorUiState(appShellContract.ui_state);
  const navigationValidation = validateOperatorNavigationModel(appShellContract.navigation_model);
  const panelBindingValidation = validateDesktopPanelStateBindings(appShellContract.panel_bindings, policy);
  const sampleBindingValidation = validateDesktopSamplePreviewBinding(appShellContract.sample_preview_binding, policy);
  const readOnlyVerification = verifyDesktopCompositionReadOnly(appShellContract, policy);
  const authorityVerification = verifyDesktopCompositionHasNoProductionAuthority(appShellContract, policy);
  const exportVerification = verifyDesktopCompositionHasNoExportActions(appShellContract, policy);

  errors.push(
    ...boundaryValidation.errors,
    ...panelRegistryValidation.errors,
    ...disabledActionsValidation.errors,
    ...scaffoldValidation.errors,
    ...uiValidation.errors,
    ...navigationValidation.errors,
    ...panelBindingValidation.errors,
    ...sampleBindingValidation.errors,
    ...readOnlyVerification.errors,
    ...authorityVerification.errors,
    ...exportVerification.errors
  );

  for (const requiredField of [
    'shell_boundary',
    'panel_registry',
    'disabled_actions',
    'packaging_blockers',
    'operator_pipeline_status',
    'ui_state',
    'navigation_model',
    'panel_summaries',
    'status_badges',
    'attention_queue',
    'panel_bindings',
    'status_surface',
    'attention_surface',
  ]) {
    if (appShellContract[requiredField] === undefined) {
      errors.push(`App shell contract must include ${requiredField}.`);
    }
  }

  if (hasRawContent(appShellContract)) {
    errors.push('Desktop app shell contract must not include raw document content.');
  }

  return { ok: errors.length === 0, errors: unique(errors), warnings };
}

export function verifyDesktopCompositionReadOnly(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];

  if (appShellContract?.read_only !== true) {
    errors.push('Desktop composition contract must remain read-only.');
  }
  for (const fieldPath of collectFlagViolations(appShellContract, 'read_only', false)) {
    errors.push(`Read-only disabled at ${fieldPath}.`);
  }
  for (const fieldPath of collectFlagViolations(appShellContract, 'mutation_actions_enabled', true)) {
    errors.push(`Mutation action enabled at ${fieldPath}.`);
  }

  return {
    ok: errors.length === 0,
    errors,
    read_only: true,
  };
}

export function verifyDesktopCompositionHasNoProductionAuthority(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];

  for (const [field, expectedValue] of Object.entries(policy.required_contract_fields)) {
    if (appShellContract?.[field] !== expectedValue) {
      errors.push(`${field} must be ${JSON.stringify(expectedValue)}.`);
    }
  }
  for (const field of [
    'production_enabled',
    'production_reports_enabled',
    'official_balances_enabled',
    'official_reports_enabled',
    'final_exports_enabled',
    'live_ledger_commits_enabled',
    'connector_networking_enabled',
    'document_upload_enabled',
    'public_route_enabled',
    'production_authority',
    'production_authority_enabled',
  ]) {
    for (const fieldPath of collectFlagViolations(appShellContract, field, true)) {
      errors.push(`Production authority enabled at ${fieldPath}.`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    production_authority: false,
  };
}

export function verifyDesktopCompositionHasNoExportActions(appShellContract, policy = getDesktopShellCompositionPolicy()) {
  const errors = [];

  for (const fieldPath of collectFlagViolations(appShellContract, 'export_actions_enabled', true)) {
    errors.push(`Export action enabled at ${fieldPath}.`);
  }
  const enabledExportActions = asArray(appShellContract?.disabled_actions?.actions).filter((action) => (
    action.enabled === true && /export|pdf|csv|xlsx|zip|package|report|irs|accountant|investor/i.test(action.action_id || action.label || '')
  ));
  errors.push(...enabledExportActions.map((action) => (
    `Export-related action ${action.action_id || action.label} must remain disabled.`
  )));
  if (appShellContract?.final_export_status !== 'disabled') {
    errors.push('final_export_status must remain disabled.');
  }

  return {
    ok: errors.length === 0,
    errors,
    export_actions_enabled: false,
  };
}

export function verifyDesktopCompositionCreatesNoPublicFiles(vaultPath) {
  const resolved = assertPath(vaultPath);
  const errors = [];

  if (pathHasPublicSegment(resolved)) {
    errors.push('Pawket Admin desktop shell composition files must not be placed under public/.');
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

export function verifyDesktopCompositionCreatesNoExports(vaultPath, policy = getDesktopShellCompositionPolicy()) {
  const resolved = assertPath(vaultPath);
  const pathErrors = [];

  if (pathHasPublicSegment(resolved)) {
    pathErrors.push('Pawket Admin desktop shell composition files must not be placed under public/.');
  }
  if (!fs.existsSync(resolved)) {
    pathErrors.push(`Path does not exist: ${resolved}`);
  }
  if (isForbiddenExportPath(resolved, null, policy)) {
    pathErrors.push('Desktop shell composition path must not point at export, report, balance, or production artifacts.');
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

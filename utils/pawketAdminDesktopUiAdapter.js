import fs from 'node:fs';
import path from 'node:path';
import { canonicalize, sha256Hex } from './pawketAdminSecurity.js';

export const DESKTOP_UI_ADAPTER_VERSION = 'pawket-admin-desktop-ui-adapter-v0';

const REQUIRED_UI_STATE_FIELDS = Object.freeze({
  production_enabled: false,
  read_only: true,
  local_only: true,
  official_balance_status: 'disabled',
  official_report_status: 'disabled',
  final_export_status: 'disabled',
  source_mode: 'local_non_production_view',
  raw_document_content_included: false,
  mutation_actions_enabled: false,
  export_actions_enabled: false,
});

const SAFE_PANELS = Object.freeze([
  ['overview', 'Overview'],
  ['pipeline', 'Pipeline'],
  ['evidence', 'Evidence'],
  ['ledger_proposals', 'Ledger Proposals'],
  ['test_only_ledger', 'Test-Only Ledger'],
  ['reporting', 'Reporting'],
  ['report_packages', 'Report Packages'],
  ['report_review', 'Report Review'],
  ['blockers', 'Blockers'],
  ['warnings', 'Warnings'],
  ['disabled_production_gates', 'Disabled Production Gates'],
  ['audit_notes', 'Audit Notes'],
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

const UI_ADAPTER_FORBIDDEN_WRITE_TARGETS = Object.freeze([
  'manifests/desktop-ui-adapter.ndjson',
  'manifests/operator-ui-state-model.ndjson',
  'manifests/operator-cli-preview.ndjson',
  'manifests/desktop-navigation-model.ndjson',
  'reports/operator-ui-state.json',
  'reports/operator-cli-preview.txt',
  'ui/operator-dashboard.json',
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

const UNSAFE_STATE_MESSAGES = Object.freeze({
  production_enabled: 'production_enabled must remain false.',
  read_only: 'read_only must remain true.',
  local_only: 'local_only must remain true.',
  official_balance_status: 'official_balance_status must remain disabled.',
  official_report_status: 'official_report_status must remain disabled.',
  final_export_status: 'final_export_status must remain disabled.',
  source_mode: 'source_mode must remain local_non_production_view.',
  raw_document_content_included: 'raw_document_content_included must remain false.',
  mutation_actions_enabled: 'mutation_actions_enabled must remain false.',
  export_actions_enabled: 'export_actions_enabled must remain false.',
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

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function baseUiFields() {
  return { ...REQUIRED_UI_STATE_FIELDS };
}

function hashPayload(payload) {
  return sha256Hex(canonicalize(payload));
}

function assertAllowedVaultPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Pawket Admin desktop UI adapter vault path is required.');
  }

  const resolved = path.resolve(inputPath);
  const pathSegments = resolved.split(path.sep).filter(Boolean);
  if (pathSegments.includes('public')) {
    throw new Error('Pawket Admin desktop UI adapter files must not be placed under public/.');
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

function sectionsFor(viewModel = {}) {
  return isPlainObject(viewModel.sections) ? viewModel.sections : {};
}

function sectionTotal(section) {
  if (Array.isArray(section)) {
    return section.length;
  }
  if (!isPlainObject(section)) {
    return 0;
  }
  if (Number.isFinite(section.total)) {
    return section.total;
  }
  return Object.entries(section).reduce((sum, [key, value]) => {
    if (/status|ids|warnings|blockers|raw/i.test(key)) {
      return sum;
    }
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function countFromPath(viewModel, pathParts) {
  let cursor = viewModel;
  for (const part of pathParts) {
    if (!isPlainObject(cursor)) {
      return 0;
    }
    cursor = cursor[part];
  }
  return sectionTotal(cursor);
}

function statusLabelsFor(section) {
  if (!isPlainObject(section)) {
    return [];
  }

  const statusObjects = [
    section.statuses,
    section.status_counts,
    section.coverage_status_counts,
    section.by_status,
  ].filter(isPlainObject);

  const labels = [];
  for (const statusObject of statusObjects) {
    labels.push(...Object.keys(statusObject));
  }

  for (const [key, value] of Object.entries(section)) {
    if (/_status$/.test(key) && typeof value === 'string') {
      labels.push(`${key}:${value}`);
    }
  }

  return unique(labels).sort();
}

function attentionLevel(count, warningCount = 0) {
  if (count > 0) {
    return 'needs_attention';
  }
  if (warningCount > 0) {
    return 'has_warnings';
  }
  return 'normal';
}

function panelCount(viewModel, panelId) {
  const sections = sectionsFor(viewModel);
  switch (panelId) {
    case 'overview':
      return viewModel.counts?.total_records || Object.values(sections).reduce((sum, section) => (
        sum + sectionTotal(section)
      ), 0);
    case 'pipeline':
      return [
        'quarantine',
        'staged_source_events',
        'draft_finance_records',
        'review_queue',
        'proposed_ledger_records',
        'proposed_journal_entries',
      ].reduce((sum, sectionId) => sum + sectionTotal(sections[sectionId]), 0);
    case 'evidence':
      return sectionTotal(sections.evidence);
    case 'ledger_proposals':
      return sectionTotal(sections.proposed_ledger_records) + sectionTotal(sections.proposed_journal_entries);
    case 'test_only_ledger':
      return sectionTotal(sections.test_only_ledger);
    case 'reporting':
      return sectionTotal(sections.reporting);
    case 'report_packages':
      return sectionTotal(sections.report_package_gate);
    case 'report_review':
      return sectionTotal(sections.report_review_queue);
    case 'blockers':
      return sectionTotal(sections.blockers);
    case 'warnings':
      return sectionTotal(sections.warnings);
    case 'disabled_production_gates':
      return asArray(sections.production_disabled_gates?.blocked_actions).length;
    case 'audit_notes':
      return countFromPath(viewModel, ['counts', 'report_reviewer_notes']);
    default:
      return 0;
  }
}

function statusLabelsForPanel(viewModel, panelId) {
  const sections = sectionsFor(viewModel);
  switch (panelId) {
    case 'overview':
      return ['local_non_production_view', 'read_only'];
    case 'pipeline':
      return unique([
        ...statusLabelsFor(sections.quarantine),
        ...statusLabelsFor(sections.staged_source_events),
        ...statusLabelsFor(sections.draft_finance_records),
        ...statusLabelsFor(sections.review_queue),
        ...statusLabelsFor(sections.proposed_ledger_records),
        ...statusLabelsFor(sections.proposed_journal_entries),
      ]).sort();
    case 'evidence':
      return statusLabelsFor(sections.evidence);
    case 'ledger_proposals':
      return unique([
        ...statusLabelsFor(sections.proposed_ledger_records),
        ...statusLabelsFor(sections.proposed_journal_entries),
      ]).sort();
    case 'test_only_ledger':
      return statusLabelsFor(sections.test_only_ledger);
    case 'reporting':
      return statusLabelsFor(sections.reporting);
    case 'report_packages':
      return statusLabelsFor(sections.report_package_gate);
    case 'report_review':
      return statusLabelsFor(sections.report_review_queue);
    case 'blockers':
      return ['blockers_visible'];
    case 'warnings':
      return ['warnings_visible'];
    case 'disabled_production_gates':
      return ['production_disabled', 'live_ledger_disabled', 'final_exports_disabled'];
    case 'audit_notes':
      return ['reviewer_notes_metadata_only'];
    default:
      return [];
  }
}

function allAttentionSources(viewModel = {}) {
  const blockers = viewModel.blockers || sectionsFor(viewModel).blockers || {};
  const warnings = viewModel.warnings || sectionsFor(viewModel).warnings || {};
  return {
    blockers,
    warnings,
  };
}

function makeAttentionItem(type, sourceRecord, severity = 'blocker') {
  return {
    attention_id: `${type}_${hashPayload(sourceRecord).slice(0, 16)}`,
    type,
    severity,
    source: sourceRecord.source || 'operator_view_model',
    record_id: sourceRecord.record_id || sourceRecord.id || type,
    message: String(sourceRecord.message || sourceRecord.reason || sourceRecord.outcome || type),
  };
}

function unsafeStateAttention(viewModel = {}) {
  return Object.entries(REQUIRED_UI_STATE_FIELDS).flatMap(([field, expectedValue]) => {
    if (viewModel[field] === undefined || viewModel[field] === expectedValue) {
      return [];
    }
    return [{
      attention_id: `unsafe_state_${field}`,
      type: 'unsafe_state',
      severity: 'blocker',
      source: 'operator_ui_state_validation',
      record_id: field,
      message: UNSAFE_STATE_MESSAGES[field],
    }];
  });
}

function hasEnabledOfficialState(model) {
  return model.official_balance_status !== 'disabled' ||
    model.official_report_status !== 'disabled' ||
    model.final_export_status !== 'disabled';
}

function fieldErrorMessage(field, expectedValue) {
  if (field === 'read_only') {
    return 'read_only must be true.';
  }
  if (field === 'local_only') {
    return 'local_only must be true.';
  }
  if (field === 'mutation_actions_enabled') {
    return 'mutation_actions_enabled must be false.';
  }
  if (field === 'export_actions_enabled') {
    return 'export_actions_enabled must be false.';
  }
  return `${field} must be ${JSON.stringify(expectedValue)}.`;
}

export function getDesktopUiAdapterPolicy() {
  return {
    policy_version: DESKTOP_UI_ADAPTER_VERSION,
    production_enabled: false,
    read_only: true,
    local_only: true,
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
    required_ui_state_fields: { ...REQUIRED_UI_STATE_FIELDS },
    safe_panels: SAFE_PANELS.map(([panel_id, label]) => ({ panel_id, label })),
    required_nonproduction_banner: 'PAWKET ADMIN LOCAL READ-ONLY PREVIEW — NON-PRODUCTION',
    forbidden_export_file_extensions: [...FORBIDDEN_EXPORT_EXTENSIONS],
    forbidden_export_paths: [...FORBIDDEN_EXPORT_PATH_PATTERNS],
    forbidden_ui_adapter_write_targets: [...UI_ADAPTER_FORBIDDEN_WRITE_TARGETS],
    blocked_production_actions: [
      'live_ledger_commit',
      'production_live_ledger_write',
      'official_balances',
      'official_reports',
      'final_exports',
      'pdf_export',
      'csv_export',
      'xlsx_export',
      'zip_export',
      'public_impact_claims',
      'raw_document_content',
      'document_upload',
      'connector_networking',
      'production_source_mode',
      'mutation_actions',
      'export_actions',
    ],
  };
}

export function buildOperatorPanelSummaries(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const blockersCount = sectionTotal(viewModel.blockers || sectionsFor(viewModel).blockers);
  const warningsCount = sectionTotal(viewModel.warnings || sectionsFor(viewModel).warnings);

  return Object.fromEntries(policy.safe_panels.map(({ panel_id, label }) => {
    const count = panelCount(viewModel, panel_id);
    const warningCount = panel_id === 'warnings' ? warningsCount : 0;
    const blockerCount = panel_id === 'blockers' ? blockersCount : 0;

    return [panel_id, {
      panel_id,
      label,
      read_only: true,
      local_only: true,
      count,
      status_labels: statusLabelsForPanel(viewModel, panel_id),
      attention_level: attentionLevel(blockerCount, warningCount),
      raw_document_content_included: false,
    }];
  }));
}

export function buildOperatorNavigationModel(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const panelSummaries = buildOperatorPanelSummaries(viewModel, policy);
  const navigation = {
    ...baseUiFields(),
    navigation_model_type: 'operator_desktop_navigation',
    policy_version: policy.policy_version,
    generated_at: viewModel.generated_at || nowIso(),
    default_panel_id: 'overview',
    navigation_items: policy.safe_panels.map(({ panel_id, label }) => ({
      panel_id,
      label,
      enabled: true,
      read_only: true,
      local_only: true,
      badge_count: panelSummaries[panel_id]?.count || 0,
      attention_level: panelSummaries[panel_id]?.attention_level || 'normal',
    })),
    disabled_actions: [...policy.blocked_production_actions],
  };

  return {
    ...navigation,
    navigation_model_hash: hashPayload(navigation),
  };
}

export function buildOperatorStatusBadges(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const blockers = viewModel.blockers || sectionsFor(viewModel).blockers || {};
  const warnings = viewModel.warnings || sectionsFor(viewModel).warnings || {};

  return [
    { badge_id: 'local_only', label: 'Local Only', status: 'enabled', severity: 'info' },
    { badge_id: 'read_only', label: 'Read Only', status: 'enabled', severity: 'info' },
    { badge_id: 'non_production', label: 'Non-Production', status: 'active', severity: 'warning' },
    { badge_id: 'disabled_production_gates', label: 'Production Gates Disabled', status: 'blocked', severity: 'blocker' },
    { badge_id: 'official_balances_disabled', label: 'Official Balances Disabled', status: policy.official_balance_status, severity: 'blocker' },
    { badge_id: 'official_reports_disabled', label: 'Official Reports Disabled', status: policy.official_report_status, severity: 'blocker' },
    { badge_id: 'final_exports_disabled', label: 'Final Exports Disabled', status: policy.final_export_status, severity: 'blocker' },
    { badge_id: 'blockers_visible', label: 'Blockers', status: String(sectionTotal(blockers)), severity: sectionTotal(blockers) ? 'blocker' : 'info' },
    { badge_id: 'warnings_visible', label: 'Warnings', status: String(sectionTotal(warnings)), severity: sectionTotal(warnings) ? 'warning' : 'info' },
  ];
}

export function buildOperatorAttentionQueue(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const { blockers, warnings } = allAttentionSources(viewModel);
  const items = [
    ...asArray(blockers.missing_evidence).map((record) => makeAttentionItem('missing_evidence', record)),
    ...asArray(blockers.unresolved_risks).map((record) => makeAttentionItem('unresolved_risk', record)),
    ...asArray(blockers.rejected_review_outcomes).map((record) => makeAttentionItem('rejected_report_review', record)),
    ...asArray(blockers.disabled_production_gates).map((record) => makeAttentionItem('disabled_production_gate', record)),
    ...asArray(blockers.blocked_statuses).map((record) => {
      const message = String(record.message || '');
      if (/privacy/i.test(message)) {
        return makeAttentionItem('privacy_blocker', record);
      }
      if (/redaction/i.test(message)) {
        return makeAttentionItem('redaction_blocker', record);
      }
      return makeAttentionItem('blocked_status', record);
    }),
    ...asArray(warnings.by_type?.privacy_warnings).map((record) => makeAttentionItem('privacy_blocker', record)),
    ...asArray(warnings.by_type?.redaction_warnings).map((record) => makeAttentionItem('redaction_blocker', record)),
    ...unsafeStateAttention(viewModel),
  ];

  return {
    ...baseUiFields(),
    attention_queue_type: 'operator_attention_queue',
    generated_at: viewModel.generated_at || nowIso(),
    total: items.length,
    items,
    raw_document_content_included: false,
  };
}

export function buildOperatorUiState(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const panels = buildOperatorPanelSummaries(viewModel, policy);
  const navigation = buildOperatorNavigationModel(viewModel, policy);
  const statusBadges = buildOperatorStatusBadges(viewModel, policy);
  const attentionQueue = buildOperatorAttentionQueue(viewModel, policy);
  const uiState = {
    ...baseUiFields(),
    ui_state_type: 'operator_ui_state',
    policy_version: policy.policy_version,
    generated_at: viewModel.generated_at || nowIso(),
    source_view_model_type: viewModel.view_model_type || 'unknown',
    panels,
    navigation,
    status_badges: statusBadges,
    attention_queue: attentionQueue,
    desktop_ui_adapter_version: DESKTOP_UI_ADAPTER_VERSION,
  };

  return {
    ...uiState,
    ui_state_hash: hashPayload(uiState),
  };
}

export function buildOperatorCliPreview(viewModel = {}, policy = getDesktopUiAdapterPolicy()) {
  const panels = buildOperatorPanelSummaries(viewModel, policy);
  const attentionQueue = buildOperatorAttentionQueue(viewModel, policy);
  const cliPreview = {
    ...baseUiFields(),
    cli_preview_type: 'operator_cli_preview',
    banner: policy.required_nonproduction_banner,
    generated_at: viewModel.generated_at || nowIso(),
    panel_summaries: Object.values(panels).map((panel) => ({
      panel_id: panel.panel_id,
      label: panel.label,
      count: panel.count,
      attention_level: panel.attention_level,
      status_labels: panel.status_labels,
    })),
    status_badges: buildOperatorStatusBadges(viewModel, policy),
    attention_items: attentionQueue.items,
    raw_document_content_included: false,
  };

  return {
    ...cliPreview,
    cli_preview_hash: hashPayload(cliPreview),
  };
}

export function renderOperatorCliPreviewText(cliPreview, policy = getDesktopUiAdapterPolicy()) {
  if (!isPlainObject(cliPreview)) {
    throw new Error('CLI preview is required.');
  }
  if (hasRawContent(cliPreview)) {
    throw new Error('CLI preview must not include raw document content.');
  }

  const lines = [
    cliPreview.banner || policy.required_nonproduction_banner,
    `Source mode: ${cliPreview.source_mode}`,
    `Official balances: ${cliPreview.official_balance_status} | Official reports: ${cliPreview.official_report_status} | Final exports: ${cliPreview.final_export_status}`,
    `Read only: ${cliPreview.read_only} | Local only: ${cliPreview.local_only}`,
    '',
    'Panels:',
  ];

  for (const panel of asArray(cliPreview.panel_summaries)) {
    lines.push(`- ${panel.label}: ${panel.count} (${panel.attention_level})`);
  }

  lines.push('', 'Attention:');
  const attentionItems = asArray(cliPreview.attention_items);
  if (!attentionItems.length) {
    lines.push('- None');
  } else {
    for (const item of attentionItems.slice(0, 12)) {
      lines.push(`- [${item.type}] ${item.message}`);
    }
  }

  return lines.join('\n');
}

export function validateOperatorUiState(uiState, policy = getDesktopUiAdapterPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(uiState)) {
    return { ok: false, errors: ['Operator UI state is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_ui_state_fields)) {
    if (uiState[field] !== expectedValue) {
      errors.push(fieldErrorMessage(field, expectedValue));
    }
  }

  if (hasEnabledOfficialState(uiState)) {
    errors.push('Official balance, report, and final export statuses must remain disabled.');
  }
  if (hasRawContent(uiState)) {
    errors.push('Operator UI state must not include raw document content.');
  }
  if (!isPlainObject(uiState.panels)) {
    errors.push('Operator UI state must include panel summaries.');
  } else {
    for (const { panel_id } of policy.safe_panels) {
      if (!Object.hasOwn(uiState.panels, panel_id)) {
        errors.push(`Missing UI panel summary: ${panel_id}.`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function validateOperatorNavigationModel(navigationModel, policy = getDesktopUiAdapterPolicy()) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(navigationModel)) {
    return { ok: false, errors: ['Operator navigation model is required.'], warnings };
  }

  for (const [field, expectedValue] of Object.entries(policy.required_ui_state_fields)) {
    if (navigationModel[field] !== expectedValue) {
      errors.push(fieldErrorMessage(field, expectedValue));
    }
  }

  const expectedPanelIds = policy.safe_panels.map(({ panel_id }) => panel_id);
  const actualPanelIds = asArray(navigationModel.navigation_items).map((item) => item.panel_id);
  for (const panelId of expectedPanelIds) {
    if (!actualPanelIds.includes(panelId)) {
      errors.push(`Missing navigation panel: ${panelId}.`);
    }
  }

  for (const item of asArray(navigationModel.navigation_items)) {
    if (item.read_only !== true || item.local_only !== true) {
      errors.push(`Navigation item ${item.panel_id || 'unknown'} must be read-only and local-only.`);
    }
    if (!expectedPanelIds.includes(item.panel_id)) {
      errors.push(`Unsafe navigation panel: ${item.panel_id}.`);
    }
  }

  if (hasRawContent(navigationModel)) {
    errors.push('Operator navigation model must not include raw document content.');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function verifyUiAdapterReadOnly(vaultPathInput, policy = getDesktopUiAdapterPolicy()) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const presentPaths = policy.forbidden_ui_adapter_write_targets
    .map((relativePath) => path.join(vaultPath, ...relativePath.split('/')))
    .filter((candidatePath) => fs.existsSync(candidatePath));

  return {
    ok: presentPaths.length === 0,
    read_only: true,
    present_paths: presentPaths,
    forbidden_ui_adapter_write_targets: [...policy.forbidden_ui_adapter_write_targets],
  };
}

export function verifyNoUiAdapterPublicFiles(vaultPathInput) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const publicMatches = listFilesRecursive(vaultPath).filter((filePath) => (
    path.relative(vaultPath, filePath).split(path.sep).includes('public')
  ));

  return {
    ok: publicMatches.length === 0,
    public_path_rejection: true,
    present_paths: publicMatches,
  };
}

export function verifyNoUiAdapterExports(vaultPathInput, policy = getDesktopUiAdapterPolicy()) {
  const vaultPath = assertAllowedVaultPath(vaultPathInput);
  const files = listFilesRecursive(vaultPath);
  const forbiddenMatches = files.filter((filePath) => {
    const relativePath = path.relative(vaultPath, filePath).replaceAll(path.sep, '/').toLowerCase();
    const extension = path.extname(filePath).toLowerCase();
    return FORBIDDEN_EXPORT_EXTENSIONS.has(extension) ||
      policy.forbidden_export_paths.some((forbiddenPath) => relativePath.includes(forbiddenPath));
  });

  return {
    ok: forbiddenMatches.length === 0,
    present_paths: forbiddenMatches,
    forbidden_export_file_extensions: [...policy.forbidden_export_file_extensions],
    forbidden_export_paths: [...policy.forbidden_export_paths],
  };
}

// /public/pawketAppRuntime.js
const PROVIDER_TYPES = new Set(['first_party', 'approved_partner', 'connector']);
const SURFACES = new Set(['dock', 'standalone']);

export const PAWKET_APP_DATA_SCOPES = Object.freeze([
  'pets:summary',
  'pals:private_summary',
  'passes:summary',
  'products:featured',
  'stories:public',
  'charm:public_updates',
  'dock:preferences'
]);

export const PAWKET_APP_ACTION_SCOPES = Object.freeze([
  'navigate',
  'open_product',
  'open_pal_creator',
  'send_pass',
  'open_story_composer',
  'toggle_provider',
  'focus_provider',
  'dock_preferences'
]);

export const PAWKET_APP_BLOCKED_DATA_SCOPES = Object.freeze([
  'pets:raw',
  'journals:raw',
  'stories:private',
  'care_support:*',
  'finance:*',
  'account:secrets'
]);

const DATA_SCOPE_SET = new Set(PAWKET_APP_DATA_SCOPES);
const ACTION_SCOPE_SET = new Set(PAWKET_APP_ACTION_SCOPES);
const BLOCKED_SCOPE_SET = new Set(PAWKET_APP_BLOCKED_DATA_SCOPES);

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function escapeAttrSelector(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function safeClassList(value, fallback = '') {
  const tokens = String(value || '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => /^[a-zA-Z0-9_-]+$/.test(token));
  return tokens.join(' ') || fallback;
}

export function safeIconClass(value, fallback = 'bi-grid') {
  return safeClassList(value, fallback);
}

function safeId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9:_-]/g, '');
}

function normalizeScopeList(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean))];
}

function scopeIsBlocked(scope) {
  if (BLOCKED_SCOPE_SET.has(scope)) return true;
  return PAWKET_APP_BLOCKED_DATA_SCOPES.some((blocked) => {
    if (!blocked.endsWith(':*')) return false;
    return scope.startsWith(blocked.slice(0, -1));
  });
}

export function normalizePawketAppManifest(input = {}) {
  const id = safeId(input.id);
  const surfaces = normalizeScopeList(input.surfaces).filter((surface) => SURFACES.has(surface));
  return {
    id,
    name: String(input.name || input.title || id || 'Pawket App').trim(),
    shortName: String(input.shortName || input.name || id || 'App').trim(),
    description: String(input.description || '').trim(),
    icon: safeIconClass(input.icon || 'bi-grid'),
    version: String(input.version || '1.0.0').trim(),
    providerType: PROVIDER_TYPES.has(input.providerType) ? input.providerType : 'first_party',
    surfaces: surfaces.length ? surfaces : ['dock'],
    dataScopes: normalizeScopeList(input.dataScopes),
    actionScopes: normalizeScopeList(input.actionScopes),
    privacyLabel: String(input.privacyLabel || 'Uses approved Pet Pawket app data.').trim(),
    entry: String(input.entry || id || '').trim(),
    legacyAliasFor: safeId(input.legacyAliasFor || '')
  };
}

export function validatePawketAppManifest(input = {}) {
  const manifest = normalizePawketAppManifest(input);
  const errors = [];
  if (!manifest.id) errors.push('id is required');
  if (!/^[a-z0-9][a-z0-9:_-]*$/.test(manifest.id)) errors.push('id must use lowercase letters, numbers, dashes, underscores, or colons');
  if (!manifest.name) errors.push('name is required');
  if (!manifest.entry) errors.push('entry is required');
  if (!PROVIDER_TYPES.has(manifest.providerType)) errors.push(`providerType ${manifest.providerType} is not supported`);
  manifest.surfaces.forEach((surface) => {
    if (!SURFACES.has(surface)) errors.push(`surface ${surface} is not supported`);
  });
  manifest.dataScopes.forEach((scope) => {
    if (scopeIsBlocked(scope)) errors.push(`data scope ${scope} is blocked`);
    else if (!DATA_SCOPE_SET.has(scope)) errors.push(`data scope ${scope} is not allowed`);
  });
  manifest.actionScopes.forEach((scope) => {
    if (!ACTION_SCOPE_SET.has(scope)) errors.push(`action scope ${scope} is not allowed`);
  });
  return { ok: errors.length === 0, errors, manifest };
}

export function createPawketAppRegistry({ apps = [] } = {}) {
  const definitions = new Map();

  function register(app = {}) {
    const validation = validatePawketAppManifest(app.manifest || app);
    if (!validation.ok) {
      throw new Error(`[pawketAppRuntime] invalid app manifest: ${validation.errors.join('; ')}`);
    }
    const definition = {
      ...app,
      manifest: validation.manifest,
      render: typeof app.render === 'function' ? app.render : () => '',
      hydrate: typeof app.hydrate === 'function' ? app.hydrate : null,
      actions: app.actions && typeof app.actions === 'object' ? app.actions : {}
    };
    definitions.set(definition.manifest.id, definition);
    return definition;
  }

  apps.forEach(register);

  return {
    register,
    get(id) {
      return definitions.get(String(id || '').trim()) || null;
    },
    has(id) {
      return definitions.has(String(id || '').trim());
    },
    list({ surface = null, providerType = null, includeLegacy = false } = {}) {
      return Array.from(definitions.values())
        .filter((definition) => !surface || definition.manifest.surfaces.includes(surface))
        .filter((definition) => !providerType || definition.manifest.providerType === providerType)
        .filter((definition) => includeLegacy || !definition.manifest.legacyAliasFor);
    },
    manifests(options = {}) {
      return this.list(options).map((definition) => ({ ...definition.manifest }));
    }
  };
}

function compactString(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function publicProduct(item = {}) {
  const min = item.priceRange?.minVariantPrice;
  const rawAmount = Number(min?.amount);
  return {
    title: compactString(item.title, 'Featured pick'),
    handle: compactString(item.handle),
    href: item.handle ? `/product.html?handle=${encodeURIComponent(item.handle)}` : '/shop.html',
    priceLabel: Number.isFinite(rawAmount) ? `$${rawAmount.toFixed(2)}` : 'Open'
  };
}

function petSummary(pets = []) {
  const list = Array.isArray(pets) ? pets : [];
  const species = new Map();
  list.forEach((pet) => {
    const key = compactString(pet.species, 'pet').toLowerCase();
    species.set(key, (species.get(key) || 0) + 1);
  });
  return {
    count: list.length,
    speciesMix: Array.from(species.entries()).map(([label, count]) => ({ label, count })),
    hasProfiles: list.length > 0
  };
}

function passSummary(loopSummary = {}) {
  const sentTokens = Array.isArray(loopSummary?.sentTokens) ? loopSummary.sentTokens : [];
  const badges = Array.isArray(loopSummary?.badges) ? loopSummary.badges : [];
  return {
    sentCount: sentTokens.length,
    badgeCount: badges.length,
    hasActivePass: sentTokens.length > 0
  };
}

function publicStories(stories = []) {
  return (Array.isArray(stories) ? stories : []).slice(0, 6).map((story) => ({
    title: compactString(story.title || story.name, 'Public update'),
    summary: compactString(story.summary || story.snippet || story.description || story.body, 'Shared update')
  }));
}

export function createScopedAppDataBridge({ getSourceData = () => ({}), allowedScopes = PAWKET_APP_DATA_SCOPES } = {}) {
  const allowed = new Set(allowedScopes);

  function readSource() {
    const data = typeof getSourceData === 'function' ? getSourceData() : {};
    return data && typeof data === 'object' ? data : {};
  }

  function valueForScope(scope, source) {
    if (!allowed.has(scope) || scopeIsBlocked(scope)) return undefined;
    if (scope === 'pets:summary') return petSummary(source.pets);
    if (scope === 'pals:private_summary') {
      const pets = petSummary(source.pets);
      const journalMetrics = source.journalMetrics || {};
      return {
        privateFirst: true,
        profileCount: pets.count,
        favoriteMemoryCount: Number(journalMetrics.coreMemoryCount || 0)
      };
    }
    if (scope === 'passes:summary') return passSummary(source.loopSummary);
    if (scope === 'products:featured') {
      return { items: (Array.isArray(source.featured) ? source.featured : []).slice(0, 8).map(publicProduct) };
    }
    if (scope === 'stories:public') return { stories: publicStories(source.stories) };
    if (scope === 'charm:public_updates') {
      const activeCase = source.activeCase || null;
      return {
        hasActiveUpdate: !!activeCase,
        title: compactString(activeCase?.title, ''),
        status: activeCase ? 'active' : 'shared_when_ready'
      };
    }
    if (scope === 'dock:preferences') {
      const dock = source.dockSettings || {};
      return {
        side: dock.side === 'right' ? 'right' : 'left',
        size: ['sm', 'md', 'lg'].includes(dock.size) ? dock.size : 'md',
        collapsed: dock.collapsed === true,
        providerWidgets: dock.providerWidgets !== false
      };
    }
    return undefined;
  }

  function getScopedData(manifest = {}) {
    const normalized = normalizePawketAppManifest(manifest);
    const source = readSource();
    return normalized.dataScopes.reduce((data, scope) => {
      const value = valueForScope(scope, source);
      if (value !== undefined) data[scope] = value;
      return data;
    }, {});
  }

  return { getScopedData };
}

export function validateAppActionIntent(manifest = {}, intent = {}) {
  const normalized = normalizePawketAppManifest(manifest);
  const type = String(intent.type || intent.scope || '').trim();
  const errors = [];
  if (!type) errors.push('intent type is required');
  if (!normalized.actionScopes.includes(type)) errors.push(`action ${type} is not declared for ${normalized.id || 'app'}`);
  if (!ACTION_SCOPE_SET.has(type)) errors.push(`action ${type} is not allowed`);
  if (type === 'navigate') {
    const href = String(intent.href || '').trim();
    if (!href) errors.push('navigate href is required');
    if (/^(javascript|data|vbscript):/i.test(href) || href.startsWith('//')) {
      errors.push('navigate href must be a same-site path or safe URL');
    }
  }
  return { ok: errors.length === 0, errors, type };
}

function createScopedStorage(appId, storage = globalThis.localStorage) {
  const prefix = `pp-app-storage:${appId}:`;
  return {
    get(key, fallback = null) {
      try {
        const raw = storage?.getItem(`${prefix}${key}`);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { storage?.setItem(`${prefix}${key}`, JSON.stringify(value)); } catch {}
    },
    remove(key) {
      try { storage?.removeItem(`${prefix}${key}`); } catch {}
    }
  };
}

export function createPawketAppHost({
  registry,
  surface = 'dock',
  dataBridge = createScopedAppDataBridge(),
  makeContext = () => ({}),
  executeIntent = null
} = {}) {
  if (!registry) throw new Error('[pawketAppRuntime] registry is required');

  function definitionFor(id) {
    return registry.get(id);
  }

  function buildContext(id, extra = {}) {
    const definition = definitionFor(id);
    if (!definition) return null;
    const base = typeof makeContext === 'function' ? makeContext(id, extra) : {};
    const manifest = definition.manifest;
    return {
      ...base,
      ...extra,
      appId: id,
      surface,
      manifest,
      apps: registry.manifests({ surface }),
      scopedData: dataBridge.getScopedData(manifest),
      storage: base.storage || createScopedStorage(id),
      actions: base.actions || {},
      executeIntent: (intent = {}) => runIntent(id, intent)
    };
  }

  function render(id, extra = {}) {
    const definition = definitionFor(id);
    if (!definition) return '';
    const context = buildContext(id, extra);
    return definition.render(context) || '';
  }

  function hydrate(id, extra = {}) {
    const definition = definitionFor(id);
    if (!definition?.hydrate) return null;
    return definition.hydrate(buildContext(id, extra));
  }

  function runAction(id, actionName, payload = {}, extra = {}) {
    const definition = definitionFor(id);
    const action = definition?.actions?.[actionName];
    if (typeof action !== 'function') return null;
    return action(buildContext(id, extra), payload);
  }

  function runIntent(id, intent = {}) {
    const definition = definitionFor(id);
    if (!definition) return { ok: false, errors: ['app not found'] };
    const validation = validateAppActionIntent(definition.manifest, intent);
    if (!validation.ok) return validation;
    if (typeof executeIntent === 'function') {
      try { return executeIntent(definition.manifest, intent); } catch (err) {
        return { ok: false, errors: [String(err?.message || err || 'intent failed')] };
      }
    }
    return { ok: true, type: validation.type };
  }

  function sdkConfig(id, overrides = {}) {
    const definition = definitionFor(id);
    if (!definition) return null;
    const manifest = definition.manifest;
    return {
      id,
      title: overrides.title || manifest.name,
      subtitle: overrides.subtitle || manifest.description || 'Pawket app',
      icon: overrides.icon || manifest.icon,
      themeClass: overrides.themeClass || `is-${safeClassList(id, 'pawket-app')}`,
      bodyHtml: render(id, overrides),
      defaults: overrides.defaults || {}
    };
  }

  return {
    render,
    hydrate,
    runAction,
    runIntent,
    sdkConfig,
    listApps: (options = {}) => registry.manifests({ surface, ...options }),
    getDefinition: definitionFor
  };
}

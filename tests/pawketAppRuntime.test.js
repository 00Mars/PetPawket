import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPawketAppRegistry,
  createScopedAppDataBridge,
  validateAppActionIntent,
  validatePawketAppManifest
} from '../public/pawketAppRuntime.js';
import { firstPartyPawketApps } from '../public/pawketFirstPartyApps.js';

test('first-party Pawket apps register with stable app ids and standalone surfaces', () => {
  const registry = createPawketAppRegistry({ apps: firstPartyPawketApps });
  const currentDockIds = registry.manifests({ surface: 'dock' })
    .map((app) => app.id)
    .sort();
  const standaloneIds = registry.manifests({ surface: 'standalone' }).map((app) => app.id).sort();
  const dockIdsWithLegacy = registry.manifests({ surface: 'dock', includeLegacy: true }).map((app) => app.id).sort();
  assert.deepEqual(currentDockIds, ['loop', 'pals', 'pet-workspace', 'stories']);
  assert.deepEqual(standaloneIds, ['loop', 'pals', 'pet-workspace', 'stories']);
  assert.deepEqual(dockIdsWithLegacy, ['loop', 'pals', 'pet-workspace', 'reminders', 'stories', 'subs', 'traits']);
  assert.equal(registry.get('reminders').manifest.legacyAliasFor, 'pet-workspace');
  assert.equal(registry.get('traits').manifest.legacyAliasFor, 'pet-workspace');
  assert.equal(registry.get('subs').manifest.legacyAliasFor, 'loop');
  assert.equal(registry.get('pet-workspace').manifest.surfaces.includes('standalone'), true);
  assert.equal(registry.get('pals').manifest.surfaces.includes('standalone'), true);
  assert.equal(registry.get('loop').manifest.dataScopes.includes('passes:summary'), true);
  assert.equal(registry.get('loop').manifest.dataScopes.includes('products:featured'), true);
});

test('manifest validation blocks private story, care-support, and finance scopes', () => {
  const privateStory = validatePawketAppManifest({
    id: 'partner-story',
    name: 'Partner Story',
    entry: 'partner.story',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['stories:private'],
    actionScopes: ['navigate']
  });
  assert.equal(privateStory.ok, false);
  assert.match(privateStory.errors.join(' '), /stories:private is blocked/);

  const careSupport = validatePawketAppManifest({
    id: 'partner-care',
    name: 'Partner Care',
    entry: 'partner.care',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['care_support:assistance'],
    actionScopes: ['navigate']
  });
  assert.equal(careSupport.ok, false);
  assert.match(careSupport.errors.join(' '), /care_support:assistance is blocked/);

  const finance = validatePawketAppManifest({
    id: 'partner-finance',
    name: 'Partner Finance',
    entry: 'partner.finance',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['finance:ledger'],
    actionScopes: ['navigate']
  });
  assert.equal(finance.ok, false);
  assert.match(finance.errors.join(' '), /finance:ledger is blocked/);
});

test('scoped app data bridge returns sanitized summaries only', () => {
  const bridge = createScopedAppDataBridge({
    getSourceData: () => ({
      pets: [
        {
          id: 'pet_1',
          name: 'Maple',
          species: 'Dog',
          medicalNotes: 'private medical note',
          journal: [{ text: 'private journal text' }]
        }
      ],
      journalMetrics: {
        coreMemoryCount: 2,
        entries: [{ text: 'private memory text' }]
      },
      loopSummary: {
        sentTokens: [{ code: 'PASS-SECRET', chainLength: 2 }],
        badges: ['kind']
      },
      featured: [{ title: 'Care Toy', handle: 'care-toy', priceRange: { minVariantPrice: { amount: '12.50' } } }],
      stories: [{ title: 'Reviewed update', body: 'Public-safe body' }],
      finance: { ledger: 'blocked' },
      careSupport: { assistance: 'blocked' }
    })
  });

  const data = bridge.getScopedData({
    id: 'approved-partner',
    name: 'Approved Partner',
    entry: 'approved.partner',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['pets:summary', 'pals:private_summary', 'passes:summary', 'products:featured', 'stories:public'],
    actionScopes: ['navigate']
  });

  assert.deepEqual(data['pets:summary'], {
    count: 1,
    speciesMix: [{ label: 'dog', count: 1 }],
    hasProfiles: true
  });
  assert.equal(data['pals:private_summary'].favoriteMemoryCount, 2);
  assert.equal(data['passes:summary'].sentCount, 1);
  assert.equal(data['passes:summary'].hasActivePass, true);
  assert.equal(data['passes:summary'].code, undefined);
  assert.equal(JSON.stringify(data).includes('private medical note'), false);
  assert.equal(JSON.stringify(data).includes('private journal text'), false);
  assert.equal(JSON.stringify(data).includes('PASS-SECRET'), false);
  assert.equal(JSON.stringify(data).includes('blocked'), false);
});

test('action intents must be declared by the app manifest', () => {
  const manifest = {
    id: 'approved-partner',
    name: 'Approved Partner',
    entry: 'approved.partner',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['pets:summary'],
    actionScopes: ['navigate']
  };

  assert.equal(validateAppActionIntent(manifest, { type: 'navigate', href: '/pals.html' }).ok, true);
  const blocked = validateAppActionIntent(manifest, { type: 'send_pass' });
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors.join(' '), /send_pass is not declared/);

  const unsafe = validateAppActionIntent(manifest, { type: 'navigate', href: 'javascript:alert(1)' });
  assert.equal(unsafe.ok, false);
  assert.match(unsafe.errors.join(' '), /same-site path or safe URL/);
});

test('dock preference scope exposes current shelf controls only', () => {
  const bridge = createScopedAppDataBridge({
    getSourceData: () => ({
      dockSettings: {
        side: 'right',
        labels: 'off',
        size: 'lg',
        badges: false,
        collapsed: true,
        providerWidgets: false
      }
    })
  });

  const data = bridge.getScopedData({
    id: 'approved-dock-partner',
    name: 'Approved Dock Partner',
    entry: 'approved.dockPartner',
    providerType: 'approved_partner',
    surfaces: ['standalone'],
    dataScopes: ['dock:preferences'],
    actionScopes: ['navigate']
  });

  assert.deepEqual(data['dock:preferences'], {
    side: 'right',
    size: 'lg',
    collapsed: true,
    providerWidgets: false
  });
  assert.equal(Object.hasOwn(data['dock:preferences'], 'labels'), false);
  assert.equal(Object.hasOwn(data['dock:preferences'], 'badges'), false);
});

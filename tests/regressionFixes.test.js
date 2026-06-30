import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import debugRoutes from '../routes/debugRoutes.js';
import { logPasswordResetForEnvironment } from '../routes/passwordRoutes.js';
import { cleanupUploadedFile, preparePetAvatarUpload } from '../routes/petsRoutes.js';
import { charmPrototypeModeEnabled, prototypeResponse } from '../apps/charmfoundation/utils/prototypeMode.js';

async function withServer(app, run) {
  const server = app.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('debug whoami is unavailable in production', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const app = express();
    app.use('/api/debug', debugRoutes);
    await withServer(app, async (base) => {
      const resp = await fetch(`${base}/api/debug/whoami`, {
        headers: { cookie: 'auth_token=secret; shopify_token=also-secret' },
      });
      const body = await resp.json();
      assert.equal(resp.status, 404);
      assert.equal(body.ok, false);
      assert.equal(body.error, 'Not found');
    });
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});

test('production password reset logging does not emit tokenized reset links', () => {
  const calls = [];
  const logger = { info: (...args) => calls.push(args) };
  const exposed = logPasswordResetForEnvironment(
    'https://petpawket.test/reset-password?token=secret-token',
    { NODE_ENV: 'production' },
    logger
  );
  assert.equal(exposed, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].join(' ').includes('secret-token'), false);
  assert.equal(calls[0].join(' ').includes('reset-password'), false);
});

test('non-production password reset logging may emit local reset links', () => {
  const calls = [];
  const logger = { info: (...args) => calls.push(args) };
  const exposed = logPasswordResetForEnvironment(
    'https://petpawket.test/reset-password?token=dev-token',
    { NODE_ENV: 'development' },
    logger
  );
  assert.equal(exposed, true);
  assert.match(calls[0].join(' '), /dev-token/);
});

test('login and signup responses do not expose bearer or Shopify tokens in JSON', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8');
  const loginSource = source.slice(
    source.indexOf('async function handleLogin'),
    source.indexOf("app.post('/api/auth/login'")
  );
  const signupSource = source.slice(
    source.indexOf('async function handleSignup'),
    source.indexOf("app.post('/api/auth/signup'")
  );
  assert.equal(/token:\s*jwt/.test(loginSource), false);
  assert.equal(/shopifyAccessToken/.test(loginSource), false);
  assert.equal(/token:\s*jwt/.test(signupSource), false);
  assert.equal(/shopifyAccessToken/.test(signupSource), false);
  assert.match(loginSource, /auth_token/);
  assert.match(signupSource, /auth_token/);
});

test('first-party auth client does not persist or send local bearer tokens', () => {
  const authSource = fs.readFileSync(path.join(process.cwd(), 'public', 'auth.js'), 'utf8');
  const navbarSource = fs.readFileSync(path.join(process.cwd(), 'public', 'navbar.js'), 'utf8');
  assert.equal(/localStorage\.setItem\(CFG\.storageKey/.test(authSource), false);
  assert.equal(/headers\.set\('Authorization'/.test(authSource), false);
  assert.equal(/localStorage\.getItem\?\.\('authToken'\)/.test(navbarSource), false);
  assert.equal(/Authorization:\s*`Bearer/.test(navbarSource), false);
  assert.equal(/expectToken/.test(navbarSource), false);
  assert.match(authSource, /localStorage\.removeItem\(CFG\.storageKey\)/);
  assert.match(authSource, /cookie-first client mode/);
});

test('legacy public account script with bearer-token fallback is not shipped', () => {
  const legacyPath = path.join(process.cwd(), 'public', 'scripts', 'account.js');
  const accountHtml = fs.readFileSync(path.join(process.cwd(), 'public', 'account.html'), 'utf8');
  assert.equal(fs.existsSync(legacyPath), false);
  assert.equal(/scripts\/account\.js/.test(accountHtml), false);
});

test('password reset flow stores and consumes one-time token hashes', () => {
  const routeSource = fs.readFileSync(path.join(process.cwd(), 'routes', 'passwordRoutes.js'), 'utf8');
  const authSource = fs.readFileSync(path.join(process.cwd(), 'utils', 'auth.js'), 'utf8');
  const migration = fs.readFileSync(path.join(process.cwd(), 'db', 'migrations', '016_password_reset_tokens.sql'), 'utf8');
  assert.match(routeSource, /storePasswordResetToken/);
  assert.match(routeSource, /consumePasswordResetToken/);
  assert.match(routeSource, /passwordResetTokenHash/);
  assert.match(authSource, /jti:\s*crypto\.randomUUID\(\)/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS password_reset_tokens/);
  assert.match(migration, /token_hash TEXT UNIQUE NOT NULL/);
});

test('Loop debug and admin routes require explicit operator gates', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'routes', 'loopRoutes.js'), 'utf8');
  const isAdminSource = source.slice(source.indexOf('function isAdmin'), source.indexOf('function loopDebugEnabled'));
  assert.match(isAdminSource, /ADMIN_EMAILS/);
  assert.equal(/NODE_ENV !== 'production'/.test(isAdminSource), false);
  assert.match(source, /LOOP_DEBUG_ENDPOINTS_ENABLED/);
  assert.match(source, /router\.post\('\/debug\/seed', requireLoopDebugAccess, handleDebugSeed\)/);
  assert.match(source, /router\.post\('\/debug\/clear', requireLoopDebugAccess, handleDebugClear\)/);
});

test('uploaded avatar cleanup helper removes orphaned files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'petpawket-avatar-'));
  const filePath = path.join(dir, 'orphan.png');
  fs.writeFileSync(filePath, 'avatar');
  assert.equal(fs.existsSync(filePath), true);
  cleanupUploadedFile(filePath);
  assert.equal(fs.existsSync(filePath), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('pet avatar upload preparation accepts real raster image data only', async () => {
  const onePixelPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
  const prepared = await preparePetAvatarUpload(onePixelPng);
  assert.equal(prepared.extension, 'png');
  assert.equal(prepared.contentType, 'image/png');
  assert.equal(prepared.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
});

test('pet avatar upload preparation rejects svg and mislabeled non-image bytes', async () => {
  const svgData = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
  const htmlData = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
  await assert.rejects(() => preparePetAvatarUpload(`data:image/svg+xml;base64,${svgData}`), /Invalid image data/);
  await assert.rejects(() => preparePetAvatarUpload(`data:image/png;base64,${htmlData}`), /Invalid image data/);
});

test('CHARM prototype helper defaults to explicit prototype responses', () => {
  assert.equal(charmPrototypeModeEnabled({}), true);
  assert.equal(charmPrototypeModeEnabled({ CHARM_FOUNDATION_PROTOTYPE_MODE: 'false' }), false);
  assert.deepEqual(prototypeResponse('Prototype only'), {
    ok: true,
    status: 'prototype_queued',
    prototype: true,
    placeholder: true,
    message: 'Prototype only',
  });
});

test('CHARM public renderer does not use unsafe innerHTML interpolation', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'apps/charmfoundation/public/js/site.js'), 'utf8');
  assert.equal(/\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/.test(source), false);
});

test('Network import promotion uses the transaction-aware listing upsert helper', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'networkDB.pg.js'), 'utf8');
  assert.match(source, /upsertApprovedLaunchListingOnClient\(client, seed\)/);
  assert.equal(source.includes('const listing = await upsertApprovedLaunchListing(seed);'), false);
});

test('server blocks legacy claim proof paths from public static uploads', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8');
  assert.match(source, /app\.use\('\/uploads\/network\/claims'/);
});

test('server only serves allowed pet avatar upload paths publicly', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'server.js'), 'utf8');
  assert.match(source, /'\/uploads\/pets\/:fileName'/);
  assert.match(source, /'\/uploads\/pets\/:ownerDir\/:fileName'/);
  assert.match(source, /PET_AVATAR_CONTENT_TYPES/);
  assert.match(source, /X-Content-Type-Options', 'nosniff'/);
  assert.match(source, /app\.use\('\/uploads\/pets', notFoundUpload\)/);
  assert.match(source, /app\.use\('\/uploads', notFoundUpload\)/);
  assert.equal(/app\.use\('\/uploads', express\.static/.test(source), false);
});

test('pets echo debug route is gated and does not expose cookies or raw headers', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'routes/petsRoutes.js'), 'utf8');
  assert.match(source, /PETS_DEBUG && process\.env\.NODE_ENV !== 'production'/);
  assert.equal(/cookies\s*:/.test(source), false);
  assert.equal(/headers\s*:req\.headers/.test(source), false);
  assert.equal(/dbUser\s*:req\.dbUser/.test(source), false);
});

test('Pawket Pal story review consent defaults to private-first choices', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public/pals.html'), 'utf8');
  const dbSource = fs.readFileSync(path.join(process.cwd(), 'palDB.pg.js'), 'utf8');
  assert.equal(/name="allowPublicStory"\s+checked/.test(html), false);
  assert.equal(/name="allowCommunityPal"\s+checked/.test(html), false);
  assert.match(dbSource, /allowPublicStory, false\)/);
  assert.match(dbSource, /allowCommunityPal, false\)/);
});

test('account add and edit pet modals expose the same trait chip keys', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public/account.html'), 'utf8');
  const addKeys = Array.from(html.matchAll(/data-add-trait="([^"]+)"/g), match => match[1]);
  const editKeys = Array.from(html.matchAll(/data-trait="([^"]+)"/g), match => match[1]);
  assert.deepEqual([...new Set(editKeys)].sort(), [...new Set(addKeys)].sort());
});

test('account edit pet trait controls serialize before patch submission', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public/account.js'), 'utf8');
  const buildPatch = source.slice(
    source.indexOf('function buildPetPatchFromForm()'),
    source.indexOf('function setSelectValueCaseInsensitive')
  );
  assert.match(source, /function collectEditPetTraits\(\)/);
  assert.match(source, /function writeEditPetTraitsJson\(\)/);
  assert.match(source, /document\.getElementById\('editPetModal'\)\?\.addEventListener\('click'/);
  assert.match(source, /document\.getElementById\('editPetModal'\)\?\.addEventListener\('keydown'/);
  assert.match(source, /document\.getElementById\('editPetModal'\)\?\.addEventListener\('input'/);
  assert.match(source, /addEditPetAllergyChip\(value, \{ sync: false \}\)/);
  assert.match(source, /new Set\(normalizeTraitList\(val\)\.map/);
  assert.match(buildPatch, /writeEditPetTraitsJson\(\);[\s\S]*const traits = getHiddenTraits\(\);/);
});

test('pet creation response returns the post-update row for normalized fields', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'routes/petsRoutes.js'), 'utf8');
  const createRoute = source.slice(
    source.indexOf("router.post('/', async"),
    source.indexOf("router.patch('/:id'")
  );
  assert.match(createRoute, /let pet = inserted;/);
  assert.match(createRoute, /pet = await updatePetById\(user\.id, inserted\.id, extra\) \|\| inserted;/);
  assert.match(createRoute, /res\.status\(201\)\.json\(\{ ok:true, pet \}\);/);
});

test('addPet returns updatedAt using the same casing as pet updates and lists', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'userDB.pg.js'), 'utf8');
  const addPetSource = source.slice(
    source.indexOf('export async function addPet'),
    source.indexOf('export async function updateUserPets')
  );
  assert.match(addPetSource, /updated_at AS "updatedAt"/);
  assert.equal(/updated_at AS "UpdatedAt"/.test(addPetSource), false);
});

test('journal modal hydrates composer and filter type selects from the canonical type list', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public/account.js'), 'utf8');
  const typeBlock = source.slice(
    source.indexOf('const JOURNAL_ENTRY_TYPES = ['),
    source.indexOf('const JOURNAL_TYPE_BY_VALUE')
  );
  for (const type of ['weight', 'allergy', 'charm', 'pawket-pal']) {
    assert.match(typeBlock, new RegExp(`value: '${type}'`));
  }
  assert.match(source, /function ensureJournalControlOptions\(\)/);
  assert.match(source, /document\.getElementById\('journalEntryType'\)/);
  assert.match(source, /document\.getElementById\('journalFilterType'\)/);
  assert.match(source, /journalTypeOptions\(filterEl\?\.value \|\| '', \{ includeAll: true \}\)/);
});

test('journal modal uses Favorite Memory copy for the visible favorite filter', () => {
  const html = fs.readFileSync(path.join(process.cwd(), 'public/account.html'), 'utf8');
  assert.match(html, />Favorites only</);
  assert.equal(html.includes('>Core only<'), false);
});

test('journal modal ignores stale journal loads from previously opened pets', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'public/account.js'), 'utf8');
  const loadSource = source.slice(
    source.indexOf('async function loadPetJournal'),
    source.indexOf('function renderJournalEditForm')
  );
  assert.match(source, /let JOURNAL_LOAD_RUN = 0;/);
  assert.match(loadSource, /const loadRun = \+\+JOURNAL_LOAD_RUN;/);
  assert.match(loadSource, /loadRun !== JOURNAL_LOAD_RUN \|\| String\(CURRENT_PET_ID\) !== String\(petId\)/);
});

function installPetSurfaceGlobals() {
  globalThis.localStorage = {
    getItem: () => '',
    setItem: () => {},
    removeItem: () => {},
  };
  globalThis.window = {
    __AUTH_CONFIG: {},
    clearTimeout,
    setTimeout,
  };
  globalThis.document = {
    body: { setAttribute: () => {}, classList: { toggle: () => {} } },
    documentElement: { setAttribute: () => {} },
    addEventListener: () => {},
    getElementById: () => null,
    querySelectorAll: () => [],
    querySelector: () => null,
  };
}

function fakePetSurface(type = 'profile', image = '/assets/images/original-pet.png') {
  const nodes = {
    '[data-pet-personalize-label]': { textContent: 'Original label' },
    '[data-pet-personalize-title]': { textContent: 'Original title' },
    '[data-pet-personalize-body]': { textContent: 'Original body' },
    '[data-pet-personalize-cta]': {
      textContent: 'Original cta',
      href: '/original.html',
      getAttribute(name) { return name === 'href' ? this.href : ''; },
      setAttribute(name, value) { if (name === 'href') this.href = value; },
    },
    '[data-pet-personalize-image]': {
      src: image,
      alt: 'Original pet image',
      getAttribute(name) {
        if (name === 'src') return this.src;
        if (name === 'alt') return this.alt;
        return '';
      },
    },
  };
  return {
    attrs: { 'data-pet-personalize': type },
    image: nodes['[data-pet-personalize-image]'],
    querySelector(selector) { return nodes[selector] || null; },
    getAttribute(name) { return this.attrs[name] || ''; },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; },
  };
}

test('pet surface personalization rotates pets with one generic slot for multi-pet accounts', async () => {
  installPetSurfaceGlobals();

  const mod = await import(`../public/petSurfacePersonalization.js?rotation=${Date.now()}`);
  const onePet = [{ id: 'p1', name: 'Maple' }];
  const twoPets = [{ id: 'p1', name: 'Maple' }, { id: 'p2', name: 'Juniper' }];
  const threePets = [...twoPets, { id: 'p3', name: 'Otis' }];

  assert.deepEqual(mod.petRotationPool([]), []);
  assert.deepEqual(mod.petRotationPool(onePet), onePet);
  assert.deepEqual(mod.petRotationPool(twoPets), [...twoPets, null]);
  assert.equal(mod.petForPersonalizedIndex(onePet, 4)?.name, 'Maple');
  assert.equal(mod.petForPersonalizedIndex(twoPets, 0)?.name, 'Maple');
  assert.equal(mod.petForPersonalizedIndex(twoPets, 1)?.name, 'Juniper');
  assert.equal(mod.petForPersonalizedIndex(twoPets, 2), null);
  assert.equal(mod.petForPersonalizedIndex(twoPets, 3)?.name, 'Maple');
  assert.equal(mod.petForPersonalizedIndex(threePets, 3), null);
  assert.equal(mod.petForPersonalizedIndex(threePets, 4)?.name, 'Maple');
});

test('pet surface personalization applies selected pet avatar images to image hooks', async () => {
  installPetSurfaceGlobals();
  const mod = await import(`../public/petSurfacePersonalization.js?images=${Date.now()}`);
  const profile = fakePetSurface('profile');
  const memory = fakePetSurface('memory');
  const generic = fakePetSurface('pal', '/assets/images/generic-pal.png');
  const pets = [
    { id: 'p1', name: 'Maple', avatar: '/uploads/pets/maple.png' },
    { id: 'p2', name: 'Juniper', avatar: '/uploads/pets/juniper.png' },
  ];

  mod.applyPetSurfacePersonalization(pets, {
    querySelectorAll: () => [profile, memory, generic],
  });

  assert.equal(profile.image.src, '/uploads/pets/maple.png');
  assert.equal(profile.image.alt, 'Maple profile photo');
  assert.equal(memory.image.src, '/uploads/pets/juniper.png');
  assert.equal(memory.image.alt, 'Juniper profile photo');
  assert.equal(generic.image.src, '/assets/images/generic-pal.png');
  assert.equal(generic.image.alt, 'Original pet image');
});

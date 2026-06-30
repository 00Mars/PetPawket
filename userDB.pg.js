// userDB.pg.js — Postgres-only data access (ESM, Clerk-free)
import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

/* -------------------- Pool init -------------------- */
function normalizeConnString(raw) {
  if (!raw) return raw;
  // safety for earlier placeholder "@host:"
  return raw.replace('@host:', '@localhost:');
}

function normalizeTags(input) {
  if (input === undefined) return undefined;
  if (Array.isArray(input)) return input.map(s => String(s).replace(/^#/, '').trim()).filter(Boolean);
  if (typeof input === 'string') return input.split(',').map(s => String(s).replace(/^#/, '').trim()).filter(Boolean);
  return [];
}

const JOURNAL_ENTRY_TYPES = new Set([
  'note',
  'story',
  'milestone',
  'wellness',
  'vet',
  'medication',
  'meal',
  'walk',
  'training',
  'grooming',
  'play',
  'behavior',
  'weight',
  'allergy',
  'rescue',
  'memorial',
  'charm',
  'pawket-pal',
]);

const JOURNAL_VISIBILITY = new Set(['private', 'shareable', 'community', 'charm-foundation']);

function normalizeJournalEntryType(input) {
  const value = String(input || 'note').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return JOURNAL_ENTRY_TYPES.has(value) ? value : 'note';
}

function normalizeJournalVisibility(input) {
  const value = String(input || 'private').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  return JOURNAL_VISIBILITY.has(value) ? value : 'private';
}

function normalizeJournalDate(input) {
  if (input === undefined) return undefined;
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeJournalMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input;
}

const connectionString = normalizeConnString(process.env.DATABASE_URL);
if (process.env.NODE_ENV === 'production' && !connectionString) {
  throw new Error('DATABASE_URL is required in production.');
}

const useSSL = process.env.PGSSLMODE === 'require'
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({ connectionString, ssl: useSSL });

// one-time sanitized boot log (no secrets)
try {
  const url = new URL(connectionString);
  const safe = `${url.protocol}//${url.username ? '***@' : ''}${url.hostname}:${url.port}${url.pathname}`;
  console.log('[DB] pool init →', safe, useSSL ? '(ssl=require)' : '(ssl=off)');
} catch { /* ignore */ }

/* -------------------- Common projection -------------------- */
const SELECT_USER =
  `id,
   email,
   first_name AS "firstName",
   last_name  AS "lastName",
   charm_points AS "charmPoints",
   preferences,
   achievements,
   progress,
   activity_log AS "activityLog",
   huey_memory  AS "hueyMemory",
   memorials,
   badges,
   wishlist,
   avatar,
   shopify_linked AS "shopifyLinked",
   created_at    AS "createdAt",
   updated_at    AS "updatedAt"`;

// Auth-only projection (includes password hash; do not return to clients)
const SELECT_USER_AUTH =
  `${SELECT_USER},
   password_hash AS "passwordHash"`;

// Normalizes a row to always have sensible defaults
function mapUserRow(r) {
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    firstName: r.firstName ?? '',
    lastName: r.lastName ?? '',
    charmPoints: Number.isFinite(Number(r.charmPoints)) ? Number(r.charmPoints) : 0,
    preferences: r.preferences ?? {},
    achievements: r.achievements ?? [],
    progress: r.progress ?? {},
    activityLog: r.activityLog ?? [],
    hueyMemory: r.hueyMemory ?? {},
    memorials: r.memorials ?? [],
    badges: r.badges ?? [],
    wishlist: r.wishlist ?? [],
    avatar: r.avatar ?? null,
    shopifyLinked: !!r.shopifyLinked,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/* -------------------- Users: getters & ensure -------------------- */
export async function getUserByEmail(email) {
  const q = `SELECT ${SELECT_USER} FROM users WHERE email = $1 LIMIT 1;`;
  const { rows } = await pool.query(q, [email]);
  return rows[0] || null;
}

export async function getUserById(id) {
  const q = `SELECT ${SELECT_USER} FROM users WHERE id = $1 LIMIT 1;`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
}

// Auth-only getters (include passwordHash)
export async function getUserByEmailWithPassword(email) {
  const q = `SELECT ${SELECT_USER_AUTH} FROM users WHERE email = $1 LIMIT 1;`;
  const { rows } = await pool.query(q, [email]);
  return rows[0] || null;
}

export async function getUserByIdWithPassword(id) {
  const q = `SELECT ${SELECT_USER_AUTH} FROM users WHERE id = $1 LIMIT 1;`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
}

/** Idempotent: returns existing row or creates one */
export async function ensureUser(email, firstName = '', lastName = '') {
  if (!email) throw new Error('ensureUser: email is required');

  // Fast-path
  const existing = await getUserByEmail(email);
  if (existing) return existing;

  // Try UPSERT first (requires a unique index on email)
  try {
    const q = `
      INSERT INTO users (email, first_name, last_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO UPDATE
        SET first_name = COALESCE(users.first_name, EXCLUDED.first_name),
            last_name  = COALESCE(users.last_name,  EXCLUDED.last_name)
      RETURNING ${SELECT_USER};
    `;
    const { rows } = await pool.query(q, [email, firstName, lastName]);
    return rows[0];
  } catch (e) {
    // Fallback when ON CONFLICT can't be used (no unique/exclusion constraint yet)
    if ((e?.message || '').includes('ON CONFLICT')) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const sel = await client.query(
          `SELECT ${SELECT_USER} FROM users WHERE email = $1 FOR UPDATE;`,
          [email]
        );
        if (sel.rows[0]) {
          await client.query('COMMIT');
          return sel.rows[0];
        }

        const ins = await client.query(
          `INSERT INTO users (email, first_name, last_name)
           VALUES ($1, $2, $3)
           RETURNING ${SELECT_USER};`,
          [email, firstName, lastName]
        );

        await client.query('COMMIT');
        return ins.rows[0];
      } catch (e2) {
        await client.query('ROLLBACK');
        throw e2;
      } finally {
        client.release();
      }
    }
    throw e;
  }
}

export async function ensureUserByEmail(email, firstName = '', lastName = '') {
  if (!email) throw new Error('ensureUserByEmail: email required');
  const q = `
    INSERT INTO users (email, first_name, last_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (email) DO UPDATE
      SET first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
          last_name  = COALESCE(NULLIF(EXCLUDED.last_name,  ''), users.last_name),
          updated_at = NOW()
    RETURNING id, email, first_name, last_name, preferences, achievements, progress,
              activity_log, huey_memory, memorials, wishlist, avatar, shopify_linked,
              created_at, updated_at;`;
  const { rows } = await pool.query(q, [email, firstName, lastName]);
  return mapUserRow(rows[0]);
}

export async function createUser({
  email,
  firstName = '',
  lastName = '',
  password = null,
  passwordHash = null,
  shopifyLinked = false,
  preferences = {},
  achievements = [],
  progress = {},
  activityLog = [],
  hueyMemory = {},
  memorials = [],
  wishlist = [],
  avatar = null,
} = {}) {
  if (!email) throw new Error('createUser: email is required');

  const hash = passwordHash || (password ? await bcrypt.hash(password, 12) : null);

  const sql = `
    INSERT INTO users (
      email, first_name, last_name, password_hash, shopify_linked,
      preferences, achievements, progress, activity_log, huey_memory, memorials, wishlist, avatar
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13
    )
    ON CONFLICT (email) DO UPDATE
      SET first_name = COALESCE(users.first_name, EXCLUDED.first_name),
          last_name  = COALESCE(users.last_name,  EXCLUDED.last_name)
    RETURNING ${SELECT_USER};
  `;

  const params = [
    email,
    firstName,
    lastName,
    hash,
    !!shopifyLinked,
    JSON.stringify(preferences ?? {}),
    JSON.stringify(achievements ?? []),
    JSON.stringify(progress ?? {}),
    JSON.stringify(activityLog ?? []),
    JSON.stringify(hueyMemory ?? {}),
    JSON.stringify(memorials ?? []),
    JSON.stringify(wishlist ?? []),
    avatar,
  ];

  const { rows } = await pool.query(sql, params);
  return rows[0];
}

/**
 * getOrCreateUser(profileLike)
 */
export async function getOrCreateUser(profile = {}) {
  const email =
    profile.email ||
    profile.emailAddress ||
    profile.email_address ||
    profile?.primaryEmailAddress?.emailAddress ||
    profile?.emailAddresses?.[0]?.emailAddress ||
    profile?.emailes?.[0]?.email || // legacy typo seen earlier
    profile?.customer?.email ||      // Shopify-like shape
    null;

  if (!email) throw new Error('getOrCreateUser: email is required');

  const firstName = profile.firstName || profile.first_name || profile?.customer?.firstName || '';
  const lastName  = profile.lastName  || profile.last_name  || profile?.customer?.lastName  || '';

  const password      = profile.password      || null;
  const passwordHash  = profile.passwordHash  || null;

  const existing = await getUserByEmail(email);
  if (existing) return existing;

  return await createUser({
    email,
    firstName,
    lastName,
    password,
    passwordHash,
  });
}

/** Compatibility alias for older code paths */
export async function syncUserIfMissing(email, firstName = '', lastName = '') {
  if (!email) throw new Error('syncUserIfMissing: email is required');
  const existing = await getUserByEmail(email);
  if (existing) return existing;
  return await createUser({ email, firstName, lastName });
}

/* -------------------- UPDATE USER (camelCase-safe) -------------------- */
export async function updateUser(id, patch = {}) {
  const remap = {
    firstName: 'first_name',
    lastName: 'last_name',
    passwordHash: 'password_hash',
    shopifyLinked: 'shopify_linked',
    activityLog: 'activity_log',
    hueyMemory: 'huey_memory',
    charmPoints: 'charm_points',
  };
  const norm = {};
  for (const [k, v] of Object.entries(patch || {})) {
    norm[remap[k] || k] = v;
  }

  const allowed = new Set([
    'first_name', 'last_name', 'password_hash', 'avatar', 'shopify_linked',
    'preferences', 'progress', 'huey_memory',
    'achievements', 'activity_log', 'memorials', 'wishlist',
    'charm_points', 'badges',
  ]);

  const jsonbMerge   = new Set(['preferences', 'progress', 'huey_memory']);
  const jsonbReplace = new Set(['achievements', 'activity_log', 'memorials', 'wishlist', 'badges']);

  const keys = Object.keys(norm).filter(k => allowed.has(k));
  if (keys.length === 0) return await getUserById(id);

  const setClauses = [];
  const params = [id]; // $1 is id

  keys.forEach((k, i) => {
    const idx = i + 2;
    if (jsonbMerge.has(k)) {
      setClauses.push(`${k} = COALESCE(${k}, '{}'::jsonb) || $${idx}::jsonb`);
      params.push(JSON.stringify(norm[k]));
    } else if (jsonbReplace.has(k)) {
      setClauses.push(`${k} = $${idx}::jsonb`);
      params.push(JSON.stringify(norm[k]));
    } else {
      setClauses.push(`${k} = $${idx}`);
      params.push(norm[k]);
    }
  });

  const sql = `
    UPDATE users
       SET ${setClauses.join(', ')},
           updated_at = NOW()
     WHERE id = $1
     RETURNING ${SELECT_USER};
  `;
  const { rows } = await pool.query(sql, params);
  return rows[0] || null;
}

/* -------------------- Password reset tokens -------------------- */
export async function storePasswordResetToken(userId, tokenHash, expiresAt) {
  if (!userId || !tokenHash || !expiresAt) throw new Error('storePasswordResetToken: missing input');
  const { rows } = await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, user_id AS "userId", expires_at AS "expiresAt", created_at AS "createdAt";`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0] || null;
}

export async function consumePasswordResetToken(userId, tokenHash) {
  if (!userId || !tokenHash) return null;
  const { rows } = await pool.query(
    `UPDATE password_reset_tokens
       SET used_at = NOW()
     WHERE user_id = $1
       AND token_hash = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     RETURNING id, user_id AS "userId", used_at AS "usedAt";`,
    [userId, tokenHash]
  );
  return rows[0] || null;
}

export async function revokePasswordResetTokensForUser(userId) {
  if (!userId) return { revoked: 0 };
  const { rowCount } = await pool.query(
    `UPDATE password_reset_tokens
       SET used_at = COALESCE(used_at, NOW())
     WHERE user_id = $1
       AND used_at IS NULL;`,
    [userId]
  );
  return { revoked: rowCount || 0 };
}

/* -------------------- Pets -------------------- */

export async function getPetsByUserId(userId) {
  try {
    const q = `
      SELECT
        id,
        user_id        AS "userId",
        name,
        species,
        breed,
        birthday,
        birthdate,
        sex,
        spayed_neutered AS "spayedNeutered",
        weight_kg,
        size,
        chew_strength,
        allergies,
        dislikes,
        toy_prefs,
        food_prefs,
        notes,
        avatar,
        customer_email   AS "customerEmail",
        traits,
        created_at       AS "createdAt",
        updated_at       AS "updatedAt"
      FROM pets
      WHERE user_id = $1
      ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(q, [userId]);
    return rows;
  } catch (e) {
    if (e?.code === '42703') {
      const q2 = `
        SELECT id, user_id AS "userId", name, species, breed, birthday, avatar,
               '{}'::jsonb AS traits,
               created_at AS "createdAt", updated_at AS "updatedAt"
          FROM pets
         WHERE user_id = $1
         ORDER BY created_at DESC;
      `;
      const { rows } = await pool.query(q2, [userId]);
      return rows;
    }
    if (e?.code === '42P01') { // relation missing
      return [];
    }
    throw e;
  }
}

export async function addPet(email, newPet = {}) {
  const user = await getUserByEmail(email);
  if (!user) return false;
  const { name, species = null, breed = null, birthday = null, traits = {} } = newPet;
  if (!name) throw new Error('addPet: pet.name is required');

  // normalize species to lowercase to satisfy check constraint
  const speciesNorm =
    species == null || species === ''
      ? null
      : String(species).trim().toLowerCase();

  const sql = `
    INSERT INTO pets (user_id, name, species, breed, birthday, traits)
    VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    RETURNING
      id, user_id AS "userId", name, species, breed, birthday, birthdate,
      sex, spayed_neutered AS "spayedNeutered", weight_kg, size, chew_strength,
      allergies, dislikes, toy_prefs, food_prefs, notes, avatar, customer_email AS "customerEmail",
      traits, created_at AS "createdAt", updated_at AS "updatedAt";
  `;
  const params = [user.id, name, speciesNorm, breed, birthday, JSON.stringify(traits ?? {})];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

export async function updateUserPets(email, newPets = []) {
  const user = await getUserByEmail(email);
  if (!user) return false;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM pets WHERE user_id = $1;', [user.id]);
    for (const p of newPets) {
      if (!p?.name) continue;
      await client.query(
        `INSERT INTO pets (user_id, name, species, breed, birthday)
         VALUES ($1, $2, $3, $4, $5);`,
        [user.id, p.name, p.species ?? null, p.breed ?? null, p.birthday ?? null]
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deletePet(email, petIndex = 0) {
  const user = await getUserByEmail(email);
  if (!user) return false;

  const { rows } = await pool.query(
    `SELECT id FROM pets WHERE user_id = $1 ORDER BY created_at ASC;`,
    [user.id]
  );
  const target = rows[petIndex];
  if (!target) return false;

  await pool.query(`DELETE FROM pets WHERE id = $1;`, [target.id]);
  return true;
}

export async function updatePet(userId, pets) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM pets WHERE user_id = $1;', [userId]);
    for (const p of (pets || [])) {
      if (!p?.name) continue;
      await client.query(
        `INSERT INTO pets (user_id, name, species, breed, birthday)
         VALUES ($1, $2, $3, $4, $5);` ,
        [userId, p.name, p.species ?? null, p.breed ?? null, p.birthday ?? null]
      );
    }
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Edit a single pet by id for a specific user — hardened placeholders & casts */

// helper for dynamic updates
function _snake(k) {
  return k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
}

// columns we allow to be written
const PET_WRITEABLE = new Set([
  'name','species','breed',
  'birthday','birthdate',
  'sex','spayed_neutered',
  'weight_kg','size','chew_strength',
  'notes','avatar',
  'allergies','dislikes','toy_prefs','food_prefs',
  'traits'
]);

export async function updatePetById(userId, petId, patch = {}) {
  if (!userId || !petId) throw new Error('Missing ids');

  const fields = [];
  const values = [];
  let i = 1;

  for (const [key, val] of Object.entries(patch)) {
    const col = _snake(key);
    const target = PET_WRITEABLE.has(col) ? col : (PET_WRITEABLE.has(key) ? key : null);
    if (!target) continue;

    // normalize species to lowercase always
    if (target === 'species') {
      if (val == null || val === '') {
        fields.push(`species = NULL`);
      } else {
        fields.push(`species = LOWER($${i})`);
        values.push(String(val).trim());
        i++;
      }
      continue;
    }

    if (target === 'traits') {
      fields.push(`traits = $${i}::jsonb`);
      values.push(typeof val === 'string' ? val : JSON.stringify(val ?? {}));
      i++;
      continue;
    }

    if (Array.isArray(val) && ['allergies','dislikes','toy_prefs','food_prefs'].includes(target)) {
      fields.push(`${target} = $${i}::text[]`);
      values.push(val);
      i++;
      continue;
    }

    if (target === 'birthday' || target === 'birthdate') {
      if (val == null || val === '') {
        fields.push(`${target} = NULL`);
      } else {
        fields.push(`${target} = $${i}::date`);
        values.push(val);
        i++;
      }
      continue;
    }

    if (target === 'spayed_neutered') {
      fields.push(`${target} = $${i}::boolean`);
      values.push(val === null ? null : !!val);
      i++;
      continue;
    }

    if (target === 'weight_kg') {
      fields.push(`${target} = $${i}::numeric`);
      values.push(val);
      i++;
      continue;
    }

    if (target === 'chew_strength') {
      fields.push(`${target} = $${i}::integer`);
      values.push(val);
      i++;
      continue;
    }

    fields.push(`${target} = $${i}`);
    values.push(val);
    i++;
  }

  if (!fields.length) throw new Error('No fields to update');

  // mirror birthday/birthdate if only one was provided
  const touchedBirthday  = fields.some(f => f.startsWith('birthday '));
  const touchedBirthdate = fields.some(f => f.startsWith('birthdate '));
  if (touchedBirthday && !touchedBirthdate) {
    fields.push(`birthdate = birthday`);
  } else if (touchedBirthdate && !touchedBirthday) {
    fields.push(`birthday = birthdate`);
  }

  // also normalize existing species on any update to satisfy check constraint
  const hasSpeciesAssignment = fields.some(f => f.startsWith('species ='));
  if (!hasSpeciesAssignment) {
    fields.push('species = LOWER(species)');
  }

  const sql = `
    UPDATE pets
       SET ${fields.join(', ')}, updated_at = now()
     WHERE user_id = $${i}::uuid
       AND id      = $${i+1}::uuid
    RETURNING
      id, user_id AS "userId",
      name, species, breed,
      birthday, birthdate,
      sex,
      spayed_neutered AS "spayedNeutered",
      weight_kg,
      size, chew_strength,
      notes, avatar,
      allergies, dislikes, toy_prefs, food_prefs,
      traits,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
  `;
  values.push(userId, petId);

  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

export async function deletePetById(userId, petId) {
  const sql = `DELETE FROM pets WHERE user_id = $1 AND id = $2 RETURNING id;`;
  const { rows } = await pool.query(sql, [userId, petId]);
  return !!rows[0];
}

/* -------------------- Addresses -------------------- */
export async function getAddressesByUserId(userId) {
  const sql = `
    SELECT
      id,
      user_id AS "userId",
      label,
      name,
      phone,
      address1,
      address2,
      city,
      state,
      postal_code AS "postalCode",
      country,
      is_default_shipping AS "isDefaultShipping",
      is_default_billing  AS "isDefaultBilling",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM addresses
    WHERE user_id = $1
    ORDER BY is_default_shipping DESC, is_default_billing DESC, created_at DESC, id DESC;
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows;
}

export async function addAddress(userId, a) {
  // Normalize booleans
  const ship = !!a.isDefaultShipping;
  const bill = !!a.isDefaultBilling;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (ship) {
      await client.query(`UPDATE addresses SET is_default_shipping = FALSE WHERE user_id = $1 AND is_default_shipping = TRUE`, [userId]);
    }
    if (bill) {
      await client.query(`UPDATE addresses SET is_default_billing  = FALSE WHERE user_id = $1 AND is_default_billing  = TRUE`, [userId]);
    }

    const sql = `
      INSERT INTO addresses (
        user_id, label, name, phone,
        address1, address2, city, state, postal_code, country,
        is_default_shipping, is_default_billing
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      )
      RETURNING
        id, user_id AS "userId", label, name, phone,
        address1, address2, city, state, postal_code AS "postalCode", country,
        is_default_shipping AS "isDefaultShipping", is_default_billing AS "isDefaultBilling",
        created_at AS "CreatedAt", updated_at AS "UpdatedAt";
    `;
    const vals = [
      userId,
      a.label ?? null,
      a.name ?? null,
      a.phone ?? null,
      a.address1,
      a.address2 ?? null,
      a.city,
      a.state,
      a.postalCode,
      a.country,
      ship,
      bill,
    ];
    const { rows } = await client.query(sql, vals);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function updateAddressById(userId, addressId, patch = {}) {
  const fields = [];
  const values = [];
  let i = 1;

  const map = {
    label: 'label',
    name: 'name',
    phone: 'phone',
    address1: 'address1',
    address2: 'address2',
    city: 'city',
    state: 'state',
    postalCode: 'postal_code',
    country: 'country',
  };
  for (const k of Object.keys(map)) {
    if (patch[k] !== undefined) {
      fields.push(`${map[k]} = $${i++}`);
      values.push(patch[k] ?? null);
    }
  }

  const setDefaultShipping = patch.isDefaultShipping === true;
  const setDefaultBilling  = patch.isDefaultBilling  === true;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (setDefaultShipping) {
      await client.query(`UPDATE addresses SET is_default_shipping = FALSE WHERE user_id = $1 AND is_default_shipping = TRUE`, [userId]);
      fields.push(`is_default_shipping = TRUE`);
    } else if (patch.isDefaultShipping === false) {
      fields.push(`is_default_shipping = FALSE`);
    }

    if (setDefaultBilling) {
      await client.query(`UPDATE addresses SET is_default_billing = FALSE WHERE user_id = $1 AND is_default_billing = TRUE`, [userId]);
      fields.push(`is_default_billing = TRUE`);
    } else if (patch.isDefaultBilling === false) {
      fields.push(`is_default_billing = FALSE`);
    }

    if (fields.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const sql = `
      UPDATE addresses
         SET ${fields.join(', ')}
       WHERE user_id = $${i++} AND id = $${i++}
       RETURNING
         id, user_id AS "userId", label, name, phone,
         address1, address2, city, state, postal_code AS "postalCode", country,
         is_default_shipping AS "isDefaultShipping", is_default_billing AS "isDefaultBilling",
         created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    values.push(userId, addressId);
    const { rows } = await client.query(sql, values);
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function deleteAddressById(userId, addressId) {
  const sql = `DELETE FROM addresses WHERE user_id = $1 AND id = $2 RETURNING id`;
  const { rows } = await pool.query(sql, [userId, addressId]);
  return !!rows[0];
}

/* -------------------- Pet Journal -------------------- */
export async function getPetJournal(userId, petId) {
  const sql = `
	    SELECT id,
	           user_id AS "userId",
	           pet_id  AS "petId",
	           title,
	           entry_type AS "entryType",
	           occurred_at AS "occurredAt",
	           text,
	           mood,
	           tags,
	           photo,
	           highlighted,
	           visibility,
	           metadata,
	           created_at AS "CreatedAt",
	           created_at AS "createdAt",
	           updated_at AS "updatedAt"
	      FROM pet_journal
	     WHERE user_id = $1 AND pet_id = $2
	     ORDER BY COALESCE(occurred_at, created_at) DESC, created_at DESC, id DESC;
	  `;

  try {
    const { rows } = await pool.query(sql, [userId, petId]);
    return rows;
  } catch (e) {
    if (e?.code === '42P01') return [];
    throw e;
  }
}

export async function addPetJournalEntry(userId, petId, {
  text,
  title = null,
  entryType = 'note',
  occurredAt = null,
  mood = null,
  tags = [],
  photo = null,
  highlighted = false,
  visibility = 'private',
  metadata = {},
} = {}) {
  if (!userId || !petId) throw new Error('addPetJournalEntry: userId and petId required');
  if (!text) throw new Error('addPetJournalEntry: text required');

  const tagsArray = normalizeTags(tags) || [];
  const normalizedType = normalizeJournalEntryType(entryType);
  const normalizedVisibility = normalizeJournalVisibility(visibility);
  const normalizedOccurredAt = normalizeJournalDate(occurredAt) || null;
  const normalizedMetadata = JSON.stringify(normalizeJournalMetadata(metadata));

  const sql = `
    INSERT INTO pet_journal (
      user_id, pet_id, text, mood, tags, photo, highlighted,
      title, entry_type, occurred_at, visibility, metadata
    )
    VALUES (
      $1, $2, $3, $4, $5::text[], $6, $7::boolean,
      $8, $9, COALESCE($10::timestamptz, NOW()), $11, $12::jsonb
    )
    RETURNING id,
              user_id AS "userId",
              pet_id  AS "petId",
              title, entry_type AS "entryType", occurred_at AS "occurredAt",
              text, mood, tags, photo, highlighted, visibility, metadata,
              created_at AS "createdAt", updated_at AS "updatedAt";
  `;
  const params = [
    userId,
    petId,
    text,
    mood || null,
    tagsArray,
    photo || null,
    !!highlighted,
    title ? String(title).trim() : null,
    normalizedType,
    normalizedOccurredAt,
    normalizedVisibility,
    normalizedMetadata,
  ];
  const { rows } = await pool.query(sql, params);
  return rows[0];
}

export async function getPetJournalEntryById(userId, petId, entryId) {
  const sql = `
	    SELECT id, user_id AS "userId", pet_id AS "petId",
	           title, entry_type AS "entryType", occurred_at AS "occurredAt",
	           text, mood, tags, photo, highlighted, visibility, metadata,
	           created_at AS "createdAt", updated_at AS "updatedAt"
	      FROM pet_journal
     WHERE user_id = $1 AND pet_id = $2 AND id = $3
     LIMIT 1;
  `;
  const { rows } = await pool.query(sql, [userId, petId, entryId]);
  return rows[0] || null;
}

export async function updatePetJournalEntry(userId, petId, entryId, patch = {}) {
  const fields = [];
  const vals = [];
  let i = 1;

  if (patch.text !== undefined) { fields.push(`text = $${i++}`); vals.push(patch.text ?? ''); }
  if (patch.title !== undefined) { fields.push(`title = $${i++}`); vals.push(patch.title ? String(patch.title).trim() : null); }
  if (patch.entryType !== undefined) { fields.push(`entry_type = $${i++}`); vals.push(normalizeJournalEntryType(patch.entryType)); }
  if (patch.occurredAt !== undefined) {
    fields.push(`occurred_at = COALESCE($${i++}::timestamptz, created_at)`);
    vals.push(normalizeJournalDate(patch.occurredAt) || null);
  }
  if (patch.mood !== undefined) { fields.push(`mood = $${i++}`); vals.push(patch.mood ?? null); }

  if (patch.tags !== undefined) {
    const tags = normalizeTags(patch.tags);
    fields.push(`tags = $${i++}::text[]`);
    vals.push(tags);
  }

  if (patch.photo !== undefined) { // set to null on remove
    fields.push(`photo = $${i++}`);
    vals.push(patch.photo);
  }

  if (patch.highlighted !== undefined) {
    fields.push(`highlighted = $${i++}::boolean`);
    vals.push(!!patch.highlighted);
  }

  if (patch.visibility !== undefined) {
    fields.push(`visibility = $${i++}`);
    vals.push(normalizeJournalVisibility(patch.visibility));
  }

  if (patch.metadata !== undefined) {
    fields.push(`metadata = $${i++}::jsonb`);
    vals.push(JSON.stringify(normalizeJournalMetadata(patch.metadata)));
  }

  if (fields.length === 0) return null;

  const sql = `
    UPDATE pet_journal
       SET ${fields.join(', ')}, updated_at = NOW()
     WHERE user_id = $${i++} AND pet_id = $${i++} AND id = $${i++}
	     RETURNING id, user_id AS "userId", pet_id AS "petId",
	               title, entry_type AS "entryType", occurred_at AS "occurredAt",
	               text, mood, tags, photo, highlighted, visibility, metadata,
	               created_at AS "createdAt", updated_at AS "updatedAt";
	  `;
  vals.push(userId, petId, entryId);
  const { rows } = await pool.query(sql, vals);
  return rows[0] || null;
}

export async function deletePetJournalEntry(userId, petId, entryId) {
  const sql = `DELETE FROM pet_journal WHERE user_id=$1 AND pet_id=$2 AND id=$3 RETURNING id;`;
  const { rows } = await pool.query(sql, [userId, petId, entryId]);
  return !!rows[0];
}

/* -------------------- Achievements / Wishlist / Activity -------------------- */
export async function addAchievement(userId, achievement) {
  if (!achievement) return false;
  const u = await getUserById(userId);
  const current = Array.isArray(u?.achievements) ? u.achievements : [];
  if (!current.includes(achievement)) current.push(achievement);
  const updated = await updateUser(userId, { achievements: current });
  return !!updated;
}

export async function updateWishlist(userId, wishlist = []) {
  const updated = await updateUser(userId, { wishlist });
  return updated;
}

export async function logActivity(userId, entry) {
  const u = await getUserById(userId);
  const log = Array.isArray(u?.activityLog) ? u.activityLog : [];
  log.push({ date: new Date().toISOString(), entry });
  const updated = await updateUser(userId, { activity_log: log });
  return updated;
}

/* -------------------- Loop Tokens + CHARM -------------------- */
export async function createLoopToken(userId, orderId, code) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertToken = `
      INSERT INTO loop_tokens (code, created_by_user_id, created_order_id, chain_length)
      VALUES ($1, $2, $3, 1)
      RETURNING id, code, created_by_user_id AS "createdByUserId",
                created_order_id AS "createdOrderId",
                created_at AS "createdAt", chain_length AS "chainLength",
                shown_at AS "shownAt";
    `;
    const { rows } = await client.query(insertToken, [code, userId, orderId || null]);
    const token = rows[0];
    await client.query(
      `INSERT INTO loop_token_links (token_id, position, user_id, order_id)
       VALUES ($1, 1, $2, $3);`,
      [token.id, userId, orderId || null]
    );
    await client.query('COMMIT');
    return token;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getLoopTokenByOrderId(orderId) {
  const { rows } = await pool.query(
    `SELECT id, code, created_by_user_id AS "createdByUserId",
            created_order_id AS "createdOrderId",
            created_at AS "createdAt", chain_length AS "chainLength",
            last_redeemed_at AS "lastRedeemedAt",
            shown_at AS "shownAt", status
       FROM loop_tokens
      WHERE created_order_id = $1
      LIMIT 1;`,
    [orderId]
  );
  return rows[0] || null;
}

export async function getLoopTokenByCode(code) {
  const { rows } = await pool.query(
    `SELECT t.id, t.code, t.chain_length AS "chainLength",
            t.created_at AS "createdAt", t.last_redeemed_at AS "lastRedeemedAt",
            t.created_by_user_id AS "createdByUserId", t.status, t.shown_at AS "shownAt",
            u.first_name AS "creatorFirstName", u.last_name AS "creatorLastName"
       FROM loop_tokens t
       LEFT JOIN users u ON u.id = t.created_by_user_id
      WHERE t.code = $1
      LIMIT 1;`,
    [code]
  );
  return rows[0] || null;
}

export async function getPendingLoopToken(userId) {
  const { rows } = await pool.query(
    `SELECT id, code, chain_length AS "chainLength", created_at AS "createdAt"
       FROM loop_tokens
      WHERE created_by_user_id = $1 AND shown_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;`,
    [userId]
  );
  return rows[0] || null;
}

export async function markLoopTokenSeen(userId, code) {
  const { rows } = await pool.query(
    `UPDATE loop_tokens
        SET shown_at = NOW()
      WHERE created_by_user_id = $1 AND code = $2
      RETURNING id, code, shown_at AS "shownAt";`,
    [userId, code]
  );
  return rows[0] || null;
}

export async function addLoopTokenLink(tokenId, userId, orderId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: tokenRows } = await client.query(
      `SELECT id, chain_length AS "chainLength", created_by_user_id AS "createdByUserId"
         FROM loop_tokens
        WHERE id = $1
        FOR UPDATE;`,
      [tokenId]
    );
    const token = tokenRows[0];
    if (!token) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'TOKEN_NOT_FOUND' };
    }

    const { rows: existing } = await client.query(
      `SELECT 1 FROM loop_token_links WHERE token_id = $1 AND user_id = $2 LIMIT 1;`,
      [tokenId, userId]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'ALREADY_LINKED' };
    }

    const { rows: lastRows } = await client.query(
      `SELECT user_id AS "userId", position
         FROM loop_token_links
        WHERE token_id = $1
        ORDER BY position DESC
        LIMIT 1;`,
      [tokenId]
    );
    const lastLink = lastRows[0];
    const nextPosition = (lastLink?.position || token.chainLength || 1) + 1;

    await client.query(
      `INSERT INTO loop_token_links (token_id, position, user_id, order_id)
       VALUES ($1, $2, $3, $4);`,
      [tokenId, nextPosition, userId, orderId || null]
    );

    await client.query(
      `UPDATE loop_tokens
          SET chain_length = $2,
              last_redeemed_at = NOW()
        WHERE id = $1;`,
      [tokenId, nextPosition]
    );

    await client.query('COMMIT');
    return {
      ok: true,
      position: nextPosition,
      chainLength: nextPosition,
      senderUserId: lastLink?.userId || token.createdByUserId,
      createdByUserId: token.createdByUserId,
      previousPosition: lastLink?.position || 1,
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function appendCharmPoints(userId, points, reason, tokenId = null, meta = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO charm_ledger (user_id, points, reason, token_id, meta)
       VALUES ($1, $2, $3, $4, $5::jsonb);`,
      [userId, points, reason, tokenId, JSON.stringify(meta || {})]
    );
    await client.query(
      `UPDATE users SET charm_points = COALESCE(charm_points, 0) + $2, updated_at = NOW()
        WHERE id = $1;`,
      [userId, points]
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function awardBadge(userId, badgeKey) {
  if (!badgeKey) return false;
  const user = await getUserById(userId);
  const list = Array.isArray(user?.badges) ? user.badges.slice() : [];
  if (!list.includes(badgeKey)) list.push(badgeKey);
  await updateUser(userId, { badges: list });
  return true;
}

export async function countSuccessfulShares(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM loop_token_links l
       JOIN loop_token_links prev
         ON prev.token_id = l.token_id AND prev.position = l.position - 1
      WHERE prev.user_id = $1;`,
    [userId]
  );
  return rows[0]?.count || 0;
}

export async function countSharesInWindow(userId, hours = 72) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
       FROM loop_token_links l
       JOIN loop_token_links prev
         ON prev.token_id = l.token_id AND prev.position = l.position - 1
      WHERE prev.user_id = $1
        AND l.redeemed_at >= NOW() - ($2::text || ' hours')::interval;`,
    [userId, String(hours)]
  );
  return rows[0]?.count || 0;
}

export async function getLoopSummary(userId) {
  const { rows: userRows } = await pool.query(
    `SELECT charm_points AS "charmPoints", badges FROM users WHERE id = $1 LIMIT 1;`,
    [userId]
  );
  const base = userRows[0] || { charmPoints: 0, badges: [] };

  const { rows: sent } = await pool.query(
    `SELECT id, code, chain_length AS "chainLength",
            created_at AS "createdAt", last_redeemed_at AS "lastRedeemedAt",
            status, shown_at AS "shownAt"
       FROM loop_tokens
      WHERE created_by_user_id = $1
      ORDER BY created_at DESC
      LIMIT 50;`,
    [userId]
  );

  const { rows: received } = await pool.query(
    `SELECT t.code, t.chain_length AS "chainLength",
            l.position, l.redeemed_at AS "redeemedAt"
       FROM loop_token_links l
       JOIN loop_tokens t ON t.id = l.token_id
      WHERE l.user_id = $1 AND l.position > 1
      ORDER BY l.redeemed_at DESC
      LIMIT 50;`,
    [userId]
  );

  const { rows: ledger } = await pool.query(
    `SELECT points, reason, token_id AS "tokenId", created_at AS "createdAt", meta
       FROM charm_ledger
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 6;`,
    [userId]
  );

  const pending = sent.find(t => !t.shownAt) || null;
  const sharesCount = await countSuccessfulShares(userId);
  const sharesRecent = await countSharesInWindow(userId, 72);
  const maxChainLength = sent.reduce((max, t) => Math.max(max, Number(t.chainLength || 1)), 1);
  const activeChains = sent.filter(t => Number(t.chainLength || 1) > 1).length;
  let impact = null;
  try {
    impact = await getImpactSummaryForUser(userId);
  } catch {
    impact = {
      total: 0,
      thisMonth: 0,
      redemptions: 0,
      rescuesHelped: 0,
      activeCase: null,
      recentlyFunded: null,
    };
  }

  return {
    points: Number(base.charmPoints || 0),
    badges: base.badges || [],
    sharesCount,
    sharesRecent,
    maxChainLength,
    activeChains,
    impact,
    pendingToken: pending ? { code: pending.code, chainLength: pending.chainLength, createdAt: pending.createdAt } : null,
    sentTokens: sent,
    receivedTokens: received,
    recentRewards: ledger || [],
  };
}

export async function listLoopTokens(limit = 100) {
  const { rows } = await pool.query(
    `SELECT t.id, t.code, t.chain_length AS "chainLength",
            t.created_at AS "createdAt", t.last_redeemed_at AS "lastRedeemedAt",
            t.created_by_user_id AS "createdByUserId",
            u.email AS "creatorEmail"
       FROM loop_tokens t
       LEFT JOIN users u ON u.id = t.created_by_user_id
      ORDER BY t.created_at DESC
      LIMIT $1;`,
    [limit]
  );
  return rows;
}

export async function clearLoopTokensForUser(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: tokenRows } = await client.query(
      `SELECT id FROM loop_tokens WHERE created_by_user_id = $1;`,
      [userId]
    );
    const tokenIds = tokenRows.map(r => r.id);
    if (tokenIds.length) {
      await client.query(
        `DELETE FROM loop_token_links WHERE token_id = ANY($1::bigint[]);`,
        [tokenIds]
      );
      await client.query(
        `DELETE FROM charm_ledger WHERE token_id = ANY($1::bigint[]);`,
        [tokenIds]
      );
    }
    await client.query(
      `DELETE FROM loop_tokens WHERE created_by_user_id = $1;`,
      [userId]
    );
    await client.query('COMMIT');
    return { ok: true, deleted: tokenIds.length };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getLoopLeaderboard(limit = 5) {
  const { rows: topChains } = await pool.query(
    `SELECT t.code, t.chain_length AS "chainLength",
            t.last_redeemed_at AS "lastRedeemedAt",
            u.first_name AS "firstName", u.last_name AS "lastName"
       FROM loop_tokens t
       LEFT JOIN users u ON u.id = t.created_by_user_id
      ORDER BY t.chain_length DESC NULLS LAST, t.last_redeemed_at DESC NULLS LAST, t.created_at DESC
      LIMIT $1;`,
    [limit]
  );

  const { rows: topSpreaders } = await pool.query(
    `SELECT prev.user_id AS "userId",
            u.first_name AS "firstName", u.last_name AS "lastName",
            COUNT(*)::int AS "shares"
       FROM loop_token_links l
       JOIN loop_token_links prev
         ON prev.token_id = l.token_id AND prev.position = l.position - 1
       LEFT JOIN users u ON u.id = prev.user_id
      GROUP BY prev.user_id, u.first_name, u.last_name
      ORDER BY COUNT(*) DESC
      LIMIT $1;`,
    [limit]
  );

  return { topChains, topSpreaders };
}

export async function getRandomImpactStory() {
  const { rows } = await pool.query(
    `SELECT id, title, body, pet_name AS "petName", image_url AS "imageUrl"
       FROM loop_impact_stories
      WHERE active = true
      ORDER BY RANDOM()
      LIMIT 1;`
  );
  return rows[0] || null;
}

export async function getImpactStories(limit = 5) {
  const safe = Math.min(10, Math.max(1, Number(limit) || 5));
  const { rows } = await pool.query(
    `SELECT id, title, body, pet_name AS "petName", image_url AS "imageUrl", created_at AS "createdAt"
       FROM loop_impact_stories
      WHERE active = true
      ORDER BY created_at DESC
      LIMIT $1;`,
    [safe]
  );
  return rows;
}

export async function addImpactStory({
  title,
  body,
  petName = null,
  imageUrl = null,
  goalAmount = 250,
  currency = 'USD',
  status = 'active',
  priority = 100,
  active = true,
} = {}) {
  const { rows } = await pool.query(
    `INSERT INTO loop_impact_stories
      (title, body, pet_name, image_url, active, goal_amount, currency, status, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, title, body, pet_name AS "petName", image_url AS "imageUrl",
               goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
               currency, status, priority, active;`,
    [title, body, petName, imageUrl, active, goalAmount, currency, status, priority]
  );
  return rows[0];
}

export async function activateImpactCase(caseId) {
  if (!caseId) return null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE loop_impact_stories SET active = false WHERE active = true;`);
    const { rows } = await client.query(
      `UPDATE loop_impact_stories
          SET active = true,
              status = 'active',
              starts_at = COALESCE(starts_at, NOW())
        WHERE id = $1 AND status = 'active'
      RETURNING id, title, body, pet_name AS "petName", image_url AS "imageUrl",
                goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
                currency, status, priority, active;`,
      [caseId]
    );
    await client.query('COMMIT');
    return rows[0] || null;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getActiveImpactCase() {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, pet_name AS "petName", image_url AS "imageUrl",
              goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
              currency, status, priority, active,
              starts_at AS "startsAt", completed_at AS "completedAt"
         FROM loop_impact_stories
        WHERE active = true AND status = 'active'
        ORDER BY priority ASC, created_at ASC
        LIMIT 1;`
    );
    return rows[0] || null;
  } catch (e) {
    if (e?.code === '42P01') return null;
    throw e;
  }
}

export async function getImpactCaseProgress(caseId) {
  if (!caseId) return null;
  const { rows } = await pool.query(
    `SELECT id, goal_amount AS "goalAmount", funded_amount AS "fundedAmount", currency
       FROM loop_impact_stories
      WHERE id = $1
      LIMIT 1;`,
    [caseId]
  );
  const row = rows[0];
  if (!row) return null;
  const goal = Number(row.goalAmount || 0);
  const funded = Number(row.fundedAmount || 0);
  const progressPct = goal > 0 ? Math.min(100, Math.round((funded / goal) * 100)) : 0;
  return { ...row, progressPct };
}

export async function getRecentFundedImpactCase(hours = 72) {
  const windowHours = Number.isFinite(Number(hours)) ? Number(hours) : 72;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, pet_name AS "petName", image_url AS "imageUrl",
              goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
              currency, status, priority, active,
              starts_at AS "startsAt", completed_at AS "completedAt"
         FROM loop_impact_stories
        WHERE status = 'funded'
          AND completed_at IS NOT NULL
          AND completed_at >= NOW() - ($1::text || ' hours')::interval
        ORDER BY completed_at DESC
        LIMIT 1;`,
      [windowHours]
    );
    return rows[0] || null;
  } catch (e) {
    if (e?.code === '42P01') return null;
    throw e;
  }
}

export async function allocateImpactForRedemption({
  tokenId,
  userId,
  orderId,
  orderSubtotal = 0,
  currency = 'USD',
  meta = {},
} = {}) {
  if (!tokenId || !userId || !orderId) return { ok: false, error: 'Missing parameters' };

  const subtotal = Number(orderSubtotal || 0);
  const baseAmount = 0.5;
  const percentRate = 0.01;
  const percentAmount = Math.max(0, subtotal * percentRate);
  let amount = baseAmount + percentAmount;
  amount = Math.min(5, amount);
  amount = Math.round(amount * 100) / 100;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: caseRows } = await client.query(
      `SELECT id, goal_amount AS "goalAmount", funded_amount AS "fundedAmount"
         FROM loop_impact_stories
        WHERE active = true AND status = 'active'
        ORDER BY priority ASC, created_at ASC
        LIMIT 1
        FOR UPDATE;`
    );
    const activeCase = caseRows[0];
    if (!activeCase) {
      await client.query('ROLLBACK');
      return { ok: false, error: 'No active impact case' };
    }

    const { rows: ledgerRows } = await client.query(
      `INSERT INTO loop_impact_ledger
        (token_id, user_id, order_id, case_id, amount, base_amount, percent_amount, percent_rate, order_subtotal, currency, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
       ON CONFLICT (order_id, token_id) DO NOTHING
       RETURNING id;`,
      [
        tokenId,
        userId,
        String(orderId),
        activeCase.id,
        amount,
        baseAmount,
        Math.round(percentAmount * 100) / 100,
        percentRate,
        Math.round(subtotal * 100) / 100,
        currency || 'USD',
        JSON.stringify(meta || {}),
      ]
    );

    if (!ledgerRows.length) {
      await client.query('ROLLBACK');
      return { ok: false, duplicate: true };
    }

    const { rows: updated } = await client.query(
      `UPDATE loop_impact_stories
          SET funded_amount = funded_amount + $1
        WHERE id = $2
      RETURNING funded_amount AS "fundedAmount", goal_amount AS "goalAmount";`,
      [amount, activeCase.id]
    );

    const funded = Number(updated[0]?.fundedAmount || 0);
    const goal = Number(updated[0]?.goalAmount || 0);

    if (goal > 0 && funded >= goal) {
      await client.query(
        `UPDATE loop_impact_stories
            SET status = 'funded', active = false, completed_at = NOW()
          WHERE id = $1;`,
        [activeCase.id]
      );

      const { rows: nextRows } = await client.query(
        `SELECT id
           FROM loop_impact_stories
          WHERE status = 'active' AND active = false
          ORDER BY priority ASC, created_at ASC
          LIMIT 1
          FOR UPDATE;`
      );
      const next = nextRows[0];
      if (next?.id) {
        await client.query(
          `UPDATE loop_impact_stories
              SET active = true,
                  starts_at = COALESCE(starts_at, NOW())
            WHERE id = $1;`,
          [next.id]
        );
      }
    }

    await client.query('COMMIT');
    return { ok: true, caseId: activeCase.id, amount, goal, funded };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getImpactSummaryForUser(userId) {
  if (!userId) return null;
  try {
    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total,
              COALESCE(SUM(amount) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0)::numeric AS "thisMonth",
              COUNT(*)::int AS redemptions,
              COUNT(DISTINCT case_id)::int AS "rescuesHelped"
         FROM loop_impact_ledger
        WHERE user_id = $1;`,
      [userId]
    );
    const base = rows[0] || { total: 0, thisMonth: 0, redemptions: 0, rescuesHelped: 0 };
    const activeCase = await getActiveImpactCase();
    let activeWithProgress = null;
    if (activeCase) {
      const goal = Number(activeCase.goalAmount || 0);
      const funded = Number(activeCase.fundedAmount || 0);
      const progressPct = goal > 0 ? Math.min(100, Math.round((funded / goal) * 100)) : 0;
      activeWithProgress = { ...activeCase, progressPct };
    }
    const recent = await getRecentFundedImpactCase(72);
    const recentWithProgress = recent ? { ...recent, progressPct: 100 } : null;

    return {
      total: Number(base.total || 0),
      thisMonth: Number(base.thisMonth || 0),
      redemptions: Number(base.redemptions || 0),
      rescuesHelped: Number(base.rescuesHelped || 0),
      activeCase: activeWithProgress,
      recentlyFunded: recentWithProgress,
    };
  } catch (e) {
    if (e?.code === '42P01') {
      return {
        total: 0,
        thisMonth: 0,
        redemptions: 0,
        rescuesHelped: 0,
        activeCase: null,
        recentlyFunded: null,
      };
    }
    throw e;
  }
}

export async function listImpactCases(limit = 50) {
  const safe = Math.min(200, Math.max(1, Number(limit) || 50));
  const { rows } = await pool.query(
    `SELECT id, title, body, pet_name AS "petName", image_url AS "imageUrl",
            goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
            currency, status, priority, active,
            created_at AS "createdAt", starts_at AS "startsAt", completed_at AS "completedAt"
       FROM loop_impact_stories
      ORDER BY active DESC, status = 'active' DESC, priority ASC, created_at DESC
      LIMIT $1;`,
    [safe]
  );
  return rows;
}

export async function updateImpactCase({
  id,
  title,
  body,
  petName,
  imageUrl,
  goalAmount,
  currency,
  status,
  priority,
} = {}) {
  if (!id) return null;
  const { rows } = await pool.query(
    `UPDATE loop_impact_stories
        SET title = COALESCE($2, title),
            body = COALESCE($3, body),
            pet_name = COALESCE($4, pet_name),
            image_url = COALESCE($5, image_url),
            goal_amount = COALESCE($6, goal_amount),
            currency = COALESCE($7, currency),
            status = COALESCE($8, status),
            priority = COALESCE($9, priority)
      WHERE id = $1
      RETURNING id, title, body, pet_name AS "petName", image_url AS "imageUrl",
                goal_amount AS "goalAmount", funded_amount AS "fundedAmount",
                currency, status, priority, active;`,
    [
      id,
      title ?? null,
      body ?? null,
      petName ?? null,
      imageUrl ?? null,
      goalAmount ?? null,
      currency ?? null,
      status ?? null,
      priority ?? null,
    ]
  );
  return rows[0] || null;
}

export async function awardMonthlyLeaderboard(month) {
  const monthKey = month || new Date().toISOString().slice(0, 7);
  const { rows: existing } = await pool.query(
    `SELECT award_type FROM loop_monthly_awards WHERE month = $1;`,
    [monthKey]
  );
  const done = new Set(existing.map(r => r.award_type));
  const results = { month: monthKey, awards: [] };

  // Top chain
  if (!done.has('top_chain')) {
    const { rows } = await pool.query(
      `SELECT id, created_by_user_id AS "userId", chain_length AS "chainLength"
         FROM loop_tokens
        ORDER BY chain_length DESC NULLS LAST, last_redeemed_at DESC NULLS LAST
        LIMIT 1;`
    );
    const top = rows[0];
    if (top?.userId) {
      await appendCharmPoints(top.userId, 0, 'monthly_top_chain', top.id, { month: monthKey, chainLength: top.chainLength });
      await awardBadge(top.userId, 'monthly_top_chain');
      await pool.query(
        `INSERT INTO loop_monthly_awards (month, award_type, user_id, token_id, meta)
         VALUES ($1, 'top_chain', $2, $3, $4::jsonb)
         ON CONFLICT (month, award_type) DO NOTHING;`,
        [monthKey, top.userId, top.id, JSON.stringify({ chainLength: top.chainLength })]
      );
      results.awards.push({ type: 'top_chain', userId: top.userId, tokenId: top.id });
    }
  }

  // Top spreader
  if (!done.has('top_spreader')) {
    const { rows } = await pool.query(
      `SELECT prev.user_id AS "userId", COUNT(*)::int AS "shares"
         FROM loop_token_links l
         JOIN loop_token_links prev
           ON prev.token_id = l.token_id AND prev.position = l.position - 1
        GROUP BY prev.user_id
        ORDER BY COUNT(*) DESC
        LIMIT 1;`
    );
    const top = rows[0];
    if (top?.userId) {
      await appendCharmPoints(top.userId, 0, 'monthly_top_spreader', null, { month: monthKey, shares: top.shares });
      await awardBadge(top.userId, 'monthly_top_spreader');
      await pool.query(
        `INSERT INTO loop_monthly_awards (month, award_type, user_id, token_id, meta)
         VALUES ($1, 'top_spreader', $2, NULL, $3::jsonb)
         ON CONFLICT (month, award_type) DO NOTHING;`,
        [monthKey, top.userId, JSON.stringify({ shares: top.shares })]
      );
      results.awards.push({ type: 'top_spreader', userId: top.userId });
    }
  }

  return results;
}

/* -------------------- Health -------------------- */
export async function pingDb() {
  const { rows } = await pool.query('SELECT 1 AS ok;');
  return rows[0]?.ok === 1;
}

/* Optional default export for legacy imports */
export default {
  // users
  getUserByEmail,
  getUserById,
  ensureUser,
  ensureUserByEmail,
  createUser,
  getOrCreateUser,
  syncUserIfMissing,
  updateUser,
  storePasswordResetToken,
  consumePasswordResetToken,
  revokePasswordResetTokensForUser,

  // pets
  getPetsByUserId,
  addPet,
  updateUserPets,
  deletePet,
  updatePet,          // legacy: replace-all variant
  updatePetById,      // edit single pet (supports all fields)
  deletePetById,      // delete single pet

  // activity / wishlist / achievements
  addAchievement,
  updateWishlist,
  logActivity,

  // loop tokens + charm
  createLoopToken,
  getLoopTokenByOrderId,
  getLoopTokenByCode,
  getPendingLoopToken,
  markLoopTokenSeen,
  addLoopTokenLink,
  appendCharmPoints,
  awardBadge,
  countSuccessfulShares,
  countSharesInWindow,
  getLoopSummary,
  listLoopTokens,
  clearLoopTokensForUser,
  getLoopLeaderboard,
  getRandomImpactStory,
  getImpactStories,
  addImpactStory,
  getActiveImpactCase,
  getImpactCaseProgress,
  getRecentFundedImpactCase,
  allocateImpactForRedemption,
  getImpactSummaryForUser,
  listImpactCases,
  updateImpactCase,
  activateImpactCase,
  awardMonthlyLeaderboard,

  // journals
  getPetJournal,
  addPetJournalEntry,
  updatePetJournalEntry,
  deletePetJournalEntry,
  getPetJournalEntryById,

  // addresses
  getAddressesByUserId,
  addAddress,
  updateAddressById,
  deleteAddressById,

  // health
  pingDb,
};

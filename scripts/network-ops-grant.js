// scripts/network-ops-grant.js
import 'dotenv/config';
import { ensureUser, getUserByEmail } from '../userDB.pg.js';
import { grantOpsRole, closeNetworkDbPool } from '../networkDB.pg.js';

async function run() {
  const emailArg = String(process.argv[2] || '').trim().toLowerCase();
  const grantedByArg = String(process.argv[3] || '').trim().toLowerCase();

  if (!emailArg) {
    throw new Error('Usage: node scripts/network-ops-grant.js <email> [granted-by-email]');
  }

  const user = await ensureUser(emailArg);
  let grantedById = null;
  if (grantedByArg) {
    const granted = await getUserByEmail(grantedByArg);
    grantedById = granted?.id || null;
  }

  const role = await grantOpsRole(user.id, grantedById);
  console.log('[network-ops-grant] granted', {
    email: user.email,
    userId: user.id,
    roleId: role?.id,
    grantedById,
  });
}

run()
  .catch((err) => {
    console.error('[network-ops-grant] failed:', err?.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await closeNetworkDbPool(); } catch {}
  });

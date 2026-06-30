# Pawket Admin Security Model

Last updated: 2026-05-26

Status: baseline model. Not an implemented authentication or authorization system.

## Principle

Pawket Admin requires its own administrative trust boundary. It must not reuse a shared generic website admin model or ordinary customer session as proof of finance authority.

Pawket Admin accounts should be designed for local vault access, finance duties, export control, connector trust, auditability, and separation of duties.

## Roles

### Owner Root

Highest local authority. Intended for the accountable owner of the Pet Pawket finance vault.

Allowed:

- Initialize vault.
- Assign and revoke roles.
- Unlock full archive.
- Configure recovery key.
- Approve key rotation.
- Reopen closed periods with reason.
- Export full archive.
- Review audit tamper alerts.

Not recommended:

- Daily bookkeeping unless necessary.
- Routine connector import review if delegated.

### Finance Admin

Operational finance lead.

Allowed:

- Unlock finance workspace.
- Review connector imports.
- Approve source events.
- Add and link source documents.
- Run management reports.
- Create correction events.
- Prepare exports within assigned profiles.
- Close normal periods if granted.

Not allowed without Owner Root:

- Full archive export.
- Recovery key changes.
- Role grants.
- Key rotation approval.
- Silent period reopening.

### Bookkeeper

Record preparation role.

Allowed:

- Stage expenses.
- Stage documents.
- Match source events to documents.
- Prepare reconciliations.
- Flag missing documents.
- Draft corrections.

Not allowed:

- Approve final ledger changes alone.
- Close periods.
- Export investor, public impact, or full archive packs.
- Change calculation rules.

### Accountant Export User

Limited export role for external or internal accountant support.

Allowed:

- Generate approved accountant packs.
- Generate IRS support packs.
- View export manifests for assigned periods.

Not allowed:

- Unlock full vault.
- View private story, assistance, or insurance details.
- Change source records.
- Approve records.
- Run investor or public impact exports.

### Foundation Admin

Mission and foundation finance role for CHARM and future CHERISH reporting once approved.

Allowed:

- Review donation and restricted fund records.
- Prepare foundation packs.
- Review donor acknowledgment evidence.
- Review privacy-safe impact outcome records.

Not allowed:

- Access full commerce archive by default.
- View private assistance, medical, hardship, or story details beyond approved role scope.
- Treat CHARM and CHERISH as one entity unless legal/accounting review approves it.

### Investor Read-Only

Restricted read role for reviewed investor reporting only.

Allowed:

- View approved investor report packages.
- View metric definitions and period boundaries included in that package.

Not allowed:

- Browse raw ledger.
- Export raw source documents.
- View private customer, pet, assistance, medical, story, or insurance details.
- Access connector debug bundles.

### Connector Node

Machine role for source systems such as the website, Shopify adapter, CHARM adapter, Pawket Network adapter, or future services.

Allowed:

- Provide signed or HMAC-protected encrypted source-event bundles.
- Provide cursor state for read-only incremental sync.
- Provide payload hash and schema version.

Not allowed:

- Unlock vault.
- Read decrypted vault data.
- Write finance records.
- Request exports.
- Reopen periods.
- Approve imports.
- Act as a human admin.

## Permission Families

Permission families should remain explicit:

- `vault.unlock`
- `vault.full_archive`
- `vault.key_manage`
- `roles.manage`
- `connector.import`
- `connector.debug`
- `documents.stage`
- `documents.approve`
- `ledger.stage`
- `ledger.approve`
- `ledger.correct`
- `period.close`
- `period.reopen`
- `reports.run`
- `exports.accountant`
- `exports.irs_support`
- `exports.investor`
- `exports.foundation`
- `exports.public_impact`
- `exports.full_archive`
- `audit.view`
- `audit.tamper_review`

Use role-specific grants. Do not create one broad `admin: true` switch for Pawket Admin.

## Session Unlock

Pawket Admin should require an explicit vault unlock step after login. Login proves identity. Unlock proves access to the local encrypted vault.

Session state should include:

- Admin account id.
- Active role.
- Unlock state.
- Unlock time.
- Last activity time.
- Device id.
- Local vault id.
- Permission snapshot id.

Sensitive actions should require an unlocked session:

- View ledger details.
- View source documents.
- Approve import.
- Run exports.
- Close or reopen periods.
- Change roles or keys.

## Auto-Lock

Auto-lock should protect inactive sessions.

Baseline expectations:

- Lock on inactivity.
- Lock on sleep or app close.
- Lock before export generation if session expired.
- Lock before role changes or key operations unless freshly confirmed.
- Connector imports may land in encrypted quarantine while locked, but they cannot be approved while locked.

Exact durations need security review. Do not hard-code final security durations in this pass.

## Role Review

Role grants should be reviewed periodically and recorded in the audit log.

Required audit events:

- Role granted.
- Role revoked.
- Permission profile changed.
- Owner Root recovery action.
- Failed unlock threshold reached.
- Session auto-locked.
- Sensitive export generated.

# Pawket Admin Threat Model

Last updated: 2026-05-29

Status: formal threat-model pass for the Pawket Admin desktop-app trust kernel. This document does not certify production security and does not approve live finance, Care Credit, CHARM assistance, insurance, tax, or investor-reporting behavior.

## System Overview

Pawket Admin is the future local-first encrypted desktop authority for Pet Pawket finance truth.

The public website, Shopify, Pawket Network, Pawket Pals, CHARM, and future services may eventually provide source events through connector nodes. Those nodes are read-only evidence sources. They are not allowed to edit the live ledger, request exports, decrypt documents, approve imports, reopen periods, or act as generic admins.

The current implementation is a skeleton only:

- No production encryption.
- No live desktop shell.
- No live connector endpoint.
- No real finance data.
- No UI.
- No public website finance surface.
- No files under `public/`.
- No production live ledger commit; the current live-ledger gate is disabled and test-only.

## Assets

High-value assets:

- Local vault database or file store.
- Audit log and hash chain.
- Connector quarantine records.
- Source events.
- Source documents and document metadata.
- Export manifests.
- Report runs.
- Calculation rules.
- Period close records.
- Role and permission assignments.
- Future vault keys, recovery keys, HMAC secrets, and signing keys.
- Accountant, tax, investor, foundation, and public impact packages.

Sensitive Pet Pawket domains:

- Customer order and payment evidence.
- Vendor, contractor, invoice, and tax records.
- CHARM and future CHERISH fund records.
- Restricted fund evidence.
- Future Care Credit liability records.
- Future assistance records.
- Insurance referral metadata, if approved later.
- Private pet, story, medical, hardship, memorial, and support-note data.
- Pawket Pal and HeartCode provenance where it touches private stories or value.

## Actors

Trusted human roles:

- Owner Root.
- Finance Admin.
- Bookkeeper.
- Accountant Export User.
- Foundation Admin.
- Investor Read-Only.

Machine or system roles:

- Connector Node.
- Pawket Admin local import guard.
- Future backup/restore process.
- Future vault key manager.

Potential adversaries:

- Opportunistic thief with a stolen laptop.
- Attacker with a stolen encrypted backup.
- Compromised website connector.
- Malicious insider or over-permissioned contractor.
- Malicious source-document submitter.
- Attacker replaying old connector bundles.
- Attacker forging connector bundles.
- Attacker trying to manipulate reports or public impact proof.
- Attacker trying to exfiltrate private assistance, story, medical, or insurance data.

## Trust Boundaries

Boundary 1: local Pawket Admin vault.

- Highest-trust zone.
- Owns finance truth.
- Must be encrypted before production.
- Must produce append-only audit events for high-value actions.

Boundary 2: connector quarantine.

- Lower-trust landing zone for source bundles.
- Connector data is evidence, not ledger truth.
- Quarantined bundles cannot modify reviewed records.

Boundary 3: public website and source systems.

- Source systems can produce read-only source events.
- They cannot own finance truth.
- They cannot request exports.
- They cannot access decrypted documents.

Boundary 4: exports.

- Controlled release boundary.
- Exports must use profiles, allowlists, redaction rules, manifests, hashes, and audit events.

Boundary 5: future backups and recovery.

- Backup files leave the primary device.
- Backups must be encrypted and restorable without exposing raw keys.

## Data Flows

1. Source system creates an operational event.
2. Read-only connector packages source events into a bundle.
3. Bundle includes schema version, connector id, cursor, payload hash, idempotency keys, and signature/HMAC placeholder.
4. Pawket Admin stores the bundle in quarantine.
5. Pawket Admin appends audit events for receive/quarantine.
6. A human admin reviews the bundle.
7. Future approved import may stage source events; it still does not allow the connector to write ledger truth.
8. Reports run from reviewed vault records.
9. Exports are generated from export profiles with manifests, hashes, redaction, and audit events.
10. Backups are encrypted future artifacts with backup manifests and restore audit events.

## STRIDE Threat Categories

### Spoofing

Threats:

- Fake Connector Node submits a forged bundle.
- Contractor uses a generic admin account to impersonate Finance Admin.
- Stolen admin session attempts export.

Mitigations:

- Separate Pawket Admin account model from customer and generic website admin.
- Connector identity with future signing/HMAC.
- Role-specific permissions.
- Session unlock and auto-lock.
- Audit every export, role change, connector import, and period action.

Open items:

- Choose production admin identity provider or local auth design.
- Choose connector signing or HMAC scheme.
- Define device binding and session reauthentication rules.

### Tampering

Threats:

- Tampered audit log.
- Modified connector bundle.
- Manipulated calculation rule.
- Period close bypass.
- Malicious source document changed after review.
- Restricted fund classification altered to hide misuse.

Mitigations:

- Append-only audit log with hash chain.
- Payload hashes on connector bundles.
- Document file hashes and duplicate detection.
- Calculation rule versioning.
- Period close and reopen events.
- Correction events instead of silent edits.
- Export manifests tied to report runs and source documents.

Open items:

- External audit-log anchoring.
- Production document signing and storage.
- Tamper response workflow.

### Repudiation

Threats:

- User denies creating an export.
- User denies reopening a period.
- Connector denies submitting a bundle.
- Admin denies changing a calculation rule.

Mitigations:

- Actor id, role, permission, action, target, reason, timestamp, previous hash, payload hash, and event hash on audit events.
- Explicit reason fields for period reopen, corrections, exports, and role changes.
- Future signatures/HMACs for connector bundles.

Open items:

- Non-repudiation standard for local-only desktop use.
- Whether high-risk actions require second approval.

### Information Disclosure

Threats:

- Stolen laptop.
- Stolen encrypted backup.
- Accidental private-data export.
- Unauthorized CHARM or CHERISH assistance data exposure.
- Private pet/story/medical/hardship/insurance data included in debug export.
- Connector returns too much private data.

Mitigations:

- Future encrypted vault and encrypted backups.
- Export profiles use allowlists, not deny-only rules.
- Redaction rules by profile.
- Connector contract keeps sensitive domains out unless explicitly approved.
- Connector debug exports exclude decrypted payload and raw secrets.
- Public impact exports are aggregate and consent-safe only.

Accepted current risk:

- The skeleton is not encrypted; it is for tests and design only.

Open items:

- Production encryption design.
- Backup storage and key recovery policy.
- Role-specific visibility for assistance, story, medical, and insurance-adjacent data.

### Denial Of Service

Threats:

- Corrupted local vault.
- Lost password or recovery key.
- Connector floods quarantine with bundles.
- Duplicate idempotency keys block legitimate import.
- Stolen laptop prevents access to records.

Mitigations:

- Future encrypted backups and recovery key.
- Import quarantine instead of direct ledger writes.
- Idempotency keys and cursor validation.
- Audit chain verification.
- Backup/restore events.

Open items:

- Backup cadence.
- Recovery drills.
- Quarantine size limits.
- Connector retry policy.

### Elevation Of Privilege

Threats:

- Bookkeeper generates investor or public impact export.
- Connector Node writes to ledger.
- Accountant Export User gets full archive.
- Foundation Admin accesses unrelated commerce archive or private assistance details.
- Investor Read-Only browses raw records.

Mitigations:

- Explicit role model.
- Export profile allowed roles.
- Connector cannot write to vault or request exports.
- Owner Root controls high-risk actions.
- Period reopen requires high-trust role and reason.

Open items:

- Production permission engine.
- Multi-person approval for high-risk actions.
- Periodic role reviews.

## Required Abuse Cases

### Stolen Laptop

Risk: attacker gains local vault files.

Mitigation target: production vault encryption, auto-lock, device lock, no raw secrets on disk, encrypted backups, recovery process.

Current state: accepted risk for skeleton only; no real data allowed.

### Stolen Encrypted Backup

Risk: attacker obtains backup file and attempts offline attack.

Mitigation target: vetted encryption, strong key derivation, no plaintext keys in backup, backup hash, restore audit event.

Current state: backup placeholder only.

### Compromised Website Connector

Risk: connector submits false, excessive, stale, or private data.

Mitigations: read-only source-node contract, quarantine, payload hash, signature/HMAC concept, schema version, cursor checks, idempotency checks, sensitive field review.

### Forged Connector Bundle

Risk: attacker submits fake events.

Mitigations: connector identity, future signature/HMAC verification, payload hash, quarantine, manual review.

### Replayed Connector Bundle

Risk: attacker resubmits old events to double count activity.

Mitigations: idempotency key duplicate rejection, cursor continuity, audit events, quarantine status.

### Duplicate Idempotency Key

Risk: same event imported twice.

Mitigations: duplicate detection within a bundle and across already-quarantined bundles.

### Malicious Export

Risk: user creates an export outside their role or purpose.

Mitigations: export profile role checks, manifest, allowlist, hash, audit event.

### Accidental Private-Data Export

Risk: private story, assistance, medical, hardship, or insurance-adjacent data leaks.

Mitigations: allowlist-only exports, public export forbidden fields, redaction rules, privacy review before production.

### Tampered Audit Log

Risk: event changed, removed, or reordered.

Mitigations: append-only file behavior, deterministic event hashes, previous-hash chain, tamper detection tests.

### Calculation Rule Manipulation

Risk: revenue, margin, donation, Care Credit, or impact metrics are changed by altering a rule.

Mitigations: rule versioning, rule approval flow, audit events, report dependency records.

### Period Close Bypass

Risk: closed period silently changes.

Mitigations: period close event, period reopen event with reason, correction events instead of silent edits.

Current state: disabled live-ledger gate rejects closed and locked periods for normal commit. Soft-closed periods require explicit override. Production period enforcement still needs review.

### Disabled Live Ledger Commit Bypass

Risk: actor or malicious code writes production journal entries, live-ledger files, final-ledger files, or balances while the production commit gate is disabled.

Mitigations: explicit forbidden official ledger file list, test-only allowed file list, role checks, evidence manifest checks, audit events, public-path rejection, and tests that verify no official live ledger files are created.

Current state: production live ledger commit remains blocked. Test-only immutable ledger entries are written only when explicitly enabled for validation.

### Restricted Fund Misuse

Risk: restricted CHARM or future CHERISH funds are used outside purpose.

Mitigations: fund restrictions, source documents, restricted-fund monitor in future, foundation export review, legal/accounting review.

### Unauthorized CHARM/CHERISH Assistance Data Exposure

Risk: sensitive assistance records leak through finance, exports, or connectors.

Mitigations: assistance workflows remain blocked until review; export redaction; role visibility; no public raw details.

### Care Credit Liability Manipulation

Risk: liability is understated, overstated, or incorrectly reversed.

Mitigations: Care Credit remains future-only; rule versioning; refund reversal rules; audit events; accounting/legal review.

### Fake Public Impact Proof

Risk: public report claims impact not supported by source records.

Mitigations: impact proof ledger, promise ledger, report provenance, public impact checklist, export manifest, audit event.

### Malicious Contractor Or Source Document Tampering

Risk: false invoice, altered receipt, manipulated processor report, or duplicate document.

Mitigations: document hash, duplicate detection, source-system provenance, review status, correction events, vendor/contractor controls.

## Accepted Risks In This Pass

- Vault skeleton data is plaintext test data.
- Signature/HMAC and encryption fields are placeholders.
- No production auth, key management, or desktop shell exists.
- No live connector endpoint exists.
- No real finance, tax, assistance, Care Credit, insurance, customer, or document data may be placed in this skeleton.

## Open Review Items

- Production desktop stack and packaging.
- Vault encryption design.
- Key derivation and storage.
- Recovery key storage guidance.
- Backup format and restore procedure.
- Connector auth and key rotation.
- Role assignment lifecycle.
- Export approval workflow.
- Multi-person approval for high-risk exports and period reopen.
- Accounting treatment for donation payables, restricted funds, Care Credit liability, inventory, and COGS.
- Privacy model for assistance, story, medical, hardship, and insurance-adjacent data.

## Security Questions Before Production

1. What local encryption format and key derivation parameters are approved?
2. Where are vault keys stored on each supported desktop platform?
3. How is recovery handled if the owner loses the device or unlock secret?
4. Are backups automatic, manual, or both?
5. How are connector keys issued, rotated, revoked, and audited?
6. Which roles require multi-person approval?
7. Which exports may leave the local device unencrypted?
8. How are public impact claims reviewed before publication?
9. How are closed periods reopened and reclosed?
10. How are CHARM, CHERISH, Care Credit, and insurance-adjacent data separated at the storage and export layers?

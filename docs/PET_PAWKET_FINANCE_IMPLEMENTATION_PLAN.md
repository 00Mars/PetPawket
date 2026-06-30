# Pet Pawket Finance Implementation Plan

Last updated: 2026-05-30

Status: implementation plan. Current build is documentation, local example data, and plaintext test-only Pawket Admin intake, normalization, review, proposed-ledger approval, proposed-journal grouping, commit-gate validation, evidence metadata, document-vault interface utilities, disabled live-ledger commit-gate utilities, production-disabled reporting/read-model utilities, report package/review metadata utilities, the first production-disabled desktop operator shell read-model utility, the first read-only desktop UI adapter utility, the first local-only stdout operator preview runner, a fake local sample-vault harness for preview smoke testing, the first read-only local desktop shell architecture scaffold, the first local desktop shell state composition layer, the first local stdout-only desktop contract smoke runner, the first local stdout-only desktop contract inspection layer, the first local in-memory desktop panel render contract scaffold, and the first local in-memory desktop panel navigation/focus contract scaffold. Packaged desktop app UI, production encryption, live connectors, document blob storage, production reports, official balances, final exports, runtime snapshot persistence, persisted panel state, persisted navigation/focus state, and production live ledger writes are not built yet.

## Phase 0: Documentation And Desktop-App Direction

Status: started in this pass.

Delivered:

- Finance system documentation.
- Finance schema documentation.
- Calculation rule documentation.
- Reporting documentation.
- Living documentation plan.
- Compliance notes.
- Static example schema and seed data stored outside `public/`.
- Standalone desktop-app security direction in `docs/PET_PAWKET_FINANCE_DESKTOP_APP.md`.
- Pawket Admin security/trust kernel baseline docs.
- Local security fixtures for audit events, export profiles, connector bundles, and permissions.
- Lightweight validation helpers and tests for audit hash chains, connector bundle shape, idempotency keys, and export allowlists.
- Pawket Admin threat model.
- Plaintext local vault skeleton for directory creation, append-only audited writes, audit verification, quarantine-only connector imports, and export manifest validation.
- Production storage design target for a phased hybrid encrypted local database plus encrypted blob store.
- Connector import state-machine documentation for `quarantine -> validation -> staged source events`.
- Staged source-event model documentation.
- Local example fixtures for import states, staged source events, and invalid connector bundles.
- Lightweight import-state helpers and tests for state transitions, staging validation, staged source-event creation, rejection, audit writes, duplicate idempotency rejection, and live-ledger write guardrails.
- Normalization queue documentation.
- Draft finance record documentation.
- Review queue documentation.
- Local example fixtures for normalization queue, draft finance records, and review queue items.
- Lightweight normalization helpers and tests for staged-event-to-draft mapping, draft-only writes, review queue writes, review decisions, audit events, document requirements, risk flags, and live-ledger write guardrails.
- Draft-to-ledger approval boundary documentation.
- Proposed ledger record documentation.
- Baseline chart of accounts documentation.
- Period close model documentation.
- Document coverage rule documentation.
- Local example fixtures for chart of accounts, proposed ledger records, approval boundary, period close, and document coverage rules.
- Lightweight ledger approval helpers and tests for chart validation, document coverage checks, approval-boundary validation, draft-to-proposed-ledger mapping, proposed balance checks, proposed-only writes, proposed decision history, audit events, and live-ledger write guardrails.
- Proposed journal-entry documentation.
- Final commit-gate documentation.
- Future ledger commit model documentation.
- Correction and adjustment model documentation.
- Local example fixtures for proposed journal entries, final commit gate, future ledger commit model, and correction/adjustment model.
- Lightweight journal commit-gate helpers and tests for proposed-ledger grouping, proposed journal validation, final commit-gate validation, test-only commit artifacts, proposed correction/adjustment records, proposed journal decisions, audit events, and official live-ledger write guardrails.
- Source document metadata documentation.
- Evidence coverage layer documentation.
- Document redaction and privacy documentation.
- Evidence deferral documentation.
- Commit evidence manifest documentation.
- Local example fixtures for source documents, evidence coverage, document redaction/privacy, evidence deferrals, and commit evidence manifests.
- Lightweight evidence helpers and tests for document type support, metadata validation, deterministic hashing, evidence links, coverage evaluation, approved deferrals, commit evidence manifests, audit events, raw-content guardrails, and public-path rejection.
- Document vault interface documentation.
- Document ingestion policy documentation.
- Document retention schedule documentation.
- Export redaction profile documentation.
- Commit-gate evidence integration documentation.
- Local example fixtures for document vault interface, ingestion policy, retention schedule, export redaction profiles, and commit-gate evidence integration.
- Lightweight document-vault helpers and tests for blob-reference validation, duplicate detection, ingestion transitions, retention assignment, export redaction profile checks, ingestion record writes, commit-gate evidence integration, audit events, raw-content guardrails, and live-ledger write guardrails.
- Disabled production live-ledger commit gate documentation.
- Immutable ledger store documentation.
- Ledger commit authorization policy documentation.
- Ledger period enforcement documentation.
- Ledger balance and integrity documentation.
- Local example fixtures for disabled live-ledger commit gate, immutable ledger store, commit authorization, period enforcement, and balance/integrity checks.
- Lightweight live-ledger gate helpers and tests for production-disabled policy, role authorization, period enforcement, balance/integrity validation, readiness validation, disabled production commit records, test-only immutable ledger entries, test hash-chain verification, proposed ledger correction records, audit events, public-path rejection, and official live-ledger write guardrails.
- Ledger read-model documentation.
- Simulated balance model documentation.
- Reconciliation read-model documentation.
- Report manifest documentation.
- Reporting guardrails documentation.
- Local example fixtures for ledger read models, simulated balances, reconciliation previews, report manifests, and reporting guardrails.
- Lightweight reporting read-model helpers and tests for proposed journal projections, test-only ledger projections, simulated balance previews, reconciliation previews, report manifest metadata, report manifest writes, audit events, public-path rejection, production source-mode rejection, final export path rejection, and official report/balance guardrails.
- Report package gate documentation.
- Export intent record documentation.
- Report package approval documentation.
- Report package guardrail documentation.
- Local example fixtures for report package gate policy, export intent records, report package approvals, and report package guardrails.
- Lightweight report package gate helpers and tests for export intent metadata, report type/profile/source-mode validation, preview package approvals, preview-only package records, audit events, public-path rejection, final export file detection, and no-export guardrails.
- Report review queue documentation.
- Report review decision documentation.
- Report preview supersession documentation.
- Redaction review outcome documentation.
- Report review audit note documentation.
- Local example fixtures for report review queue items, review decisions, preview supersession, redaction outcomes, and reviewer audit notes.
- Lightweight report review queue helpers and tests for review item creation, reviewer role restrictions, review decisions, rejection history, supersession lineage, redaction review blockers, audit-linked reviewer notes, deterministic hashes, public-path rejection, and final-export artifact guardrails.
- Desktop operator shell documentation.
- Pipeline status view-model documentation.
- Operator dashboard read-model documentation.
- Pipeline health and blocker documentation.
- Desktop shell guardrail documentation.
- Local example fixtures for desktop operator shell policy, pipeline status view model, operator dashboard read model, pipeline health/blockers, and desktop shell guardrails.
- Lightweight desktop operator shell read-model helpers and tests for NDJSON reads, pipeline status projections, operator dashboard projections, count summaries, blocker summaries, warning summaries, evidence/report summaries, production-disabled status checks, view model validation, read-only verification, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Desktop UI adapter documentation.
- Operator UI state model documentation.
- Operator CLI preview documentation.
- Desktop navigation model documentation.
- UI adapter guardrail documentation.
- Local example fixtures for desktop UI adapter policy, operator UI state, operator CLI preview, desktop navigation, and UI adapter guardrails.
- Lightweight desktop UI adapter helpers and tests for UI-ready state, safe navigation metadata, panel summaries, status badges, attention queue items, CLI preview rendering, validation, read-only verification, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Operator preview runner documentation.
- Operator preview input documentation.
- Operator preview output documentation.
- Operator preview failure-mode documentation.
- Operator preview guardrail documentation.
- Local example fixtures for operator preview runner policy, inputs, output, failure modes, and guardrails.
- Lightweight operator preview runner helpers, script wrapper, package script, and tests for vault path resolution, safe help/usage behavior, vault NDJSON reads, operator shell integration, UI adapter integration, stdout-only preview rendering, validation, read-only verification, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Sample vault harness documentation.
- Local fake sample vault fixtures under `data/finance/security/sample-vault/`.
- Local example fixtures for sample vault harness policy, data model, smoke testing, privacy guardrails, and limitations.
- Lightweight sample vault harness helpers, sample preview package script, and tests for deterministic demo records, no-real-data validation, sample path safety, operator preview runner integration, expected blocker/warning coverage, no-export guardrails, and public-path rejection.
- Desktop shell architecture scaffold documentation.
- Desktop shell boundary documentation.
- Desktop shell panel registry documentation.
- Desktop shell disabled-action documentation.
- Desktop shell packaging-blocker documentation.
- Local example fixtures for desktop shell architecture, boundary, panels, disabled actions, and packaging blockers.
- Lightweight desktop shell scaffold helpers and tests for local-only/read-only/non-production shell state, safe panel registry, disabled action registry, packaging blocker registry, no-mutation/no-export/no-production-authority validation, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Desktop shell composition documentation.
- Desktop app shell contract documentation.
- Desktop panel state binding documentation.
- Desktop sample preview binding documentation.
- Desktop composition guardrail documentation.
- Local example fixtures for desktop shell composition, app-shell contract, panel state bindings, sample preview binding, and composition guardrails.
- Lightweight desktop shell composition helpers and tests for composition input assembly, app-shell contract composition, panel bindings, sample preview binding, status surface, attention surface, contract validation, no-mutation/no-export/no-production-authority validation, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Desktop contract smoke runner documentation.
- Desktop contract smoke input documentation.
- Desktop contract smoke output documentation.
- Desktop contract smoke failure-mode documentation.
- Desktop contract smoke guardrail documentation.
- Local example fixtures for desktop contract smoke runner policy, inputs, output, failure modes, and guardrails.
- Lightweight desktop contract smoke runner helpers, script wrapper, package script, and tests for default sample-vault path resolution, argv/env vault path resolution, safe help behavior, vault NDJSON reads, operator shell integration, UI adapter integration, scaffold integration, composition contract validation, stdout-only summary rendering, read-only verification, public-path rejection, and final-export/official-report/official-balance artifact guardrails.
- Desktop contract inspection documentation.
- Desktop contract guardrail baseline documentation.
- Desktop contract inspection output documentation.
- Desktop contract inspection failure-mode documentation.
- Desktop contract inspection guardrail documentation.
- Local example fixtures for desktop contract inspection policy, guardrail baseline, output, failure modes, and guardrails.
- Lightweight desktop contract inspection helpers, script wrapper, package script, and tests for default sample-vault path resolution, argv/env vault path resolution, safe help behavior, smoke-runner integration, in-memory inspection snapshot validation, guardrail baseline comparison, stdout-only inspection report rendering, read-only verification, public-path rejection, and final-export/official-report/official-balance/runtime-snapshot artifact guardrails.
- Desktop panel render contract documentation.
- Desktop panel render input documentation.
- Desktop panel render output documentation.
- Desktop panel render failure-mode documentation.
- Desktop panel render guardrail documentation.
- Local example fixtures for desktop panel render contracts, inputs, output, failure modes, and guardrails.
- Lightweight desktop panel renderer helpers, script wrapper, package script, and tests for default sample-vault path resolution, argv/env vault path resolution, safe help behavior, smoke/inspection/composition integration, in-memory panel render contracts, region maps, summary and attention surfaces, stdout-only summary rendering, read-only verification, public-path rejection, and final-export/official-report/official-balance/runtime-panel-state artifact guardrails.
- Desktop panel navigation contract documentation.
- Desktop panel focus model documentation.
- Desktop panel attention routing documentation.
- Desktop panel disabled action surface documentation.
- Desktop panel navigation guardrail documentation.
- Local example fixtures for desktop panel navigation contracts, focus metadata, attention routing, disabled action surfaces, and navigation guardrails.
- Lightweight desktop panel navigation helpers, script wrapper, package script, and tests for default sample-vault path resolution, argv/env vault path resolution, safe help behavior, panel-renderer integration, in-memory selection state, focus model, keyboard map, attention routing, disabled action surfaces, stdout-only summary rendering, read-only verification, public-path rejection, and final-export/official-report/official-balance/runtime-navigation/focus-state artifact guardrails.

Allowed behavior:

- Document future ledgers, reports, rules, and value-flow edges.
- Keep mock data outside public website surfaces.
- Plan for a future Pawket Admin desktop app with encrypted local storage and encrypted connector nodes.
- Quarantine connector bundles in the local plaintext test skeleton.
- Validate connector bundle shape for staging.
- Stage source events as evidence only in `events/staged-source-events.ndjson`.
- Normalize staged source events into draft finance records in `events/draft-finance-records.ndjson`.
- Create review queue items in `events/review-queue.ndjson`.
- Record review decisions that do not write the live ledger.
- Validate reviewed draft records against the ledger approval boundary.
- Map eligible draft records into proposed ledger records in `events/proposed-ledger-records.ndjson`.
- Record proposed ledger decisions that do not write the live ledger.
- Group proposed ledger records into proposed journal entries in `events/proposed-journal-entries.ndjson`.
- Validate final commit-gate eligibility without posting live ledger truth.
- Write explicit test-only commit artifacts to `events/test-ledger-commits.ndjson` when `enableTestCommit` is true.
- Write proposed correction/adjustment records to `events/proposed-corrections-adjustments.ndjson`.
- Write metadata-only source document records to `documents/source-document-metadata.ndjson`.
- Write approved evidence deferrals to `documents/evidence-deferrals.ndjson`.
- Write commit evidence manifests to `manifests/commit-evidence-manifests.ndjson`.
- Evaluate evidence coverage for draft/proposed/journal targets without writing ledger truth.
- Write metadata-only document vault ingestion records to `documents/document-vault-ingestion.ndjson`.
- Write commit-gate evidence integration records to `manifests/commit-gate-evidence-integration.ndjson`.
- Validate blob-reference placeholders without storing raw blobs.
- Validate export redaction profiles without generating exports.
- Validate disabled production live-ledger commit readiness without posting production ledger truth.
- Write disabled production commit records to `events/disabled-production-commit-records.ndjson`.
- Write test-only immutable ledger entries to `events/test-immutable-ledger-entries.ndjson` only when `enableTestCommit` is true.
- Verify the test-only immutable ledger hash chain.
- Write proposed ledger correction records to `events/proposed-ledger-correction-records.ndjson`.
- Build production-disabled proposed and test-only read-model projections.
- Calculate simulated balances labeled non-production.
- Build reconciliation previews labeled non-production.
- Write report manifest metadata to `manifests/report-manifests.ndjson`.
- Verify no official reports or balances were created.
- Write export-intent metadata to `manifests/export-intent-records.ndjson`.
- Write preview-only package metadata to `manifests/report-preview-packages.ndjson`.
- Verify no final export files were created.
- Write report review queue metadata to `manifests/report-review-queue.ndjson`.
- Write report review decisions to `manifests/report-review-decisions.ndjson`.
- Write report preview supersessions to `manifests/report-preview-supersessions.ndjson`.
- Write redaction review outcomes to `manifests/redaction-review-outcomes.ndjson`.
- Write audit-linked reviewer notes to `manifests/report-reviewer-notes.ndjson`.
- Read local NDJSON records for desktop operator shell summaries.
- Build in-memory pipeline status view models labeled `local_non_production_view`.
- Build in-memory operator dashboard read models.
- Summarize blockers, warnings, evidence state, report state, and disabled production gates without mutating records.
- Verify desktop operator shell read-only behavior, public-path rejection, and absence of final export artifacts.
- Shape in-memory operator shell view models into read-only local UI state.
- Build safe navigation metadata, panel summaries, status badges, attention queues, and CLI preview text without mutating records.
- Verify desktop UI adapter read-only behavior, public-path rejection, and absence of final export artifacts.
- Run a local stdout-only operator preview from a vault path.
- Resolve operator preview vault paths from argv or approved environment variables.
- Print only the rendered non-production CLI preview to stdout on successful preview runs.
- Print safe usage or validation errors without mutating records.
- Verify operator preview read-only behavior, public-path rejection, stdout-only output, and absence of final export artifacts.
- Run the local stdout-only operator preview against fake sample vault data for smoke testing.
- Validate sample vault records are demo-only, non-production, read-only, local-only, and free of raw document content or realistic private data.
- Surface expected fake sample blockers and warnings: missing evidence, unresolved risk, report review rejection, privacy/redaction blockers, and disabled production gates.
- Define the future local desktop shell scaffold state without building or packaging a desktop app.
- Define safe read-only desktop shell panels.
- Define disabled mutation, ledger, report, export, upload, connector, public-impact, package-send, and desktop-packaging actions.
- Define packaging blockers that must be resolved before any future packaged app.
- Verify the desktop shell scaffold has no mutation actions, no export actions, no production authority, no public files, and no export artifacts.
- Compose the operator shell read model, UI adapter state, shell scaffold registry, and optional sample preview metadata into one local in-memory desktop app-shell contract.
- Bind read-only desktop panels to safe UI adapter state keys.
- Surface desktop shell status badges, disabled gates, packaging blockers, and attention items without mutating records.
- Verify the composed desktop shell contract has no mutation actions, no export actions, no production authority, no public files, and no export artifacts.
- Run a local stdout-only desktop contract smoke summary against the fake sample vault.
- Run a local stdout-only desktop panel contract summary against the fake sample vault.
- Build in-memory desktop panel selection state, focus metadata, keyboard action metadata, attention routing, and disabled action surfaces from existing panel render contracts.
- Run a local stdout-only desktop panel navigation/focus summary against the fake sample vault.
- Resolve desktop contract smoke vault paths from the default sample vault, argv, or approved environment variables.
- Validate the full operator shell -> UI adapter -> scaffold -> composition contract chain without mutating records.
- Print only the rendered non-production desktop contract smoke summary to stdout.
- Verify desktop contract smoke read-only behavior, public-path rejection, stdout-only output, and absence of final export artifacts.
- Run a local stdout-only desktop contract inspection report against the fake sample vault.
- Resolve desktop contract inspection vault paths from the default sample vault, argv, or approved environment variables.
- Compare the smoke summary to an expected non-production guardrail baseline in memory only.
- Print only the rendered non-production desktop contract inspection report to stdout.
- Verify desktop contract inspection read-only behavior, public-path rejection, stdout-only output, in-memory-only behavior, and absence of final export/runtime-snapshot artifacts.
- Run a local stdout-only desktop panel contract inspection summary against the fake sample vault.
- Resolve desktop panel renderer vault paths from the default sample vault, argv, or approved environment variables.
- Build in-memory panel render contracts and region metadata from the validated app-shell contract and inspection report.
- Print only the rendered non-production desktop panel contract summary to stdout.
- Verify desktop panel renderer read-only behavior, public-path rejection, stdout-only output, in-memory-only behavior, and absence of final export/runtime-panel-state artifacts.

Blocked behavior:

- Live database tables.
- Live API routes.
- Production encrypted vault storage.
- Production key management, recovery keys, key rotation, or signature/HMAC verification.
- Connector imports, draft normalization, review decisions, proposed ledger decisions, proposed journal grouping, commit-gate validation, test-only commit artifacts, or proposed correction records that write directly to official accounting events, final journal entries, customer balances, Care Credit balances, CHARM assistance records, or live ledger records.
- Disabled production commit records, test-only immutable ledger entries, and proposed ledger correction records that write production live ledger truth.
- Read-model projections, simulated balances, reconciliation previews, or report manifests that create official balances, official reports, final exports, tax/accountant/IRS packages, investor reports, foundation reports, public impact reports, or production ledger truth.
- Export-intent records, preview package approvals, or preview package records that create PDF, CSV, XLSX, ZIP, IRS, accountant, investor, foundation, public impact, official report, official balance, or production export files.
- Report review items, review decisions, preview supersessions, redaction outcomes, or reviewer notes that create PDF, CSV, XLSX, ZIP, IRS, accountant, investor, foundation, public impact, official report, official balance, production export files, raw document content, or public impact claims.
- Desktop operator shell view models that mutate existing pipeline records, write cache files, create public files, generate exports, create official reports, create official balances, include raw document content, or mark any record as production truth.
- Desktop UI adapter state, navigation models, panel summaries, badges, attention queues, or CLI previews that mutate existing pipeline records, write cache files, create browser/public routes, generate exports, create official reports, create official balances, include raw document content, enable mutation/export actions, or mark any record as production truth.
- Operator preview runner output that mutates existing pipeline records, writes preview files, creates browser/public routes, generates exports, creates official reports, creates official balances, includes raw document content, enables mutation/export actions, or marks any record as production truth.
- Sample vault harness behavior that uses real finance/customer/donor/vendor/person/payment/tax/bank/assistance data, writes outputs, creates exports, creates official reports, creates official balances, stores raw document content, touches public files, mutates real vault records, or presents demo records as production-ready.
- Desktop shell scaffold behavior that packages an app, creates public routes or assets, enables mutation/export/document-upload/connector-network actions, creates official reports or balances, writes final exports, includes raw document content, or marks any state as production authority.
- Desktop shell composition behavior that writes files, creates caches, packages an app, creates public routes or assets, enables mutation/export/document-upload/connector-network actions, creates official reports or balances, writes final exports, includes raw document content, or marks any state as production authority.
- Desktop contract smoke runner behavior that writes files, creates caches, packages an app, creates public routes or assets, enables mutation/export/document-upload/connector-network actions, creates official reports or balances, writes final exports, includes raw document content, or marks any state as production authority.
- Desktop contract inspection behavior that writes files, persists runtime snapshots, creates caches, packages an app, creates public routes or assets, enables mutation/export/document-upload/connector-network actions, creates official reports or balances, writes final exports, includes raw document content, or marks any state as production authority.
- Desktop panel renderer behavior that writes files, persists runtime panel state, creates caches, packages an app, creates public routes or assets, enables mutation/export/document-upload/connector-network controls, creates official reports or balances, writes final exports, includes raw document content, or marks any state as production authority.
- Raw source document content in plaintext metadata stores.
- Production document upload, OCR, blob storage, or encrypted file-vault behavior.
- Production blob encryption, key handling, backup, restore, rotation, or destruction.
- Real export ZIP/PDF/accountant/IRS/public report generation.
- Real report packages, official balances, report exports, tax filings, accountant exports, investor exports, foundation exports, or public impact exports.
- Evidence manifests or deferrals that erase original evidence requirements.
- Real posted accounting entries.
- Real Care Credit balances or liability.
- Real CHARM assistance intake, awards, or payments.
- Real insurance referrals or tracking.
- Checkout hooks.
- Account modules.
- Public navigation discovery.
- Public static finance pages or public static finance data exports.

## Phase 1: Source, Document, And Proposed Ledger Registry

Build only after approval for finance data model planning.

Goal:

- Add reviewed source-document, source-event, and proposed-ledger registry behavior without calculating customer balances, assistance status, tax reports, or live ledger truth.

Potential outputs:

- `finance_documents`
- `finance_transactions` or `finance_source_events`
- Source import manifest.
- Report-run provenance.
- Report manifest preview metadata.
- Simulated balance previews clearly labeled non-production.
- Reconciliation previews clearly labeled non-production.
- Human review/normalization queue from staged source events.
- Source-document coverage checks.
- Source-document metadata registry.
- Evidence coverage manifests for proposed journal entries.
- Deferral review and expiration policy.
- Document vault interface and encrypted blob-reference policy.
- Retention schedule and export redaction profile policy.
- Commit-gate evidence integration records.
- Draft-to-approved-record transition policy.
- Ledger approval audit event shape.
- Proposed journal entry grouping policy.
- Final live ledger commit policy.
- Disabled production commit-gate policy.
- Immutable ledger store model.
- Commit authorization policy.
- Period enforcement policy.
- Balance and source-lineage integrity policy.
- Ledger read-model policy.
- Simulated balance preview policy.
- Reconciliation preview policy.
- Report manifest and reporting guardrail policy.
- Correction and adjustment policy.
- Desktop operator shell read model for viewing pipeline state without enabling production writes.
- Desktop shell scaffold policy for local-only read-only panels, disabled actions, packaging blockers, and production-disabled guardrails.
- Desktop shell composition policy for one in-memory app-shell contract that binds existing safe read models, UI adapter state, scaffold registries, and optional sample preview metadata.
- Desktop contract smoke runner policy for stdout-only validation of the sample-vault -> operator shell -> UI adapter -> scaffold -> composition contract chain.
- Desktop contract inspection policy for stdout-only, in-memory-only guardrail baseline comparison over the contract smoke summary.

Review needed:

- Accounting.
- Tax.
- Privacy/security.
- Product.

## Phase 2: Management Reporting Snapshot

Goal:

- Produce internal monthly reports from imported or manually staged records.

Potential outputs:

- Revenue summary.
- Expense summary.
- COGS summary.
- Donation payable summary.
- Inventory movement summary.
- Report run/export records.

## Phase 3: Commerce And Inventory Subledger

Goal:

- Attach orders, SKUs, subscriptions, Packs, Packets, Picks, payments, refunds, coupons, campaigns, and inventory movements to traceable finance records.

Constraints:

- Preserve existing `/api/cart/create` and Shopify-backed commerce paths.
- Do not refactor shop/product/cart flows for finance import unless scoped.

## Phase 4: Mission And Foundation Ledger

Goal:

- Track CHARM and future CHERISH funds, donations, restrictions, acknowledgments, payable/transferred state, and privacy-safe outcomes.

Review needed:

- Charity compliance.
- Tax/accounting.
- Privacy.
- CHARM leadership.
- Legal.

## Phase 5: Rewards And Care Credit Ledger

Blocked until `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` approves exact scope.

Goal:

- Track Pawket Points, HeartPoints, reward redemptions, and future Pawket Care Credit value only after program terms, accounting treatment, refund handling, fraud controls, and privacy boundaries are approved.

Care Credit must remain rewards value, not insurance.

## Phase 6: CHARM Assistance Workflow

Blocked until CHARM guidelines, charity compliance, privacy, ops capacity, disbursement rules, support copy, and data boundaries are approved.

Goal:

- Track private assistance request, review, award, payment, outcome, and public consent records.

Do not call this a claim workflow.

## Phase 7: Insurance Partner Metadata

Blocked until legal/insurance/partner/privacy review approves exact scope.

Goal:

- Track approved partner cards, disclosures, and minimal outbound referral metadata only if allowed.

Do not store policy, quote, premium, deductible, exclusion, application, or claim details.

## Phase 8: Living Value Graph

Goal:

- Connect source records, documents, reports, decisions, promises, impact proof, Pawket Pals, HeartCodes, and public claims through value-flow edges.

## Phase 9: Scenario Simulator

Goal:

- Model changes such as donation percentage, Care Credit earn rate, Pack price, Packet price, shipping cost, campaign launch, or Pawket Pick threshold.

This must remain planning-only until outputs are clearly labeled and reviewed.

## Recommended Next Implementation Phase

Next safe phase:

1. Keep finance data out of `public/` and customer-facing website routes.
2. Review docs with accounting, tax, legal, privacy, charity, product, security, and ops.
3. Review the Pawket Admin security/trust kernel docs with security, legal, accounting, tax, privacy, and ops.
4. Security-review the production hybrid encrypted database plus encrypted blob-store target.
5. Accounting-review the proposed ledger mapping defaults, baseline chart of accounts, document coverage rules, period checks, and correction model.
6. Accounting-review the proposed journal grouping defaults, final commit-gate role policy, disabled live-ledger commit gate, future immutable ledger store shape, simulated balance previews, reconciliation previews, reporting guardrails, report package gate, export-intent approval policy, report review queue, desktop operator shell read model, desktop UI adapter, operator preview runner, and sample vault smoke harness.
7. Decide whether to create a minimal local desktop operator screen or continue with stdout-only previews, without enabling final exports or live ledger truth.
8. Decide whether Phase 1 may create encrypted website connector nodes for read-only source events.
9. If approved, add only source/document/proposed-record registry behavior first.
10. Add tests around source traceability before importing or calculating live values.
11. Keep production live ledger commit, official balances, production reports, and final exports disabled until legal, accounting, tax, security, privacy, charity, and operations sign off.

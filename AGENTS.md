# Pet Pawket Agent Instructions

Before doing Pet Pawket implementation work, read:

1. `docs/PET_PAWKET_CANON.md`
2. `docs/PET_PAWKET_CURRENT_STATE.md`
3. `docs/PET_PAWKET_UMBRELLA_AUDIT.md`
4. `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`
5. `docs/PET_PAWKET_CARE_SUPPORT_LAUNCH_PLAN.md` when working on Care Credit, CHARM assistance, insurance referrals, Pet Care Planning, rewards value, assistance intake, or related account/checkout/partner surfaces.
6. `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md` before touching dormant care-support scaffolding, direct preview pages, or any feature flag/status registry for Care Credit, CHARM assistance, or insurance referrals.
7. `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md` before changing public Pet Care Planning links, labels, CTAs, search metadata, navbar/footer discovery, CHARM handoffs, account handoffs, disclaimers, or public page roles.
8. `docs/PET_PAWKET_CARE_SUPPORT_PROGRAM_OUTLINES.md` before drafting Care Credit terms, CHARM guidelines, insurance partner requirements, account modules, checkout copy, or ecosystem care-support integrations.
9. `docs/PET_PAWKET_CARE_CREDIT_TERMS_DRAFT.md` and `docs/PET_PAWKET_CHARM_ASSISTANCE_GUIDELINES_DRAFT.md` before implementing any Care Credit ledger/account display/redemption or CHARM assistance intake/review/status work.
10. `docs/PET_PAWKET_INSURANCE_PARTNER_REQUIREMENTS_DRAFT.md`, `docs/PET_PAWKET_CARE_SUPPORT_LEGAL_REVIEW_PACKET.md`, and `docs/PET_PAWKET_CARE_SUPPORT_OPS_FAQ_DRAFT.md` before implementing insurance partner cards/referrals, care-support support flows, or review-approved care-support UI.
11. `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md` before designing care-support schemas, APIs, account payloads, checkout hooks, support tools, analytics, Pawket Pal connections, HeartCode connections, or test fixtures.
12. `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md` before implementing story consent, CHARM impact stories, public Pal adaptations, HeartCode story payloads, assistance privacy, insurance referral tracking, support tooling, analytics, or public content derived from private care-support data.
13. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md` when recording review notes or preparing approval decisions.
14. `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md` before preparing or interpreting care-support legal/compliance/support/product review.
15. `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md` before transferring review outcomes into the decision log.
16. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md` before coordinating care-support reviewer ownership, row status, or build-blocking review dependencies.
17. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md` before asking reviewers for care-support decisions or interpreting returned reviewer answers.
18. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md` before sending the review packet to a reviewer group.
19. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md` before assembling or tracking reviewer packets.
20. `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS00_PUBLIC_VISIBILITY.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS01_LEGAL_COMPLIANCE.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS02_SUPPORT_OPS.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS03_CARE_CREDIT.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS04_CHARM_ASSISTANCE.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS05_INSURANCE_PARTNERS.md`, `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS06_DATA_PRIVACY_CONSENT.md`, and `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS07_ACCOUNT_EMPTY_STATE.md` before assigning or sending care-support review packets.
21. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md` before reporting review status, choosing next review actions, assigning owners, sending packets, or interpreting review progress.
22. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md` before coordinating owner nomination, roster updates, dispatch updates, send status, return intake, or decision-log transfer.
23. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md` before assigning reviewer owners or changing packet status to `ready_to_send`.
24. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md` before collecting or recording Wave 1 reviewer names, confirmation status, send windows, or escalation paths.
25. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md` before recording real reviewer owners, backups, or owner readiness for CS-00 through CS-07.
26. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md` before preparing packet send notes or sending CS-00 through CS-07 to reviewers.
27. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md` before recording reviewer packet send/return status.
28. `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md` before interpreting returned reviewer answers, changing a packet to `returned_ready_for_intake`, or drafting a decision-log record.
29. `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md` before sequencing or opening prelaunch care-support review tickets.
30. `docs/PET_PAWKET_CARE_SUPPORT_IMPLEMENTATION_BACKLOG.md` before opening or implementing any care-support ticket.
31. `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md` when scoping future care-support review, copy, design, planning, implementation, QA, or documentation tickets.
32. `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md` before treating any care-support lane or ticket as approved.

For broad product orientation before substantial changes, also read:

- `docs/PET_PAWKET_PROJECT_OVERVIEW.md`
- `docs/PET_PAWKET_FOUNDATIONS.md`
- `docs/PET_PAWKET_PAWKET_PALS.md`
- `docs/PET_PAWKET_REWARDS_AND_HEARTCODES.md`

Use those files to preserve product continuity, launch direction, naming, emotional tone, privacy rules, and current technical state.

Before finance, accounting, tax-support, investor-reporting, donation-reporting, Care Credit liability, rewards liability, value-flow, source-document, report-export, promise-ledger, impact-proof, or living-documentation implementation work, also read:

- `docs/PET_PAWKET_FINANCE_SYSTEM.md`
- `docs/PET_PAWKET_FINANCE_SCHEMA.md`
- `docs/PET_PAWKET_FINANCE_CALCULATION_RULES.md`
- `docs/PET_PAWKET_FINANCE_REPORTING.md`
- `docs/PET_PAWKET_FINANCE_LIVING_DOCUMENTATION.md`
- `docs/PET_PAWKET_FINANCE_IMPLEMENTATION_PLAN.md`
- `docs/PET_PAWKET_FINANCE_COMPLIANCE_NOTES.md`
- `docs/PET_PAWKET_FINANCE_DESKTOP_APP.md`
- `docs/PAWKET_ADMIN_DESKTOP_BASELINE.md`
- `docs/PAWKET_ADMIN_SECURITY_MODEL.md`
- `docs/PAWKET_ADMIN_ENCRYPTED_VAULT.md`
- `docs/PAWKET_ADMIN_AUDIT_LOG.md`
- `docs/PAWKET_ADMIN_EXPORT_PERMISSION_MODEL.md`
- `docs/PAWKET_ADMIN_CONNECTOR_CONTRACT.md`
- `docs/PAWKET_ADMIN_THREAT_MODEL.md`
- `docs/PAWKET_ADMIN_LOCAL_VAULT_SKELETON.md`
- `docs/PAWKET_ADMIN_PRODUCTION_STORAGE_DESIGN.md`
- `docs/PAWKET_ADMIN_IMPORT_STATE_MACHINE.md`
- `docs/PAWKET_ADMIN_STAGED_SOURCE_EVENTS.md`
- `docs/PAWKET_ADMIN_NORMALIZATION_QUEUE.md`
- `docs/PAWKET_ADMIN_DRAFT_FINANCE_RECORDS.md`
- `docs/PAWKET_ADMIN_REVIEW_QUEUE.md`
- `docs/PAWKET_ADMIN_LEDGER_APPROVAL_BOUNDARY.md`
- `docs/PAWKET_ADMIN_PROPOSED_LEDGER_RECORDS.md`
- `docs/PAWKET_ADMIN_PROPOSED_JOURNAL_ENTRIES.md`
- `docs/PAWKET_ADMIN_FINAL_COMMIT_GATE.md`
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_MODEL.md`
- `docs/PAWKET_ADMIN_CORRECTION_AND_ADJUSTMENT_MODEL.md`
- `docs/PAWKET_ADMIN_CHART_OF_ACCOUNTS_BASELINE.md`
- `docs/PAWKET_ADMIN_PERIOD_CLOSE_MODEL.md`
- `docs/PAWKET_ADMIN_DOCUMENT_COVERAGE_RULES.md`
- `docs/PAWKET_ADMIN_SOURCE_DOCUMENTS.md`
- `docs/PAWKET_ADMIN_EVIDENCE_COVERAGE_LAYER.md`
- `docs/PAWKET_ADMIN_DOCUMENT_REDACTION_AND_PRIVACY.md`
- `docs/PAWKET_ADMIN_EVIDENCE_DEFERRALS.md`
- `docs/PAWKET_ADMIN_COMMIT_EVIDENCE_MANIFESTS.md`
- `docs/PAWKET_ADMIN_DOCUMENT_VAULT_INTERFACE.md`
- `docs/PAWKET_ADMIN_DOCUMENT_INGESTION_POLICY.md`
- `docs/PAWKET_ADMIN_DOCUMENT_RETENTION_SCHEDULE.md`
- `docs/PAWKET_ADMIN_EXPORT_REDACTION_PROFILES.md`
- `docs/PAWKET_ADMIN_COMMIT_GATE_EVIDENCE_INTEGRATION.md`
- `docs/PAWKET_ADMIN_LIVE_LEDGER_DISABLED_COMMIT_GATE.md`
- `docs/PAWKET_ADMIN_IMMUTABLE_LEDGER_STORE.md`
- `docs/PAWKET_ADMIN_LEDGER_COMMIT_AUTHORIZATION_POLICY.md`
- `docs/PAWKET_ADMIN_LEDGER_PERIOD_ENFORCEMENT.md`
- `docs/PAWKET_ADMIN_LEDGER_BALANCE_AND_INTEGRITY.md`
- `docs/PAWKET_ADMIN_LEDGER_READ_MODEL.md`
- `docs/PAWKET_ADMIN_SIMULATED_BALANCE_MODEL.md`
- `docs/PAWKET_ADMIN_RECONCILIATION_READ_MODEL.md`
- `docs/PAWKET_ADMIN_REPORT_MANIFESTS.md`
- `docs/PAWKET_ADMIN_REPORTING_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GATE.md`
- `docs/PAWKET_ADMIN_EXPORT_INTENT_RECORDS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_APPROVALS.md`
- `docs/PAWKET_ADMIN_REPORT_PACKAGE_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_QUEUE.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_DECISIONS.md`
- `docs/PAWKET_ADMIN_REPORT_PREVIEW_SUPERSESSION.md`
- `docs/PAWKET_ADMIN_REDACTION_REVIEW_OUTCOMES.md`
- `docs/PAWKET_ADMIN_REPORT_REVIEW_AUDIT_NOTES.md`
- `docs/PAWKET_ADMIN_DESKTOP_OPERATOR_SHELL.md`
- `docs/PAWKET_ADMIN_PIPELINE_STATUS_VIEW_MODEL.md`
- `docs/PAWKET_ADMIN_OPERATOR_DASHBOARD_READ_MODEL.md`
- `docs/PAWKET_ADMIN_PIPELINE_HEALTH_AND_BLOCKERS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_UI_ADAPTER.md`
- `docs/PAWKET_ADMIN_OPERATOR_UI_STATE_MODEL.md`
- `docs/PAWKET_ADMIN_OPERATOR_CLI_PREVIEW.md`
- `docs/PAWKET_ADMIN_DESKTOP_NAVIGATION_MODEL.md`
- `docs/PAWKET_ADMIN_UI_ADAPTER_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_RUNNER.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_INPUTS.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_OUTPUT.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_OPERATOR_PREVIEW_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_HARNESS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_DATA_MODEL.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_SMOKE_TESTING.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_PRIVACY_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_SAMPLE_VAULT_LIMITATIONS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_ARCHITECTURE.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_BOUNDARY.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PANELS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_DISABLED_ACTIONS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_PACKAGING_BLOCKERS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_COMPOSITION.md`
- `docs/PAWKET_ADMIN_DESKTOP_APP_SHELL_CONTRACT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_STATE_BINDINGS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SAMPLE_PREVIEW_BINDING.md`
- `docs/PAWKET_ADMIN_DESKTOP_COMPOSITION_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_SHELL_CONTRACT_SMOKE_RUNNER.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_INPUTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_SMOKE_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_GUARDRAIL_BASELINE.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_CONTRACT_INSPECTION_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_CONTRACTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_INPUTS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_OUTPUT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_FAILURE_MODES.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_RENDER_GUARDRAILS.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_CONTRACT.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_FOCUS_MODEL.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_ATTENTION_ROUTING.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_DISABLED_ACTION_SURFACES.md`
- `docs/PAWKET_ADMIN_DESKTOP_PANEL_NAVIGATION_GUARDRAILS.md`

Finance work must preserve source traceability, document provenance, rule versioning, privacy boundaries, and the separation between commerce, CHARM, future CHERISH, rewards, Care Credit, assistance, insurance referrals, Pawket Pals, HeartCodes, and future Lumerian value-flow tracking.
Finance tooling should be treated as a standalone Pawket Admin desktop application direction, not a public website page. Website connector nodes must be encrypted, authenticated, least-privilege, read-only source nodes, and audit logged. The public website must not own, edit, export, or decrypt finance truth.

## Required Working Rules

- Do not flatten Pet Pawket into a generic ecommerce store.
- Preserve the ecosystem: commerce, Pawket Packs, Pawket Packets, Pawket Picks, Pawket Pals, CHARM, CHERISH, Pawket Network, HeartCodes, Heroic Quests, points, stories, journals, Core Memories, and future Pawket World.
- Preserve Charm as the protected memorial/origin figure, never as a generic demo pet, seed pet, placeholder, fallback, or sample account pet.
- Never make Charm's private one-of-one Pawket Pal a public collectible.
- Treat real pet stories, rescue stories, adoption stories, medical stories, and memorial stories as privacy- and consent-sensitive.
- Do not rename established IDs, classes, routes, modules, or data contracts unless explicitly requested and coordinated.
- Preserve existing architecture, naming, IDs, classes, routes, modules, and data contracts.
- Avoid adding dependencies, build systems, databases, schemas, APIs, or new services unless explicitly requested and justified.
- Use affirming Pet Pawket language: warm, clear, helpful, emotionally grounded, and never fear- or guilt-based.
- Keep Pawket Care Credit, CHARM Emergency Assistance, and pet insurance referrals separate in concept, copy, implementation, and accounting.
- Do not write copy implying insurance, guaranteed coverage, claims, premiums, deductibles, covered conditions, policy benefits, reimbursement, or guaranteed emergency payment for Pawket Care Credit or CHARM Emergency Assistance.
- Prefer surgical changes that follow existing architecture.
- Do not revert unrelated dirty work.

## Documentation Maintenance

Update `docs/PET_PAWKET_CANON.md` when stable product canon changes.

Update `docs/PET_PAWKET_CURRENT_STATE.md` when major implementation state, launch decisions, active files, or next actions change.

Update `docs/PET_PAWKET_UMBRELLA_AUDIT.md` when global ecosystem roles, navigation/Dock/footer strategy, or the main customer spine changes.

Update `docs/PET_PAWKET_PROJECT_OVERVIEW.md`, `docs/PET_PAWKET_FOUNDATIONS.md`, `docs/PET_PAWKET_PAWKET_PALS.md`, and `docs/PET_PAWKET_REWARDS_AND_HEARTCODES.md` when broad project identity, foundation lineage, Pawket Pal strategy, HeartCode strategy, points/rewards framing, or care-support reward boundaries change.

Update `docs/PET_PAWKET_CARE_SUPPORT_ECOSYSTEM.md`, `docs/PET_PAWKET_COMPLIANCE_COPY.md`, `docs/PET_PAWKET_CARE_SUPPORT_DORMANT_SCAFFOLD.md`, `docs/PET_PAWKET_CARE_SUPPORT_PUBLIC_SURFACE_INVENTORY.md`, `docs/PET_PAWKET_CARE_SUPPORT_DATA_BOUNDARIES.md`, `docs/PET_PAWKET_CARE_SUPPORT_PRIVACY_CONSENT_MATRIX.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEWER_BRIEF.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_WORKSHEET.md`, `docs/PET_PAWKET_CARE_SUPPORT_DECISION_RECORD_TEMPLATE.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_TRACKER.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_REQUESTS.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_HANDOFF.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_PACKET_INDEX.md`, all `docs/PET_PAWKET_CARE_SUPPORT_PACKET_CS*.md` packet files, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_STATUS_DASHBOARD.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_COORDINATOR_RUNBOOK.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_ASSIGNMENT_PLAN.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_NOMINATION_FORM.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_OWNER_ROSTER.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_SEND_KIT.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_DISPATCH_LOG.md`, `docs/PET_PAWKET_CARE_SUPPORT_REVIEW_RETURN_INTAKE.md`, `docs/PET_PAWKET_CARE_SUPPORT_PRELAUNCH_REVIEW_QUEUE.md`, `docs/PET_PAWKET_CARE_SUPPORT_TICKET_TEMPLATE.md`, `docs/PET_PAWKET_CARE_SUPPORT_DECISION_LOG.md`, and the care-support launch/review drafts when care-support, rewards, assistance, insurance-referral, dormant scaffolding, public-surface, data-boundary, consent, privacy, disclaimer, legal-review, reviewer-brief, decision-record, review-tracker, review-requests, review-handoff, review-packet-index, review-packet, review-status-dashboard, review-coordinator-runbook, review-assignment, review-owner-nomination, review-owner-roster, review-send-kit, review-dispatch, review-return-intake, ops-support, review-queue, ticket-shape, or compliance-copy decisions change.

Update `docs/PET_PAWKET_FINANCE_SYSTEM.md`, `docs/PET_PAWKET_FINANCE_SCHEMA.md`, `docs/PET_PAWKET_FINANCE_CALCULATION_RULES.md`, `docs/PET_PAWKET_FINANCE_REPORTING.md`, `docs/PET_PAWKET_FINANCE_LIVING_DOCUMENTATION.md`, `docs/PET_PAWKET_FINANCE_IMPLEMENTATION_PLAN.md`, `docs/PET_PAWKET_FINANCE_COMPLIANCE_NOTES.md`, `docs/PET_PAWKET_FINANCE_DESKTOP_APP.md`, `docs/PAWKET_ADMIN_*.md`, and `docs/PET_PAWKET_CURRENT_STATE.md` when finance architecture, source records, calculation rules, report outputs, living-documentation behavior, desktop-app security posture, threat model, local vault posture, compliance posture, mock data, or active finance files change.

Update `docs/CODEX_RECOVERY_NOTES.md` if session recovery procedures or known recovery issues change.

When in doubt, preserve continuity in the docs before starting broad implementation work.

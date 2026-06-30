# Pet Pawket Finance Living Documentation

Last updated: 2026-05-26

Status: living documentation plan only.

## Purpose

The finance system should preserve more than transactions. It should preserve the living history behind Pet Pawket's decisions, promises, sources, calculations, reports, and mission impact.

The system should answer:

- Where did this number come from?
- What source document supports it?
- What rule calculated it?
- What entity, fund, and class does it belong to?
- Which report used it?
- Which public promise or internal decision depends on it?
- What changed after refunds, reversals, corrections, or review?

## Living History Components

### Event Timeline

Chronological stream of orders, payments, refunds, expenses, donations, inventory movement, reward events, report runs, approvals, exports, decisions, and public claims.

### Decision Memory

Structured record of finance, accounting, tax, compliance, charity, privacy, product, and operations decisions.

Examples:

- Which revenue recognition rule is active.
- Which donation pledge rule is active.
- Whether Pawket Pick cost is treated as reward cost, COGS, or campaign cost.
- Whether a restricted fund can support a specific CHARM use.
- Whether Care Credit can be shown as a liability after review.

### Calculation Rule Versions

Rules must be versioned so old reports can be reproduced.

### Source Documents

Every reportable number should point to evidence:

- Order exports.
- Payment reports.
- Refund reports.
- Vendor invoices.
- Donation receipts.
- Bank statements.
- Board approvals.
- Program terms.
- Impact proof.
- Reviewer decisions.

### Audit Trail

Append-only history of create, update, approve, reverse, close, export, and publish events.

### Promise Ledger

Tracks public promises and whether they were fulfilled.

Examples:

- Campaign says a percentage supports CHARM.
- Public report says a number of animals were helped.
- Pawket Pick threshold promises a bonus item.
- Care Credit terms promise a reversal rule, if approved later.

### Impact Proof Ledger

Links public impact claims to source evidence.

Examples:

- Donation transferred to CHARM fund.
- Restricted fund used for an approved support category.
- Privacy-safe outcome summary.
- Public report run.

### Value-Flow Graph

Tracks how money, story, care, impact, and value move through the ecosystem.

Example:

`customer -> order -> payment -> SKU -> COGS -> Pawket Pick -> donation pledge -> CHARM fund -> impact outcome -> report -> public claim`

## Lumerian Value Graph

The future Lumerian Value Graph should show flows such as:

- Customer to order.
- Order to reward.
- Order to donation.
- Donation to rescue or shelter support.
- Story to Pawket Pal.
- HeartCode to community activity.
- Community activity to repeat purchase.
- Impact outcome to public proof.

The graph is future-only. This pass documents the edge shape and includes mock value-flow edges in seed data.

## Privacy Rules

Living documentation must not expose private details just because the finance system can trace them.

Never expose private:

- Pet profiles.
- Journals.
- Core Memories.
- Rescue stories.
- Adoption stories.
- Memorial stories.
- Medical or veterinary records.
- Family hardship details.
- CHARM assistance records.
- Insurance referral or policy details.
- Support notes.

Public-facing documentation should use aggregated, redacted, consent-safe, reviewed content only.

## Correction Model

Finance history should preserve corrections rather than silently overwriting them.

Preferred patterns:

- Reversal transaction instead of destructive edit.
- Superseded calculation rule version.
- Report rerun with new run id.
- Audit event explaining why.
- Document link to correction evidence.

## Current Prototype

The current pass keeps mock event, document, rule, report, and value-flow examples in local `data/finance/` files only. The earlier public static command-center direction has been removed in favor of a standalone encrypted Pawket Admin desktop app.

It does not create live records, expose website exports, or change any production data.

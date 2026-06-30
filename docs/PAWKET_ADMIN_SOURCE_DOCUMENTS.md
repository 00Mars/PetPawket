# Pawket Admin Source Documents

Status: metadata-only design and plaintext test scaffold. Production encrypted document blob storage is not implemented.

Pawket Admin treats source documents as evidence. A source document metadata record describes the evidence, its privacy posture, its hash, and the records it supports. It is not the encrypted document blob itself.

No sensitive document data belongs under `public/`. No raw receipts, invoices, donor records, CHARM/CHERISH assistance material, story consent records, medical-adjacent context, customer records, partner records, or export archives should be stored in public website files.

## Metadata Fields

- `document_id`
- `document_type`
- `document_title`
- `source_system`
- `source_record_id`
- `entity_id`
- `fund_id`
- `class_id`
- `related_customer_ref`
- `related_vendor_ref`
- `related_order_ref`
- `related_payment_ref`
- `related_donation_ref`
- `related_assistance_ref`
- `related_story_ref`
- `related_pawket_pal_ref`
- `file_name`
- `file_mime_type`
- `file_size_bytes`
- `file_hash`
- `blob_ref_placeholder`
- `hash_algorithm`
- `document_date`
- `received_at`
- `uploaded_by`
- `retention_class`
- `privacy_class`
- `redaction_state`
- `evidence_status`
- `export_allowlist_tags`
- `linked_record_ids`
- `notes`
- `created_at`
- `updated_at`

`blob_ref_placeholder` is a future encrypted blob pointer. It must not expose file contents or public website paths.

The document-vault interface adds a more explicit blob-reference shape for future encrypted storage. Source document metadata remains the evidence identity layer; blob references remain storage pointers.

## Document Types

- `order_source`
- `payment_processor_record`
- `refund_record`
- `receipt`
- `invoice`
- `supplier_invoice`
- `shipping_label`
- `bank_statement`
- `donor_record`
- `donor_acknowledgment`
- `donation_platform_record`
- `charm_assistance_application`
- `charm_assistance_award`
- `charm_assistance_payment_proof`
- `cherish_program_record`
- `restricted_fund_document`
- `contract`
- `creator_rights_assignment`
- `insurance_referral_partner_record`
- `care_credit_rule_record`
- `calculation_rule_record`
- `pawket_pal_story_consent`
- `pawket_pal_asset_record`
- `public_impact_proof`
- `export_manifest`
- `other`

## Record Links

Documents may support:

- staged source events
- draft finance records
- review queue items
- proposed ledger records
- proposed journal entries
- proposed corrections or adjustments
- export manifests
- assistance applications
- donations
- Pawket Pals
- story submissions

Document links preserve source traceability. A document can support multiple targets, but the metadata layer must avoid duplicate links.

## Current Code Boundary

`utils/pawketAdminEvidence.js` can create and validate metadata, calculate deterministic document hashes with Node `crypto`, link documents to records, and write metadata to `documents/source-document-metadata.ndjson`.

`utils/pawketAdminDocumentVault.js` can create metadata-only blob references and ingestion records that point back to source document metadata.

This is not production encrypted storage. It must not be used for real finance, tax, donor, customer, assistance, story, insurance, or medical-adjacent files until encryption, access control, retention, backup, and review policies are approved.

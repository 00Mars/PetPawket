# Pawket Admin Sample Vault Privacy Guardrails

Status: fake-data guardrails for local sample fixtures.

The sample vault must never contain:

- Real customer, donor, vendor, employee, reviewer, pet owner, or assistance recipient data.
- Emails, phone numbers, addresses, tax IDs, bank details, card numbers, or payment processor account data.
- Real pet stories, medical details, assistance narratives, donor notes, memorial details, or private Pawket Pal story content.
- Raw document bodies, decrypted blobs, OCR text, receipts, invoices, statements, contracts, or upload payloads.

Sample privacy and redaction blockers are synthetic labels only. They exist to exercise the preview attention queue, not to represent real private records.

The sample vault must stay outside `public/` and must not be linked from the customer website.

# Pawket Admin Desktop Sample Preview Binding

Status: optional demo-only sample preview binding.

The sample preview binding lets the future desktop shell contract reference local sample-vault smoke preview metadata.

When present, the binding must:

- Be labeled demo/sample only.
- Point only to `data/finance/security/sample-vault/` or another safe non-public fixture path.
- Preserve stdout-only preview semantics.
- Preserve the non-production preview banner metadata.
- Include no real customer, donor, vendor, bank, tax, medical, assistance, story, or private person data.
- Include no raw document content.
- Include no export artifact path.

The binding does not run a preview, create files, create exports, or mutate records. It only carries safe metadata from an existing preview result.

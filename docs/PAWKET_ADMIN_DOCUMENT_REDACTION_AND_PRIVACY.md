# Pawket Admin Document Redaction And Privacy

Status: metadata policy and test scaffold.

Source documents can support finance truth without being safe for every export. Privacy class and redaction state must be checked before evidence is included in accountant, investor, foundation, public impact, connector debug, or owner archive outputs.

## Redaction States

- `none_required`
- `pending_review`
- `redaction_required`
- `redacted`
- `export_restricted`
- `private_internal_only`
- `public_safe`
- `blocked`

## Privacy Classes

- `public`
- `internal`
- `financial_sensitive`
- `donor_sensitive`
- `customer_sensitive`
- `assistance_sensitive`
- `medical_adjacent_sensitive`
- `story_sensitive`
- `minor_or_family_sensitive`
- `partner_confidential`
- `legal_confidential`

## Sensitive Areas

CHARM and future CHERISH assistance data is sensitive by default. Assistance applications, award notes, payment proof, hardship context, family context, rescue context, medical-adjacent context, and outcome stories should remain internal unless specific policy and consent allow disclosure.

Donor data is sensitive. Donor acknowledgments and donation platform records may support foundation reporting but must not leak into investor or public exports without a purpose-specific review.

Story and Pawket Pal consent records are sensitive. They may support internal proof and asset/IP review. Public stories require consent, redaction review, and privacy-safe adaptation.

Insurance referral partner records are partner-confidential unless a future legal and partner agreement says otherwise.

## Export Rules

Public impact reports should use aggregate metrics or public-safe approved stories only.

Investor packs should avoid raw customer, donor, assistance, story, medical-adjacent, and family/minor details.

Foundation packs may include donor and assistance evidence only according to the foundation reporting purpose and privacy policy.

Accountant/IRS support packs may include financial-sensitive documents but should still redact unrelated private story, medical, donor, or assistance context.

Every export should create an export manifest and an audit event.

`docs/PAWKET_ADMIN_EXPORT_REDACTION_PROFILES.md` defines the first named profile set. The current code validates document metadata against those profiles only. It does not generate exports or grant blob access.

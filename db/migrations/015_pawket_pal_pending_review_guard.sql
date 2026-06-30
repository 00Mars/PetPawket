-- db/migrations/015_pawket_pal_pending_review_guard.sql
-- Allow consent-safe public story summaries to remain attached while an ops
-- review is actively pending. Pending consent is still not a public release.

ALTER TABLE pawket_pals
  DROP CONSTRAINT IF EXISTS pawket_pals_public_story_guard;

ALTER TABLE pawket_pals
  ADD CONSTRAINT pawket_pals_public_story_guard
    CHECK (public_story_summary IS NULL OR consent_state IN ('pending', 'granted', 'review_required'));

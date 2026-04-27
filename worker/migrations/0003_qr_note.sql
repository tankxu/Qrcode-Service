-- Per-QR fallback note shown on landing page (alongside the target).
-- Lets the owner provide alternative contact info when the primary
-- destination (e.g. WeChat group QR image) becomes stale.
ALTER TABLE qrs ADD COLUMN note TEXT;

-- migrations/20260809_add_verification_fields.sql
-- Add verification fields and claims table

-- Up
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS public_fields TEXT,
  ADD COLUMN IF NOT EXISTS private_fields TEXT;

-- Change default status to pending_verification if column exists
ALTER TABLE items ALTER COLUMN status SET DEFAULT 'pending_verification';

CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claimant_name TEXT,
  claimant_email TEXT,
  claimed_details TEXT NOT NULL,
  match_score INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / needs_review / accepted / rejected
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP NULL,
  reviewer TEXT NULL,
  notes TEXT NULL
);

-- Down (rollback)
-- DROP TABLE IF EXISTS claims;
-- ALTER TABLE items DROP COLUMN IF EXISTS public_fields;
-- ALTER TABLE items DROP COLUMN IF EXISTS private_fields;
-- ALTER TABLE items ALTER COLUMN status SET DEFAULT 'reported';

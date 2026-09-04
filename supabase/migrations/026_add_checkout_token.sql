-- Migration 026: Add checkout_token to sessions for LS post-purchase auto-login
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS checkout_token TEXT UNIQUE;

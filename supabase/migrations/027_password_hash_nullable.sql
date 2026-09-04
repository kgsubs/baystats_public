-- Users created via LemonSqueezy webhook don't have a password yet.
-- They set one post-activation from the Account page.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

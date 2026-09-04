-- Rename existing stripe_customer_id column on users table
-- Safe to run -- zero users in production (confirmed)
alter table users rename column stripe_customer_id to ls_customer_id;

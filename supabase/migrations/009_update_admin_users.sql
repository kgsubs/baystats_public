-- Update admin_users table to support Supabase Auth user IDs
-- This allows admin checks by user_id instead of email/password

-- Add user_id column if not exists
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Make email nullable (since we'll use user_id primarily)
ALTER TABLE admin_users 
ALTER COLUMN email DROP NOT NULL;

-- Add unique constraint on user_id
ALTER TABLE admin_users 
ADD CONSTRAINT admin_users_user_id_unique UNIQUE (user_id);

-- Create function to add admin by email (looks up user_id from auth.users)
CREATE OR REPLACE FUNCTION add_admin_by_email(admin_email TEXT)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  result JSONB;
BEGIN
  -- Look up user_id from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found. They must register first.',
      'email', admin_email
    );
  END IF;
  
  -- Insert or update admin record
  INSERT INTO admin_users (user_id, email, password_hash)
  VALUES (target_user_id, admin_email, 'supabase_auth')
  ON CONFLICT (user_id) DO UPDATE 
  SET email = admin_email
  RETURNING jsonb_build_object(
    'success', true,
    'user_id', user_id,
    'email', email
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Promote the first administrator.
-- Set admin_email below to the account that should hold admin rights, then run.
DO $$
DECLARE
  admin_email TEXT := '';
  target_user_id UUID;
BEGIN
  IF admin_email = '' THEN
    RAISE NOTICE 'No admin_email set; skipping admin promotion.';
    RETURN;
  END IF;

  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email
  LIMIT 1;

  IF target_user_id IS NOT NULL THEN
    INSERT INTO admin_users (user_id, email, password_hash)
    VALUES (target_user_id, admin_email, 'supabase_auth')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;

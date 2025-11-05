-- Enable pgcrypto for symmetric encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt GSTN password using a per-user key salt
CREATE OR REPLACE FUNCTION public.encrypt_gstn_password(password TEXT, user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key TEXT := user_id::text || 'GST_SALT_v1';
BEGIN
  RETURN encode(pgp_sym_encrypt(password::text, key), 'base64');
END;
$$;

-- Decrypt GSTN password
CREATE OR REPLACE FUNCTION public.decrypt_gstn_password(encrypted_password TEXT, user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key TEXT := user_id::text || 'GST_SALT_v1';
BEGIN
  RETURN pgp_sym_decrypt(decode(encrypted_password, 'base64'), key);
END;
$$;

-- Optional: restrict execute to service role and authenticated users via grants
REVOKE ALL ON FUNCTION public.encrypt_gstn_password(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_gstn_password(TEXT, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.encrypt_gstn_password(TEXT, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_gstn_password(TEXT, UUID) TO authenticated, service_role;

-- Phase 1.1: Fix E-Invoice Password Encryption (CRITICAL SECURITY)
-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption function (uses user_id as part of key for added security)
CREATE OR REPLACE FUNCTION encrypt_gstn_password(password TEXT, user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Use user_id concatenated with a salt as encryption key
  -- This ensures each user's password is encrypted with a unique key
  RETURN encode(pgp_sym_encrypt(password::text, user_id::text || 'GST_SALT_v1_' || current_setting('app.settings.encryption_key', true)), 'base64');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create decryption function (for use in edge functions only)
CREATE OR REPLACE FUNCTION decrypt_gstn_password(encrypted_password TEXT, user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Decrypt using the same key derivation
  RETURN pgp_sym_decrypt(decode(encrypted_password, 'base64'), user_id::text || 'GST_SALT_v1_' || current_setting('app.settings.encryption_key', true));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION encrypt_gstn_password(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_gstn_password(TEXT, UUID) TO authenticated;

-- Note: For production, set encryption_key in Supabase settings:
-- ALTER DATABASE postgres SET app.settings.encryption_key = 'your-secret-key-here';
-- For now, using a default key derivation from user_id


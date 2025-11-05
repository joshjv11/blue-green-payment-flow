-- Quick GST Password Encryption Test
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Verify pgcrypto extension is enabled
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') 
      THEN '✅ pgcrypto extension is enabled'
    ELSE '❌ pgcrypto extension NOT enabled - Run: CREATE EXTENSION IF NOT EXISTS pgcrypto;'
  END as pgcrypto_status;

-- Step 2: Verify encryption functions exist
SELECT 
  proname as function_name,
  CASE 
    WHEN proname = 'encrypt_gstn_password' THEN '✅ Encrypt function exists'
    WHEN proname = 'decrypt_gstn_password' THEN '✅ Decrypt function exists'
    ELSE 'Unknown function'
  END as status
FROM pg_proc 
WHERE proname IN ('encrypt_gstn_password', 'decrypt_gstn_password')
ORDER BY proname;

-- Step 3: Test encryption/decryption (use your user ID)
-- Replace 'YOUR_USER_ID_HERE' with actual UUID from auth.users
DO $$
DECLARE
  test_user_id UUID := (SELECT id FROM auth.users LIMIT 1);
  test_password TEXT := 'TestPassword123!';
  encrypted TEXT;
  decrypted TEXT;
BEGIN
  -- Test encryption
  SELECT encrypt_gstn_password(test_password, test_user_id) INTO encrypted;
  
  -- Test decryption
  SELECT decrypt_gstn_password(encrypted, test_user_id) INTO decrypted;
  
  -- Verify
  IF decrypted = test_password THEN
    RAISE NOTICE '✅ SUCCESS: Encryption/Decryption working correctly!';
    RAISE NOTICE 'Original: %', test_password;
    RAISE NOTICE 'Encrypted: %', LEFT(encrypted, 50) || '...';
    RAISE NOTICE 'Decrypted: %', decrypted;
  ELSE
    RAISE NOTICE '❌ FAILED: Decrypted password does not match original!';
    RAISE NOTICE 'Original: %', test_password;
    RAISE NOTICE 'Decrypted: %', decrypted;
  END IF;
END $$;

-- Step 4: Check if you have any GSTN credentials stored
SELECT 
  COUNT(*) as total_credentials,
  COUNT(*) FILTER (WHERE password_encrypted IS NOT NULL) as with_encrypted_password,
  COUNT(*) FILTER (WHERE LENGTH(password_encrypted) > 50) as likely_encrypted  -- Encrypted should be long base64
FROM gstn_credentials
WHERE user_id = auth.uid();

-- Step 5: Sample check (if you have credentials) - Verify decryption works on real data
SELECT 
  id,
  gstin,
  username,
  CASE 
    WHEN LENGTH(password_encrypted) > 50 THEN '✅ Appears encrypted (long base64)'
    ELSE '⚠️  Might not be encrypted (too short)'
  END as encryption_check,
  -- Uncomment to test decryption (only if you're the owner):
  -- decrypt_gstn_password(password_encrypted, user_id) as decrypted_test
FROM gstn_credentials
WHERE user_id = auth.uid()
LIMIT 1;


-- Enable leaked password protection for better security
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'password_security_should_check_leaked_passwords';
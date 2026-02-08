-- Setup admin accounts
-- This ensures admin users have role = 'admin' in the users table

-- Option 1: If you have a specific admin email, update it directly
-- Replace 'admin@example.com' with your actual admin email
UPDATE public.users
SET role = 'admin'
WHERE email = 'admin@example.com' AND role IS DISTINCT FROM 'admin';

-- Option 2: Check all users and their current roles
SELECT user_id, email, full_name, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- After you identify which user should be admin, run this:
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin-email@domain.com';

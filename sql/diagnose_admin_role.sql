-- DIAGNOSTIC: Check all users and their roles
SELECT user_id, email, full_name, role 
FROM public.users 
ORDER BY created_at DESC 
LIMIT 20;

-- Look for your admin email in the results above, note what the 'role' value is

-- FIX: Once you identify your admin email, run ONE of these:

-- Option A: If your admin email is known, update it directly
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';

-- Option B: Set the most recently created user as admin (if creating new admin)
UPDATE public.users 
SET role = 'admin' 
WHERE user_id = (SELECT user_id FROM public.users ORDER BY created_at DESC LIMIT 1);

-- Option C: Make all users with 'Admin' role uppercase into 'admin'
UPDATE public.users 
SET role = 'admin' 
WHERE LOWER(role) = 'admin' AND role != 'admin';

-- Verify the change
SELECT email, role FROM public.users WHERE email LIKE '%admin%' OR role LIKE '%admin%';

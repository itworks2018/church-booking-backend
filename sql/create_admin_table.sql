-- Create admin table if it doesn't exist
-- This stores authorized admin users

CREATE TABLE IF NOT EXISTS public.admin (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_email ON public.admin(email);

-- List all current admins
SELECT email, created_at FROM public.admin ORDER BY created_at DESC;

-- To add a new admin, run:
-- INSERT INTO public.admin (email) VALUES ('admin-email@example.com')
-- ON CONFLICT (email) DO NOTHING;

-- To remove an admin:
-- DELETE FROM public.admin WHERE email = 'admin-email@example.com';

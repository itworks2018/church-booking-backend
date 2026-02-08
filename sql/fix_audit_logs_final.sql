-- Fix audit_logs to reference bookings(booking_id) which is the actual column
DROP TABLE IF EXISTS public.audit_logs CASCADE;

CREATE TABLE public.audit_logs (
  log_id BIGSERIAL PRIMARY KEY,
  booking_id TEXT REFERENCES public.bookings(booking_id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('Approved', 'Rejected', 'Updated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_booking_id ON public.audit_logs(booking_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- Verify table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Verify constraints
SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' AND t.relname = 'audit_logs';

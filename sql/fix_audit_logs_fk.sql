-- Fix audit_logs foreign key to reference bookings(id) instead of bookings(booking_id)
-- This allows us to store the numeric booking ID which works with UUID column

-- Drop the old audit_logs table
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Create with correct FK referencing bookings(id) which is bigint
CREATE TABLE public.audit_logs (
  log_id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES public.bookings(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('Approved', 'Rejected', 'Updated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_audit_logs_booking_id ON public.audit_logs(booking_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- Verify
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_logs'
ORDER BY ordinal_position;

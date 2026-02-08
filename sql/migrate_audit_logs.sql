-- MIGRATION: Drop and recreate audit_logs table
-- Run this in Supabase SQL Editor to fix audit logs

-- Step 1: Drop existing audit_logs table (this deletes all existing audit logs)
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- Step 2: Create fresh audit_logs table with correct schema
-- booking_id is UUID in the bookings table
CREATE TABLE public.audit_logs (
  log_id BIGSERIAL PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(booking_id) ON DELETE SET NULL,
  admin_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('Approved', 'Rejected', 'Updated')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_audit_logs_booking_id ON public.audit_logs(booking_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- Step 4: Verify table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Step 5: Verify constraints
SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' AND t.relname = 'audit_logs';

-- Enable Row Level Security for audit_logs table
-- Uses deny-by-default policy + service_role bypass for backend
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create deny-by-default policy (service_role automatically bypasses this)
CREATE POLICY "Deny all by default" ON public.audit_logs
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (FALSE)
  WITH CHECK (FALSE);

-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'audit_logs' AND schemaname = 'public';

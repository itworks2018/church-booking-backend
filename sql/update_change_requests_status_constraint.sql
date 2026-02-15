-- Migration: Update change_requests status constraint
-- Date: 2026-02-16
-- Purpose: Update CHECK constraint to allow 'Approved' status instead of 'Updated'

-- Drop the existing constraint
ALTER TABLE public.change_requests DROP CONSTRAINT change_requests_status_check;

-- Add the new constraint with 'Approved' status
ALTER TABLE public.change_requests 
ADD CONSTRAINT change_requests_status_check 
CHECK (status in ('Pending', 'Approved', 'Rejected'));

-- Note: If there are any rows with status='Updated', they will need to be migrated separately
-- Uncomment below if you need to migrate existing 'Updated' rows to 'Approved':
-- UPDATE public.change_requests SET status = 'Approved' WHERE status = 'Updated';

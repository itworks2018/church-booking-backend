-- Add NOT NULL constraint to booking_id column
-- This ensures all bookings must have a valid booking_id

-- First, update any remaining NULL booking_ids (just in case the populate_booking_ids script didn't run)
UPDATE public.bookings
SET booking_id = 'BK-' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY id) AS varchar), 6, '0')
WHERE booking_id IS NULL OR booking_id = '';

-- Alter the column to add NOT NULL constraint
ALTER TABLE public.bookings
ALTER COLUMN booking_id SET NOT NULL;

-- Verify the change
SELECT COUNT(*) as total_bookings, COUNT(booking_id) as with_booking_id, COUNT(CASE WHEN booking_id IS NULL THEN 1 END) as null_count
FROM public.bookings;

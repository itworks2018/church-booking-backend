-- Populate booking_id for any existing bookings that don't have one
-- This fixes a critical issue where existing bookings can't be approved/rejected
-- without booking_id values

UPDATE public.bookings
SET booking_id = 'BK-' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY id) AS varchar), 6, '0')
WHERE booking_id IS NULL
  OR booking_id = '';

-- Verify the update
SELECT COUNT(*) as bookings_updated, COUNT(booking_id) as with_booking_id
FROM public.bookings
WHERE booking_id IS NOT NULL AND booking_id != '';

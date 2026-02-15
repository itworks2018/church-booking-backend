-- Create change_requests table for tracking user change requests

create table if not exists public.change_requests (
  id bigserial primary key,
  booking_id uuid references public.bookings(booking_id) on delete cascade,
  user_id uuid references public.users(user_id) on delete set null,
  event_name text not null,
  description text not null,
  status text default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for faster queries
create index if not exists idx_change_requests_booking_id on public.change_requests(booking_id);
create index if not exists idx_change_requests_user_id on public.change_requests(user_id);
create index if not exists idx_change_requests_status on public.change_requests(status);
create index if not exists idx_change_requests_created_at on public.change_requests(created_at desc);

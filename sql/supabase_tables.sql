-- Run these in the Supabase SQL editor to create the expected tables

-- Users table (stores user profile and role)
create table if not exists public.users (
  user_id uuid primary key,
  full_name text,
  email text unique,
  contact_number text,
  role text default 'user',
  created_at timestamptz default now()
);

-- Venues table (sample columns used by frontend)
create table if not exists public.venues (
  id bigserial primary key,
  name text not null,
  area text,
  capacity_min integer,
  capacity_max integer,
  description text,
  created_at timestamptz default now()
);

-- Bookings table
create table if not exists public.bookings (
  id bigserial primary key,
  user_id uuid references public.users(user_id) on delete set null,
  venue_id bigint references public.venues(id) on delete set null,
  event_name text not null,
  event_purpose text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Audit Logs table
create table if not exists public.audit_logs (
  id bigserial primary key,
  booking_id bigint references public.bookings(id) on delete set null,
  admin_id uuid references public.users(user_id) on delete set null,
  action text not null,
  created_at timestamptz default now()
);

-- Optional: index for faster queries by user and date
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_start_datetime on public.bookings(start_datetime);

-- ==================== RLS POLICIES ====================

-- Enable RLS on audit_logs table
alter table public.audit_logs enable row level security;

-- Allow admins to INSERT into audit_logs
create policy "admins_can_insert_audit_logs" on public.audit_logs
  for insert
  with check (
    exists (
      select 1 from public.users
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

-- Allow admins to SELECT audit_logs
create policy "admins_can_select_audit_logs" on public.audit_logs
  for select
  using (
    exists (
      select 1 from public.users
      where user_id = auth.uid()
      and role = 'admin'
    )
  );

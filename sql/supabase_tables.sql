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
  booking_id text unique,  -- Display-friendly booking ID
  user_id uuid references public.users(user_id) on delete set null,
  venue_id bigint references public.venues(id) on delete set null,
  event_name text not null,
  event_purpose text,
  purpose text,  -- Alternative name for event_purpose
  attendees text,
  venue text,  -- Venue name (denormalized for easier queries)
  additional_needs text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  status text default 'Pending',
  created_at timestamptz default now()
);

-- Audit Logs table
-- Authorization: RLS is ENABLED (uses deny-by-default)
-- Backend uses service_role key which automatically bypasses RLS
-- This provides security compliance while maintaining backend functionality
create table if not exists public.audit_logs (
  log_id bigserial primary key,
  booking_id text references public.bookings(booking_id) on delete set null,
  admin_id uuid references public.users(user_id) on delete set null,
  action text not null check (action in ('Approved', 'Rejected', 'Updated')),
  created_at timestamptz default now()
);

-- Optional: index for faster queries by user and date
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_start_datetime on public.bookings(start_datetime);

-- Audit logs indexes (for performance on policy enforcement and queries)
create index if not exists idx_audit_logs_booking_id on public.audit_logs(booking_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_admin_id on public.audit_logs(admin_id);

-- ==================== MIGRATIONS ====================
-- Add missing columns to bookings table (if they don't exist)
alter table public.bookings add column if not exists booking_id text unique;
alter table public.bookings add column if not exists purpose text;
alter table public.bookings add column if not exists attendees text;
alter table public.bookings add column if not exists venue text;
alter table public.bookings add column if not exists additional_needs text;

-- NOTE: See migrate_audit_logs.sql for audit_logs table migration
-- (Drops and recreates the table with correct schema)

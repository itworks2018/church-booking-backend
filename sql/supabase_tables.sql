-- Run these in the Supabase SQL editor to create the expected tables

-- Profiles table (stores user profile and role)
create table if not exists public.profiles (
  id uuid primary key,
  name text,
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
  user_id uuid references public.profiles(id) on delete set null,
  venue_id bigint references public.venues(id) on delete set null,
  event_name text not null,
  event_purpose text,
  start_datetime timestamptz not null,
  end_datetime timestamptz not null,
  status text default 'pending',
  created_at timestamptz default now()
);

-- Optional: index for faster queries by user and date
create index if not exists idx_bookings_user_id on public.bookings(user_id);
create index if not exists idx_bookings_start_datetime on public.bookings(start_datetime);

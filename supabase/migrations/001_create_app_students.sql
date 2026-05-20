-- Creates the app_students table used by the Astroli web + mobile API layer.
-- Run once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste → Run
--
-- This table is separate from the Prisma-managed tables (users, journeys, etc.).
-- It stores per-student profile data that the mobile app and web app share.

create table if not exists app_students (
  student_id        uuid        primary key default gen_random_uuid(),
  email             text        unique not null,
  full_name         text,
  first_name        text,
  base_avatar_url   text,
  -- Cloudinary public_id of the personalised avatar (stored without the signed URL
  -- because signed URLs expire; the app re-signs on each load via /api/avatar/status).
  avatar_url        text,
  -- Populated when the student submits their interest during onboarding.
  -- NULL means onboarding is incomplete.
  area_of_interest  text,
  created_at        timestamptz default now()
);

-- Row Level Security: on by default so no row is readable without a policy.
alter table app_students enable row level security;

-- The backend uses the service-role key which bypasses RLS — no policy needed
-- for server-side reads/writes.  The policies below restrict direct client access
-- so students can only read their own row (e.g. if you add Supabase JS client calls).
create policy "Students can read their own record"
  on app_students for select
  using (auth.uid()::text = student_id::text);

create policy "Students can update their own record"
  on app_students for update
  using (auth.uid()::text = student_id::text);

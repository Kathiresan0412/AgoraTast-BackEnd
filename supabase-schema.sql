-- ============================================================
-- AgoraTask – Supabase Database Schema
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. USERS TABLE
-- Stores all users (customers, providers, admins)
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'provider', 'admin')),
  profile_image TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROVIDERS TABLE
-- Extra profile for provider-role users
CREATE TABLE IF NOT EXISTS public.providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category      TEXT,
  location      TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'active', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SERVICE TYPES TABLE
-- Categories of services managed by admins
CREATE TABLE IF NOT EXISTS public.service_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,
  color       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BOOKINGS TABLE
-- Booking requests between customers and providers
CREATE TABLE IF NOT EXISTS public.bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id     UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  customer_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  customer_name  TEXT,
  scheduled_time TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  amount         NUMERIC(10,2) DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MESSAGES TABLE
-- Direct messages between users
CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  from_user_id    UUID REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id      UUID REFERENCES public.users(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
  read            BOOLEAN NOT NULL DEFAULT false
);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email       ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_providers_status   ON public.providers (status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider  ON public.bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer  ON public.bookings (customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv      ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user   ON public.messages (to_user_id, read);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — disabled for now since
-- the backend uses the service-role key which bypasses RLS.
-- Enable and add policies later when needed.
-- ============================================================
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;

-- Allow the service_role (used by your backend) full access.
-- These policies grant everything to authenticated service_role calls.
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.providers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.service_types
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.bookings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON public.messages
  FOR ALL USING (true) WITH CHECK (true);

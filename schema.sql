
-- ==========================================================
-- UNITED BAYLOR ACADEMY: DATA INTEGRITY SCHEMA v4.8
-- ==========================================================

-- 1. IDENTITY HUB: Permanent Institutional Handshake Registry
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         -- System-generated unique node identifier
    hub_id TEXT NOT NULL,          -- Mapping to specific School/Registry Hub
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED: MASTER SUPER ADMIN IDENTITY
-- Safe entry logic ensures existing admins are not overwritten
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('hq@uba.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'HQ-HUB', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 2. PERSISTENCE HUB: Unified JSONB Shards for Multi-Tenant Data
-- This table stores: Students, Settings, Facilitators, Curriculum Coverage, and Practice Sets
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 -- Standard IDs: '{HUB}_students', '{HUB}_settings'
    hub_id TEXT NOT NULL,                -- Enables multi-tenant isolation
    payload JSONB NOT NULL,              -- Dynamic data payload
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         -- Optional owner mapping
);

-- 3. AUDIT HUB: Transactional Integrity Logs
CREATE TABLE IF NOT EXISTS public.uba_bulk_logs (
    id BIGSERIAL PRIMARY KEY,
    hub_id TEXT NOT NULL,
    job_type TEXT NOT NULL,              -- e.g., 'PUPIL_ENROLLMENT', 'HQ_SYNC'
    status TEXT NOT NULL,
    filename TEXT,
    success_count INTEGER,
    error_count INTEGER,
    actor_node TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECURITY PROTOCOL: Multi-Node Sync Configuration
-- RLS disabled to allow rapid institutional node handshakes
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_bulk_logs DISABLE ROW LEVEL SECURITY;

-- HIGH-PERFORMANCE INDICES (IDEMPOTENT)
-- Optimized for real-time curriculum tracking and identity verification
CREATE INDEX IF NOT EXISTS idx_uba_identities_role ON public.uba_identities(role);
CREATE INDEX IF NOT EXISTS idx_uba_identities_node ON public.uba_identities(node_id);
CREATE INDEX IF NOT EXISTS idx_uba_identities_handshake ON public.uba_identities(full_name, node_id);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_hub ON public.uba_persistence(hub_id);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_payload_gin ON public.uba_persistence USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_updated ON public.uba_persistence(last_updated);

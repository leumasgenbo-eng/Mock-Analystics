
-- ==========================================================
-- UNITED BAYLOR ACADEMY: CORE DATA INTEGRITY SCHEMA v5.5
-- ==========================================================

-- 1. IDENTITY HUB: Permanent Institutional Handshake Registry
-- Identifies users (Admin, Facilitator, Pupil) and maps them to Hubs.
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         -- System-generated unique identifier
    hub_id TEXT NOT NULL,          -- Mapping to specific School/Registry Hub
    role TEXT NOT NULL,            -- school_admin, facilitator, pupil
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED: MASTER SUPER ADMIN IDENTITY (Non-destructive)
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('hq@uba.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'HQ-HUB', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- 2. PERSISTENCE HUB: Unified JSONB Shards for Multi-Tenant Data
-- This table is "migration-less". New data types are stored within the JSONB 'payload'
-- ensuring no data is lost during system updates.
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 -- e.g., 'SMA-123_students', 'practice_shards_SMA-123_Math'
    hub_id TEXT NOT NULL,                -- Identifies the school/hub
    payload JSONB NOT NULL,              -- Stores Students, Settings, and Ordered Questions
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         -- Optional owner mapping
);

-- 3. AUDIT HUB: Transactional Integrity Logs
CREATE TABLE IF NOT EXISTS public.uba_bulk_logs (
    id BIGSERIAL PRIMARY KEY,
    hub_id TEXT NOT NULL,
    job_type TEXT NOT NULL,              -- e.g., 'PUPIL_ENROLLMENT', 'CLOUD_PUSH'
    status TEXT NOT NULL,
    filename TEXT,
    success_count INTEGER,
    error_count INTEGER,
    actor_node TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECURITY PROTOCOL
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_bulk_logs DISABLE ROW LEVEL SECURITY;

-- HIGH-PERFORMANCE INDICES (IDEMPOTENT)
CREATE INDEX IF NOT EXISTS idx_uba_identities_role ON public.uba_identities(role);
CREATE INDEX IF NOT EXISTS idx_uba_identities_node ON public.uba_identities(node_id);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_hub ON public.uba_persistence(hub_id);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_payload_gin ON public.uba_persistence USING GIN (payload);

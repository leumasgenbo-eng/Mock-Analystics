-- ==========================================================
-- 1. CORE TABLE STRUCTURE (ANONYMOUS ACCESS MODE)
-- ==========================================================

-- Identity Registry: Maps names/roles to hubs (Publicly readable)
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Persistence Hub: JSON Shards (Open Access via Hub ID)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 -- e.g., 'SMA-2025-001_settings'
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         -- Kept for structural compatibility but unused
);

-- Bulk Process Ledger: Tracks mass enrollment/CSV jobs
CREATE TABLE IF NOT EXISTS public.uba_bulk_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hub_id TEXT NOT NULL,
    job_type TEXT NOT NULL,              -- e.g., 'PUPIL_ENROLLMENT'
    status TEXT NOT NULL,                -- e.g., 'COMPLETED', 'FAILED'
    filename TEXT,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    actor_node TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Global Audit Ledger
CREATE TABLE IF NOT EXISTS public.uba_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    year TEXT DEFAULT EXTRACT(YEAR FROM NOW())::TEXT
);

-- ==========================================================
-- 2. SECURITY OVERRIDE (OPEN HUB PROTOCOL)
-- ==========================================================

-- Disable RLS to ensure "it just works" without Auth sessions
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_audit DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_bulk_logs DISABLE ROW LEVEL SECURITY;

-- Seed HQ Controller Shard for global reference
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('leumasgenbo4@gmail.com', 'HQ CONTROLLER', 'MASTER-NODE-01', 'NETWORK', 'school_admin')
ON CONFLICT (email) DO NOTHING;
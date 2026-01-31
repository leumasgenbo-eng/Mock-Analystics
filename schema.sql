
-- ==========================================================
-- UNITED BAYLOR ACADEMY: CORE DATA INTEGRITY SCHEMA v5.8
-- ==========================================================

-- 1. IDENTITY HUB: Permanent Institutional Handshake Registry
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERSISTENCE HUB: Unified JSONB Shards for Multi-Tenant Data
-- Stores: Settings, Students, Facilitators, and Pushed Practice Shards
-- This table is "migration-less": no data loss occurs when adding new fields.
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,              
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         
);

-- 3. AUDIT HUB: Transactional Integrity Logs
CREATE TABLE IF NOT EXISTS public.uba_bulk_logs (
    id BIGSERIAL PRIMARY KEY,
    hub_id TEXT NOT NULL,
    job_type TEXT NOT NULL,              
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

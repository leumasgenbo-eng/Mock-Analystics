
-- ==========================================================
-- IDENTITY HUB: Official Institutional Recall Shards
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         -- Index #, Staff ID, or MASTER-NODE-01
    hub_id TEXT NOT NULL,          -- School ID or HQ-HUB
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED: MASTER SUPER ADMIN IDENTITY
-- Use these credentials to log in as the network controller
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('hq@uba.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'HQ-HUB', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- ==========================================================
-- PERSISTENCE HUB: JSON Shards for all Academy Data
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 -- e.g., 'master_bank_Mathematics'
    hub_id TEXT NOT NULL,                -- Institutional Hub ID
    payload JSONB NOT NULL,              -- The actual data payload
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         -- Optional owner mapping
);

-- ==========================================================
-- AUDIT HUB: Bulk Transaction Logs
-- ==========================================================
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

-- Security Protocol: Disable RLS for seamless cross-node syncing
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_bulk_logs DISABLE ROW LEVEL SECURITY;

-- High-Performance Indexing for Role Handshakes
CREATE INDEX IF NOT EXISTS idx_uba_identities_role ON public.uba_identities(role);
CREATE INDEX IF NOT EXISTS idx_uba_identities_handshake ON public.uba_identities(full_name, node_id);
CREATE INDEX IF NOT EXISTS idx_uba_persistence_hub ON public.uba_persistence(hub_id);

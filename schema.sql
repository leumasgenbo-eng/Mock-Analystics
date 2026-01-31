
-- ==========================================================
-- UNITED BAYLOR ACADEMY: DATA INTEGRITY SCHEMA v7.1
-- ==========================================================
-- This schema is designed to be non-destructive. 
-- Running this script will NOT erase existing data.

-- 1. IDENTITY HUB: Unified Credential Shard
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSTRUCTIONAL SHARDS: Dedicated Handshake Table
-- Prevents "No active shards found" by centralizing facilitator broadcasts
CREATE TABLE IF NOT EXISTS public.uba_instructional_shards (
    id TEXT PRIMARY KEY,                 -- practice_shards_{hubId}_{subjectKey}
    hub_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload JSONB NOT NULL,              -- The full PracticeAssignment object
    pushed_by TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PRACTICE RESULTS: Pupil Performance Ledger
CREATE TABLE IF NOT EXISTS public.uba_practice_results (
    id BIGSERIAL PRIMARY KEY,
    hub_id TEXT NOT NULL,
    student_id INTEGER NOT NULL,
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_items INTEGER NOT NULL,
    time_taken INTEGER,                  
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERSISTENCE HUB: Generic settings and student shards
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,              
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         
);

-- 5. AUDIT HUB: Mass action logs
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

-- SEEDING: HQ CONTROLLER (Superadmin Identity Handshake)
-- This ensures the system always has a master entry for HQ access.
-- ON CONFLICT ensures existing data is never overwritten or lost.
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role)
VALUES ('hq@unitedbaylor.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'SMA-HQ', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- SECURITY PROTOCOL (RLS disabled for Hub Node cross-talk)
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_instructional_shards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_practice_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_bulk_logs DISABLE ROW LEVEL SECURITY;

-- INDICES for high-speed handshake resolution
CREATE INDEX IF NOT EXISTS idx_shards_hub_subject ON public.uba_instructional_shards(hub_id, subject);
CREATE INDEX IF NOT EXISTS idx_results_student ON public.uba_practice_results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_hub ON public.uba_practice_results(hub_id);

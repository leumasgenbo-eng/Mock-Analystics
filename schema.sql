
-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v8.0 (Final Audit)
-- ==========================================================
-- PROTECTIVE PROTOCOL: Idempotent execution (Non-destructive).
-- This script merges v7.5 (Other App) and v7.9 (SS-MAP) logic.
-- ==========================================================

/* 
   INTEGRATION HANDSHAKE PROTOCOL:
   -------------------------------
   1. TABLE 'uba_identities':
      - Unified Auth Hub for Admins, Staff, and Pupils.
      - 'unique_code' is the SHARED PIN for mobile app entry.
      - Master Admin Key: 'UBA-HQ-MASTER-2025'
   
   2. TABLE 'uba_pupils':
      - Shared Basic 9 Roster. 
      - SS-MAP writes to this; Companion App reads from this.
      - 'student_id' (TEXT) is the primary relational key.

   3. TABLE 'uba_persistence':
      - Institutional Shards (Settings, Students, Facilitators).
      - SS-MAP Key Prefix: '{hub_id}_'
      - Companion App Key Prefix: 'companion_{hub_id}_'
*/

-- 1. IDENTITY HUB: Primary Authentication Matrix
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    teaching_category TEXT DEFAULT 'BASIC_SUBJECT_LEVEL', 
    unique_code TEXT UNIQUE,       -- The PIN used by companion apps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROTECTIVE SHARD UPDATE: Injects columns into older v6/v7 databases
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_identities' AND column_name='teaching_category') THEN
        ALTER TABLE public.uba_identities ADD COLUMN teaching_category TEXT DEFAULT 'BASIC_SUBJECT_LEVEL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_identities' AND column_name='unique_code') THEN
        ALTER TABLE public.uba_identities ADD COLUMN unique_code TEXT UNIQUE;
    END IF;
END $$;

-- 2. PUPIL REGISTRY: Shared Classroom Node
CREATE TABLE IF NOT EXISTS public.uba_pupils (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE,        -- Primary link to Identity Node
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    class_name TEXT DEFAULT 'BASIC 9',
    hub_id TEXT NOT NULL,
    is_jhs_level BOOLEAN DEFAULT TRUE, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERSISTENCE HUB: JSON State Shards
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,              
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         
);

-- 4. INSTRUCTIONAL SHARDS: Assessment/Practice Handshake
CREATE TABLE IF NOT EXISTS public.uba_instructional_shards (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload JSONB NOT NULL,              
    pushed_by TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PERFORMANCE LEDGER: Practice Results
CREATE TABLE IF NOT EXISTS public.uba_practice_results (
    id BIGSERIAL PRIMARY KEY,
    hub_id TEXT NOT NULL,
    student_id TEXT NOT NULL,            -- Matches node_id
    student_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    assignment_id TEXT NOT NULL,
    score INTEGER NOT NULL,
    total_items INTEGER NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- MASTER SEEDING: HQ Controller & Institutional Access Keys
-- Ensures PINs and roles are up-to-date across the whole network.
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, teaching_category, unique_code)
VALUES 
('hq@unitedbaylor.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'SMA-HQ', 'super_admin', 'ADMINISTRATOR', 'UBA-HQ-MASTER-2025'),
('admin@baylor.edu', 'MASTER ADMIN', 'UB-MASTER-001', 'SMA-HQ', 'school_admin', 'ADMINISTRATOR', 'UBA-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET 
    teaching_category = EXCLUDED.teaching_category,
    unique_code = EXCLUDED.unique_code,
    role = EXCLUDED.role;

-- SECURITY OVERRIDE: Disabled for high-speed cross-app synchronization
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_instructional_shards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_practice_results DISABLE ROW LEVEL SECURITY;

-- OPTIMIZATION INDICES: High-speed node resolution
CREATE INDEX IF NOT EXISTS idx_uba_pupils_hub ON public.uba_pupils(hub_id);
CREATE INDEX IF NOT EXISTS idx_identities_pin ON public.uba_identities(unique_code);
CREATE INDEX IF NOT EXISTS idx_persistence_hub ON public.uba_persistence(hub_id);
CREATE INDEX IF NOT EXISTS idx_practice_student ON public.uba_practice_results(student_id);

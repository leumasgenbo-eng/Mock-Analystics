
-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v7.9 (Integrated)
-- ==========================================================
-- PROTECTIVE PROTOCOL: Non-destructive idempotent execution.
-- This script preserves existing pupils, facilitators, and settings shards.
-- ==========================================================

/* 
   MASTER INTEGRATION NOTES FOR COMPANION APPS:
   --------------------------------------------
   1. SHARED IDENTITY HUB: 
      - Table: 'uba_identities'
      - Key: Use 'unique_code' for high-security PIN-based mobile auth.
      - SuperAdmin PIN: 'UBA-HQ-MASTER-2025'
   
   2. BASIC 9 PUPIL ROSTER:
      - Table: 'uba_pupils'
      - Logic: Filter where 'is_jhs_level' IS TRUE for shared classroom activities.
      - Sync: This app broadcasts to this table; companion app should READ from it.

   3. PERSISTENCE ARCHITECTURE:
      - Table: 'uba_persistence'
      - Keying Strategy: Use 'daily_activity_{hub_id}_{node_id}' for activity blobs.
      - Avoid prefixes: '_settings', '_students', '_facilitators' (Reserved for SS-MAP).

   4. DATA TYPES:
      - Treat 'student_id' as TEXT (matches 'node_id').
      - All emails are stored lowercase.
      - Roles are lowercase: 'super_admin', 'school_admin', 'facilitator', 'pupil'.
*/

-- 1. IDENTITY HUB: Unified Credential Shard
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            -- school_admin, facilitator, pupil, super_admin
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROTECTIVE UPDATE: Add v7.5 columns to existing uba_identities
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_identities' AND column_name='teaching_category') THEN
        ALTER TABLE public.uba_identities ADD COLUMN teaching_category TEXT DEFAULT 'BASIC_SUBJECT_LEVEL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='uba_identities' AND column_name='unique_code') THEN
        ALTER TABLE public.uba_identities ADD COLUMN unique_code TEXT UNIQUE;
    END IF;
END $$;

-- 2. PUPIL REGISTRY (Structured Sharing Node for Basic 9)
CREATE TABLE IF NOT EXISTS public.uba_pupils (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE,        -- Maps to internal Student ID (e.g., 101)
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    class_name TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    is_jhs_level BOOLEAN DEFAULT TRUE, 
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INSTRUCTIONAL SHARDS: Dedicated Handshake Table
CREATE TABLE IF NOT EXISTS public.uba_instructional_shards (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    payload JSONB NOT NULL,              
    pushed_by TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PERSISTENCE HUB: Institutional Shards (Heavy JSON Blobs)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,                 
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,              
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID                         
);

-- 5. PRACTICE RESULTS: Pupil Performance Ledger
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

-- SEEDING: HQ MASTER CONTROL & NETWORK ACCESS KEYS (v7.5 Standard)
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, teaching_category, unique_code)
VALUES 
('hq@unitedbaylor.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'SMA-HQ', 'super_admin', 'ADMINISTRATOR', 'UBA-HQ-MASTER-2025'),
('admin@baylor.edu', 'MASTER ADMIN', 'UB-MASTER-001', 'SMA-HQ', 'school_admin', 'ADMINISTRATOR', 'UBA-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET 
    teaching_category = EXCLUDED.teaching_category,
    unique_code = EXCLUDED.unique_code;

-- SECURITY PROTOCOL (RLS disabled for cross-app synchronization efficiency)
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_instructional_shards DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_practice_results DISABLE ROW LEVEL SECURITY;

-- INDICES for high-speed node resolution
CREATE INDEX IF NOT EXISTS idx_uba_pupils_jhs ON public.uba_pupils(is_jhs_level);
CREATE INDEX IF NOT EXISTS idx_uba_pupils_hub ON public.uba_pupils(hub_id);
CREATE INDEX IF NOT EXISTS idx_identities_unique ON public.uba_identities(unique_code);
CREATE INDEX IF NOT EXISTS idx_persistence_hub ON public.uba_persistence(hub_id);

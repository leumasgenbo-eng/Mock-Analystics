-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v9.6.0 (Clean Schema)
-- ==========================================================
-- PURPOSE: Structured Curriculum Registry & Master Access Keys.
-- INTEGRATION: Formal SuperAdmin Registry within the SQL Partition.
-- ==========================================================

-- 1. IDENTITY HUB: Primary Authentication Registry
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    unique_code TEXT UNIQUE,       -- Master Access Key or Pupil PIN
    merit_balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
    monetary_balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FACILITATOR REGISTRY: Detailed Staff Records
CREATE TABLE IF NOT EXISTS public.uba_facilitators (
    email TEXT PRIMARY KEY REFERENCES public.uba_identities(email) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    node_id TEXT NOT NULL,
    taught_subject TEXT,
    teaching_category TEXT DEFAULT 'BASIC_SUBJECT_LEVEL',
    unique_code TEXT,
    merit_balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
    monetary_balance DOUBLE PRECISION DEFAULT 0 NOT NULL,
    invigilation_data JSONB DEFAULT '[]'::jsonb,
    last_active TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SCORE REGISTRY: Granular Performance Shards
CREATE TABLE IF NOT EXISTS public.uba_mock_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hub_id TEXT NOT NULL,
    student_id TEXT NOT NULL,       -- Composite Pupil ID
    mock_series TEXT NOT NULL,      -- e.g., 'MOCK 1'
    subject TEXT NOT NULL,
    total_score DOUBLE PRECISION DEFAULT 0,
    sba_score DOUBLE PRECISION DEFAULT 0,
    section_a DOUBLE PRECISION DEFAULT 0, -- Objective
    section_b DOUBLE PRECISION DEFAULT 0, -- Theory
    grade TEXT,
    remark TEXT,
    academic_year TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hub_id, student_id, mock_series, subject)
);

-- 4. CURRICULUM REGISTRY: Global HQ Syllabus Matrix
CREATE TABLE IF NOT EXISTS public.uba_curriculum_master (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level_group TEXT NOT NULL,      -- DAYCARE, KG, LOWER_BASIC, UPPER_BASIC, JHS
    subject TEXT NOT NULL,
    strand TEXT NOT NULL,
    sub_strand TEXT,
    content_standard TEXT,
    indicator_code TEXT UNIQUE,     -- e.g., B1.1.1.1.1
    indicator_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ASSESSMENT REGISTRY: Purely Class/Home/Project/CRA Summary
CREATE TABLE IF NOT EXISTS public.uba_assessment_registry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    term TEXT NOT NULL,
    week TEXT NOT NULL,
    subject TEXT NOT NULL,
    assessment_type TEXT CHECK (assessment_type IN ('CLASS', 'HOME', 'PROJECT', 'CRITERION')),
    total_obtained DOUBLE PRECISION DEFAULT 0,
    total_possible DOUBLE PRECISION DEFAULT 0,
    indicator_coverage TEXT[],      -- Array of indicator codes hit this week
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, hub_id, academic_year, term, week, subject, assessment_type)
);

-- 6. PUPIL REGISTRY: Institutional Roster Matrix
CREATE TABLE IF NOT EXISTS public.uba_pupils (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE,        -- Format: [INITIALS][YEAR][NUMBER]
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    class_name TEXT NOT NULL DEFAULT 'BASIC 9',
    hub_id TEXT NOT NULL,          
    is_jhs_level BOOLEAN DEFAULT TRUE, 
    enrollment_status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERSISTENCE HUB: Global AppState Sharding
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,           
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,        
    version_tag TEXT DEFAULT 'v9.6.0',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ACTIVITY LEDGER: Institutional Audit Trail
CREATE TABLE IF NOT EXISTS public.uba_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    action_type TEXT NOT NULL,     
    context_data JSONB,            
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TRANSACTION LEDGER
CREATE TABLE IF NOT EXISTS public.uba_transaction_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identity_email TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    event_category TEXT CHECK (event_category IN ('DATA_UPLOAD', 'DATA_DOWNLOAD', 'TRADE_EXCHANGE', 'ROYALTY_CREDIT')),
    type TEXT CHECK (type IN ('CREDIT', 'DEBIT')),
    asset_type TEXT CHECK (asset_type IN ('MERIT_TOKEN', 'MONETARY_GHS')),
    amount DOUBLE PRECISION NOT NULL,
    description TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BOOTSTRAP: HQ Master Identity
-- This record provides the global SuperAdmin access key directly within the registry.
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, unique_code)
VALUES ('hq@unitedbaylor.edu.gh', 'HQ CONTROLLER', 'HQ-MASTER-NODE', 'UBA-HQ-HUB', 'super_admin', 'UBA-HQ-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET unique_code = 'UBA-HQ-MASTER-2025';

-- SECURITY OVERRIDES
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_facilitators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_mock_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_curriculum_master DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_assessment_registry DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_transaction_ledger DISABLE ROW LEVEL SECURITY;

-- INDEXING
CREATE INDEX IF NOT EXISTS idx_curr_lvl_sub ON public.uba_curriculum_master(level_group, subject);
CREATE INDEX IF NOT EXISTS idx_as_reg_stud ON public.uba_assessment_registry(student_id, hub_id);
CREATE INDEX IF NOT EXISTS idx_p_hub ON public.uba_pupils(hub_id);
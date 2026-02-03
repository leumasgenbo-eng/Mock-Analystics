
-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v9.5.7 (Score Registry Sync)
-- ==========================================================

-- 1. IDENTITY HUB: Primary Authentication Registry
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         
    hub_id TEXT NOT NULL,          
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    unique_code TEXT UNIQUE,       
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

-- 3. SCORE REGISTRY: Granular Performance Shards (NEW)
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

-- 4. QUESTION REGISTRY: Global HQ Master Bank
CREATE TABLE IF NOT EXISTS public.uba_question_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT UNIQUE,        -- Facilitator-side ID (LQ-XXX)
    hub_id TEXT NOT NULL,           -- Origin School
    facilitator_email TEXT NOT NULL REFERENCES public.uba_identities(email),
    subject TEXT NOT NULL,
    type TEXT CHECK (type IN ('OBJECTIVE', 'THEORY')),
    blooms_level TEXT NOT NULL,     -- Knowledge, Application, etc.
    strand TEXT,
    sub_strand TEXT,
    indicator_code TEXT,
    question_text TEXT NOT NULL,
    correct_key TEXT,               -- Key for OBJ or Rubric Summary for Theory
    weight INTEGER DEFAULT 1,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PUPIL REGISTRY: Institutional Roster Matrix
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

-- 6. PERSISTENCE HUB: Global AppState Sharding
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,           
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,        
    version_tag TEXT DEFAULT 'v9.5.7',
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ACTIVITY LEDGER: Institutional Audit Trail
CREATE TABLE IF NOT EXISTS public.uba_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    action_type TEXT NOT NULL,     
    context_data JSONB,            
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- SECURITY OVERRIDES
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_facilitators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_mock_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_question_bank DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_activity_logs DISABLE ROW LEVEL SECURITY;

-- INDEXING
CREATE INDEX IF NOT EXISTS idx_ms_hub ON public.uba_mock_scores(hub_id);
CREATE INDEX IF NOT EXISTS idx_ms_student ON public.uba_mock_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_ms_subject ON public.uba_mock_scores(subject);
CREATE INDEX IF NOT EXISTS idx_ms_series ON public.uba_mock_scores(mock_series);

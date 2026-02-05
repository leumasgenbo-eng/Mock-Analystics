
-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v9.7.0
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

-- 3. QUESTIONS REGISTRY: Relational Shards for Exam Items
CREATE TABLE IF NOT EXISTS public.uba_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    external_id TEXT UNIQUE,        -- LQ-XXXXXXXX format from frontend
    hub_id TEXT NOT NULL,
    facilitator_email TEXT,
    subject TEXT NOT NULL,
    type TEXT CHECK (type IN ('OBJECTIVE', 'THEORY')),
    blooms_level TEXT,
    strand TEXT,
    strand_code TEXT,
    sub_strand TEXT,
    sub_strand_code TEXT,
    indicator_code TEXT,
    indicator_text TEXT,
    question_text TEXT NOT NULL,
    instruction TEXT,
    correct_key TEXT,               -- For Objectives
    answer_scheme TEXT,             -- For Theory
    weight INTEGER DEFAULT 1,
    diagram_url TEXT,
    status TEXT DEFAULT 'PENDING',  -- PENDING, VERIFIED, REJECTED
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SCORE REGISTRY: Granular Performance Shards
CREATE TABLE IF NOT EXISTS public.uba_mock_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    hub_id TEXT NOT NULL,
    student_id TEXT NOT NULL,       
    mock_series TEXT NOT NULL,      
    subject TEXT NOT NULL,
    total_score DOUBLE PRECISION DEFAULT 0,
    sba_score DOUBLE PRECISION DEFAULT 0,
    section_a DOUBLE PRECISION DEFAULT 0, 
    section_b DOUBLE PRECISION DEFAULT 0, 
    grade TEXT,
    remark TEXT,
    academic_year TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(hub_id, student_id, mock_series, subject)
);

-- 5. PUPIL REGISTRY: Institutional Roster Matrix
CREATE TABLE IF NOT EXISTS public.uba_pupils (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE,        
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    class_name TEXT NOT NULL DEFAULT 'BASIC 9',
    hub_id TEXT NOT NULL,          
    is_jhs_level BOOLEAN DEFAULT TRUE, 
    enrollment_status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PERSISTENCE HUB: Global AppState Sharding (JSON Blobs)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,           
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,        
    version_tag TEXT DEFAULT 'v9.7.0',
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

-- 8. TRANSACTION LEDGER: Merit & Reward Tracking
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

-- 9. INSTRUCTIONAL SHARDS: Mirroring for Pupil Practice Hub
CREATE TABLE IF NOT EXISTS public.uba_instructional_shards (
    id TEXT PRIMARY KEY,
    hub_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BOOTSTRAP: HQ Master Identity
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, unique_code)
VALUES ('hq@unitedbaylor.edu.gh', 'HQ CONTROLLER', 'HQ-MASTER-NODE', 'UBA-HQ-HUB', 'super_admin', 'UBA-HQ-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET unique_code = 'UBA-HQ-MASTER-2025';

-- SECURITY: Disable RLS for Global Hub Functionality
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_facilitators DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_mock_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_transaction_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_instructional_shards DISABLE ROW LEVEL SECURITY;

-- INDEXING for Performance
CREATE INDEX IF NOT EXISTS idx_q_sub ON public.uba_questions(subject);
CREATE INDEX IF NOT EXISTS idx_q_hub ON public.uba_questions(hub_id);
CREATE INDEX IF NOT EXISTS idx_p_hub ON public.uba_pupils(hub_id);


-- ==========================================================
-- UNITED BAYLOR ACADEMY: UNIFIED DATA HUB v9.5 (Global Node Sync)
-- ==========================================================
-- PURPOSE: 100% Data Capture for Assessment, Financials, and Ops.
-- INTEGRATION: Cross-Platform Handshake between Assessment & Companion App.
-- ==========================================================

-- 1. IDENTITY HUB: Primary Authentication & Node Balance Cache
CREATE TABLE IF NOT EXISTS public.uba_identities (
    email TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    node_id TEXT NOT NULL,         -- The Institutional Shard ID
    hub_id TEXT NOT NULL,          -- Regional Controller ID (SMA-HQ)
    role TEXT NOT NULL,            -- super_admin, school_admin, facilitator, pupil
    teaching_category TEXT DEFAULT 'BASIC_SUBJECT_LEVEL', 
    unique_code TEXT UNIQUE,       -- Secure PIN for Gateway Access (e.g., UBA-HQ-MASTER-2025)
    phone_number TEXT,             
    node_metadata JSONB,           -- Captures Device Fingerprints/Preferences
    merit_balance DOUBLE PRECISION DEFAULT 0,    -- Question Credits
    monetary_balance DOUBLE PRECISION DEFAULT 0, -- GHS Vault Value
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PUPIL REGISTRY: Institutional Roster Matrix
CREATE TABLE IF NOT EXISTS public.uba_pupils (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE,        -- Primary Relational Key
    name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('M', 'F', 'Other')),
    class_name TEXT NOT NULL,      -- e.g. 'Basic 1A', 'Nursery 2'
    hub_id TEXT NOT NULL,          -- SMA-HQ Link
    is_jhs_level BOOLEAN DEFAULT FALSE, 
    enrollment_status TEXT DEFAULT 'ACTIVE', -- ACTIVE, GRADUATED, WITHDRAWN
    performance_category TEXT,      -- ELITE, STABLE, AT_RISK
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PERSISTENCE HUB: Global AppState Sharding (100% Data Capture)
CREATE TABLE IF NOT EXISTS public.uba_persistence (
    id TEXT PRIMARY KEY,           -- daily_activity_{hub_id}_{node_id}
    hub_id TEXT NOT NULL,                
    payload JSONB NOT NULL,        -- Full AppState Object
    checksum TEXT,                 -- Verification hash
    version_tag TEXT DEFAULT 'v9.5.0',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT                -- Email of last staff to sync
);

-- 4. ACTIVITY LEDGER: Institutional Audit Trail
CREATE TABLE IF NOT EXISTS public.uba_activity_logs (
    id BIGSERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    staff_id TEXT NOT NULL,
    action_type TEXT NOT NULL,     -- SCORE_UPDATE, PLAN_SYNC, PUPIL_ADD
    context_data JSONB,            -- Captures change delta
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSACTION LEDGER: 100% Financial/Asset Data Capture
CREATE TABLE IF NOT EXISTS public.uba_transaction_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    identity_email TEXT NOT NULL,
    hub_id TEXT NOT NULL,
    event_category TEXT CHECK (event_category IN ('DATA_UPLOAD', 'DATA_DOWNLOAD', 'TRADE_EXCHANGE', 'ROYALTY_CREDIT')),
    type TEXT CHECK (type IN ('CREDIT', 'DEBIT')),
    asset_type TEXT CHECK (asset_type IN ('MERIT_TOKEN', 'MONETARY_GHS')),
    amount DOUBLE PRECISION NOT NULL,
    description TEXT,
    reference_ids TEXT[], 
    metadata JSONB, 
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MESSAGING HUB: Internal Node Communications
CREATE TABLE IF NOT EXISTS public.uba_messages (
    id TEXT PRIMARY KEY,
    from_node TEXT NOT NULL,
    to_node TEXT NOT NULL,
    message_body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    dispatch_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- MASTER SEEDING: CORE NETWORK ACCESS KEYS
-- ==========================================================

-- GLOBAL MASTER ACCESS (SUPERADMIN)
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, teaching_category, unique_code)
VALUES ('hq@unitedbaylor.edu', 'HQ CONTROLLER', 'MASTER-NODE-01', 'SMA-HQ', 'super_admin', 'ADMINISTRATOR', 'UBA-HQ-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET 
    teaching_category = EXCLUDED.teaching_category,
    unique_code = EXCLUDED.unique_code;

-- UNITED BAYLOR ACADEMY PRIMARY ADMIN (LOCAL ADMIN)
INSERT INTO public.uba_identities (email, full_name, node_id, hub_id, role, teaching_category, unique_code)
VALUES ('admin@unitedbaylor.edu.gh', 'UNITED BAYLOR ADMIN', 'UB-MASTER-001', 'SMA-HQ', 'school_admin', 'ADMINISTRATOR', 'UBA-MASTER-2025')
ON CONFLICT (email) DO UPDATE SET 
    unique_code = EXCLUDED.unique_code;

-- ==========================================================
-- SECURITY & PERFORMANCE OVERRIDES
-- ==========================================================
ALTER TABLE public.uba_identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_pupils DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_persistence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_transaction_ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.uba_messages DISABLE ROW LEVEL SECURITY;

-- OPTIMIZATION INDICES
CREATE INDEX IF NOT EXISTS idx_uba_pupils_hub ON public.uba_pupils(hub_id);
CREATE INDEX IF NOT EXISTS idx_identities_node ON public.uba_identities(node_id);
CREATE INDEX IF NOT EXISTS idx_persistence_hub ON public.uba_persistence(hub_id);
CREATE INDEX IF NOT EXISTS idx_ledger_email_ts ON public.uba_transaction_ledger(identity_email, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON public.uba_activity_logs(timestamp DESC);

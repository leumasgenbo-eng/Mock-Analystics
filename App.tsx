

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { calculateClassStatistics, processStudentData } from './utils';
import { GlobalSettings, StudentData, StaffAssignment, SchoolRegistryEntry, ProcessedStudent, MasterQuestion } from './types';
import { supabase } from './supabaseClient';

// Auth Gates
import LoginPortal from './components/auth/LoginPortal';
import SchoolRegistrationPortal from './components/auth/SchoolRegistrationPortal';

// Management & Reporting
import ManagementDesk from './components/management/ManagementDesk';
import HomeDashboard from './components/management/HomeDashboard';
import MasterSheet from './components/reports/MasterSheet';
import ReportCard from './components/reports/ReportCard';
import SeriesBroadSheet from './components/reports/SeriesBroadSheet';
import SuperAdminPortal from './components/hq/SuperAdminPortal';

import { SUBJECT_LIST, DEFAULT_THRESHOLDS, DEFAULT_NORMALIZATION, DEFAULT_CATEGORY_THRESHOLDS } from './constants';

const DEFAULT_SETTINGS: GlobalSettings = {
  schoolName: "UNITED BAYLOR ACADEMY",
  schoolMotto: "EXCELLENCE IN KNOWLEDGE AND CHARACTER",
  schoolWebsite: "www.unitedbaylor.edu",
  schoolAddress: "ACCRA DIGITAL CENTRE, GHANA",
  schoolNumber: "UBA-NODE-2025", 
  schoolLogo: "", 
  examTitle: "OFFICIAL MOCK ASSESSMENT SERIES",
  termInfo: "TERM 2",
  academicYear: "2024/2025",
  nextTermBegin: "2025-05-12",
  attendanceTotal: "60",
  startDate: "10-02-2025",
  endDate: "15-02-2025",
  headTeacherName: "DIRECTOR NAME",
  reportDate: new Date().toLocaleDateString(),
  schoolContact: "+233 24 350 4091",
  schoolEmail: "info@unitedbaylor.edu.gh",
  gradingThresholds: DEFAULT_THRESHOLDS,
  categoryThresholds: DEFAULT_CATEGORY_THRESHOLDS,
  normalizationConfig: DEFAULT_NORMALIZATION,
  sbaConfig: { enabled: true, isLocked: false, sbaWeight: 30, examWeight: 70 },
  isConductLocked: false,
  securityPin: "0000",
  scoreEntryMetadata: { mockSeries: "MOCK 1", entryDate: new Date().toISOString().split('T')[0] },
  committedMocks: ["MOCK 1"],
  activeMock: "MOCK 1",
  resourcePortal: {},
  maxSectionA: 40,
  maxSectionB: 60,
  sortOrder: 'aggregate-asc',
  useTDistribution: true,
  reportTemplate: 'standard',
  adminRoleTitle: "Academy Director",
  registryRoleTitle: "Examination Registry",
  accessCode: "UBA-MASTER-KEY",
  staffAccessCode: "STAFF-UBA-2025",
  pupilAccessCode: "PUPIL-UBA-2025",
  enrollmentDate: new Date().toLocaleDateString()
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [viewMode, setViewMode] = useState<'home' | 'master' | 'reports' | 'management' | 'series' | 'pupil_hub'>('home');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  
  const [currentHubId, setCurrentHubId] = useState<string | null>(localStorage.getItem('uba_active_hub_id'));
  const [activeRole, setActiveRole] = useState<string | null>(localStorage.getItem('uba_active_role'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; nodeId: string; role: string; email?: string; subject?: string } | null>(null);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]); 
  const [facilitators, setFacilitators] = useState<Record<string, StaffAssignment>>({});

  const stateRef = useRef({ settings, students, facilitators });
  useEffect(() => {
    stateRef.current = { settings, students, facilitators };
  }, [settings, students, facilitators]);

  /**
   * ADVANCED QUAD-MIRROR SYNC ENGINE (HQ INTEGRATED)
   * 1. Persistence Layer: uba_persistence
   * 2. Identity Registry: uba_identities
   * 3. Specialist Registry: uba_facilitators
   * 4. Candidate Registry: uba_pupils
   * 5. Dashboard Broadcast: registry_${hubId}
   */
  const handleSaveAll = async (overrides?: { settings?: GlobalSettings, students?: StudentData[], facilitators?: Record<string, StaffAssignment> }) => {
    const activeSettings = overrides?.settings || stateRef.current.settings;
    const activeStudents = overrides?.students || stateRef.current.students;
    const activeFacs = overrides?.facilitators || stateRef.current.facilitators;
    
    const hubId = activeSettings.schoolNumber || currentHubId;
    if (!hubId) return;

    localStorage.setItem(`uba_safety_shard_${hubId}`, JSON.stringify({
      settings: activeSettings,
      students: activeStudents,
      facilitators: activeFacs,
      last_save: new Date().toISOString()
    }));
    
    try {
      const timestamp = new Date().toISOString();
      
      // MIRROR 1: Persistence Blob Shards (Source of Truth for App Recovery)
      const persistenceUpdates = [
        { id: `${hubId}_settings`, hub_id: hubId, payload: activeSettings, last_updated: timestamp },
        { id: `${hubId}_students`, hub_id: hubId, payload: activeStudents, last_updated: timestamp },
        { id: `${hubId}_facilitators`, hub_id: hubId, payload: activeFacs, last_updated: timestamp }
      ];
      await supabase.from('uba_persistence').upsert(persistenceUpdates);

      // MIRROR 2 & 3: Faculty Relational Registry (Mirrors Credentials & Staff Particulars)
      const facilitatorList = Object.values(activeFacs) as StaffAssignment[];
      if (facilitatorList.length > 0) {
        const staffIdentities = facilitatorList.map(f => ({
          email: f.email.toLowerCase().trim(),
          full_name: f.name.toUpperCase().trim(),
          node_id: f.enrolledId,
          hub_id: hubId,
          role: f.role.toLowerCase().includes('admin') ? 'school_admin' : 'facilitator',
          unique_code: f.uniqueCode
        }));
        
        const staffDetails = facilitatorList.map(f => ({
          email: f.email.toLowerCase().trim(),
          full_name: f.name.toUpperCase().trim(),
          hub_id: hubId,
          node_id: f.enrolledId,
          taught_subject: f.taughtSubject,
          teaching_category: f.teachingCategory || 'BASIC_SUBJECT_LEVEL',
          unique_code: f.uniqueCode,
          merit_balance: f.account?.meritTokens || 0,
          monetary_balance: f.account?.monetaryCredits || 0,
          invigilation_data: f.invigilations
        }));

        await supabase.from('uba_identities').upsert(staffIdentities);
        await supabase.from('uba_facilitators').upsert(staffDetails);
      }

      // MIRROR 2 & 4: Pupil Relational Registry (Mirrors Credentials & Candidate Particulars)
      if (activeStudents.length > 0) {
        const pupilIdentities = activeStudents.map(s => ({
          email: s.parentEmail?.toLowerCase().trim() || `${s.indexNumber || s.id}@unitedbaylor.edu.gh`,
          full_name: s.name.toUpperCase().trim(),
          node_id: s.indexNumber || s.id.toString(),
          hub_id: hubId,
          role: 'pupil',
          unique_code: s.uniqueCode
        }));

        const pupilDetails = activeStudents.map(s => ({
          student_id: s.indexNumber || s.id.toString(),
          name: s.name.toUpperCase().trim(),
          gender: s.gender === 'F' ? 'F' : 'M',
          class_name: activeSettings.termInfo || 'BASIC 9',
          hub_id: hubId,
          is_jhs_level: true,
          enrollment_status: 'ACTIVE'
        }));

        await supabase.from('uba_identities').upsert(pupilIdentities);
        await supabase.from('uba_pupils').upsert(pupilDetails);
      }

      // MIRROR 5: Question Extraction & Relational Sync (Likely Shards to uba_questions)
      const { data: persistenceQuestions } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('hub_id', hubId)
        .like('id', 'likely_%');

      if (persistenceQuestions && persistenceQuestions.length > 0) {
        const questionsToMirror = persistenceQuestions.flatMap(row => {
          const qs = row.payload as MasterQuestion[];
          return Array.isArray(qs) ? qs.map(q => ({
            external_id: q.id,
            hub_id: hubId,
            facilitator_email: (Object.values(activeFacs) as StaffAssignment[]).find(f => f.name === q.facilitatorName)?.email,
            subject: q.subject,
            type: q.type,
            blooms_level: q.blooms,
            strand: q.strand,
            strand_code: q.strandCode,
            sub_strand: q.subStrand,
            sub_strand_code: q.subStrandCode,
            indicator_code: q.indicatorCode,
            indicator_text: q.indicator,
            question_text: q.questionText,
            instruction: q.instruction,
            correct_key: q.correctKey,
            answer_scheme: q.answerScheme,
            weight: q.weight,
            diagram_url: q.diagramUrl,
            status: 'PENDING'
          })) : [];
        });

        if (questionsToMirror.length > 0) {
          await supabase.from('uba_questions').upsert(questionsToMirror, { onConflict: 'external_id' });
        }
      }

      // MIRROR 6: HQ DASHBOARD BROADCAST (The "Network Ledger" updater)
      // Calculate metrics to push to the SuperAdmin registry blob
      const stats = calculateClassStatistics(activeStudents, activeSettings);
      const processed = processStudentData(stats, activeStudents, {}, activeSettings);
      const avgAgg = processed.length > 0 ? processed.reduce((sum, s) => sum + (s.bestSixAggregate || 0), 0) / processed.length : 36;

      await supabase.from('uba_persistence').upsert({
         id: `registry_${hubId}`,
         hub_id: hubId,
         payload: {
            ...activeSettings,
            id: hubId,
            name: activeSettings.schoolName,
            status: 'active',
            lastActivity: timestamp,
            studentCount: activeStudents.length,
            avgAggregate: avgAgg,
            fullData: { // Minimal summary for HQ Registry View
              settings: activeSettings,
              students: activeStudents.length, // Just counts to keep blob light
              staff: facilitatorList.length
            }
         },
         last_updated: timestamp
      });

      // Audit Log
      await supabase.from('uba_activity_logs').insert({
          node_id: hubId,
          staff_id: loggedInUser?.email || 'SYSTEM_AUTO',
          action_type: 'GLOBAL_MIRROR_SYNC',
          context_data: { status: 'COMMITTED', pupils: activeStudents.length, staff: facilitatorList.length, mock: activeSettings.activeMock }
      });
      
    } catch (e) {
      console.warn("[MIRROR SYNC HANDSHAKE FAULT]", e);
    }
  };

  const syncCloudShards = useCallback(async (hubId: string) => {
    if (!hubId) return null;
    setIsSyncing(true);
    try {
      const { data: persistenceData } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .eq('hub_id', hubId);
      
      let finalSettings = { ...DEFAULT_SETTINGS };
      let finalStudents: StudentData[] = [];
      let finalFacilitators: Record<string, StaffAssignment> = {};

      if (persistenceData && persistenceData.length > 0) {
        persistenceData.forEach(row => {
          if (row.id === `${hubId}_settings`) finalSettings = row.payload;
          if (row.id === `${hubId}_students`) finalStudents = row.payload;
          if (row.id === `${hubId}_facilitators`) finalFacilitators = row.payload;
        });
      } else {
        const safety = localStorage.getItem(`uba_safety_shard_${hubId}`);
        if (safety) {
           const parsed = JSON.parse(safety);
           finalSettings = parsed.settings;
           finalStudents = parsed.students;
           finalFacilitators = parsed.facilitators;
        }
      }

      setSettings(finalSettings);
      setStudents(finalStudents);
      setFacilitators(finalFacilitators);
      
      setIsSyncing(false);
      return { settings: finalSettings, students: finalStudents, facilitators: finalFacilitators };
    } catch (e) { 
      console.error("[SHARD RECALL ERROR]", e); 
      setIsSyncing(false);
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeSystem = async () => {
      const storedUser = localStorage.getItem('uba_user_context');
      const storedHubId = localStorage.getItem('uba_active_hub_id');
      
      if (storedUser && storedHubId) {
        const user = JSON.parse(storedUser);
        setLoggedInUser(user);
        if (user.role === 'super_admin') {
          setIsSuperAdmin(true);
        } else {
          await syncCloudShards(storedHubId);
        }
      }
      setIsInitializing(false);
    };
    initializeSystem();
  }, [syncCloudShards]);

  const { stats, processedStudents, classAvgAggregate } = useMemo(() => {
    const s = calculateClassStatistics(students, settings);
    const staffNames: Record<string, string> = {};
    Object.keys(facilitators || {}).forEach(k => { 
        if (facilitators[k].name && facilitators[k].taughtSubject) 
            staffNames[facilitators[k].taughtSubject!] = facilitators[k].name; 
    });
    const processed = processStudentData(s, students, staffNames, settings);
    const avgAgg = processed.reduce((sum, st) => sum + (st.bestSixAggregate || 0), 0) / (processed.length || 1);
    return { stats: s, processedStudents: processed, classAvgAggregate: avgAgg };
  }, [students, facilitators, settings]);

  const handleLogout = () => { 
    localStorage.removeItem('uba_active_hub_id');
    localStorage.removeItem('uba_active_role');
    localStorage.removeItem('uba_user_context');
    window.location.reload(); 
  };

  const handleLoginTransition = async (hubId: string, user: any) => {
    localStorage.setItem('uba_active_hub_id', hubId);
    localStorage.setItem('uba_active_role', user.role);
    localStorage.setItem('uba_user_context', JSON.stringify(user));
    await syncCloudShards(hubId);
    setCurrentHubId(hubId);
    setActiveRole(user.role);
    setLoggedInUser(user);
  };

  const handleOnboardingComplete = async (hubId: string) => {
    localStorage.setItem('uba_active_hub_id', hubId);
    localStorage.setItem('uba_active_role', 'school_admin');
    const user = { name: settings.registrantName || 'ADMIN', nodeId: hubId, role: 'school_admin', email: settings.registrantEmail };
    localStorage.setItem('uba_user_context', JSON.stringify(user));
    setCurrentHubId(hubId);
    setActiveRole('school_admin');
    setLoggedInUser(user);
    setIsRegistering(false);
    await syncCloudShards(hubId);
  };

  if (isInitializing || isSyncing) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-12">
      <div className="relative">
         <div className="w-32 h-32 border-8 border-blue-500/10 rounded-full"></div>
         <div className="absolute inset-0 w-32 h-32 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
         <p className="text-2xl font-black text-white uppercase tracking-[0.6em] animate-pulse">Syncing Academy Node</p>
         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Mirroring Shards from Global Hub</p>
      </div>
    </div>
  );

  if (!currentHubId && !isSuperAdmin) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {isRegistering ? (
        <SchoolRegistrationPortal 
          settings={settings} 
          onBulkUpdate={(u) => setSettings(prev => ({...prev, ...u}))}
          /* Fixed: Wrapped async handleSaveAll in sync block to satisfy void return requirement */
          onSave={() => { void handleSaveAll(); }}
          onComplete={handleOnboardingComplete}
          onResetStudents={() => setStudents([])}
          onSwitchToLogin={() => setIsRegistering(false)}
        />
      ) : (
        <LoginPortal 
          onLoginSuccess={handleLoginTransition} 
          onSuperAdminLogin={() => setIsSuperAdmin(true)} 
          onSwitchToRegister={() => setIsRegistering(true)} 
        />
      )}
    </div>
  );

  /* Fixed: Wrapped syncCloudShards promise in sync block to satisfy onRemoteView's expected void return type */
  if (isSuperAdmin) return <SuperAdminPortal onExit={handleLogout} onRemoteView={(id)=>{ void syncCloudShards(id).then(() => { setCurrentHubId(id); setIsSuperAdmin(false); setActiveRole('school_admin'); }); }} />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <div className="no-print bg-blue-900 text-white p-4 sticky top-0 z-50 shadow-md flex justify-between items-center">
        <div className="flex bg-blue-800 rounded p-1 gap-1 text-[10px] font-black uppercase overflow-x-auto no-scrollbar">
          <button onClick={()=>setViewMode('home')} className={`px-4 py-2 rounded transition-all ${viewMode==='home' ? 'bg-white text-blue-900' : 'hover:bg-blue-700'}`}>Home</button>
          <button onClick={()=>setViewMode('master')} className={`px-4 py-2 rounded transition-all ${viewMode==='master' ? 'bg-white text-blue-900' : 'hover:bg-blue-700'}`}>Sheets</button>
          <button onClick={()=>setViewMode('reports')} className={`px-4 py-2 rounded transition-all ${viewMode==='reports' ? 'bg-white text-blue-900' : 'hover:bg-blue-700'}`}>Reports</button>
          <button onClick={()=>setViewMode('series')} className={`px-4 py-2 rounded transition-all ${viewMode==='series' ? 'bg-white text-blue-900' : 'hover:bg-blue-700'}`}>Tracker</button>
          <button onClick={()=>setViewMode('management')} className={`px-4 py-2 rounded transition-all ${viewMode==='management' ? 'bg-white text-blue-900' : 'hover:bg-blue-700'}`}>Mgmt Hub</button>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">Logout</button>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {viewMode==='home' && <HomeDashboard students={processedStudents} settings={settings} setViewMode={setViewMode as any} />}
        {/* Fixed: Wrapped async handleSaveAll in sync block and used void operator to ensure void return type satisfaction */}
        {viewMode==='master' && <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); void handleSaveAll({settings:next}); }} facilitators={facilitators} isFacilitator={activeRole === 'facilitator'} />}
        {/* Fixed: Wrapped async handleSaveAll in sync block and used void operator to ensure void return type satisfaction */}
        {viewMode==='series' && <SeriesBroadSheet students={students} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); void handleSaveAll({settings:next}); }} currentProcessed={processedStudents.map(ps=>({id:ps.id, bestSixAggregate:ps.bestSixAggregate, rank:ps.rank, totalScore:ps.totalScore, category:ps.category}))} />}
        {viewMode==='reports' && (
          <div className="space-y-8">
            <input type="text" placeholder="Search..." value={reportSearchTerm} onChange={(e)=>setReportSearchTerm(e.target.value)} className="w-full p-6 rounded-3xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none" />
            {/* Fixed: Wrapped async handleSaveAll in sync block and used void operator to ensure void return type satisfaction */}
            {processedStudents.filter(s=>(s.name||"").toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s=><ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); void handleSaveAll({settings:next}); }} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={activeRole === 'facilitator'} loggedInUser={loggedInUser} />)}
          </div>
        )}
        {viewMode==='management' && (
          <ManagementDesk 
            students={students} 
            setStudents={setStudents} 
            facilitators={facilitators} 
            setFacilitators={setFacilitators} 
            subjects={SUBJECT_LIST} 
            settings={settings} 
            onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} 
            /* Fixed: Wrapped async handleSaveAll in sync block and used void operator to ensure void return type satisfaction */
            onBulkUpdate={(u)=>{ const next={...settings,...u}; setSettings(next); void handleSaveAll({settings:next}); }} 
            /* Fixed: Changed expression-bodied arrow function to block body and handled handleSaveAll promise to satisfy void return type */
            onSave={(ov)=>{ void handleSaveAll(ov); }} 
            processedSnapshot={processedStudents} 
            onLoadDummyData={()=>{}} 
            onClearData={()=>{}} 
            isFacilitator={activeRole === 'facilitator'} 
            loggedInUser={loggedInUser} 
          />
        )}
      </div>
    </div>
  );
};

export default App;
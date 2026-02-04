
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { calculateClassStatistics, processStudentData } from './utils';
import { GlobalSettings, StudentData, StaffAssignment, SchoolRegistryEntry, ProcessedStudent } from './types';
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

  const handleSaveAll = async (overrides?: { settings?: GlobalSettings, students?: StudentData[], facilitators?: Record<string, StaffAssignment> }) => {
    const activeSettings = overrides?.settings || stateRef.current.settings;
    const activeStudents = overrides?.students || stateRef.current.students;
    const activeFacs = overrides?.facilitators || stateRef.current.facilitators;
    
    const hubId = activeSettings.schoolNumber || currentHubId;
    if (!hubId) return;

    // Local mirror for instant UX
    localStorage.setItem(`uba_safety_shard_${hubId}`, JSON.stringify({
      settings: activeSettings,
      students: activeStudents,
      facilitators: activeFacs,
      last_save: new Date().toISOString()
    }));
    
    try {
      const timestamp = new Date().toISOString();
      
      const updates = [
        { id: `${hubId}_settings`, hub_id: hubId, payload: activeSettings, last_updated: timestamp },
        { id: `${hubId}_students`, hub_id: hubId, payload: activeStudents, last_updated: timestamp },
        { id: `${hubId}_facilitators`, hub_id: hubId, payload: activeFacs, last_updated: timestamp }
      ];
      await supabase.from('uba_persistence').upsert(updates);

      // Save granular scores for BI reporting
      const activeMock = activeSettings.activeMock;
      const scoresPayload = activeStudents.flatMap(s => {
         const mockSet = s.mockData?.[activeMock];
         if (!mockSet) return [];
         return Object.keys(mockSet.scores).map(subject => ({
            hub_id: hubId,
            student_id: s.indexNumber || s.id.toString(),
            mock_series: activeMock,
            subject,
            total_score: (mockSet.examSubScores[subject]?.sectionA || 0) + (mockSet.examSubScores[subject]?.sectionB || 0),
            sba_score: mockSet.sbaScores[subject] || 0,
            section_a: mockSet.examSubScores[subject]?.sectionA || 0,
            section_b: mockSet.examSubScores[subject]?.sectionB || 0,
            academic_year: activeSettings.academicYear
         }));
      });

      if (scoresPayload.length > 0) {
         await supabase.from('uba_mock_scores').upsert(scoresPayload);
      }

      await supabase.from('uba_activity_logs').insert({
          node_id: hubId,
          staff_id: loggedInUser?.email || 'SYSTEM_AUTO',
          action_type: 'SCORE_REGISTRY_SYNC',
          context_data: { status: 'COMMITTED', shards: scoresPayload.length, mock: activeMock }
      });
    } catch (e) {
      console.warn("[CLOUD SYNC ERROR]", e);
    }
  };

  const syncCloudShards = useCallback(async (hubId: string) => {
    if (!hubId) return null;
    setIsSyncing(true);
    try {
      console.log(`[CLOUD HANDSHAKE] Requesting data for node: ${hubId}`);
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
        console.log(`[CLOUD HANDSHAKE] Successful restoration from uba_persistence.`);
      } else {
        // Last resort: browser data
        const safety = localStorage.getItem(`uba_safety_shard_${hubId}`);
        if (safety) {
           const parsed = JSON.parse(safety);
           finalSettings = parsed.settings;
           finalStudents = parsed.students;
           finalFacilitators = parsed.facilitators;
           console.log(`[CLOUD HANDSHAKE] WARNING: Cloud vault empty. Restoring from local safety shard.`);
        }
      }

      setSettings(finalSettings);
      setStudents(finalStudents);
      setFacilitators(finalFacilitators);
      
      setIsSyncing(false);
      return { settings: finalSettings, students: finalStudents, facilitators: finalFacilitators };
    } catch (e) { 
      console.error("[SHARD SYNC ERROR]", e); 
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
          // CLOUD FURNISH PROTOCOL: Always fetch from Supabase on mount
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
    
    // Immediate cloud furnishing after gate handshake
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
      <div className="relative">
         <div className="w-32 h-32 border-8 border-blue-500/10 rounded-full"></div>
         <div className="absolute inset-0 w-32 h-32 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <div className="text-center space-y-2">
         <p className="text-2xl font-black text-white uppercase tracking-[0.6em] animate-pulse">Syncing Academy Node</p>
         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Restoring State from Cloud Hub</p>
      </div>
    </div>
  );

  if (!currentHubId && !isSuperAdmin) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {isRegistering ? (
        <SchoolRegistrationPortal 
          settings={settings} 
          onBulkUpdate={(u) => setSettings(prev => ({...prev, ...u}))}
          onSave={handleSaveAll}
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

  if (isSuperAdmin) return <SuperAdminPortal onExit={handleLogout} onRemoteView={async (id)=>{ await syncCloudShards(id); setCurrentHubId(id); setIsSuperAdmin(false); setActiveRole('school_admin'); }} />;

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
        {viewMode==='master' && <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); handleSaveAll({settings:next}); }} facilitators={facilitators} isFacilitator={activeRole === 'facilitator'} />}
        {viewMode==='series' && <SeriesBroadSheet students={students} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); handleSaveAll({settings:next}); }} currentProcessed={processedStudents.map(ps=>({id:ps.id, bestSixAggregate:ps.bestSixAggregate, rank:ps.rank, totalScore:ps.totalScore, category:ps.category}))} />}
        {viewMode==='reports' && (
          <div className="space-y-8">
            <input type="text" placeholder="Search..." value={reportSearchTerm} onChange={(e)=>setReportSearchTerm(e.target.value)} className="w-full p-6 rounded-3xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none" />
            {processedStudents.filter(s=>(s.name||"").toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s=><ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>{ const next={...settings,[k]:v}; setSettings(next); handleSaveAll({settings:next}); }} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={activeRole === 'facilitator'} loggedInUser={loggedInUser} />)}
          </div>
        )}
        {viewMode==='management' && <ManagementDesk students={students} setStudents={setStudents} facilitators={facilitators} setFacilitators={setFacilitators} subjects={SUBJECT_LIST} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} onBulkUpdate={(u)=>{ const next={...settings,...u}; setSettings(next); handleSaveAll({settings:next}); }} onSave={handleSaveAll} processedSnapshot={processedStudents} onLoadDummyData={()=>{}} onClearData={()=>{}} isFacilitator={activeRole === 'facilitator'} loggedInUser={loggedInUser} />}
      </div>
    </div>
  );
};

export default App;


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
import PupilDashboard from './components/pupil/PupilDashboard';

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
  schoolEmail: "info@unitedbaylor.edu",
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
  const [viewMode, setViewMode] = useState<'home' | 'master' | 'reports' | 'management' | 'series' | 'pupil_hub'>('home');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  
  const [currentHubId, setCurrentHubId] = useState<string | null>(localStorage.getItem('uba_active_hub_id'));
  const [activeRole, setActiveRole] = useState<string | null>(localStorage.getItem('uba_active_role'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activePupil, setActivePupil] = useState<ProcessedStudent | null>(null);
  const [activeFacilitator, setActiveFacilitator] = useState<{ name: string; subject: string; email?: string } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; nodeId: string; role: string; email?: string; subject?: string } | null>(null);
  const [globalRegistry, setGlobalRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]); 
  const [facilitators, setFacilitators] = useState<Record<string, StaffAssignment>>({});

  const stateRef = useRef({ settings, students, facilitators });
  useEffect(() => {
    stateRef.current = { settings, students, facilitators };
  }, [settings, students, facilitators]);

  const syncCloudShards = useCallback(async (hubId: string) => {
    if (!hubId) return null;
    setIsSyncing(true);
    try {
      const { data: persistenceData } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .eq('hub_id', hubId);
      
      const { data: pupilRegistry } = await supabase
        .from('uba_pupils')
        .select('*')
        .eq('hub_id', hubId);

      let cloudSettings = { ...DEFAULT_SETTINGS };
      let cloudStudents: StudentData[] = [];
      let cloudFacilitators: Record<string, StaffAssignment> = {};

      if (persistenceData) {
        persistenceData.forEach(row => {
          if (row.id === `${hubId}_settings`) cloudSettings = row.payload;
          if (row.id === `${hubId}_students`) cloudStudents = row.payload;
          if (row.id === `${hubId}_facilitators`) cloudFacilitators = row.payload;
        });
      }

      if (pupilRegistry && pupilRegistry.length > 0) {
        const mergedStudents = [...cloudStudents];
        pupilRegistry.forEach(p => {
          const studentId = parseInt(p.student_id);
          const exists = mergedStudents.some(cs => cs.id === studentId);
          if (!exists) {
            mergedStudents.push({
              id: studentId,
              name: p.name.toUpperCase(),
              email: `${p.student_id}@unitedbaylor.edu`,
              gender: p.gender || 'M',
              parentContact: '',
              attendance: 0,
              scores: {},
              sbaScores: {},
              examSubScores: {},
              mockData: {}
            });
          }
        });
        cloudStudents = mergedStudents;
      }

      setSettings(cloudSettings);
      setStudents(cloudStudents);
      setFacilitators(cloudFacilitators);
      
      setIsSyncing(false);
      return { settings: cloudSettings, students: cloudStudents, facilitators: cloudFacilitators };
    } catch (e) { 
      console.error("[CLOUD RECONCILIATION FAULT]", e); 
      setIsSyncing(false);
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeSystem = async () => {
      const { data: regData } = await supabase.from('uba_persistence').select('payload').like('id', 'registry_%');
      if (regData) setGlobalRegistry(regData.flatMap(r => r.payload || []));

      const storedUser = localStorage.getItem('uba_user_context');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setLoggedInUser(user);
        
        if (user.role === 'super_admin') {
          setIsSuperAdmin(true);
        } else if (currentHubId) {
          const cloudData = await syncCloudShards(currentHubId);
          if (user.role === 'facilitator') {
            setActiveFacilitator({ name: user.name, subject: user.subject || "GENERAL", email: user.email });
          } else if (user.role === 'pupil' && cloudData) {
            const s = calculateClassStatistics(cloudData.students, cloudData.settings);
            const processed = processStudentData(s, cloudData.students, {}, cloudData.settings);
            const pupil = processed.find(p => p.id === parseInt(user.nodeId));
            if (pupil) setActivePupil(pupil);
          }
        }
      }
      setIsInitializing(false);
    };
    initializeSystem();
  }, [currentHubId, syncCloudShards]);

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

  /**
   * GLOBAL PERSISTENCE HUB
   * Accepts optional overrides to prevent race conditions during heavy sync ops (like adding staff)
   */
  const handleSaveAll = async (overrides?: { students?: StudentData[], settings?: GlobalSettings, facilitators?: Record<string, StaffAssignment> }) => {
    const s = overrides?.settings || stateRef.current.settings;
    const st = overrides?.students || stateRef.current.students;
    const f = overrides?.facilitators || stateRef.current.facilitators;
    
    const hubId = s.schoolNumber || currentHubId;
    if (!hubId) return;
    
    try {
      await supabase.from('uba_persistence').upsert([
        { id: `${hubId}_settings`, hub_id: hubId, payload: s, last_updated: new Date().toISOString(), updated_by: loggedInUser?.email },
        { id: `${hubId}_students`, hub_id: hubId, payload: st, last_updated: new Date().toISOString(), updated_by: loggedInUser?.email },
        { id: `${hubId}_facilitators`, hub_id: hubId, payload: f, last_updated: new Date().toISOString(), updated_by: loggedInUser?.email }
      ]);

      await supabase.from('uba_activity_logs').insert({
          node_id: hubId,
          staff_id: loggedInUser?.email || 'ANONYMOUS',
          action_type: 'GLOBAL_PERSISTENCE_SYNC',
          context_data: { student_count: st.length, mock_cycle: s.activeMock }
      });
    } catch (e) {
      console.error("Cloud Sync Failure:", e);
    }
  };

  const handleLoginTransition = async (hubId: string, user: any) => {
    setIsSyncing(true);
    localStorage.setItem('uba_active_hub_id', hubId);
    localStorage.setItem('uba_active_role', user.role);
    localStorage.setItem('uba_user_context', JSON.stringify(user));
    
    const cloudData = await syncCloudShards(hubId);
    
    setCurrentHubId(hubId);
    setActiveRole(user.role);
    setLoggedInUser(user);
    
    if (user.role === 'facilitator') {
      setActiveFacilitator({ name: user.name, subject: user.subject || "GENERAL", email: user.email });
    } else if (user.role === 'pupil' && cloudData) {
      const s = calculateClassStatistics(cloudData.students, cloudData.settings);
      const processed = processStudentData(s, cloudData.students, {}, cloudData.settings);
      const pupil = processed.find(p => p.id === parseInt(user.nodeId));
      if (pupil) setActivePupil(pupil);
    }
    
    setIsSyncing(false);
  };

  if (isInitializing || isSyncing) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-12 animate-in fade-in duration-500">
      <div className="relative">
         <div className="w-32 h-32 border-8 border-blue-500/10 rounded-full"></div>
         <div className="absolute inset-0 w-32 h-32 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         <div className="absolute inset-8 w-16 h-16 border-4 border-indigo-400 border-b-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
      </div>
      <div className="text-center space-y-6">
        <p className="text-2xl font-black text-white uppercase tracking-[0.6em] leading-none animate-pulse">
          {isSyncing ? "Establishing Deep Mirror" : "Validating Node Shards"}
        </p>
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">
            {isSyncing ? "100% Learner Data Download Protocol..." : "Handshaking Unified Network Registry v9.5..."}
          </p>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 animate-[progress_3s_ease-in-out_infinite]" style={{width:'70%'}}></div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }` }} />
    </div>
  );

  if (!currentHubId && !isSuperAdmin) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {isRegistering ? (
        <SchoolRegistrationPortal settings={settings} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={handleSaveAll} onComplete={(hubId)=>{ localStorage.setItem('uba_active_hub_id', hubId); localStorage.setItem('uba_active_role', 'school_admin'); setCurrentHubId(hubId); setActiveRole('school_admin'); }} onResetStudents={()=>setStudents([])} onSwitchToLogin={()=>setIsRegistering(false)} />
      ) : (
        <LoginPortal onLoginSuccess={handleLoginTransition} onSuperAdminLogin={()=>{ localStorage.setItem('uba_active_role', 'super_admin'); localStorage.setItem('uba_user_context', JSON.stringify({name:'HQ CONTROLLER', role:'super_admin', nodeId:'MASTER-01', email:'hq@unitedbaylor.edu'})); setIsSuperAdmin(true); setActiveRole('super_admin'); }} onSwitchToRegister={()=>setIsRegistering(true)} />
      )}
    </div>
  );

  if (isSuperAdmin) return <SuperAdminPortal onExit={handleLogout} onRemoteView={async (id)=>{ await syncCloudShards(id); setCurrentHubId(id); setIsSuperAdmin(false); setActiveRole('school_admin'); }} />;

  if (activeRole === 'pupil' && activePupil) {
    return (
      <PupilDashboard 
        student={activePupil} 
        stats={stats} 
        settings={settings} 
        classAverageAggregate={classAvgAggregate} 
        totalEnrolled={processedStudents.length} 
        onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} 
        globalRegistry={globalRegistry} 
        onLogout={handleLogout} 
        loggedInUser={loggedInUser} 
      />
    );
  }

  const isFacilitatorMode = activeRole === 'facilitator';
  const previewStudent = processedStudents.length > 0 ? processedStudents[0] : activePupil;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <div className="no-print bg-blue-900 text-white p-4 sticky top-0 z-50 shadow-md flex justify-between items-center">
        <div className="flex bg-blue-800 rounded p-1 gap-1 text-[10px] font-black uppercase overflow-x-auto no-scrollbar">
          <button onClick={()=>setViewMode('home')} className={`px-4 py-2 rounded transition-all ${viewMode==='home' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Home</button>
          <button onClick={()=>setViewMode('master')} className={`px-4 py-2 rounded transition-all ${viewMode==='master' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Sheets</button>
          <button onClick={()=>setViewMode('reports')} className={`px-4 py-2 rounded transition-all ${viewMode==='reports' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Reports</button>
          <button onClick={()=>setViewMode('series')} className={`px-4 py-2 rounded transition-all ${viewMode==='series' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Tracker</button>
          <button onClick={()=>setViewMode('management')} className={`px-4 py-2 rounded transition-all ${viewMode==='management' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Mgmt Hub</button>
          <button onClick={()=>setViewMode('pupil_hub')} className={`px-4 py-2 rounded transition-all ${viewMode==='pupil_hub' ? 'bg-orange-600 text-white shadow-lg' : 'hover:bg-blue-700 text-blue-200'}`}>Pupil Hub</button>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">Logout</button>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {viewMode==='home' && <HomeDashboard students={processedStudents} settings={settings} setViewMode={setViewMode as any} />}
        {viewMode==='master' && <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} facilitators={facilitators} isFacilitator={isFacilitatorMode} />}
        {viewMode==='series' && <SeriesBroadSheet students={students} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} currentProcessed={processedStudents.map(ps=>({id:ps.id, bestSixAggregate:ps.bestSixAggregate, rank:ps.rank, totalScore:ps.totalScore, category:ps.category}))} />}
        {viewMode==='pupil_hub' && (
           previewStudent ? (
             <PupilDashboard 
               student={previewStudent} 
               stats={stats} 
               settings={settings} 
               classAverageAggregate={classAvgAggregate} 
               totalEnrolled={processedStudents.length} 
               onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} 
               globalRegistry={globalRegistry} 
               onLogout={handleLogout} 
               loggedInUser={loggedInUser} 
             />
           ) : (
             <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 opacity-50">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-900"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
               <p className="font-black uppercase text-xs tracking-[0.5em] text-blue-900 leading-none">No Candidate Data to Display</p>
             </div>
           )
        )}
        {viewMode==='reports' && (
          <div className="space-y-8">
            <input type="text" placeholder="Search..." value={reportSearchTerm} onChange={(e)=>setReportSearchTerm(e.target.value)} className="w-full p-6 rounded-3xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none" />
            {processedStudents.filter(s=>(s.name||"").toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s=><ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={isFacilitatorMode} />)}
          </div>
        )}
        {viewMode==='management' && <ManagementDesk students={students} setStudents={setStudents} facilitators={facilitators} setFacilitators={setFacilitators} subjects={SUBJECT_LIST} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={handleSaveAll} processedSnapshot={processedStudents} onLoadDummyData={()=>{}} onClearData={()=>{}} isFacilitator={isFacilitatorMode} activeFacilitator={activeFacilitator} loggedInUser={loggedInUser} />}
      </div>
    </div>
  );
};

export default App;

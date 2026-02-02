
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  const [viewMode, setViewMode] = useState<'home' | 'master' | 'reports' | 'management' | 'series' | 'pupil_hub'>('home');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  
  const [currentHubId, setCurrentHubId] = useState<string | null>(localStorage.getItem('uba_active_hub_id'));
  const [activeRole, setActiveRole] = useState<string | null>(localStorage.getItem('uba_active_role'));
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activePupil, setActivePupil] = useState<ProcessedStudent | null>(null);
  // Fix: Updated activeFacilitator type to include email for ManagementDesk sub-module requirements
  const [activeFacilitator, setActiveFacilitator] = useState<{ name: string; subject: string; email?: string } | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Fix: Updated loggedInUser state type to match extended identity context from LoginPortal
  const [loggedInUser, setLoggedInUser] = useState<{ name: string; nodeId: string; role: string; email?: string; subject?: string } | null>(null);
  const [globalRegistry, setGlobalRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]); 
  const [facilitators, setFacilitators] = useState<Record<string, StaffAssignment>>({});

  const syncCloudShards = useCallback(async (hubId: string) => {
    if (!hubId) return null;
    try {
      const { data, error } = await supabase.from('uba_persistence').select('id, payload').eq('hub_id', hubId);
      if (error) throw error;
      if (data && data.length > 0) {
        let cloudSettings = { ...DEFAULT_SETTINGS };
        let cloudStudents: StudentData[] = [];
        let cloudFacilitators: Record<string, StaffAssignment> = {};
        
        data.forEach(row => {
          if (row.id === `${hubId}_settings`) cloudSettings = row.payload;
          if (row.id === `${hubId}_students`) cloudStudents = row.payload;
          if (row.id === `${hubId}_facilitators`) cloudFacilitators = row.payload;
        });

        setSettings(cloudSettings);
        setStudents(cloudStudents);
        setFacilitators(cloudFacilitators);
        return { settings: cloudSettings, students: cloudStudents, facilitators: cloudFacilitators };
      }
    } catch (e) { 
      console.error("[CLOUD SYNC ERROR]", e); 
    }
    return null;
  }, []);

  useEffect(() => {
    const initializeSystem = async () => {
      // 1. Fetch Network Registry Shards
      const { data: regData } = await supabase.from('uba_persistence').select('payload').like('id', 'registry_%');
      if (regData) setGlobalRegistry(regData.flatMap(r => r.payload || []));

      // 2. Resolve Active Identity Handshake
      const storedUser = localStorage.getItem('uba_user_context');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setLoggedInUser(user);
        
        if (user.role === 'super_admin') {
          setIsSuperAdmin(true);
        } else if (currentHubId) {
          const cloudData = await syncCloudShards(currentHubId);
          if (user.role === 'facilitator') {
            // Fix: Propagate email to activeFacilitator simplified object
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

  const handleSaveAll = async () => {
    const hubId = settings.schoolNumber || currentHubId;
    if (!hubId) return;
    await supabase.from('uba_persistence').upsert([
      { id: `${hubId}_settings`, hub_id: hubId, payload: settings, last_updated: new Date().toISOString() },
      { id: `${hubId}_students`, hub_id: hubId, payload: students, last_updated: new Date().toISOString() },
      { id: `${hubId}_facilitators`, hub_id: hubId, payload: facilitators, last_updated: new Date().toISOString() }
    ]);
  };

  if (isInitializing) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-center space-y-1">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Handshaking Global Registry</p>
        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">United Baylor Academy Hub v4.6 Active</p>
      </div>
    </div>
  );

  if (!currentHubId && !isSuperAdmin) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {isRegistering ? (
        <SchoolRegistrationPortal settings={settings} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={handleSaveAll} onComplete={(hubId)=>{ localStorage.setItem('uba_active_hub_id', hubId); localStorage.setItem('uba_active_role', 'school_admin'); setCurrentHubId(hubId); setActiveRole('school_admin'); }} onResetStudents={()=>setStudents([])} onSwitchToLogin={()=>setIsRegistering(false)} />
      ) : (
        <LoginPortal onLoginSuccess={async (hubId, user)=>{ localStorage.setItem('uba_active_hub_id', hubId); localStorage.setItem('uba_active_role', user.role); localStorage.setItem('uba_user_context', JSON.stringify(user)); setCurrentHubId(hubId); setActiveRole(user.role); setLoggedInUser(user); await syncCloudShards(hubId); }} onSuperAdminLogin={()=>{ localStorage.setItem('uba_active_role', 'super_admin'); localStorage.setItem('uba_user_context', JSON.stringify({name:'HQ CONTROLLER', role:'super_admin', nodeId:'MASTER-01'})); setIsSuperAdmin(true); setActiveRole('super_admin'); }} onSwitchToRegister={()=>setIsRegistering(true)} />
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
               <p className="font-black uppercase text-xs tracking-[0.5em] text-blue-900">No Candidate Data to Display</p>
             </div>
           )
        )}
        {viewMode==='reports' && (
          <div className="space-y-8">
            <input type="text" placeholder="Search..." value={reportSearchTerm} onChange={(e)=>setReportSearchTerm(e.target.value)} className="w-full p-6 rounded-3xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none" />
            {processedStudents.filter(s=>(s.name||"").toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s=><ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={isFacilitatorMode} />)}
          </div>
        )}
        {/* Fix: activeFacilitator simplified object now correctly matches ManagementDesk prop type */}
        {viewMode==='management' && <ManagementDesk students={students} setStudents={setStudents} facilitators={facilitators} setFacilitators={setFacilitators} subjects={SUBJECT_LIST} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={handleSaveAll} processedSnapshot={processedStudents} onLoadDummyData={()=>{}} onClearData={()=>{}} isFacilitator={isFacilitatorMode} activeFacilitator={activeFacilitator} loggedInUser={loggedInUser} />}
      </div>
    </div>
  );
};

export default App;

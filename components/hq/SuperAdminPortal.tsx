

import React, { useState, useEffect, useMemo } from 'react';
import { SchoolRegistryEntry, RemarkMetric, StaffAssignment } from '../../types';
import { supabase } from '../../supabaseClient';

// Sub-portals
import RegistryView from './RegistryView';
import AuditLogView from './AuditLogView';
import RemarkAnalyticsView from './RemarkAnalyticsView';
import PupilNetworkRankingView from './PupilNetworkRankingView';
import NetworkRewardsView from './NetworkRewardsView';
import NetworkSigDiffView from './NetworkSigDiffView';
import NetworkAnnualAuditReport from './NetworkAnnualAuditReport';
import RecruitmentHubView from './RecruitmentHubView';
import AdvertisementPortalView from './AdvertisementPortalView';
import MarketingDeskView from './MarketingDeskView';
import SerializationHubView from './SerializationHubView';
import QuestionSerializationPortal from './QuestionSerializationPortal';
import QuestionRegistryView from './QuestionRegistryView';
import StaffFinancialsView from './StaffFinancialsView';

export interface SystemAuditEntry {
  timestamp: string;
  action: string;
  target: string;
  actor: string;
  details: string;
  year: string;
}

export interface NetworkPulse {
  identities: number;
  facilitators: number;
  pupils: number;
  questions: number;
  activeNodes: number;
}

const SuperAdminPortal: React.FC<{ onExit: () => void; onRemoteView: (schoolId: string) => void; }> = ({ onExit, onRemoteView }) => {
  const [registry, setRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [auditTrail, setAuditTrail] = useState<SystemAuditEntry[]>([]);
  const [pulse, setPulse] = useState<NetworkPulse>({ identities: 0, facilitators: 0, pupils: 0, questions: 0, activeNodes: 0 });
  const [view, setView] = useState<'registry' | 'recruitment' | 'serialization' | 'questions' | 'q-registry' | 'staff-fin' | 'advertisement' | 'marketing' | 'pupils' | 'rewards' | 'sig-diff' | 'remarks' | 'annual-report' | 'audit'>('registry');
  const [isSyncing, setIsSyncing] = useState(true);

  /**
   * ADVANCED HQ DATA HANDSHAKE (Truly Real-Time)
   * Fetches from: uba_identities, uba_facilitators, uba_pupils, uba_questions, uba_persistence
   */
  const fetchHQData = async () => {
    setIsSyncing(true);
    try {
      // 1. Direct Relational Pulse (Counts from SQL "Files")
      const [
        { count: identCount },
        { count: staffCount },
        { count: pupilCount },
        { count: qCount }
      ] = await Promise.all([
        supabase.from('uba_identities').select('*', { count: 'exact', head: true }),
        supabase.from('uba_facilitators').select('*', { count: 'exact', head: true }),
        supabase.from('uba_pupils').select('*', { count: 'exact', head: true }),
        supabase.from('uba_questions').select('*', { count: 'exact', head: true })
      ]);

      // 2. Network Ledger (From Persistence registry_ shards)
      const { data: persistenceData } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or('id.like.registry_%,id.eq.audit');

      if (persistenceData) {
        const compiled: SchoolRegistryEntry[] = [];
        let compiledAudit: SystemAuditEntry[] = [];

        persistenceData.forEach(row => {
          if (row.id === 'audit') {
            compiledAudit = row.payload || [];
          } else {
            // Some shards might be single entries, some might be arrays (standardized to object in App.tsx)
            const entry = row.payload as SchoolRegistryEntry;
            if (entry && entry.id) compiled.push(entry);
          }
        });
        
        setRegistry(compiled);
        setAuditTrail(compiledAudit);
        setPulse({
          identities: identCount || 0,
          facilitators: staffCount || 0,
          pupils: pupilCount || 0,
          questions: qCount || 0,
          activeNodes: compiled.length
        });
      }
    } catch (e) {
      console.error("Master Hub Handshake Failure:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { 
    fetchHQData(); 
    const interval = setInterval(fetchHQData, 60000); // Auto-pulse every minute
    return () => clearInterval(interval);
  }, []);

  const navSectors = [
    { title: "Infrastructure", tabs: [
      { id: 'registry', label: 'Network Ledger' },
      { id: 'recruitment', label: 'Recruitment Hub' },
      { id: 'serialization', label: 'Serialization' },
      { id: 'questions', label: 'Hub Ingestion' },
      { id: 'q-registry', label: 'Questions Registry' },
      { id: 'staff-fin', label: 'Staff Balances' }
    ]},
    { title: "Engagement", tabs: [
      { id: 'advertisement', label: 'Master Ad Desk' },
      { id: 'marketing', label: 'Marketing Control' }
    ]},
    { title: "Matrix", tabs: [
      { id: 'pupils', label: 'Talent Matrix' },
      { id: 'rewards', label: 'Global Rewards' },
      { id: 'sig-diff', label: 'Network Sig-Diff' }
    ]},
    { title: "Reports", tabs: [
      { id: 'remarks', label: 'Demand Analysis' },
      { id: 'annual-report', label: 'Network Audit' },
      { id: 'audit', label: 'System Trail' }
    ]}
  ];

  const topFacilitators = useMemo(() => {
    // Collect and rank across all schools
    const facs: any[] = [];
    registry.forEach(s => {
       /* Added safety check to handle cases where facilitators object is missing in the minimal summary payload */
       if (!s.fullData || !s.fullData.facilitators) return;
       const data = s.fullData;
       (Object.entries(data.facilitators) as [string, StaffAssignment][]).forEach(([sub, staff]) => {
          if (!staff.name) return;
          facs.push({ name: staff.name, subject: sub, school: s.name, tei: 8.5 }); // Mock TEI for report
       });
    });
    return facs.sort((a,b) => b.tei - a.tei).slice(0, 5);
  }, [registry]);

  if (isSyncing && registry.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-8">
        <div className="relative">
           <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full"></div>
           <div className="absolute inset-0 w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.6em] animate-pulse">Establishing Master Handshake...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 animate-in fade-in duration-700 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Command Header */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/10">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Master Command Hub</h1>
              <div className="flex items-center gap-3 mt-1">
                 <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-400/20">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-pulse shadow-lg"></div>
                    <span className="text-[7px] font-black uppercase text-blue-400">Registry Node Active</span>
                 </div>
                 <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none">Global Pulse Handshake v9.7.2</span>
              </div>
            </div>
          </div>

          {/* Network Pulse Dashboard */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
             {[
               { l: 'Nodes', v: pulse.activeNodes, c: 'text-blue-400' },
               { l: 'Staff', v: pulse.facilitators, c: 'text-indigo-400' },
               { l: 'Pupils', v: pulse.pupils, c: 'text-emerald-400' },
               { l: 'Items', v: pulse.questions, c: 'text-amber-400' }
             ].map(p => (
               <div key={p.l} className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-2xl flex flex-col items-center min-w-[80px] shadow-lg">
                  <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{p.l}</span>
                  <span className={`text-sm font-black font-mono ${p.c}`}>{p.v}</span>
               </div>
             ))}
          </div>

          <button onClick={onExit} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase border border-red-500/20 transition-all shadow-lg active:scale-95">Exit Hub Interface</button>
        </header>

        {/* Global Navigation Hub */}
        <nav className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-2 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="flex flex-wrap md:flex-nowrap divide-x divide-slate-800">
            {navSectors.map((sector, sIdx) => (
              <div key={sIdx} className="flex-1 min-w-[150px] p-2 space-y-2">
                <span className="px-3 text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">{sector.title}</span>
                <div className="grid grid-cols-1 gap-1">
                  {sector.tabs.map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all text-left group flex justify-between items-center ${view === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                      {tab.label}
                      {view === tab.id && <div className="w-1 h-1 bg-white rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Main Orchestration Pane */}
        <main className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl min-h-[700px] overflow-hidden relative">
          {view === 'registry' && <RegistryView registry={registry ?? []} searchTerm="" setSearchTerm={()=>{}} onRemoteView={onRemoteView} onUpdateRegistry={setRegistry} onLogAction={()=>{}} />}
          {view === 'recruitment' && <RecruitmentHubView registry={registry ?? []} onLogAction={()=>{}} />}
          {view === 'serialization' && <SerializationHubView registry={registry ?? []} onLogAction={()=>{}} />}
          {view === 'questions' && <QuestionSerializationPortal registry={registry ?? []} />}
          {view === 'q-registry' && <QuestionRegistryView />}
          {view === 'staff-fin' && <StaffFinancialsView />}
          {view === 'advertisement' && <AdvertisementPortalView onLogAction={()=>{}} />}
          {view === 'marketing' && <MarketingDeskView />}
          {view === 'pupils' && <PupilNetworkRankingView registry={registry ?? []} onRemoteView={onRemoteView} />}
          {view === 'rewards' && <NetworkRewardsView registry={registry ?? []} />}
          {view === 'sig-diff' && <NetworkSigDiffView registry={registry ?? []} />}
          {view === 'remarks' && <RemarkAnalyticsView subjectDemands={[]} />}
          {view === 'annual-report' && <NetworkAnnualAuditReport registry={registry ?? []} />}
          {view === 'audit' && <AuditLogView auditTrail={auditTrail ?? []} />}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
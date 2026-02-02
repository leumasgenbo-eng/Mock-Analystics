
import React, { useState, useEffect, useMemo } from 'react';
import { SchoolRegistryEntry, RemarkMetric } from '../../types';
import { supabase } from '../../supabaseClient';

// Sub-portals
import RegistryView from './RegistryView';
import ReratingView from './ReratingView';
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

export interface SystemAuditEntry {
  timestamp: string;
  action: string;
  target: string;
  actor: string;
  details: string;
  year: string;
}

export interface SubjectDemandMetric {
  subject: string;
  demandScore: number;
  difficultyRating: number;
  networkMeanPerformance: number;
  maleRemarkShare: number;
  femaleRemarkShare: number;
  topRemark: string;
  remarkCount: number;
}

const SuperAdminPortal: React.FC<{ onExit: () => void; onRemoteView: (schoolId: string) => void; }> = ({ onExit, onRemoteView }) => {
  const [registry, setRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [auditTrail, setAuditTrail] = useState<SystemAuditEntry[]>([]);
  const [view, setView] = useState<'registry' | 'recruitment' | 'serialization' | 'questions' | 'q-registry' | 'advertisement' | 'marketing' | 'pupils' | 'rewards' | 'sig-diff' | 'remarks' | 'annual-report' | 'audit'>('registry');
  const [isSyncing, setIsSyncing] = useState(true);

  const fetchHQData = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or('id.like.registry_%,id.eq.audit');

      if (error) throw error;

      if (data) {
        const compiled: SchoolRegistryEntry[] = [];
        let compiledAudit: SystemAuditEntry[] = [];

        data.forEach(row => {
          if (row.id === 'audit') {
            compiledAudit = row.payload || [];
          } else {
            const schoolEntries = Array.isArray(row.payload) ? row.payload : [row.payload];
            compiled.push(...schoolEntries);
          }
        });
        
        setRegistry(compiled);
        setAuditTrail(compiledAudit);
      }
    } catch (e) {
      console.error("HQ Data Fetch Failure:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { fetchHQData(); }, []);

  const navSectors = [
    { title: "Infrastructure", tabs: [
      { id: 'registry', label: 'Network Ledger' },
      { id: 'recruitment', label: 'Recruitment Hub' },
      { id: 'serialization', label: 'Serialization' },
      { id: 'questions', label: 'Hub Ingestion' },
      { id: 'q-registry', label: 'Questions Registry' }
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

  if (isSyncing) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Accessing Master Shards...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 animate-in fade-in duration-700 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Master Command Hub</h1>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mt-2">REGISTRY NODE ACTIVE</p>
            </div>
          </div>
          <button onClick={onExit} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase border border-red-500/20 transition-all shadow-lg">Exit Hub Interface</button>
        </header>

        <nav className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-2 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="flex flex-wrap md:flex-nowrap divide-x divide-slate-800">
            {navSectors.map((sector, sIdx) => (
              <div key={sIdx} className="flex-1 min-w-[150px] p-2 space-y-2">
                <span className="px-3 text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">{sector.title}</span>
                <div className="grid grid-cols-1 gap-1">
                  {sector.tabs.map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all text-left group ${view === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>{tab.label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl min-h-[700px] overflow-hidden relative">
          {view === 'registry' && <RegistryView registry={registry ?? []} searchTerm="" setSearchTerm={()=>{}} onRemoteView={onRemoteView} onUpdateRegistry={setRegistry} onLogAction={()=>{}} />}
          {view === 'recruitment' && <RecruitmentHubView registry={registry ?? []} onLogAction={()=>{}} />}
          {view === 'serialization' && <SerializationHubView registry={registry ?? []} onLogAction={()=>{}} />}
          {view === 'questions' && <QuestionSerializationPortal registry={registry ?? []} />}
          {view === 'q-registry' && <QuestionRegistryView />}
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


import React, { useState, useEffect, useMemo } from 'react';
import { SchoolRegistryEntry, RemarkMetric, VerificationEntry } from '../types';

interface SuperAdminPortalProps {
  onExit: () => void;
  onRemoteView: (schoolId: string) => void;
}

const SuperAdminPortal: React.FC<SuperAdminPortalProps> = ({ onExit, onRemoteView }) => {
  const [registry, setRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'registry' | 'rankings' | 'remarks' | 'audit'>('registry');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('uba_global_registry');
    if (saved) {
      setRegistry(JSON.parse(saved));
    }
  }, []);

  const stats = useMemo(() => {
    return {
      total: registry.length,
      active: registry.filter(r => r.status === 'active').length,
      totalStudents: registry.reduce((sum, r) => sum + r.studentCount, 0),
    };
  }, [registry]);

  const schoolRankings = useMemo(() => {
    if (registry.length === 0) return [];

    const processed = registry.map(school => {
      const history = school.performanceHistory || [];
      const mockCount = history.length;
      const compositeAvg = mockCount > 0 ? history.reduce((sum, h) => sum + h.avgComposite, 0) / mockCount : 0;
      const aggregateAvg = mockCount > 0 ? history.reduce((sum, h) => sum + h.avgAggregate, 0) / mockCount : 0;
      const objectiveAvg = mockCount > 0 ? history.reduce((sum, h) => sum + h.avgObjective, 0) / mockCount : 0;
      const theoryAvg = mockCount > 0 ? history.reduce((sum, h) => sum + h.avgTheory, 0) / mockCount : 0;

      return {
        id: school.id,
        name: school.name,
        mockCount,
        compositeAvg,
        aggregateAvg,
        objectiveAvg,
        theoryAvg
      };
    });

    const calculateStats = (vals: number[]) => {
      if (vals.length === 0) return { mean: 0, std: 0 };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / vals.length);
      return { mean, std };
    };

    const compositeStats = calculateStats(processed.map(p => p.compositeAvg));
    const aggregateStats = calculateStats(processed.map(p => p.aggregateAvg));
    const objectiveStats = calculateStats(processed.map(p => p.objectiveAvg));
    const theoryStats = calculateStats(processed.map(p => p.theoryAvg));

    const getZ = (val: number, stats: { mean: number; std: number }, reverse: boolean = false) => {
      if (stats.std === 0) return 0;
      const z = (val - stats.mean) / stats.std;
      return reverse ? -z : z;
    };

    return processed.map(p => {
      const zComposite = getZ(p.compositeAvg, compositeStats);
      const zAggregate = getZ(p.aggregateAvg, aggregateStats, true); 
      const zObjective = getZ(p.objectiveAvg, objectiveStats);
      const zTheory = getZ(p.theoryAvg, theoryStats);
      const overallIndex = (zComposite + zAggregate + zObjective + zTheory) / 4;
      return { ...p, zComposite, zAggregate, zObjective, zTheory, overallIndex };
    }).sort((a, b) => b.overallIndex - a.overallIndex);
  }, [registry]);

  const remarkAnalytics = useMemo(() => {
    const globalConduct: Record<string, RemarkMetric> = {};
    const globalFacilitatorNotes: Record<string, RemarkMetric> = {};
    const globalSubjectRemarks: Record<string, Record<string, RemarkMetric>> = {};

    registry.forEach(school => {
      const tel = school.remarkTelemetry;
      if (!tel) return;

      (tel.conductRemarks || []).forEach(rm => {
        if (!globalConduct[rm.text]) globalConduct[rm.text] = { ...rm };
        else {
          globalConduct[rm.text].count += rm.count;
          globalConduct[rm.text].maleCount += rm.maleCount;
          globalConduct[rm.text].femaleCount += rm.femaleCount;
        }
      });

      (tel.facilitatorNotes || []).forEach(rm => {
        if (!globalFacilitatorNotes[rm.text]) globalFacilitatorNotes[rm.text] = { ...rm };
        else {
          globalFacilitatorNotes[rm.text].count += rm.count;
          globalFacilitatorNotes[rm.text].maleCount += rm.maleCount;
          globalFacilitatorNotes[rm.text].femaleCount += rm.femaleCount;
        }
      });

      Object.keys(tel.subjectRemarks || {}).forEach(sub => {
        if (!globalSubjectRemarks[sub]) globalSubjectRemarks[sub] = {};
        (tel.subjectRemarks[sub] || []).forEach(rm => {
          if (!globalSubjectRemarks[sub][rm.text]) globalSubjectRemarks[sub][rm.text] = { ...rm };
          else {
            globalSubjectRemarks[sub][rm.text].count += rm.count;
            globalSubjectRemarks[sub][rm.text].maleCount += rm.maleCount;
            globalSubjectRemarks[sub][rm.text].femaleCount += rm.femaleCount;
          }
        });
      });
    });

    return {
      conduct: Object.values(globalConduct).sort((a, b) => b.count - a.count),
      facilitator: Object.values(globalFacilitatorNotes).sort((a, b) => b.count - a.count),
      subject: Object.keys(globalSubjectRemarks).reduce((acc, sub) => ({
        ...acc, [sub]: Object.values(globalSubjectRemarks[sub]).sort((a, b) => b.count - a.count)
      }), {} as Record<string, RemarkMetric[]>)
    };
  }, [registry]);

  const winners = useMemo(() => {
    if (schoolRankings.length === 0) return null;
    return {
      grandChamp: schoolRankings[0],
      gradingChamp: [...schoolRankings].sort((a, b) => a.aggregateAvg - b.aggregateAvg)[0],
      objectiveChamp: [...schoolRankings].sort((a, b) => a.objectiveAvg - b.objectiveAvg)[0],
      theoryChamp: [...schoolRankings].sort((a, b) => a.theoryAvg - a.theoryAvg)[0]
    };
  }, [schoolRankings]);

  const filteredRegistry = registry.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedSchool = useMemo(() => 
    registry.find(r => r.id === selectedSchoolId), [registry, selectedSchoolId]);

  const toggleStatus = (id: string) => {
    const next: SchoolRegistryEntry[] = registry.map(r => 
      r.id === id ? { ...r, status: (r.status === 'active' ? 'audit' : 'active') as 'active' | 'suspended' | 'audit' } : r
    );
    setRegistry(next);
    localStorage.setItem('uba_global_registry', JSON.stringify(next));
  };

  const handleDelete = (id: string) => {
    if (window.confirm("CRITICAL: Decommission institution?")) {
      const next = registry.filter(r => r.id !== id);
      setRegistry(next);
      localStorage.setItem('uba_global_registry', JSON.stringify(next));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 animate-in fade-in duration-500 overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HQ Navigation */}
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Network Control Center</h1>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Academy Overseer Command (Super-Admin)</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
              <button onClick={() => setView('registry')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === 'registry' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Registry</button>
              <button onClick={() => setView('rankings')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === 'rankings' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Rerating</button>
              <button onClick={() => setView('audit')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Audit Logs</button>
              <button onClick={() => setView('remarks')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === 'remarks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Remark Analytics</button>
            </div>
            <button onClick={onExit} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-slate-700 transition-all">Exit HQ</button>
          </div>
        </header>

        {view === 'registry' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[
                { label: 'Institutions', val: stats.total, icon: '🏫', color: 'text-blue-400' },
                { label: 'Active Sessions', val: stats.active, icon: '🟢', color: 'text-green-400' },
                { label: 'Network Students', val: stats.totalStudents, icon: '👥', color: 'text-indigo-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-xl">{stat.icon}</span>
                  </div>
                  <p className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-black uppercase tracking-tight">Institutional Registry</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase">Manage network-wide institution deployments</p>
                </div>
                <div className="relative w-full md:w-96">
                  <input type="text" placeholder="Search registry..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-[0.3em]">
                    <tr>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5">Institution</th>
                      <th className="px-8 py-5">Enrollment ID</th>
                      <th className="px-8 py-5 text-center">Students</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredRegistry.map(school => (
                      <tr key={school.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-8 py-5">
                          <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase ${school.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{school.status}</span>
                        </td>
                        <td className="px-8 py-5 uppercase font-black">{school.name}</td>
                        <td className="px-8 py-5">
                           <button 
                             onClick={() => onRemoteView(school.id)}
                             className="font-mono text-blue-400 hover:text-blue-300 hover:underline transition-all text-left group"
                             title="Click to remote view institution dashboard"
                           >
                             {school.id}
                             <span className="ml-2 opacity-0 group-hover:opacity-100 text-[8px] font-black uppercase bg-blue-900 px-2 py-0.5 rounded">View Interface</span>
                           </button>
                        </td>
                        <td className="px-8 py-5 text-center font-black">{school.studentCount}</td>
                        <td className="px-8 py-5 text-right space-x-3">
                          <button onClick={() => { setSelectedSchoolId(school.id); setView('audit'); }} className="text-blue-400 text-[9px] font-black uppercase">Audit</button>
                          <button onClick={() => toggleStatus(school.id)} className="text-emerald-400 text-[9px] font-black uppercase">Verify</button>
                          <button onClick={() => handleDelete(school.id)} className="text-red-500 text-[9px] font-black uppercase">Erase</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'audit' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
             <div className="flex items-center gap-4">
               <select 
                 value={selectedSchoolId || ''} 
                 onChange={(e) => setSelectedSchoolId(e.target.value)}
                 className="bg-slate-900 text-white font-black py-4 px-6 rounded-2xl border border-slate-800 text-xs uppercase"
               >
                 <option value="">CHOOSE INSTITUTION FOR AUDIT...</option>
                 {registry.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
               </select>
               {selectedSchoolId && (
                 <button 
                   onClick={() => onRemoteView(selectedSchoolId)}
                   className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase"
                 >
                   Launch Interface View
                 </button>
               )}
             </div>

             {selectedSchool && (
               <div className="space-y-8">
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col md:flex-row justify-between gap-8">
                    <div className="space-y-4">
                       <h3 className="text-2xl font-black uppercase tracking-tight text-white">{selectedSchool.name} Audit Profile</h3>
                       <div className="flex flex-wrap gap-4">
                          <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
                             <span className="text-[8px] font-black text-slate-500 uppercase block">Registrant</span>
                             <span className="text-sm font-black text-blue-400 uppercase">{selectedSchool.registrant}</span>
                          </div>
                          <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
                             <span className="text-[8px] font-black text-slate-500 uppercase block">Institution ID</span>
                             <span className="text-sm font-black text-emerald-400 uppercase">{selectedSchool.id}</span>
                          </div>
                          <div className="bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
                             <span className="text-[8px] font-black text-slate-500 uppercase block">Last Sync Date</span>
                             <span className="text-sm font-black text-purple-400 uppercase">{new Date(selectedSchool.lastActivity).toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
                    <div className="bg-slate-950 px-8 py-5 border-b border-slate-800 flex justify-between items-center">
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Live Series Verification Log</h4>
                       <span className="text-[8px] font-black text-slate-600 uppercase">Audit Mode: Active</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                         <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-widest">
                            <tr>
                               <th className="px-8 py-5">Series Context</th>
                               <th className="px-8 py-5">Subject Submission Status</th>
                               <th className="px-8 py-5">Approved By</th>
                               <th className="px-8 py-5">Verification Data (Scripts Confirmed)</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-800">
                            {/* Fix: Explicitly cast Object.entries result to resolve 'map' on unknown 'logs' */}
                            {(Object.entries(selectedSchool.verificationLogs || {}) as [string, VerificationEntry[]][]).map(([series, logs]) => (
                               <React.Fragment key={series}>
                                  {logs.map((log, i) => (
                                     <tr key={series + i} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-8 py-5 font-black text-blue-400 uppercase">{series}</td>
                                        <td className="px-8 py-5">
                                           <div className="flex flex-col gap-1">
                                              <span className="font-black uppercase text-xs text-white">{log.subject}</span>
                                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase w-fit ${log.status === 'approved' ? 'bg-green-50/20 text-green-400' : 'bg-yellow-50/20 text-yellow-400'}`}>
                                                 {log.status}
                                              </span>
                                           </div>
                                        </td>
                                        <td className="px-8 py-5">
                                           <div className="flex flex-col">
                                              <span className="text-xs font-black uppercase text-slate-300">{log.verifiedBy}</span>
                                              <span className="text-[9px] text-slate-500">{log.date}</span>
                                           </div>
                                        </td>
                                        <td className="px-8 py-5">
                                           <div className="flex flex-col gap-2">
                                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Random Script Verification:</span>
                                              <div className="flex flex-wrap gap-2">
                                                 {/* Fix: confirmedScripts is correctly typed since logs is cast to VerificationEntry[] */}
                                                 {log.confirmedScripts.map((name, ni) => (
                                                    <span key={ni} className="bg-blue-600/10 border border-blue-500/30 text-blue-400 px-3 py-1 rounded-lg text-[9px] font-bold uppercase italic">
                                                       Confirmed: {name}
                                                    </span>
                                                 ))}
                                              </div>
                                           </div>
                                        </td>
                                     </tr>
                                  ))}
                               </React.Fragment>
                            ))}
                            {!selectedSchool.verificationLogs && (
                               <tr>
                                  <td colSpan={4} className="px-8 py-20 text-center text-slate-600 font-black uppercase tracking-widest">
                                     No verification logs exist for this institution. Institutional sync required.
                                  </td>
                               </tr>
                            )}
                         </tbody>
                      </table>
                    </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {view === 'rankings' && (
          <div className="space-y-12 animate-in slide-in-from-right-8 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
               {[
                 { label: 'Grand Champion', val: winners?.grandChamp?.name, icon: '🏆', color: 'text-yellow-500' },
                 { label: 'Grading Elite', val: winners?.gradingChamp?.name, icon: '🎓', color: 'text-blue-400' },
                 { label: 'Objective Master', val: winners?.objectiveChamp?.name, icon: '🎯', color: 'text-purple-400' },
                 { label: 'Theoretical Giant', val: winners?.theoryChamp?.name, icon: '🖋️', color: 'text-emerald-400' }
               ].map(w => (
                 <div key={w.label} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] text-center space-y-4">
                    <div className="text-4xl">{w.icon}</div>
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{w.label}</h4>
                    <p className={`text-lg font-black uppercase ${w.color}`}>{w.val || '---'}</p>
                 </div>
               ))}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
                  <tr>
                    <th className="px-8 py-6">Rank</th>
                    <th className="px-8 py-6">Institution</th>
                    <th className="px-8 py-6 text-center">NRT Strength Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {schoolRankings.map((rank, i) => (
                    <tr key={rank.id}>
                      <td className="px-8 py-5"><span className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 flex items-center justify-center font-black">{i + 1}</span></td>
                      <td className="px-8 py-5 font-black uppercase">{rank.name}</td>
                      <td className="px-8 py-5 text-center font-mono text-blue-400">{rank.overallIndex.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'remarks' && (
          <div className="space-y-12 animate-in slide-in-from-left-8 duration-700">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
                   <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <h3 className="text-xl font-black uppercase tracking-tight">Conduct Remark Lexicon</h3>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Global Occurrences</span>
                   </div>
                   <div className="space-y-6 overflow-y-auto max-h-[600px] pr-4 no-scrollbar">
                      {remarkAnalytics.conduct.map((rm, i) => (
                        <div key={i} className="space-y-3 bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-blue-500/50 transition-all group">
                           <div className="flex justify-between items-start gap-4">
                              <p className="text-[11px] font-black text-slate-200 uppercase leading-relaxed flex-1 italic">"{rm.text}"</p>
                              <div className="bg-blue-600 text-white px-3 py-1 rounded-xl text-[10px] font-black">{rm.count}x</div>
                           </div>
                           <div className="space-y-1.5">
                              <div className="flex justify-between text-[8px] font-black uppercase text-slate-500">
                                 <span>Gender Distribution</span>
                                 <span className="text-blue-400">♂ {rm.count > 0 ? Math.round((rm.maleCount/rm.count)*100) : 0}%</span>
                                 <span className="text-pink-400">♀ {rm.count > 0 ? Math.round((rm.femaleCount/rm.count)*100) : 0}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                                 <div className="h-full bg-blue-500" style={{ width: `${rm.count > 0 ? (rm.maleCount/rm.count)*100 : 0}%` }}></div>
                                 <div className="h-full bg-pink-500" style={{ width: `${rm.count > 0 ? (rm.femaleCount/rm.count)*100 : 0}%` }}></div>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 space-y-6">
                   <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <h3 className="text-xl font-black uppercase tracking-tight">Network Observations</h3>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Central Telemetry</span>
                   </div>
                   <div className="space-y-6 overflow-y-auto max-h-[600px] pr-4 no-scrollbar">
                      {remarkAnalytics.facilitator.map((rm, i) => (
                        <div key={i} className="space-y-3 bg-slate-950 p-6 rounded-3xl border border-slate-800 hover:border-emerald-500/50 transition-all">
                           <p className="text-[11px] font-bold text-slate-400 leading-relaxed italic">"{rm.text}"</p>
                           <div className="flex justify-between items-center">
                              <div className="flex gap-4">
                                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div><span className="text-[9px] font-black text-slate-600 uppercase">M: {rm.maleCount}</span></div>
                                 <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-pink-500 rounded-full"></div><span className="text-[9px] font-black text-slate-600 uppercase">F: {rm.femaleCount}</span></div>
                              </div>
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{rm.count} Total Logs</span>
                           </div>
                        </div>
                      ))}
                   </div>
                </section>
             </div>
          </div>
        )}

        <footer className="pt-12 border-t border-slate-900 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
           <p>SS-Map Central Hub — Registry HQ Interface v3.2</p>
           <p>Institutional Orchestration active — {new Date().getFullYear()}</p>
        </footer>
      </div>
    </div>
  );
};

export default SuperAdminPortal;

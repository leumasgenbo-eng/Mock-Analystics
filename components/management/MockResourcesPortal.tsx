import React, { useState, useMemo, useEffect } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping, StaffAssignment } from '../../types';

interface ResourceLog {
  timestamp: string;
  context: string;
  action: string;
  details: string;
}

interface MockResourcesPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
  onSave?: (overrides?: any) => void;
}

const MockResourcesPortal: React.FC<MockResourcesPortalProps> = ({ 
  settings, onSettingChange, subjects, facilitators, isFacilitator, activeFacilitator, onSave 
}) => {
  // STRICT LOGIC: If user is facilitator, force their linked subject.
  const getInitialSubject = () => {
    if (isFacilitator && activeFacilitator?.subject) {
      // Ensure the subject exists in the global subject list
      const matched = subjects.find(s => s.toLowerCase() === activeFacilitator.subject.toLowerCase());
      return matched || subjects[0];
    }
    return subjects[0];
  };

  const [selectedSubject, setSelectedSubject] = useState(getInitialSubject());
  const [isSyncing, setIsSyncing] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logs, setLogs] = useState<ResourceLog[]>([]);

  // Force re-lock subject if activeFacilitator context updates
  useEffect(() => {
    if (isFacilitator && activeFacilitator?.subject) {
      setSelectedSubject(getInitialSubject());
    }
  }, [isFacilitator, activeFacilitator?.subject]);

  const assignedSpecialist = useMemo(() => {
    return Object.values(facilitators).find(f => f.taughtSubject === selectedSubject) || null;
  }, [facilitators, selectedSubject]);

  const activeResource: MockResource = useMemo(() => {
    const portal = settings.resourcePortal || {};
    const mockShard = portal[settings.activeMock] || {};
    return mockShard[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '', status: 'DRAFT' };
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

  // Lock status: Disable inputs if verified or submitted (submitted facilitators can't edit unless admin reverts)
  const isLocked = activeResource.status === 'VERIFIED' || (isFacilitator && activeResource.status === 'SUBMITTED');

  // Aggregate stats for Admin View
  const submissionStats = useMemo(() => {
    const portal = settings.resourcePortal || {};
    const mockShard = portal[settings.activeMock] || {};
    const stats = subjects.map(sub => {
      const res = (mockShard[sub] || { status: 'DRAFT', indicators: [] }) as MockResource;
      const facilitator = Object.values(facilitators).find(f => f.taughtSubject === sub);
      return { subject: sub, status: res.status || 'DRAFT', facilitator: facilitator?.name || 'VACANT', date: res.submissionDate };
    });
    return stats;
  }, [settings.resourcePortal, settings.activeMock, subjects, facilitators]);

  const addLog = (action: string, details: string) => {
    const newLog: ResourceLog = {
      timestamp: new Date().toLocaleString(),
      context: `${settings.activeMock} / ${selectedSubject}`,
      action,
      details
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const updateResource = (updates: Partial<MockResource>) => {
    if (isLocked) return;
    setIsSyncing(true);
    const currentPortal = { ...(settings.resourcePortal || {}) };
    const mockData = { ...(currentPortal[settings.activeMock] || {}) };
    const subjectData = { ...(mockData[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '', status: 'DRAFT' }) };
    
    const nextResourcePortal = {
      ...currentPortal, 
      [settings.activeMock]: { 
        ...mockData, 
        [selectedSubject]: { ...subjectData, ...updates } 
      }
    };

    onSettingChange('resourcePortal', nextResourcePortal);
    
    if (onSave) {
      onSave({ settings: { ...settings, resourcePortal: nextResourcePortal } });
    }

    setTimeout(() => setIsSyncing(false), 500);
  };

  const handleStatusChange = (status: 'SUBMITTED' | 'VERIFIED' | 'DRAFT') => {
    const verb = status === 'SUBMITTED' ? 'Submit' : status === 'VERIFIED' ? 'Endorse' : 'Revert';
    if (window.confirm(`${verb.toUpperCase()} RESOURCE: Change ${selectedSubject} status to ${status}?`)) {
      updateResource({ 
        status, 
        submissionDate: status === 'SUBMITTED' ? new Date().toISOString() : activeResource.submissionDate 
      });
      addLog(`${status}_SHARD`, `${verb} action performed on subject shard.`);
    }
  };

  const handleAddRow = (section: 'A' | 'B') => {
    if (isLocked) return;
    const nextRef = activeResource.indicators.filter(i => i.section === section).length + 1;
    const newIndicator: QuestionIndicatorMapping = {
      id: `ind-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      section,
      questionRef: nextRef.toString(),
      strand: '',
      subStrand: '',
      indicatorCode: '',
      indicator: '',
      weight: 1
    };
    updateResource({ indicators: [...activeResource.indicators, newIndicator] });
    addLog(`ADD_ROW`, `Added Section ${section} placeholder row.`);
  };

  const handleDeleteRow = (id: string) => {
    if (isLocked) return;
    updateResource({ indicators: activeResource.indicators.filter(i => i.id !== id) });
    addLog(`DELETE_ROW`, `Removed indicator shard from ledger.`);
  };

  const updateIndicator = (id: string, field: keyof QuestionIndicatorMapping, value: any) => {
    if (isLocked) return;
    const nextIndicators = activeResource.indicators.map(ind => 
      ind.id === id ? { ...ind, [field]: value } : ind
    );
    updateResource({ indicators: nextIndicators });
  };

  const generateObjectives = () => {
    if (isLocked || !window.confirm("STRUCTURAL OVERRIDE: Generate standard 1-40 objective set?")) return;
    const newObjs: QuestionIndicatorMapping[] = Array.from({ length: 40 }, (_, i) => ({
      id: `obj-${Date.now()}-${i}`,
      section: 'A',
      questionRef: (i + 1).toString(),
      strand: '',
      subStrand: '',
      indicatorCode: '',
      indicator: '',
      weight: 1
    }));
    updateResource({ indicators: [...activeResource.indicators, ...newObjs] });
    addLog(`GENERATE_OBJ`, `Auto-built 40 objective items.`);
  };

  const generateTheory = () => {
    if (isLocked || !window.confirm("STRUCTURAL OVERRIDE: Generate Section B (Q1-Q5) parts?")) return;
    const nextBase = activeResource.indicators.filter(i => i.section === 'B').length;
    const newTheory: QuestionIndicatorMapping[] = Array.from({ length: 5 }, (_, i) => ({
      id: `thy-${Date.now()}-${i}`,
      section: 'B',
      questionRef: (nextBase + i + 1).toString(),
      strand: '',
      subStrand: '',
      indicatorCode: '',
      indicator: '',
      weight: 10
    }));
    updateResource({ indicators: [...activeResource.indicators, ...newTheory] });
    addLog(`GENERATE_THEORY`, `Auto-built Section B placeholders.`);
  };

  const clearIndicators = () => {
    if (isLocked || !window.confirm("CRITICAL PURGE: Clear all mapped indicators?")) return;
    updateResource({ indicators: [] });
    addLog(`CLEAR_ALL`, `Purged all indicator mappings.`);
  };

  const totalWeight = activeResource.indicators.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
  const objCount = activeResource.indicators.filter(i => i.section === 'A').length;
  const theoryCount = activeResource.indicators.filter(i => i.section === 'B').length;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-32 font-sans">
      
      {/* 1. ADMINISTRATIVE OVERVIEW (Visible only to Admins) */}
      {!isFacilitator && (
        <section className="bg-white border border-gray-100 rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="bg-slate-900 px-10 py-6 border-b border-white/5 flex justify-between items-center">
             <div className="space-y-1">
                <h3 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">Administrative Status Overview</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time Multi-Subject Submission Tracker</p>
             </div>
             <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black text-white uppercase">Verified</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div><span className="text-[8px] font-black text-white uppercase">Submitted</span></div>
                <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-700 rounded-full"></div><span className="text-[8px] font-black text-white uppercase">Draft</span></div>
             </div>
          </div>
          <div className="p-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
             {submissionStats.map(stat => (
               <button 
                key={stat.subject} 
                onClick={() => setSelectedSubject(stat.subject)}
                className={`p-5 rounded-[2rem] border-2 transition-all text-left flex flex-col justify-between h-32 ${selectedSubject === stat.subject ? 'bg-blue-50 border-blue-600 shadow-xl' : 'bg-slate-50 border-gray-100 hover:border-blue-200'}`}
               >
                 <div className="space-y-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block truncate">{stat.subject}</span>
                    <p className="text-[10px] font-black text-slate-900 uppercase truncate">{stat.facilitator}</p>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${stat.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : stat.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                      {stat.status}
                    </span>
                    {stat.status === 'SUBMITTED' && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>}
                 </div>
               </button>
             ))}
          </div>
        </section>
      )}

      {/* 2. MAIN HEADER: Focus Subject Identity */}
      <header className="bg-slate-950 text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        {isSyncing && <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[1px] flex items-center justify-center z-50"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}
        
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-3 text-center xl:text-left">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Subject Resource Terminal</h3>
              <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                <p className="text-4xl font-black uppercase tracking-tight leading-none">
                  {selectedSubject} <span className="text-blue-500 mx-1">/</span> <span className="text-slate-500">{settings.activeMock}</span>
                </p>
                <div className={`px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-2 border ${activeResource.status === 'VERIFIED' ? 'bg-emerald-600 border-emerald-400 text-white' : activeResource.status === 'SUBMITTED' ? 'bg-amber-500 border-amber-300 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  {activeResource.status === 'VERIFIED' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                  {activeResource.status || 'DRAFT'}
                </div>
              </div>
           </div>

           {/* Specialist Bio Shard */}
           <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md flex items-center gap-6 min-w-[320px]">
              <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center border-4 border-white/5 shadow-2xl relative">
                 <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 {activeResource.status === 'VERIFIED' && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>}
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Subject Faculty Lead</span>
                 <p className="text-base font-black uppercase text-white truncate max-w-[200px]">{assignedSpecialist?.name || 'UNASSIGNED NODE'}</p>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-[7px] font-mono text-blue-400 font-bold">{assignedSpecialist?.enrolledId || '---'}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[6px] font-black uppercase tracking-widest">Facultate Shard Active</span>
                 </div>
              </div>
           </div>
        </div>
      </header>

      {/* 3. DOCUMENT ATTACHMENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <h4 className="text-lg font-black text-slate-900 uppercase">Examination Paper (URL)</h4>
            </div>
            <div className="space-y-4">
               <input 
                 type="text" 
                 disabled={isLocked}
                 placeholder="Attach Cloud Link..." 
                 value={activeResource.questionUrl || ''} 
                 onChange={(e) => updateResource({ questionUrl: e.target.value })}
                 className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-mono font-bold text-blue-900 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-50"
               />
               <div className="grid grid-cols-2 gap-3">
                  <button className="bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase hover:bg-black transition-all disabled:opacity-50" disabled={isLocked}>Upload Paper</button>
                  {activeResource.questionUrl && (
                    <a href={activeResource.questionUrl} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[9px] uppercase border border-blue-100 hover:bg-blue-100 transition-all text-center">View Current Shard</a>
                  )}
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
               </div>
               <h4 className="text-lg font-black text-slate-900 uppercase">Official Marking Scheme</h4>
            </div>
            <div className="space-y-4">
               <input 
                 type="text" 
                 disabled={isLocked}
                 placeholder="Attach Scheme Link..." 
                 value={activeResource.schemeUrl || ''} 
                 onChange={(e) => updateResource({ schemeUrl: e.target.value })}
                 className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-mono font-bold text-emerald-900 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all disabled:opacity-50"
               />
               <div className="grid grid-cols-2 gap-3">
                  <button className="bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase hover:bg-black transition-all disabled:opacity-50" disabled={isLocked}>Upload Scheme</button>
                  {activeResource.schemeUrl && (
                    <a href={activeResource.schemeUrl} target="_blank" rel="noreferrer" className="bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-[9px] uppercase border border-emerald-100 hover:bg-emerald-100 transition-all text-center">View Current Shard</a>
                  )}
               </div>
            </div>
         </div>
      </div>

      {/* 4. CURRICULUM CONNECTORS */}
      <section className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
               <h4 className="text-xl font-black uppercase tracking-tight">Syllabus Mapping Framework</h4>
               <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Auto-build assessment blueprints</p>
            </div>
            <div className="flex flex-wrap gap-3">
               <button onClick={generateObjectives} disabled={isLocked} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">Auto-build Objectives (1-40)</button>
               <button onClick={generateTheory} disabled={isLocked} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">Add Section B Hubs (Q1-Q5)</button>
               <button onClick={clearIndicators} disabled={isLocked} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-red-500/20 transition-all disabled:opacity-50">Purge Framework</button>
            </div>
         </div>
      </section>

      {/* 5. MAPPING TABLE */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-8">
           <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black uppercase text-xs text-slate-900 tracking-widest">Question & Indicator Curriculum Connector</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mapping curriculum nodes to examination items</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => handleAddRow('A')} disabled={isLocked} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50">+ Add Item A</button>
              <button onClick={() => handleAddRow('B')} disabled={isLocked} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg disabled:opacity-50">+ Add Item B</button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 text-center w-16">Sec</th>
                <th className="px-4 py-5 w-20">Q# Ref</th>
                <th className="px-6 py-5">Strand Name</th>
                <th className="px-6 py-5">Sub-Strand / Topic</th>
                <th className="px-6 py-5">Indicator Code</th>
                <th className="px-6 py-5 min-w-[250px]">Instructional Indicator Description</th>
                <th className="px-4 py-5 text-center w-16">Wgt</th>
                <th className="px-6 py-5 text-right w-16">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeResource.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-50/50 transition-colors h-16 group">
                  <td className="px-8 py-2 text-center">
                    <select disabled={isLocked} value={ind.section} onChange={(e) => updateIndicator(ind.id, 'section', e.target.value)} className="bg-transparent font-black text-[9px] uppercase outline-none text-blue-900 disabled:opacity-50">
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input disabled={isLocked} value={ind.questionRef} onChange={(e) => updateIndicator(ind.id, 'questionRef', e.target.value)} className="w-full bg-transparent font-mono font-black text-xs text-slate-600 outline-none disabled:opacity-50" />
                  </td>
                  <td className="px-6 py-2">
                    <input disabled={isLocked} value={ind.strand} onChange={(e) => updateIndicator(ind.id, 'strand', e.target.value.toUpperCase())} className="w-full bg-transparent font-black text-[10px] text-slate-800 outline-none uppercase disabled:opacity-50" />
                  </td>
                  <td className="px-6 py-2">
                    <input disabled={isLocked} value={ind.subStrand} onChange={(e) => updateIndicator(ind.id, 'subStrand', e.target.value.toUpperCase())} className="w-full bg-transparent font-bold text-[10px] text-slate-400 outline-none uppercase disabled:opacity-50" />
                  </td>
                  <td className="px-6 py-2">
                    <input disabled={isLocked} value={ind.indicatorCode} onChange={(e) => updateIndicator(ind.id, 'indicatorCode', e.target.value.toUpperCase())} className="w-full bg-transparent font-mono text-[10px] text-indigo-600 font-black outline-none uppercase disabled:opacity-50" />
                  </td>
                  <td className="px-6 py-2">
                    <input disabled={isLocked} value={ind.indicator} onChange={(e) => updateIndicator(ind.id, 'indicator', e.target.value.toUpperCase())} className="w-full bg-transparent text-[10px] font-medium text-slate-600 outline-none uppercase disabled:opacity-50" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input disabled={isLocked} type="number" value={ind.weight} onChange={(e) => updateIndicator(ind.id, 'weight', parseInt(e.target.value) || 0)} className="w-10 bg-transparent font-mono font-black text-xs text-center outline-none disabled:opacity-50" />
                  </td>
                  <td className="px-6 py-2 text-right">
                    <button onClick={() => handleDeleteRow(ind.id)} disabled={isLocked} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:hidden">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                <tr>
                   <td colSpan={8} className="py-24 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest leading-relaxed">
                      No instructional indicators mapped for this subject shard.<br/>Use structural generators above to initiate framework.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. LOG LEDGER */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
         <div className="bg-slate-900 px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Resource Activity Ledger</h4>
            <div className="flex gap-4 w-full md:w-auto">
               <input 
                 type="text" 
                 placeholder="Filter ledger logs..." 
                 value={logSearch}
                 onChange={(e) => setLogSearch(e.target.value)}
                 className="bg-white/5 border border-white/10 rounded-xl px-6 py-2 text-[10px] font-bold text-white outline-none w-full md:w-64"
               />
               <button className="bg-white/5 text-white/60 px-6 py-2 rounded-xl text-[9px] font-black uppercase border border-white/10 hover:text-white transition-all">Export (.csv)</button>
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-950 text-slate-600 uppercase text-[7px] font-black tracking-widest">
                  <tr>
                     <th className="px-10 py-4 w-40">Timestamp</th>
                     <th className="px-6 py-4 w-48">Mock / Subject</th>
                     <th className="px-6 py-4 w-32">Action</th>
                     <th className="px-10 py-4">Details</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                  {logs.filter(l => l.details.toLowerCase().includes(logSearch.toLowerCase()) || l.action.toLowerCase().includes(logSearch.toLowerCase())).map((log, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                       <td className="px-10 py-4 text-[10px] font-mono text-slate-400">{log.timestamp}</td>
                       <td className="px-6 py-4 text-[9px] font-black text-blue-900 uppercase">{log.context}</td>
                       <td className="px-6 py-4">
                          <span className="bg-slate-100 px-3 py-1 rounded-lg text-[8px] font-black text-slate-600 uppercase">{log.action}</span>
                       </td>
                       <td className="px-10 py-4 text-[10px] font-medium text-slate-500 italic">"{log.details}"</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-12 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">Awaiting activity logs for current shard</td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* 7. DYNAMIC FOOTER BAR: Verification & Action Handshake */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-40 flex flex-col md:flex-row justify-between items-center md:px-12 gap-6 animate-in slide-in-from-bottom-10">
         <div className="flex gap-10">
            <div className="space-y-0.5">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Cohort Weight Mapped</span>
               <p className="text-sm font-black text-blue-900 font-mono">{totalWeight} points</p>
            </div>
            <div className="space-y-0.5 border-l border-gray-100 pl-10">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Blueprint Items</span>
               <p className="text-sm font-black text-indigo-900 font-mono">{objCount + theoryCount} Items</p>
            </div>
            <div className="space-y-0.5 border-l border-gray-100 pl-10">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Shard Status</span>
               <p className={`text-sm font-black uppercase ${activeResource.status === 'VERIFIED' ? 'text-emerald-600' : 'text-amber-600'}`}>{activeResource.status || 'DRAFT'}</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
            {/* Contextual Actions based on User Role & Shard Status */}
            {isFacilitator ? (
               activeResource.status !== 'VERIFIED' && (
                  <button 
                    disabled={activeResource.status === 'SUBMITTED'}
                    onClick={() => handleStatusChange('SUBMITTED')} 
                    className={`bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-emerald-700 ${activeResource.status === 'SUBMITTED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {activeResource.status === 'SUBMITTED' ? 'Awaiting Endorsement' : 'Finalize & Submit Hub'}
                  </button>
               )
            ) : (
               /* Admin Verification Actions */
               <div className="flex gap-3">
                  {(activeResource.status === 'SUBMITTED' || activeResource.status === 'DRAFT') && (
                     <button 
                       onClick={() => handleStatusChange('VERIFIED')} 
                       className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-emerald-700 flex items-center gap-2"
                     >
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                       Verify & Endorse
                     </button>
                  )}
                  {activeResource.status === 'VERIFIED' && (
                     <button 
                       onClick={() => handleStatusChange('DRAFT')} 
                       className="bg-red-50 text-red-600 border border-red-100 px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-red-100"
                     >
                       Revoke & Unlock
                     </button>
                  )}
                  {activeResource.status === 'SUBMITTED' && (
                     <button 
                       onClick={() => handleStatusChange('DRAFT')} 
                       className="bg-amber-50 text-amber-600 border border-amber-100 px-6 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all hover:bg-amber-100"
                     >
                       Return for Correction
                     </button>
                  )}
               </div>
            )}
            
            <button 
              onClick={() => onSave?.()} 
              disabled={isLocked}
              className="bg-blue-950 text-white px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black disabled:opacity-30"
            >
              Commit Shard
            </button>
         </div>
      </footer>
    </div>
  );
};

export default MockResourcesPortal;

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping, SerializedExam, StaffAssignment } from '../../types';
import { supabase } from '../../supabaseClient';

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
  // If user is facilitator, only show their subject
  const filteredSubjects = isFacilitator && activeFacilitator?.subject ? [activeFacilitator.subject] : subjects;
  const [selectedSubject, setSelectedSubject] = useState(filteredSubjects[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logs, setLogs] = useState<ResourceLog[]>([]);

  // Force subject change if activeFacilitator changes or filtering is applied
  useEffect(() => {
    if (isFacilitator && activeFacilitator?.subject) {
      setSelectedSubject(activeFacilitator.subject);
    }
  }, [isFacilitator, activeFacilitator]);

  const assignedSpecialist = useMemo(() => {
    return Object.values(facilitators).find(f => f.taughtSubject === selectedSubject) || null;
  }, [facilitators, selectedSubject]);

  const activeResource: MockResource = useMemo(() => {
    // Robust access to the resource portal shards
    const portal = settings.resourcePortal || {};
    const mockShard = portal[settings.activeMock] || {};
    return mockShard[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '', status: 'DRAFT' };
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

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

  const handleSubmitResource = () => {
    if (window.confirm(`SUBMIT FOR ENDORSEMENT: Mark ${selectedSubject} resources as complete for ${settings.activeMock}? This will notify the Academy Admin.`)) {
      updateResource({ 
        status: 'SUBMITTED', 
        submissionDate: new Date().toISOString() 
      });
      addLog('SUBMIT_HUB', 'Facilitator finalized resources for administrative review.');
    }
  };

  const handleAddRow = (section: 'A' | 'B') => {
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
    updateResource({ indicators: activeResource.indicators.filter(i => i.id !== id) });
    addLog(`DELETE_ROW`, `Removed indicator shard from ledger.`);
  };

  const updateIndicator = (id: string, field: keyof QuestionIndicatorMapping, value: any) => {
    const nextIndicators = activeResource.indicators.map(ind => 
      ind.id === id ? { ...ind, [field]: value } : ind
    );
    updateResource({ indicators: nextIndicators });
  };

  const generateObjectives = () => {
    if (!window.confirm("STRUCTURAL OVERRIDE: Generate standard 1-40 objective set?")) return;
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
    if (!window.confirm("STRUCTURAL OVERRIDE: Generate Section B (Q1-Q5) parts?")) return;
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
    if (!window.confirm("CRITICAL PURGE: Clear all mapped indicators?")) return;
    updateResource({ indicators: [] });
    addLog(`CLEAR_ALL`, `Purged all indicator mappings.`);
  };

  const totalWeight = activeResource.indicators.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
  const objCount = activeResource.indicators.filter(i => i.section === 'A').length;
  const theoryCount = activeResource.indicators.filter(i => i.section === 'B').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-32 font-sans">
      
      {/* User Requested Layout: Mock Resources Hub Title Area */}
      <header className="bg-slate-950 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        {isSyncing && <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-[1px] flex items-center justify-center z-50"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div></div>}
        
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-3 text-center xl:text-left">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Mock Resources Hub</h3>
              <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                <p className="text-3xl font-black uppercase tracking-tight leading-none">
                  {selectedSubject} <span className="text-blue-500 mx-2">/</span> {settings.activeMock}
                </p>
                <span className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest inline-block ${activeResource.status === 'SUBMITTED' ? 'bg-amber-500 text-white' : activeResource.status === 'VERIFIED' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'}`}>
                  {activeResource.status || 'DRAFT'}
                </span>
              </div>
           </div>

           {/* Assigned Facilitator Node */}
           <div className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-md flex items-center gap-5 min-w-[280px]">
              <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-400/20 shadow-inner shrink-0">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Assigned specialist lead</span>
                 <p className="text-sm font-black uppercase text-white truncate max-w-[200px]">{assignedSpecialist?.name || 'VACANT NODE'}</p>
                 <div className="flex items-center gap-2 mt-1">
                    <span className="text-[7px] font-mono text-blue-400 font-bold">{assignedSpecialist?.enrolledId || '---'}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[6px] font-black uppercase tracking-widest">Faculty Verified</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Global Subject Selector (Hidden for Facilitators) */}
        {!isFacilitator && (
          <div className="mt-8 flex justify-center xl:justify-start">
             <div className="flex flex-wrap bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full z-10">
                {subjects.map(s => (
                  <button key={s} onClick={() => setSelectedSubject(s)} className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
             </div>
          </div>
        )}
      </header>

      {/* Resource Management: Question Paper & Marking Scheme Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
               </div>
               <h4 className="text-lg font-black text-slate-900 uppercase">Question Paper</h4>
            </div>
            <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Attach URL..." 
                 value={activeResource.questionUrl || ''} 
                 onChange={(e) => updateResource({ questionUrl: e.target.value })}
                 className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-mono font-bold text-blue-900 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
               />
               <div className="grid grid-cols-2 gap-3">
                  <button className="bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase hover:bg-black transition-all">Upload Paper</button>
                  <button className="bg-blue-50 text-blue-600 py-3 rounded-xl font-black text-[9px] uppercase border border-blue-100 hover:bg-blue-100 transition-all">Download Paper</button>
               </div>
            </div>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
               </div>
               <h4 className="text-lg font-black text-slate-900 uppercase">Marking Scheme</h4>
            </div>
            <div className="space-y-4">
               <input 
                 type="text" 
                 placeholder="Attach URL..." 
                 value={activeResource.schemeUrl || ''} 
                 onChange={(e) => updateResource({ schemeUrl: e.target.value })}
                 className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-mono font-bold text-emerald-900 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all"
               />
               <div className="grid grid-cols-2 gap-3">
                  <button className="bg-slate-900 text-white py-3 rounded-xl font-black text-[9px] uppercase hover:bg-black transition-all">Upload Scheme/Key</button>
                  <button className="bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-[9px] uppercase border border-emerald-100 hover:bg-emerald-100 transition-all">Download Scheme</button>
               </div>
            </div>
         </div>
      </div>

      {/* Structural Generators */}
      <section className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
         <div className="relative space-y-8">
            <div className="flex items-center gap-4">
               <h4 className="text-xl font-black uppercase tracking-tight">Structural Generators</h4>
               <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Auto-build assessment frameworks</p>
            </div>
            <div className="flex flex-wrap gap-4">
               <button onClick={generateObjectives} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Generate Objective Set (1-40)</button>
               <button onClick={generateTheory} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Generate Section B (Q1-Q5 Parts)</button>
               <button onClick={clearIndicators} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase border border-red-500/20 transition-all active:scale-95">Clear All Indicators</button>
            </div>
         </div>
      </section>

      {/* Question & Indicator Curriculum Connector */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-8">
           <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black uppercase text-xs text-slate-900 tracking-widest">Question & Indicator Curriculum Connector</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shard Matrix mapping for {selectedSubject}</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => handleAddRow('A')} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg">+ Add Obj Row</button>
              <button onClick={() => handleAddRow('B')} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg">+ Add Theory Row</button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 text-center w-16">Sec</th>
                <th className="px-4 py-5 w-20">Q# Ref</th>
                <th className="px-6 py-5">Strand</th>
                <th className="px-6 py-5">Sub-Strand</th>
                <th className="px-6 py-5">Indicator Code</th>
                <th className="px-6 py-5 min-w-[250px]">Description / Topic</th>
                <th className="px-4 py-5 text-center w-16">Wgt</th>
                <th className="px-6 py-5 text-right w-16">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeResource.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-50/50 transition-colors h-16 group">
                  <td className="px-8 py-2 text-center">
                    <select value={ind.section} onChange={(e) => updateIndicator(ind.id, 'section', e.target.value)} className="bg-transparent font-black text-[9px] uppercase outline-none text-blue-900">
                      <option value="A">A</option>
                      <option value="B">B</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input value={ind.questionRef} onChange={(e) => updateIndicator(ind.id, 'questionRef', e.target.value)} className="w-full bg-transparent font-mono font-black text-xs text-slate-600 outline-none" placeholder="1" />
                  </td>
                  <td className="px-6 py-2">
                    <input value={ind.strand} onChange={(e) => updateIndicator(ind.id, 'strand', e.target.value.toUpperCase())} className="w-full bg-transparent font-black text-[10px] text-slate-800 outline-none uppercase" placeholder="Strand" />
                  </td>
                  <td className="px-6 py-2">
                    <input value={ind.subStrand} onChange={(e) => updateIndicator(ind.id, 'subStrand', e.target.value.toUpperCase())} className="w-full bg-transparent font-bold text-[10px] text-slate-400 outline-none uppercase" placeholder="Sub-Strand" />
                  </td>
                  <td className="px-6 py-2">
                    <input value={ind.indicatorCode} onChange={(e) => updateIndicator(ind.id, 'indicatorCode', e.target.value.toUpperCase())} className="w-full bg-transparent font-mono text-[10px] text-indigo-600 font-black outline-none uppercase" placeholder="Code..." />
                  </td>
                  <td className="px-6 py-2">
                    <input value={ind.indicator} onChange={(e) => updateIndicator(ind.id, 'indicator', e.target.value.toUpperCase())} className="w-full bg-transparent text-[10px] font-medium text-slate-600 outline-none uppercase" placeholder="Details..." />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="number" value={ind.weight} onChange={(e) => updateIndicator(ind.id, 'weight', parseInt(e.target.value) || 0)} className="w-10 bg-transparent font-mono font-black text-xs text-center outline-none" />
                  </td>
                  <td className="px-6 py-2 text-right">
                    <button onClick={() => handleDeleteRow(ind.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                <tr>
                   <td colSpan={8} className="py-20 text-center opacity-30 italic text-[10px] font-black uppercase tracking-widest">No indicators mapped for this series shard</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Activity Ledger */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
         <div className="bg-slate-900 px-10 py-6 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/5">
            <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Resource Activity Ledger</h4>
            <div className="flex gap-4 w-full md:w-auto">
               <input 
                 type="text" 
                 placeholder="Search logs..." 
                 value={logSearch}
                 onChange={(e) => setLogSearch(e.target.value)}
                 className="bg-white/5 border border-white/10 rounded-xl px-6 py-2 text-[10px] font-bold text-white outline-none w-full md:w-64"
               />
               <button className="bg-white/5 text-white/60 px-6 py-2 rounded-xl text-[9px] font-black uppercase border border-white/10 hover:text-white transition-all">CSV Export</button>
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
                       <td colSpan={4} className="py-12 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">No activity logs found for current selection</td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* Summary Footer Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-40 flex flex-col md:flex-row justify-between items-center md:px-12 gap-6 animate-in slide-in-from-bottom-10">
         <div className="flex gap-10">
            <div className="space-y-0.5">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Total weight mapped</span>
               <p className="text-sm font-black text-blue-900 font-mono">{totalWeight} points</p>
            </div>
            <div className="space-y-0.5 border-l border-gray-100 pl-10">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Objective items</span>
               <p className="text-sm font-black text-indigo-900 font-mono">{objCount} items</p>
            </div>
            <div className="space-y-0.5 border-l border-gray-100 pl-10">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Theory sub-items</span>
               <p className="text-sm font-black text-purple-900 font-mono">{theoryCount} items</p>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Quality Compliance: Verified & Secure</span>
            </div>
            {isFacilitator && (
              <button 
                onClick={handleSubmitResource} 
                className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-emerald-700"
              >
                Submit for Endorsement
              </button>
            )}
            <button 
              onClick={() => onSave?.()} 
              className="bg-blue-950 text-white px-10 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black"
            >
              Save Resource Changes
            </button>
         </div>
      </footer>
    </div>
  );
};

export default MockResourcesPortal;

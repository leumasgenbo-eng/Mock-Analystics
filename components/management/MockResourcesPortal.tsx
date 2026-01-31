
import React, { useState, useMemo } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping } from '../../types';

interface MockResourcesPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
}

const MockResourcesPortal: React.FC<MockResourcesPortalProps> = ({ settings, onSettingChange, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [logSearch, setLogSearch] = useState('');

  const activeResource: MockResource = useMemo(() => {
    return settings.resourcePortal?.[settings.activeMock]?.[selectedSubject] || {
      indicators: []
    };
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

  const updateResource = (updates: Partial<MockResource>) => {
    const currentPortal = settings.resourcePortal || {};
    const mockData = currentPortal[settings.activeMock] || {};
    const subjectData = mockData[selectedSubject] || { indicators: [] };

    onSettingChange('resourcePortal', {
      ...currentPortal,
      [settings.activeMock]: {
        ...mockData,
        [selectedSubject]: { ...subjectData, ...updates }
      }
    });
  };

  const handleAddRow = (section: 'A' | 'B') => {
    const newIndicator: QuestionIndicatorMapping = {
      id: Math.random().toString(36).substr(2, 9),
      section,
      questionRef: (activeResource.indicators.filter(i => i.section === section).length + 1).toString(),
      strand: '',
      subStrand: '',
      indicatorCode: '',
      indicator: '',
      weight: 1
    };
    updateResource({ indicators: [...activeResource.indicators, newIndicator] });
  };

  const handleUpdateIndicator = (id: string, field: keyof QuestionIndicatorMapping, value: any) => {
    const updated = activeResource.indicators.map(ind => 
      ind.id === id ? { ...ind, [field]: value } : ind
    );
    updateResource({ indicators: updated });
  };

  const handleDownloadSyllabusPack = () => {
    if (activeResource.indicators.length === 0) return alert("No curriculum indicators defined for this mock.");
    
    let content = `UNITED BAYLOR ACADEMY - SYLLABUS SHARD EXPORT\n`;
    content += `SUBJECT: ${selectedSubject}\n`;
    content += `SERIES: ${settings.activeMock}\n`;
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `================================================\n\n`;

    activeResource.indicators.forEach((ind) => {
      content += `[${ind.section}] Q#${ind.questionRef} | ${ind.indicatorCode}\n`;
      content += `STRAND: ${ind.strand}\n`;
      content += `SUB-STRAND: ${ind.subStrand}\n`;
      content += `DESCRIPTION: ${ind.indicator}\n`;
      content += `------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Syllabus_Shard_${selectedSubject.replace(/\s/g, '_')}_${settings.activeMock.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateObj = () => {
    if (!window.confirm("Generate a full set of 40 Objectives? This will append to current list.")) return;
    const newObjs: QuestionIndicatorMapping[] = Array.from({ length: 40 }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      section: 'A',
      questionRef: (i + 1).toString(),
      strand: 'NUMBER',
      subStrand: 'SENSE',
      indicatorCode: `B9.1.1.1.${i+1}`,
      indicator: 'Standard Objective Item',
      weight: 1
    }));
    updateResource({ indicators: [...activeResource.indicators, ...newObjs] });
  };

  const handleRemoveIndicator = (id: string) => {
    updateResource({ indicators: activeResource.indicators.filter(i => i.id !== id) });
  };

  const stats = useMemo(() => {
    const totalWeight = activeResource.indicators.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    const objCount = activeResource.indicators.filter(i => i.section === 'A').length;
    const theoryCount = activeResource.indicators.filter(i => i.section === 'B').length;
    return { totalWeight, objCount, theoryCount };
  }, [activeResource.indicators]);

  const handleDownload = (url?: string, filename: string = "Resource") => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Active Context Switcher */}
      <header className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative space-y-1">
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Institutional Resource Hub</h3>
          <p className="text-2xl font-black uppercase tracking-tight">
            {selectedSubject} <span className="text-blue-500 mx-2">/</span> {settings.activeMock}
          </p>
        </div>
        <div className="relative flex flex-wrap gap-3 z-10">
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            className="bg-white/10 border border-white/20 text-white font-black py-3 px-6 rounded-2xl text-xs outline-none focus:ring-4 focus:ring-blue-500/20 transition-all uppercase"
          >
            {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
          </select>
          <button 
             onClick={handleDownloadSyllabusPack}
             className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2"
          >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Download Syllabus Shards
          </button>
        </div>
      </header>

      {/* Attachment Portal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
             <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
             </div>
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Assessment Paper URL</h4>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Paste Question Paper URL..." 
              value={activeResource.questionUrl || ''}
              onChange={(e) => updateResource({ questionUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5" 
            />
            <button 
              onClick={() => handleDownload(activeResource.questionUrl)}
              disabled={!activeResource.questionUrl}
              className="w-full bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Document
            </button>
          </div>
        </section>

        <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
          <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
             <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
             </div>
             <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Marking Scheme URL</h4>
          </div>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Paste Marking Scheme URL..." 
              value={activeResource.schemeUrl || ''}
              onChange={(e) => updateResource({ schemeUrl: e.target.value })}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-500/5" 
            />
            <button 
              onClick={() => handleDownload(activeResource.schemeUrl)}
              disabled={!activeResource.schemeUrl}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Document
            </button>
          </div>
        </section>
      </div>

      {/* Curriculum Connector Table */}
      <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-2xl">
        <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="space-y-1">
              <h4 className="font-black uppercase text-[10px] text-slate-900 tracking-widest flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                Indicator Mapping Ledger
              </h4>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Populates the Scope & Coverage Tracker</p>
           </div>
           <div className="flex gap-3">
              <button onClick={handleGenerateObj} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-200 transition-all">+ Auto Obj Set</button>
              <button onClick={() => handleAddRow('A')} className="bg-blue-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg">+ Add Obj Row</button>
              <button onClick={() => handleAddRow('B')} className="bg-indigo-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg">+ Add Theory Row</button>
           </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-center">Sec</th>
                <th className="px-4 py-4 w-20">Q# Ref</th>
                <th className="px-6 py-4 min-w-[150px]">Strand</th>
                <th className="px-6 py-4 min-w-[150px]">Sub-Strand</th>
                <th className="px-6 py-4 min-w-[120px]">Code</th>
                <th className="px-6 py-4 min-w-[250px]">Topic Description</th>
                <th className="px-6 py-4 text-center">Wgt</th>
                <th className="px-6 py-4 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeResource.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ind.section === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>{ind.section}</span>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={ind.questionRef} onChange={(e) => handleUpdateIndicator(ind.id, 'questionRef', e.target.value)} className="w-full bg-transparent font-black border-b border-transparent focus:border-blue-300 outline-none uppercase" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="text" value={ind.strand} onChange={(e) => handleUpdateIndicator(ind.id, 'strand', e.target.value.toUpperCase())} placeholder="STRAND..." className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-[10px] font-bold" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="text" value={ind.subStrand} onChange={(e) => handleUpdateIndicator(ind.id, 'subStrand', e.target.value.toUpperCase())} placeholder="SUB-STRAND..." className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-[10px] font-bold" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="text" value={ind.indicatorCode} onChange={(e) => handleUpdateIndicator(ind.id, 'indicatorCode', e.target.value.toUpperCase())} placeholder="CODE..." className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none font-mono text-blue-600 font-bold" />
                  </td>
                  <td className="px-6 py-3">
                    <input type="text" value={ind.indicator} onChange={(e) => handleUpdateIndicator(ind.id, 'indicator', e.target.value.toUpperCase())} placeholder="TOPIC DETAIL..." className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none text-[10px]" />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <input type="number" value={ind.weight} onChange={(e) => handleUpdateIndicator(ind.id, 'weight', parseInt(e.target.value) || 0)} className="w-10 text-center bg-transparent font-black border-b border-transparent focus:border-blue-300 outline-none" />
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => handleRemoveIndicator(ind.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                 <tr>
                    <td colSpan={8} className="py-20 text-center opacity-30">
                       <p className="font-black text-[10px] uppercase tracking-widest">No curriculum connectors defined</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl bg-white border border-gray-200 rounded-[2.5rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex flex-wrap justify-between items-center gap-6 z-[60] no-print animate-in slide-in-from-bottom-10 duration-700">
         <div className="flex gap-10 px-6">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mapped Syllabus Items</span>
               <span className="text-xl font-black text-blue-900">{activeResource.indicators.length} Shards</span>
            </div>
            <div className="flex flex-col border-l border-gray-100 pl-10">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Mark Weight</span>
               <span className="text-xl font-black text-indigo-900">{stats.totalWeight} Pts</span>
            </div>
         </div>
         <button className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-2xl transition-all active:scale-95">Synchronize Resource Node</button>
      </footer>

    </div>
  );
};

export default MockResourcesPortal;

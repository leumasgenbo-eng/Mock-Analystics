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

  // Local derived state for the active resource
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
      <header className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Mock Resources Hub</h3>
          <p className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
            {selectedSubject} <span className="text-blue-200">/</span> {settings.activeMock}
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            className="flex-1 md:w-64 bg-gray-50 text-gray-900 font-bold py-3 px-4 rounded-xl border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          >
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </header>

      {/* Attachment Portal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
             <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             </div>
             <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Question Paper</h4>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Attach URL..." 
              value={activeResource.questionUrl || ''}
              onChange={(e) => updateResource({ questionUrl: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none" 
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-900 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Upload Paper</button>
              <button 
                onClick={() => handleDownload(activeResource.questionUrl, `Question_Paper_${selectedSubject}`)}
                disabled={!activeResource.questionUrl}
                className="flex-1 bg-white border-2 border-blue-900 text-blue-900 py-3 rounded-xl font-black text-[10px] uppercase shadow-md active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Paper
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-50 pb-3">
             <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
             </div>
             <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Marking Scheme</h4>
          </div>
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Attach URL..." 
              value={activeResource.schemeUrl || ''}
              onChange={(e) => updateResource({ schemeUrl: e.target.value })}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none" 
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-white text-green-900 border-2 border-green-900 py-3 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">Upload Scheme/Key</button>
              <button 
                onClick={() => handleDownload(activeResource.schemeUrl, `Marking_Scheme_${selectedSubject}`)}
                disabled={!activeResource.schemeUrl}
                className="flex-1 bg-green-900 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Download Scheme
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Structural Generators */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-xl flex flex-wrap gap-4 items-center justify-between">
         <div className="space-y-1">
            <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Structural Generators</h4>
            <p className="text-[11px] text-white/50">Auto-build assessment frameworks</p>
         </div>
         <div className="flex flex-wrap gap-3">
            <button onClick={handleGenerateObj} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">Generate Objective Set (1-40)</button>
            <button onClick={() => handleAddRow('B')} className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all">Generate Section B (Q1-Q5 Parts)</button>
            <button onClick={() => updateResource({ indicators: [] })} className="text-red-400 hover:text-red-300 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all">Clear All Indicators</button>
         </div>
      </div>

      {/* Curriculum Connector Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
           <h4 className="font-black uppercase text-[10px] text-gray-900 tracking-widest flex items-center gap-2">
             <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
             Question & Indicator Curriculum Connector
           </h4>
           <div className="flex gap-2">
              <button onClick={() => handleAddRow('A')} className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">+ Add Obj Row</button>
              <button onClick={() => handleAddRow('B')} className="bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">+ Add Theory Row</button>
           </div>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-100/30 text-gray-400 uppercase text-[8px] font-black tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-center">Sec</th>
                <th className="px-4 py-3">Q# Ref</th>
                <th className="px-4 py-3">Strand</th>
                <th className="px-4 py-3">Sub-Strand</th>
                <th className="px-4 py-3">Indicator Code</th>
                <th className="px-4 py-3">Description / Topic</th>
                <th className="px-4 py-3 text-center">Wgt</th>
                <th className="px-4 py-3 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeResource.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black ${ind.section === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>{ind.section}</span>
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={ind.questionRef} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'questionRef', e.target.value)}
                      className="w-12 bg-transparent font-black border-b border-transparent focus:border-blue-300 outline-none uppercase" 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={ind.strand} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'strand', e.target.value)}
                      placeholder="Strand"
                      className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none uppercase text-[10px]" 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={ind.subStrand} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'subStrand', e.target.value)}
                      placeholder="Sub-Strand"
                      className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none uppercase text-[10px]" 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={ind.indicatorCode} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'indicatorCode', e.target.value)}
                      placeholder="Code..."
                      className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none font-mono text-blue-500 font-bold uppercase" 
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={ind.indicator} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'indicator', e.target.value)}
                      placeholder="Details..."
                      className="w-full bg-transparent border-b border-transparent focus:border-blue-300 outline-none" 
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input 
                      type="number" 
                      value={ind.weight} 
                      onChange={(e) => handleUpdateIndicator(ind.id, 'weight', parseInt(e.target.value) || 0)}
                      className="w-10 text-center bg-transparent font-black border-b border-transparent focus:border-blue-300 outline-none" 
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => handleRemoveIndicator(ind.id)} className="text-red-300 hover:text-red-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                 <tr>
                    <td colSpan={8} className="py-20 text-center opacity-30">
                       <p className="font-black text-[10px] uppercase tracking-widest">No curriculum connectors defined for this mock session</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Activity Ledger */}
      <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
           <h4 className="font-black uppercase text-[10px] text-gray-900 tracking-widest">Resource Activity Ledger</h4>
           <div className="flex gap-2 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-[10px] outline-none" 
              />
              <button className="bg-gray-900 text-white px-4 py-1.5 rounded-lg text-[9px] font-black uppercase">CSV Export</button>
           </div>
        </div>
        <div className="p-0">
          <table className="w-full text-left text-[10px]">
            <thead className="bg-gray-100/30 text-gray-400 uppercase text-[8px] font-black tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Mock / Subject</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 italic text-gray-400">
               <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">No activity logs found for current selection</td>
               </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quality Compliance Footer */}
      <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl bg-white border border-gray-200 rounded-3xl p-4 shadow-2xl flex flex-wrap justify-between items-center gap-6 z-50">
         <div className="flex flex-wrap gap-8 px-4">
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total weight mapped</span>
               <span className="text-xl font-black text-blue-900">{stats.totalWeight} points</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Objective items</span>
               <span className="text-xl font-black text-gray-700">{stats.objCount} items</span>
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Theory sub-items</span>
               <span className="text-xl font-black text-gray-700">{stats.theoryCount} items</span>
            </div>
         </div>
         <div className="flex items-center gap-4 px-4">
            <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-[9px] font-black text-green-700 uppercase">Quality Compliance: Verified & Secure</span>
            </div>
            <button className="bg-blue-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl transition-all active:scale-95">Save Resource Changes</button>
         </div>
      </footer>

    </div>
  );
};

export default MockResourcesPortal;
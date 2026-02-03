
import React, { useState, useMemo } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping } from '../../types';

interface MockResourcesPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
}

const MockResourcesPortal: React.FC<MockResourcesPortalProps> = ({ settings, onSettingChange, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [editingIndicator, setEditingIndicator] = useState<QuestionIndicatorMapping | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteData, setPasteData] = useState('');

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
    setEditingIndicator(newIndicator);
  };

  const handleSaveIndicator = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndicator) return;

    const exists = activeResource.indicators.find(i => i.id === editingIndicator.id);
    const updated = exists 
      ? activeResource.indicators.map(i => i.id === editingIndicator.id ? editingIndicator : i)
      : [...activeResource.indicators, editingIndicator];

    updateResource({ indicators: updated });
    setEditingIndicator(null);
  };

  const handleProcessPaste = () => {
    if (!pasteData.trim()) return;
    const lines = pasteData.split('\n').filter(l => l.trim() !== '');
    const newIndicators: QuestionIndicatorMapping[] = lines.map(line => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      return {
        id: Math.random().toString(36).substr(2, 9),
        section: (cols[0]?.trim().toUpperCase() === 'B' ? 'B' : 'A') as 'A' | 'B',
        questionRef: cols[1]?.trim() || '',
        strand: cols[2]?.trim().toUpperCase() || '',
        subStrand: cols[3]?.trim().toUpperCase() || '',
        indicatorCode: cols[4]?.trim().toUpperCase() || '',
        indicator: cols[5]?.trim().toUpperCase() || '',
        weight: parseInt(cols[6]) || 1
      };
    });

    updateResource({ indicators: [...activeResource.indicators, ...newIndicators] });
    setPasteData('');
    setShowPasteModal(false);
    alert(`HUB SYNC: ${newIndicators.length} shards ingested from buffer.`);
  };

  const handleDownloadSyllabusPack = () => {
    if (activeResource.indicators.length === 0) return alert("No curriculum indicators defined.");
    let content = `UNITED BAYLOR ACADEMY - SYLLABUS SHARD EXPORT\nSUBJECT: ${selectedSubject}\nSERIES: ${settings.activeMock}\n================================================\n\n`;
    activeResource.indicators.forEach((ind) => {
      content += `[${ind.section}] Q#${ind.questionRef} | ${ind.indicatorCode}\nSTRAND: ${ind.strand}\nSUB-STRAND: ${ind.subStrand}\nDESCRIPTION: ${ind.indicator}\nWEIGHT: ${ind.weight}\n------------------------------------------------\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `Syllabus_Shard_${selectedSubject.replace(/\s/g, '_')}.txt`; link.click();
  };

  const handleRemoveIndicator = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Permanent decommissioning of this syllabus shard?")) {
      updateResource({ indicators: activeResource.indicators.filter(i => i.id !== id) });
    }
  };

  const stats = useMemo(() => {
    const totalWeight = activeResource.indicators.reduce((sum, i) => sum + (Number(i.weight) || 0), 0);
    return { totalWeight, count: activeResource.indicators.length };
  }, [activeResource.indicators]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* Active Context Switcher */}
      <header className="bg-slate-950 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-2 text-center xl:text-left">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Institutional Resource Hub</h3>
              <p className="text-3xl font-black uppercase tracking-tight leading-none">
                {selectedSubject} <span className="text-blue-500 mx-2">/</span> {settings.activeMock}
              </p>
           </div>
           <div className="flex flex-wrap bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full z-10">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
           </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-2xl">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-8">
           <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black uppercase text-xs text-slate-900 tracking-widest">Indicator Mapping Ledger</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Curriculum Node Deployment</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setShowPasteModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-black transition-all shadow-lg flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                 Paste Hub Matrix
              </button>
              <button onClick={() => handleAddRow('A')} className="bg-blue-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase shadow-lg">+ Add Row</button>
              <button onClick={handleDownloadSyllabusPack} className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase shadow-lg flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 Export Pack
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 text-center w-16">Sec</th>
                <th className="px-6 py-5 w-20">Q# Ref</th>
                <th className="px-6 py-5">Strand Shard</th>
                <th className="px-6 py-5">Sub-Strand Node</th>
                <th className="px-6 py-5">Code</th>
                <th className="px-6 py-5 min-w-[250px]">Instructional Indicator</th>
                <th className="px-6 py-5 text-center w-20">Weight</th>
                <th className="px-6 py-5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeResource.indicators.map((ind) => (
                <tr 
                  key={ind.id} 
                  onClick={() => setEditingIndicator(ind)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-8 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ind.section === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>{ind.section}</span>
                  </td>
                  <td className="px-6 py-4 font-mono font-black text-[10px] text-slate-400">#{ind.questionRef}</td>
                  <td className="px-6 py-4 font-black text-[10px] text-slate-900 uppercase">{ind.strand || '—'}</td>
                  <td className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase">{ind.subStrand || '—'}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-blue-600 font-black uppercase">{ind.indicatorCode || '—'}</td>
                  <td className="px-6 py-4 text-[10px] font-medium text-slate-600 uppercase leading-relaxed">{ind.indicator || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg font-mono font-black text-xs text-blue-950">{ind.weight}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => handleRemoveIndicator(ind.id, e)} className="text-slate-300 hover:text-red-600 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                 <tr>
                    <td colSpan={8} className="py-32 text-center opacity-30 flex flex-col items-center gap-6 border-2 border-dashed border-gray-100 m-10 rounded-[3rem]">
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20m10-10H2"/></svg>
                       <p className="font-black uppercase text-xs tracking-[0.5em]">Ledger Buffer Vacant</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-[2.5rem] px-10 py-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center gap-12 z-[60] no-print animate-in slide-in-from-bottom-10">
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Syllabus Load</span>
            <span className="text-2xl font-black text-blue-900 font-mono">{stats.count} Nodes</span>
         </div>
         <div className="w-px h-10 bg-gray-100"></div>
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Weight</span>
            <span className="text-2xl font-black text-indigo-900 font-mono">{stats.totalWeight} Pts</span>
         </div>
         <button onClick={() => alert("Matrix Handshake Complete.")} className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 tracking-widest">Sync Resource Node</button>
      </footer>

      {/* RE-SIZED PASTE MODAL */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-tight">Bulk Paste Hub Matrix</h4>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.4em]">Integrated Shard Population Node</p>
                 </div>
                 <button onClick={() => setShowPasteModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8 flex-1 flex flex-col overflow-y-auto no-scrollbar">
                 {/* Sub-Title 1: Instructions */}
                 <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                       <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parsing Protocol & Schema</h5>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
                       <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 font-black text-[10px]">INFO</div>
                       <p className="text-[9px] text-blue-900 font-bold leading-relaxed uppercase">
                          REQUIRED COLUMN ORDER: <br/>
                          <span className="text-blue-600 font-black">Sec [TAB] Q# [TAB] Strand [TAB] Sub-Strand [TAB] Code [TAB] Topic [TAB] Weight</span>
                       </p>
                    </div>
                 </div>

                 {/* Sub-Title 2: Input Area */}
                 <div className="space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                       <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Matrix Input Node</h5>
                    </div>
                    <textarea 
                       value={pasteData}
                       onChange={(e) => setPasteData(e.target.value)}
                       placeholder="PASTE DATA FROM SPREADSHEET HERE..."
                       className="flex-1 bg-slate-50 border-2 border-gray-100 rounded-[2rem] p-8 font-mono text-[10px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all uppercase placeholder:opacity-20 resize-none min-h-[250px]"
                    />
                 </div>
              </div>

              {/* Modal Footer: Action Buttons */}
              <div className="bg-gray-50 p-8 border-t border-gray-100 flex items-center justify-between gap-4 shrink-0">
                 <button 
                    onClick={() => setShowPasteModal(false)}
                    className="px-8 py-4 bg-white border border-gray-200 text-slate-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                 >
                    Exit Terminal
                 </button>
                 <button 
                    onClick={handleProcessPaste}
                    disabled={!pasteData.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.4em] shadow-xl active:scale-95 transition-all disabled:opacity-40"
                 >
                    Save Matrix to Registry
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* EDIT ROW MODAL */}
      {editingIndicator && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
           <form onSubmit={handleSaveIndicator} className="bg-white w-full max-w-3xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col">
              <div className="bg-blue-950 p-10 flex justify-between items-center text-white">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-widest">Active Shard Editor</h4>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.4em]">Modulating Curriculum Node Particulars</p>
                 </div>
                 <button type="button" onClick={() => setEditingIndicator(null)} className="text-white/40 hover:text-white">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>
              
              <div className="p-12 space-y-8">
                 <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Section</label>
                       <select 
                         value={editingIndicator.section} 
                         onChange={e => setEditingIndicator({...editingIndicator, section: e.target.value as any})}
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5"
                       >
                          <option value="A">OBJECTIVE (A)</option>
                          <option value="B">THEORY (B)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Q# Reference</label>
                       <input 
                         type="text" 
                         value={editingIndicator.questionRef} 
                         onChange={e => setEditingIndicator({...editingIndicator, questionRef: e.target.value})}
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Score Weight</label>
                       <input 
                         type="number" 
                         value={editingIndicator.weight} 
                         onChange={e => setEditingIndicator({...editingIndicator, weight: parseInt(e.target.value)||0})}
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Strand Name</label>
                       <input 
                         type="text" 
                         value={editingIndicator.strand} 
                         onChange={e => setEditingIndicator({...editingIndicator, strand: e.target.value.toUpperCase()})}
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Sub-Strand</label>
                       <input 
                         type="text" 
                         value={editingIndicator.subStrand} 
                         onChange={e => setEditingIndicator({...editingIndicator, subStrand: e.target.value.toUpperCase()})}
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none"
                       />
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Indicator Code</label>
                    <input 
                      type="text" 
                      value={editingIndicator.indicatorCode} 
                      onChange={e => setEditingIndicator({...editingIndicator, indicatorCode: e.target.value.toUpperCase()})}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-mono font-black text-blue-600 outline-none uppercase"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Topic Description</label>
                    <textarea 
                      value={editingIndicator.indicator} 
                      onChange={e => setEditingIndicator({...editingIndicator, indicator: e.target.value.toUpperCase()})}
                      rows={3}
                      className="w-full bg-slate-50 border border-gray-100 rounded-2xl p-6 text-xs font-bold text-slate-700 outline-none resize-none uppercase"
                    />
                 </div>

                 <button 
                   type="submit"
                   className="w-full bg-blue-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all"
                 >Save Matrix Row</button>
              </div>
           </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default MockResourcesPortal;


import React, { useState, useMemo, useRef } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping } from '../../types';
import { supabase } from '../../supabaseClient';

interface MockResourcesPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
}

const MockResourcesPortal: React.FC<MockResourcesPortalProps> = ({ settings, onSettingChange, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [editingIndicator, setEditingIndicator] = useState<QuestionIndicatorMapping | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState<Partial<QuestionIndicatorMapping>[]>([]);
  const [rawPasteInput, setRawPasteInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'scheme' | 'question' | null>(null);

  const activeResource: MockResource = useMemo(() => {
    return settings.resourcePortal?.[settings.activeMock]?.[selectedSubject] || {
      indicators: [],
      questionUrl: '',
      schemeUrl: ''
    };
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

  const updateResource = (updates: Partial<MockResource>) => {
    const currentPortal = settings.resourcePortal || {};
    const mockData = currentPortal[settings.activeMock] || {};
    const subjectData = mockData[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '' };

    onSettingChange('resourcePortal', {
      ...currentPortal,
      [settings.activeMock]: {
        ...mockData,
        [selectedSubject]: { ...subjectData, ...updates }
      }
    });
  };

  const getNextQRef = (section: 'A' | 'B') => {
    const existing = activeResource.indicators
      .filter(i => i.section === section)
      .map(i => parseInt(i.questionRef))
      .filter(n => !isNaN(n));
    return existing.length > 0 ? (Math.max(...existing) + 1).toString() : "1";
  };

  const handleAddRow = (section: 'A' | 'B') => {
    const newIndicator: QuestionIndicatorMapping = {
      id: Math.random().toString(36).substr(2, 9),
      section,
      questionRef: getNextQRef(section),
      strand: '',
      subStrand: '',
      indicatorCode: '',
      indicator: '',
      weight: 1
    };
    setEditingIndicator(newIndicator);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadType) return;
    
    // Simulate cloud upload - in a production env, this would use Supabase Storage
    const fakeUrl = `https://storage.uba-hub.app/${settings.schoolNumber}/${selectedSubject.replace(/\s/g, '_')}/${file.name}`;
    updateResource({ [uploadType === 'scheme' ? 'schemeUrl' : 'questionUrl']: fakeUrl });
    alert(`${uploadType.toUpperCase()} UPLOADED: Link attached to subject node.`);
    setUploadType(null);
  };

  const parsePasteData = (text: string) => {
    setRawPasteInput(text);
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const parsed = lines.map(line => {
      const cols = line.includes('\t') ? line.split('\t') : line.split(',');
      return {
        id: Math.random().toString(36).substr(2, 9),
        section: (cols[0]?.trim().toUpperCase() === 'B' ? 'B' : 'A') as 'A' | 'B',
        questionRef: '', // Will be auto-filled on ingest
        strand: cols[1]?.trim().toUpperCase() || '',
        subStrand: cols[2]?.trim().toUpperCase() || '',
        indicatorCode: cols[3]?.trim().toUpperCase() || '',
        indicator: cols[4]?.trim().toUpperCase() || '',
        weight: parseInt(cols[5]) || 1
      };
    });
    setPasteBuffer(parsed);
  };

  const handleCommitPaste = () => {
    let nextA = parseInt(getNextQRef('A'));
    let nextB = parseInt(getNextQRef('B'));

    const finalized = pasteBuffer.map(p => {
      const ref = p.section === 'A' ? nextA++ : nextB++;
      return { ...p, questionRef: ref.toString() } as QuestionIndicatorMapping;
    });

    updateResource({ indicators: [...activeResource.indicators, ...finalized] });
    setPasteBuffer([]);
    setRawPasteInput('');
    setShowPasteModal(false);
    alert(`HUB SYNC: ${finalized.length} shards ingested with automated sequencing.`);
  };

  const handleDownloadSyllabusPack = () => {
    if (activeResource.indicators.length === 0) return alert("No curriculum indicators defined.");
    let content = `${settings.schoolName} - SYLLABUS SHARD EXPORT\n`;
    content += `SUBJECT: ${selectedSubject} | SERIES: ${settings.activeMock}\n`;
    content += `QUESTION NODE: ${activeResource.questionUrl || 'PENDING'}\n`;
    content += `MARKING SCHEME: ${activeResource.schemeUrl || 'PENDING'}\n`;
    content += `================================================\n\n`;
    activeResource.indicators.forEach((ind) => {
      content += `[${ind.section}] Q#${ind.questionRef} | ${ind.indicatorCode}\nSTRAND: ${ind.strand}\nSUB-STRAND: ${ind.subStrand}\nDESCRIPTION: ${ind.indicator}\nWEIGHT: ${ind.weight}\n------------------------------------------------\n\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `UBA_Resources_${selectedSubject.replace(/\s/g, '_')}.txt`; link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Header Context & Global Particulars */}
      <header className="bg-slate-950 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
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

      {/* 2. File Ingestion Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-xl flex items-center justify-between group hover:border-blue-400 transition-all">
            <div className="space-y-1">
               <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Question Paper Hub</span>
               <p className="text-xs font-black text-slate-900 uppercase">{activeResource.questionUrl ? 'ATTACHED: DOWNLOAD READY' : 'NO FILE UPLOADED'}</p>
            </div>
            <div className="flex gap-2">
               {activeResource.questionUrl && (
                  <a href={activeResource.questionUrl} download className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </a>
               )}
               <button onClick={() => { setUploadType('question'); fileInputRef.current?.click(); }} className="px-5 py-3 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">Upload Paper</button>
            </div>
         </div>
         <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-xl flex items-center justify-between group hover:border-emerald-400 transition-all">
            <div className="space-y-1">
               <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Marking Scheme Hub</span>
               <p className="text-xs font-black text-slate-900 uppercase">{activeResource.schemeUrl ? 'ATTACHED: DOWNLOAD READY' : 'NO FILE UPLOADED'}</p>
            </div>
            <div className="flex gap-2">
               {activeResource.schemeUrl && (
                  <a href={activeResource.schemeUrl} download className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </a>
               )}
               <button onClick={() => { setUploadType('scheme'); fileInputRef.current?.click(); }} className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">Upload Scheme</button>
            </div>
         </div>
         <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
      </div>

      {/* 3. Main Indicator Ledger */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 overflow-hidden shadow-2xl">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-8">
           <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black uppercase text-xs text-slate-900 tracking-widest">Indicator Mapping Ledger</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Mock curriculum Nodes</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setShowPasteModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                 Paste Hub Matrix
              </button>
              <button onClick={() => handleAddRow('A')} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase shadow-lg">+ Manual Row</button>
              <button onClick={handleDownloadSyllabusPack} className="bg-white border border-gray-200 text-slate-400 px-6 py-3 rounded-xl text-[9px] font-black uppercase shadow-sm flex items-center gap-2 hover:bg-gray-50">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 Download Ledger
              </button>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 text-center w-16">Sec</th>
                <th className="px-6 py-5 w-20">Q#</th>
                <th className="px-6 py-5">Strand</th>
                <th className="px-6 py-5">Sub-Strand</th>
                <th className="px-6 py-5">Code</th>
                <th className="px-6 py-5 min-w-[250px]">Topic Description</th>
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
                  <td className="px-6 py-4 font-mono font-black text-[10px] text-blue-900">Q{ind.questionRef}</td>
                  <td className="px-6 py-4 font-black text-[10px] text-slate-900 uppercase">{ind.strand || '—'}</td>
                  <td className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase">{ind.subStrand || '—'}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-indigo-600 font-black uppercase">{ind.indicatorCode || '—'}</td>
                  <td className="px-6 py-4 text-[10px] font-medium text-slate-600 uppercase leading-relaxed">{ind.indicator || '—'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-100 px-3 py-1 rounded-lg font-mono font-black text-xs text-slate-900">{ind.weight}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Purge Node?")) updateResource({ indicators: activeResource.indicators.filter(x => x.id !== ind.id)}); }} className="text-slate-200 hover:text-red-600 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {activeResource.indicators.length === 0 && (
                 <tr>
                    <td colSpan={8} className="py-32 text-center opacity-30 flex flex-col items-center gap-6">
                       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20m10-10H2"/></svg>
                       <p className="font-black uppercase text-xs tracking-[0.5em]">Ledger Buffer Vacant</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PASTE HUB TERMINAL - RE-STYLED FOR INDIVIDUAL BOXES */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-xl z-[300] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500">
           <div className="bg-white w-full max-w-7xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-slate-900 p-10 flex justify-between items-center text-white shrink-0 border-b border-white/5">
                 <div className="space-y-1">
                    <h4 className="text-3xl font-black uppercase tracking-tight">Bulk Ingestion terminal</h4>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.6em]">Integrated Shard Population Node</p>
                 </div>
                 <button onClick={() => setShowPasteModal(false)} className="text-slate-500 hover:text-white transition-colors">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12 no-scrollbar">
                 {/* Input Logic */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-3 px-4">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                       <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Matrix Input Node</h5>
                    </div>
                    <textarea 
                       value={rawPasteInput}
                       onChange={(e) => parsePasteData(e.target.value)}
                       placeholder="PASTE SPREADSHEET DATA HERE... (Sec [TAB] Strand [TAB] Sub-Strand [TAB] Code [TAB] Topic [TAB] Weight)"
                       className="w-full bg-slate-50 border-2 border-gray-100 rounded-[2.5rem] p-10 font-mono text-[11px] font-bold outline-none focus:border-blue-500 focus:bg-white transition-all uppercase placeholder:opacity-20 min-h-[150px]"
                    />
                 </div>

                 {/* Mapping Verification Area - Individual Boxes */}
                 {pasteBuffer.length > 0 && (
                   <div className="space-y-6 animate-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between px-4">
                         <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Ingestion Shards Preview (Individual Editing)</h5>
                         </div>
                         <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-4 py-1 rounded-full border border-indigo-100">{pasteBuffer.length} SHARDS DETECTED</span>
                      </div>
                      
                      <div className="space-y-3">
                         {pasteBuffer.map((p, i) => (
                           <div key={i} className="grid grid-cols-6 gap-3 bg-slate-50 p-4 rounded-3xl border border-gray-100 group hover:border-blue-300 hover:bg-white transition-all">
                              <div className="flex flex-col gap-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Section</label>
                                 <select value={p.section} onChange={e => { const next = [...pasteBuffer]; next[i].section = e.target.value as any; setPasteBuffer(next); }} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/20">
                                    <option value="A">OBJ (A)</option>
                                    <option value="B">THY (B)</option>
                                 </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Strand</label>
                                 <input type="text" value={p.strand} onChange={e => { const next = [...pasteBuffer]; next[i].strand = e.target.value.toUpperCase(); setPasteBuffer(next); }} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Sub-Strand</label>
                                 <input type="text" value={p.subStrand} onChange={e => { const next = [...pasteBuffer]; next[i].subStrand = e.target.value.toUpperCase(); setPasteBuffer(next); }} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black uppercase outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Code</label>
                                 <input type="text" value={p.indicatorCode} onChange={e => { const next = [...pasteBuffer]; next[i].indicatorCode = e.target.value.toUpperCase(); setPasteBuffer(next); }} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-mono font-black text-indigo-600 outline-none" />
                              </div>
                              <div className="flex flex-col gap-1 col-span-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Topic</label>
                                 <input type="text" value={p.indicator} onChange={e => { const next = [...pasteBuffer]; next[i].indicator = e.target.value.toUpperCase(); setPasteBuffer(next); }} className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black text-slate-700 outline-none" />
                              </div>
                              <div className="flex flex-col gap-1">
                                 <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Weight</label>
                                 <div className="flex gap-2">
                                    <input type="number" value={p.weight} onChange={e => { const next = [...pasteBuffer]; next[i].weight = parseInt(e.target.value)||0; setPasteBuffer(next); }} className="flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-black text-slate-900 outline-none" />
                                    <button onClick={() => setPasteBuffer(prev => prev.filter((_, idx) => idx !== i))} className="p-2 text-slate-200 hover:text-red-600 transition-colors">
                                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                    </button>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="bg-gray-50 p-10 border-t border-gray-100 flex items-center justify-between gap-6 shrink-0">
                 <button onClick={() => setShowPasteModal(false)} className="px-12 py-6 bg-white border border-gray-200 text-slate-400 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-md">Exit Terminal</button>
                 <button 
                   onClick={handleCommitPaste}
                   disabled={pasteBuffer.length === 0}
                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all disabled:opacity-40"
                 >Save Matrix to Hub Registry</button>
              </div>
           </div>
        </div>
      )}

      {/* Manual Indicator Modal */}
      {editingIndicator && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[400] flex items-center justify-center p-4 animate-in zoom-in-95 duration-300">
           <form 
              onSubmit={(e) => { e.preventDefault(); const exists = activeResource.indicators.find(i => i.id === editingIndicator.id); updateResource({ indicators: exists ? activeResource.indicators.map(i => i.id === editingIndicator.id ? editingIndicator : i) : [...activeResource.indicators, editingIndicator] }); setEditingIndicator(null); }} 
              className="bg-white w-full max-w-2xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col"
           >
              <div className="bg-blue-950 p-10 text-white flex justify-between items-center">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-widest">Active Shard Editor</h4>
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Modulating Curriculum Particulars</p>
                 </div>
                 <button type="button" onClick={() => setEditingIndicator(null)} className="text-white/40 hover:text-white transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>
              <div className="p-12 space-y-8">
                 <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Section</label>
                       <select value={editingIndicator.section} onChange={e => setEditingIndicator({...editingIndicator, section: e.target.value as any})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">
                          <option value="A">OBJECTIVE (A)</option>
                          <option value="B">THEORY (B)</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Q# Reference</label>
                       <input type="text" value={editingIndicator.questionRef} onChange={e => setEditingIndicator({...editingIndicator, questionRef: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Score Weight</label>
                       <input type="number" value={editingIndicator.weight} onChange={e => setEditingIndicator({...editingIndicator, weight: parseInt(e.target.value)||0})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/5" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <input type="text" placeholder="STRAND NAME" value={editingIndicator.strand} onChange={e => setEditingIndicator({...editingIndicator, strand: e.target.value.toUpperCase()})} className="bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none" />
                    <input type="text" placeholder="SUB-STRAND" value={editingIndicator.subStrand} onChange={e => setEditingIndicator({...editingIndicator, subStrand: e.target.value.toUpperCase()})} className="bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none" />
                 </div>
                 <input type="text" placeholder="INDICATOR CODE (e.g. B9.1.1.1)" value={editingIndicator.indicatorCode} onChange={e => setEditingIndicator({...editingIndicator, indicatorCode: e.target.value.toUpperCase()})} className="bg-slate-50 border border-gray-100 rounded-2xl px-6 py-4 text-xs font-mono font-black text-blue-600 outline-none" />
                 <textarea placeholder="TOPIC DESCRIPTION..." value={editingIndicator.indicator} onChange={e => setEditingIndicator({...editingIndicator, indicator: e.target.value.toUpperCase()})} className="bg-slate-50 border border-gray-100 rounded-3xl p-6 text-xs font-bold text-slate-600 min-h-[100px] outline-none" />
                 <button type="submit" className="w-full bg-blue-900 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl active:scale-95 transition-all">Save Matrix Row</button>
              </div>
           </form>
        </div>
      )}

      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md border border-gray-200 rounded-[2.5rem] px-10 py-5 shadow-2xl flex items-center gap-12 z-[60] no-print animate-in slide-in-from-bottom-10">
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Syllabus Load</span>
            <span className="text-2xl font-black text-blue-950 font-mono">{activeResource.indicators.length} Nodes</span>
         </div>
         <div className="w-px h-10 bg-gray-100"></div>
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Marking Depth</span>
            <span className="text-2xl font-black text-indigo-900 font-mono">{activeResource.indicators.reduce((a,b)=>a+(b.weight||0),0)} Pts</span>
         </div>
         <button onClick={() => alert("Global Matrix Synchronized.")} className="bg-slate-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 tracking-widest">Sync Resource Node</button>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default MockResourcesPortal;

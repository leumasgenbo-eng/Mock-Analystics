
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { MasterQuestion, BloomsScale } from '../../types';

const QuestionRegistryView: React.FC = () => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState({
    subject: 'ALL',
    type: 'ALL',
    strand: 'ALL',
    subStrand: 'ALL',
    indicator: 'ALL',
    weight: 'ALL',
    search: ''
  });

  const fetchGlobalSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('uba_persistence').select('*').like('id', 'likely_%');
      if (error) throw error;
      if (data) {
        const flatList: MasterQuestion[] = [];
        data.forEach(row => {
          if (Array.isArray(row.payload)) {
            flatList.push(...row.payload);
          }
        });
        setQuestions(flatList);
      }
    } catch (err) {
      console.error("Registry Retrieval Fault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGlobalSubmissions(); }, []);

  // Filter Categories
  const categories = useMemo(() => ({
    subjects: ['ALL', ...Array.from(new Set(questions.map(q => q.subject))).sort()],
    strands: ['ALL', ...Array.from(new Set(questions.map(q => q.strand))).sort()],
    subStrands: ['ALL', ...Array.from(new Set(questions.map(q => q.subStrand))).sort()],
    indicators: ['ALL', ...Array.from(new Set(questions.map(q => q.indicatorCode || 'N/A'))).sort()],
    weights: ['ALL', ...Array.from(new Set(questions.map(q => q.weight.toString()))).sort()]
  }), [questions]);

  const filtered = useMemo(() => {
    return questions.filter(q => {
      return (filters.subject === 'ALL' || q.subject === filters.subject) &&
             (filters.type === 'ALL' || q.type === filters.type) &&
             (filters.strand === 'ALL' || q.strand === filters.strand) &&
             (filters.subStrand === 'ALL' || q.subStrand === filters.subStrand) &&
             (filters.indicator === 'ALL' || q.indicatorCode === filters.indicator) &&
             (filters.weight === 'ALL' || q.weight.toString() === filters.weight) &&
             (q.questionText.toLowerCase().includes(filters.search.toLowerCase()) || 
              q.id.toLowerCase().includes(filters.search.toLowerCase()));
    });
  }, [questions, filters]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelection(next);
  };

  const handleDeleteShard = async (id: string, facilitatorName: string, subject: string) => {
    if (!window.confirm("CRITICAL: Permanent decommissioning of this instructional shard? This cannot be undone.")) return;
    setIsProcessing(true);
    try {
      const storageKey = `likely_${subject.replace(/\s+/g, '')}_${facilitatorName.replace(/\s+/g, '')}`;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', storageKey).maybeSingle();
      if (data?.payload) {
        const nextPayload = (data.payload as MasterQuestion[]).filter(q => q.id !== id);
        await supabase.from('uba_persistence').upsert({ id: storageKey, payload: nextPayload, last_updated: new Date().toISOString() });
        setQuestions(prev => prev.filter(q => q.id !== id));
        alert("SHARD DECOMMISSIONED.");
      }
    } catch (e) {
      alert("Handshake Failure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveEdit = async (updatedQ: MasterQuestion) => {
    setIsProcessing(true);
    try {
      const storageKey = `likely_${updatedQ.subject.replace(/\s+/g, '')}_${updatedQ.facilitatorName?.replace(/\s+/g, '')}`;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', storageKey).maybeSingle();
      if (data?.payload) {
        const nextPayload = (data.payload as MasterQuestion[]).map(q => q.id === updatedQ.id ? updatedQ : q);
        await supabase.from('uba_persistence').upsert({ id: storageKey, payload: nextPayload, last_updated: new Date().toISOString() });
        setQuestions(prev => prev.map(q => q.id === updatedQ.id ? updatedQ : q));
        setEditingId(null);
        alert("SHARD MODIFIED.");
      }
    } catch (e) {
      alert("Persistence Interrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSelected = () => {
    const items = questions.filter(q => selection.has(q.id));
    if (items.length === 0) return alert("Selection basket is vacant.");
    
    let content = `UNITED BAYLOR ACADEMY - ADMINISTRATIVE MATRIX EXPORT\n`;
    content += `EXPORT DATE: ${new Date().toLocaleString()}\n`;
    content += `TOTAL SHARDS: ${items.length}\n`;
    content += `==========================================\n\n`;

    items.forEach((q, i) => {
      content += `[${i + 1}] ID: ${q.id} | TYPE: ${q.type} | WEIGHT: ${q.weight}\n`;
      content += `SUBJECT: ${q.subject} | STRAND: ${q.strandCode || 'N/A'}\n`;
      content += `CONTENT: ${q.questionText}\n`;
      content += `RUBRIC/KEY: ${q.correctKey}\n`;
      content += `TELEMETRY: Usage: ${q.usageCount || 0} | Friction (Wrong Ans): ${q.wrongCount || 0}\n`;
      content += `------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `UBA_Master_Matrix_${Date.now()}.txt`; a.click();
    alert("MATRIX EXPORTED.");
  };

  if (isLoading) return (
    <div className="h-full flex flex-col items-center justify-center p-20 gap-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-400">Mapping Global Matrix v9.5...</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col xl:flex-row bg-slate-950 font-sans min-h-[700px] overflow-hidden">
      
      {/* Sidebar: Advanced Matrix Filters */}
      <aside className="w-full xl:w-80 bg-slate-900 border-r border-slate-800 p-8 flex flex-col gap-8 shrink-0 overflow-y-auto no-scrollbar">
         <div className="space-y-1">
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest leading-none">Matrix Navigator</h3>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Shard Filter Logic</p>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Text Filter</label>
               <input type="text" value={filters.search} onChange={e=>setFilters({...filters, search: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/30" placeholder="KEYWORD/ID..." />
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Academic Discipline</label>
               <select value={filters.subject} onChange={e=>setFilters({...filters, subject: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none">
                  {categories.subjects.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Modality</label>
               <select value={filters.type} onChange={e=>setFilters({...filters, type: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none">
                  <option value="ALL">ALL TYPES</option>
                  <option value="OBJECTIVE">OBJECTIVE (SEC A)</option>
                  <option value="THEORY">THEORY (SEC B)</option>
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Strand Shard</label>
               <select value={filters.strand} onChange={e=>setFilters({...filters, strand: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none">
                  {categories.strands.map(s => <option key={s} value={s}>{s}</option>)}
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Indicator Code</label>
               <select value={filters.indicator} onChange={e=>setFilters({...filters, indicator: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none">
                  {categories.indicators.map(i => <option key={i} value={i}>{i}</option>)}
               </select>
            </div>

            <div className="space-y-2">
               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Shard Weight</label>
               <select value={filters.weight} onChange={e=>setFilters({...filters, weight: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none">
                  {categories.weights.map(w => <option key={w} value={w}>{w} Pts</option>)}
               </select>
            </div>
         </div>

         <div className="mt-auto space-y-4 pt-8 border-t border-slate-800">
            <button 
              onClick={handleDownloadSelected}
              disabled={selection.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg disabled:opacity-30 transition-all"
            >
               Export Selection ({selection.size})
            </button>
            <button 
              onClick={() => { setFilters({ subject:'ALL', type:'ALL', strand:'ALL', subStrand:'ALL', indicator:'ALL', weight:'ALL', search:'' }); setSelection(new Set()); }} 
              className="w-full border border-slate-800 text-slate-500 hover:text-white py-3 rounded-2xl text-[9px] font-black uppercase transition-all"
            >
              Reset Shards
            </button>
         </div>
      </aside>

      {/* Main Container: Matrix Registry */}
      <main className="flex-1 flex flex-col min-w-0 relative">
         <div className="p-8 border-b border-slate-800 bg-slate-900/40 flex justify-between items-center">
            <div className="space-y-1">
               <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
                  Instructional Matrix Registry
               </h2>
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{filtered.length} Shards Filtered from Global Buffer</p>
            </div>
            {isProcessing && <div className="text-[9px] font-black text-amber-500 animate-pulse uppercase">Network Handshake in Progress...</div>}
         </div>

         <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar space-y-6">
            {filtered.length > 0 ? filtered.map((q) => (
              <div key={q.id} className={`bg-slate-900/50 border rounded-[2.5rem] overflow-hidden transition-all group ${selection.has(q.id) ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800 hover:border-slate-700'}`}>
                 <div className="p-8 flex flex-col md:flex-row gap-10">
                    {/* Select Node */}
                    <div className="shrink-0 pt-2">
                       <button onClick={() => handleToggleSelect(q.id)} className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all ${selection.has(q.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-800 text-transparent'}`}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                       </button>
                    </div>

                    {/* Shard Intel */}
                    <div className="flex-1 space-y-6">
                       <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{q.type}</span>
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">{q.subject}</span>
                          <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">ID: {q.id}</span>
                       </div>

                       {editingId === q.id ? (
                         <div className="space-y-6 animate-in slide-in-from-top-2">
                            <textarea 
                              defaultValue={q.questionText} 
                              onBlur={e => q.questionText = e.target.value.toUpperCase()}
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 text-sm font-black text-white focus:ring-4 focus:ring-blue-500/10 outline-none uppercase"
                            />
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-600 uppercase">Rubric/Key</label>
                                  <input defaultValue={q.correctKey} onBlur={e=>q.correctKey = e.target.value.toUpperCase()} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-emerald-400" />
                               </div>
                               <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-600 uppercase">Weight</label>
                                  <input type="number" defaultValue={q.weight} onBlur={e=>q.weight = parseInt(e.target.value)||0} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs font-black text-blue-400" />
                               </div>
                            </div>
                            <div className="flex gap-4">
                               <button onClick={() => handleSaveEdit(q)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Commit Edit</button>
                               <button onClick={() => setEditingId(null)} className="bg-slate-800 text-slate-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:text-white transition-all">Cancel</button>
                            </div>
                         </div>
                       ) : (
                         <div className="space-y-4">
                            <p className="text-lg font-black text-slate-200 uppercase leading-relaxed group-hover:text-white transition-colors">"{q.questionText}"</p>
                            <div className="flex flex-wrap gap-8 text-[9px] font-black uppercase text-slate-500 tracking-widest border-t border-slate-800/50 pt-4">
                               <div className="flex items-center gap-2"><span className="text-slate-600">Indicator:</span><span className="text-blue-400">{q.indicatorCode}</span></div>
                               <div className="flex items-center gap-2"><span className="text-slate-600">Strand:</span><span className="text-indigo-400">{q.strand}</span></div>
                               <div className="flex items-center gap-2"><span className="text-slate-600">Bloom:</span><span className="text-emerald-400">{q.blooms}</span></div>
                               <div className="flex items-center gap-2"><span className="text-slate-600">Submitter:</span><span className="text-slate-300">{q.facilitatorName}</span></div>
                            </div>
                         </div>
                       )}
                    </div>

                    {/* Telemetry Node */}
                    <div className="xl:w-48 space-y-4">
                       <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-inner">
                          <div className="flex justify-between items-center">
                             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Usage Freq</span>
                             <span className="text-xs font-black text-blue-400">{q.usageCount || 0}x</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Friction index</span>
                             <span className="text-xs font-black text-red-500">{q.wrongCount || 0}</span>
                          </div>
                          <div className="pt-2 border-t border-slate-900 flex justify-between items-center">
                             <span className="text-[7px] font-black text-slate-600 uppercase">Matrix Code</span>
                             <code className="text-[10px] font-mono font-black text-emerald-400">{q.correctKey}</code>
                          </div>
                       </div>
                       
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingId(q.id)} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={() => handleDeleteShard(q.id, q.facilitatorName || '', q.subject)} className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white flex items-center justify-center transition-all">
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center py-40 opacity-20 text-center gap-6">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 <p className="font-black uppercase text-sm tracking-[0.5em] text-white">No shards matching current matrix constraints</p>
              </div>
            )}
         </div>

         {/* Footer Statistics */}
         <footer className="p-8 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex gap-12">
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Network Friction Mean</span>
                  <p className="text-xl font-black text-white">
                     {(questions.reduce((a,b)=>a+(b.wrongCount||0),0) / (questions.length||1)).toFixed(2)}
                  </p>
               </div>
               <div className="space-y-1 border-l border-slate-800 pl-12">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Instructional Coverage</span>
                  <p className="text-xl font-black text-blue-400">{Array.from(new Set(questions.map(q=>q.subject))).length} Subjects</p>
               </div>
            </div>
            <p className="text-[9px] font-black text-slate-800 uppercase tracking-[1em] italic">SS-Map Unified Master Registry</p>
         </footer>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default QuestionRegistryView;

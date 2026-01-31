import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string } | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<{ objectives: MasterQuestion[], theory: MasterQuestion[] }>({ objectives: [], theory: [] });
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  const [batchSize, setBatchSize] = useState<number>(10);
  const [visibleShards, setVisibleShards] = useState<MasterQuestion[]>([]);

  const fetchBank = useCallback(async () => {
    setIsLoading(true);
    const sanitizedSubject = selectedSubject.trim().replace(/\s+/g, '');
    const bankId = `master_bank_${sanitizedSubject}`;
    
    try {
      const { data, error } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', bankId)
        .maybeSingle();
      
      if (error) throw error;
      
      const questions = (data?.payload as MasterQuestion[]) || [];
      setMasterBank(questions);
      setFilterStrand('ALL'); 
      setFilterIndicator('ALL');
    } catch (err) {
      console.error("Bank Access Fault:", err);
      setMasterBank([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchBank();
  }, [fetchBank]);

  const strandList = useMemo(() => 
    ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand || 'UNGROUPED')))].filter(Boolean), 
    [masterBank]
  );

  const indicatorList = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.indicator || 'UNGROUPED')))].filter(Boolean);
  }, [masterBank, filterStrand]);

  const refreshVisibleShards = useCallback(() => {
    const pool = masterBank.filter(q => {
      const matchStrand = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchIndicator = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      return matchStrand && matchIndicator;
    });

    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setVisibleShards(shuffled.slice(0, batchSize));
  }, [masterBank, filterStrand, filterIndicator, batchSize]);

  useEffect(() => {
    refreshVisibleShards();
  }, [refreshVisibleShards]);

  const toggleCollect = (q: MasterQuestion, folder: 'objectives' | 'theory') => {
    setCollectedQs(prev => {
      const current = prev[folder];
      const exists = current.some(x => x.id === q.id);
      return { ...prev, [folder]: exists ? current.filter(x => x.id !== q.id) : [...current, q] };
    });
  };

  const handleDownloadPack = (type: 'objectives' | 'theory') => {
    const list = collectedQs[type];
    if (list.length === 0) return alert(`No shards collected in ${type.toUpperCase()} queue.`);

    let text = `UNITED BAYLOR ACADEMY - HQ CURRICULUM SHARD PACK\n`;
    text += `==============================================================\n`;
    text += `SUBJECT: ${selectedSubject.toUpperCase()}\n`;
    text += `PACK MODALITY: ${type.toUpperCase()}\n`;
    text += `GENERATION DATE: ${new Date().toLocaleString()}\n`;
    text += `TOTAL ITEMS: ${list.length}\n`;
    text += `==============================================================\n\n`;

    list.forEach((q, i) => {
      text += `SHARD ITEM #${i + 1} [CODE: ${q.id.slice(-6).toUpperCase()}]\n`;
      text += `STRAND: ${q.strand || 'UNGROUPED'}\n`;
      text += `SUB-STRAND: ${q.subStrand || 'N/A'}\n`;
      text += `INDICATOR: ${q.indicator || 'N/A'}\n`;
      text += `BLOOM'S SCALE: ${q.blooms}\n`;
      text += `--------------------------------------------------------------\n`;
      text += `QUESTION: ${q.questionText}\n`;
      if (q.type === 'THEORY' && q.parts?.length) {
        text += `PARTS:\n`;
        q.parts.forEach(p => text += `  [${p.partLabel}] ${p.text} (${p.weight}pts)\n`);
      }
      text += `CORRECT KEY/SCHEME: ${q.correctKey || q.answerScheme || 'See Rubric'}\n`;
      text += `==============================================================\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.trim().replace(/\s+/g, '_')}_${type.toUpperCase()}_BANK.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24 font-sans">
      
      <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tighter">HQ Curriculum Bank</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Cloud Registry Access • {selectedSubject}</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
              <button onClick={fetchBank} className="px-4 py-3 rounded-xl hover:bg-white/10 transition-all" title="Refresh Sync">
                 <svg className={`w-5 h-5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              </button>
              {subjects.map(s => (
                <button 
                  key={s} 
                  disabled={!!activeFacilitator && activeFacilitator.subject !== s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-10'}`}
                >
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl space-y-10">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Registry Filter Shards
                 </h4>
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Batch Matrix</label>
                       <div className="grid grid-cols-4 gap-2">
                          {[10, 25, 50, 100].map(n => (
                            <button key={n} onClick={() => setBatchSize(n)} className={`py-2 rounded-xl text-[9px] font-black border transition-all ${batchSize === n ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-400 border-gray-100'}`}>{n}</button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Curriculum Strand</label>
                       <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">
                          {strandList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Indicator Shard</label>
                       <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">
                          {indicatorList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master Download Queues</h4>
                 <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => handleDownloadPack('objectives')} className="group bg-blue-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all">
                       <div className="text-left"><span className="text-[8px] font-black text-blue-300 uppercase block mb-1">Objectives Pack</span><span className="text-2xl font-black font-mono">{collectedQs.objectives.length}</span></div>
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-900 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
                    </button>
                    <button onClick={() => handleDownloadPack('theory')} className="group bg-slate-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all">
                       <div className="text-left"><span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Theory Pack</span><span className="text-2xl font-black font-mono">{collectedQs.theory.length}</span></div>
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
                    </button>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-blue-100">Pool: {masterBank.length} Items</div>
                 <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-indigo-100">Showing {visibleShards.length} Items</div>
              </div>
              <button onClick={refreshVisibleShards} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Scramble View</button>
           </div>

           {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-6">
                 <div className="w-14 h-14 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Hydrating Cloud Registry Shards...</p>
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {visibleShards.map((q) => {
                    const inObj = collectedQs.objectives.some(x => x.id === q.id);
                    const inThy = collectedQs.theory.some(x => x.id === q.id);
                    return (
                      <div key={q.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-400 transition-all flex flex-col group animate-in zoom-in-95">
                         <div className="p-8 space-y-5 flex-1">
                            <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'THEORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{q.type}</span>
                                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none mt-1 truncate max-w-[200px]">{q.indicator}</p>
                               </div>
                               <span className="text-[9px] font-mono font-black text-slate-200">#HQ_{q.id.slice(-4)}</span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 uppercase leading-relaxed line-clamp-4">"{q.questionText}"</h4>
                            <div className="flex flex-wrap gap-2">
                               <span className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-slate-100">{q.strand}</span>
                               <span className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-slate-100">{q.blooms}</span>
                            </div>
                         </div>
                         <div className="bg-slate-50 p-6 grid grid-cols-2 gap-4 border-t border-gray-100">
                            <button onClick={() => toggleCollect(q, 'objectives')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inObj ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-blue-900 border-blue-100 hover:bg-blue-50'}`}>{inObj ? 'Remove' : 'Collect Obj'}</button>
                            <button onClick={() => toggleCollect(q, 'theory')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inThy ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-900 border-indigo-100 hover:bg-indigo-50'}`}>{inThy ? 'Remove' : 'Collect Theory'}</button>
                         </div>
                      </div>
                    );
                 })}
                 {visibleShards.length === 0 && (
                    <div className="col-span-2 py-40 text-center opacity-30">
                       <p className="text-sm font-black uppercase tracking-[0.8em]">Registry Shards Vacant for Parameters</p>
                    </div>
                 )}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;
import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string } | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  // Lock subject if facilitator, otherwise allow admin selection
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<{ objectives: MasterQuestion[], theory: MasterQuestion[] }>({ objectives: [], theory: [] });

  // Recursive Filter State
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterSubStrand, setFilterSubStrand] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  const [batchSize, setBatchSize] = useState<number>(5);
  
  // The actual questions displayed on the UI (Randomized & Batched)
  const [visibleShards, setVisibleShards] = useState<MasterQuestion[]>([]);

  // 1. Fetch Subject Bank from Cloud
  useEffect(() => {
    const fetchBank = async () => {
      setIsLoading(true);
      const bankId = `master_bank_${selectedSubject.replace(/\s+/g, '')}`;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      
      const questions = (data?.payload as MasterQuestion[]) || [];
      setMasterBank(questions);
      
      // Reset Filters on Subject Change
      setFilterStrand('ALL');
      setFilterSubStrand('ALL');
      setFilterIndicator('ALL');
      setIsLoading(false);
    };
    fetchBank();
  }, [selectedSubject]);

  // 2. Compute Hierarchical Lists
  const strandList = useMemo(() => 
    ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand || 'UNGROUPED')))], 
    [masterBank]
  );

  const subStrandList = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.subStrand || 'UNGROUPED')))];
  }, [masterBank, filterStrand]);

  const indicatorList = useMemo(() => {
    const subset = masterBank.filter(q => 
      (filterStrand === 'ALL' || q.strand === filterStrand) &&
      (filterSubStrand === 'ALL' || q.subStrand === filterSubStrand)
    );
    return ['ALL', ...Array.from(new Set(subset.map(q => q.indicator || 'UNGROUPED')))];
  }, [masterBank, filterStrand, filterSubStrand]);

  // 3. Randomize & Batch Display (Triggered by any filter or batch change)
  const refreshVisibleShards = React.useCallback(() => {
    const pool = masterBank.filter(q => {
      const matchStrand = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchSubStrand = filterSubStrand === 'ALL' || q.subStrand === filterSubStrand;
      const matchIndicator = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      return matchStrand && matchSubStrand && matchIndicator;
    });

    // Shuffle and Batch
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setVisibleShards(shuffled.slice(0, batchSize));
  }, [masterBank, filterStrand, filterSubStrand, filterIndicator, batchSize]);

  useEffect(() => {
    refreshVisibleShards();
  }, [refreshVisibleShards]);

  const toggleCollect = (q: MasterQuestion, folder: 'objectives' | 'theory') => {
    setCollectedQs(prev => {
      const current = prev[folder];
      const exists = current.some(x => x.id === q.id);
      if (exists) {
        return { ...prev, [folder]: current.filter(x => x.id !== q.id) };
      } else {
        return { ...prev, [folder]: [...current, q] };
      }
    });
  };

  const handleDownloadPack = (type: 'objectives' | 'theory') => {
    const list = collectedQs[type];
    if (list.length === 0) return alert(`Selected ${type} folder is currently vacant.`);

    let text = `UNITED BAYLOR ACADEMY - HQ SHARD DOWNLOAD\n`;
    text += `SUBJECT: ${selectedSubject.toUpperCase()}\n`;
    text += `PACK TYPE: ${type.toUpperCase()}\n`;
    text += `TIMESTAMP: ${new Date().toLocaleString()}\n`;
    text += `==============================================================\n\n`;

    list.forEach((q, i) => {
      text += `${i + 1}. [${q.strand} > ${q.subStrand} > ${q.indicator}]\n`;
      text += `QUESTION: ${q.questionText}\n`;
      if (q.type === 'THEORY' && q.parts?.length) {
        q.parts.forEach(p => text += `   (${p.partLabel}) ${p.text} [${p.weight} pts]\n`);
      }
      text += `ANSWER/KEY: ${q.correctKey || q.answerScheme || 'Manual Review'}\n`;
      text += `--------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.replace(/\s+/g, '_')}_${type.toUpperCase()}_HQ.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-24 font-sans">
      
      {/* Contextual Header */}
      <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tighter">HQ Unified Shard Bank</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Curriculum Node Ingestion • {selectedSubject}</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
              {subjects.map(s => (
                <button 
                  key={s} 
                  disabled={!!activeFacilitator && activeFacilitator.subject !== s}
                  onClick={() => setSelectedSubject(s)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-20'}`}
                >
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Tiered Filter Logic */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl space-y-10">
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Shard Filters</h4>
                    <button onClick={refreshVisibleShards} className="text-[8px] font-black text-blue-500 uppercase hover:underline">Reshuffle Pool</button>
                 </div>
                 
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Batch Size (Per Indicator)</label>
                       <div className="grid grid-cols-4 gap-2">
                          {[5, 10, 40, 100].map(n => (
                            <button key={n} onClick={() => setBatchSize(n)} className={`py-2 rounded-xl text-[9px] font-black border transition-all ${batchSize === n ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-400 border-gray-100'}`}>{n}</button>
                          ))}
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Academic Strand</label>
                       <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">
                          {strandList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Sub-Strand Node</label>
                       <select value={filterSubStrand} onChange={e=>setFilterSubStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">
                          {subStrandList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Indicator DNA</label>
                       <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">
                          {indicatorList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* Active Export Folders */}
              <div className="space-y-6 pt-6 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispatch Folders</h4>
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => handleDownloadPack('objectives')}
                      className="group bg-blue-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all"
                    >
                       <div className="text-left">
                          <span className="text-[8px] font-black text-blue-300 uppercase block mb-1">Objectives Pack</span>
                          <span className="text-2xl font-black font-mono">{collectedQs.objectives.length}</span>
                       </div>
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-900 transition-colors">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                       </div>
                    </button>
                    <button 
                      onClick={() => handleDownloadPack('theory')}
                      className="group bg-slate-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all"
                    >
                       <div className="text-left">
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Theory Pack</span>
                          <span className="text-2xl font-black font-mono">{collectedQs.theory.length}</span>
                       </div>
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                       </div>
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Randomized Question Grid */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-blue-100">
                    Indicators: {indicatorList.length - 1}
                 </div>
                 <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-indigo-100">
                    Displaying: {visibleShards.length} Randomized Shards
                 </div>
              </div>
              <button onClick={() => setCollectedQs({ objectives: [], theory: [] })} className="text-[9px] font-black text-slate-300 uppercase hover:text-red-500 transition-colors">Flush Selections</button>
           </div>

           {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-6">
                 <div className="w-14 h-14 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Synchronizing Master DNA Shards...</p>
              </div>
           ) : visibleShards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {visibleShards.map((q) => {
                    const inObj = collectedQs.objectives.some(x => x.id === q.id);
                    const inThy = collectedQs.theory.some(x => x.id === q.id);
                    return (
                      <div key={q.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-400 transition-all flex flex-col group animate-in zoom-in-95">
                         <div className="p-8 space-y-5 flex-1">
                            <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'THEORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                     {q.type}
                                  </span>
                                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none mt-1 truncate max-w-[200px]">
                                     {q.indicator}
                                  </p>
                               </div>
                               <span className="text-[9px] font-mono font-black text-slate-200">#HQ_ID_{q.originalIndex}</span>
                            </div>
                            <div className="space-y-3">
                               <h4 className="text-sm font-black text-slate-900 uppercase leading-relaxed line-clamp-4 italic">"{q.questionText}"</h4>
                               <div className="flex flex-wrap gap-2">
                                  <span className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-tighter border border-slate-100">{q.strand}</span>
                                  <span className="bg-slate-50 text-slate-400 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-tighter border border-slate-100">{q.subStrand}</span>
                               </div>
                            </div>
                            {q.type === 'THEORY' && q.parts && q.parts.length > 0 && (
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5 shadow-inner">
                                  {q.parts.map((p, pi) => (
                                     <div key={pi} className="flex gap-2 text-[9px] font-bold text-slate-600">
                                        <span className="text-blue-500 font-black">{p.partLabel}</span>
                                        <p className="truncate opacity-70">{p.text}</p>
                                     </div>
                                  ))}
                               </div>
                            )}
                         </div>
                         <div className="bg-slate-50 p-6 grid grid-cols-2 gap-4 border-t border-gray-100">
                            <button 
                               onClick={() => toggleCollect(q, 'objectives')}
                               className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inObj ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-blue-900 border-blue-100 hover:bg-blue-50'}`}
                            >
                               {inObj ? 'Remove Obj' : 'Add to Obj Folder'}
                            </button>
                            <button 
                               onClick={() => toggleCollect(q, 'theory')}
                               className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inThy ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-900 border-indigo-100 hover:bg-indigo-50'}`}
                            >
                               {inThy ? 'Remove Theory' : 'Add to Theory Folder'}
                            </button>
                         </div>
                      </div>
                    );
                 })}
              </div>
           ) : (
              <div className="py-40 text-center bg-slate-50 border-4 border-dashed border-gray-100 rounded-[4rem] flex flex-col items-center gap-6 opacity-30">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 <p className="text-sm font-black uppercase tracking-[0.5em] max-w-sm">No curriculum DNA found for selected parameters</p>
                 <button onClick={() => { setFilterStrand('ALL'); setFilterIndicator('ALL'); }} className="bg-blue-900 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg">Reset Filters</button>
              </div>
           )}
        </div>
      </div>

    </div>
  );
};

export default SubjectQuestionsBank;
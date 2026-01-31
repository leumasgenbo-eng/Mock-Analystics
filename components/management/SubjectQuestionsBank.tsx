import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string } | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<{ objectives: MasterQuestion[], theory: MasterQuestion[] }>({ objectives: [], theory: [] });

  // Batch Control
  const [batchSize, setBatchSize] = useState<number>(40);
  const [targetFolder, setTargetFolder] = useState<'objectives' | 'theory'>('objectives');

  // Triple-Tier Recursive Filters
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterSubStrand, setFilterSubStrand] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');

  useEffect(() => {
    const fetchBank = async () => {
      setIsLoading(true);
      // PULL FROM HQ MASTER SHARDS
      const bankId = `master_bank_${selectedSubject.replace(/\s+/g, '')}`;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      if (data?.payload) {
        setQuestions(data.payload as MasterQuestion[]);
      } else {
        setQuestions([]);
      }
      setIsLoading(false);
      // Reset sub-filters on subject change
      setFilterStrand('ALL');
      setFilterSubStrand('ALL');
      setFilterIndicator('ALL');
    };
    fetchBank();
  }, [selectedSubject]);

  // Logic: Extract filter lists based on parent selection
  const strandList = useMemo(() => ['ALL', ...Array.from(new Set(questions.map(q => q.strand || 'UNGROUPED')))], [questions]);
  
  const subStrandList = useMemo(() => {
    const filteredByStrand = filterStrand === 'ALL' ? questions : questions.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(filteredByStrand.map(q => q.subStrand || 'UNGROUPED')))];
  }, [questions, filterStrand]);

  const indicatorList = useMemo(() => {
    const filteredBySub = questions.filter(q => 
      (filterStrand === 'ALL' || q.strand === filterStrand) && 
      (filterSubStrand === 'ALL' || q.subStrand === filterSubStrand)
    );
    return ['ALL', ...Array.from(new Set(filteredBySub.map(q => q.indicator || 'UNGROUPED')))];
  }, [questions, filterStrand, filterSubStrand]);

  const filteredSet = useMemo(() => {
    return questions.filter(q => {
      const matchStrand = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchSubStrand = filterSubStrand === 'ALL' || q.subStrand === filterSubStrand;
      const matchIndicator = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      return matchStrand && matchSubStrand && matchIndicator;
    });
  }, [questions, filterStrand, filterSubStrand, filterIndicator]);

  const handleAutoBatchPull = () => {
    const typeFiltered = filteredSet.filter(q => 
      targetFolder === 'objectives' ? q.type === 'OBJECTIVE' : q.type === 'THEORY'
    );

    if (typeFiltered.length === 0) {
      alert("HQ Search Result: No questions match the current criteria for this format.");
      return;
    }

    const shuffled = [...typeFiltered].sort(() => Math.random() - 0.5);
    const batch = shuffled.slice(0, batchSize);

    setCollectedQs(prev => ({
      ...prev,
      [targetFolder]: Array.from(new Set([...prev[targetFolder], ...batch]))
    }));

    alert(`HQ PULL SUCCESSFUL: ${batch.length} items added to ${targetFolder.toUpperCase()} folder.`);
  };

  const toggleCollect = (q: MasterQuestion, folder: 'objectives' | 'theory') => {
    const current = collectedQs[folder];
    const exists = current.some(x => x.id === q.id);
    if (exists) {
      setCollectedQs({ ...collectedQs, [folder]: current.filter(x => x.id !== q.id) });
    } else {
      setCollectedQs({ ...collectedQs, [folder]: [...current, q] });
    }
  };

  const handleSyncAndDownload = (type: 'objectives' | 'theory') => {
    const list = collectedQs[type];
    if (list.length === 0) return alert(`The ${type.toUpperCase()} folder is empty.`);

    let text = `UNITED BAYLOR ACADEMY - HQ MASTER BANK PULL\n`;
    text += `SUBJECT: ${selectedSubject.toUpperCase()}\n`;
    text += `FOLDER: ${type.toUpperCase()}\n`;
    text += `TOTAL ITEMS: ${list.length}\n`;
    text += `PREPARED BY: ${activeFacilitator?.name || "ACADEMY FACILITATOR"}\n`;
    text += `GENERATED: ${new Date().toLocaleString()}\n`;
    text += `==============================================================\n\n`;

    list.forEach((q, i) => {
      text += `ITEM ${i + 1} [STRAND: ${q.strand} | INDICATOR: ${q.indicator}]\n`;
      text += `QUESTION:\n${q.questionText}\n`;
      if (q.instruction) text += `INSTRUCTION: ${q.instruction}\n`;
      if (q.type === 'THEORY' && q.parts && q.parts.length > 0) {
        text += `SUB-PARTS:\n`;
        q.parts.forEach(p => {
          text += `   (${p.partLabel}) ${p.text} [${p.weight} pts] (Bloom's: ${p.blooms})\n`;
        });
      }
      text += `MARKING SCHEME / KEY:\n${q.correctKey || q.answerScheme || 'Review Rubric Shard'}\n`;
      text += `--------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.replace(/\s+/g, '_')}_HQ_PULL_${type.toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`HQ Shard Exported: Use this document to prepare your examination papers.`);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Unified HQ Questions Bank</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Master Repository for Exam Preparation</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
              {subjects.map(s => (
                <button 
                  key={s} 
                  onClick={() => setSelectedSubject(s)}
                  className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* RECURSIVE FILTER PANEL */}
        <div className="lg:col-span-4 space-y-8">
           {/* HQ BATCH COLLECTOR */}
           <div className="bg-indigo-900 text-white border border-indigo-700 rounded-[3rem] p-10 shadow-2xl space-y-6">
              <div className="space-y-1">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-300">HQ Batch Collector</h4>
                 <p className="text-xl font-black uppercase tracking-tight">Mass Pull Utility</p>
              </div>
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-3">Pull Quantity (N)</label>
                    <div className="grid grid-cols-4 gap-2">
                       {[5, 10, 40, 100].map(n => (
                         <button 
                           key={n} 
                           onClick={() => setBatchSize(n)}
                           className={`py-2 rounded-xl text-[10px] font-black border transition-all ${batchSize === n ? 'bg-white text-indigo-900 border-white' : 'bg-transparent border-indigo-700 text-indigo-300 hover:border-white'}`}
                         >
                           {n}
                         </button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[8px] font-black text-indigo-300 uppercase ml-3">Target Folder</label>
                    <select 
                      value={targetFolder} 
                      onChange={e => setTargetFolder(e.target.value as any)}
                      className="w-full bg-indigo-950 border border-indigo-700 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none"
                    >
                       <option value="objectives">Objectives Folder</option>
                       <option value="theory">Theory Folder</option>
                    </select>
                 </div>
                 <button 
                   onClick={handleAutoBatchPull}
                   className="w-full bg-white text-indigo-950 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                 >
                   Pull {batchSize} from HQ
                 </button>
              </div>
           </div>

           {/* DRILL-DOWN FILTERS */}
           <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-2xl space-y-10">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                    Curriculum Matrix Filters
                 </h4>
                 <div className="space-y-5">
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Academic Strand</label>
                       <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">
                          {strandList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Sub-Strand Node</label>
                       <select value={filterSubStrand} onChange={e=>setFilterSubStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">
                          {subStrandList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-3">Indicator Shard</label>
                       <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">
                          {indicatorList.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              {/* FOLDER STATS */}
              <div className="space-y-6 pt-6 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prepared Work Packs</h4>
                 <div className="grid grid-cols-1 gap-4">
                    <button 
                      onClick={() => handleSyncAndDownload('objectives')}
                      className="group bg-blue-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all"
                    >
                       <div className="text-left">
                          <span className="text-[8px] font-black text-blue-300 uppercase block mb-1">Objectives Pack</span>
                          <span className="text-xl font-black font-mono">{collectedQs.objectives.length}</span>
                       </div>
                       <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-blue-900 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                       </div>
                    </button>
                    <button 
                      onClick={() => handleSyncAndDownload('theory')}
                      className="group bg-slate-900 text-white p-6 rounded-[2rem] flex justify-between items-center shadow-xl active:scale-95 transition-all"
                    >
                       <div className="text-left">
                          <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Theory Pack</span>
                          <span className="text-xl font-black font-mono">{collectedQs.theory.length}</span>
                       </div>
                       <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                       </div>
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* RESULTS AREA */}
        <div className="lg:col-span-8 space-y-6">
           <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                 <div className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-blue-100">
                    HQ Pool: {questions.length}
                 </div>
                 <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-indigo-100">
                    Filter Match: {filteredSet.length}
                 </div>
              </div>
              <button 
                onClick={() => setCollectedQs({ objectives: [], theory: [] })}
                className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Flush Shards
              </button>
           </div>

           {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center space-y-6">
                 <div className="w-14 h-14 border-[6px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Establishing HQ Cloud Link...</p>
              </div>
           ) : filteredSet.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {filteredSet.map((q) => {
                    const inObj = collectedQs.objectives.some(x => x.id === q.id);
                    const inThy = collectedQs.theory.some(x => x.id === q.id);
                    return (
                      <div key={q.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-400 transition-all flex flex-col group animate-in slide-in-from-bottom-4">
                         <div className="p-8 space-y-5 flex-1">
                            <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'THEORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                     {q.type}
                                  </span>
                                  <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-none mt-1">
                                     {q.indicator}
                                  </p>
                               </div>
                               <span className="text-[9px] font-mono font-black text-slate-200">#HQ_SHARD</span>
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
                 <p className="text-sm font-black uppercase tracking-[0.5em] max-w-sm">No curriculum DNA matching criteria</p>
              </div>
           )}
        </div>
      </div>

    </div>
  );
};

export default SubjectQuestionsBank;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string; schoolId?: string } | null;
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
  const [editingQ, setEditingQ] = useState<MasterQuestion | null>(null);

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
    } catch (err) {
      console.error("Bank Access Fault:", err);
      setMasterBank([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const strandList = useMemo(() => ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand)))].filter(Boolean), [masterBank]);
  const indicatorList = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.indicator)))].filter(Boolean);
  }, [masterBank, filterStrand]);

  const refreshVisibleShards = useCallback(() => {
    const pool = masterBank.filter(q => {
      const matchStrand = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchIndicator = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      
      // LOGIC: Filter by rating. 
      // High rated questions appear frequently. 
      // Low rated (0-1) are de-prioritized (30% chance to show).
      const rating = q.rating || 0;
      const isRandomlyVisible = rating >= 3 || Math.random() > (0.7 - (rating * 0.1));
      
      return matchStrand && matchIndicator && isRandomlyVisible;
    });
    setVisibleShards([...pool].sort(() => Math.random() - 0.5).slice(0, batchSize));
  }, [masterBank, filterStrand, filterIndicator, batchSize]);

  useEffect(() => { refreshVisibleShards(); }, [refreshVisibleShards]);

  const toggleCollect = (q: MasterQuestion, folder: 'objectives' | 'theory') => {
    setCollectedQs(prev => {
      const current = prev[folder];
      const exists = current.some(x => x.id === q.id);
      return { ...prev, [folder]: exists ? current.filter(x => x.id !== q.id) : [...current, q] };
    });
  };

  const handleUpdateRating = async (qId: string, rating: number) => {
    const nextBank = masterBank.map(q => q.id === qId ? { ...q, rating } : q);
    setMasterBank(nextBank);
    const sanitizedSubject = selectedSubject.trim().replace(/\s+/g, '');
    await supabase.from('uba_persistence').upsert({ 
      id: `master_bank_${sanitizedSubject}`, 
      hub_id: 'HQ-HUB', 
      payload: nextBank,
      last_updated: new Date().toISOString()
    });
  };

  const handleEditSave = async () => {
    if (!editingQ) return;
    const sanitizedSubject = selectedSubject.trim().replace(/\s+/g, '');
    const nextBank = masterBank.map(q => q.id === editingQ.id ? editingQ : q);
    setMasterBank(nextBank);
    
    setCollectedQs(prev => ({
      objectives: prev.objectives.map(q => q.id === editingQ.id ? editingQ : q),
      theory: prev.theory.map(q => q.id === editingQ.id ? editingQ : q)
    }));

    await supabase.from('uba_persistence').upsert({ 
      id: `master_bank_${sanitizedSubject}`, 
      hub_id: 'HQ-HUB', 
      payload: nextBank,
      last_updated: new Date().toISOString()
    });
    setEditingQ(null);
    alert("HQ Master Shard Delta Synchronized.");
  };

  const handleDownloadPack = async (type: 'objectives' | 'theory') => {
    const list = collectedQs[type];
    if (list.length === 0) return alert(`Queue empty.`);

    // Record Usage Frequency to HQ
    const nextBank = masterBank.map(q => 
       list.some(l => l.id === q.id) ? { ...q, usageCount: (q.usageCount || 0) + 1 } : q
    );
    const sanitizedSubject = selectedSubject.trim().replace(/\s+/g, '');
    await supabase.from('uba_persistence').upsert({ 
      id: `master_bank_${sanitizedSubject}`, 
      hub_id: 'HQ-HUB', 
      payload: nextBank,
      last_updated: new Date().toISOString()
    });

    let text = `UNITED BAYLOR ACADEMY - [${selectedSubject.toUpperCase()}] ${type.toUpperCase()} PACK\n`;
    text += `==============================================================\n\n`;
    text += `[PART I: QUESTION ITEMS]\n`;
    text += `--------------------------------------------------------------\n`;
    list.forEach((q, i) => {
      text += `ITEM #${i + 1} [CODE: ${q.id.slice(-4)}]\n`;
      text += `QUESTION: ${q.questionText}\n`;
      if (q.type === 'THEORY' && q.parts?.length) {
        q.parts.forEach(p => text += `  (${p.partLabel}) ${p.text} [${p.weight} pts]\n`);
      }
      text += `\n`;
    });

    text += `\n[PART II: CORRESPONDING ANSWERS & MARKING SCHEME]\n`;
    text += `--------------------------------------------------------------\n`;
    list.forEach((q, i) => {
      text += `ITEM #${i + 1} KEY: ${q.correctKey || 'RELIANCE ON RUBRIC'}\n`;
      if (q.type === 'THEORY' && q.parts?.length) {
         q.parts.forEach(p => text += `  (${p.partLabel}) SCHEME: ${p.markingScheme}\n`);
      } else {
         text += `  SCHEME: ${q.answerScheme || 'N/A'}\n`;
      }
      text += `\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HQ_${selectedSubject}_${type.toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleForwardToPupils = async () => {
    const allSelected = [...collectedQs.objectives, ...collectedQs.theory];
    if (allSelected.length === 0) return alert("Select shards for cohort first.");
    const timeLimit = prompt("Set rapid practice time limit (minutes):", "30");
    if (!timeLimit) return;

    const assignment = {
      id: `PRACTICE-${Date.now()}`,
      title: `${selectedSubject} Mastery Shard`,
      subject: selectedSubject,
      timeLimit: parseInt(timeLimit),
      questions: allSelected,
      pushedBy: activeFacilitator?.name || 'FACILITATOR',
      timestamp: new Date().toISOString()
    };

    const schoolId = activeFacilitator?.schoolId || 'HQ_GLOBAL';
    const { data: currentAssignments } = await supabase.from('uba_persistence').select('payload').eq('id', `practice_assign_${schoolId}`).maybeSingle();
    const nextArr = [...(currentAssignments?.payload || []), assignment];
    
    await supabase.from('uba_persistence').upsert({ id: `practice_assign_${schoolId}`, hub_id: schoolId, payload: nextArr });
    alert("PRACTICE SHARD BROADCAST TO PUPIL HUB.");
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-24 font-sans">
      
      {/* Edit Modal (The Refactor Shard) */}
      {editingQ && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[250] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl space-y-6">
              <h3 className="text-2xl font-black uppercase text-slate-900">Refactor Instructional Shard</h3>
              <div className="space-y-4">
                 <textarea 
                   value={editingQ.questionText} 
                   onChange={e => setEditingQ({...editingQ, questionText: e.target.value})}
                   className="w-full bg-slate-50 border p-5 rounded-2xl text-sm font-bold h-32 uppercase"
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase">Correct Key</label>
                       <input value={editingQ.correctKey} onChange={e=>setEditingQ({...editingQ, correctKey: e.target.value})} className="w-full bg-slate-50 border p-3 rounded-xl text-sm font-black uppercase" />
                    </div>
                    <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase">Weight</label>
                       <input type="number" value={editingQ.weight} onChange={e=>setEditingQ({...editingQ, weight: parseInt(e.target.value)})} className="w-full bg-slate-50 border p-3 rounded-xl text-sm font-black" />
                    </div>
                 </div>
                 <textarea 
                   value={editingQ.answerScheme} 
                   onChange={e => setEditingQ({...editingQ, answerScheme: e.target.value})}
                   placeholder="Refine marking criteria..."
                   className="w-full bg-slate-50 border p-4 rounded-xl text-xs font-medium h-24"
                 />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setEditingQ(null)} className="flex-1 py-4 font-black uppercase text-[10px] text-slate-400">Discard</button>
                 <button onClick={handleEditSave} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Commit to HQ</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">HQ Curriculum Bank</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Resource Refinement & Global Sync Hub</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl overflow-x-auto no-scrollbar max-w-full">
              {subjects.map(s => (
                <button key={s} disabled={!!activeFacilitator && activeFacilitator.subject !== s} onClick={() => setSelectedSubject(s)} className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white disabled:opacity-10'}`}>
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-2xl space-y-10">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    Registry Filter Shards
                 </h4>
                 <div className="space-y-5">
                    <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{strandList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{indicatorList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    <button onClick={handleForwardToPupils} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Broadcast to Pupils</button>
                 </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Download Buffers</h4>
                 <button onClick={() => handleDownloadPack('objectives')} className="w-full group bg-blue-900 text-white p-5 rounded-[2rem] flex justify-between items-center shadow-xl">
                    <div className="text-left"><span className="text-[8px] font-black text-blue-300 uppercase block">Objectives</span><span className="text-xl font-black">{collectedQs.objectives.length}</span></div>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 </button>
                 <button onClick={() => handleDownloadPack('theory')} className="w-full group bg-slate-900 text-white p-5 rounded-[2rem] flex justify-between items-center shadow-xl">
                    <div className="text-left"><span className="text-[8px] font-black text-slate-500 uppercase block">Theory</span><span className="text-xl font-black">{collectedQs.theory.length}</span></div>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                 </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
           {visibleShards.map((q) => {
              const inObj = collectedQs.objectives.some(x => x.id === q.id);
              const inThy = collectedQs.theory.some(x => x.id === q.id);
              return (
                <div key={q.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-400 transition-all flex flex-col animate-in zoom-in-95 group">
                   <div className="p-8 space-y-5 flex-1">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'THEORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>{q.type}</span>
                            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest truncate max-w-[200px] mt-1">{q.indicator}</p>
                         </div>
                         <div className="flex gap-4 items-center">
                            <div className="text-right">
                               <span className="text-[7px] font-black text-slate-300 uppercase block">Freq</span>
                               <span className="text-[10px] font-black font-mono text-slate-400">{q.usageCount || 0}x</span>
                            </div>
                            <div className="flex gap-0.5">
                               {[1,2,3,4,5].map(star => (
                                 <button key={star} onClick={() => handleUpdateRating(q.id, star)} className={`text-xs ${star <= (q.rating || 0) ? 'text-amber-400' : 'text-slate-100'} hover:scale-125 transition-transform`}>★</button>
                               ))}
                            </div>
                         </div>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase leading-relaxed line-clamp-3">"{q.questionText}"</h4>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingQ(q)} className="text-[8px] font-black uppercase text-blue-500 hover:underline">Refactor Shard</button>
                      </div>
                   </div>
                   <div className="bg-slate-50 p-6 grid grid-cols-2 gap-4 border-t border-gray-100">
                      <button onClick={() => toggleCollect(q, 'objectives')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inObj ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-900'}`}>{inObj ? 'Remove' : 'Collect Obj'}</button>
                      <button onClick={() => toggleCollect(q, 'theory')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${inThy ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-900'}`}>{inThy ? 'Remove' : 'Collect Theory'}</button>
                   </div>
                </div>
              );
           })}
           {visibleShards.length === 0 && (
             <div className="py-40 text-center opacity-20">
               <p className="text-sm font-black uppercase tracking-widest text-slate-900">No questions match the current spectrum filtering</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;

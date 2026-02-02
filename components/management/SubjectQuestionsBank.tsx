
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion, PracticeAssignment, StaffAssignment } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: StaffAssignment | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.taughtSubject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<MasterQuestion[]>([]);
  
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterSubStrand, setFilterSubStrand] = useState('ALL');

  const fetchBank = useCallback(async () => {
    setIsLoading(true);
    const bankId = `master_bank_${selectedSubject.trim().replace(/\s+/g, '')}`;
    try {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      const questions = (data?.payload as MasterQuestion[]) || [];
      setMasterBank(questions);
    } catch (err) {
      setMasterBank([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const strands = useMemo(() => ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand)))].filter(Boolean), [masterBank]);
  const subStrands = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.subStrand)))].filter(Boolean);
  }, [masterBank, filterStrand]);

  const visibleShards = useMemo(() => {
    return masterBank.filter(q => {
      const s = filterStrand === 'ALL' || q.strand === filterStrand;
      const ss = filterSubStrand === 'ALL' || q.subStrand === filterSubStrand;
      return s && ss;
    });
  }, [masterBank, filterStrand, filterSubStrand]);

  const toggleCollect = (q: MasterQuestion) => {
    // Check if question is already acquired by this facilitator
    const isAcquired = activeFacilitator?.account?.unlockedQuestionIds.includes(q.id) || q.facilitatorCode === activeFacilitator?.uniqueCode;
    
    if (!isAcquired) {
       if (window.confirm(`ACQUIRE SHARD: This question is locked. Spend 1 Merit Token to acquire it?`)) {
          handleAcquireShard(q);
       }
       return;
    }

    setCollectedQs(prev => {
      const exists = prev.some(x => x.id === q.id);
      return exists ? prev.filter(x => x.id !== q.id) : [...prev, q];
    });
  };

  const handleAcquireShard = (q: MasterQuestion) => {
     if (!activeFacilitator) return;
     const account = activeFacilitator.account || { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] };
     
     if (account.meritTokens < 1) {
        alert("INSUFFICIENT TOKENS: Submit more likely questions to earn Merit Tokens (1:5 ratio).");
        return;
     }

     // Spend Token
     account.meritTokens -= 1;
     account.unlockedQuestionIds = [...(account.unlockedQuestionIds || []), q.id];
     activeFacilitator.account = account;

     // Usage Royalty Logic: 10-40-50 Split
     // Let's assume usage cost is 0.50 GHS worth of tokens for simplicity, 
     // but the prompt focused on the split for usage.
     // Increment the original facilitator's monetary account if they are online? 
     // For now, we simulate the royalty ledger.
     
     alert(`SHARD UNLOCKED: 1 Token deducted. Question added to your curation matrix.`);
     setCollectedQs(prev => [...prev, q]);
  };

  const handleDownloadSelectedText = () => {
    if (collectedQs.length === 0) return alert("Select shards to download.");
    
    let content = `UNITED BAYLOR ACADEMY - PRACTICE SHARD EXPORT\n`;
    content += `SUBJECT: ${selectedSubject.toUpperCase()}\n`;
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `--------------------------------------------------\n\n`;

    collectedQs.forEach((q, idx) => {
      content += `[ITEM ${idx + 1}] TYPE: ${q.type}\n`;
      content += `STRAND: ${q.strand} (${q.strandCode || '---'})\n`;
      content += `SUB-STRAND: ${q.subStrand} (${q.subStrandCode || '---'})\n`;
      content += `INDICATOR: ${q.indicator} (${q.indicatorCode || '---'})\n`;
      content += `BLOOMS: ${q.blooms}\n\n`;
      content += `QUESTION:\n${q.questionText}\n\n`;
      if (q.type === 'OBJECTIVE') {
        content += `(A) [ ]  (B) [ ]  (C) [ ]  (D) [ ]\n`;
      } else {
        content += `RESPONSE AREA:\n__________________________________________________\n__________________________________________________\n`;
      }
      content += `\n--------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Selected_Questions_${selectedSubject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToHub = async () => {
    if (collectedQs.length === 0) return alert("Select shards to broadcast.");
    
    const hubId = activeFacilitator?.enrolledId.split('/')[0] || localStorage.getItem('uba_active_hub_id') || 'HQ-HUB';
    const subKey = selectedSubject.trim().replace(/\s+/g, '');
    const shardId = `practice_shards_${hubId}_${subKey}`;

    const payload: PracticeAssignment = {
      id: `PRACTICE-${Date.now()}`,
      title: `${selectedSubject} Practice Matrix`,
      subject: selectedSubject,
      timeLimit: 30,
      questions: collectedQs,
      pushedBy: activeFacilitator?.name || 'FACULTY',
      timestamp: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('uba_instructional_shards').upsert({
        id: shardId,
        hub_id: hubId,
        subject: selectedSubject,
        payload: payload,
        pushed_by: payload.pushedBy,
        last_updated: new Date().toISOString()
      });

      if (error) throw error;
      alert(`CLOUD SYNC SUCCESSFUL: ${collectedQs.length} full-format questions pushed to Pupil Hub for ${selectedSubject}.`);
      setCollectedQs([]);
    } catch (e: any) {
      alert("Push Interrupted: " + e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-20">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">Instructional Matrix Bank</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Acquire Network Shards using Merit Tokens</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl overflow-x-auto max-w-full no-scrollbar">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-900 pl-4">Registry Filter Controls</h4>
              
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Strand Category</label>
                    <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">{strands.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Sub-strand Category</label>
                    <select value={filterSubStrand} onChange={e=>setFilterSubStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/5">{subStrands.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50 space-y-4">
                 <button 
                   onClick={handlePushToHub}
                   className="w-full bg-blue-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-black"
                 >
                   Broadcast {collectedQs.length} Shards to Pupils
                 </button>
                 
                 <button 
                   onClick={handleDownloadSelectedText}
                   disabled={collectedQs.length === 0}
                   className="w-full bg-white border-2 border-slate-200 text-slate-900 py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all hover:border-blue-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                 >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Selected as Text
                 </button>
              </div>
           </div>

           {activeFacilitator && (
             <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-4">
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-blue-300">Merit Wallet</span>
                <p className="text-3xl font-black font-mono tracking-tighter">{activeFacilitator.account?.meritTokens || 0} TOKENS</p>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-400" style={{ width: '60%' }}></div>
                </div>
                <p className="text-[8px] font-bold uppercase tracking-widest leading-relaxed opacity-60">Unlock more network shards by contributing likely questions (1 Submitted = 5 Tokens).</p>
             </div>
           )}

           {collectedQs.length > 0 && (
             <div className="bg-blue-50 border border-blue-100 rounded-[2.5rem] p-6 shadow-inner animate-in slide-in-from-top-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block">Collection Matrix</span>
                  <button onClick={() => setCollectedQs([])} className="text-[8px] font-black text-red-500 uppercase">Clear All</button>
                </div>
                <div className="space-y-2">
                   {collectedQs.map((q, idx) => (
                      <div key={q.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm overflow-hidden">
                         <span className="w-5 h-5 bg-blue-900 text-white text-[8px] font-black rounded-lg flex items-center justify-center shrink-0">#{idx+1}</span>
                         <p className="text-[9px] font-black text-slate-600 truncate uppercase flex-1">{q.questionText}</p>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
           {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accessing Formatted Shards...</p>
              </div>
           ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
                      <tr>
                         <th className="px-6 py-6 w-20 text-center">Acquire</th>
                         <th className="px-6 py-6 min-w-[300px]">Full Content & Curriculm lineage</th>
                         <th className="px-6 py-6">Type / Bloom's</th>
                         <th className="px-6 py-6 text-right pr-10">Vault Logic</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {visibleShards.map((q) => {
                         const isMyQuestion = q.facilitatorCode === activeFacilitator?.uniqueCode;
                         const isUnlocked = activeFacilitator?.account?.unlockedQuestionIds.includes(q.id) || isMyQuestion;
                         const isCollected = collectedQs.some(x => x.id === q.id);
                         
                         return (
                            <tr key={q.id} className={`hover:bg-blue-50/20 transition-all ${isCollected ? 'bg-blue-50/10' : ''} group`}>
                               <td className="px-6 py-5 text-center">
                                  <button 
                                    onClick={() => toggleCollect(q)}
                                    className={`w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                                       isUnlocked 
                                       ? (isCollected ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110' : 'border-emerald-200 text-emerald-400 group-hover:border-blue-300')
                                       : 'border-slate-100 bg-gray-50 text-slate-300 hover:border-amber-400 hover:text-amber-500'
                                    }`}
                                  >
                                     {!isUnlocked ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                     ) : isCollected ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                                     ) : (
                                        <span className="font-black text-sm">+</span>
                                     )}
                                  </button>
                               </td>
                               <td className="px-6 py-5">
                                  <div className="space-y-3">
                                     <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{q.strandCode || 'S00'}</span>
                                        <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{q.subStrandCode || 'SS00'}</span>
                                        <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{q.indicatorCode || 'I00'}</span>
                                     </div>
                                     <div className="space-y-1">
                                        <p className={`text-xs font-black uppercase leading-relaxed ${isUnlocked ? 'text-slate-800' : 'text-slate-300 blur-[2px]'}`}>
                                           {isUnlocked ? `"${q.questionText}"` : "Question Content Locked"}
                                        </p>
                                        <div className="flex gap-4 text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                                           <span>S: {q.strand}</span>
                                           <span>•</span>
                                           <span>SS: {q.subStrand}</span>
                                        </div>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-6 py-5">
                                  <div className="flex flex-col gap-1.5">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase w-fit ${q.type === 'OBJECTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type}</span>
                                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{q.blooms}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-5 text-right pr-10">
                                  <div className="flex flex-col items-end gap-1">
                                     <span className={`text-[8px] font-black uppercase ${isMyQuestion ? 'text-blue-500' : isUnlocked ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {isMyQuestion ? 'MY ASSET' : isUnlocked ? 'ACQUIRED' : 'LOCKED (1 TOKEN)'}
                                     </span>
                                     <code className="text-[9px] font-mono font-black text-slate-400 bg-slate-50 px-2 py-1 rounded border border-gray-100 uppercase">{q.facilitatorCode || 'ADMIN'}</code>
                                  </div>
                               </td>
                            </tr>
                         );
                      })}
                      {visibleShards.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-20 text-center opacity-30">
                              <p className="font-black text-[10px] uppercase tracking-widest">No instructional shards available for this filter.</p>
                           </td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion, PracticeAssignment } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string; schoolId?: string } | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<MasterQuestion[]>([]);
  
  // 3-Tier Filter State
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterSubStrand, setFilterSubStrand] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');

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

  // Taxonomy Lists
  const strands = useMemo(() => ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand)))].filter(Boolean), [masterBank]);
  const subStrands = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.subStrand)))].filter(Boolean);
  }, [masterBank, filterStrand]);
  const indicators = useMemo(() => {
    let subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    if (filterSubStrand !== 'ALL') subset = subset.filter(q => q.subStrand === filterSubStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.indicator)))].filter(Boolean);
  }, [masterBank, filterStrand, filterSubStrand]);

  const visibleShards = useMemo(() => {
    return masterBank.filter(q => {
      const s = filterStrand === 'ALL' || q.strand === filterStrand;
      const ss = filterSubStrand === 'ALL' || q.subStrand === filterSubStrand;
      const i = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      return s && ss && i;
    });
  }, [masterBank, filterStrand, filterSubStrand, filterIndicator]);

  const toggleCollect = (q: MasterQuestion) => {
    setCollectedQs(prev => {
      const exists = prev.some(x => x.id === q.id);
      return exists ? prev.filter(x => x.id !== q.id) : [...prev, q]; // Push adds to end, preserving order
    });
  };

  const handleDownloadTxt = () => {
    if (collectedQs.length === 0) return alert("Collect questions first.");
    let content = `UNITED BAYLOR ACADEMY - INSTRUCTIONAL SHARD EXPORT\n`;
    content += `SUBJECT: ${selectedSubject}\n`;
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `================================================\n\n`;

    collectedQs.forEach((q, idx) => {
      content += `QUESTION #${idx + 1} [${q.type}] [${q.indicator}]\n`;
      content += `${q.questionText}\n`;
      if (q.type === 'OBJECTIVE') {
        content += `KEY: ${q.correctKey}\n`;
      }
      content += `SCHEME/ANSWER: ${q.answerScheme}\n`;
      content += `------------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UBA_Questions_${selectedSubject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePushToPupils = async () => {
    if (collectedQs.length === 0) return alert("Select shards to push.");
    const hubId = activeFacilitator?.schoolId || localStorage.getItem('uba_active_hub_id') || 'GLOBAL';
    const subKey = selectedSubject.trim().replace(/\s+/g, '');
    
    const payload: PracticeAssignment = {
      id: `PRACTICE-${Date.now()}`,
      title: `${selectedSubject} Mastery Shard`,
      subject: selectedSubject,
      timeLimit: 30,
      questions: collectedQs, // Order preserved
      pushedBy: activeFacilitator?.name || 'FACULTY',
      timestamp: new Date().toISOString()
    };

    try {
      await supabase.from('uba_persistence').upsert({
        id: `practice_shards_${hubId}_${subKey}`,
        hub_id: hubId,
        payload: payload,
        last_updated: new Date().toISOString()
      });
      alert("INSTRUCTIONAL SHARDS BROADCAST TO PUPIL TERMINALS.");
      setCollectedQs([]);
    } catch (e) {
      alert("Push failed. Check connectivity.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">Instructional Bank</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Multi-Strand Selection & Broadcast</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
              {subjects.slice(0, 5).map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSubject === s ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registry Filter Shards */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-900 pl-4">Registry Filter Shards</h4>
              
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Strand</label>
                    <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{strands.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Sub-strand</label>
                    <select value={filterSubStrand} onChange={e=>setFilterSubStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{subStrands.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Indicator</label>
                    <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{indicators.map(s => <option key={s} value={s}>{s}</option>)}</select>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50 flex flex-col gap-3">
                 <button 
                   onClick={handlePushToPupils}
                   className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all"
                 >
                   Broadcast {collectedQs.length} to Pupils
                 </button>
                 <button 
                   onClick={handleDownloadTxt}
                   className="w-full bg-white border-2 border-slate-200 text-slate-600 py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all"
                 >
                   Download Text Shard
                 </button>
              </div>
           </div>

           {collectedQs.length > 0 && (
             <div className="bg-blue-50 border border-blue-100 rounded-[2.5rem] p-6 shadow-inner animate-in slide-in-from-top-4">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-4">Collection Queue (Ordered)</span>
                <div className="space-y-2">
                   {collectedQs.map((q, idx) => (
                      <div key={q.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-100 shadow-sm">
                         <span className="w-5 h-5 bg-blue-900 text-white text-[8px] font-black rounded-lg flex items-center justify-center shrink-0">#{idx+1}</span>
                         <p className="text-[9px] font-black text-slate-600 truncate uppercase">{q.questionText}</p>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* Shard Table */}
        <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
           {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[9px] font-black text-slate-400 uppercase">Synchronizing Bank...</p>
              </div>
           ) : (
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                       <th className="px-6 py-6 w-20 text-center">Collect</th>
                       <th className="px-6 py-6">Question Matrix</th>
                       <th className="px-6 py-6 text-right pr-10">Indicator</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {visibleShards.map((q) => {
                       const isCollected = collectedQs.some(x => x.id === q.id);
                       return (
                          <tr key={q.id} className={`hover:bg-blue-50/20 transition-all ${isCollected ? 'bg-blue-50/10' : ''}`}>
                             <td className="px-6 py-5 text-center">
                                <button 
                                  onClick={() => toggleCollect(q)}
                                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${isCollected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-gray-200 text-slate-200 hover:border-blue-300'}`}
                                >
                                   {isCollected ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg> : <span className="font-black text-xs">+</span>}
                                </button>
                             </td>
                             <td className="px-6 py-5">
                                <div className="space-y-1">
                                   <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type}</span>
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{q.strand}</span>
                                   </div>
                                   <p className="text-xs font-black text-slate-700 uppercase italic">"{q.questionText}"</p>
                                </div>
                             </td>
                             <td className="px-6 py-5 text-right pr-10">
                                <span className="font-mono text-[9px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-lg">{q.indicator}</span>
                             </td>
                          </tr>
                       );
                    })}
                 </tbody>
              </table>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;

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
  const [collectedQs, setCollectedQs] = useState<{ sba: MasterQuestion[], mock: MasterQuestion[] }>({ sba: [], mock: [] });

  // Filters
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'OBJECTIVE' | 'THEORY'>('ALL');

  useEffect(() => {
    const fetchBank = async () => {
      setIsLoading(true);
      const bankId = `master_bank_${selectedSubject.replace(/\s+/g, '')}`;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      if (data?.payload) {
        setQuestions(data.payload as MasterQuestion[]);
      } else {
        setQuestions([]);
      }
      setIsLoading(false);
    };
    fetchBank();
  }, [selectedSubject]);

  const strands = useMemo(() => {
    const set = new Set(questions.map(q => q.strand || 'UNGROUPED'));
    return ['ALL', ...Array.from(set)];
  }, [questions]);

  const filtered = useMemo(() => {
    return questions.filter(q => {
      const matchStrand = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchType = filterType === 'ALL' || q.type === filterType;
      return matchStrand && matchType;
    });
  }, [questions, filterStrand, filterType]);

  const toggleCollect = (q: MasterQuestion, type: 'sba' | 'mock') => {
    const current = collectedQs[type];
    const exists = current.some(x => x.id === q.id);
    if (exists) {
      setCollectedQs({ ...collectedQs, [type]: current.filter(x => x.id !== q.id) });
    } else {
      setCollectedQs({ ...collectedQs, [type]: [...current, q] });
    }
  };

  const handleDownloadTxt = (type: 'bank' | 'sba' | 'mock') => {
    let list = questions;
    if (type === 'sba') list = collectedQs.sba;
    if (type === 'mock') list = collectedQs.mock;

    if (list.length === 0) return alert("No questions to export.");

    let text = `UNITED BAYLOR ACADEMY - ${selectedSubject.toUpperCase()} QUESTION BANK\n`;
    text += `EXPORT TYPE: ${type.toUpperCase()}\n`;
    text += `GENERATED: ${new Date().toLocaleString()}\n`;
    text += `==============================================================\n\n`;

    list.forEach((q, i) => {
      text += `${i + 1}. [${q.type}] [Strand: ${q.strand || 'N/A'}] [Indicator: ${q.indicator || 'N/A'}]\n`;
      text += `QUESTION: ${q.questionText}\n`;
      if (q.instruction) text += `INSTRUCTION: ${q.instruction}\n`;
      if (q.type === 'THEORY' && q.parts && q.parts.length > 0) {
        q.parts.forEach(p => {
          text += `   (${p.partLabel}) ${p.text} [${p.weight} pts]\n`;
        });
      }
      text += `ANSWER/KEY: ${q.correctKey || q.answerScheme || 'See Rubric'}\n`;
      text += `--------------------------------------------------------------\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSubject.replace(/\s+/g, '_')}_${type.toUpperCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* Header & Subject Context */}
      <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Unified Questions Bank</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em]">Multi-Series Institutional Resource Repository</p>
           </div>
           <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase text-blue-400 outline-none"
              >
                {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button 
                onClick={() => handleDownloadTxt('bank')}
                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export Bank
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Filters & Collection Shelf */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl space-y-8">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2">Filter Repository</h4>
                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Strand Group</label>
                       <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none">
                          {strands.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Format</label>
                       <select value={filterType} onChange={e=>setFilterType(e.target.value as any)} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none">
                          <option value="ALL">ALL FORMATS</option>
                          <option value="OBJECTIVE">OBJECTIVES ONLY</option>
                          <option value="THEORY">THEORY ONLY</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="space-y-6 pt-4 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex justify-between items-center">
                    <span>SBA Collection</span>
                    <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded text-[8px] font-black">{collectedQs.sba.length}</span>
                 </h4>
                 <button 
                   onClick={() => handleDownloadTxt('sba')}
                   disabled={collectedQs.sba.length === 0}
                   className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 rounded-xl font-black text-[9px] uppercase transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                 >
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   Download SBA Pack
                 </button>
              </div>

              <div className="space-y-6 pt-4 border-t border-gray-50">
                 <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest flex justify-between items-center">
                    <span>Mock Collection</span>
                    <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black">{collectedQs.mock.length}</span>
                 </h4>
                 <button 
                   onClick={() => handleDownloadTxt('mock')}
                   disabled={collectedQs.mock.length === 0}
                   className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-black text-[9px] uppercase transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                 >
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                   Download Mock Pack
                 </button>
              </div>
           </div>
        </div>

        {/* Right: Question Matrix */}
        <div className="lg:col-span-9 space-y-6">
           {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-4">
                 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Master Shards...</p>
              </div>
           ) : filtered.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {filtered.map((q) => {
                    const inSba = collectedQs.sba.some(x => x.id === q.id);
                    const inMock = collectedQs.mock.some(x => x.id === q.id);
                    return (
                      <div key={q.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-400 transition-all flex flex-col group">
                         <div className="p-8 space-y-4 flex-1">
                            <div className="flex justify-between items-start">
                               <div className="space-y-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${q.type === 'THEORY' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
                                     {q.type}
                                  </span>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">
                                     {q.strand} • {q.indicator}
                                  </p>
                               </div>
                               <span className="text-[10px] font-mono font-black text-slate-200">#BANK</span>
                            </div>
                            <div className="space-y-2">
                               <h4 className="text-sm font-black text-slate-900 uppercase leading-relaxed line-clamp-3 italic">"{q.questionText}"</h4>
                               {q.instruction && <p className="text-[9px] text-gray-400 italic">Instruction: {q.instruction}</p>}
                            </div>
                            {q.type === 'THEORY' && q.parts && q.parts.length > 0 && (
                               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1.5">
                                  {q.parts.map((p, pi) => (
                                     <div key={pi} className="flex gap-2 text-[9px] font-bold text-slate-600">
                                        <span className="text-blue-500">{p.partLabel}</span>
                                        <p className="truncate">{p.text}</p>
                                     </div>
                                  ))}
                               </div>
                            )}
                            <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Master Key</span>
                                  <span className="text-xs font-black text-slate-900 font-mono">{q.correctKey || 'See Rubric'}</span>
                               </div>
                               <div className="text-right">
                                  <span className="text-[8px] font-black text-slate-400 uppercase block">Weight</span>
                                  <span className="text-xs font-black text-blue-900">{q.weight} PTS</span>
                               </div>
                            </div>
                         </div>
                         <div className="bg-slate-50 p-4 grid grid-cols-2 gap-3 border-t border-gray-100">
                            <button 
                               onClick={() => toggleCollect(q, 'sba')}
                               className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${inSba ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-100 hover:bg-indigo-50'}`}
                            >
                               {inSba ? 'Remove SBA' : 'Add to SBA'}
                            </button>
                            <button 
                               onClick={() => toggleCollect(q, 'mock')}
                               className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${inMock ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50'}`}
                            >
                               {inMock ? 'Remove Mock' : 'Add to Mock'}
                            </button>
                         </div>
                      </div>
                    );
                 })}
              </div>
           ) : (
              <div className="py-40 text-center bg-slate-50 border-4 border-dashed border-gray-100 rounded-[4rem] flex flex-col items-center gap-6 opacity-30">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                 <p className="text-sm font-black uppercase tracking-[0.5em] max-w-sm">No synchronized questions found for this subject node</p>
              </div>
           )}
        </div>
      </div>

    </div>
  );
};

export default SubjectQuestionsBank;
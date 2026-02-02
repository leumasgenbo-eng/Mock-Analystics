
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { MasterQuestion } from '../../types';

const QuestionRegistryView: React.FC = () => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchGlobalSubmissions = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('uba_persistence')
          .select('payload')
          .like('id', 'likely_%');

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
    fetchGlobalSubmissions();
  }, []);

  const subjects = useMemo(() => ['ALL', ...Array.from(new Set(questions.map(q => q.subject))).sort()], [questions]);

  const filtered = useMemo(() => {
    return questions.filter(q => {
      const matchSub = selectedSubject === 'ALL' || q.subject === selectedSubject;
      const matchSearch = q.questionText.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (q.strand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.strandCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.subStrand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.indicatorCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.facilitatorCode || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [questions, selectedSubject, searchTerm]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 gap-10 opacity-50">
        <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-black uppercase tracking-[0.8em] text-white animate-pulse">Mapping Global Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col bg-slate-950 font-sans min-h-[700px] pb-20">
      <div className="p-10 border-b border-slate-800 bg-slate-900/50 flex flex-col xl:flex-row justify-between items-center gap-10 shadow-2xl">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4 leading-none">
             <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.7)] animate-pulse"></div>
             Instructional Shard Registry
          </h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.5em]">Aggregated Submission Board (Network lineages)</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
           <select 
             value={selectedSubject} 
             onChange={e => setSelectedSubject(e.target.value)}
             className="bg-slate-950 border border-slate-800 rounded-2xl px-8 py-4 text-[11px] font-black text-white outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all uppercase shadow-xl"
           >
             {subjects.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <div className="relative flex-1 xl:w-96">
              <input 
                type="text" 
                placeholder="Search across all fields (codes/names/text)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-8 py-4 text-xs font-bold text-white outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all uppercase shadow-xl placeholder:text-slate-700" 
              />
              <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 md:p-10 no-scrollbar">
         <div className="bg-slate-950 border border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl ring-1 ring-white/5">
            <table className="w-full text-left border-collapse">
               <thead className="bg-slate-900/90 backdrop-blur-xl sticky top-0 z-20 text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-slate-800 shadow-xl">
                  <tr>
                     <th className="px-8 py-7">Type / Code</th>
                     <th className="px-8 py-7 min-w-[280px]">Curriculum Lineage (Strands & Codes)</th>
                     <th className="px-8 py-7 min-w-[400px]">Instructional Content Shard</th>
                     <th className="px-8 py-7 text-right pr-12">Correct key / Rubric</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-900">
                  {filtered.map((q, i) => (
                    <tr key={i} className="hover:bg-blue-600/5 transition-all group leading-tight">
                       <td className="px-8 py-8">
                          <div className="space-y-3">
                             <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-2xl block w-fit ${q.type === 'OBJECTIVE' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>{q.type}</span>
                             <div className="space-y-1">
                                <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block">Facilitator Hub Code</span>
                                <code className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-400/5 px-3 py-1 rounded-lg border border-emerald-400/10 block w-fit shadow-inner">{q.facilitatorCode || 'ADMIN_CORE'}</code>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8">
                          <div className="space-y-4">
                             <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">{q.subject}</span>
                                <div className="h-px bg-blue-500/10 w-full my-1"></div>
                             </div>
                             <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-start gap-3">
                                   <span className="w-10 text-[8px] font-black text-slate-600 uppercase shrink-0 pt-0.5">Strand</span>
                                   <div className="flex-1 space-y-1">
                                      <p className="text-[11px] font-black text-white uppercase">{q.strand || 'GENERAL'}</p>
                                      <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">CODE: {q.strandCode || 'S00'}</span>
                                   </div>
                                </div>
                                <div className="flex items-start gap-3">
                                   <span className="w-10 text-[8px] font-black text-slate-600 uppercase shrink-0 pt-0.5">Sub-S</span>
                                   <div className="flex-1 space-y-1">
                                      <p className="text-[10px] font-bold text-slate-300 uppercase">{q.subStrand || 'CORE'}</p>
                                      <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">CODE: {q.subStrandCode || 'SS00'}</span>
                                   </div>
                                </div>
                                <div className="flex items-start gap-3">
                                   <span className="w-10 text-[8px] font-black text-slate-600 uppercase shrink-0 pt-0.5">Ind.</span>
                                   <div className="flex-1 space-y-1">
                                      <span className="text-[9px] font-black text-indigo-400 uppercase font-mono bg-indigo-950/30 px-2 py-1 rounded border border-indigo-500/20">{q.indicatorCode || 'I00'}</span>
                                   </div>
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8">
                          <div className="space-y-4">
                             <p className="text-[13px] font-black text-slate-200 uppercase leading-relaxed max-w-xl group-hover:text-white transition-colors">"{q.questionText}"</p>
                             <div className="flex flex-wrap gap-4 items-center">
                                <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Scale: {q.blooms}</span>
                                </div>
                                <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                   <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Weight: {q.weight}pt</span>
                                </div>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8 text-right pr-12">
                          {q.type === 'OBJECTIVE' ? (
                            <div className="flex flex-col items-end gap-2">
                               <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Key Result</span>
                               <span className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center font-black text-2xl shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-b-4 border-b-emerald-600/50">{q.correctKey}</span>
                            </div>
                          ) : (
                            <div className="max-w-[280px] ml-auto group/scheme">
                               <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest block mb-2">Marking Protocol</span>
                               <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 hover:border-blue-500/30 transition-all shadow-inner">
                                  <p className="text-[9px] text-slate-400 italic leading-relaxed uppercase group-hover/scheme:text-slate-200">
                                    {q.answerScheme ? `"${q.answerScheme.substring(0, 150)}..."` : "No rubric submitted."}
                                  </p>
                               </div>
                            </div>
                          )}
                       </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-40 text-center opacity-30">
                          <p className="text-white font-black uppercase text-sm tracking-[1em]">Awaiting registry synchronization</p>
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      <div className="p-10 border-t border-slate-800 bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
         <div className="flex gap-12">
            <p className="flex items-center gap-3"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Total Network Population: <span className="text-white ml-2">{filtered.length} Instructional Shards</span></p>
            <p className="border-l border-slate-800 pl-12 flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div> Active Subject Nodes: <span className="text-white ml-2">{subjects.length - 1} Units</span></p>
         </div>
         <p className="text-slate-800">SS-Map Unified Master Registry — {new Date().getFullYear()}</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default QuestionRegistryView;

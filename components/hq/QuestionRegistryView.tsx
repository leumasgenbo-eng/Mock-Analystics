
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
        // Fetch all facilitator-level likely question shards
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
                          q.strand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (q.facilitatorCode || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchSub && matchSearch;
    });
  }, [questions, selectedSubject, searchTerm]);

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 gap-6 opacity-40">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.6em] text-white">Ingesting Shard Matrix...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col bg-slate-950 font-sans">
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter flex items-center gap-4 leading-none">
             <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
             Instructional Shard Registry
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Aggregated Submission Board (Network Wide)</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full xl:w-auto">
           <select 
             value={selectedSubject} 
             onChange={e => setSelectedSubject(e.target.value)}
             className="bg-slate-950 border border-slate-800 rounded-xl px-6 py-3 text-[10px] font-black text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase"
           >
             {subjects.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <div className="relative flex-1 xl:w-80">
              <input 
                type="text" 
                placeholder="Search shards..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-6 py-3 text-[10px] font-bold text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all uppercase" 
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 md:p-8 no-scrollbar">
         <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
               <thead className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                  <tr>
                     <th className="px-6 py-5">Type</th>
                     <th className="px-6 py-5">Facilitator</th>
                     <th className="px-6 py-5 min-w-[200px]">Subject & Strand Hierarchy</th>
                     <th className="px-6 py-5 min-w-[300px]">Instructional Content</th>
                     <th className="px-6 py-5 text-right pr-8">Key / Rubric</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-900">
                  {filtered.map((q, i) => (
                    <tr key={i} className="hover:bg-blue-600/5 transition-colors group">
                       <td className="px-6 py-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase shadow-lg ${q.type === 'OBJECTIVE' ? 'bg-blue-600 text-white' : 'bg-indigo-600 text-white'}`}>{q.type}</span>
                       </td>
                       <td className="px-6 py-6">
                          <code className="text-[10px] font-mono font-black text-emerald-400 bg-emerald-400/5 px-2 py-1 rounded border border-emerald-400/10">{q.facilitatorCode || '---'}</code>
                       </td>
                       <td className="px-6 py-6">
                          <div className="space-y-1">
                             <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">{q.subject}</p>
                             <p className="text-[10px] font-bold text-white uppercase leading-none">{q.strand} <span className="text-slate-600 font-mono text-[8px] ml-1">[{q.strandCode || '---'}]</span></p>
                             <p className="text-[8px] font-medium text-slate-400 uppercase italic">Sub: {q.subStrand} <span className="text-slate-600 font-mono">[{q.subStrandCode || '---'}]</span></p>
                             <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mt-1">Ind: {q.indicator} <span className="text-indigo-400">[{q.indicatorCode || '---'}]</span></p>
                          </div>
                       </td>
                       <td className="px-6 py-6">
                          <p className="text-[11px] font-bold text-slate-200 uppercase leading-relaxed max-w-sm">"{q.questionText}"</p>
                          <div className="flex gap-4 mt-2">
                             <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Bloom's: {q.blooms}</span>
                             <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Weight: {q.weight}pt</span>
                          </div>
                       </td>
                       <td className="px-6 py-6 text-right pr-8">
                          {q.type === 'OBJECTIVE' ? (
                            <span className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 flex items-center justify-center font-black text-lg shadow-inner ml-auto">{q.correctKey}</span>
                          ) : (
                            <div className="max-w-[200px] ml-auto">
                               <p className="text-[9px] text-slate-500 italic truncate uppercase group-hover:whitespace-normal group-hover:bg-slate-900 group-hover:p-3 group-hover:rounded-xl transition-all">"{q.answerScheme}"</p>
                            </div>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <div className="p-8 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
         <div className="flex gap-10">
            <p>Total Evaluated Population: <span className="text-white ml-2">{filtered.length} Shards</span></p>
            <p className="border-l border-slate-800 pl-10">Subject Nodes: <span className="text-white ml-2">{subjects.length - 1} Units</span></p>
         </div>
         <p>SS-Map Master Registry — {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default QuestionRegistryView;

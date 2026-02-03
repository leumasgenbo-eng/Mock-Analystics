
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

interface HQQuestionRecord {
  id: string;
  external_id: string;
  hub_id: string;
  facilitator_email: string;
  subject: string;
  type: string;
  blooms_level: string;
  strand: string;
  indicator_code: string;
  question_text: string;
  correct_key: string;
  weight: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  created_at: string;
}

const QuestionRegistryView: React.FC = () => {
  const [questions, setQuestions] = useState<HQQuestionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const fetchGlobalRegistry = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('uba_question_bank')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) setQuestions(data as HQQuestionRecord[]);
    } catch (err) {
      console.error("Registry Retrieval Fault:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchGlobalRegistry(); }, []);

  const handleVerify = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'VERIFIED' ? 'PENDING' : 'VERIFIED';
    const { error } = await supabase.from('uba_question_bank').update({ status: nextStatus }).eq('id', id);
    if (!error) {
       setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: nextStatus } : q));
    }
  };

  const subjects = ['ALL', ...Array.from(new Set(questions.map(q => q.subject)))];

  const filtered = useMemo(() => {
    return questions.filter(q => {
       const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             q.facilitator_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             q.hub_id.toLowerCase().includes(searchTerm.toLowerCase());
       const matchesSubject = filterSubject === 'ALL' || q.subject === filterSubject;
       const matchesStatus = filterStatus === 'ALL' || q.status === filterStatus;
       return matchesSearch && matchesSubject && matchesStatus;
    });
  }, [questions, searchTerm, filterSubject, filterStatus]);

  if (isLoading) return (
    <div className="h-full flex flex-col items-center justify-center p-20 gap-8">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.6em] text-blue-400">Mapping Global Matrix Registry...</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 font-sans min-h-[700px] overflow-hidden">
      <div className="p-8 border-b border-slate-800 bg-slate-900/40 flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase flex items-center gap-3">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-lg"></div>
               Master Question Registry (HQ)
            </h2>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{filtered.length} Shards Loaded from Network Buffer</p>
         </div>
         <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-[9px] font-black text-white outline-none">
               {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-[9px] font-black text-white outline-none">
               <option value="ALL">ALL STATUS</option>
               <option value="PENDING">PENDING</option>
               <option value="VERIFIED">VERIFIED</option>
            </select>
            <div className="relative flex-1 md:w-64">
               <input 
                 type="text" 
                 placeholder="Search registry..." 
                 value={searchTerm} 
                 onChange={e=>setSearchTerm(e.target.value)}
                 className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/30"
               />
               <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6 md:p-10 no-scrollbar">
         <table className="w-full text-left border-collapse bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
            <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
               <tr>
                  <th className="px-8 py-5">Shard Identity</th>
                  <th className="px-6 py-5">Institutional Origin</th>
                  <th className="px-6 py-5">Cognitive Content</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-8 py-5 text-right">Verification</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
               {filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-blue-900/10 group transition-all">
                     <td className="px-8 py-6">
                        <div className="space-y-1">
                           <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-500/20 text-blue-400' : 'bg-indigo-500/20 text-indigo-400'}`}>{q.type}</span>
                           <p className="text-xs font-black text-white uppercase">{q.subject}</p>
                           <p className="text-[7px] font-mono text-slate-600 uppercase">ID: {q.external_id}</p>
                        </div>
                     </td>
                     <td className="px-6 py-6">
                        <div className="space-y-1">
                           <p className="text-[10px] font-black text-slate-300 uppercase leading-none">{q.hub_id}</p>
                           <p className="text-[8px] text-slate-500 truncate max-w-[120px]">{q.facilitator_email}</p>
                        </div>
                     </td>
                     <td className="px-6 py-6">
                        <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed line-clamp-2 italic">"{q.question_text}"</p>
                        <div className="flex gap-4 mt-2">
                           <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest">Bloom: {q.blooms_level}</span>
                           <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Key: {q.correct_key}</span>
                        </div>
                     </td>
                     <td className="px-6 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${q.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                           {q.status}
                        </span>
                     </td>
                     <td className="px-8 py-6 text-right">
                        <button 
                           onClick={() => handleVerify(q.id, q.status)}
                           className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg transition-all active:scale-95 ${q.status === 'VERIFIED' ? 'bg-slate-800 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
                        >
                           {q.status === 'VERIFIED' ? 'Revoke Shard' : 'Verify Shard'}
                        </button>
                     </td>
                  </tr>
               ))}
               {filtered.length === 0 && (
                  <tr>
                     <td colSpan={5} className="py-40 text-center opacity-20">
                        <p className="font-black uppercase text-sm tracking-[0.5em] text-white">No shards matching current filters</p>
                     </td>
                  </tr>
               )}
            </tbody>
         </table>
      </div>
      
      <footer className="p-8 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
         <div className="flex gap-10">
            <div className="text-center">
               <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Global Buffer</span>
               <span className="text-lg font-black text-white font-mono">{questions.length}</span>
            </div>
            <div className="text-center">
               <span className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Cleared Shards</span>
               <span className="text-lg font-black text-emerald-400 font-mono">{questions.filter(q=>q.status==='VERIFIED').length}</span>
            </div>
         </div>
         <p className="text-[9px] font-black text-slate-800 uppercase tracking-[1em] italic">United Baylor Master Bank v9.5</p>
      </footer>
    </div>
  );
};

export default QuestionRegistryView;

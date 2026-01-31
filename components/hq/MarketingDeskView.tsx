import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData } from '../../types';

const MarketingDeskView: React.FC = () => {
  const [submissions, setSubmissions] = useState<ForwardingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<ForwardingData | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('uba_persistence').select('payload').like('id', 'forward_%');
    if (data) setSubmissions(data.map(d => d.payload as ForwardingData));
    setIsLoading(false);
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const stats = useMemo(() => {
    let pupils = 0, facs = 0, revenue = 0;
    submissions.forEach(s => {
       // Explicitly cast Object.values(s.pupilPayments || {}) to any[] to avoid 'unknown' type issues with .length and .reduce
       const ps = Object.values(s.pupilPayments || {}) as any[];
       pupils += ps.length;
       revenue += ps.reduce((sum, p: any) => sum + (p.particulars?.amount || 0), 0);
       facs += Object.keys(s.facilitatorPayments || {}).length;
    });
    return { pupils, facs, revenue, pending: submissions.filter(s=>s.approvalStatus==='PENDING').length };
  }, [submissions]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 font-sans bg-slate-950">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Network Marketing Control</h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Revenue & Feedback Acquisition Hub</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full xl:w-auto">
           {[
             { label: 'Verified Pupils', val: stats.pupils, color: 'text-blue-400' },
             { label: 'Active Faculty', val: stats.facs, color: 'text-indigo-400' },
             { label: 'Est. Revenue', val: `GHS ${Math.round(stats.revenue).toLocaleString()}`, color: 'text-emerald-400' },
             { label: 'Pending Nodes', val: stats.pending, color: 'text-amber-400' }
           ].map((s, i) => (
             <div key={i} className="bg-slate-900 border border-slate-800 px-8 py-5 rounded-3xl text-center shadow-xl">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">{s.label}</span>
                <span className={`text-2xl font-black font-mono ${s.color}`}>{s.val}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1 overflow-hidden">
         <div className="xl:col-span-4 space-y-6 overflow-y-auto max-h-full pr-2 custom-scrollbar">
            <div className="flex justify-between items-center px-4 sticky top-0 bg-slate-950 py-2 z-10">
              <h3 className="text-xs font-black uppercase text-blue-500 tracking-widest">Incoming Data Shards</h3>
              <button onClick={fetchSubmissions} className="text-[9px] font-black text-slate-600 uppercase hover:text-white transition-colors">Refresh</button>
            </div>
            {submissions.map(sub => (
               <button key={sub.schoolId} onClick={() => setSelectedSub(sub)} className={`w-full text-left p-8 rounded-[2.5rem] border transition-all ${selectedSub?.schoolId === sub.schoolId ? 'bg-blue-600 border-blue-400 shadow-2xl scale-[1.02]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[9px] font-mono text-white/40">{sub.schoolId}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded ${sub.approvalStatus === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{sub.approvalStatus}</span>
                  </div>
                  <h4 className="text-lg font-black text-white uppercase truncate">{sub.schoolName}</h4>
                  <div className="mt-4 flex gap-4 text-[9px] font-black uppercase text-slate-400">
                    <span>{Object.keys(sub.pupilPayments || {}).length} Pupils</span>
                    <span>•</span>
                    <span>{Object.keys(sub.facilitatorPayments || {}).length} Staff</span>
                  </div>
               </button>
            ))}
            {submissions.length === 0 && <div className="text-center py-20 text-slate-700 font-black uppercase text-[10px]">No submissions detected</div>}
         </div>
         
         <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-inner flex flex-col overflow-y-auto custom-scrollbar">
            {selectedSub ? (
               <div className="space-y-10 animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-8">
                    <div>
                      <h4 className="text-3xl font-black text-white uppercase">{selectedSub.schoolName} Appraisal</h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-2 uppercase tracking-widest">Shard ID: forward_{selectedSub.schoolId}</p>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">Synced: {new Date(selectedSub.submissionTimestamp).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Institutional Communication</label>
                        <div className="bg-slate-950 p-8 rounded-[2rem] border border-slate-800 italic text-slate-400 text-sm leading-relaxed shadow-lg min-h-[150px]">
                          "{selectedSub.feedback || 'No institutional communication pack provided.'}"
                        </div>
                     </div>
                     <div className="space-y-6">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Financial Breakdown</label>
                        <div className="grid grid-cols-1 gap-4">
                           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Pupil Revenue</span>
                              <span className="text-xl font-black text-white font-mono">GHS {Object.values(selectedSub.pupilPayments || {}).reduce((sum, p:any)=>sum+(p.particulars?.amount||0), 0).toLocaleString()}</span>
                           </div>
                           <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex justify-between items-center">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Faculty Load</span>
                              <span className="text-xl font-black text-white font-mono">{Object.keys(selectedSub.facilitatorPayments || {}).length} Verified</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="pt-8 flex justify-end gap-4">
                     <button className="bg-slate-950 text-slate-500 hover:text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase border border-slate-800 transition-all">Reject Shard</button>
                     <button className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl transition-all">Verify & Approve</button>
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center opacity-20 text-center space-y-6">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-700"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  <p className="text-white font-black uppercase text-sm tracking-[0.6em]">Awaiting Institutional Shard Selection</p>
               </div>
            )}
         </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default MarketingDeskView;
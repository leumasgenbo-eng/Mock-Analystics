import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData, StaffRewardTrade } from '../../types';

const MarketingDeskView: React.FC = () => {
  const [submissions, setSubmissions] = useState<ForwardingData[]>([]);
  const [rewardTrades, setRewardTrades] = useState<StaffRewardTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<ForwardingData | null>(null);
  const [activeMode, setActiveMode] = useState<'FEEDBACK' | 'REWARDS'>('FEEDBACK');

  const fetchGlobalData = async () => {
    setIsLoading(true);
    // Fetch Feedbacks
    const { data: fwds } = await supabase.from('uba_persistence').select('payload').like('id', 'forward_%');
    if (fwds) setSubmissions(fwds.map(d => d.payload as ForwardingData));
    
    // Fetch Reward Trades
    const { data: rewards } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_staff_rewards').maybeSingle();
    if (rewards?.payload) setRewardTrades(rewards.payload as StaffRewardTrade[]);
    
    setIsLoading(false);
  };

  useEffect(() => { fetchGlobalData(); }, []);

  const handleRankTrade = (id: string, rank: number) => {
    // Fix: Explicitly cast to StaffRewardTrade to prevent 'status' type widening to string
    setRewardTrades(prev => prev.map(t => t.id === id ? ({ ...t, qualityRank: rank, status: 'RANKED' } as StaffRewardTrade) : t));
  };

  const handleApproveTrade = async (id: string, amount: number) => {
    // Fix: Explicitly cast to StaffRewardTrade to satisfy state type requirement and prevent status widening
    const nextTrades = rewardTrades.map(t => t.id === id ? ({ ...t, approvedAmount: amount, status: 'APPROVED', approvalTimestamp: new Date().toISOString() } as StaffRewardTrade) : t);
    setRewardTrades(nextTrades);
    await supabase.from('uba_persistence').upsert({
      id: 'global_staff_rewards',
      payload: nextTrades,
      last_updated: new Date().toISOString()
    });
    alert("REWARD SHARD APPROVED AND MIRRORED.");
  };

  const stats = useMemo(() => {
    let pupils = 0, revenue = 0;
    submissions.forEach(s => {
       const ps = Object.values(s.pupilPayments || {}) as any[];
       pupils += ps.length;
       revenue += ps.reduce((sum, p: any) => sum + (p.particulars?.amount || 0), 0);
    });
    return { pupils, revenue, pendingRewards: rewardTrades.filter(t => t.status === 'PENDING' || t.status === 'RANKED').length };
  }, [submissions, rewardTrades]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 font-sans bg-slate-950">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Marketing Control</h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Revenue & Instructional Rewards Hub</p>
        </div>
        
        <div className="flex gap-4">
           <button onClick={() => setActiveMode('FEEDBACK')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeMode === 'FEEDBACK' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500'}`}>Feedback Stream</button>
           <button onClick={() => setActiveMode('REWARDS')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeMode === 'REWARDS' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500'}`}>Reward Board ({stats.pendingRewards})</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1 overflow-hidden">
         {activeMode === 'FEEDBACK' ? (
            <>
               <div className="xl:col-span-4 space-y-6 overflow-y-auto max-h-full pr-2 custom-scrollbar">
                  {submissions.map(sub => (
                     <button key={sub.schoolId} onClick={() => setSelectedSub(sub)} className={`w-full text-left p-8 rounded-[2.5rem] border transition-all ${selectedSub?.schoolId === sub.schoolId ? 'bg-blue-600 border-blue-400 shadow-2xl scale-[1.02]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                        <h4 className="text-lg font-black text-white uppercase truncate">{sub.schoolName}</h4>
                        <p className="text-[8px] font-mono text-white/40 mt-2">{sub.schoolId}</p>
                     </button>
                  ))}
               </div>
               <div className="xl:col-span-8 bg-slate-900 border border-slate-800 rounded-[3rem] p-12 shadow-inner overflow-y-auto custom-scrollbar">
                  {selectedSub ? (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                       <h4 className="text-3xl font-black text-white uppercase">{selectedSub.schoolName} Feedback</h4>
                       <div className="bg-slate-950 p-10 rounded-[2rem] border border-slate-800 italic text-slate-400 text-lg leading-relaxed">
                          "{selectedSub.feedback || 'No content.'}"
                       </div>
                    </div>
                  ) : <div className="h-full flex items-center justify-center opacity-20"><p className="text-white font-black uppercase text-xs tracking-widest">Select Institutional Shard</p></div>}
               </div>
            </>
         ) : (
            <div className="xl:col-span-12 bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-inner overflow-y-auto custom-scrollbar">
               <div className="space-y-8">
                  <div className="flex justify-between items-center">
                     <h3 className="text-xl font-black text-white uppercase">Instructional Trade Ledger</h3>
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Shard Pack Valuation Node</span>
                  </div>
                  <div className="grid grid-cols-1 gap-6">
                     {rewardTrades.map(tr => (
                        <div key={tr.id} className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col xl:flex-row justify-between items-center gap-10 hover:border-blue-500/30 transition-all">
                           <div className="flex items-center gap-6 flex-1">
                              <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center font-black text-blue-500 border border-slate-800 shadow-inner">
                                 {tr.submissionCount}
                              </div>
                              <div className="space-y-1">
                                 <h4 className="text-lg font-black text-white uppercase">{tr.staffName}</h4>
                                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tr.subject} • {tr.schoolName}</p>
                                 <p className="text-[8px] font-mono text-slate-600">{tr.requestTimestamp}</p>
                              </div>
                           </div>
                           
                           {/* Ranking Node */}
                           <div className="flex items-center gap-4">
                              <span className="text-[8px] font-black text-slate-500 uppercase">Quality Rank:</span>
                              <div className="flex gap-1">
                                 {[1,2,3,4,5].map(n => (
                                    <button key={n} onClick={() => handleRankTrade(tr.id, n)} className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${tr.qualityRank === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-600 hover:text-white'}`}>{n}</button>
                                 ))}
                              </div>
                           </div>

                           <div className="flex items-center gap-6">
                              <div className="text-right">
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Status</span>
                                 <span className={`text-[10px] font-black px-4 py-1 rounded-full uppercase ${tr.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-400'}`}>{tr.status}</span>
                              </div>
                              {tr.status !== 'APPROVED' ? (
                                <button 
                                  onClick={() => {
                                     const amt = prompt("Enter Approved Amount (GHS):", "10");
                                     if (amt) handleApproveTrade(tr.id, parseFloat(amt));
                                  }}
                                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl transition-all"
                                >
                                  Evaluate & Approve
                                </button>
                              ) : (
                                <div className="bg-slate-900 px-6 py-3 rounded-xl border border-slate-800">
                                   <span className="text-[12px] font-black text-emerald-400 font-mono">GHS {tr.approvedAmount}</span>
                                </div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default MarketingDeskView;
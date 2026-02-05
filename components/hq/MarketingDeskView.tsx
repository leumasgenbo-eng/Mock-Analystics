
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData, StaffRewardTrade, MasterQuestion, BloomsScale } from '../../types';

const MarketingDeskView: React.FC = () => {
  const [submissions, setSubmissions] = useState<ForwardingData[]>([]);
  const [rewardTrades, setRewardTrades] = useState<StaffRewardTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<ForwardingData | null>(null);
  const [activeMode, setActiveMode] = useState<'FEEDBACK' | 'REWARDS'>('FEEDBACK');
  
  // Valuation Analysis State
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, { suggested: number, breakdown: string[] }>>({});

  const fetchGlobalData = async () => {
    setIsLoading(true);
    const { data: fwds } = await supabase.from('uba_persistence').select('payload').like('id', 'forward_%');
    if (fwds) setSubmissions(fwds.map(d => d.payload as ForwardingData));
    
    const { data: rewards } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_staff_rewards').maybeSingle();
    if (rewards?.payload) setRewardTrades(rewards.payload as StaffRewardTrade[]);
    
    setIsLoading(false);
  };

  useEffect(() => { fetchGlobalData(); }, []);

  // IIVE Engine: Similarity & Value Calculation
  const runIIVEAudit = async (trade: StaffRewardTrade) => {
    setAnalyzingId(trade.id);
    const BASE_RATE = 2.00; // GHS per original question
    
    try {
      // 1. Fetch current subject master bank for comparison
      const bankId = `master_bank_${trade.subject.replace(/\s+/g, '')}`;
      const { data: bankData } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      const masterBank = (bankData?.payload as MasterQuestion[]) || [];

      // 2. Fetch the specific questions in this trade (Likely Desk records)
      const { data: staffData } = await supabase.from('uba_persistence').select('payload')
        .eq('id', `likely_${trade.subject.replace(/\s+/g, '')}_${trade.staffName.replace(/\s+/g, '')}`).maybeSingle();
      const staffLikelyQs = (staffData?.payload as MasterQuestion[]) || [];
      const packQs = staffLikelyQs.filter(q => trade.questionIds.includes(q.id));

      let totalValue = 0;
      const report: string[] = [];

      const getWordSet = (txt: string) => new Set(txt.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));

      packQs.forEach(q => {
        const currentSet = getWordSet(q.questionText);
        let maxSim = 0;
        let isExact = false;

        // Compare against Master Bank
        masterBank.forEach(mq => {
          if (mq.id === q.id) return;
          if (mq.questionText.trim().toLowerCase() === q.questionText.trim().toLowerCase()) {
            isExact = true;
          } else {
            const mSet = getWordSet(mq.questionText);
            const intersect = new Set([...currentSet].filter(x => mSet.has(x)));
            const sim = intersect.size / Math.max(currentSet.size, mSet.size);
            if (sim > maxSim) maxSim = sim;
          }
        });

        let qValue = 0;
        if (isExact) {
          qValue = 0;
          report.push(`[${q.blooms}] EXACT MATCH FOUND IN CLOUD -> GHS 0.00`);
        } else if (maxSim > 0.5) {
          qValue = 0.001;
          report.push(`[${q.blooms}] SIMILARITY: ${(maxSim * 100).toFixed(0)}% (>50%) -> GHS 0.001`);
        } else {
          // Bloom's Value Multiplier
          const multipliers: Record<BloomsScale, number> = {
            'Knowledge': 1, 'Understanding': 1.2, 'Application': 2.5,
            'Analysis': 3.5, 'Synthesis': 5, 'Evaluation': 6
          };
          const mult = multipliers[q.blooms] || 1;
          qValue = BASE_RATE * mult;
          report.push(`[${q.blooms}] ORIGINAL SHARD -> GHS ${qValue.toFixed(2)}`);
        }
        totalValue += qValue;
      });

      setAnalysisResults(prev => ({ ...prev, [trade.id]: { suggested: totalValue, breakdown: report } }));
    } catch (e) {
      alert("Valuation Engine Error: Handshake with cloud bank failed.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleRankTrade = (id: string, rank: number) => {
    setRewardTrades(prev => prev.map(t => t.id === id ? ({ ...t, qualityRank: rank, status: 'RANKED' } as StaffRewardTrade) : t));
  };

  const handleApproveTrade = async (id: string, amount: number) => {
    const trade = rewardTrades.find(t => t.id === id);
    if (!trade) return;

    try {
      // 1. Identify Facilitator Email (from UBA Identities if not in trade)
      const { data: ident } = await supabase.from('uba_identities')
        .select('email, monetary_balance, hub_id')
        .eq('full_name', trade.staffName.toUpperCase())
        .eq('role', 'facilitator')
        .maybeSingle();

      if (!ident) throw new Error("Facilitator Identity not found in Global Shard.");

      const facilitatorEmail = ident.email;
      const hubId = ident.hub_id;

      // 2. Perform Transaction Mirroring to Ledger
      await supabase.from('uba_transaction_ledger').insert({
        identity_email: facilitatorEmail,
        hub_id: hubId,
        event_category: 'TRADE_EXCHANGE',
        type: 'CREDIT',
        asset_type: 'MONETARY_GHS',
        amount: amount,
        description: `Trade Approved: HQ Audit confirmed value for ${trade.questionIds.length} shards in ${trade.subject}.`
      });

      // 3. Update Balance Shards
      const nextBal = (ident.monetary_balance || 0) + amount;
      await supabase.from('uba_identities').update({ monetary_balance: nextBal }).eq('email', facilitatorEmail);
      await supabase.from('uba_facilitators').update({ monetary_balance: nextBal }).eq('email', facilitatorEmail);

      // 4. Update Trade Record
      const nextTrades = rewardTrades.map(t => t.id === id ? ({ 
        ...t, 
        approvedAmount: amount, 
        status: 'APPROVED', 
        approvalTimestamp: new Date().toISOString() 
      } as StaffRewardTrade) : t);
      
      setRewardTrades(nextTrades);
      
      await supabase.from('uba_persistence').upsert({
        id: 'global_staff_rewards',
        payload: nextTrades,
        last_updated: new Date().toISOString()
      });

      alert(`REWARD SHARD APPROVED: GHS ${amount.toFixed(2)} mirrored to staff vault.`);
    } catch (err: any) {
      alert(`Approval Error: ${err.message}`);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 font-sans bg-slate-950">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter">Marketing Control</h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Revenue & Instructional Integrity Hub</p>
        </div>
        
        <div className="flex gap-4">
           <button onClick={() => setActiveMode('FEEDBACK')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeMode === 'FEEDBACK' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-50'}`}>Feedback Stream</button>
           <button onClick={() => setActiveMode('REWARDS')} className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeMode === 'REWARDS' ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-50'}`}>Reward Board ({rewardTrades.filter(t=>t.status!=='APPROVED').length})</button>
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
                          "{selectedSub.feedback || 'No manual feedback recorded during sync.'}"
                       </div>
                    </div>
                  ) : <div className="h-full flex items-center justify-center opacity-20"><p className="text-white font-black uppercase text-xs tracking-widest">Select Institutional Shard</p></div>}
               </div>
            </>
         ) : (
            <div className="xl:col-span-12 bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-inner overflow-y-auto custom-scrollbar">
               <div className="space-y-8">
                  <div className="flex justify-between items-center bg-slate-950 p-6 rounded-3xl border border-slate-800">
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-white uppercase">Instructional Integrity Ledger</h3>
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">IIVE Engine: Plagiarism & Cognitive Value Audit</p>
                     </div>
                     <div className="flex gap-4 items-center">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                           <span className="text-[8px] font-black text-slate-400 uppercase">Exact (GHS 0)</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                           <span className="text-[8px] font-black text-slate-400 uppercase">Similar (GHS 0.001)</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                           <span className="text-[8px] font-black text-slate-400 uppercase">Bloom's Adjusted (High Value)</span>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                     {rewardTrades.map(tr => {
                        const analysis = analysisResults[tr.id];
                        return (
                          <div key={tr.id} className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 flex flex-col gap-8 hover:border-blue-500/30 transition-all">
                             <div className="flex flex-col xl:flex-row justify-between items-center gap-10">
                                <div className="flex items-center gap-6 flex-1">
                                   <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center font-black text-blue-500 border border-slate-800 shadow-inner">
                                      {tr.submissionCount}
                                   </div>
                                   <div className="space-y-1">
                                      <h4 className="text-lg font-black text-white uppercase">{tr.staffName}</h4>
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tr.subject} • {tr.schoolName}</p>
                                      <p className="text-[8px] font-mono text-slate-600">ID: {tr.id}</p>
                                   </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                   <span className="text-[8px] font-black text-slate-500 uppercase">Staff Rating:</span>
                                   <div className="flex gap-1">
                                      {[1,2,3,4,5].map(n => (
                                         <button key={n} onClick={() => handleRankTrade(tr.id, n)} className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${tr.qualityRank === n ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-900 text-slate-600 hover:text-white'}`}>{n}</button>
                                      ))}
                                   </div>
                                </div>

                                <div className="flex items-center gap-6">
                                   <div className="text-right">
                                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Audit Status</span>
                                      <span className={`text-[10px] font-black px-4 py-1 rounded-full uppercase ${tr.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-amber-500/20 text-amber-400'}`}>{tr.status}</span>
                                   </div>
                                   
                                   {tr.status !== 'APPROVED' && (
                                     <button 
                                       onClick={() => runIIVEAudit(tr)}
                                       disabled={analyzingId === tr.id}
                                       className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl transition-all"
                                     >
                                       {analyzingId === tr.id ? 'Auditing Cloud...' : 'Run Integrity Audit'}
                                     </button>
                                   )}
                                </div>
                             </div>

                             {/* IIVE Analysis Result Pane */}
                             {analysis && tr.status !== 'APPROVED' && (
                               <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-8 animate-in slide-in-from-top-4">
                                  <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-8 border-b border-white/5 pb-8">
                                     <div className="space-y-4 flex-1">
                                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Shard Analysis Report</h5>
                                        <div className="space-y-2">
                                           {analysis.breakdown.map((line, li) => (
                                              <p key={li} className="text-[10px] font-mono text-slate-400 border-l-2 border-slate-800 pl-4">{line}</p>
                                           ))}
                                        </div>
                                     </div>
                                     <div className="bg-slate-950 p-6 rounded-[2rem] border border-blue-500/20 text-center min-w-[220px]">
                                        <span className="text-[8px] font-black text-slate-500 uppercase block mb-2">IIVE Suggested Reward</span>
                                        <p className="text-3xl font-black text-emerald-400 font-mono">GHS {analysis.suggested.toFixed(2)}</p>
                                        <button 
                                          onClick={() => handleApproveTrade(tr.id, analysis.suggested)}
                                          className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all"
                                        >
                                          Approve Audit Value
                                        </button>
                                     </div>
                                  </div>
                                  <div className="flex gap-4">
                                     <button 
                                       onClick={() => {
                                          const amt = prompt("Enter Custom Valued Amount (GHS):", analysis.suggested.toString());
                                          if (amt) handleApproveTrade(tr.id, parseFloat(amt));
                                       }}
                                       className="bg-white/5 hover:bg-white/10 text-slate-400 px-6 py-2 rounded-xl font-black text-[9px] uppercase border border-white/10"
                                     >
                                        Override Value
                                     </button>
                                  </div>
                               </div>
                             )}

                             {tr.status === 'APPROVED' && (
                               <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl flex justify-between items-center">
                                  <div className="space-y-1">
                                     <span className="text-[8px] font-black text-emerald-500 uppercase">Shard Disbursed</span>
                                     <p className="text-[10px] text-slate-400 italic">Confirmed Reward mirrored to Facilitator Desk.</p>
                                  </div>
                                  <div className="bg-slate-900 px-8 py-3 rounded-xl border border-slate-800">
                                     <span className="text-[14px] font-black text-emerald-400 font-mono">GHS {tr.approvedAmount?.toFixed(2)}</span>
                                  </div>
                               </div>
                             )}
                          </div>
                        );
                     })}
                     {rewardTrades.length === 0 && (
                        <div className="py-40 text-center opacity-20">
                           <p className="text-white font-black uppercase text-sm tracking-[0.5em]">Awaiting instructional trade requests</p>
                        </div>
                     )}
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

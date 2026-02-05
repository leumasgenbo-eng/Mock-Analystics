
import React, { useState, useEffect, useMemo } from 'react';
import { StaffAssignment, GlobalSettings, StaffRewardTrade, MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface Transaction {
  type: 'CREDIT' | 'DEBIT';
  asset_type: 'MERIT_TOKEN' | 'MONETARY_GHS';
  amount: number;
  description: string;
  timestamp: string;
}

interface FacilitatorAccountHubProps {
  activeFacilitator: StaffAssignment;
  settings: GlobalSettings;
}

const FacilitatorAccountHub: React.FC<FacilitatorAccountHubProps> = ({ activeFacilitator, settings }) => {
  const [ledger, setLedger] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrading, setIsTrading] = useState(false);

  const fetchLedger = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('uba_transaction_ledger')
      .select('*')
      .eq('identity_email', activeFacilitator.email)
      .order('timestamp', { ascending: false });
    
    if (data) setLedger(data as Transaction[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLedger();
  }, [activeFacilitator.email]);

  const totals = useMemo(() => {
    const meritLogs = ledger.filter(t => t.asset_type === 'MERIT_TOKEN');
    const credits = meritLogs.filter(t => t.type === 'CREDIT').reduce((a, b) => a + b.amount, 0);
    const debits = meritLogs.filter(t => t.type === 'DEBIT').reduce((a, b) => a + b.amount, 0);
    return { credits, debits, balance: credits - debits };
  }, [ledger]);

  const handleInitiateTrade = async () => {
    const currentBalance = totals.balance;
    if (currentBalance < 10) return alert("INSUFFICIENT SHARDS: Minimum trade threshold is 10 merit credits.");

    const tradeAmount = Math.floor(currentBalance / 10) * 10;
    if (!window.confirm(`TRADE PROTOCOL: Convert ${tradeAmount} Question Merit Shards for HQ Audit? \n\nExpected Value: ~GHS ${(tradeAmount/10).toFixed(2)} (subject to plagiarism audit).`)) return;

    setIsTrading(true);
    try {
      const { data: bankData } = await supabase.from('uba_persistence').select('payload')
        .eq('id', `likely_${activeFacilitator.taughtSubject?.replace(/\s+/g, '')}_${activeFacilitator.name.replace(/\s+/g, '')}`).maybeSingle();
      
      const qIds = (bankData?.payload as MasterQuestion[] || []).map(q => q.id).slice(0, tradeAmount);

      // 1. Debit Local Merit Table
      const nextMerit = currentBalance - tradeAmount;
      await supabase.from('uba_identities').update({ merit_balance: nextMerit }).eq('email', activeFacilitator.email);
      await supabase.from('uba_facilitators').update({ merit_balance: nextMerit }).eq('email', activeFacilitator.email);

      // 2. Mirror Debit to Transaction Ledger
      await supabase.from('uba_transaction_ledger').insert({
        identity_email: activeFacilitator.email,
        hub_id: settings.schoolNumber,
        event_category: 'TRADE_EXCHANGE',
        type: 'DEBIT',
        asset_type: 'MERIT_TOKEN',
        amount: tradeAmount,
        description: `Trade Initialized: ${tradeAmount} Shards submitted for HQ Quality Audit.`
      });

      // 3. Register Trade in Global Shard
      const { data: rewardsShard } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_staff_rewards').maybeSingle();
      const currentTrades = (rewardsShard?.payload as StaffRewardTrade[]) || [];
      
      const newTrade: StaffRewardTrade = {
        id: `TR-${Date.now()}`,
        staffName: activeFacilitator.name,
        subject: activeFacilitator.taughtSubject || 'General',
        schoolName: settings.schoolName,
        questionIds: qIds,
        submissionCount: qIds.length,
        status: 'PENDING'
      };

      await supabase.from('uba_persistence').upsert({
        id: 'global_staff_rewards',
        payload: [...currentTrades, newTrade],
        last_updated: new Date().toISOString()
      });

      await fetchLedger();
      alert("TRADE HANDSHAKE EXECUTED: Shards sent to HQ Desk for valuation.");
    } catch (e: any) {
      alert(`Trade Fault: ${e.message}`);
    } finally {
      setIsTrading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 font-sans max-w-6xl mx-auto">
      
      {/* Dynamic Wallet Header */}
      <section className="bg-slate-950 text-white p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="space-y-4">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] block">Verified Instructional Wallet</span>
               <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{activeFacilitator.name}</h2>
               <div className="flex gap-4">
                  <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                     <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Vault Balance</span>
                     <p className="text-xl font-black text-emerald-400 font-mono">GHS {activeFacilitator.account?.monetaryCredits.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                     <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Question Shards</span>
                     <p className="text-xl font-black text-blue-400 font-mono">{totals.balance.toFixed(0)} Credits</p>
                  </div>
               </div>
            </div>
            <div className="w-full md:w-64 space-y-4">
               <button 
                 onClick={handleInitiateTrade}
                 disabled={isTrading || totals.balance < 10}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-40"
               >
                  {isTrading ? 'Syncing...' : 'Trade Shards for Rewards'}
               </button>
               <div className="bg-white/5 p-5 rounded-3xl border border-white/10 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Total Earned</span>
                  <span className="text-sm font-black text-emerald-400">+{totals.credits}</span>
               </div>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Account History Ledger */}
         <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden flex flex-col h-[600px]">
            <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction Shard History</h3>
               <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Real-time Shard Mirror</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
               {isLoading ? (
                  <div className="h-full flex items-center justify-center opacity-30">
                     <p className="font-black uppercase text-xs animate-pulse">Establishing SQL Handshake...</p>
                  </div>
               ) : ledger.length > 0 ? ledger.map((t, i) => (
                  <div key={i} className="bg-white border border-gray-100 p-6 rounded-3xl flex items-center justify-between hover:shadow-md transition-all group">
                     <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner ${t.type === 'CREDIT' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                           {t.type === 'CREDIT' ? '↑' : '↓'}
                        </div>
                        <div className="space-y-1">
                           <p className="text-xs font-black text-slate-800 uppercase leading-none">{t.description}</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleString()}</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <p className={`text-lg font-black font-mono ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-red-600'}`}>
                           {t.type === 'CREDIT' ? '+' : '-'}{t.amount}
                        </p>
                        <span className="text-[8px] font-black text-slate-400 uppercase">{t.asset_type.replace('_', ' ')}</span>
                     </div>
                  </div>
               )) : (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/></svg>
                     <p className="text-[10px] font-black uppercase tracking-widest mt-4">No account activity recorded</p>
                  </div>
               )}
            </div>
         </div>

         {/* Protocol Rules & Royalty Split */}
         <div className="lg:col-span-4 space-y-8">
            <div className="bg-indigo-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-6">
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Merit Conversion Protocol</h4>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-sm">1:5</div>
                     <p className="text-[10px] font-bold uppercase leading-relaxed text-indigo-100">Every verified question upload grants 5 Merit Tokens.</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-sm">10:1</div>
                     <p className="text-[10px] font-bold uppercase leading-relaxed text-indigo-100">Request Vault Trade for every 10 Merit Shards.</p>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-xl space-y-6">
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 border-b border-gray-100 pb-4">Transactional Mirroring Active</h4>
               <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center gap-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                  <p className="text-[9px] font-bold text-emerald-800 uppercase leading-snug">All token and monetary movements are mirrored to the UBA Master Transaction Ledger for network audit.</p>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FacilitatorAccountHub;

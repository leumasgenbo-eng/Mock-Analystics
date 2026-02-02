
import React, { useState, useEffect, useMemo } from 'react';
import { StaffAssignment, GlobalSettings } from '../../types';
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

  useEffect(() => {
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
    fetchLedger();
  }, [activeFacilitator.email]);

  const totals = useMemo(() => {
    const merit = ledger.filter(t => t.asset_type === 'MERIT_TOKEN');
    const credits = merit.filter(t => t.type === 'CREDIT').reduce((a, b) => a + b.amount, 0);
    const debits = merit.filter(t => t.type === 'DEBIT').reduce((a, b) => a + b.amount, 0);
    return { credits, debits, balance: credits - debits };
  }, [ledger]);

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
                     <p className="text-xl font-black text-emerald-400 font-mono">GHS {activeFacilitator.account?.monetaryCredits.toFixed(2)}</p>
                  </div>
                  <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                     <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Question Balance</span>
                     <p className="text-xl font-black text-blue-400 font-mono">{totals.balance.toFixed(0)} Shards</p>
                  </div>
               </div>
            </div>
            <div className="w-full md:w-64 space-y-4">
               <div className="bg-white/5 p-5 rounded-3xl border border-white/10 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Credits (Earned)</span>
                  <span className="text-sm font-black text-emerald-400">+{totals.credits}</span>
               </div>
               <div className="bg-white/5 p-5 rounded-3xl border border-white/10 flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Debits (Used)</span>
                  <span className="text-sm font-black text-red-400">-{totals.debits}</span>
               </div>
            </div>
         </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* Account History Ledger */}
         <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden flex flex-col h-[600px]">
            <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Transaction Shard History</h3>
               <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Real-time Node</span>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
               {isLoading ? (
                  <div className="h-full flex items-center justify-center opacity-30">
                     <p className="font-black uppercase text-xs animate-pulse">Syncing Ledger...</p>
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
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">Reward Protocol</h4>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-sm">1:5</div>
                     <p className="text-[10px] font-bold uppercase leading-relaxed text-indigo-100">One Question submitted returns 5 Question Credits.</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-sm">10:1</div>
                     <p className="text-[10px] font-bold uppercase leading-relaxed text-indigo-100">Trade 10 Questions for GHS 1.00 Vault value.</p>
                  </div>
               </div>
            </div>

            <div className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-xl space-y-6">
               <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 border-b border-gray-100 pb-4">Usage Royalty (10-40-50)</h4>
               <div className="space-y-5">
                  <div className="space-y-2">
                     <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                        <span>Creator (You)</span>
                        <span className="text-emerald-600">50%</span>
                     </div>
                     <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: '50%' }}></div>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                        <span>SuperAdmin (HQ)</span>
                        <span className="text-blue-600">40%</span>
                     </div>
                     <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: '40%' }}></div>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                        <span>School Admin</span>
                        <span className="text-indigo-600">10%</span>
                     </div>
                     <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: '10%' }}></div>
                     </div>
                  </div>
               </div>
               <p className="text-[8px] text-gray-400 font-bold uppercase leading-relaxed pt-4 italic border-t border-gray-50">"Retain ownership while monetizing instructional assets across the network."</p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default FacilitatorAccountHub;

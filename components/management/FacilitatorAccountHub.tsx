
import React, { useMemo } from 'react';
import { StaffAssignment, GlobalSettings, StaffRewardTrade } from '../../types';

interface FacilitatorAccountHubProps {
  activeFacilitator: StaffAssignment;
  settings: GlobalSettings;
}

const FacilitatorAccountHub: React.FC<FacilitatorAccountHubProps> = ({ activeFacilitator, settings }) => {
  const account = useMemo(() => {
    return activeFacilitator.account || {
      meritTokens: 0,
      monetaryCredits: 0,
      totalSubmissions: 0,
      unlockedQuestionIds: []
    };
  }, [activeFacilitator]);

  const stats = [
    { label: 'Merit Tokens', val: account.meritTokens, color: 'text-blue-600', sub: 'For Acquiring Shards', icon: '💎' },
    { label: 'Vault Balance', val: `GHS ${account.monetaryCredits.toFixed(2)}`, color: 'text-emerald-600', sub: 'Exchange & Royalty Share', icon: '💰' },
    { label: 'Curated Items', val: account.totalSubmissions, color: 'text-indigo-600', sub: 'Total Ingested Shards', icon: '⚡' }
  ];

  const royaltyShare = {
    facilitator: 50,
    superAdmin: 40,
    schoolAdmin: 10
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans max-w-6xl mx-auto">
      {/* Wallet Header */}
      <section className="bg-slate-950 text-white p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="space-y-4 text-center md:text-left">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] block">Authorized Instructional Vault</span>
               <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">{activeFacilitator.name}</h2>
               <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <span className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-blue-300">Subject Node: {activeFacilitator.taughtSubject || 'GENERAL'}</span>
                  <span className="bg-white/10 px-4 py-2 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-400">Status: VERIFIED</span>
               </div>
            </div>
            <div className="flex gap-6">
               <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[3rem] shadow-xl backdrop-blur-xl min-w-[180px]">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Instructional Credit</span>
                  <p className="text-3xl font-black text-emerald-400 font-mono">GHS {account.monetaryCredits.toFixed(2)}</p>
               </div>
            </div>
         </div>
      </section>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-xl space-y-4 hover:border-blue-400 transition-all group">
             <div className="flex justify-between items-start">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">{s.icon}</div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
             </div>
             <div className="space-y-1">
                <p className={`text-4xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.sub}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Conversion & Value Logic */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <section className="bg-blue-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <h3 className="text-xl font-black uppercase tracking-widest text-blue-300 mb-8 flex items-center gap-3">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20m10-10H2"/></svg>
               Value Proposition Matrix
            </h3>
            <div className="space-y-8">
               <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-400">Merit Exchange Ratio</h4>
                  <p className="text-sm font-medium leading-relaxed italic opacity-80">"Each shard submitted grants you the authority to acquire five shards from the network master bank."</p>
                  <div className="pt-4 flex items-center gap-4">
                     <span className="text-xl font-black text-white font-mono">1 SUBMITTED</span>
                     <span className="text-blue-400 font-black">→</span>
                     <span className="text-xl font-black text-emerald-400 font-mono">5 TOKENS</span>
                  </div>
               </div>
               <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Monetary Exchange Protocol</h4>
                  <p className="text-sm font-medium leading-relaxed italic opacity-80">"Permanent exchange of instructional shards to the Hub for monetary valuation."</p>
                  <div className="pt-4 flex items-center gap-4">
                     <span className="text-xl font-black text-white font-mono">10 SHARDS</span>
                     <span className="text-blue-400 font-black">→</span>
                     <span className="text-xl font-black text-emerald-400 font-mono">GHS 1.00</span>
                  </div>
               </div>
            </div>
         </section>

         <section className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl space-y-8">
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 19V9"/><path d="M18 19V5"/><path d="M14 19v-5"/></svg>
               Asset Royalty split (10-40-50)
            </h3>
            <div className="space-y-6">
               <p className="text-sm font-medium text-slate-500 leading-relaxed italic">"If you retain ownership of your shards while allowing network usage, credits are partitioned as follows per usage event:"</p>
               <div className="space-y-4">
                  {[
                    { label: 'Facilitator (Creator)', perc: royaltyShare.facilitator, color: 'bg-emerald-500' },
                    { label: 'SuperAdmin (Platform)', perc: royaltyShare.superAdmin, color: 'bg-blue-600' },
                    { label: 'School Admin (Provider)', perc: royaltyShare.schoolAdmin, color: 'bg-indigo-600' }
                  ].map((s, i) => (
                    <div key={i} className="space-y-2">
                       <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-600">{s.label}</span>
                          <span className="text-slate-900">{s.perc}%</span>
                       </div>
                       <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${s.color} transition-all duration-1000`} style={{ width: `${s.perc}%` }}></div>
                       </div>
                    </div>
                  ))}
               </div>
               <div className="pt-6 border-t border-gray-50 flex items-center gap-4 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Royalties are processed every 48 hours following verified network usage of your shards.</p>
               </div>
            </div>
         </section>
      </div>

      {/* Account Notice */}
      <footer className="bg-slate-50 p-10 rounded-[3rem] border border-gray-100 flex items-start gap-6">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 border border-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase">Instructional Equity Guarantee</h4>
            <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">Your account value is tied to the uniqueness and cognitive depth (Bloom's Scale) of your submissions. HQ reserves the authority to recalibrate values based on peer usage metrics.</p>
         </div>
      </footer>
    </div>
  );
};

export default FacilitatorAccountHub;

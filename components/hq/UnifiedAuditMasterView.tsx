
import React from 'react';
import { SchoolRegistryEntry } from '../../types';

interface UnifiedAuditMasterViewProps {
  registry: SchoolRegistryEntry[];
}

const UnifiedAuditMasterView: React.FC<UnifiedAuditMasterViewProps> = ({ registry }) => {
  return (
    <div className="p-10 space-y-10 animate-in slide-in-from-bottom-8 duration-700">
      <div className="space-y-2">
        <h2 className="text-3xl font-black uppercase text-white tracking-tighter leading-none">Unified Audit Master</h2>
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Consolidated Network Appraisal Report</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {registry.map(school => {
           const history = school.performanceHistory || [];
           const latest = history[history.length - 1];
           
           return (
             <div key={school.id} className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl hover:border-slate-600 transition-all group">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-3xl flex items-center justify-center font-black text-2xl text-blue-500 shadow-inner group-hover:border-blue-500/50 transition-colors">
                        {school.name.charAt(0)}
                      </div>
                      <div className="space-y-1.5">
                         <h4 className="text-xl font-black text-white uppercase leading-none">{school.name}</h4>
                         <div className="flex gap-3 items-center">
                            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{school.id}</span>
                            <span className="w-1.5 h-1.5 bg-slate-800 rounded-full"></span>
                            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{school.status}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1 max-w-3xl">
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mean Standard</span>
                         <p className="text-lg font-black text-white font-mono">{latest?.avgComposite.toFixed(1) || '0.0'}%</p>
                      </div>
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Aggregate Efficiency</span>
                         <p className="text-lg font-black text-blue-400 font-mono">{latest?.avgAggregate.toFixed(1) || '0.0'}</p>
                      </div>
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Census Load</span>
                         <p className="text-lg font-black text-white font-mono">{school.studentCount}</p>
                      </div>
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Last Appraisal</span>
                         <p className="text-xs font-black text-slate-400 uppercase">{new Date(school.lastActivity).toLocaleDateString()}</p>
                      </div>
                   </div>

                   <div className="bg-white/5 border border-white/10 p-5 rounded-2xl italic max-w-sm">
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                         Institutional validity confirmed via multi-factor heuristic multipliers. Deployment status: Operational.
                      </p>
                   </div>
                </div>
             </div>
           );
        })}
      </div>

      <footer className="pt-10 border-t border-slate-900 text-center">
         <p className="text-[9px] font-black text-slate-600 uppercase tracking-[2em]">SS-MAP NETWORK MASTER AUDIT — UNIFIED VIEW</p>
      </footer>
    </div>
  );
};

export default UnifiedAuditMasterView;

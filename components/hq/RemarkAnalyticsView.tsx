
import React from 'react';
import { SubjectDemandMetric } from './SuperAdminPortal';

interface RemarkAnalyticsViewProps {
  subjectDemands: SubjectDemandMetric[];
}

const RemarkAnalyticsView: React.FC<RemarkAnalyticsViewProps> = ({ subjectDemands }) => {
  return (
    <div className="p-8 animate-in zoom-in-95 duration-500 space-y-12">
      
      {/* Network Friction Analysis Header */}
      <section className="space-y-8">
        <div className="bg-slate-950 p-10 rounded-[3rem] border border-slate-800 shadow-inner relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="relative flex flex-col md:flex-row justify-between items-end gap-8">
             <div className="space-y-4">
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                  <h3 className="text-3xl font-black uppercase text-white tracking-tighter leading-none">Locality Demand Analytics</h3>
               </div>
               <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed max-w-2xl">
                 Quantifying academic friction and instructional demands across the locality. This matrix partitions demand by gender skew and network mean performance to identify systemic gaps.
               </p>
             </div>
             <div className="bg-slate-900 px-6 py-4 rounded-3xl border border-slate-800 flex items-center gap-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Mean Standard</span>
                <span className="text-xl font-black text-emerald-400 font-mono">68.5%</span>
             </div>
           </div>
        </div>

        {/* Subject Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {subjectDemands.map((sd, i) => (
             <div key={sd.subject} className="bg-slate-950 border border-slate-800 p-8 rounded-[2.5rem] hover:border-slate-600 transition-all group relative overflow-hidden flex flex-col">
                <div className={`absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl font-black text-[9px] uppercase tracking-widest shadow-xl ${sd.demandScore > 60 ? 'bg-red-600 text-white' : sd.demandScore > 30 ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'}`}>
                   Demand Rating: {sd.difficultyRating}/10
                </div>
                
                <div className="space-y-6 flex-1">
                   <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Academic Discipline</span>
                      <h4 className="text-lg font-black text-white uppercase truncate">{sd.subject}</h4>
                   </div>

                   {/* Performance Friction Meter */}
                   <div className="space-y-3">
                      <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Score Mean</span>
                         <span className={`text-xl font-black font-mono ${sd.networkMeanPerformance < 60 ? 'text-red-400' : 'text-emerald-400'}`}>{sd.networkMeanPerformance.toFixed(1)}%</span>
                      </div>
                      <div className="h-1 bg-slate-900 rounded-full overflow-hidden flex">
                         <div 
                           className={`h-full transition-all duration-1000 ${sd.networkMeanPerformance < 60 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                           style={{ width: `${sd.networkMeanPerformance}%` }}
                         ></div>
                      </div>
                   </div>

                   {/* Gender Demand Skew */}
                   <div className="space-y-3 p-5 bg-slate-900/30 rounded-3xl border border-slate-800/50">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest mb-1">
                         <span className="text-blue-400">Male Friction</span>
                         <span className="text-pink-400">Female Friction</span>
                      </div>
                      <div className="h-3 bg-slate-950 rounded-full overflow-hidden flex shadow-inner border border-slate-800">
                         <div 
                           className="h-full bg-blue-600/80 transition-all duration-1000" 
                           style={{ width: `${sd.maleRemarkShare}%` }}
                         ></div>
                         <div 
                           className="h-full bg-pink-600/80 transition-all duration-1000" 
                           style={{ width: `${sd.femaleRemarkShare}%` }}
                         ></div>
                      </div>
                      <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                         <span>{sd.maleRemarkShare.toFixed(0)}% SHARE</span>
                         <span>{sd.femaleRemarkShare.toFixed(0)}% SHARE</span>
                      </div>
                   </div>

                   <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/50 italic flex-1">
                      <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Local Network Finding:</span>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase">"{sd.topRemark.substring(0, 120)}..."</p>
                   </div>

                   <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                      <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full ${sd.difficultyRating >= 8 ? 'bg-red-500 animate-ping' : 'bg-slate-700'}`}></div>
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                           {sd.difficultyRating >= 8 ? 'CRITICAL LOCAL DEMAND' : sd.difficultyRating >= 5 ? 'MODERATE DEMAND' : 'SYSTEMIC STABILITY'}
                         </span>
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase">{sd.remarkCount} Data Logs</span>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </section>

      {/* Analytics Interpretative Footer */}
      <div className="bg-indigo-600/5 border border-indigo-500/10 p-12 rounded-[3.5rem] text-center max-w-5xl mx-auto space-y-6">
         <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em] leading-relaxed">
           This dashboard quantifies instructional demand within the current network perimeter. Partitioned results allow for gender-sensitive resource allocation and localized curriculum focus.
         </p>
         <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-800 pr-8 last:border-none">
              <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></div> 
              Male-Centric Friction
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase border-r border-slate-800 pr-8 last:border-none">
              <div className="w-2 h-2 bg-pink-600 rounded-full shadow-[0_0_8px_rgba(219,39,119,0.4)]"></div> 
              Female-Centric Friction
            </div>
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase">
              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div> 
              Mastery Baseline
            </div>
         </div>
      </div>

    </div>
  );
};

export default RemarkAnalyticsView;

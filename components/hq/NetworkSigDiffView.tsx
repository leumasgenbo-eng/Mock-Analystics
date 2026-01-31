
import React, { useMemo } from 'react';
import { SchoolRegistryEntry } from '../../types';

interface NetworkSigDiffViewProps {
  registry: SchoolRegistryEntry[];
}

const NetworkSigDiffView: React.FC<NetworkSigDiffViewProps> = ({ registry }) => {
  const MOCK_STANDARD = 5.5;

  const sigDiffData = useMemo(() => {
    return registry.map(school => {
      const data = school.fullData;
      if (!data) return null;

      const students = data.students;
      const latestYear = new Date().getFullYear().toString();
      
      // Fix: Cast explicitly to number[] to resolve 'unknown' arithmetic errors
      const results = students.flatMap(s => Object.values(s.beceResults?.[latestYear]?.grades || {})) as number[];
      const beceMean = results.length > 0 ? results.reduce((a, b) => a + b, 0) / results.length : 9;
      const sigDiff = MOCK_STANDARD - beceMean;

      // Group by subject for more granular network view
      const subjects = Object.keys(data.facilitators);
      const subjectDeltas = subjects.map(sub => {
         const subResults = students.map(s => s.beceResults?.[latestYear]?.grades[sub]).filter(x => x !== undefined) as number[];
         const subMean = subResults.length > 0 ? subResults.reduce((a,b) => a+b, 0) / subResults.length : 9;
         return { subject: sub, delta: MOCK_STANDARD - subMean };
      });

      return {
        id: school.id,
        name: school.name,
        beceMean,
        sigDiff,
        bestSubject: subjectDeltas.sort((a,b) => b.delta - a.delta)[0],
        studentCount: school.studentCount
      };
    }).filter(x => x !== null).sort((a, b) => (b?.sigDiff || 0) - (a?.sigDiff || 0));
  }, [registry]);

  return (
    <div className="p-10 space-y-12 animate-in slide-in-from-left-8 duration-700">
      <div className="bg-emerald-950 p-10 rounded-[3rem] border border-emerald-900/50 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        <div className="relative space-y-4">
           <h3 className="text-3xl font-black uppercase tracking-tight">Institutional Significant Difference (Σ Δ)</h3>
           <p className="text-emerald-300/60 text-xs font-bold uppercase tracking-widest max-w-2xl leading-relaxed">
             This matrix establishes the "Instructional Leap". It measures the delta between the established Academy Mock Standard (5.5) and the actual BECE cohort achievement. A positive Σ Δ indicates a school has successfully bridged internal preparation with external excellence.
           </p>
           <div className="pt-6">
              <div className="bg-white/10 inline-block px-8 py-3 rounded-2xl border border-white/10 font-mono text-xl font-black">
                 Σ Δ = Baseline (5.5) - BECE Mean
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {sigDiffData.map((s, i) => (
          <div key={s?.id} className={`bg-slate-950 border p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between ${s?.sigDiff && s.sigDiff > 0 ? 'border-emerald-500/30' : 'border-red-500/30 opacity-60'}`}>
            <div className="flex justify-between items-start mb-8">
               <div className="flex items-center gap-6">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${s?.sigDiff && s.sigDiff > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    #{i + 1}
                  </div>
                  <div className="space-y-1">
                     <h4 className="text-lg font-black text-white uppercase">{s?.name}</h4>
                     <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{s?.id}</span>
                  </div>
               </div>
               <div className="text-right">
                  <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">SIGMA DIFF</span>
                  <span className={`text-2xl font-black font-mono ${s?.sigDiff && s.sigDiff > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {s?.sigDiff && s.sigDiff > 0 ? `+${s.sigDiff.toFixed(2)}` : s?.sigDiff.toFixed(2)}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
               <div className="space-y-1 text-center">
                  <span className="text-[7px] font-black text-slate-600 uppercase block">BECE Mean</span>
                  <p className="text-sm font-black text-white">{s?.beceMean.toFixed(2)}</p>
               </div>
               <div className="space-y-1 text-center border-x border-slate-800">
                  <span className="text-[7px] font-black text-slate-600 uppercase block">Lead Subject</span>
                  <p className="text-[10px] font-black text-blue-400 uppercase truncate px-2">{s?.bestSubject?.subject || 'N/A'}</p>
               </div>
               <div className="space-y-1 text-center">
                  <span className="text-[7px] font-black text-slate-600 uppercase block">Census</span>
                  <p className="text-sm font-black text-white">{s?.studentCount}</p>
               </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-950 p-8 rounded-[2.5rem] border border-slate-800 flex items-start gap-4">
         <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
         </div>
         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Σ Δ analysis identifies institutions where instructional strategies successfully translate internal preparation standards into external results. Schools with Σ Δ &lt; 0 are prioritized for network-wide strategy calibration.
         </p>
      </div>
    </div>
  );
};

export default NetworkSigDiffView;

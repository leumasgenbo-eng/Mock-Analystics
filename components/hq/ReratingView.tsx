
import React from 'react';

interface RankingData {
  id: string;
  name: string;
  compositeAvg: number;
  aggregateAvg: number;
  objectiveAvg: number;
  theoryAvg: number;
  strengthIndex: number;
}

interface ReratingViewProps {
  schoolRankings: RankingData[];
}

const ReratingView: React.FC<ReratingViewProps> = ({ schoolRankings }) => {
  return (
    <div className="p-8 animate-in slide-in-from-right-8 duration-500 space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden text-white">
        <h3 className="text-3xl font-black uppercase tracking-tight mb-2">Network Strength Index</h3>
        <p className="text-white/60 text-xs font-bold uppercase tracking-widest max-w-xl">Calculated based on composite mean vs aggregate efficiency across all committed mock series.</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {schoolRankings.map((rank, i) => (
          <div key={rank.id} className="bg-slate-950 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6 hover:border-blue-500/50 transition-all">
            <div className="flex items-center gap-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl ${i === 0 ? 'bg-yellow-500 text-slate-900 shadow-xl' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                {i + 1}
              </div>
              <div className="space-y-1">
                <span className="text-lg font-black text-white uppercase">{rank.name}</span>
                <div className="flex flex-wrap gap-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase">Composite: <span className="text-blue-400">{Math.round(rank.compositeAvg)}%</span></span>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Agg: <span className="text-emerald-400">{rank.aggregateAvg.toFixed(1)}</span></span>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Obj: <span className="text-purple-400">{Math.round(rank.objectiveAvg)}</span></span>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Thy: <span className="text-orange-400">{Math.round(rank.theoryAvg)}</span></span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Strength Index</span>
              <span className="text-2xl font-black text-white font-mono">{rank.strengthIndex.toFixed(2)}</span>
            </div>
          </div>
        ))}
        {schoolRankings.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <p className="text-white font-black uppercase text-xs tracking-widest">No ranking data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReratingView;

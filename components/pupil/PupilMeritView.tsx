
import React, { useMemo } from 'react';
import { ProcessedStudent, GlobalSettings, ExamSubScore } from '../../types';

interface PupilMeritViewProps {
  student: ProcessedStudent;
  settings: GlobalSettings;
}

const PupilMeritView: React.FC<PupilMeritViewProps> = ({ student, settings }) => {
  const meritStats = useMemo(() => {
    const history = student.seriesHistory || {};
    const currentMock = history[settings.activeMock];
    const mockNames = settings.committedMocks || [];
    const prevMockName = mockNames[mockNames.indexOf(settings.activeMock) - 1];
    const prevMock = prevMockName ? history[prevMockName] : null;

    let growthRate = 1.0;
    const avgGrade = currentMock ? currentMock.aggregate / 10 : 9;

    if (currentMock && prevMock && currentMock.subScores && prevMock.subScores) {
      const currTotal = (Object.values(currentMock.subScores) as ExamSubScore[]).reduce((a, b) => a + (b.sectionA + b.sectionB), 0);
      const prevTotal = (Object.values(prevMock.subScores) as ExamSubScore[]).reduce((a, b) => a + (b.sectionA + b.sectionB), 0);
      growthRate = prevTotal > 0 ? currTotal / prevTotal : 1.0;
    }

    // Heuristic Formula: (10 / avgGrade) adjusted by proficiency factor
    const baseIndex = 16.667; 
    const rewardIndex = (avgGrade > 0 ? (6 / avgGrade) : 1) * baseIndex;

    return { 
      rewardIndex, 
      growthRate, 
      rank: currentMock?.rank || '—',
      aggregate: currentMock?.aggregate || '—'
    };
  }, [student, settings]);

  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-2 border-b border-gray-50 pb-10">
         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">Personal Merit Dashboard</h3>
         <p className="text-[12px] font-bold text-blue-600 uppercase tracking-[0.5em]">Heuristic Multiplier Analysis — {settings.activeMock}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Merit Reward Index */}
        <div className="bg-blue-900 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group min-h-[300px]">
           <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24 blur-[60px]"></div>
           <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-300">Merit Reward Index</span>
              <div className="w-12 h-1 bg-white/20 rounded-full"></div>
           </div>
           <p className="text-7xl font-black font-mono tracking-tighter">{meritStats.rewardIndex.toFixed(3)}</p>
           <div className="mt-8 pt-6 border-t border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-200 italic">
              "Consistency × Aggregate Proficiency"
           </div>
        </div>

        {/* Temporal Growth */}
        <div className="bg-slate-900 text-white border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl space-y-10 flex flex-col justify-center">
           <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Temporal Growth</span>
              <p className={`text-6xl font-black font-mono ${meritStats.growthRate >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                 x{meritStats.growthRate.toFixed(2)}
              </p>
           </div>
           <div className="space-y-4">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner border border-white/5">
                 <div className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.5)]" style={{ width: `${Math.min(100, meritStats.growthRate * 50)}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-widest">
                 Ratio of current total performance against previous series baseline.
              </p>
           </div>
        </div>

        {/* Institutional Rank */}
        <div className="bg-white border-2 border-slate-900 p-10 rounded-[3.5rem] flex flex-col justify-center items-center text-center space-y-6 shadow-xl group">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Institutional Rank</span>
           <p className="text-8xl font-black text-slate-950 leading-none group-hover:scale-110 transition-transform duration-500">#{meritStats.rank}</p>
           <div className="bg-blue-100 text-blue-900 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200 shadow-sm">Official Series Rank</div>
        </div>
      </div>

      {/* Narrative Interpretation */}
      <div className="bg-slate-50 p-12 rounded-[4rem] border-2 border-dashed border-gray-200 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-900/5 rounded-full -mr-48 -mt-48"></div>
         <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 bg-blue-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20m10-10H2"/></svg>
            </div>
            <h4 className="text-lg font-black text-blue-900 uppercase tracking-[0.4em]">Merit Interpretation</h4>
         </div>
         <p className="text-xl font-medium leading-relaxed italic text-gray-700 max-w-5xl">
           The Reward Index quantifies your <span className="text-blue-900 font-black">"Academic Gravity"</span> within the cohort. A rising index indicates you are effectively converting effort into results while maintaining a high growth velocity relative to established standards.
         </p>
      </div>
    </div>
  );
};

export default PupilMeritView;

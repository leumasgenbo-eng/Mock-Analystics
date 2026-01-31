import React, { useMemo } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings } from '../../types';
import { SUBJECT_LIST } from '../../constants';

interface SupplementarySheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  section: 'sectionA' | 'sectionB';
}

const SupplementarySheet: React.FC<SupplementarySheetProps> = ({ students, stats, settings, section }) => {
  const sectionLabel = section === 'sectionA' ? 'Objectives (Sec A)' : 'Theory (Sec B)';
  const colorClass = section === 'sectionA' ? 'text-blue-600' : 'text-purple-600';
  const headerBg = section === 'sectionA' ? 'bg-blue-950' : 'bg-purple-950';

  // Calculate Range (Min/Max) for each subject
  const subjectRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number; range: number }> = {};
    
    SUBJECT_LIST.forEach(sub => {
      const scores = students.map(s => {
        const mockSet = s.mockData?.[settings.activeMock];
        const subSc = mockSet?.examSubScores?.[sub] || { sectionA: 0, sectionB: 0 };
        return section === 'sectionA' ? subSc.sectionA : subSc.sectionB;
      }).filter(s => s !== undefined);

      if (scores.length > 0) {
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        ranges[sub] = { min, max, range: max - min };
      } else {
        ranges[sub] = { min: 0, max: 0, range: 0 };
      }
    });
    return ranges;
  }, [students, section, settings.activeMock]);

  const getScoreStyle = (score: number, subName: string) => {
    const mean = section === 'sectionA' ? (stats.subjectSectionAMeans[subName] || 0) : (stats.subjectSectionBMeans[subName] || 0);
    const stdDev = section === 'sectionA' ? (stats.subjectSectionAStdDevs[subName] || 0) : (stats.subjectSectionBStdDevs[subName] || 0);
    
    // Determine "Worst Performing": Scores more than 1 StdDev below mean or below 40% of max
    const maxPossible = section === 'sectionA' ? settings.maxSectionA : settings.maxSectionB;
    const isWorst = score < (mean - stdDev) || score < (maxPossible * 0.35);
    
    if (isWorst && score > 0) return 'bg-red-50 text-red-700 font-black ring-1 ring-red-100 rounded';
    return colorClass;
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div className="overflow-x-auto shadow-2xl rounded-3xl border border-gray-200 bg-white">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className={`${headerBg} text-white uppercase text-[8px] tracking-[0.2em]`}>
              <th className="p-4 border-r border-white/10 w-10">Rank</th>
              <th className="p-4 border-r border-white/10 text-left min-w-[200px]">Pupil Full Identity</th>
              {SUBJECT_LIST.map(sub => (
                <th key={sub} className="p-3 border-r border-white/10 min-w-[80px]">{sub.substring(0, 15)}</th>
              ))}
            </tr>
            <tr className="bg-gray-100 text-[8px] font-black uppercase text-gray-500 border-b border-gray-200">
              <th colSpan={2} className="p-2 text-right italic pr-4">Analysis: {sectionLabel}</th>
              {SUBJECT_LIST.map(sub => (
                <th key={sub + '-max'} className="p-2 border-x border-gray-200">
                  MAX: {section === 'sectionA' ? settings.maxSectionA : settings.maxSectionB}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-blue-50/20 transition-colors border-b border-gray-100">
                <td className="p-2 text-center font-black border-r border-gray-100">{student.rank}</td>
                <td className="p-2 uppercase font-black text-gray-700 border-r border-gray-200 truncate">{student.name}</td>
                {SUBJECT_LIST.map(subName => {
                  const mockSet = student.mockData?.[settings.activeMock];
                  const activeSubScores = mockSet?.examSubScores?.[subName] || { sectionA: 0, sectionB: 0 };
                  const score = section === 'sectionA' ? activeSubScores.sectionA : activeSubScores.sectionB;
                  return (
                    <td key={subName} className={`p-2 text-center font-mono text-sm border-r border-gray-100 transition-colors ${getScoreStyle(score, subName)}`}>
                       {score}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 font-black border-t-2 border-gray-900 uppercase text-[8px]">
            <tr className="bg-blue-50/30">
              <td colSpan={2} className="p-3 text-right text-blue-900 tracking-widest border-r border-gray-200 font-black">Section Mean (μ)</td>
              {SUBJECT_LIST.map(sub => (
                <td key={sub + '-mean'} className="p-2 text-center text-blue-900 font-mono text-[11px] border-r border-gray-200">
                   {Math.round(section === 'sectionA' ? (stats.subjectSectionAMeans[sub] || 0) : (stats.subjectSectionBMeans[sub] || 0))}
                </td>
              ))}
            </tr>
            <tr>
              <td colSpan={2} className="p-3 text-right text-gray-400 tracking-widest border-r border-gray-200">Std Deviation (σ)</td>
              {SUBJECT_LIST.map(sub => (
                <td key={sub + '-std'} className="p-2 text-center text-slate-400 font-mono text-[9px] border-r border-gray-200">
                   {(section === 'sectionA' ? (stats.subjectSectionAStdDevs[sub] || 0) : (stats.subjectSectionBStdDevs[sub] || 0)).toFixed(2)}
                </td>
              ))}
            </tr>
            <tr className="bg-indigo-50/40">
              <td colSpan={2} className="p-3 text-right text-indigo-900 tracking-widest border-r border-gray-200 font-black">Score Range (Max-Min)</td>
              {SUBJECT_LIST.map(sub => (
                <td key={sub + '-range'} className="p-2 text-center text-indigo-700 font-mono text-[10px] border-r border-gray-200">
                   {subjectRanges[sub].range} <span className="text-[7px] text-indigo-300 font-bold">({subjectRanges[sub].max}-{subjectRanges[sub].min})</span>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-8 no-print">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 ring-1 ring-red-200 rounded"></div>
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Worst Performing Tier (&lt; 1σ or &lt; 35%)</span>
         </div>
         <div className="flex items-center gap-2">
            <div className={`w-3 h-3 ${colorClass} font-black`}>12</div>
            <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Standard Performance</span>
         </div>
      </div>
    </div>
  );
};

export default SupplementarySheet;
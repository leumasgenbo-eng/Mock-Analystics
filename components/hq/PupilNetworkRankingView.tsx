
import React, { useState, useMemo } from 'react';
import { SchoolRegistryEntry, ProcessedStudent, ExamSubScore } from '../../types';

interface PupilNetworkRankingViewProps {
  registry: SchoolRegistryEntry[];
  onRemoteView: (schoolId: string) => void;
}

type SortKey = 'avgScore' | 'best6Avg' | 'avgGrade' | 'best6Agg' | 'avgObj' | 'avgThy';

interface PupilRankingRow {
  studentName: string;
  studentId: number;
  schoolName: string;
  schoolId: string;
  avgScore: number;
  best6Avg: number;
  avgGrade: number;
  best6Agg: number;
  avgObj: number;
  avgThy: number;
}

const PupilNetworkRankingView: React.FC<PupilNetworkRankingViewProps> = ({ registry, onRemoteView }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('best6Agg');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const rankingData: PupilRankingRow[] = useMemo(() => {
    const allPupils: PupilRankingRow[] = [];

    registry.forEach(school => {
      // Fix: Added Array.isArray check to ensure students is a StudentData[] and not a count (number) or undefined
      if (!school.fullData || !Array.isArray(school.fullData.students)) return;

      const schoolSettings = school.fullData.settings;
      const activeMock = schoolSettings.activeMock;

      school.fullData.students.forEach(s => {
        const mockSet = s.mockData?.[activeMock];
        if (!mockSet) return;

        const scores = Object.values(mockSet.scores || {}) as number[];
        const subScores = Object.values(mockSet.examSubScores || {}) as ExamSubScore[];
        
        const totalScore = scores.reduce((a, b) => a + b, 0);
        const avgScore = scores.length > 0 ? totalScore / scores.length : 0;

        const sortedScores = [...scores].sort((a, b) => b - a);
        const best6Total = sortedScores.slice(0, 6).reduce((a, b) => a + b, 0);
        const best6Avg = best6Total / 6;

        const totalObj = subScores.reduce((a, b) => a + (b.sectionA || 0), 0);
        const avgObj = subScores.length > 0 ? totalObj / subScores.length : 0;

        const totalThy = subScores.reduce((a, b) => a + (b.sectionB || 0), 0);
        const avgThy = subScores.length > 0 ? totalThy / subScores.length : 0;

        const committed = s.seriesHistory?.[activeMock];
        const best6Agg = committed?.aggregate || 36;
        const avgGrade = (best6Agg + 24) / 10;

        allPupils.push({
          studentName: s.name,
          studentId: s.id,
          schoolName: school.name,
          schoolId: school.id,
          avgScore,
          best6Avg,
          avgGrade,
          best6Agg,
          avgObj,
          avgThy
        });
      });
    });

    return allPupils;
  }, [registry]);

  const sortedData = useMemo(() => {
    return [...rankingData]
      .filter(p => 
        p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let valA = a[sortKey];
        let valB = b[sortKey];
        if (sortOrder === 'asc') return valA - valB;
        return valB - valA;
      });
  }, [rankingData, searchTerm, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'best6Agg' || key === 'avgGrade' ? 'asc' : 'desc');
    }
  };

  const ColumnHeader = ({ label, k, info }: { label: string, k: SortKey, info: string }) => (
    <th 
      onClick={() => handleSort(k)} 
      className={`px-4 py-5 cursor-pointer hover:bg-slate-800 transition-colors group relative ${sortKey === k ? 'bg-blue-900/30' : ''}`}
      title={info}
    >
      <div className="flex flex-col items-center">
         <span className="text-[7px] text-slate-500 uppercase tracking-widest block mb-1">{label}</span>
         <div className="flex items-center gap-1">
            <span className={`text-[10px] font-black uppercase tracking-tighter ${sortKey === k ? 'text-blue-400' : 'text-slate-400'}`}>
               {k === 'best6Agg' ? 'Aggregate' : k === 'avgScore' ? 'Score (10)' : k === 'best6Avg' ? 'Score (6)' : k === 'avgGrade' ? 'Grade (10)' : k === 'avgObj' ? 'Obj' : 'Theory'}
            </span>
            <div className="flex flex-col text-[8px] opacity-0 group-hover:opacity-100">
               <span className={sortKey === k && sortOrder === 'asc' ? 'text-blue-400' : ''}>▲</span>
               <span className={sortKey === k && sortOrder === 'desc' ? 'text-blue-400' : ''}>▼</span>
            </div>
         </div>
      </div>
    </th>
  );

  return (
    <div className="animate-in fade-in duration-700 flex flex-col min-h-[600px]">
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2">
           <h2 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Global Talent Matrix
           </h2>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Cross-Institutional Pupil Performance Rerating</p>
        </div>
        <div className="relative w-full md:w-96">
           <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
           </div>
           <input 
             type="text" 
             placeholder="Search candidate or institution..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-700"
           />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950/80 backdrop-blur-sm sticky top-0 z-20 shadow-xl border-b border-slate-800">
            <tr>
              <th className="px-8 py-5 text-[8px] font-black text-slate-500 uppercase tracking-widest w-16">Rank</th>
              <th className="px-8 py-5 text-[8px] font-black text-slate-500 uppercase tracking-widest min-w-[250px]">Candidate & Institution</th>
              <ColumnHeader label="Efficiency" k="avgScore" info="Average score across all 10 subjects (0-100)" />
              <ColumnHeader label="Core Talent" k="best6Avg" info="Average score of the top 6 subjects" />
              <ColumnHeader label="Distribution" k="avgGrade" info="Average numeric grade value (1-9). Lower is better." />
              <ColumnHeader label="Academic Cap" k="best6Agg" info="Best Six Aggregate (4 Cores + 2 Electives). Lower is better." />
              <ColumnHeader label="Objective" k="avgObj" info="Mean performance in Section A across all papers" />
              <ColumnHeader label="Theoretical" k="avgThy" info="Mean performance in Section B across all papers" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {sortedData.map((pupil, i) => (
              <tr key={`${pupil.schoolId}-${pupil.studentId}`} className="hover:bg-slate-800/40 transition-colors group">
                <td className="px-8 py-6">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-black text-[10px] ${i < 3 ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-900 text-slate-500'}`}>
                     {i + 1}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors leading-none">{pupil.studentName}</p>
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate max-w-[150px]">{pupil.schoolName}</span>
                       <button 
                         onClick={() => onRemoteView(pupil.schoolId)}
                         className="bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white px-3 py-1 rounded-lg text-[7px] font-black uppercase transition-all flex items-center gap-1 border border-indigo-500/20"
                       >
                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                         Access School
                       </button>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-6 text-center font-mono font-black text-blue-300 text-sm">{pupil.avgScore.toFixed(1)}%</td>
                <td className="px-4 py-6 text-center font-mono font-black text-indigo-300 text-sm">{pupil.best6Avg.toFixed(1)}%</td>
                <td className="px-4 py-6 text-center font-mono font-black text-amber-300 text-sm">{pupil.avgGrade.toFixed(2)}</td>
                <td className="px-4 py-6 text-center">
                   <span className={`px-4 py-1 rounded-full font-mono font-black text-lg ${pupil.best6Agg <= 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : pupil.best6Agg <= 20 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      {pupil.best6Agg}
                   </span>
                </td>
                <td className="px-4 py-6 text-center font-mono font-bold text-slate-400 text-sm">{pupil.avgObj.toFixed(1)}</td>
                <td className="px-4 py-6 text-center font-mono font-bold text-slate-400 text-sm">{pupil.avgThy.toFixed(1)}</td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={8} className="py-32 text-center opacity-30">
                   <div className="flex flex-col items-center gap-4">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                      <p className="font-black uppercase text-xs tracking-[0.5em] text-slate-500">No Network Candidates Synchronized</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
         <div className="flex gap-10">
            <div className="space-y-1">
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">Total Evaluated Population</span>
               <span className="text-xl font-black text-white">{sortedData.length} Candidates</span>
            </div>
            <div className="space-y-1 border-l border-slate-800 pl-10">
               <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">Network Mean Aggregate</span>
               <span className="text-xl font-black text-blue-400">
                  {(sortedData.reduce((a, b) => a + b.best6Agg, 0) / (sortedData.length || 1)).toFixed(1)}
               </span>
            </div>
         </div>
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest italic">Live Matrix View</p>
      </div>
    </div>
  );
};

export default PupilNetworkRankingView;

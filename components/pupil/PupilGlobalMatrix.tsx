
import React, { useState, useMemo } from 'react';
import { SchoolRegistryEntry, ProcessedStudent, ExamSubScore } from '../../types';

interface PupilGlobalMatrixProps {
  registry: SchoolRegistryEntry[];
  student: ProcessedStudent;
}

type SortKey = 'avgScore' | 'best6Avg' | 'avgGrade' | 'best6Agg' | 'avgObj' | 'avgThy';

interface GlobalPupilRow {
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
  isMe: boolean;
}

const PupilGlobalMatrix: React.FC<PupilGlobalMatrixProps> = ({ registry, student }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('best6Agg');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterMode, setFilterMode] = useState<'all' | 'top50' | 'nearMe'>('all');

  const rankingData: GlobalPupilRow[] = useMemo(() => {
    const list: GlobalPupilRow[] = [];
    registry.forEach(school => {
      if (!school.fullData?.students) return;
      const schoolSettings = school.fullData.settings;
      const activeMock = schoolSettings.activeMock;
      school.fullData.students.forEach(s => {
        const mockSet = s.mockData?.[activeMock];
        if (!mockSet) return;
        const scores = Object.values(mockSet.scores || {}) as number[];
        const subScores = Object.values(mockSet.examSubScores || {}) as ExamSubScore[];
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const best6Avg = [...scores].sort((a, b) => b - a).slice(0, 6).reduce((a, b) => a + b, 0) / 6;
        const avgObj = subScores.length > 0 ? subScores.reduce((a, b) => a + (b.sectionA || 0), 0) / subScores.length : 0;
        const avgThy = subScores.length > 0 ? subScores.reduce((a, b) => a + (b.sectionB || 0), 0) / subScores.length : 0;
        const committed = s.seriesHistory?.[activeMock];
        const best6Agg = committed?.aggregate || 36;
        const avgGrade = (best6Agg + 24) / 10;
        list.push({
          studentName: s.name,
          studentId: s.id,
          schoolName: school.name,
          schoolId: school.id,
          avgScore,
          best6Avg,
          avgGrade,
          best6Agg,
          avgObj,
          avgThy,
          isMe: s.id === student.id && school.id === student.id.toString() // Fallback check
        });
      });
    });
    return list;
  }, [registry, student.id]);

  const processedData = useMemo(() => {
    let sorted = [...rankingData].sort((a, b) => {
      const isBetterLower = sortKey === 'best6Agg' || sortKey === 'avgGrade';
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (sortOrder === 'asc') return valA - valB;
      return valB - valA;
    });
    if (searchTerm) sorted = sorted.filter(p => p.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterMode === 'top50') return sorted.slice(0, 50);
    return sorted;
  }, [rankingData, searchTerm, sortKey, sortOrder, filterMode]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortOrder(key === 'best6Agg' || key === 'avgGrade' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col min-h-[700px] animate-in fade-in duration-700">
      <div className="p-10 border-b border-gray-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="space-y-2">
           <h3 className="text-3xl font-black uppercase text-slate-900 tracking-tighter flex items-center gap-4 leading-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-900"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              My Global Matrix
           </h3>
           <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Network-Wide Elite Hierarchy</p>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
           <div className="flex bg-gray-200 p-1 rounded-2xl border border-gray-100 shadow-inner">
              {[ { id: 'top50', label: 'Top 50 Elite' }, { id: 'nearMe', label: 'Relative Position' } ].map(f => (
                <button key={f.id} onClick={() => setFilterMode(f.id as any)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${filterMode === f.id ? 'bg-blue-900 text-white shadow-lg' : 'text-gray-500 hover:text-blue-900'}`}>{f.label}</button>
              ))}
           </div>
           <div className="relative flex-1 lg:w-80">
              <input type="text" placeholder="Find a candidate..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:ring-8 focus:ring-blue-500/5 transition-all shadow-xl" />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto max-h-[600px] custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-blue-900 text-white sticky top-0 z-20 shadow-xl">
            <tr className="uppercase text-[8px] font-black tracking-widest">
              <th className="px-8 py-5 border-r border-blue-800">Rank</th>
              <th className="px-8 py-5 border-r border-blue-800">Candidate profile</th>
              <th onClick={() => handleSort('avgScore')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Efficiency (Mean Score)</th>
              <th onClick={() => handleSort('best6Avg')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Core Mastery (Core Mean)</th>
              <th onClick={() => handleSort('avgGrade')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Distribution (Mean Grade)</th>
              <th onClick={() => handleSort('best6Agg')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Network Cap (Aggregate)</th>
              <th onClick={() => handleSort('avgObj')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Objective (Obj)</th>
              <th onClick={() => handleSort('avgThy')} className="px-4 py-5 text-center cursor-pointer hover:bg-blue-800 transition-colors">Theory (Theory)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {processedData.length > 0 ? processedData.map((p, i) => (
              <tr key={i} className={`hover:bg-blue-50/30 transition-colors group ${p.isMe ? 'bg-blue-50 ring-2 ring-inset ring-blue-500/20' : ''}`}>
                <td className="px-8 py-6">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-xs shadow-xl ${i < 3 ? 'bg-yellow-500 text-white' : 'bg-slate-900 text-white'}`}>{i + 1}</div>
                </td>
                <td className="px-8 py-6">
                   <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900 uppercase leading-none">{p.studentName}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.schoolName}</p>
                   </div>
                </td>
                <td className="px-4 py-6 text-center font-mono font-black text-blue-900 text-sm">{p.avgScore.toFixed(1)}%</td>
                <td className="px-4 py-6 text-center font-mono font-black text-indigo-900 text-sm">{p.best6Avg.toFixed(1)}%</td>
                <td className="px-4 py-6 text-center font-mono font-black text-slate-500 text-sm">{p.avgGrade.toFixed(2)}</td>
                <td className="px-4 py-6 text-center">
                   <span className={`px-5 py-1 rounded-full font-mono font-black text-xl shadow-inner ${p.best6Agg <= 10 ? 'bg-emerald-600 text-white' : p.best6Agg <= 20 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{p.best6Agg}</span>
                </td>
                <td className="px-4 py-6 text-center font-mono font-bold text-slate-400">{p.avgObj.toFixed(1)}</td>
                <td className="px-4 py-6 text-center font-mono font-bold text-slate-400">{p.avgThy.toFixed(1)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="py-40 text-center opacity-30 flex flex-col items-center gap-10">
                   <p className="font-black uppercase text-sm tracking-[0.8em] text-blue-900">Global candidates not yet synchronized</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-10 border-t border-gray-100 bg-slate-50 flex justify-between items-center text-[11px] font-black uppercase text-slate-400 tracking-widest italic">
         <span className="flex items-center gap-3"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50"></div> Matrix synchronized with SS-Map Network Registry</span>
         <span className="text-blue-900 bg-white px-5 py-2 rounded-full shadow-inner border border-gray-100">{rankingData.length} Evaluated Population</span>
      </div>
    </div>
  );
};

export default PupilGlobalMatrix;

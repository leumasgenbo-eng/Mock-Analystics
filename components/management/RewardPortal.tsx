
import React, { useState, useMemo } from 'react';
import { StudentData, GlobalSettings, ExamSubScore, StaffAssignment, BeceResult } from '../../types';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';
import EditableField from '../shared/EditableField';

interface RewardPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  onSave: () => void;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  isFacilitator?: boolean;
}

const RewardPortal: React.FC<RewardPortalProps> = ({ students, setStudents, settings, subjects, facilitators, onSave, onSettingChange, isFacilitator }) => {
  const [view, setView] = useState<'mock-postmortem' | 'facilitator-merit' | 'bece-entry' | 'bece-analysis' | 'annual-report'>('mock-postmortem');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [rewardPool, setRewardPool] = useState('10000'); 
  const [searchTerm, setSearchTerm] = useState('');

  const mockNames = settings.committedMocks || [];

  const handleUpdateBeceGrade = (studentId: number, subject: string, grade: string) => {
    const numericGrade = parseInt(grade);
    if (numericGrade < 1 || numericGrade > 9) return;

    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const beceResults = { ...(s.beceResults || {}) };
      const yearData = beceResults[selectedYear] || { grades: {}, year: selectedYear };
      yearData.grades[subject] = numericGrade;
      beceResults[selectedYear] = yearData;
      return { ...s, beceResults };
    }));
  };

  const facilitatorRewards = useMemo(() => {
    const activeMock = settings.activeMock;
    const prevMockName = mockNames[mockNames.indexOf(activeMock) - 1];

    const results = subjects.map(subject => {
      const staff = facilitators[subject];
      if (!staff || !staff.name) return null;

      const pupilsWithData = students.filter(s => s.mockData?.[activeMock]?.scores[subject] !== undefined);
      if (pupilsWithData.length === 0) return null;

      const currentMeanScore = pupilsWithData.reduce((acc, s) => acc + (s.mockData?.[activeMock]?.scores[subject] || 0), 0) / pupilsWithData.length;
      const avgGradeFactor = Math.max(1, 10 - (currentMeanScore / 10)); 

      const prevPupils = prevMockName ? students.filter(s => s.mockData?.[prevMockName]?.scores[subject] !== undefined) : [];
      const prevMeanScore = prevPupils.length > 0 
        ? prevPupils.reduce((acc, s) => acc + (s.mockData?.[prevMockName]?.scores[subject] || 0), 0) / prevPupils.length 
        : currentMeanScore;
      const subGrowthRate = prevMeanScore > 0 ? currentMeanScore / prevMeanScore : 1.0;

      const teiValue = avgGradeFactor * subGrowthRate;

      const beceStudents = students.filter(s => s.beceResults?.[selectedYear]?.grades[subject]);
      let beceMeanGrade = 9;
      let sigDiff = 0;

      if (beceStudents.length > 0) {
        beceMeanGrade = beceStudents.reduce((acc, s) => acc + (s.beceResults?.[selectedYear]?.grades[subject] || 9), 0) / beceStudents.length;
        sigDiff = 5.5 - beceMeanGrade; 
      }

      return { subject, name: staff.name, staffId: staff.enrolledId, teiValue, subGrowthRate, beceMeanGrade, sigDiff };
    }).filter(x => x !== null);

    return results as any[];
  }, [students, settings.activeMock, subjects, facilitators, mockNames, selectedYear]);

  const teiRanked = useMemo(() => {
    const sorted = [...facilitatorRewards].sort((a, b) => b.teiValue - a.teiValue);
    const poolValue = parseFloat(rewardPool) || 0;
    const totalTei = sorted.reduce((acc, f) => acc + f.teiValue, 0);
    return sorted.map((f, i) => ({ ...f, rank: i + 1, share: totalTei > 0 ? (f.teiValue / totalTei) * poolValue : 0 }));
  }, [facilitatorRewards, rewardPool]);

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const navTabs = [
    { id: 'mock-postmortem', label: 'Pupil Rewards', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { id: 'facilitator-merit', label: 'Facilitator Merit', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm10-2v6m3-3h-6' },
    { id: 'bece-entry', label: 'BECE Grades Board', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', adminOnly: true },
    { id: 'bece-analysis', label: 'Sig-Diff Ranking', icon: 'M18 20V10M12 20V4M6 20v-6' },
    { id: 'annual-report', label: 'Institutional Audit', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }
  ].filter(t => !isFacilitator || !t.adminOnly);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Navigation & Year Selector */}
      <div className="flex flex-col lg:flex-row bg-slate-900 p-2 rounded-[2.5rem] max-w-6xl mx-auto shadow-2xl border border-white/5 no-print gap-2">
        <div className="flex overflow-x-auto no-scrollbar flex-1">
          {navTabs.map((t) => (
            <button key={t.id} onClick={() => setView(t.id as any)} className={`flex-1 min-w-[140px] py-4 rounded-[2rem] flex flex-col items-center gap-2 transition-all ${view === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d={t.icon}/></svg>
              <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-4 border-l border-white/10">
           <span className="text-[8px] font-black text-slate-500 uppercase">Academic Year:</span>
           <select 
             value={selectedYear} 
             onChange={e => setSelectedYear(e.target.value)}
             className="bg-slate-800 text-white font-black py-2 px-4 rounded-xl text-[10px] outline-none border border-white/10"
           >
              {['2023', '2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-gray-100 shadow-2xl overflow-hidden min-h-[700px] flex flex-col">
        {/* Unified Branding Header for all Reward Hub Views */}
        <div className="p-10 border-b border-gray-50 bg-gray-50/30">
          <ReportBrandingHeader 
            settings={settings} 
            onSettingChange={onSettingChange} 
            reportTitle={view === 'bece-entry' ? "OFFICIAL BECE OUTCOMES BOARD" : view === 'annual-report' ? "ANNUAL INSTITUTIONAL AUDIT" : "REWARD & MERIT HUB"}
            subtitle={`CYCLE: ${selectedYear} | SESSION: ${settings.activeMock}`}
            isLandscape={true}
          />
        </div>

        <div className="flex-1 p-8">
          {view === 'bece-entry' && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-4">
                  <div className="space-y-1">
                     <h3 className="text-xl font-black text-slate-900 uppercase">BECE Result Ingestion</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Enter verified grades (1-9) for the {selectedYear} series</p>
                  </div>
                  <div className="relative w-full md:w-80">
                     <input 
                       type="text" 
                       placeholder="Search candidate..." 
                       value={searchTerm}
                       onChange={e => setSearchTerm(e.target.value)}
                       className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-bold outline-none focus:border-blue-300 transition-all"
                     />
                     <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
               </div>

               <div className="overflow-x-auto rounded-[2.5rem] border border-gray-100 shadow-xl">
                  <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-blue-900 text-white uppercase text-[8px] font-black tracking-widest">
                           <th className="p-5 border-r border-blue-800 sticky left-0 bg-blue-900 z-10 w-48">Candidate Name</th>
                           {subjects.map(sub => (
                              <th key={sub} className="p-3 border-r border-blue-800 text-center min-w-[70px]">{sub.substring(0, 3)}</th>
                           ))}
                           <th className="p-5 bg-blue-950 text-center">Mean</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                        {filteredStudents.map(student => {
                           const beceGrades = student.beceResults?.[selectedYear]?.grades || {};
                           const gradeValues = Object.values(beceGrades) as number[];
                           const mean = gradeValues.length > 0 ? (gradeValues.reduce((a,b) => a+b, 0) / gradeValues.length).toFixed(1) : '—';

                           return (
                              <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                                 <td className="p-4 border-r border-gray-100 font-black uppercase text-slate-700 sticky left-0 bg-white group-hover:bg-blue-50/50 z-10 truncate text-[11px]">
                                    {student.name}
                                 </td>
                                 {subjects.map(sub => (
                                    <td key={sub} className="p-2 border-r border-gray-50">
                                       <input 
                                          type="text"
                                          maxLength={1}
                                          value={beceGrades[sub] || ''}
                                          onChange={e => handleUpdateBeceGrade(student.id, sub, e.target.value)}
                                          className={`w-full text-center py-2 rounded-xl text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 ${beceGrades[sub] <= 3 ? 'text-emerald-600' : beceGrades[sub] <= 6 ? 'text-blue-600' : 'text-red-500'} bg-gray-50/50`}
                                          placeholder="—"
                                       />
                                    </td>
                                 ))}
                                 <td className="p-4 bg-gray-50 text-center font-black text-blue-900 text-sm">
                                    {mean}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
               <div className="flex justify-center pt-4">
                  <button onClick={onSave} className="bg-blue-900 text-white px-16 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-black transition-all active:scale-95 tracking-widest">
                     Sync BECE Ledger Shards
                  </button>
               </div>
            </div>
          )}

          {view === 'mock-postmortem' && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
               <p className="text-slate-900 font-black uppercase text-sm tracking-[0.5em]">Pupil Reward Ledger Active</p>
            </div>
          )}

          {view === 'facilitator-merit' && (
            <div className="space-y-10 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Facilitator Merit Rerating</h3>
                     <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Heuristic Multiplier Analysis (TEI)</p>
                  </div>
                  <div className="bg-blue-950 p-6 rounded-[2.5rem] text-white flex items-center gap-8 shadow-2xl">
                     <div className="space-y-1">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Reward Pool</span>
                        <div className="flex items-center gap-2">
                           <span className="text-gray-400 text-sm font-bold">GHS</span>
                           <input type="text" value={rewardPool} onChange={e=>setRewardPool(e.target.value)} className="bg-transparent border-none p-0 text-xl font-black text-white focus:ring-0 outline-none w-24 font-mono" />
                        </div>
                     </div>
                     <div className="w-px h-10 bg-white/10"></div>
                     <div className="space-y-1">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Mean Index</span>
                        <p className="text-xl font-black font-mono">{(teiRanked.reduce((a,b)=>a+b.teiValue, 0)/(teiRanked.length||1)).toFixed(2)}</p>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teiRanked.map((f, i) => (
                    <div key={f.subject} className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all relative overflow-hidden group">
                       <div className="absolute top-0 right-0 bg-blue-900 text-white px-6 py-2 rounded-bl-[2rem] font-black text-xs">#{i+1}</div>
                       <div className="mb-6">
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-1">{f.subject}</span>
                          <p className="text-lg font-black text-slate-800 uppercase">{f.name}</p>
                       </div>
                       <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-6">
                          <div className="space-y-1">
                             <span className="text-[8px] font-black text-gray-400 uppercase">Efficiency Index</span>
                             <p className="text-2xl font-black text-blue-900 font-mono">{f.teiValue.toFixed(2)}</p>
                          </div>
                          <div className="space-y-1 text-right">
                             <span className="text-[8px] font-black text-emerald-500 uppercase">Est. Reward</span>
                             <p className="text-lg font-black text-emerald-600 font-mono">GHS {Math.round(f.share).toLocaleString()}</p>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {view === 'annual-report' && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center space-y-6">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
               <p className="text-slate-900 font-black uppercase text-sm tracking-[0.5em]">Institutional Audit Generation Ready</p>
            </div>
          )}
        </div>
      </div>

      {/* Persistence Notice */}
      <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-100 p-8 rounded-[3rem] flex items-start gap-6">
         <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase">Data Lifecycle Notice</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
               BECE results entered here are permanently attached to the candidate's longitudinal academic record. These outcomes drive the Significant Difference (Σ Δ) analysis used in the Annual Network Audit.
            </p>
         </div>
      </div>
    </div>
  );
};

export default RewardPortal;

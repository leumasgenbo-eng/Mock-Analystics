
import React, { useState } from 'react';
import { StudentData, GlobalSettings, MockScoreSet } from '../../types';

interface DataCleanupPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  onSave: () => void;
  subjects: string[];
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const DataCleanupPortal: React.FC<DataCleanupPortalProps> = ({ students, setStudents, settings, onSave, subjects, isFacilitator, activeFacilitator }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMock, setSelectedMock] = useState(settings.activeMock);
  const [targetSubject, setTargetSubject] = useState(isFacilitator ? activeFacilitator?.subject || subjects[0] : subjects[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleGlobalSubjectPurge = () => {
    if (window.confirm(`⚠️ CRITICAL COHORT ACTION: This will PERMANENTLY ERASE all ${targetSubject} scores for the ENTIRE CLASS in ${selectedMock}. Proceed?`)) {
      setIsProcessing(true);
      setStudents(prev => prev.map(s => {
        const mockSet: MockScoreSet = s.mockData?.[selectedMock] || { 
          scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, 
          observations: { facilitator: "", invigilator: "", examiner: "" }, 
          attendance: 0, conductRemark: "" 
        };
        
        const nextExamSubScores = { ...(mockSet.examSubScores || {}) };
        delete nextExamSubScores[targetSubject];
        
        const nextScores = { ...(mockSet.scores || {}) };
        delete nextScores[targetSubject];

        const nextSbaScores = { ...(mockSet.sbaScores || {}) };
        delete nextSbaScores[targetSubject];

        const nextRemarks = { ...(mockSet.facilitatorRemarks || {}) };
        delete nextRemarks[targetSubject];

        return {
          ...s,
          mockData: {
            ...(s.mockData || {}),
            [selectedMock]: {
              ...mockSet,
              examSubScores: nextExamSubScores,
              scores: nextScores,
              sbaScores: nextSbaScores,
              facilitatorRemarks: nextRemarks
            }
          }
        };
      }));
      
      setTimeout(() => {
        onSave();
        setIsProcessing(false);
        alert(`FORGE SYNC: ${targetSubject} records for the cohort have been purged.`);
      }, 800);
    }
  };

  const handleClearSubjectForPupil = (id: number, name: string) => {
    if (window.confirm(`NULL SUBJECT: Reset ${targetSubject} results to zero for ${name} in ${selectedMock}?`)) {
      setStudents(prev => prev.map(s => {
        if (s.id !== id) return s;
        const mockSet = s.mockData?.[selectedMock];
        if (!mockSet) return s;

        const nextScores = { ...mockSet.scores };
        delete nextScores[targetSubject];
        const nextSubScores = { ...mockSet.examSubScores };
        delete nextSubScores[targetSubject];
        const nextSba = { ...mockSet.sbaScores };
        delete nextSba[targetSubject];

        return {
          ...s,
          mockData: {
            ...s.mockData,
            [selectedMock]: { ...mockSet, scores: nextScores, examSubScores: nextSubScores, sbaScores: nextSba }
          }
        };
      }));
      setTimeout(onSave, 500);
    }
  };

  const handlePurgePupilCompletely = (id: number, name: string) => {
    if (window.confirm(`PERMANENT DELETION: Remove ${name} from all academy records? This is non-recoverable.`)) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setTimeout(onSave, 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20 relative">
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center space-y-6">
           <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-sm font-black text-red-400 uppercase tracking-[0.4em]">FORGING NEW DATABASE STATE...</p>
        </div>
      )}

      {isFacilitator && (
         <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
               !
            </div>
            <div>
               <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Restricted Forge Node</p>
               <h4 className="text-sm font-black text-indigo-900 uppercase mt-1">Authorized for {targetSubject} purge only</h4>
            </div>
         </div>
      )}

      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tight">Administrative Data Forge</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">Direct Matrix Manipulation & Cleanup</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Target Series</label>
                 <select value={selectedMock} onChange={(e) => setSelectedMock(e.target.value)} className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-xs font-black outline-none text-white">
                    {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m} className="text-gray-900">{m}</option>)}
                 </select>
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Target Subject</label>
                 <select 
                    value={targetSubject} 
                    onChange={(e) => setTargetSubject(e.target.value)} 
                    disabled={isFacilitator}
                    className={`bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-xs font-black outline-none text-white ${isFacilitator ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                    {subjects.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
                 </select>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         <div className="bg-red-950/40 border border-red-900/50 p-8 rounded-[2.5rem] flex flex-col justify-between space-y-6">
            <div className="space-y-2">
               <h3 className="text-lg font-black text-red-400 uppercase">Mass Subject Purge</h3>
               <p className="text-[10px] text-red-300/60 font-bold uppercase tracking-widest leading-relaxed">
                 Warning: This deletes {targetSubject} scores for the whole class in {selectedMock}. Use for errors in marking schemes.
               </p>
            </div>
            <button onClick={handleGlobalSubjectPurge} className="bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">
              Purge {targetSubject} Cohort Data
            </button>
         </div>
         <div className="bg-slate-100 p-8 rounded-[2.5rem] flex items-center gap-6 border-2 border-dashed border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
              Record deletions are synchronized instantly. {isFacilitator ? "Only your assigned subject is accessible for purge protocol." : "Always export a Broad Sheet before performing destructive operations."}
            </p>
         </div>
      </div>

      <div className="relative pt-6">
         <input type="text" placeholder="Filter pupils for individual record deletion..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border-2 border-gray-100 rounded-[2rem] px-8 py-5 text-sm font-bold shadow-lg outline-none focus:border-red-200 transition-all" />
      </div>

      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-6">Pupil Identity</th>
              <th className="px-10 py-6 text-right">Forge Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredStudents.map(s => (
              <tr key={s.id} className="hover:bg-red-50/20 transition-colors">
                <td className="px-10 py-8">
                   <span className="text-sm font-black text-slate-900 uppercase block">{s.name}</span>
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Index: {s.id}</span>
                </td>
                <td className="px-10 py-8 text-right space-x-3">
                   <button onClick={() => handleClearSubjectForPupil(s.id, s.name)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:border-red-500 hover:text-red-600 transition-all">Clear {targetSubject.substring(0,3)}</button>
                   {!isFacilitator && (
                      <button onClick={() => handlePurgePupilCompletely(s.id, s.name)} className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">Full Purge</button>
                   )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataCleanupPortal;

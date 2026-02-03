
import React, { useState, useMemo } from 'react';
import { StudentData, GlobalSettings, ProcessedStudent } from '../../types';
import { SUBJECT_REMARKS } from '../../constants';

interface ScoreEntryPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
  processedSnapshot: ProcessedStudent[];
  onSave: () => void;
  activeFacilitator?: { name: string; subject: string } | null;
}

const ScoreEntryPortal: React.FC<ScoreEntryPortalProps> = ({ 
  students, setStudents, settings, onSettingChange, subjects, onSave, activeFacilitator 
}) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleUpdateScore = (studentId: number, section: 'sectionA' | 'sectionB', value: string) => {
    const numericVal = Math.min(100, Math.max(0, parseInt(value) || 0));
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      const currentSubScores = mockSet.examSubScores?.[selectedSubject] || { sectionA: 0, sectionB: 0 };
      const newSubScores = { ...currentSubScores, [section]: numericVal };
      
      return { 
        ...s, 
        mockData: { 
          ...(s.mockData || {}), 
          [settings.activeMock]: { 
            ...mockSet, 
            examSubScores: { ...mockSet.examSubScores, [selectedSubject]: newSubScores },
            scores: { ...mockSet.scores, [selectedSubject]: newSubScores.sectionA + newSubScores.sectionB } 
          } 
        } 
      };
    }));
  };

  const handleClearSubjectScore = (studentId: number) => {
    if (!window.confirm(`NULLIFY SHARD: Reset ${selectedSubject} scores to zero for this candidate? This will update the local buffer.`)) return;
    
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock];
      if (!mockSet) return s;

      const nextScores = { ...mockSet.scores };
      delete nextScores[selectedSubject];
      const nextSubScores = { ...mockSet.examSubScores };
      delete nextSubScores[selectedSubject];
      const nextRemarks = { ...mockSet.facilitatorRemarks };
      delete nextRemarks[selectedSubject];

      return {
        ...s,
        mockData: {
          ...s.mockData,
          [settings.activeMock]: { 
            ...mockSet, 
            scores: nextScores, 
            examSubScores: nextSubScores,
            facilitatorRemarks: nextRemarks 
          }
        }
      };
    }));
  };

  const handleUpdateRemark = (studentId: number, remark: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      return { 
        ...s, 
        mockData: { 
          ...(s.mockData || {}), 
          [settings.activeMock]: { 
            ...mockSet, 
            facilitatorRemarks: { ...(mockSet.facilitatorRemarks || {}), [selectedSubject]: remark } 
          } 
        } 
      };
    }));
  };

  const filtered = students.filter(s => (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const currentPredefinedRemarks = SUBJECT_REMARKS[selectedSubject] || SUBJECT_REMARKS["General"];

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500 font-sans">
      <div className="bg-slate-950 p-6 rounded-3xl shadow-xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Score Modulation Terminal</p>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black">{settings.activeMock}</span>
        </div>
        <div className="space-y-2">
          <label className="text-[8px] font-black text-slate-500 uppercase ml-4">Target Discipline (Edit/Modulate)</label>
          <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase text-blue-400 outline-none">
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="relative">
          <input type="text" placeholder="SEARCH CANDIDATE..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all uppercase" />
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(student => {
          const mockSet = student.mockData?.[settings.activeMock] || { scores: {}, examSubScores: {}, facilitatorRemarks: {} };
          const subSc = mockSet.examSubScores?.[selectedSubject] || { sectionA: 0, sectionB: 0 };
          const remark = mockSet.facilitatorRemarks?.[selectedSubject] || "";

          return (
            <div key={student.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden flex flex-col group hover:border-blue-400 transition-all">
               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-950 uppercase leading-none truncate max-w-[200px]">{student.name}</h4>
                        <p className="text-[9px] font-mono text-gray-400 uppercase tracking-tighter">NODE: {student.indexNumber || student.id}</p>
                     </div>
                     <button onClick={() => handleClearSubjectScore(student.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1" title="Nullify Subject Shard">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                     </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest font-mono">OBJ</label>
                        <input type="number" value={subSc.sectionA} onChange={e => handleUpdateScore(student.id, 'sectionA', e.target.value)} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl py-4 text-center font-black text-blue-900 text-xl outline-none focus:border-blue-500 transition-colors" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest font-mono">THY</label>
                        <input type="number" value={subSc.sectionB} onChange={e => handleUpdateScore(student.id, 'sectionB', e.target.value)} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl py-4 text-center font-black text-blue-900 text-xl outline-none focus:border-blue-500 transition-colors" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[8px] font-black text-blue-600 uppercase text-center block tracking-widest font-mono">SUM</label>
                        <div className="w-full bg-blue-950 text-white rounded-2xl py-4 text-center font-black text-2xl h-[60px] flex items-center justify-center shadow-lg">{subSc.sectionA + subSc.sectionB}</div>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Facilitator Remark Modulation</label>
                     <div className="space-y-2">
                        <select value={currentPredefinedRemarks.includes(remark) ? remark : ""} onChange={(e) => handleUpdateRemark(student.id, e.target.value)} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[9px] font-black text-blue-900 uppercase outline-none focus:border-blue-500">
                           <option value="">— SELECT TEMPLATE —</option>
                           {currentPredefinedRemarks.map((r, ri) => <option key={ri} value={r}>{r}</option>)}
                        </select>
                        <textarea value={remark} onChange={(e) => handleUpdateRemark(student.id, e.target.value.toUpperCase())} placeholder="CUSTOM FEEDBACK SHARD..." rows={2} className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-3 text-[10px] font-bold italic text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5 resize-none uppercase" />
                     </div>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-[110] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center md:px-12 animate-in slide-in-from-bottom-10">
         <div className="flex gap-8">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 active:bg-blue-900 active:text-white">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
            </button>
            <div className="hidden sm:flex flex-col justify-center">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matrix Calibration</span>
               <span className="text-sm font-black text-blue-950 uppercase">{filtered.length} Shards Ready</span>
            </div>
         </div>
         <button onClick={() => { onSave(); alert("Assessments modulated and synchronized with local persistence."); }} className="bg-blue-950 text-white px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black">Commit Calibration</button>
      </div>
    </div>
  );
};

export default ScoreEntryPortal;

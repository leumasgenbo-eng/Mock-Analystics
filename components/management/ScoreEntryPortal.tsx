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
    const numericVal = parseInt(value) || 0;
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
      
      {/* MOBILE HEADER - Subject Selection */}
      <div className="bg-slate-950 p-6 rounded-3xl shadow-xl border border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">CAPI DATA ENTRY NODE</p>
          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-[9px] font-black">{settings.activeMock}</span>
        </div>
        <div className="space-y-2">
          <label className="text-[8px] font-black text-slate-500 uppercase ml-4">Target Discipline</label>
          <select 
            value={selectedSubject} 
            onChange={(e) => setSelectedSubject(e.target.value)} 
            disabled={!!activeFacilitator}
            className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase text-blue-400 outline-none"
          >
            {subjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="FILTER BY PUPIL NAME..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full bg-slate-900 border border-white/10 rounded-2xl pl-12 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all uppercase" 
          />
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      {/* CAPI DATA SHARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map(student => {
          const mockSet = student.mockData?.[settings.activeMock] || { scores: {}, examSubScores: {}, facilitatorRemarks: {} };
          const subSc = mockSet.examSubScores?.[selectedSubject] || { sectionA: 0, sectionB: 0 };
          const remark = mockSet.facilitatorRemarks?.[selectedSubject] || "";

          return (
            <div key={student.id} className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden flex flex-col group hover:border-blue-300 transition-all">
               <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 uppercase leading-none truncate max-w-[200px]">{student.name}</h4>
                        <p className="text-[9px] font-mono text-gray-400">ID: {student.id.toString().padStart(6, '0')}</p>
                     </div>
                     <div className={`w-2.5 h-2.5 rounded-full ${(subSc.sectionA + subSc.sectionB) > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest">OBJ (A)</label>
                        <input 
                           type="number" 
                           value={subSc.sectionA} 
                           onChange={e => handleUpdateScore(student.id, 'sectionA', e.target.value)}
                           className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl py-3 text-center font-black text-blue-900 text-lg outline-none focus:border-blue-500"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest">THY (B)</label>
                        <input 
                           type="number" 
                           value={subSc.sectionB} 
                           onChange={e => handleUpdateScore(student.id, 'sectionB', e.target.value)}
                           className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl py-3 text-center font-black text-blue-900 text-lg outline-none focus:border-blue-500"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-600 uppercase text-center block tracking-widest">SUM</label>
                        <div className="w-full bg-blue-900 text-white rounded-xl py-3 text-center font-black text-lg h-[52px] flex items-center justify-center">
                           {subSc.sectionA + subSc.sectionB}
                        </div>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Discipline Remark</label>
                     <div className="space-y-2">
                        <select 
                           value={currentPredefinedRemarks.includes(remark) ? remark : ""}
                           onChange={(e) => handleUpdateRemark(student.id, e.target.value)}
                           className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-bold outline-none"
                        >
                           <option value="">SELECT PREDEFINED...</option>
                           {currentPredefinedRemarks.map((r, ri) => <option key={ri} value={r}>{r}</option>)}
                        </select>
                        <textarea 
                           value={remark}
                           onChange={(e) => handleUpdateRemark(student.id, e.target.value)}
                           placeholder="Type custom remark..."
                           rows={1}
                           className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-[10px] font-medium italic outline-none focus:ring-2 focus:ring-blue-500/10 resize-none"
                        />
                     </div>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE PERSISTENT COMMAND BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center md:px-10">
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Session Mirror</span>
            <span className="text-sm font-black text-blue-950 uppercase">{filtered.length} Shards Loaded</span>
         </div>
         <button 
           onClick={() => { onSave(); alert("Session shards committed to registry."); }}
           className="bg-blue-950 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
         >
           Commit Shards
         </button>
      </div>

    </div>
  );
};

export default ScoreEntryPortal;
import React, { useState, useRef, useMemo } from 'react';
import { StudentData, GlobalSettings, ProcessedStudent, MockSeriesRecord, MockScoreSet, MockSnapshotMetadata } from '../../types';
import { SUBJECT_REMARKS } from '../../constants';
import EditableField from '../shared/EditableField';

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
  students, setStudents, settings, onSettingChange, subjects, processedSnapshot, onSave, activeFacilitator 
}) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const scoreFileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateExamSubScore = (studentId: number, subject: string, section: 'sectionA' | 'sectionB', value: string) => {
    const numericVal = parseInt(value) || 0;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      const subScores = mockSet.examSubScores[subject] || { sectionA: 0, sectionB: 0 };
      const newSubScores = { ...subScores, [section]: Math.max(0, numericVal) };
      return { ...s, mockData: { ...(s.mockData || {}), [settings.activeMock]: { ...mockSet, examSubScores: { ...mockSet.examSubScores, [subject]: newSubScores }, scores: { ...mockSet.scores, [subject]: newSubScores.sectionA + newSubScores.sectionB } } } };
    }));
  };

  const filtered = students.filter(s => (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const subjectSpecificRemarks = SUBJECT_REMARKS[selectedSubject] || SUBJECT_REMARKS["General"];

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 font-sans">
      {/* CAPI CONTROL CONSOLE */}
      <div className="bg-slate-950 text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">CAPI Terminal Matrix</h2>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Authorized Data Entry Node — {settings.activeMock}</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full xl:w-auto">
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-4">Active Disciplines Shard</label>
                 <select 
                   value={selectedSubject} 
                   onChange={(e) => setSelectedSubject(e.target.value)} 
                   disabled={!!activeFacilitator}
                   className="w-full md:w-80 bg-slate-900 border border-white/10 rounded-[2rem] px-8 py-4 text-xs font-black uppercase text-blue-400 outline-none focus:ring-4 focus:ring-blue-500/20 transition-all disabled:opacity-30"
                 >
                   {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-4">Cohort Matrix Filter</label>
                 <div className="relative">
                   <input 
                     type="text" 
                     placeholder="ID OR NAME..." 
                     value={searchTerm} 
                     onChange={(e) => setSearchTerm(e.target.value)} 
                     className="w-full bg-slate-900 border border-white/10 rounded-[2rem] px-12 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all uppercase" 
                   />
                   <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* TERMINAL DATA SHARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
         {filtered.map(student => {
            const mockSet = student.mockData?.[settings.activeMock] || { scores: {}, examSubScores: {}, facilitatorRemarks: {} };
            const subSc = mockSet.examSubScores[selectedSubject] || { sectionA: 0, sectionB: 0 };
            return (
              <div key={student.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden hover:shadow-2xl hover:border-blue-200 transition-all group">
                 <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Candidate Node</p>
                          <h4 className="text-lg font-black text-slate-950 uppercase truncate max-w-[180px]">{student.name}</h4>
                          <span className="text-[9px] font-mono font-bold text-gray-400">ID: {student.id.toString().padStart(6, '0')}</span>
                       </div>
                       <div className={`w-3 h-3 rounded-full shadow-lg ${(subSc.sectionA + subSc.sectionB) > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-200'}`}></div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest">OBJ</label>
                          <input 
                            type="number" 
                            value={subSc.sectionA} 
                            onChange={(e) => handleUpdateExamSubScore(student.id, selectedSubject, 'sectionA', e.target.value)} 
                            className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl py-4 text-center font-black text-blue-900 outline-none focus:border-blue-500 focus:bg-white transition-all text-xl" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black text-gray-400 uppercase text-center block tracking-widest">THY</label>
                          <input 
                            type="number" 
                            value={subSc.sectionB} 
                            onChange={(e) => handleUpdateExamSubScore(student.id, selectedSubject, 'sectionB', e.target.value)} 
                            className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl py-4 text-center font-black text-blue-900 outline-none focus:border-blue-500 focus:bg-white transition-all text-xl" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[8px] font-black text-blue-600 uppercase text-center block tracking-widest">SUM</label>
                          <div className="w-full bg-blue-950 text-white rounded-2xl py-4 text-center font-black text-2xl leading-none flex items-center justify-center h-[60px] shadow-lg">
                             {subSc.sectionA + subSc.sectionB}
                          </div>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Assessment Remark</label>
                       <input 
                         type="text" 
                         value={mockSet.facilitatorRemarks?.[selectedSubject] || ""}
                         onChange={(e) => {
                            const remark = e.target.value;
                            setStudents(prev => prev.map(s => s.id === student.id ? { ...s, mockData: { ...s.mockData, [settings.activeMock]: { ...mockSet, facilitatorRemarks: { ...mockSet.facilitatorRemarks, [selectedSubject]: remark } } } } : s));
                         }}
                         placeholder="SYNC REMARK..."
                         className="w-full bg-slate-50 border border-gray-100 rounded-2xl px-6 py-3 text-[10px] font-bold uppercase italic outline-none focus:ring-2 focus:ring-blue-500/10"
                       />
                    </div>
                 </div>
              </div>
            );
         })}
      </div>

      {/* CAPI FOOTER ACTIONS */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl bg-white/80 backdrop-blur-2xl border border-gray-100 rounded-[3rem] p-6 shadow-2xl flex justify-between items-center z-[100] animate-in slide-in-from-bottom-10">
         <div className="flex gap-10 px-8">
            <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Matrix Shards</span><span className="text-xl font-black text-blue-950">{filtered.length} Loaded</span></div>
            <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Entry State</span><span className="text-xl font-black text-emerald-600">Secure</span></div>
         </div>
         <div className="flex gap-4">
            <button onClick={onSave} className="bg-gray-100 text-slate-600 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Save Session Shard</button>
            <button onClick={() => { if(window.confirm('Commit all subject results to history?')) onSave(); }} className="bg-blue-900 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all hover:bg-black">Commit Series Snapshot</button>
         </div>
      </footer>
    </div>
  );
};

export default ScoreEntryPortal;
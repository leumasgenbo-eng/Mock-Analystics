import React, { useState } from 'react';
import { StudentData, GlobalSettings, MockScoreSet } from '../../types';
import { PREDEFINED_CONDUCT_REMARKS } from '../../constants';

interface FacilitatorDeskProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onSave: () => void;
}

const FacilitatorDesk: React.FC<FacilitatorDeskProps> = ({ students, setStudents, settings, onSettingChange, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const createEmptyMockSet = (): MockScoreSet => ({
    scores: {},
    sbaScores: {},
    examSubScores: {},
    facilitatorRemarks: {},
    observations: { facilitator: "", invigilator: "", examiner: "" },
    attendance: 0,
    conductRemark: ""
  });

  const handleUpdateField = (id: number, field: 'attendance' | 'conductRemark', value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== id) return s;
      const mockSet = s.mockData?.[settings.activeMock] || createEmptyMockSet();
      return {
        ...s,
        mockData: {
          ...(s.mockData || {}),
          [settings.activeMock]: { ...mockSet, [field]: value }
        }
      };
    }));
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 pb-32 animate-in fade-in duration-500 font-sans">
      
      {/* HEADER CONTROLS */}
      <div className="bg-slate-950 p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Pupil Logistics Node</h3>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Cycle: {settings.activeMock}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Attendance Cap</label>
              <input 
                type="number" 
                value={settings.attendanceTotal}
                onChange={(e) => onSettingChange('attendanceTotal', e.target.value)}
                className="w-16 text-center font-black bg-transparent text-blue-400 text-xl outline-none"
              />
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center">
               <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Start Date</label>
               <input 
                 type="date" 
                 value={settings.startDate}
                 onChange={(e) => onSettingChange('startDate', e.target.value)}
                 className="bg-transparent text-white text-xs font-bold outline-none"
               />
            </div>
          </div>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="FILTER COHORT BY IDENTITY..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-14 pr-6 py-5 bg-slate-900 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 uppercase"
          />
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      {/* PUPIL SHARDS GRID - Replaced Table to prevent horizontal spill */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map(student => {
          const mockSet = student.mockData?.[settings.activeMock] || createEmptyMockSet();
          const currentRemark = mockSet.conductRemark || "";

          return (
            <div key={student.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden hover:border-blue-300 transition-all flex flex-col group">
               <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                     <div className="space-y-1">
                        <h4 className="text-lg font-black text-slate-900 uppercase leading-none truncate max-w-[220px]">{student.name}</h4>
                        <p className="text-[10px] font-mono text-gray-400">ID: {student.id.toString().padStart(6, '0')}</p>
                     </div>
                     <div className="bg-blue-50 px-4 py-2 rounded-xl flex flex-col items-center border border-blue-100">
                        <span className="text-[7px] font-black text-blue-400 uppercase leading-none mb-1">Days</span>
                        <input 
                           type="number" 
                           value={mockSet.attendance || 0}
                           onChange={(e) => handleUpdateField(student.id, 'attendance', parseInt(e.target.value) || 0)}
                           className="w-10 text-center font-black text-blue-900 bg-transparent outline-none text-lg"
                        />
                     </div>
                  </div>

                  <div className="space-y-3">
                     <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Conduct & Character Shard</label>
                        <select 
                           value={PREDEFINED_CONDUCT_REMARKS.includes(currentRemark) ? currentRemark : ""}
                           onChange={(e) => {
                              const val = e.target.value;
                              if (val) handleUpdateField(student.id, 'conductRemark', val);
                           }}
                           className="bg-slate-50 border border-gray-100 rounded-xl px-3 py-1 text-[8px] font-black text-blue-600 uppercase outline-none focus:ring-2 focus:ring-blue-500/10"
                        >
                           <option value="">QUICK TEMPLATE...</option>
                           {PREDEFINED_CONDUCT_REMARKS.map((r, ri) => <option key={ri} value={r}>{r.substring(0, 30)}...</option>)}
                        </select>
                     </div>
                     <textarea 
                        value={currentRemark}
                        onChange={(e) => handleUpdateField(student.id, 'conductRemark', e.target.value.toUpperCase())}
                        placeholder="ENTER BEHAVIORAL PROTOCOLS..."
                        className="w-full bg-slate-50 border-2 border-gray-50 rounded-2xl p-6 text-xs font-bold text-slate-700 italic outline-none focus:border-blue-500 focus:bg-white transition-all min-h-[120px] resize-none"
                     />
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {/* STICKY ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-2xl border-t border-gray-100 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex justify-between items-center md:px-12 animate-in slide-in-from-bottom-10">
         <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Matrix Population</span>
            <span className="text-sm font-black text-blue-950 uppercase">{filtered.length} Loaded</span>
         </div>
         <button 
           onClick={() => { onSave(); alert("Attendance & Conduct records committed."); }}
           className="bg-blue-950 text-white px-12 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-black"
         >
           Commit Shards
         </button>
      </footer>
    </div>
  );
};

export default FacilitatorDesk;
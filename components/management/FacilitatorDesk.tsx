
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">Pupils Attendance and Conduct</h3>
          <p className="text-[10px] font-bold text-blue-400 uppercase">Managing: {settings.activeMock} Series</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Attend. Limit</label>
            <input 
              type="number" 
              value={settings.attendanceTotal}
              onChange={(e) => onSettingChange('attendanceTotal', e.target.value)}
              className="w-20 text-center font-black bg-white border border-blue-100 rounded-xl py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col items-end">
             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Series Start Date</label>
             <input 
               type="date" 
               value={settings.startDate}
               onChange={(e) => onSettingChange('startDate', e.target.value)}
               className="bg-white border border-blue-100 rounded-xl px-4 py-1 text-xs font-bold outline-none"
             />
          </div>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-blue-900/30">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        </div>
        <input 
          type="text" 
          placeholder="Filter pupils for attendance/conduct..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className="w-full pl-14 pr-6 py-4 border border-gray-100 rounded-2xl text-xs font-bold bg-white shadow-sm outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
        />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase text-[8px] tracking-[0.3em] border-b border-gray-100">
            <tr>
              <th className="px-8 py-4">Pupil Identity</th>
              <th className="px-4 py-4 text-center">Days Present</th>
              <th className="px-8 py-4">Conduct & Character Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(student => {
              const mockSet = student.mockData?.[settings.activeMock] || createEmptyMockSet();
              const currentRemark = mockSet.conductRemark || "";

              return (
                <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-8 py-4">
                    <span className="font-black text-gray-900 uppercase text-[11px] block">{student.name}</span>
                    <span className="text-[8px] font-bold text-gray-400">ID: {student.id.toString().padStart(6, '0')}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <input 
                         type="number" 
                         value={mockSet.attendance || 0}
                         onChange={(e) => handleUpdateField(student.id, 'attendance', parseInt(e.target.value) || 0)}
                         className="w-16 text-center font-black text-sm py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                       />
                       <span className="text-[10px] font-black text-gray-400">/ {settings.attendanceTotal}</span>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <div className="flex flex-col gap-2 max-w-lg">
                      <div className="flex gap-2 items-center">
                        <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest whitespace-nowrap">Template:</span>
                        <select 
                          value={PREDEFINED_CONDUCT_REMARKS.includes(currentRemark) ? currentRemark : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) handleUpdateField(student.id, 'conductRemark', val);
                          }}
                          className="flex-1 bg-gray-50 border border-gray-100 rounded-xl py-1.5 px-3 text-[9px] font-bold outline-none focus:ring-2 focus:ring-blue-500"
                        >
                           <option value="">SELECT STANDARD REMARK...</option>
                           {PREDEFINED_CONDUCT_REMARKS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <textarea 
                        value={currentRemark}
                        onChange={(e) => handleUpdateField(student.id, 'conductRemark', e.target.value)}
                        placeholder="Type or complete the pupil's character observation here..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px] resize-none"
                        rows={2}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center pt-4">
         <button onClick={onSave} className="bg-blue-900 text-white px-12 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95">Save Facilitator Records</button>
      </div>
    </div>
  );
};

export default FacilitatorDesk;

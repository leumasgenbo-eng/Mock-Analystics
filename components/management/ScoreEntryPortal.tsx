
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

const GENERAL_REPORT_TEMPLATES = [
  "The performance in this series shows significant mastery of core concepts across the cohort.",
  "Candidates exhibited strength in Objective questions but struggled with Theory applications.",
  "General understanding of the subject matter is satisfactory, but remedial attention is needed for Section B.",
  "Outstanding performance recorded; most candidates exceeded the institutional mean.",
  "Poor handwriting and lack of clarity in Section B significantly affected overall scores."
];

const ScoreEntryPortal: React.FC<ScoreEntryPortalProps> = ({ 
  students, setStudents, settings, onSettingChange, subjects, processedSnapshot, onSave, activeFacilitator 
}) => {
  // ROLE ENFORCEMENT: If facilitator, lock to their assigned subject
  const [selectedSubject, setSelectedSubject] = useState(
    activeFacilitator?.subject || subjects[0]
  );
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCustomReport, setShowCustomReport] = useState(false);
  const scoreFileInputRef = useRef<HTMLInputElement>(null);

  const activeGeneralReport = useMemo(() => {
    return settings.resourcePortal?.[settings.activeMock]?.[selectedSubject]?.generalReport || "";
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

  const updateGeneralReport = (report: string) => {
    const currentPortal = settings.resourcePortal || {};
    const mockData = currentPortal[settings.activeMock] || {};
    const subjectData = mockData[selectedSubject] || { indicators: [] };

    onSettingChange('resourcePortal', {
      ...currentPortal,
      [settings.activeMock]: {
        ...mockData,
        [selectedSubject]: { ...subjectData, generalReport: report }
      }
    });
  };

  const handleUpdateExamSubScore = (studentId: number, subject: string, section: 'sectionA' | 'sectionB', value: string) => {
    const numericVal = parseInt(value) || 0;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { 
        scores: {}, 
        sbaScores: {}, 
        examSubScores: {}, 
        facilitatorRemarks: {}, 
        observations: { facilitator: "", invigilator: "", examiner: "" }, 
        attendance: 0, 
        conductRemark: "" 
      };
      const subScores = mockSet.examSubScores[subject] || { sectionA: 0, sectionB: 0 };
      const newSubScores = { ...subScores, [section]: Math.max(0, numericVal) };
      return { 
        ...s, 
        mockData: { 
          ...(s.mockData || {}), 
          [settings.activeMock]: { 
            ...mockSet, 
            examSubScores: { ...mockSet.examSubScores, [subject]: newSubScores }, 
            scores: { ...mockSet.scores, [subject]: newSubScores.sectionA + newSubScores.sectionB } 
          } 
        } 
      };
    }));
  };

  const handleUpdateRemark = (studentId: number, subject: string, remark: string) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { 
        scores: {}, 
        sbaScores: {}, 
        examSubScores: {}, 
        facilitatorRemarks: {}, 
        observations: { facilitator: "", invigilator: "", examiner: "" }, 
        attendance: 0, 
        conductRemark: "" 
      };
      const newRemarks = { ...(mockSet.facilitatorRemarks || {}), [subject]: remark };
      return { 
        ...s, 
        mockData: { 
          ...(s.mockData || {}), 
          [settings.activeMock]: { ...mockSet, facilitatorRemarks: newRemarks } 
        } 
      };
    }));
  };

  const handleDownloadScores = () => {
    const headers = ["ID", "Pupil Name", "Subject", "Section A (Obj)", "Section B (Theory)", "Remark"];
    const rows = students.map(s => {
      const mockSet = s.mockData?.[settings.activeMock];
      const subSc = mockSet?.examSubScores?.[selectedSubject] || { sectionA: 0, sectionB: 0 };
      const remark = mockSet?.facilitatorRemarks?.[selectedSubject] || "";
      return [
        s.id,
        s.name,
        selectedSubject,
        subSc.sectionA,
        subSc.sectionB,
        remark
      ];
    });
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Scores_${selectedSubject.replace(/\s+/g, '_')}_${settings.activeMock}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadScores = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n");
      let updatedCount = 0;

      setStudents(prev => {
        const next = [...prev];
        lines.slice(1).forEach(line => {
          if (!line.trim()) return;
          const columns = line.split(",");
          const id = parseInt(columns[0]);
          const objScore = parseInt(columns[3]) || 0;
          const thyScore = parseInt(columns[4]) || 0;
          const remark = columns[5] || "";

          const studentIdx = next.findIndex(s => s.id === id);
          if (studentIdx > -1) {
            const student = next[studentIdx];
            const mockSet = student.mockData?.[settings.activeMock] || { 
              scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, 
              observations: { facilitator: "", invigilator: "", examiner: "" }, 
              attendance: 0, conductRemark: "" 
            };
            
            const newSubScores = { sectionA: objScore, sectionB: thyScore };
            const newRemarks = { ...(mockSet.facilitatorRemarks || {}), [selectedSubject]: remark };
            
            next[studentIdx] = {
              ...student,
              mockData: {
                ...(student.mockData || {}),
                [settings.activeMock]: {
                  ...mockSet,
                  examSubScores: { ...mockSet.examSubScores, [selectedSubject]: newSubScores },
                  scores: { ...mockSet.scores, [selectedSubject]: objScore + thyScore },
                  facilitatorRemarks: newRemarks
                }
              }
            };
            updatedCount++;
          }
        });
        return next;
      });

      alert(`Sync Complete: ${updatedCount} scores updated for ${selectedSubject}.`);
      if (scoreFileInputRef.current) scoreFileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleCommitScores = () => {
    if (window.confirm(`Snapshot ALL SUBJECT RESULTS for the cohort into ${settings.activeMock}? This validates data integrity across the Hub.`)) {
      const today = new Date().toISOString().split('T')[0];
      
      const currentSnapshots = settings.mockSnapshots || {};
      const mockMeta = currentSnapshots[settings.activeMock] || {
        submissionDate: today,
        subjectsSubmitted: [],
        subjectSubmissionDates: {},
        confirmedScripts: [],
        approvalStatus: 'pending',
        approvedBy: settings.headTeacherName
      };

      const updatedSubjects = Array.from(new Set([...mockMeta.subjectsSubmitted, selectedSubject]));
      const updatedDates = { ...(mockMeta.subjectSubmissionDates || {}), [selectedSubject]: today };

      onSettingChange('mockSnapshots', {
        ...currentSnapshots,
        [settings.activeMock]: {
          ...mockMeta,
          submissionDate: today,
          subjectsSubmitted: updatedSubjects,
          subjectSubmissionDates: updatedDates
        }
      });

      setStudents(prev => {
        const nextStudents = prev.map(student => {
          const computed = processedSnapshot.find(p => p.id === student.id);
          if (!computed) return student;

          const record: MockSeriesRecord = { 
            aggregate: computed.bestSixAggregate, 
            rank: computed.rank, 
            date: today, 
            reviewStatus: 'pending', 
            isApproved: true, 
            subjectPerformanceSummary: computed.subjects.reduce((acc, s) => ({ 
              ...acc, 
              [s.subject]: { mean: Math.round(s.finalCompositeScore), grade: s.grade } 
            }), {}), 
            subScores: { ...(student.mockData?.[settings.activeMock]?.examSubScores || {}) }
          };

          return { 
            ...student, 
            seriesHistory: { ...(student.seriesHistory || {}), [settings.activeMock]: record } 
          };
        });
        return nextStudents;
      });

      setTimeout(() => {
        onSave();
        alert(`Institutional Milestone: ${settings.activeMock} has been successfully snapshotted into the archive.`);
      }, 300);
    }
  };

  const filtered = students.filter(s => (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const subjectSpecificRemarks = SUBJECT_REMARKS[selectedSubject] || SUBJECT_REMARKS["General"];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {activeFacilitator && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl flex items-center gap-4">
           <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
              {activeFacilitator.name.charAt(0)}
           </div>
           <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Facilitator Node Verified</p>
              <h4 className="text-sm font-black text-indigo-900 uppercase mt-1">{activeFacilitator.name} — {activeFacilitator.subject}</h4>
           </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
           <div className="space-y-1">
             <label className="text-[9px] font-black text-blue-900 uppercase">Academy Name</label>
             <div className="text-xl font-black uppercase text-gray-800 py-1">{settings.schoolName}</div>
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-blue-900 uppercase">Academy Index</label>
             <div className="text-xl font-black text-gray-800 py-1">{settings.schoolNumber || "UBA-SYNC"}</div>
           </div>
           <div className="space-y-1">
             <label className="text-[9px] font-black text-blue-900 uppercase">Mock Series</label>
             <select 
               value={settings.activeMock} 
               onChange={(e) => onSettingChange('activeMock', e.target.value)} 
               className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm font-black outline-none"
             >
                {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m}>{m}</option>)}
             </select>
           </div>
        </div>
      </div>

      {/* Subject Selector: Disabled if facilitator */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-2">Active Subject shard</label>
              <select 
                value={selectedSubject} 
                onChange={(e) => setSelectedSubject(e.target.value)} 
                disabled={!!activeFacilitator}
                className={`w-full md:w-auto border rounded-xl px-4 py-2 font-black text-xs uppercase outline-none shadow-sm transition-all ${!!activeFacilitator ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : 'bg-white border-gray-200 text-blue-900 focus:ring-2 focus:ring-blue-500/20'}`}
              >
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>

           <div className="flex gap-2 w-full md:w-auto">
             <button 
               onClick={handleDownloadScores}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-blue-100 text-blue-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-50 transition-all shadow-sm"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
               Download
             </button>
             <button 
               onClick={() => scoreFileInputRef.current?.click()}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all shadow-sm"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
               Upload
             </button>
             <input type="file" ref={scoreFileInputRef} className="hidden" accept=".csv" onChange={handleUploadScores} />
           </div>

           <div className="relative w-full md:w-auto flex-1 max-w-md">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
             <input 
               type="text" 
               placeholder="Search pupils..." 
               value={searchTerm} 
               onChange={(e) => setSearchTerm(e.target.value)} 
               className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-blue-500/20" 
             />
           </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-400 font-black uppercase text-[8px] tracking-widest">
            <tr>
              <th className="px-8 py-5">Pupil Identity</th>
              <th className="px-4 py-5 text-center">Objective</th>
              <th className="px-4 py-5 text-center">Theory</th>
              <th className="px-6 py-5 text-center bg-blue-50 text-blue-900">Total</th>
              <th className="px-8 py-5">Individual Remark / Observation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(student => {
              const mockSet = student.mockData?.[settings.activeMock] || { scores: {}, examSubScores: {}, facilitatorRemarks: {} };
              const subSc = mockSet.examSubScores[selectedSubject] || { sectionA: 0, sectionB: 0 };
              const currentRemark = mockSet.facilitatorRemarks?.[selectedSubject] || "";
              
              return (
                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="font-black text-gray-900 uppercase text-[11px] block">{student.name}</span>
                    <span className="text-[8px] font-bold text-gray-400">ID: {student.id.toString().padStart(6, '0')}</span>
                  </td>
                  <td className="px-2 py-5 text-center">
                    <input 
                      type="number" 
                      value={subSc.sectionA} 
                      onChange={(e) => handleUpdateExamSubScore(student.id, selectedSubject, 'sectionA', e.target.value)} 
                      className="w-16 text-center font-black py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" 
                    />
                  </td>
                  <td className="px-2 py-5 text-center">
                    <input 
                      type="number" 
                      value={subSc.sectionB} 
                      onChange={(e) => handleUpdateExamSubScore(student.id, selectedSubject, 'sectionB', e.target.value)} 
                      className="w-16 text-center font-black py-2 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20" 
                    />
                  </td>
                  <td className="px-6 py-5 text-center bg-blue-50/10 font-black text-lg text-blue-900">{subSc.sectionA + subSc.sectionB}</td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-2">
                       <select 
                         value={subjectSpecificRemarks.includes(currentRemark) ? currentRemark : ""}
                         onChange={(e) => handleUpdateRemark(student.id, selectedSubject, e.target.value)}
                         className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                       >
                          <option value="">Select standard remark...</option>
                          {subjectSpecificRemarks.map(rm => <option key={rm} value={rm}>{rm}</option>)}
                          <option value="CUSTOM">--- TYPE CUSTOM ---</option>
                       </select>
                       <input 
                         type="text" 
                         value={currentRemark}
                         onChange={(e) => handleUpdateRemark(student.id, selectedSubject, e.target.value)}
                         placeholder="Custom observation..."
                         className="w-full bg-transparent border-b border-gray-200 px-1 py-1 text-[10px] italic font-medium outline-none focus:border-blue-500 transition-colors"
                       />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-4">
         <button onClick={onSave} className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl font-black text-xs uppercase">Save Session</button>
         <button onClick={handleCommitScores} className="bg-blue-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">Commit Mock Snapshot</button>
      </div>
    </div>
  );
};

export default ScoreEntryPortal;

import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedStudent, GlobalSettings, ClassStatistics } from '../../types';
import EditableField from '../shared/EditableField';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface ReportCardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onStudentUpdate?: (id: number, overallRemark: string) => void;
  classAverageAggregate: number;
  totalEnrolled?: number;
  isFacilitator?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ student, stats, settings, onSettingChange, onStudentUpdate, classAverageAggregate, totalEnrolled, isFacilitator }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(1);

  // CAPI Auto-Fit-to-Screen Logic
  useEffect(() => {
    const calculateScale = () => {
      const screenW = window.innerWidth;
      const docW = 794; 
      if (screenW < docW) {
        setScale((screenW - 32) / docW);
      } else {
        setScale(1);
      }
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const dynamicAnalysis = useMemo(() => {
    const strengths = student.subjects.filter(s => s.finalCompositeScore >= (stats.subjectMeans[s.subject] || 50) + 5).map(s => s.subject);
    const weaknesses = student.subjects.filter(s => s.finalCompositeScore < (stats.subjectMeans[s.subject] || 50)).map(s => ({ name: s.subject, mean: Math.round(stats.subjectMeans[s.subject]) }));

    return { 
      performance: strengths.length > 0 ? `Exhibits mastery in ${strengths.slice(0, 2).join(", ")}.` : "Consistent output maintained.", 
      recommendation: student.bestSixAggregate <= 15 ? "Outstanding result. Continue consistent study habits to maintain distinction." : "Requires more intensive focus on theoretical applications and remedial tutorials in identified weak areas." 
    };
  }, [student, stats]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById(`capture-area-${student.id}`);
    if (!element) return setIsGenerating(false);
    
    const opt = { 
      margin: 0, filename: `${student.name.replace(/\s+/g, '_')}_CAPI.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { scale: 3, useCORS: true, letterRendering: true, windowWidth: 794 }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  return (
    <div className="flex flex-col items-center mb-16 relative w-full px-2">
       
       {/* FLOATING CAPTURE ACTION */}
       <div className="fixed bottom-24 right-6 flex flex-col gap-3 no-print z-[100]">
          <button onClick={handleDownloadPDF} disabled={isGenerating} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white'}`}>
             {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          </button>
       </div>

       {/* ACADEMY BRANDING (COMPACT EDITABLE PARTICULARS) */}
       <div className="w-full max-w-[210mm] no-print mb-4 animate-in fade-in duration-700">
          <ReportBrandingHeader settings={settings} onSettingChange={onSettingChange} reportTitle={settings.examTitle} readOnly={false} />
       </div>

       {/* A4 REPORT SHARD */}
       <div 
         className="overflow-x-auto w-full flex justify-center py-2 bg-gray-100/50 rounded-[2rem] shadow-inner no-scrollbar"
         style={{ minHeight: `calc(297mm * ${scale})` }}
       >
         <div 
           id={`capture-area-${student.id}`} 
           className="bg-white w-[210mm] h-[297mm] shadow-2xl flex flex-col p-10 box-border font-sans overflow-hidden border border-gray-100 flex-shrink-0"
           style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
         >
            {/* COMPACT ASSESSMENT STRIPE */}
            <div className="shrink-0 mb-4">
               <div className="bg-slate-950 text-white py-6 rounded-[2rem] text-center relative overflow-hidden shadow-lg border-2 border-white mb-4">
                  <h2 className="text-2xl font-black uppercase tracking-[0.15em] relative z-10">{settings.examTitle}</h2>
                  <p className="text-[8px] font-black text-blue-400 tracking-[0.5em] uppercase mt-1 relative z-10">PUPIL ATTAINMENT SHARD</p>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-transparent"></div>
               </div>
               
               <div className="grid grid-cols-5 gap-2 text-[9px] font-black text-gray-800 uppercase tracking-widest px-2">
                  {[
                    { l: 'Series', v: settings.activeMock },
                    { l: 'Term', v: settings.termInfo },
                    { l: 'Cycle', v: settings.academicYear },
                    { l: 'Director', v: settings.headTeacherName },
                    { l: 'Hub ID', v: settings.schoolNumber }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center bg-gray-50 py-1.5 rounded-xl border border-gray-100"><span className="text-[6px] text-blue-500 mb-0.5">{item.l}</span><span className="text-blue-950 truncate w-full text-center px-1">{item.v}</span></div>
                  ))}
               </div>
            </div>

            {/* IDENTITY MATRIX (INCL ATTENDANCE & CONDUCT) */}
            <div className="grid grid-cols-2 gap-6 mb-4 border-[3px] border-blue-900 p-6 rounded-[3rem] bg-blue-50/5 shrink-0">
               <div className="space-y-3 border-r border-blue-100 pr-6">
                 <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Candidate Identity</span><span className="text-lg font-black text-blue-950 uppercase truncate leading-none mt-1">{student.name}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Attendance Shard</span><span className="text-[10px] font-black text-blue-950">{student.attendance} / {settings.attendanceTotal} DAYS</span></div>
                 <div className="flex flex-col"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Conduct & Character</span><span className="text-[9px] font-bold text-slate-700 mt-0.5 line-clamp-2 uppercase italic">"{student.conductRemark || 'EXEMPLARY'}"</span></div>
               </div>
               <div className="space-y-3 pl-2">
                 <div className="flex justify-between items-end"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Best 6 Agg</span><span className="text-4xl font-black text-blue-900 leading-none tracking-tighter">{student.bestSixAggregate}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Network Rank</span><span className="font-black text-lg text-blue-900">#{student.rank} OF {totalEnrolled}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Level</span><span className={`px-3 py-0.5 rounded-lg text-white text-[8px] font-black uppercase ${student.category === 'Distinction' ? 'bg-emerald-600' : 'bg-blue-600'}`}>{student.category}</span></div>
               </div>
            </div>

            {/* RESULTS MATRIX (SHRUNK CELLS) */}
            <div className="mb-4 flex-1 overflow-hidden">
               <table className="w-full text-[11px] border-collapse border-[3px] border-blue-900 rounded-2xl overflow-hidden">
                  <thead className="bg-blue-950 text-white uppercase text-[7px] font-black tracking-[0.1em]">
                    <tr>
                      <th className="py-2 px-4 text-left">Academic Discipline</th>
                      <th className="py-2 px-1 text-center w-[12px]">Obj</th>
                      <th className="py-2 px-1 text-center w-[12px]">Thy</th>
                      <th className="py-2 px-1 text-center w-[12px]">SBA</th>
                      <th className="py-2 px-1 text-center w-[16px] bg-blue-800">Total</th>
                      <th className="py-2 px-1 text-center w-[16px]">Grd</th>
                      <th className="py-2 px-3 text-left">Teacher Remark Shard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {student.subjects.map(sub => (
                       <tr key={sub.subject} className="even:bg-blue-50/10 font-bold h-9">
                         <td className="px-4 py-[2px] text-blue-950 uppercase truncate max-w-[140px] text-[10px]">{sub.subject}</td>
                         <td className="py-[2px] px-1 text-center font-mono text-gray-400 text-[10px] w-[12px] border-x border-gray-50">{sub.sectionA ?? '—'}</td>
                         <td className="py-[2px] px-1 text-center font-mono text-gray-400 text-[10px] w-[12px] border-r border-gray-50">{sub.sectionB ?? '—'}</td>
                         <td className="py-[2px] px-1 text-center font-mono text-gray-400 text-[10px] w-[12px] border-r border-gray-50">{Math.round(sub.sbaScore)}</td>
                         <td className="py-[2px] px-1 text-center font-black bg-blue-50/50 text-blue-900 text-xs w-[16px] border-r border-gray-100">{Math.round(sub.finalCompositeScore)}</td>
                         <td className={`py-[2px] px-1 text-center font-black text-xs w-[16px] border-r border-gray-100 ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                         <td className="px-3 py-[2px] text-[8px] uppercase text-slate-500 italic truncate max-w-[150px] font-medium leading-tight">
                            {sub.remark || 'SATISFACTORY EFFORT.'}
                         </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* REMARKS & RECOMMENDATIONS MATRIX */}
            <div className="grid grid-cols-1 gap-3 mb-4 shrink-0">
               <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-0.5 bg-blue-900 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-xl">Class Facilitator General Remark</div>
                  <p className="text-[10px] font-black text-blue-900 uppercase leading-relaxed mt-2 italic">
                    {student.overallRemark || `THE CANDIDATE ${student.name} EXHIBITS A ${student.category.toUpperCase()} PERFORMANCE PROFILE. CONTINUED DILIGENCE IN ALL CORE DISCIPLINES IS STRONGLY ADVISED.`}
                  </p>
               </div>
               <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl relative">
                  <div className="absolute top-0 right-0 px-3 py-0.5 bg-indigo-900 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-xl">Administrative Recommendation</div>
                  <p className="text-[9px] font-bold text-indigo-900 uppercase leading-relaxed mt-2">
                     {dynamicAnalysis.recommendation.toUpperCase()}
                  </p>
               </div>
            </div>

            {/* COMPACT SIGNATURE NODES */}
            <div className="flex justify-between items-end mt-auto pb-2 border-t border-slate-100 pt-4 shrink-0">
               <div className="w-[30%] text-center border-t-2 border-slate-900 pt-2">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{settings.adminRoleTitle || "Academy Director"}</p>
                  <div className="font-black text-blue-950 text-[10px] uppercase truncate">{settings.headTeacherName}</div>
               </div>
               <div className="w-[30%] text-center border-t-2 border-slate-900 pt-2">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Resumption Node</p>
                  <div className="font-black text-red-700 text-[10px] uppercase">{settings.nextTermBegin}</div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;
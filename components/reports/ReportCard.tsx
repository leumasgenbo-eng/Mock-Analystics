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

  // CAPI Auto-Fit-to-Screen Logic (Initial Load)
  useEffect(() => {
    const calculateScale = () => {
      const screenW = window.innerWidth;
      const docW = 794; // A4 standard width in pixels at 96DPI
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
    const regionalLocality = settings.schoolAddress.split(',')[0] || "this locality";

    return { 
      performance: strengths.length > 0 ? `Exhibits mastery in ${strengths.slice(0, 2).join(", ")}.` : "Consistent output maintained.", 
      recommendation: student.bestSixAggregate <= 15 ? "Outstanding result. Continue consistent study habits." : "Needs more intensive focus on theoretical applications." 
    };
  }, [student, stats, settings.schoolAddress]);

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

       {/* ACADEMY BRANDING (EDITABLE PARTICULARS) */}
       <div className="w-full max-w-[210mm] no-print mb-6 animate-in fade-in duration-700">
          <ReportBrandingHeader settings={settings} onSettingChange={onSettingChange} reportTitle={settings.examTitle} readOnly={false} />
       </div>

       {/* A4 REPORT SHARD - WRAPPED IN SCROLLABLE CONTAINER */}
       <div 
         className="overflow-x-auto w-full flex justify-center py-4 bg-gray-100/50 rounded-[2.5rem] shadow-inner no-scrollbar"
         style={{ minHeight: `calc(297mm * ${scale})` }}
       >
         <div 
           id={`capture-area-${student.id}`} 
           className="bg-white w-[210mm] h-[297mm] shadow-2xl flex flex-col p-12 box-border font-sans overflow-hidden border border-gray-100 flex-shrink-0"
           style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
         >
            {/* ASSESSMENT STRIPE */}
            <div className="shrink-0 mb-8">
               <div className="bg-slate-950 text-white py-10 rounded-[3rem] text-center relative overflow-hidden shadow-xl border-4 border-white mb-8">
                  <h2 className="text-3xl font-black uppercase tracking-[0.2em] relative z-10">{settings.examTitle}</h2>
                  <p className="text-[10px] font-black text-blue-400 tracking-[0.6em] uppercase mt-2 relative z-10">INDIVIDUAL PUPIL ATTAINMENT REPORT</p>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-transparent"></div>
               </div>
               
               <div className="grid grid-cols-5 gap-4 text-[10px] font-black text-gray-800 uppercase tracking-widest px-2">
                  {[
                    { l: 'Series', v: settings.activeMock },
                    { l: 'Term', v: settings.termInfo },
                    { l: 'Cycle', v: settings.academicYear },
                    { l: 'Director', v: settings.headTeacherName },
                    { l: 'Registry', v: settings.registryRoleTitle || "EXAM HUB" }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center bg-gray-50 p-3 rounded-2xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">{item.l}</span><span className="text-blue-950 truncate w-full text-center">{item.v}</span></div>
                  ))}
               </div>
            </div>

            {/* IDENTITY MATRIX */}
            <div className="grid grid-cols-2 gap-10 mb-8 border-4 border-blue-900 p-8 rounded-[4rem] bg-blue-50/5 shrink-0">
               <div className="space-y-4 border-r-2 border-blue-100 pr-10">
                 <div className="flex flex-col"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pupil Identity</span><span className="text-xl font-black text-blue-950 uppercase truncate leading-none">{student.name}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Network Node</span><span className="font-mono text-sm font-black text-blue-800">#{student.id.toString().padStart(6, '0')}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attendance</span><span className="font-black text-blue-950">{student.attendance} / {settings.attendanceTotal}</span></div>
               </div>
               <div className="space-y-4">
                 <div className="flex justify-between items-end"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Best 6 Agg</span><span className="text-5xl font-black text-blue-950 leading-none tracking-tighter">{student.bestSixAggregate}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Rank</span><span className="font-black text-xl text-blue-900">#{student.rank} OF {totalEnrolled}</span></div>
                 <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status Shard</span><span className={`px-4 py-1 rounded-xl text-white text-[10px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
               </div>
            </div>

            {/* CAPI DATA MATRIX */}
            <div className="mb-8 flex-1 overflow-hidden">
               <table className="w-full text-[13px] border-collapse border-4 border-blue-900 rounded-[2rem] overflow-hidden">
                  <thead className="bg-blue-950 text-white uppercase text-[9px] font-black tracking-[0.2em]">
                    <tr>
                      <th className="py-4 px-6 text-left">Academic Discipline</th>
                      <th className="py-4 px-1 text-center w-14">Obj</th>
                      <th className="py-4 px-1 text-center w-14">Thy</th>
                      <th className="py-4 px-1 text-center w-14">SBA</th>
                      <th className="py-4 px-1 text-center w-20 bg-blue-900">Total</th>
                      <th className="py-4 px-1 text-center w-16">Grd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {student.subjects.map(sub => (
                       <tr key={sub.subject} className="even:bg-blue-50/20 font-black h-11">
                         <td className="px-6 py-1 text-blue-950 uppercase truncate max-w-[200px]">{sub.subject}</td>
                         <td className="py-1 text-center font-mono text-gray-400">{sub.sectionA ?? '—'}</td>
                         <td className="py-1 text-center font-mono text-gray-400">{sub.sectionB ?? '—'}</td>
                         <td className="py-1 text-center font-mono text-gray-400">{Math.round(sub.sbaScore)}</td>
                         <td className="py-1 text-center font-black bg-blue-50/50 text-blue-900 text-lg">{Math.round(sub.finalCompositeScore)}</td>
                         <td className={`py-1 text-center font-black text-lg ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* SIGNATURE NODES */}
            <div className="flex justify-between items-end mt-auto pb-4 border-t-2 border-slate-100 pt-8 shrink-0">
               <div className="w-[35%] text-center border-t-4 border-slate-900 pt-3">
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">{settings.adminRoleTitle || "Academy Director"}</p>
                  <div className="font-black text-blue-950 text-[13px] uppercase truncate">{settings.headTeacherName}</div>
               </div>
               <div className="w-[35%] text-center border-t-4 border-slate-900 pt-3">
                  <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Resumption</p>
                  <div className="font-black text-red-700 text-[13px] uppercase">{settings.nextTermBegin}</div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;
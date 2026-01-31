import React, { useState, useMemo, useEffect } from 'react';
import { ProcessedStudent, GlobalSettings, ClassStatistics } from '../../types';
import EditableField from '../shared/EditableField';

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

  useEffect(() => {
    const calculateScale = () => {
      const screenW = window.innerWidth;
      const docW = 794; 
      if (screenW < docW) setScale((screenW - 32) / docW);
      else setScale(1);
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  const gradeDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    student.subjects.forEach(s => {
      dist[s.grade] = (dist[s.grade] || 0) + 1;
    });
    return dist;
  }, [student]);

  const cognitiveAnalysis = useMemo(() => {
    const highSubject = student.subjects.reduce((prev, current) => (prev.finalCompositeScore > current.finalCompositeScore) ? prev : current);
    const lowSubjects = student.subjects.filter(s => s.gradeValue >= 4).length;
    
    return {
      summary: `Primary cognitive strength identified in ${highSubject.subject.toUpperCase()} (${highSubject.finalCompositeScore}%).`,
      detail: `The candidate maintains a consistent credit-level (C4) proficiency across ${lowSubjects} disciplines, indicating a stable but non-specialized output in technical and core areas outside of language arts.`
    };
  }, [student]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById(`capture-area-${student.id}`);
    if (!element) return setIsGenerating(false);
    const opt = { 
      margin: 0, filename: `${student.name.replace(/\s+/g, '_')}_CAPI_REPORT.pdf`, 
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
       
       <div className="fixed bottom-24 right-6 flex flex-col gap-3 no-print z-[100]">
          <button onClick={handleDownloadPDF} disabled={isGenerating} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white'}`}>
             {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          </button>
       </div>

       <div className="overflow-x-auto w-full flex justify-center py-2 bg-gray-100/50 rounded-[2rem] shadow-inner no-scrollbar" style={{ minHeight: `calc(297mm * ${scale})` }}>
         <div id={`capture-area-${student.id}`} className="bg-white w-[210mm] h-[297mm] shadow-2xl flex flex-col p-6 box-border font-sans overflow-hidden border border-gray-100 flex-shrink-0" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            
            {/* BRANDING HEADER - Width 12p/Height 4 Constraint */}
            <div className="shrink-0 mb-2 border-[1.5px] border-blue-900 rounded-2xl overflow-hidden bg-slate-950 text-white">
               <div className="flex flex-col items-center py-2 space-y-[1px]">
                  <p className="text-[7px] font-black text-blue-400 tracking-[0.3em] h-3 flex items-center">INSTITUTIONAL NODE: SMA-2025-3932</p>
                  <p className="text-[9px] font-black text-blue-300 h-3 flex items-center uppercase">S</p>
                  <p className="text-xl font-black tracking-tighter leading-none h-5 flex items-center uppercase">SAM</p>
                  <p className="text-[6px] font-bold text-gray-400 tracking-[0.4em] h-3 flex items-center uppercase">EXCELLENCE IN KNOWLEDGE AND CHARACTER</p>
                  <p className="text-[9px] font-black text-blue-300 h-3 flex items-center uppercase">ADA</p>
                  <div className="w-full border-y border-white/10 py-0.5 my-0.5">
                     <h2 className="text-sm font-black uppercase tracking-[0.2em] text-center">OFFICIAL MOCK ASSESSMENT SERIES</h2>
                  </div>
                  <div className="flex justify-center gap-x-4 text-[6px] font-black tracking-widest opacity-60">
                     <div className="flex gap-1"><span>TEL:</span><span>0243504091</span></div>
                     <div className="flex gap-1"><span>EMAIL:</span><span>leumasgenbo2009@gmail.com</span></div>
                     <div className="flex gap-1"><span>WEB:</span><span>www.unitedbaylor.edu</span></div>
                  </div>
               </div>
            </div>

            {/* DUAL LEDGER MATRIX */}
            <div className="grid grid-cols-2 gap-3 mb-2 shrink-0">
               <div className="border border-blue-900 rounded-xl overflow-hidden">
                  <div className="bg-blue-900 text-white text-[6px] font-black px-3 py-0.5 uppercase tracking-widest h-4 flex items-center">Logistics Node</div>
                  <div className="divide-y divide-gray-100">
                     {[{l:'Series',v:'MOCK 1'},{l:'Term',v:'TERM 2'},{l:'Cycle',v:'2024/2025'},{l:'Director',v:'DIRECTOR NAME'},{l:'Hub ID',v:'SMA-2025-3932'}].map((item, i) => (
                        <div key={i} className="flex h-4 items-center px-2 gap-2"><span className="text-[5.5px] font-black text-blue-600 uppercase w-[35px] shrink-0 border-r border-gray-50">{item.l}</span><span className="text-[7.5px] font-black text-blue-950 uppercase truncate">{item.v}</span></div>
                     ))}
                  </div>
               </div>
               <div className="border border-blue-900 rounded-xl overflow-hidden">
                  <div className="bg-blue-900 text-white text-[6px] font-black px-3 py-0.5 uppercase tracking-widest h-4 flex items-center">Attainment Shard</div>
                  <div className="divide-y divide-gray-100">
                     {[{l:'Identity',v:student.name},{l:'Attendance',v:`${student.attendance} / 60 DAYS`},{l:'Conduct',v:'"EXEMPLARY"'},{l:'Best 6 Agg',v:student.bestSixAggregate},{l:'Rank',v:`#${student.rank} OF 26`},{l:'Level',v:'Pass'}].map((item, i) => (
                        <div key={i} className="flex h-4 items-center px-2 gap-2"><span className="text-[5.5px] font-black text-gray-400 uppercase w-[35px] shrink-0 border-r border-gray-50">{item.l}</span><span className={`text-[7.5px] font-black uppercase truncate ${item.l==='Best 6 Agg'?'text-red-700':'text-blue-950'}`}>{item.v}</span></div>
                     ))}
                  </div>
               </div>
            </div>

            {/* RESULTS MATRIX */}
            <div className="mb-2 shrink-0">
               <table className="w-full text-[10px] border-collapse border-[1.5px] border-blue-900 rounded-xl overflow-hidden">
                  <thead className="bg-blue-950 text-white uppercase text-[5.5px] font-black tracking-widest">
                    <tr className="h-4">
                      <th className="px-3 text-left">Academic Discipline</th>
                      <th className="px-0.5 text-center w-[12px]">Obj</th>
                      <th className="px-0.5 text-center w-[12px]">Thy</th>
                      <th className="px-0.5 text-center w-[12px]">SBA</th>
                      <th className="px-0.5 text-center w-[16px] bg-blue-800">Total</th>
                      <th className="px-0.5 text-center w-[16px]">Grd</th>
                      <th className="px-3 text-left">Teacher Remark Shard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {student.subjects.map(sub => (
                       <tr key={sub.subject} className="even:bg-blue-50/10 font-bold h-[15px]">
                         <td className="px-3 py-[1px] text-blue-950 uppercase truncate max-w-[140px] text-[7.5px] border-r border-gray-50">{sub.subject}</td>
                         <td className="py-[1px] px-0.5 text-center font-mono text-gray-400 text-[8px] w-[12px] border-r border-gray-50">{sub.sectionA ?? '—'}</td>
                         <td className="py-[1px] px-0.5 text-center font-mono text-gray-400 text-[8px] w-[12px] border-r border-gray-50">{sub.sectionB ?? '—'}</td>
                         <td className="py-[1px] px-0.5 text-center font-mono text-gray-400 text-[8px] w-[12px] border-r border-gray-50">{Math.round(sub.sbaScore)}</td>
                         <td className="py-[1px] px-0.5 text-center font-black bg-blue-50/50 text-blue-900 text-[8px] w-[16px] border-r border-gray-100">{Math.round(sub.finalCompositeScore)}</td>
                         <td className={`py-[1px] px-0.5 text-center font-black text-[8px] w-[16px] border-r border-gray-100 ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                         <td className="px-3 py-[1px] text-[6.5px] uppercase text-slate-500 italic truncate max-w-[180px] font-medium leading-none">{sub.remark}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* EXTENSION: SUBJECT PERFORMANCE DISTRIBUTION */}
            <div className="mb-2 grid grid-cols-4 gap-2 shrink-0">
               <div className="col-span-1 bg-blue-900 text-white p-2 rounded-xl flex flex-col items-center justify-center border border-blue-900 shadow-sm">
                  <span className="text-[5.5px] font-black uppercase tracking-widest opacity-60 mb-1">Pass Index</span>
                  <span className="text-xl font-black font-mono leading-none">{((student.subjects.filter(s=>s.gradeValue <= 6).length / student.subjects.length)*100).toFixed(0)}%</span>
               </div>
               <div className="col-span-3 border border-gray-100 rounded-xl p-2 flex items-center justify-around bg-gray-50/30">
                  {['A1','B2','B3','C4','C5','C6','D7','E8','F9'].map(g => (
                    <div key={g} className="flex flex-col items-center">
                       <span className="text-[6px] font-black text-gray-400 mb-0.5">{g}</span>
                       <span className={`text-[10px] font-black ${gradeDistribution[g] ? 'text-blue-900' : 'text-gray-200'}`}>{gradeDistribution[g] || 0}</span>
                    </div>
                  ))}
               </div>
            </div>

            {/* EXTENSION: SPECIFIC COGNITIVE ANALYSIS */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-2 shrink-0 relative overflow-hidden">
               <div className="absolute top-0 right-0 px-2 py-0.5 bg-slate-200 text-slate-600 text-[5px] font-black uppercase tracking-widest rounded-bl-lg">Specific Cognitive Analysis Shard</div>
               <div className="space-y-1 mt-1">
                  <p className="text-[8px] font-black text-blue-900 uppercase leading-none">{cognitiveAnalysis.summary}</p>
                  <p className="text-[7.5px] font-bold text-slate-500 uppercase leading-tight italic">{cognitiveAnalysis.detail}</p>
               </div>
            </div>

            {/* REMARKS & RECOMMENDATIONS */}
            <div className="grid grid-cols-1 gap-1.5 mb-2 shrink-0">
               <div className="bg-white border border-gray-200 p-2 rounded-xl relative h-10 overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-900 text-white text-[5px] font-black uppercase tracking-widest rounded-bl-lg">Facilitator Remark Shard</div>
                  <p className="text-[8px] font-black text-blue-950 uppercase leading-tight mt-1.5 italic line-clamp-2">
                    {student.overallRemark || `THE CANDIDATE EXHIBITS A STABLE ACADEMIC PROFILE WITH SIGNIFICANT STRENGTH IN CORE LITERACY.`}
                  </p>
               </div>
               <div className="bg-indigo-50 border border-indigo-100 p-2 rounded-xl relative h-10 overflow-hidden">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-indigo-900 text-white text-[5px] font-black uppercase tracking-widest rounded-bl-lg">Administrative Recommendation Shard</div>
                  <p className="text-[7.5px] font-bold text-indigo-900 uppercase leading-tight mt-1.5 line-clamp-2">
                     {student.bestSixAggregate <= 15 ? "OUTSTANDING RESULT. CONTINUE CONSISTENT STUDY HABITS TO MAINTAIN DISTINCTION." : "REQUIRES INTENSIVE FOCUS ON ANALYTICAL APPLICATIONS AND REMEDIAL TUTORIALS IN IDENTIFIED AREAS."}
                  </p>
               </div>
            </div>

            {/* SIGNATURE NODES */}
            <div className="flex justify-between items-end mt-auto pb-1 border-t border-slate-100 pt-2 shrink-0">
               <div className="w-[30%] text-center border-t-[1.5px] border-slate-900 pt-1">
                  <p className="text-[6px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Academy Director</p>
                  <div className="font-black text-blue-950 text-[8px] uppercase truncate">DIRECTOR NAME</div>
               </div>
               <div className="w-[30%] text-center border-t-[1.5px] border-slate-900 pt-1">
                  <p className="text-[6px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Resumption Node</p>
                  <div className="font-black text-red-700 text-[8px] uppercase">2025-05-12</div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;
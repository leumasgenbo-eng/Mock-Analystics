
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
  loggedInUser?: { name: string; nodeId: string; role: string; email?: string; subject?: string } | null;
}

const ReportCard: React.FC<ReportCardProps> = ({ student, stats, settings, onSettingChange, onStudentUpdate, classAverageAggregate, totalEnrolled, isFacilitator, loggedInUser }) => {
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

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const element = document.getElementById(`capture-area-${student.id}`);
    if (!element) return setIsGenerating(false);
    const opt = { 
      margin: 0, filename: `${student.name.replace(/\s+/g, '_')}_REPORT.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { scale: 3, useCORS: true, letterRendering: true, windowWidth: 794 }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleWhatsAppShare = () => {
    let msg = `*${settings.schoolName} - ASSESSMENT REPORT*\n` +
                `Name: *${student.name}*\n` +
                `Aggregate: *${student.bestSixAggregate}*\n` +
                `Rank: *${student.rank} of ${totalEnrolled}*\n` +
                `Status: ${student.category}`;
    
    if (isFacilitator && loggedInUser) {
      msg += `\n\n*FORWARDED BY:* ${loggedInUser.name}\n` +
             `*FACILITATOR EID:* ${loggedInUser.nodeId}\n` +
             `*SUBJECT:* ${loggedInUser.subject || 'GENERAL'}`;
    }
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center mb-16 relative w-full px-2">
       
       <div className="fixed bottom-24 right-6 flex flex-col gap-3 no-print z-[100]">
          <button title="Share WhatsApp" onClick={handleWhatsAppShare} className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-green-600 text-white active:scale-90 transition-all">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/></svg>
          </button>
          <button title="Download PDF" onClick={handleDownloadPDF} disabled={isGenerating} className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white'}`}>
             {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
          </button>
       </div>

       <div className="overflow-x-auto w-full flex justify-center py-2 bg-gray-100/50 rounded-[2rem] shadow-inner no-scrollbar" style={{ minHeight: `calc(297mm * ${scale})` }}>
         <div id={`capture-area-${student.id}`} className="bg-white w-[210mm] h-[297mm] shadow-2xl flex flex-col p-6 box-border font-sans overflow-hidden border border-gray-100 flex-shrink-0" style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
            
            {/* BRANDING HEADER - Unified & Editable */}
            <div className="shrink-0 mb-4">
               <ReportBrandingHeader 
                  settings={settings} 
                  onSettingChange={onSettingChange} 
                  reportTitle={settings.examTitle}
                  subtitle="OFFICIAL ACADEMIC ATTAINMENT RECORD"
                  isLandscape={false}
               />
            </div>

            {/* PUPIL & LOGISTICS MATRIX */}
            <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">
               <div className="border border-blue-900 rounded-xl overflow-hidden bg-slate-50/30">
                  <div className="bg-blue-950 text-white text-[7px] font-black px-3 py-1 uppercase tracking-widest flex items-center justify-between">
                     <span>Logistics Node</span>
                     <span className="opacity-50 font-mono">NODE-0{student.id % 9}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                     {[
                        {l:'Series Cycle',k:'activeMock',v:settings.activeMock},
                        {l:'Current Term',k:'termInfo',v:settings.termInfo},
                        {l:'Academic Yr',k:'academicYear',v:settings.academicYear},
                        {l:'Authority',k:'headTeacherName',v:settings.headTeacherName},
                     ].map((item, i) => (
                        <div key={i} className="flex h-5 items-center px-3 gap-2">
                           <span className="text-[6px] font-black text-blue-600 uppercase w-[45px] shrink-0 border-r border-gray-100">{item.l}</span>
                           <div className="text-[8px] font-black text-blue-950 uppercase truncate flex-1">
                              <EditableField value={item.v as string} onChange={(v) => onSettingChange(item.k as any, v)} className="w-full" />
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
               <div className="border border-blue-900 rounded-xl overflow-hidden bg-blue-50/10">
                  <div className="bg-blue-950 text-white text-[7px] font-black px-3 py-1 uppercase tracking-widest flex items-center justify-between">
                     <span>Candidate Particulars</span>
                     <span className="opacity-50">VERIFIED</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                     {[{l:'Full Name',v:student.name},{l:'Attendance',v:`${student.attendance} / ${settings.attendanceTotal}`},{l:'Mock Rank',v:`#${student.rank} OF ${totalEnrolled}`},{l:'Best 6 Agg',v:student.bestSixAggregate}].map((item, i) => (
                        <div key={i} className="flex h-5 items-center px-3 gap-2">
                           <span className="text-[6px] font-black text-gray-400 uppercase w-[45px] shrink-0 border-r border-gray-100">{item.l}</span>
                           <span className={`text-[8px] font-black uppercase truncate ${item.l==='Best 6 Agg'?'text-red-700':'text-blue-950'}`}>{item.v}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            {/* RESULTS MATRIX */}
            <div className="mb-3 shrink-0">
               <table className="w-full text-[10px] border-collapse border-[1.5px] border-blue-900 rounded-xl overflow-hidden">
                  <thead className="bg-blue-950 text-white uppercase text-[6px] font-black tracking-widest">
                    <tr className="h-5">
                      <th className="px-4 text-left">Academic Discipline</th>
                      <th className="px-1 text-center w-[20px]">Obj</th>
                      <th className="px-1 text-center w-[20px]">Thy</th>
                      <th className="px-1 text-center w-[20px]">SBA</th>
                      <th className="px-1 text-center w-[25px] bg-blue-800">Total</th>
                      <th className="px-1 text-center w-[25px]">Grd</th>
                      <th className="px-4 text-left">Instructional Remark Shard</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                     {student.subjects.map(sub => (
                       <tr key={sub.subject} className="even:bg-blue-50/5 font-bold h-[18px]">
                         <td className="px-4 py-[1px] text-blue-950 uppercase truncate max-w-[150px] text-[8.5px] border-r border-gray-50">{sub.subject}</td>
                         <td className="py-[1px] px-1 text-center font-mono text-gray-400 text-[9px] border-r border-gray-50">{sub.sectionA ?? '—'}</td>
                         <td className="py-[1px] px-1 text-center font-mono text-gray-400 text-[9px] border-r border-gray-50">{sub.sectionB ?? '—'}</td>
                         <td className="py-[1px] px-1 text-center font-mono text-gray-400 text-[9px] border-r border-gray-50">{Math.round(sub.sbaScore)}</td>
                         <td className="py-[1px] px-1 text-center font-black bg-blue-50/30 text-blue-900 text-[9px] border-r border-gray-100">{Math.round(sub.finalCompositeScore)}</td>
                         <td className={`py-[1px] px-1 text-center font-black text-[9.5px] border-r border-gray-100 ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-900'}`}>{sub.grade}</td>
                         <td className="px-4 py-[1px] text-[7.5px] uppercase text-slate-500 italic truncate max-w-[200px] font-medium leading-none">{sub.remark}</td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            {/* PERFORMANCE ANALYSIS HEATMAP */}
            <div className="mb-3 grid grid-cols-4 gap-2 shrink-0 h-[40px]">
               <div className="col-span-1 bg-blue-950 text-white rounded-2xl flex flex-col items-center justify-center border border-blue-900 shadow-lg h-full">
                  <span className="text-[6px] font-black uppercase tracking-widest opacity-60">Overall Efficiency</span>
                  <span className="text-lg font-black font-mono leading-none">{((student.subjects.filter(s=>s.gradeValue <= 6).length / student.subjects.length)*100).toFixed(0)}%</span>
               </div>
               <div className="col-span-3 border border-gray-200 rounded-2xl flex items-center justify-around bg-slate-50/50 h-full px-4">
                  {['A1','B2','B3','C4','C5','C6','D7','E8','F9'].map(g => (
                    <div key={g} className="flex flex-col items-center justify-center">
                       <span className="text-[6px] font-black text-slate-400 leading-none mb-1">{g}</span>
                       <span className={`text-[11px] font-black leading-none ${gradeDistribution[g] ? 'text-blue-900' : 'text-slate-200'}`}>
                          {gradeDistribution[g] || 0}
                       </span>
                    </div>
                  ))}
               </div>
            </div>

            {/* NRT ANALYTICAL APPENDICES */}
            <div className="grid grid-cols-1 gap-2 mb-2 shrink-0">
               <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl relative h-[75px] overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 px-3 py-0.5 bg-blue-600 text-white text-[5px] font-black uppercase tracking-widest rounded-bl-xl">Instructional Feedback Shard</div>
                  <p className="text-[9.5px] font-black text-blue-100 uppercase leading-snug italic">
                    {student.overallRemark || 'The candidate demonstrates a stable academic profile with consistent mastery in core disciplines. Continued focus on Section B articulation is recommended.'}
                  </p>
               </div>
               <div className="bg-indigo-50 border border-indigo-200 px-5 py-3 rounded-2xl relative h-[75px] overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 px-3 py-0.5 bg-indigo-900 text-white text-[5px] font-black uppercase tracking-widest rounded-bl-xl">Administrative Recommendation</div>
                  <p className="text-[9px] font-bold text-indigo-900 uppercase leading-tight">
                     PROMOTION OF INTENSIVE REMEDIAL CLUSTERS IN IDENTIFIED WEAK STRANDS. COGNITIVE CALIBRATION REQUIRED FOR TECHNICAL PAPERS.
                  </p>
               </div>
            </div>

            {/* SIGNATURE NODES */}
            <div className="flex justify-between items-end mt-auto pb-2 border-t-[1.5px] border-slate-100 pt-4 shrink-0">
               <div className="w-[30%] text-center border-t-2 border-slate-950 pt-2">
                  <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1">
                    <EditableField value={settings.adminRoleTitle || "Academy Director"} onChange={(v) => onSettingChange('adminRoleTitle', v)} />
                  </p>
                  <div className="font-black text-blue-950 text-[10px] uppercase truncate">
                    <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} />
                  </div>
               </div>
               <div className="w-[30%] text-center border-t-2 border-slate-950 pt-2">
                  <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-1">Next Resumption</p>
                  <div className="font-black text-red-700 text-[10px] uppercase">
                    <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} />
                  </div>
               </div>
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;

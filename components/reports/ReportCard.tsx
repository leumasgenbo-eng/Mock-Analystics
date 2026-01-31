import React, { useState, useMemo } from 'react';
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

  const dynamicAnalysis = useMemo(() => {
    const strengths = student.subjects.filter(s => s.finalCompositeScore >= (stats.subjectMeans[s.subject] || 50) + 5).map(s => s.subject);
    const weaknesses = student.subjects.filter(s => s.finalCompositeScore < (stats.subjectMeans[s.subject] || 50)).map(s => ({ name: s.subject, mean: Math.round(stats.subjectMeans[s.subject]) }));
    const regionalLocality = settings.schoolAddress.split(',')[0] || "this locality";

    const strengthText = strengths.length > 0 
        ? `Exhibits mastery in ${strengths.slice(0, 2).join(", ")}, performing above the benchmark in ${regionalLocality}.` 
        : `Maintains a steady performance profile across core subjects.`;
    
    const weaknessText = weaknesses.length > 0
        ? `Remedial focus in ${weaknesses.slice(0, 1).map(w => w.name).join("")} is advised to bridge the gap with the cohort mean.`
        : `Academic output is highly competitive within the regional perimeter.`;

    return { 
      performance: `${strengthText} ${weaknessText}`, 
      recommendation: student.bestSixAggregate <= 15 ? "Outstanding result. Continue consistent study habits." : "Needs more intensive focus on theoretical applications." 
    };
  }, [student, stats, settings.schoolAddress]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const captureArea = document.getElementById(`capture-target-${student.id}`);
    if (!captureArea) return setIsGenerating(false);
    
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_REPORT.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { scale: 4, useCORS: true, letterRendering: true, windowWidth: 794 }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(captureArea).save();
    } catch (e) { 
        console.error("CAPI Capture Error:", e); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  return (
    <div className="flex flex-col items-center mb-24 group">
       {/* UI PREVIEW HEADER - Editable Institutional Shard */}
       <div className="w-[210mm] no-print mb-8 px-8 animate-in fade-in duration-1000">
          <div className="flex items-center gap-4 mb-4 opacity-40">
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
             <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.5em]">Identity Shard Sync (UI Only)</p>
          </div>
          <div className="bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm">
             <ReportBrandingHeader 
               settings={settings} 
               onSettingChange={onSettingChange} 
               reportTitle={settings.examTitle}
               readOnly={false}
             />
          </div>
       </div>

       {/* OFFICIAL A4 CAPTURE SHARD */}
       <div 
         id={`capture-target-${student.id}`} 
         className="bg-white w-[210mm] h-[297mm] shadow-[0_45px_100px_-15px_rgba(0,0,0,0.1)] print:shadow-none relative flex flex-col p-12 box-border font-sans overflow-hidden border border-gray-100"
       >
          {/* CAPI COMMANDS */}
          <div data-html2canvas-ignore="true" className="absolute top-8 right-8 no-print flex gap-3 z-[100] opacity-0 group-hover:opacity-100 transition-all duration-500">
             <button onClick={() => window.print()} className="w-12 h-12 bg-blue-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg></button>
             <button onClick={handleDownloadPDF} disabled={isGenerating} className={`w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white hover:scale-110'}`}>{isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}</button>
          </div>

          {/* ASSESSMENT STRIPE (START OF PDF) */}
          <div className="shrink-0 mb-6">
            <div className="bg-slate-950 text-white py-10 rounded-[3rem] text-center relative overflow-hidden shadow-2xl border-4 border-white mb-8">
               <h2 className="text-3xl font-black uppercase tracking-[0.2em] relative z-10">{settings.examTitle}</h2>
               <p className="text-[10px] font-black text-blue-400 tracking-[0.6em] uppercase mt-2 relative z-10">INDIVIDUAL PUPIL ATTAINMENT REPORT</p>
               <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-5 gap-4 text-[10px] font-black text-gray-800 uppercase tracking-widest px-2">
               {[
                 { l: 'Series', v: settings.activeMock },
                 { l: 'Term', v: settings.termInfo },
                 { l: 'Cycle', v: settings.academicYear },
                 { l: 'Authority', v: settings.adminRoleTitle || "DIRECTOR" },
                 { l: 'Registry', v: settings.registryRoleTitle || "EXAM HUB" }
               ].map((item, i) => (
                 <div key={i} className="flex flex-col items-center bg-gray-50 p-3 rounded-2xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">{item.l}</span><span className="text-blue-950 truncate w-full text-center">{item.v}</span></div>
               ))}
            </div>
          </div>

          {/* IDENTITY MATRIX */}
          <div className="grid grid-cols-2 gap-10 mb-6 border-4 border-blue-900 p-8 rounded-[4rem] bg-blue-50/5 shrink-0">
             <div className="space-y-3 border-r-2 border-blue-100 pr-10">
               <div className="flex flex-col"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Pupil Identity</span><span className="text-xl font-black text-blue-950 uppercase truncate leading-none">{student.name}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Network Node</span><span className="font-mono text-sm font-black text-blue-800">#{student.id.toString().padStart(6, '0')}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Engagement</span><span className="font-black text-blue-950">{student.attendance} / {settings.attendanceTotal}</span></div>
             </div>
             <div className="space-y-3">
               <div className="flex justify-between items-end"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Best 6 Agg</span><span className="text-5xl font-black text-blue-950 leading-none tracking-tighter">{student.bestSixAggregate}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Rank</span><span className="font-black text-lg text-blue-900">#{student.rank} OF {totalEnrolled}</span></div>
               <div className="flex justify-between items-center"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Assessment Level</span><span className={`px-4 py-1 rounded-xl text-white text-[10px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
             </div>
          </div>

          {/* CAPI DATA MATRIX */}
          <div className="mb-6 flex-1 overflow-hidden">
            <table className="w-full text-[13px] border-collapse border-4 border-blue-900 rounded-[2rem] overflow-hidden">
               <thead className="bg-blue-950 text-white uppercase text-[9px] font-black tracking-[0.2em]">
                 <tr>
                   <th className="py-4 px-6 text-left">Academic Discipline</th>
                   <th className="py-4 px-1 text-center w-14">Obj</th>
                   <th className="py-4 px-1 text-center w-14">Thy</th>
                   <th className="py-4 px-1 text-center w-14">SBA</th>
                   <th className="py-4 px-1 text-center w-20 bg-blue-900">Total</th>
                   <th className="py-4 px-1 text-center w-16">Grd</th>
                   <th className="py-4 px-6 text-left">Faculty</th>
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
                      <td className="px-6 py-1 text-[9px] font-bold text-blue-800 uppercase truncate opacity-50 italic">{sub.facilitator}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>

          {/* HEURISTIC ANALYSIS */}
          <div className="grid grid-cols-1 gap-4 mb-6 text-[13px] shrink-0">
             <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 relative">
                <span className="font-black text-blue-900 uppercase block text-[10px] mb-2 tracking-[0.4em]">Heuristic Performance Shard:</span>
                <p className="italic text-slate-800 leading-relaxed font-bold text-sm">"{dynamicAnalysis.performance}"</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-blue-50/30 p-6 rounded-[2.5rem] border border-blue-100"><span className="font-black text-blue-900 uppercase block text-[9px] mb-2 tracking-[0.4em]">Conduct Shard:</span><p className="font-black text-blue-950 uppercase italic leading-tight text-sm">"{student.conductRemark || 'EXEMPLARY CHARACTER OBSERVED.'}"</p></div>
               <div className="bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-100">
                  <span className="font-black text-indigo-900 uppercase block text-[9px] mb-2 tracking-[0.4em]">Mastery Guidance:</span>
                  <div className="text-indigo-950 font-black italic leading-tight text-sm">
                    <EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none" />
                  </div>
               </div>
             </div>
          </div>

          {/* VALIDATION NODE */}
          <div className="flex justify-between items-end mt-auto pb-4 border-t-2 border-slate-100 pt-6 shrink-0">
            <div className="w-[35%] text-center border-t-4 border-slate-900 pt-3">
               <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">
                 <EditableField value={settings.adminRoleTitle || "Academy Director"} onChange={(v) => onSettingChange('adminRoleTitle', v)} />
               </p>
               <div className="font-black text-blue-950 text-[13px] uppercase truncate">
                  <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
               </div>
            </div>
            <div className="w-[35%] text-center border-t-4 border-slate-900 pt-3">
               <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">Resumption Protocol</p>
               <div className="font-black text-red-700 text-[13px] uppercase">
                  <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} className="text-center" />
               </div>
            </div>
          </div>
       </div>
    </div>
  );
};

export default ReportCard;
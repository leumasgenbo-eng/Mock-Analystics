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
    const reportId = `report-${student.id}`;
    const element = document.getElementById(reportId);
    if (!element) return setIsGenerating(false);
    
    // Configure for high-fidelity screen capture on strictly one A4 sheet
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_${settings.activeMock}_Report.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        allowTaint: false
      }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (e) { 
        console.error("PDF Generation Fault:", e); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleShareWhatsApp = () => {
    const phone = (student.parentContact || "").replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const message = `*${settings.schoolName} - ASSESSMENT ALERT*\n\n` +
                    `Results for *${student.name}* (${settings.activeMock}):\n` +
                    `• *Best 6 Aggregate:* ${student.bestSixAggregate}\n` +
                    `• *Class Position:* ${student.rank} of ${totalEnrolled}\n\n` +
                    `_Generated via SS-Map Institutional Hub_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div id={`report-${student.id}`} className="bg-white p-6 w-[210mm] mx-auto h-[297mm] border border-gray-100 shadow-2xl print:shadow-none print:border-none page-break relative flex flex-col box-border font-sans mb-10 overflow-hidden shrink-0">
       
       {/* ACTION COMMAND CENTER - Hidden for print and during capture */}
       <div data-html2canvas-ignore="true" className="absolute top-4 right-4 no-print flex gap-2 z-[60]">
          <button 
            onClick={handleShareWhatsApp} 
            className="w-10 h-10 bg-green-500 text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
            title="Share via WhatsApp"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/></svg>
          </button>
          <button 
            onClick={handleDownloadPDF} 
            disabled={isGenerating} 
            className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white hover:scale-110 active:scale-95'}`}
            title="Capture to PDF"
          >
             {isGenerating ? (
               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
             ) : (
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             )}
          </button>
       </div>

       {/* Academy Branding Section */}
       <div className="mb-2 shrink-0">
         <ReportBrandingHeader 
           settings={settings} 
           onSettingChange={onSettingChange} 
           reportTitle={settings.examTitle}
           subtitle="INDIVIDUAL PUPIL ATTAINMENT REPORT"
         />
       </div>

       {/* Pupil Identity Block */}
       <div className="grid grid-cols-2 gap-4 mb-3 border-2 border-blue-900 p-3 rounded-2xl bg-blue-50/5 text-[11px] font-bold shrink-0">
          <div className="space-y-1 border-r border-blue-100 pr-4">
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Pupil:</span><span className="flex-1 uppercase font-black text-blue-950 truncate">{student.name}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Index:</span><span className="flex-1 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Attendance:</span><span className="font-black text-blue-900">{student.attendance} OF {settings.attendanceTotal}</span></div>
          </div>
          <div className="space-y-1 pl-2">
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[9px]">Best 6 Aggregate:</span><span className="text-2xl font-black text-blue-950 leading-none">{student.bestSixAggregate}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[9px]">Class Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled || '---'}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[9px]">Academic Level:</span><span className={`px-2 py-0.5 rounded text-white text-[8px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
          </div>
       </div>

       {/* Subjects Result Matrix */}
       <div className="mb-3 flex-1 overflow-hidden">
         <table className="w-full text-[10px] border-collapse border-2 border-blue-900">
            <thead className="bg-blue-950 text-white uppercase text-[8px] tracking-widest">
              <tr>
                <th className="py-2 px-3 text-left">Academic Discipline</th>
                <th className="py-2 px-1 text-center">Obj</th>
                <th className="py-2 px-1 text-center">Thy</th>
                <th className="py-2 px-1 text-center">SBA</th>
                <th className="py-2 px-1 text-center bg-blue-900">Total</th>
                <th className="py-2 px-1 text-center">Grd</th>
                <th className="py-2 px-3 text-left">Facilitator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {student.subjects.map(sub => (
                 <tr key={sub.subject} className="even:bg-gray-50/30 font-bold h-7">
                   <td className="px-3 py-1 text-blue-950 uppercase truncate max-w-[140px]">{sub.subject}</td>
                   <td className="py-1 text-center font-mono">{sub.sectionA ?? '-'}</td>
                   <td className="py-1 text-center font-mono">{sub.sectionB ?? '-'}</td>
                   <td className="py-1 text-center font-mono">{Math.round(sub.sbaScore)}</td>
                   <td className="py-1 text-center font-black bg-blue-50/50 text-blue-900">{Math.round(sub.finalCompositeScore)}</td>
                   <td className={`py-1 text-center font-black ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                   <td className="px-3 py-1 text-[8px] font-black text-blue-800 uppercase truncate opacity-60 italic">{sub.facilitator}</td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>

       {/* Remarks & Character Section */}
       <div className="grid grid-cols-1 gap-2 mb-3 text-[10px] shrink-0">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 shadow-sm">
             <span className="font-black text-blue-900 uppercase block text-[8px] mb-1 tracking-widest">Performance Shard Analysis:</span>
             <p className="italic text-gray-700 leading-relaxed font-bold">"{dynamicAnalysis.performance}"</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50/30 p-3 rounded-xl border border-blue-100"><span className="font-black text-blue-900 uppercase block text-[8px] mb-1 tracking-widest">Conduct & Character:</span><p className="font-black text-blue-800 uppercase italic leading-tight">"{student.conductRemark || 'EXEMPLARY CHARACTER OBSERVED.'}"</p></div>
            <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100"><span className="font-black text-indigo-900 uppercase block text-[8px] mb-1 tracking-widest">Mastery Guidance:</span><div className="text-indigo-950 font-black italic leading-tight"><EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none text-[10px]" /></div></div>
          </div>
       </div>

       {/* Logic Appendix */}
       <div className="mt-auto pt-2 border-t border-gray-100 shrink-0">
          <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between items-center gap-4">
             <div className="flex-1">
                <h5 className="text-[7px] font-black uppercase tracking-[0.2em] mb-1">NRT Grading Logic (σ-Spread: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'})</h5>
                <p className="text-[7px] leading-tight opacity-60">Grades derived relative to cohort mean (μ). BSA calculated from 4 Core + 2 best Electives. Lower aggregate signifies proficiency.</p>
             </div>
             <div className="text-[7px] font-mono opacity-30 text-right uppercase">Network Shard<br/>{student.id.toString(16).toUpperCase()}</div>
          </div>
       </div>

       {/* Validation & Auth Signatures */}
       <div className="flex justify-between items-end mt-4 pb-2 border-t border-gray-100 pt-3 shrink-0">
         <div className="w-[30%] text-center border-t-2 border-gray-900 pt-1">
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">
              <EditableField value={settings.adminRoleTitle || "Academy Director"} onChange={(v) => onSettingChange('adminRoleTitle', v)} />
            </p>
            <div className="font-black text-blue-900 text-[9px] uppercase truncate">
               <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
            </div>
         </div>
         <div className="w-[30%] text-center border-t-2 border-gray-900 pt-1">
            <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-0.5">Resumption Protocol</p>
            <div className="font-black text-red-700 text-[9px] uppercase">
               <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} className="text-center" />
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;
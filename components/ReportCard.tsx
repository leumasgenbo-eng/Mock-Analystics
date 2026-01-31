
import React, { useState, useMemo } from 'react';
import { ProcessedStudent, GlobalSettings, ClassStatistics } from '../types';
import { CORE_SUBJECTS } from '../constants';
import EditableField from './EditableField';

interface ReportCardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: string) => void;
  classAverageAggregate: number;
  totalEnrolled?: number;
}

const ReportCard: React.FC<ReportCardProps> = ({ student, stats, settings, onSettingChange, classAverageAggregate, totalEnrolled }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const coreSubjects = student.subjects.filter(s => CORE_SUBJECTS.includes(s.subject))
    .sort((a, b) => b.finalCompositeScore - a.finalCompositeScore);
  const electiveSubjects = student.subjects.filter(s => !CORE_SUBJECTS.includes(s.subject))
    .sort((a, b) => b.finalCompositeScore - a.finalCompositeScore);

  const dynamicAnalysis = useMemo(() => {
    const strengths = student.subjects.filter(s => s.finalCompositeScore >= (stats.subjectMeans[s.subject] || 50) + 5).map(s => s.subject);
    const weaknesses = student.subjects.filter(s => s.finalCompositeScore < (stats.subjectMeans[s.subject] || 50)).map(s => ({ name: s.subject, mean: Math.round(stats.subjectMeans[s.subject]) }));
    
    const mockSeries = settings.committedMocks || [];
    let trendStr = "This is the initial baseline assessment.";
    if (mockSeries.length > 0 && student.seriesHistory) {
        const lastMock = mockSeries[mockSeries.length - 1];
        const prevAgg = student.seriesHistory[lastMock]?.aggregate;
        if (prevAgg !== undefined) {
            const diff = prevAgg - student.bestSixAggregate; 
            if (diff > 0) trendStr = `Outstanding improvement! Aggregates improved by ${diff} points compared to ${lastMock}.`;
            else if (diff < 0) trendStr = `Aggregates declined by ${Math.abs(diff)} points compared to ${lastMock}. Urgent focus required.`;
            else trendStr = `Performance remains stable compared to ${lastMock}.`;
        }
    }

    const strengthText = strengths.length > 0 
        ? `Exhibits strong mastery and proficiency in ${strengths.slice(0, 3).join(", ")}, performing well above the class average.` 
        : "Maintaining a consistent effort across most subject areas.";
    
    const weaknessText = weaknesses.length > 0
        ? `However, attention is needed in ${weaknesses.slice(0, 2).map(w => `${w.name} (scored below mean of ${w.mean})`).join(" and ")}, where understanding appears lower than the class standard.`
        : "Performance is competitive across all examined areas.";

    const recommendation = student.bestSixAggregate <= 15 
        ? "Continue with current intensive study habits to maintain distinction status."
        : "Strongly recommend participation in organized peer-study groups and remedial sessions to bridge the gaps in identified weak subjects.";

    return { performance: `${strengthText} ${weaknessText} ${trendStr}`, recommendation };
  }, [student, stats, settings]);

  const handleShareWhatsApp = () => {
    const phone = student.parentContact.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const message = `*SS-MAP - PERFORMANCE ALERT*\n\n` +
                    `Dear Parent/Guardian,\n\n` +
                    `The assessment results for *${student.name}* (${settings.examTitle}) are now available:\n\n` +
                    `• *Best 6 Aggregate:* ${student.bestSixAggregate}\n` +
                    `• *Class Position:* ${student.rank} of ${totalEnrolled}\n\n` +
                    `_Generated via SS-Map Institutional Hub_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const reportId = `report-${student.id}`;
    const originalElement = document.getElementById(reportId);
    if (!originalElement) return setIsGenerating(false);
    
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') return setIsGenerating(false);

    const clone = originalElement.cloneNode(true) as HTMLElement;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '-10000px';
    container.appendChild(clone);
    document.body.appendChild(container);

    const opt = {
      margin: 0,
      filename: `${student.name.replace(/\s+/g, '_')}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        // @ts-ignore
        const pdfBlob = await window.html2pdf().set(opt).from(clone).output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url; a.download = opt.filename; a.click();
    } catch (e) { console.error(e); } finally {
        document.body.removeChild(container);
        setIsGenerating(false);
    }
  };

  return (
    <div id={`report-${student.id}`} className="bg-white p-8 max-w-[210mm] mx-auto min-h-[296mm] border border-gray-200 shadow-2xl print:shadow-none print:border-none page-break relative group flex flex-col box-border">
       
       <div data-html2canvas-ignore="true" className="fab-container absolute top-4 -right-16 flex flex-col gap-4 no-print z-50">
          <button onClick={handleShareWhatsApp} className="bg-green-600 hover:bg-green-700 text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110 shadow-green-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"></path></svg>
          </button>
          <button onClick={handleSharePDF} disabled={isGenerating} className={`${isGenerating ? 'bg-gray-400' : 'bg-blue-900 hover:bg-black'} text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110 shadow-blue-500/30`}>
            {isGenerating ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
          </button>
       </div>

       {/* Professional Header */}
       <div className="relative border-b-8 border-double border-blue-900 pb-3 mb-4">
          {settings.schoolLogo && <div className="absolute top-0 left-0 w-20 h-20"><img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" /></div>}
          <div className="text-center px-20">
            <div className="mb-2">
               <span className="text-[8px] font-black text-blue-900 border border-blue-900/20 px-4 py-0.5 rounded-full uppercase tracking-[0.3em]">Inst. ID: {settings.schoolNumber}</span>
            </div>
            <h1 className="text-3xl font-black text-blue-900 tracking-tighter uppercase mb-1 leading-none">
              <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="text-center font-black w-full" />
            </h1>
            <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">
              <EditableField value={settings.schoolAddress || "ACADEMY PHYSICAL ADDRESS, REGION"} onChange={(v) => onSettingChange('schoolAddress', v)} className="text-center w-full" />
            </div>
            <h2 className="text-lg font-black text-red-700 uppercase leading-tight bg-red-50 py-1.5 border-y border-red-100 mb-2">
              <EditableField value={settings.examTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
            </h2>
            <div className="flex justify-center gap-6 text-[10px] font-black text-gray-800 tracking-widest uppercase">
              <span className="bg-blue-900 text-white px-3 py-0.5 rounded">{settings.termInfo}</span>
              <span className="border-x border-gray-300 px-4">Series: {settings.activeMock}</span>
              <span className="italic">AY: {settings.academicYear}</span>
            </div>
          </div>
       </div>

       {/* Pupil Identity & Welfare */}
       <div className="grid grid-cols-2 gap-4 mb-4 border-2 border-blue-900 p-3 rounded-2xl bg-blue-50/20 text-[11px] font-bold">
          <div className="space-y-1.5 border-r border-blue-200 pr-3">
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Pupil:</span><span className="flex-1 border-b border-gray-200 uppercase font-black text-blue-900 truncate">{student.name}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">ID Index:</span><span className="flex-1 border-b border-gray-200 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Attendance:</span><span className="font-black text-indigo-900">{student.attendance} out of {settings.attendanceTotal}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Mock Start:</span><span className="font-black text-gray-700 italic">{settings.startDate || 'TBA'}</span></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Aggregate:</span><span className="text-2xl font-black text-blue-900 leading-none">{student.bestSixAggregate}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled || '---'}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Level:</span><span className={`px-2 py-0.5 rounded text-white text-[9px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase tracking-tighter">Status:</span><span className="text-gray-500 italic">OFFICIAL RECORD</span></div>
          </div>
       </div>

       {/* Results Table */}
       <div className="mb-4">
         <table className="w-full text-[11px] border-collapse border-2 border-blue-900">
            <thead>
              <tr className="bg-blue-900 text-white uppercase text-[8px] tracking-[0.2em]">
                 <th className="py-2 px-3 text-left w-[25%]">Subject of Study</th>
                 <th className="py-2 px-1 w-10 text-center">Exam</th>
                 {settings.sbaConfig.enabled && <th className="py-2 px-1 w-10 text-center">SBA</th>}
                 <th className="py-2 px-1 w-10 text-center bg-blue-800">Total</th>
                 <th className="py-2 px-1 w-8 text-center">Grd</th>
                 <th className="py-2 px-2 text-left">Remark</th>
                 <th className="py-2 px-2 text-left w-[20%]">Facilitator</th>
              </tr>
            </thead>
            <tbody>
               {student.subjects.map(sub => (
                 <tr key={sub.subject} className="even:bg-gray-50/50 leading-tight font-bold border-b border-gray-100">
                   <td className="px-3 py-2 text-blue-900 truncate">{sub.subject}</td>
                   <td className="py-2 text-center font-mono text-sm">{Math.round(sub.score)}</td>
                   {settings.sbaConfig.enabled && <td className="py-2 text-center font-mono text-sm">{Math.round(sub.sbaScore)}</td>}
                   <td className="py-2 text-center font-black text-sm bg-blue-50/30">{Math.round(sub.finalCompositeScore)}</td>
                   <td className={`py-2 text-center font-black text-sm ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-900'}`}>{sub.grade}</td>
                   <td className="px-2 py-2 text-[7px] uppercase text-gray-400 italic truncate max-w-[80px]">{sub.remark}</td>
                   <td className="px-2 py-2 text-[8px] font-black text-blue-800 uppercase truncate">{sub.facilitator}</td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>

       {/* Remarks Matrix */}
       <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
             <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest mb-1">Academic Performance Analysis</h4>
             <p className="text-[10px] font-medium leading-relaxed text-gray-700 italic">{dynamicAnalysis.performance}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
                <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest mb-1">Conduct & Character</h4>
                <p className="text-[10px] font-black text-blue-800 uppercase leading-relaxed">{student.conductRemark || '--- NO REMARK ENTERED ---'}</p>
             </div>
             <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                <h4 className="text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-1">Recommendations</h4>
                <p className="text-[10px] font-medium text-indigo-800 leading-relaxed">{dynamicAnalysis.recommendation}</p>
             </div>
          </div>
       </div>

       {/* NRT Logic Appendix */}
       <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="bg-gray-900 text-white p-4 rounded-xl space-y-2">
             <div className="flex justify-between items-center">
                <h5 className="text-[8px] font-black uppercase tracking-[0.2em]">Norm-Referenced Grading Appendix (NRT)</h5>
                <span className="text-[7px] font-bold opacity-40 uppercase">Distribution: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'}</span>
             </div>
             <p className="text-[7px] leading-relaxed opacity-70">
                Grades are calculated relative to the cohort mean (<strong>μ</strong>) and standard deviation (<strong>σ</strong>). 
                An <strong>A1</strong> indicates performance significantly above the class average, while <strong>C-grades</strong> represent the Credit/Proficient zone. 
                BSA (Best Six Aggregate) is calculated using 4 Core + 2 best Electives. Lower aggregate = Higher distinction.
             </p>
          </div>
       </div>

       {/* Signatures */}
       <div className="flex justify-between items-end mt-8 pb-4">
         <div className="w-[30%] text-center border-t border-gray-900 pt-1">
            <p className="font-black text-[8px] uppercase text-gray-500">Form Facilitator</p>
         </div>
         <div className="w-[30%] text-center border-t border-gray-900 pt-1">
            <p className="font-black text-[8px] uppercase text-gray-500">Administrator</p>
            <p className="text-[7px] font-bold text-blue-900 mt-1 uppercase truncate">{settings.headTeacherName}</p>
         </div>
         <div className="w-[30%] text-center border-t border-gray-900 pt-1">
            <p className="font-black text-[8px] uppercase text-gray-500">Resumption Date</p>
            <div className="no-print">
              <input 
                type="date" 
                value={settings.nextTermBegin} 
                onChange={(e) => onSettingChange('nextTermBegin', e.target.value)}
                className="text-[7px] font-bold text-red-700 bg-transparent outline-none w-full text-center"
              />
            </div>
            <div className="hidden print:block text-[7px] font-bold text-red-700 mt-1 uppercase">
               {new Date(settings.nextTermBegin).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </div>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;

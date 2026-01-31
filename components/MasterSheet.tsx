
import React, { useState, useMemo } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, StaffAssignment, StudentData } from '../types';
import { SUBJECT_LIST } from '../constants';
import EditableField from './EditableField';

interface MasterSheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: string) => void;
  facilitators: Record<string, StaffAssignment>;
}

const MOCK_SERIES = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);

const MasterSheet: React.FC<MasterSheetProps> = ({ students, stats, settings, onSettingChange, facilitators }) => {
  const [sheetView, setSheetView] = useState<'composite' | 'supplementary'>('composite');

  const getGradeColor = (grade: string) => {
    if (grade === 'A1') return 'bg-green-100 text-green-800';
    if (grade === 'B2' || grade === 'B3') return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-50 text-yellow-800';
    if (grade === 'F9') return 'bg-red-100 text-red-800 font-bold';
    return 'text-gray-600';
  };

  const facilitatorAnalytics = useMemo(() => {
    return SUBJECT_LIST.map(subject => {
      const facilitatorName = facilitators[subject]?.name || "TBA";
      const totalStudents = students.length;
      const creditOrBetter = students.filter(s => {
        const subData = s.subjects.find(sub => sub.subject === subject);
        return subData && subData.gradeValue <= 6; 
      }).length;
      
      const qpr = totalStudents > 0 ? (creditOrBetter / totalStudents) * 100 : 0;
      
      let rating = "Standard";
      let color = "text-gray-600";
      if (qpr >= 85) { rating = "Elite"; color = "text-emerald-600"; }
      else if (qpr >= 70) { rating = "High Performance"; color = "text-blue-600"; }
      else if (qpr < 40) { rating = "Under-par"; color = "text-red-600"; }

      return {
        subject,
        facilitatorName,
        mean: stats.subjectMeans[subject],
        qpr,
        rating,
        color
      };
    });
  }, [students, stats, facilitators]);

  return (
    <div className="bg-white p-4 print:p-0 min-h-screen max-w-[297mm] mx-auto overflow-hidden print:overflow-visible print:max-w-none">
      
      <div className="no-print mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Academy Control Panel
          </h3>
          <div className="flex gap-2">
             <button 
               onClick={() => setSheetView('composite')} 
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'composite' ? 'bg-blue-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
             >
               Master Composite
             </button>
             <button 
               onClick={() => setSheetView('supplementary')} 
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'supplementary' ? 'bg-indigo-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}
             >
               Supplementary Sub-Scores
             </button>
          </div>
        </div>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200 shadow-inner">
           {MOCK_SERIES.map(mock => (
             <button
               key={mock}
               onClick={() => onSettingChange('activeMock', mock)}
               className={`py-2.5 rounded-lg text-[11px] font-black uppercase transition-all flex flex-col items-center justify-center gap-0.5 ${settings.activeMock === mock ? 'bg-blue-900 text-white shadow-lg ring-2 ring-blue-500 ring-offset-1' : 'bg-white text-blue-900 border border-transparent hover:border-blue-300 hover:bg-blue-50'}`}
             >
               <span className="opacity-50 text-[8px]">SERIES</span>
               {mock.split(' ')[1]}
             </button>
           ))}
        </div>
      </div>

      <div className="relative mb-6">
        {settings.schoolLogo && (
          <div className="absolute top-0 left-0 w-24 h-24 print:w-20 print:h-20">
             <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="text-center px-24">
          <div className="mb-1">
             <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 uppercase tracking-widest">Enrollment No: {settings.schoolNumber || "UNREGISTERED"}</span>
          </div>
          <h1 className="text-4xl font-black uppercase text-blue-900 tracking-tighter">
            <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="text-center w-full" />
          </h1>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">
            <EditableField value={settings.schoolAddress || "ACADEMY ADDRESS, REGION, COUNTRY"} onChange={(v) => onSettingChange('schoolAddress', v)} className="text-center w-full" />
          </div>
          <h2 className="text-xl font-black uppercase text-red-700 tracking-tight bg-red-50 py-1 border-y border-red-100 mb-3">
             <EditableField value={settings.examTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
          </h2>
          <h3 className="text-lg font-black text-gray-800 mt-1 uppercase flex items-center justify-center gap-3">
            <span className="bg-blue-900 text-white px-4 py-0.5 rounded shadow-lg">{settings.activeMock}</span>
            {sheetView === 'composite' ? 'MASTER BROAD SHEET' : 'SUPPLEMENTARY SUB-SCORE SHEET (OBJ/THY)'}
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto print:overflow-visible mb-8 shadow-2xl rounded-xl border border-gray-300">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-blue-900 text-white uppercase text-[8px] tracking-widest">
              <th className="border border-blue-800 p-2 sticky left-0 bg-blue-900 z-10 w-10 print:static print:bg-blue-900">Rank</th>
              <th className="border border-blue-800 p-2 sticky left-10 bg-blue-900 z-10 min-w-[180px] text-left print:static print:bg-blue-900">Pupil Full Particulars</th>
              {SUBJECT_LIST.map(sub => (
                <th key={sub} className="border border-blue-800 p-2 min-w-[60px]" colSpan={2}>
                  {sub.substring(0, 15)}
                </th>
              ))}
              {sheetView === 'composite' && (
                <>
                  <th className="border border-blue-800 p-2 font-black">Composite</th>
                  <th className="border border-blue-800 p-2 font-black">AGG.</th>
                  <th className="border border-blue-800 p-2">Status</th>
                </>
              )}
            </tr>
            <tr className="bg-gray-100 text-blue-900 text-[8px] font-black uppercase">
              <th className="border border-gray-200 sticky left-0 bg-gray-100 z-10 print:static"></th>
              <th className="border border-gray-200 sticky left-10 bg-gray-100 z-10 print:static"></th>
              {SUBJECT_LIST.map(sub => (
                <React.Fragment key={sub + '-sub'}>
                  {sheetView === 'composite' ? (
                    <>
                      <th className="border border-gray-200 p-1">{settings.sbaConfig.enabled ? 'Cmp' : 'Exm'}</th>
                      <th className="border border-gray-200 p-1">Grd</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-gray-200 p-1 bg-blue-50">OBJ</th>
                      <th className="border border-gray-200 p-1 bg-indigo-50">THY</th>
                    </>
                  )}
                </React.Fragment>
              ))}
              {sheetView === 'composite' && <th colSpan={3} className="border border-gray-200"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="border border-gray-200 p-1.5 text-center font-black sticky left-0 bg-white group-hover:bg-blue-50/30 transition-colors print:static">{student.rank}</td>
                <td className="border border-gray-200 p-1.5 whitespace-nowrap sticky left-10 bg-white uppercase font-black text-blue-900 group-hover:bg-blue-50/30 transition-colors print:static">{student.name}</td>
                {SUBJECT_LIST.map(subjectName => {
                  const subData = student.subjects.find(s => s.subject === subjectName);
                  const liveMockData = (student as any).mockData?.[settings.activeMock]?.examSubScores?.[subjectName];
                  const histMockData = student.seriesHistory?.[settings.activeMock]?.subScores?.[subjectName];
                  const activeSubScores = liveMockData || histMockData || { sectionA: 0, sectionB: 0 };
                  
                  return (
                    <React.Fragment key={subjectName}>
                      {sheetView === 'composite' ? (
                        <>
                          <td className="border border-gray-100 p-1 text-center font-mono font-bold text-gray-500">
                            {Math.round(subData?.finalCompositeScore || 0)}
                          </td>
                          <td className={`border border-gray-100 p-1 text-center font-black ${getGradeColor(subData?.grade || '')}`}>
                            {subData?.grade || '-'}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border border-gray-100 p-1 text-center font-mono font-bold text-blue-600 bg-blue-50/10">
                            {activeSubScores.sectionA}
                          </td>
                          <td className="border border-gray-100 p-1 text-center font-mono font-bold text-indigo-600 bg-indigo-50/10">
                            {activeSubScores.sectionB}
                          </td>
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
                {sheetView === 'composite' && (
                  <>
                    <td className="border border-gray-200 p-1 text-center font-black bg-gray-50 text-blue-900">{Math.round(student.totalScore)}</td>
                    <td className="border border-gray-200 p-1 text-center font-black text-red-700 bg-red-50">{student.bestSixAggregate}</td>
                    <td className="border border-gray-200 p-1 text-center text-[8px] font-black uppercase tracking-tighter">{student.category}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-12 space-y-6 page-break-inside-avoid">
        <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-3">
           <div className="w-10 h-10 bg-blue-900 text-white flex items-center justify-center rounded-2xl shadow-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
           </div>
           <h4 className="text-sm font-black text-gray-900 uppercase tracking-[0.3em]">Facilitator Performance Index</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {facilitatorAnalytics.map(fa => (
             <div key={fa.subject} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl hover:shadow-2xl transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{fa.subject}</span>
                      <p className="text-xs font-black text-gray-900 uppercase truncate max-w-[180px]">{fa.facilitatorName}</p>
                   </div>
                   <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase bg-gray-50 border border-gray-100 ${fa.color}`}>
                      {fa.rating}
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                   <div className="space-y-1">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Class Mean</span>
                      <p className="text-xl font-black text-blue-900">{Math.round(fa.mean)}%</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Quality Pass (QPR)</span>
                      <p className="text-xl font-black text-indigo-900">{Math.round(fa.qpr)}%</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </section>

      <div className="flex justify-between items-end pt-12 pb-4 print:pt-20 border-t-2 border-blue-900 mt-12">
         <div className="w-1/3 border-t-2 border-gray-900 text-center font-black uppercase text-[10px] pt-2">Exam Officer Designation</div>
         <div className="w-1/3 border-t-2 border-gray-900 text-center font-black uppercase text-[10px] pt-2">Headteacher Verification</div>
      </div>
    </div>
  );
};

export default MasterSheet;


import React, { useState } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, SchoolRegistryEntry } from '../../types';
import ReportCard from '../reports/ReportCard';
import PupilPerformanceSummary from './PupilPerformanceSummary';
import PupilGlobalMatrix from './PupilGlobalMatrix';
import PupilMeritView from './PupilMeritView';
import PupilBeceLedger from './PupilBeceLedger';
import PupilAcademicJourney from './PupilAcademicJourney';
import PupilPracticeHub from './PupilPracticeHub';
import PupilCurriculumInsight from './PupilCurriculumInsight';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface PupilDashboardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  classAverageAggregate: number;
  totalEnrolled: number;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onRefresh: () => void;
  globalRegistry: SchoolRegistryEntry[];
  onLogout: () => void;
  loggedInUser?: { name: string; nodeId: string } | null;
}

const PupilDashboard: React.FC<PupilDashboardProps> = ({ 
  student, stats, settings, classAverageAggregate, totalEnrolled, onSettingChange, onRefresh, globalRegistry, onLogout 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'merit' | 'bece' | 'journey' | 'detailed' | 'global' | 'practice' | 'curriculum'>('report');

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center font-sans">
        <div className="bg-white p-12 md:p-20 rounded-[4rem] shadow-2xl space-y-10 border border-gray-100 max-w-2xl animate-in zoom-in-95 duration-500">
           <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20"></div>
              <div className="relative w-24 h-24 bg-blue-900 text-white rounded-full flex items-center justify-center shadow-2xl border-8 border-slate-50">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14"/></svg>
              </div>
           </div>
           <div className="space-y-4">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Awaiting Shard Sync</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                 Identity Node <span className="text-blue-600">Verified</span>. However, your detailed academic particulars are still propagating from the Institutional Hub.
              </p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={onRefresh} 
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
                 Synchronize Identity Matrix
              </button>
              <button 
                onClick={onLogout} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-400 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all"
              >
                 Revoke Session
              </button>
           </div>
           <p className="text-[10px] text-gray-300 italic uppercase font-black">SS-MAP Network Integrity Protocol v4.6</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'report', label: 'My Report Card', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { id: 'curriculum', label: 'Topic Mastery', icon: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
    { id: 'practice', label: 'Practice Hub', icon: 'M12 20h9M3 20h9M10 10l4 4m0-4l-4 4' },
    { id: 'merit', label: 'My Merit Status', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { id: 'bece', label: 'BECE Ledger', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' },
    { id: 'journey', label: 'Progress Trend', icon: 'M12 20V10M18 20V4M6 20v-6' },
    { id: 'detailed', label: 'Detailed Breakdown', icon: 'M21 21H3V3h18v18zM9 9h6v6H9V9z' },
    { id: 'global', label: 'Global Matrix', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col p-4 md:p-8 print:p-0">
      <div className="no-print w-full bg-slate-900 text-white rounded-3xl mb-8 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border border-white/5">
         <div className="flex items-center gap-5">
            <div className="relative">
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
               <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
            </div>
            <div className="space-y-0.5">
               <p className="text-[7px] font-black text-blue-400 uppercase tracking-[0.4em]">Candidate Shard Verified</p>
               <h2 className="text-sm font-black uppercase text-white">{student.name}</h2>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
               <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">System Node ID</p>
               <p className="text-[10px] font-mono font-black text-blue-300">{student.id?.toString().padStart(6, '0')}</p>
            </div>
            <button onClick={onLogout} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase border border-red-500/20 transition-all active:scale-95">Revoke Session</button>
         </div>
      </div>

      <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-gray-100 mb-10">
         <ReportBrandingHeader 
           settings={settings} 
           onSettingChange={onSettingChange} 
           reportTitle={settings.examTitle}
           subtitle={`OFFICIAL CANDIDATE ATTAINMENT PORTAL: ${student.name}`}
           isLandscape={true}
           readOnly={false} 
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        <div className="lg:col-span-3 space-y-6 no-print">
           <div className="flex flex-col gap-2 bg-slate-200/50 p-2 rounded-[2.5rem]">
              {navItems.map(t => (
                <button 
                   key={t.id} 
                   onClick={() => setActiveSubTab(t.id as any)} 
                   className={`flex items-center gap-4 text-left px-8 py-5 rounded-[2rem] text-[10px] font-black uppercase transition-all ${activeSubTab === t.id ? 'bg-blue-900 text-white border-blue-900 shadow-xl scale-[1.03]' : 'bg-transparent text-slate-400 hover:text-blue-900 hover:bg-white/60'}`}
                >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={t.icon}/></svg>
                   {t.label}
                </button>
              ))}
           </div>
           
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl text-center space-y-4">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Candidate Assessment Level</span>
              <p className={`text-2xl font-black uppercase ${student.category === 'Distinction' ? 'text-emerald-600' : 'text-blue-900'}`}>{student.category || 'N/A'}</p>
              <div className="w-10 h-1 bg-slate-100 mx-auto rounded-full"></div>
           </div>
        </div>

        <div className="lg:col-span-9">
           <div className="animate-in slide-in-from-bottom-8 duration-700 h-full">
              {activeSubTab === 'report' && (
                <div className="space-y-8">
                   <div className="bg-blue-950 text-white p-6 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-[0.6em] no-print shadow-xl">Official Individual Report Shard</div>
                   <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
                </div>
              )}
              {activeSubTab === 'curriculum' && <PupilCurriculumInsight student={student} schoolId={settings.schoolNumber} />}
              {activeSubTab === 'practice' && <PupilPracticeHub schoolId={settings.schoolNumber} studentId={student.id} studentName={student.name} />}
              {activeSubTab === 'merit' && <PupilMeritView student={student} settings={settings} />}
              {activeSubTab === 'bece' && <PupilBeceLedger student={student} />}
              {activeSubTab === 'journey' && <PupilAcademicJourney student={student} mockSeriesNames={settings.committedMocks || []} />}
              {activeSubTab === 'detailed' && <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="technical" />}
              {activeSubTab === 'global' && <PupilGlobalMatrix registry={globalRegistry} student={student} />}
           </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic no-print">
         <span>Institutional Node Verified: {settings.schoolNumber}</span>
         <span>UNITED BAYLOR ACADEMY — SHARD AUTHENTICATOR v4.6</span>
      </div>
    </div>
  );
};

export default PupilDashboard;

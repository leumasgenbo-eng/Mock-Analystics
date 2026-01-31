
import React, { useState } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, SchoolRegistryEntry } from '../../types';
import ReportCard from '../reports/ReportCard';
import PupilPerformanceSummary from './PupilPerformanceSummary';
import PupilGlobalMatrix from './PupilGlobalMatrix';
import PupilMeritView from './PupilMeritView';
import PupilBeceLedger from './PupilBeceLedger';
import PupilAcademicJourney from './PupilAcademicJourney';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface PupilDashboardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  classAverageAggregate: number;
  totalEnrolled: number;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  globalRegistry: SchoolRegistryEntry[];
  onLogout: () => void;
  loggedInUser?: { name: string; nodeId: string } | null;
}

const PupilDashboard: React.FC<PupilDashboardProps> = ({ 
  student, stats, settings, classAverageAggregate, totalEnrolled, onSettingChange, globalRegistry, onLogout 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'merit' | 'bece' | 'journey' | 'detailed' | 'global'>('report');

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl space-y-6">
           <p className="text-lg font-black text-slate-900 uppercase">Awaiting Shard Sync</p>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Candidate particulars not yet fully propagated.</p>
           <button onClick={onLogout} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase">Logout and Retry</button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'report', label: 'My Report Card', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
    { id: 'merit', label: 'My Merit Status', icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { id: 'bece', label: 'BECE Ledger', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' },
    { id: 'journey', label: 'Progress Trend', icon: 'M12 20V10M18 20V4M6 20v-6' },
    { id: 'detailed', label: 'Detailed Breakdown', icon: 'M21 21H3V3h18v18zM9 9h6v6H9V9z' },
    { id: 'global', label: 'Global Matrix', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col p-4 md:p-8 print:p-0">
      {/* Identity Verification Bar */}
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

      {/* Institutional Branding Header */}
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
        {/* Navigation Sidebar */}
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

        {/* Content Portal Area */}
        <div className="lg:col-span-9">
           <div className="animate-in slide-in-from-bottom-8 duration-700 h-full">
              {activeSubTab === 'report' && (
                <div className="space-y-8">
                   <div className="bg-blue-950 text-white p-6 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-[0.6em] no-print shadow-xl">Official Individual Report Shard</div>
                   <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
                </div>
              )}
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

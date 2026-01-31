
import React, { useMemo } from 'react';
import { ProcessedStudent, GlobalSettings } from '../../types';

interface HomeDashboardProps {
  students: ProcessedStudent[];
  settings: GlobalSettings;
  setViewMode: (view: 'home' | 'master' | 'reports' | 'management' | 'series' | 'pupil_hub') => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ students, settings, setViewMode }) => {
  const metrics = useMemo(() => {
    if (students.length === 0) return { total: 0, mean: 0, bestAgg: '—' };
    const total = students.length;
    const mean = students.reduce((sum, s) => sum + (s.totalScore || 0), 0) / total;
    const bestAgg = Math.min(...students.map(s => s.bestSixAggregate || 36));
    return { total, mean, bestAgg };
  }, [students]);

  const topStudent = useMemo(() => {
    return students.find(s => s.rank === 1);
  }, [students]);

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Academy Welcome Hero */}
      <div className="bg-blue-950 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
         <div className="relative space-y-4 text-center md:text-left z-10">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none">
               Welcome to the Hub
            </h1>
            <p className="text-blue-400 text-xs md:text-base font-black uppercase tracking-[0.4em]">
               {settings.schoolName} — {settings.academicYear}
            </p>
            <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-3">
               <span className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                 Series: {settings.activeMock}
               </span>
               <span className="bg-red-600/20 text-red-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                 Term: {settings.termInfo}
               </span>
            </div>
         </div>
         {settings.schoolLogo && (
           <div className="w-32 h-32 md:w-48 md:h-48 bg-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center transform hover:rotate-6 transition-transform z-10">
              <img src={settings.schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
           </div>
         )}
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-3 group hover:border-blue-500 transition-all">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-blue-900 group-hover:text-white transition-colors duration-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pupil Census</span>
            <p className="text-4xl font-black text-slate-900">{metrics.total}</p>
         </div>

         <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-3 group hover:border-indigo-500 transition-all">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-indigo-900 group-hover:text-white transition-colors duration-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cohort Mean Score</span>
            <p className="text-4xl font-black text-slate-900">{metrics.mean.toFixed(1)}%</p>
         </div>

         <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 flex flex-col items-center text-center space-y-3 group hover:border-emerald-500 transition-all">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:bg-emerald-900 group-hover:text-white transition-colors duration-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4 4 4-4 4-4-4Z"/><path d="M12 14v7"/><path d="M12 14H5"/><path d="M12 2v12"/></svg>
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Aggregate Cap</span>
            <p className="text-4xl font-black text-slate-900">{metrics.bestAgg}</p>
         </div>
      </div>

      {/* Primary Action Tiles */}
      <div className="space-y-6">
         <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-[0.4em] flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-600 rounded-full shadow-lg"></div>
            Mission Quick Actions
         </h4>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {[
              { id: 'management', label: 'Score Entry', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', color: 'bg-blue-600' },
              { id: 'master', label: 'Broad Sheets', icon: 'M3 3h18v18H3zM3 9h18M9 21V9', color: 'bg-indigo-600' },
              { id: 'reports', label: 'Pupil Reports', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', color: 'bg-purple-600' },
              { id: 'series', label: 'Tracker', icon: 'M12 20V10M18 20V4M6 20v-6', color: 'bg-emerald-600' },
              { id: 'pupil_hub', label: 'Pupil Portal', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: 'bg-orange-600' }
            ].map(action => (
              <button 
                key={action.id}
                onClick={() => setViewMode(action.id as any)}
                className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all flex flex-col items-center gap-4 group"
              >
                <div className={`w-12 h-12 ${action.color} text-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform`}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d={action.icon}/></svg>
                </div>
                <span className="text-[10px] font-black uppercase text-gray-700 group-hover:text-blue-900">{action.label}</span>
              </button>
            ))}
         </div>
      </div>

      {/* Cohort Spotlight */}
      {topStudent && (
        <div className="bg-gradient-to-br from-gray-900 to-black p-10 rounded-[4rem] text-white flex flex-col md:flex-row items-center gap-12 border border-white/5 relative overflow-hidden group">
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50"></div>
           <div className="relative space-y-4 flex-1 text-center md:text-left">
              <div className="inline-block px-4 py-1.5 bg-yellow-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full mb-2">
                 Cohort Spotlight: Rank #1
              </div>
              <h3 className="text-4xl font-black uppercase tracking-tighter leading-none group-hover:text-yellow-400 transition-colors">{topStudent.name}</h3>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                 Mastery in <span className="text-white">English, Math, and {(topStudent.subjects && topStudent.subjects[2]) ? topStudent.subjects[2].subject : "Core Electives"}</span>. <br/>
                 Current best six aggregate: <span className="text-yellow-50 font-black">{topStudent.bestSixAggregate}</span>
              </p>
           </div>
           <div className="flex gap-10 relative">
              <div className="text-center">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Efficiency</p>
                 <p className="text-2xl font-black text-white font-mono">{topStudent.totalScore?.toFixed(0) || "0"}%</p>
              </div>
              <div className="text-center border-l border-white/10 pl-10">
                 <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Category</p>
                 <p className="text-2xl font-black text-blue-400 uppercase">{topStudent.category}</p>
              </div>
           </div>
        </div>
      )}

      {/* Footer Meta */}
      <div className="flex justify-between items-center px-10 py-6 border-t border-gray-200 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
         <span>Institutional Node: {settings.schoolNumber}</span>
         <span>SS-Map Network Hub v3.5</span>
      </div>

    </div>
  );
};

export default HomeDashboard;

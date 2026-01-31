
import React from 'react';
import { ProcessedStudent } from '../../types';

interface PupilAcademicJourneyProps {
  student: ProcessedStudent;
  mockSeriesNames: string[];
}

const PupilAcademicJourney: React.FC<PupilAcademicJourneyProps> = ({ student, mockSeriesNames }) => {
  const history = student.seriesHistory || {};
  const mocks = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);

  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-2 border-b border-gray-50 pb-8">
         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">myAcademic Journey Tracking</h3>
         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.5em]">Multi-Series Aggregate Progression</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
        {mocks.map((name) => {
          const record = history[name];
          const hasData = !!record;
          
          return (
            <div key={name} className={`p-4 rounded-3xl border transition-all duration-500 flex flex-col items-center text-center gap-3 ${hasData ? 'bg-blue-50 border-blue-100 shadow-lg' : 'bg-gray-50 border-gray-100 opacity-40'}`}>
              <span className="text-[9px] font-black text-slate-400 uppercase">{name}</span>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${hasData ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                 {record?.aggregate || '—'}
              </div>
              <div className="space-y-1">
                 <span className="text-[7px] font-black text-blue-400 uppercase">Rank</span>
                 <p className="text-[10px] font-black text-slate-700">{record?.rank ? `#${record.rank}` : 'TBA'}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 p-10 rounded-[3rem] border border-gray-100 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/5 rounded-full -mr-16 -mt-16"></div>
         <div className="flex items-center gap-5 mb-6">
            <div className="w-12 h-12 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-xs shadow-xl">TR</div>
            <div>
               <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest">Temporal Growth Analysis</h4>
               <p className="text-[8px] font-bold text-gray-400 uppercase">Diagnostic Trajectory Finding</p>
            </div>
         </div>
         <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
            Your academic trajectory indicates a <span className="font-black text-blue-900 uppercase">Mastery Baseline</span>. Consistent lowering of the aggregate number (e.g. from 24 to 12) signifies exponential improvement in core competency acquisition.
         </p>
         <div className="mt-8 pt-6 border-t border-gray-200 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
               Grades shown are the final verified outcomes synchronised with the institutional terminal. Contact Academy Hub if discrepancies are detected.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PupilAcademicJourney;

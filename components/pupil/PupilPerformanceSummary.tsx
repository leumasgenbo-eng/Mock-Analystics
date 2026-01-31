
import React from 'react';
import { ProcessedStudent } from '../../types';

interface PupilPerformanceSummaryProps {
  student: ProcessedStudent;
  mockSeriesNames: string[];
  type: 'aggregate' | 'technical';
}

const PupilPerformanceSummary: React.FC<PupilPerformanceSummaryProps> = ({ student, type }) => {
  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-2 border-b border-gray-50 pb-8">
         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">my detail break down</h3>
         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.5em]">Sectional Competency Matrix • Objective vs Theory Partitioning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {student.subjects.map((sub) => (
          <div key={sub.subject} className="bg-slate-50 border border-gray-100 rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl hover:border-blue-200 transition-all duration-300 group">
             <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                   <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{sub.subject}</span>
                   <h4 className="text-lg font-black text-gray-900 uppercase leading-none">{sub.grade} - {sub.remark}</h4>
                </div>
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-900 border border-gray-100 group-hover:bg-blue-900 group-hover:text-white transition-colors shadow-sm">
                   {sub.gradeValue}
                </div>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-2 shadow-sm">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Section A (Obj)</span>
                      <p className="text-2xl font-black text-blue-900 font-mono leading-none">{sub.sectionA ?? '—'}</p>
                   </div>
                   <div className="bg-white p-5 rounded-3xl border border-gray-100 space-y-2 shadow-sm">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Section B (Theory)</span>
                      <p className="text-2xl font-black text-blue-900 font-mono leading-none">{sub.sectionB ?? '—'}</p>
                   </div>
                </div>

                <div className="space-y-3 pt-2">
                   <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-400">
                      <span>Sectional Balance</span>
                      <span className="text-blue-600">Distribution Impact</span>
                   </div>
                   <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
                      <div 
                        className="bg-blue-500 transition-all duration-1000 border-r border-white/20" 
                        style={{ width: `${((sub.sectionA ?? 0)/((sub.sectionA??0)+(sub.sectionB??0)||1))*100}%` }}
                      ></div>
                      <div 
                        className="bg-indigo-600 transition-all duration-1000" 
                        style={{ width: `${((sub.sectionB ?? 0)/((sub.sectionA??0)+(sub.sectionB??0)||1))*100}%` }}
                      ></div>
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PupilPerformanceSummary;


import React, { useState } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { SUBJECT_LIST } from '../../constants';

interface SeriesHistoryPortalProps {
  students: StudentData[];
  settings: GlobalSettings;
}

const SeriesHistoryPortal: React.FC<SeriesHistoryPortalProps> = ({ students, settings }) => {
  const mockSeries = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);
  const [expandedMock, setExpandedMock] = useState<string | null>(null);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Refactored Snapshots Hub Ledger */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="bg-indigo-950 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-indigo-900">
           <div className="space-y-1 text-center md:text-left">
              <h3 className="text-xl font-black text-white uppercase tracking-tight leading-none">Snapshots Hub</h3>
              <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest italic">Review and verify committed series data</p>
           </div>
           <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 backdrop-blur-md flex items-center gap-3">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
             <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Database Integrity: SECURE</span>
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-6">Series Index</th>
                <th className="px-8 py-6">Date of Submission</th>
                <th className="px-8 py-6 text-center">Pupil Census</th>
                <th className="px-8 py-6 text-center">Integrity Status</th>
                <th className="px-8 py-6 text-right">Verification Gate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockSeries.map(mock => {
                const committedCount = students.filter(s => s.seriesHistory && s.seriesHistory[mock]).length;
                const isCommitted = committedCount > 0;
                const metadata = settings.mockSnapshots?.[mock];
                const isExpanded = expandedMock === mock;

                return (
                  <React.Fragment key={mock}>
                    <tr className={`group transition-colors ${isCommitted ? 'hover:bg-blue-50/30' : 'opacity-40 grayscale pointer-events-none'}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm ${isCommitted ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-400'}`}>
                             {mock.split(' ')[1]}
                           </div>
                           <span className="font-black text-gray-900 uppercase text-xs">{mock} Cycle</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-xs text-blue-900 font-bold uppercase">
                        {metadata?.submissionDate || (isCommitted ? 'Pre-System Base' : 'Awaiting Entry')}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${isCommitted ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-gray-100 text-gray-400'}`}>
                          {isCommitted ? `${committedCount} Pupils` : '0 Records'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex flex-col items-center gap-1">
                           <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded ${metadata?.approvalStatus === 'completed' ? 'bg-green-100 text-green-700' : isCommitted ? 'bg-yellow-100 text-yellow-700 animate-pulse' : 'bg-gray-100 text-gray-400'}`}>
                              {metadata?.approvalStatus || (isCommitted ? 'UNVERIFIED' : 'VACANT')}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         {isCommitted && (
                           <button 
                             onClick={() => setExpandedMock(isExpanded ? null : mock)}
                             className={`px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-2 ml-auto shadow-sm ${isExpanded ? 'bg-blue-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-blue-900 hover:border-blue-300'}`}
                           >
                             {isExpanded ? 'Collapse' : 'Audit'}
                             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
                           </button>
                         )}
                      </td>
                    </tr>
                    
                    {/* Granular Audit Matrix */}
                    {isCommitted && isExpanded && (
                      <tr>
                        <td colSpan={5} className="px-8 py-10 bg-gray-50/50 border-y border-gray-100 animate-in slide-in-from-top-4">
                           <div className="space-y-10">
                              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
                                 <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                                    <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                       Subject Performance Checklist
                                    </h4>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{SUBJECT_LIST.length} Academy Disciplines</span>
                                 </div>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-x divide-y divide-gray-100">
                                    {SUBJECT_LIST.map((sub) => {
                                       const subDate = metadata?.subjectSubmissionDates?.[sub];
                                       const isVerified = !!subDate;
                                       return (
                                          <div key={sub} className="p-5 space-y-3 hover:bg-blue-50/10 transition-colors">
                                             <div className="flex justify-between items-start">
                                                <span className="text-[9px] font-black text-gray-900 uppercase leading-tight truncate pr-2">{sub}</span>
                                                {isVerified ? <div className="bg-green-100 text-green-700 p-1 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div> : <div className="w-4 h-4 bg-gray-100 rounded-full"></div>}
                                             </div>
                                             <div className="flex flex-col">
                                                <span className={`text-[8px] font-black uppercase ${isVerified ? 'text-green-600' : 'text-gray-300'}`}>{isVerified ? 'SYNCED' : 'PENDING'}</span>
                                                <span className="text-[9px] font-mono text-blue-900 font-bold mt-1">{subDate || '---'}</span>
                                             </div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SeriesHistoryPortal;

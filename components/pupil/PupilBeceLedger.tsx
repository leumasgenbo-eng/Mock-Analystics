
import React, { useState } from 'react';
import { ProcessedStudent } from '../../types';

interface PupilBeceLedgerProps {
  student: ProcessedStudent;
}

const PupilBeceLedger: React.FC<PupilBeceLedgerProps> = ({ student }) => {
  const years = Object.keys(student.beceResults || {}).sort((a,b) => Number(b) - Number(a));
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear().toString());

  const currentResult = student.beceResults?.[selectedYear];

  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12 animate-in slide-in-from-right-8 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center border-b-2 border-gray-50 pb-8 gap-6">
        <div className="space-y-2 text-center md:text-left">
           <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">Official BECE Ledger</h3>
           <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.5em]">Verified Academic Outcomes Registry</p>
        </div>
        {years.length > 0 && (
           <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-900 text-white font-black py-4 px-8 rounded-2xl text-xs uppercase outline-none focus:ring-8 focus:ring-blue-500/10 shadow-xl transition-all"
           >
             {years.map(y => <option key={y} value={y}>{y} Session Archive</option>)}
           </select>
        )}
      </div>

      {currentResult ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {Object.entries(currentResult.grades).map(([subject, grade]) => {
             const numericGrade = grade as number;
             return (
               <div key={subject} className="bg-slate-50 border border-gray-100 p-8 rounded-[2.5rem] flex justify-between items-center group hover:bg-white hover:shadow-2xl hover:border-blue-200 transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest max-w-[140px] leading-tight">{subject}</span>
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl border-4 border-white ${numericGrade <= 3 ? 'bg-emerald-600 text-white' : numericGrade <= 6 ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                     {numericGrade}
                  </div>
               </div>
             );
           })}
        </div>
      ) : (
        <div className="py-40 text-center opacity-30 flex flex-col items-center gap-8">
           <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center border-4 border-dashed border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
           </div>
           <p className="font-black uppercase text-sm tracking-[0.6em] text-slate-500">No BECE results found in the registry</p>
        </div>
      )}

      <div className="bg-blue-900 text-white p-10 rounded-[3.5rem] flex items-start gap-8 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -mr-24 -mt-24"></div>
         <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-widest text-blue-300">Data Integrity Policy</h4>
            <p className="text-[11px] font-bold uppercase tracking-widest leading-relaxed opacity-80">
               Grades shown are the final verified outcomes synchronised with the institutional terminal. Contact Academy Hub if discrepancies are detected.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PupilBeceLedger;

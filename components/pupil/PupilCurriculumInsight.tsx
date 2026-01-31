import React, { useState, useEffect } from 'react';
import { ProcessedStudent, ScopeCoverage, TopicMastery } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilCurriculumInsightProps {
  student: ProcessedStudent;
  schoolId: string;
}

const PupilCurriculumInsight: React.FC<PupilCurriculumInsightProps> = ({ student, schoolId }) => {
  const [coverage, setCoverage] = useState<ScopeCoverage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');

  useEffect(() => {
    const fetchCoverage = async () => {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `coverage_${schoolId}_${selectedSubject.replace(/\s+/g, '')}`).maybeSingle();
      if (data?.payload) setCoverage(data.payload);
    };
    fetchCoverage();
  }, [schoolId, selectedSubject]);

  const subjects = student.subjects.map(s => s.subject);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2">
           <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">Curriculum Mastery Map</h3>
           <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Personal Cognitive Coverage Shard</p>
        </div>
        <select 
           value={selectedSubject} 
           onChange={e => setSelectedSubject(e.target.value)}
           className="bg-slate-50 border border-gray-100 rounded-2xl px-6 py-3 text-xs font-black uppercase outline-none focus:ring-8 focus:ring-blue-500/5 transition-all"
        >
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {coverage.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coverage.map((c, i) => {
              const myMastery = student.masteryMap?.find(m => m.indicator === c.indicator);
              const isMastered = myMastery?.status === 'MASTERED';
              
              return (
                <div key={i} className={`bg-white p-8 rounded-[3rem] border shadow-xl flex flex-col gap-6 transition-all group hover:scale-[1.03] ${c.isCovered ? 'border-gray-100' : 'border-gray-50 opacity-40 grayscale'}`}>
                   <div className="flex justify-between items-start">
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{c.strand}</span>
                         <h4 className="text-sm font-black text-slate-900 uppercase leading-none">{c.subStrand}</h4>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-lg ${isMastered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                         {isMastered ? '✓' : '?'}
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div className="flex justify-between text-[10px] font-mono font-black">
                         <span className="text-slate-400">{c.indicator}</span>
                         <span className={isMastered ? 'text-emerald-500' : 'text-amber-500'}>{myMastery?.averageScore.toFixed(0) || 0}% Mastery</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className={`h-full transition-all duration-1000 ${isMastered ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                           style={{ width: `${myMastery?.averageScore || 0}%` }}
                         ></div>
                      </div>
                   </div>

                   <div className={`text-center py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${c.isCovered ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                      {c.isCovered ? `Module Completed: ${new Date(c.coveredDate!).toLocaleDateString()}` : 'Module Pending'}
                   </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white py-40 rounded-[4rem] text-center opacity-30 flex flex-col items-center gap-6 border-4 border-dashed border-gray-100">
             <p className="text-slate-900 font-black uppercase text-xs tracking-[0.5em]">Facilitator has not yet pushed scope shards for this subject</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PupilCurriculumInsight;
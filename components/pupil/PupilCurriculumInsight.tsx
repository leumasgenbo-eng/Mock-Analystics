
import React, { useState, useEffect } from 'react';
import { ProcessedStudent, ScopeCoverage, TopicMastery } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilCurriculumInsightProps {
  student: ProcessedStudent;
  schoolId: string;
}

const PupilCurriculumInsight: React.FC<PupilCurriculumInsightProps> = ({ student, schoolId }) => {
  const [coverage, setCoverage] = useState<ScopeCoverage[]>([]);
  const [pushedMetadata, setPushedMetadata] = useState<{ pushedBy: string, timestamp: string } | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('Mathematics');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCoverage = async () => {
      setIsLoading(true);
      const hubId = schoolId;
      const subKey = selectedSubject.replace(/\s+/g, '');
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `coverage_handshake_${hubId}_${subKey}`).maybeSingle();
      
      if (data?.payload) {
        setCoverage(data.payload.map || []);
        setPushedMetadata({ pushedBy: data.payload.pushedBy, timestamp: data.payload.timestamp });
      } else {
        setCoverage([]);
        setPushedMetadata(null);
      }
      setIsLoading(false);
    };
    fetchCoverage();
  }, [schoolId, selectedSubject]);

  const subjects = student.subjects.map(s => s.subject);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative space-y-2">
           <h3 className="text-2xl font-black uppercase text-slate-900 tracking-tight leading-none">Curriculum Mastery Map</h3>
           <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Official Implementation Handshake</p>
        </div>
        <div className="relative flex items-center gap-4">
           {pushedMetadata && (
             <div className="hidden lg:flex flex-col text-right">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Handshaked By</span>
                <span className="text-[9px] font-black text-emerald-600 uppercase">{pushedMetadata.pushedBy}</span>
             </div>
           )}
           <select 
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              className="bg-slate-50 border border-gray-100 rounded-2xl px-6 py-3 text-xs font-black uppercase outline-none focus:ring-8 focus:ring-blue-500/5 transition-all shadow-lg"
           >
             {subjects.map(s => <option key={s} value={s}>{s}</option>)}
           </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center justify-center gap-6">
           <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.4em]">Retrieving Syllabus Handshake...</p>
        </div>
      ) : coverage.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {coverage.map((c, i) => {
            const myMastery = student.masteryMap?.find(m => m.indicator === c.indicator);
            const masteryRate = myMastery?.averageScore || 0;
            const isMastered = myMastery?.status === 'MASTERED';
            
            return (
              <div key={i} className={`bg-white p-8 rounded-[3.5rem] border shadow-2xl flex flex-col gap-6 transition-all group hover:-translate-y-2 ${c.isCovered ? 'border-emerald-100' : 'border-gray-50 opacity-40 grayscale'}`}>
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                       <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{c.strand}</span>
                       <h4 className="text-sm font-black text-slate-900 uppercase leading-none truncate max-w-[150px]">{c.subStrand}</h4>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shadow-xl border-4 border-white ${isMastered ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                       {isMastered ? '✓' : '?'}
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    <div className="flex justify-between text-[9px] font-mono font-black uppercase tracking-tighter">
                       <span className="text-slate-400">{c.indicator}</span>
                       <span className={isMastered ? 'text-emerald-500' : 'text-blue-500'}>{masteryRate.toFixed(0)}% Proficiency</span>
                    </div>
                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden shadow-inner border border-gray-100">
                       <div 
                         className={`h-full transition-all duration-1000 ${isMastered ? 'bg-emerald-500' : masteryRate > 40 ? 'bg-blue-500' : 'bg-red-400'}`} 
                         style={{ width: `${masteryRate}%` }}
                       ></div>
                    </div>
                 </div>

                 <div className={`text-center py-3 rounded-2xl text-[8px] font-black uppercase tracking-[0.2em] shadow-sm ${c.isCovered ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    {c.isCovered ? `Module Finalized: ${new Date(c.coveredDate!).toLocaleDateString()}` : 'Module in Progress'}
                 </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white py-48 rounded-[4rem] text-center opacity-30 flex flex-col items-center gap-10 border-4 border-dashed border-gray-100 shadow-inner">
           <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>
           <div className="space-y-2">
              <p className="text-slate-900 font-black uppercase text-sm tracking-[0.6em]">No curriculum Handshake detected</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Facilitator has not yet pushed the scope shards for {selectedSubject}.</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default PupilCurriculumInsight;

import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, ScopeCoverage, StudentData } from '../../types';
import { supabase } from '../../supabaseClient';

interface CurriculumCoveragePortalProps {
  settings: GlobalSettings;
  students: StudentData[];
  subjects: string[];
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
  onSave: () => void;
}

const CurriculumCoveragePortal: React.FC<CurriculumCoveragePortalProps> = ({ settings, students, subjects, isFacilitator, activeFacilitator, onSave }) => {
  const [coverageMap, setCoverageMap] = useState<ScopeCoverage[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(isFacilitator ? activeFacilitator?.subject || subjects[0] : subjects[0]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCoverage = async () => {
      setIsLoading(true);
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `coverage_${settings.schoolNumber}_${selectedSubject.replace(/\s+/g, '')}`).maybeSingle();
      if (data?.payload) setCoverageMap(data.payload);
      else setCoverageMap([]);
      setIsLoading(false);
    };
    fetchCoverage();
  }, [settings.schoolNumber, selectedSubject]);

  const toggleCoverage = async (indicator: string, strand: string, subStrand: string) => {
    const next = [...coverageMap];
    const idx = next.findIndex(c => c.indicator === indicator);
    
    if (idx >= 0) {
      next[idx].isCovered = !next[idx].isCovered;
      if (next[idx].isCovered) next[idx].coveredDate = new Date().toISOString();
    } else {
      next.push({
        subject: selectedSubject,
        strand,
        subStrand,
        indicator,
        isCovered: true,
        coveredDate: new Date().toISOString()
      });
    }

    setCoverageMap(next);
    await supabase.from('uba_persistence').upsert({
      id: `coverage_${settings.schoolNumber}_${selectedSubject.replace(/\s+/g, '')}`,
      hub_id: settings.schoolNumber,
      payload: next,
      last_updated: new Date().toISOString()
    });
  };

  const masteryStats = useMemo(() => {
    const stats: Record<string, { total: number, master: number }> = {};
    students.forEach(s => {
      s.masteryMap?.forEach(m => {
        if (!stats[m.indicator]) stats[m.indicator] = { total: 0, master: 0 };
        stats[m.indicator].total++;
        if (m.status === 'MASTERED') stats[m.indicator].master++;
      });
    });
    return stats;
  }, [students]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Scope & Coverage Tracker</h2>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.4em]">Institutional Curriculum Implementation Matrix</p>
           </div>
           <select 
              disabled={isFacilitator}
              value={selectedSubject} 
              onChange={e => setSelectedSubject(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3 text-xs font-black uppercase outline-none text-white disabled:opacity-50"
           >
              {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden">
           <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Syllabus Breakdown: {selectedSubject}</h4>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black uppercase">Covered</span></div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-200 rounded-full"></div><span className="text-[8px] font-black uppercase">Pending</span></div>
              </div>
           </div>
           
           <div className="p-8 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Strand</th>
                       <th className="px-6 py-4">Sub-Strand</th>
                       <th className="px-6 py-4">Indicator</th>
                       <th className="px-6 py-4 text-center">Cohort Mastery</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {/* Dynamic Syllabus Generation could come from a master JSON, here simulated */}
                    {['NUMBER', 'ALGEBRA', 'GEOMETRY'].map(strand => (
                       <React.Fragment key={strand}>
                          {[1, 2].map(sub => (
                             <tr key={`${strand}-${sub}`} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                   <button 
                                      onClick={() => toggleCoverage(`B9.${strand.charAt(0)}.${sub}`, strand, `Sub-${sub}`)}
                                      className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${coverageMap.find(c => c.indicator === `B9.${strand.charAt(0)}.${sub}`)?.isCovered ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-200 hover:border-blue-400'}`}
                                   >
                                      {coverageMap.find(c => c.indicator === `B9.${strand.charAt(0)}.${sub}`)?.isCovered && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>}
                                   </button>
                                </td>
                                <td className="px-6 py-4 font-black text-[10px] text-slate-700 uppercase">{strand}</td>
                                <td className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase">Part {sub} Analysis</td>
                                <td className="px-6 py-4 font-mono text-[10px] text-blue-500 font-bold">B9.{strand.charAt(0)}.{sub}</td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center justify-center gap-3">
                                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                         <div 
                                           className="h-full bg-blue-600 transition-all duration-1000" 
                                           style={{ width: `${(masteryStats[`B9.${strand.charAt(0)}.${sub}`]?.master || 0) / (students.length || 1) * 100}%` }}
                                         ></div>
                                      </div>
                                      <span className="text-[10px] font-mono font-black text-slate-400">
                                        {Math.round((masteryStats[`B9.${strand.charAt(0)}.${sub}`]?.master || 0) / (students.length || 1) * 100)}%
                                      </span>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </React.Fragment>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CurriculumCoveragePortal;
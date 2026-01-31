
import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, ScopeCoverage, StudentData, QuestionIndicatorMapping } from '../../types';
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
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // 1. DYNAMIC SYLLABUS: Aggregated from all Mock Resources for this subject
  const syllabusFromResources = useMemo(() => {
    const uniqueIndicators: Record<string, QuestionIndicatorMapping> = {};
    const portal = settings.resourcePortal || {};
    
    Object.values(portal).forEach(mockData => {
       const subData = mockData[selectedSubject];
       if (subData?.indicators) {
          subData.indicators.forEach(ind => {
             if (ind.indicatorCode) {
                uniqueIndicators[ind.indicatorCode] = ind;
             }
          });
       }
    });
    
    return Object.values(uniqueIndicators).sort((a,b) => a.indicatorCode.localeCompare(b.indicatorCode));
  }, [settings.resourcePortal, selectedSubject]);

  // 2. FETCH COVERAGE RECORD
  useEffect(() => {
    const fetchCoverage = async () => {
      const hubId = settings.schoolNumber;
      const subKey = selectedSubject.replace(/\s+/g, '');
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `coverage_${hubId}_${subKey}`).maybeSingle();
      if (data?.payload) setCoverageMap(data.payload);
      else setCoverageMap([]);
    };
    fetchCoverage();
  }, [settings.schoolNumber, selectedSubject]);

  const toggleCoverage = async (indicatorCode: string, strand: string, subStrand: string, indicatorDesc: string) => {
    const next = [...coverageMap];
    const idx = next.findIndex(c => c.indicator === indicatorCode);
    
    if (idx >= 0) {
      next[idx].isCovered = !next[idx].isCovered;
      if (next[idx].isCovered) next[idx].coveredDate = new Date().toISOString();
      else delete next[idx].coveredDate;
    } else {
      next.push({
        subject: selectedSubject,
        strand,
        subStrand,
        indicator: indicatorCode,
        isCovered: true,
        coveredDate: new Date().toISOString(),
        facilitatorNote: indicatorDesc
      });
    }

    setCoverageMap(next);
    const hubId = settings.schoolNumber;
    const subKey = selectedSubject.replace(/\s+/g, '');
    await supabase.from('uba_persistence').upsert({
      id: `coverage_${hubId}_${subKey}`,
      hub_id: hubId,
      payload: next,
      last_updated: new Date().toISOString()
    });
  };

  const handleBroadcastToPupils = async () => {
    setIsBroadcasting(true);
    try {
      const hubId = settings.schoolNumber;
      const subKey = selectedSubject.replace(/\s+/g, '');
      // Push specific handshake for pupils to consume
      await supabase.from('uba_persistence').upsert({
        id: `coverage_handshake_${hubId}_${subKey}`,
        hub_id: hubId,
        payload: {
           map: coverageMap,
           subject: selectedSubject,
           pushedBy: activeFacilitator?.name || 'FACULTY',
           timestamp: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      });
      alert("CURRICULUM HANDSHAKE SUCCESSFUL: Coverage status mirrored to Pupil Hub.");
    } catch (e) {
      alert("Handshake Interrupted.");
    } finally {
      setIsBroadcasting(true);
      setTimeout(() => setIsBroadcasting(false), 2000);
    }
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-32">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-center gap-8">
           <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Scope & Coverage Tracker</h2>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.4em]">Aggregated from Resource Hub Indicators</p>
           </div>
           <div className="flex gap-4">
              <select 
                disabled={isFacilitator}
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3 text-xs font-black uppercase outline-none text-white disabled:opacity-50"
              >
                {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
              </select>
              <button 
                onClick={handleBroadcastToPupils}
                disabled={isBroadcasting}
                className={`bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2 ${isBroadcasting ? 'animate-pulse' : ''}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                {isBroadcasting ? 'Broadcasting...' : 'Push to Pupil Hub'}
              </button>
           </div>
        </div>
      </div>

      {syllabusFromResources.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 text-center space-y-4 opacity-50">
           <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>
           <p className="text-sm font-black uppercase text-slate-500 tracking-[0.2em]">No syllabus indicators found in Resources Hub for {selectedSubject}.</p>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Map questions to strands in the Resources portal to populate this tracker.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden">
           <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Master Implemention Shards: {selectedSubject}</h4>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black uppercase">Cleared</span></div>
                 <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-200 rounded-full"></div><span className="text-[8px] font-black uppercase">Outstanding</span></div>
              </div>
           </div>
           
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                 <thead>
                    <tr className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-[0.2em] border-b border-slate-800">
                       <th className="px-10 py-5 w-16 text-center">Status</th>
                       <th className="px-6 py-5">Strand Shard</th>
                       <th className="px-6 py-5">Sub-Strand Node</th>
                       <th className="px-6 py-5">Indicator Code</th>
                       <th className="px-6 py-5 text-center">Cohort Mastery</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50">
                    {syllabusFromResources.map((ind) => {
                       const coverage = coverageMap.find(c => c.indicator === ind.indicatorCode);
                       const isCovered = !!coverage?.isCovered;
                       const mastery = masteryStats[ind.indicatorCode] || { total: 0, master: 0 };
                       const masteryRate = Math.round((mastery.master / (students.length || 1)) * 100);

                       return (
                        <tr key={ind.indicatorCode} className="hover:bg-slate-50 transition-colors group">
                           <td className="px-10 py-6">
                              <button 
                                 onClick={() => toggleCoverage(ind.indicatorCode, ind.strand, ind.subStrand, ind.indicator)}
                                 className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${isCovered ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-gray-200 hover:border-blue-400 text-transparent'}`}
                              >
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                           </td>
                           <td className="px-6 py-6">
                              <div className="flex flex-col">
                                 <span className="font-black text-[10px] text-slate-800 uppercase leading-none">{ind.strand}</span>
                                 {isCovered && <span className="text-[7px] font-bold text-emerald-500 uppercase mt-1">Cleared: {new Date(coverage.coveredDate!).toLocaleDateString()}</span>}
                              </div>
                           </td>
                           <td className="px-6 py-6 font-bold text-[10px] text-slate-400 uppercase">{ind.subStrand}</td>
                           <td className="px-6 py-6">
                              <span className="font-mono text-[10px] text-blue-600 font-black bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{ind.indicatorCode}</span>
                           </td>
                           <td className="px-6 py-6">
                              <div className="flex items-center justify-center gap-4">
                                 <div className="w-28 h-2 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                      className={`h-full transition-all duration-1000 ${masteryRate > 70 ? 'bg-emerald-500' : masteryRate > 40 ? 'bg-blue-500' : 'bg-red-500'}`} 
                                      style={{ width: `${masteryRate}%` }}
                                    ></div>
                                 </div>
                                 <span className="text-[10px] font-mono font-black text-slate-400 w-10">{masteryRate}%</span>
                              </div>
                           </td>
                        </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default CurriculumCoveragePortal;

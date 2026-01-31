import React, { useState, useMemo } from 'react';
import { SchoolRegistryEntry, ExamSubScore, StaffAssignment } from '../../types';

interface NetworkRewardsViewProps {
  registry: SchoolRegistryEntry[];
}

const NetworkRewardsView: React.FC<NetworkRewardsViewProps> = ({ registry }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Calculate Global Facilitator Merit (TEI) across all schools
  const globalFacilitators = useMemo(() => {
    const allFacs: any[] = [];

    registry.forEach(school => {
      const data = school.fullData;
      if (!data) return;

      const students = data.students;
      const facilitators = data.facilitators;
      const activeMock = data.settings.activeMock;
      const mockNames = data.settings.committedMocks || [];
      const prevMockName = mockNames[mockNames.indexOf(activeMock) - 1];

      // Added type assertion to the facilitators loop to resolve property access errors on 'unknown' type.
      (Object.entries(facilitators) as [string, StaffAssignment][]).forEach(([subject, staff]) => {
        if (!staff.name) return;

        const pupils = students.filter(s => s.mockData?.[activeMock]?.scores[subject] !== undefined);
        if (pupils.length === 0) return;

        // TEI Components (Proxied/Aggregated for global view)
        const meanScore = pupils.reduce((acc, s) => acc + (s.mockData?.[activeMock]?.scores[subject] || 0), 0) / pupils.length;
        const gradeFactor = Math.max(1, 10 - (meanScore / 10));
        
        const prevPupils = prevMockName ? students.filter(s => s.mockData?.[prevMockName]?.scores[subject] !== undefined) : [];
        const prevMean = prevPupils.length > 0 ? prevPupils.reduce((acc, s) => acc + (s.mockData?.[prevMockName]?.scores[subject] || 0), 0) / prevPupils.length : meanScore;
        const growth = prevMean > 0 ? meanScore / prevMean : 1.0;

        const objMean = pupils.reduce((acc, s) => acc + (s.mockData?.[activeMock]?.examSubScores[subject]?.sectionA || 0), 0) / pupils.length;
        const thyMean = pupils.reduce((acc, s) => acc + (s.mockData?.[activeMock]?.examSubScores[subject]?.sectionB || 0), 0) / pupils.length;

        const tei = gradeFactor * growth * (objMean/20 || 1) * (thyMean/30 || 1);

        allFacs.push({
          name: staff.name,
          subject,
          school: school.name,
          id: `${school.id}/${staff.enrolledId}`,
          tei,
          growth,
          status: school.status
        });
      });
    });

    return allFacs.sort((a, b) => b.tei - a.tei);
  }, [registry]);

  return (
    <div className="p-10 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase text-white tracking-tight">Global Facilitator Merit Hub</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Network-Wide TEI Efficiency Rerating</p>
        </div>
        <div className="bg-indigo-950 p-4 rounded-3xl border border-white/10 flex items-center gap-6 shadow-xl">
           <div className="space-y-1">
              <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Network Mean TEI</span>
              <span className="text-xl font-black text-white">
                 {(globalFacilitators.reduce((a,b) => a+b.tei, 0) / (globalFacilitators.length || 1)).toFixed(2)}
              </span>
           </div>
           <div className="h-10 w-px bg-white/10"></div>
           <div className="space-y-1">
              <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest block">Academic Cycle</span>
              <span className="text-white font-black text-xs uppercase">{selectedYear} Master</span>
           </div>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-800 rounded-[2.5rem]">
        <table className="w-full text-left">
          <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-widest">
            <tr>
              <th className="px-10 py-6">Rank</th>
              <th className="px-6 py-6">Facilitator & Institution</th>
              <th className="px-6 py-6 text-center">Subject Discipline</th>
              <th className="px-6 py-6 text-center">Growth Rate (Sᵣ)</th>
              <th className="px-6 py-6 text-right pr-10">Efficiency Index (TEI)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {globalFacilitators.map((f, i) => (
              <tr key={f.id} className="hover:bg-slate-800/50 transition-colors group">
                <td className="px-10 py-6">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${i < 3 ? 'bg-yellow-500 text-slate-950 shadow-xl' : 'bg-slate-950 text-slate-500 border border-slate-800'}`}>
                      {i + 1}
                   </div>
                </td>
                <td className="px-6 py-6">
                   <div className="flex flex-col">
                      <span className="font-black text-white uppercase group-hover:text-blue-400 transition-colors">{f.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">{f.school}</span>
                   </div>
                </td>
                <td className="px-6 py-6 text-center">
                   <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{f.subject}</span>
                </td>
                <td className="px-6 py-6 text-center">
                   <span className={`text-sm font-black font-mono ${f.growth >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                      x{f.growth.toFixed(2)}
                   </span>
                </td>
                <td className="px-6 py-6 text-right pr-10">
                   <span className="text-xl font-black text-white font-mono">{f.tei.toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-slate-950 p-10 rounded-[3rem] border border-slate-800 text-center">
         <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] leading-relaxed">
            The TEI ranks facilitators based on grade proficiency, velocity of subject growth, and sectional mastery. Elite facilitators (Rank 1-10) are designated as Network Pedagogical Hubs.
         </p>
      </div>
    </div>
  );
};

export default NetworkRewardsView;
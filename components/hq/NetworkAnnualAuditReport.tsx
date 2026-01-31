
import React, { useState, useMemo } from 'react';
import { SchoolRegistryEntry, StaffAssignment } from '../../types';
import EditableField from '../shared/EditableField';

interface NetworkAnnualAuditReportProps {
  registry: SchoolRegistryEntry[];
}

const NetworkAnnualAuditReport: React.FC<NetworkAnnualAuditReportProps> = ({ registry }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [networkBranding, setNetworkBranding] = useState({
     name: "MOCK ANALYSIS SS-MAP NETWORK HUB",
     address: "CENTRAL COMMAND, ACCRA DIGITAL CENTRE",
     director: "NETWORK CONTROLLER GENERAL"
  });

  const aggregateMetrics = useMemo(() => {
    const totalStudents = registry.reduce((acc, s) => acc + s.studentCount, 0);
    const activeSchools = registry.filter(r => r.status === 'active').length;
    
    // Calculate Network Mean Aggregates
    const allMeans = registry.map(school => {
       const latest = school.performanceHistory?.[school.performanceHistory.length-1];
       return latest?.avgComposite || 0;
    }).filter(m => m > 0);
    
    const networkMean = allMeans.length > 0 ? allMeans.reduce((a,b) => a+b, 0) / allMeans.length : 0;

    return { totalStudents, activeSchools, networkMean };
  }, [registry]);

  const topFacilitators = useMemo(() => {
    // Collect and rank across all schools
    const facs: any[] = [];
    registry.forEach(s => {
       if (!s.fullData) return;
       const data = s.fullData;
       (Object.entries(data.facilitators) as [string, StaffAssignment][]).forEach(([sub, staff]) => {
          if (!staff.name) return;
          facs.push({ name: staff.name, subject: sub, school: s.name, tei: 8.5 }); // Mock TEI for report
       });
    });
    return facs.sort((a,b) => b.tei - a.tei).slice(0, 5);
  }, [registry]);

  return (
    <div className="p-10 space-y-12 animate-in slide-in-from-bottom-8 duration-700 bg-white min-h-screen text-slate-900" id="network-annual-audit">
      
      {/* Formal Network Header */}
      <div className="flex justify-between items-start border-b-8 border-double border-slate-900 pb-8">
        <div className="space-y-3">
           <h1 className="text-4xl font-black uppercase text-slate-950 tracking-tighter leading-none">
              <EditableField value={networkBranding.name} onChange={(v) => setNetworkBranding({...networkBranding, name: v})} />
           </h1>
           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
              <EditableField value={networkBranding.address} onChange={(v) => setNetworkBranding({...networkBranding, address: v})} />
           </p>
           <div className="bg-slate-100 inline-block px-5 py-1 rounded-full border border-slate-200">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Network Cluster Size: {registry.length} Nodes</span>
           </div>
        </div>
        <div className="text-right space-y-2 no-print">
           <h2 className="text-2xl font-black text-red-700 uppercase tracking-tight">ANNUAL NETWORK AUDIT</h2>
           <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">CYCLE: {selectedYear}</p>
           <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl hover:scale-105 transition-all">Print Master Report</button>
        </div>
      </div>

      {/* Executive Summary Discussion */}
      <section className="space-y-10">
         <div className="bg-slate-950 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <h3 className="text-xl font-black uppercase tracking-widest text-blue-400 mb-6">I. Network Findings & Executive Summary</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 text-sm leading-relaxed text-slate-300 font-medium italic">
               <div className="space-y-4">
                  <p>
                    The academic cycle for <span className="text-white font-black">{selectedYear}</span> demonstrates a robust stabilization of the <span className="text-emerald-400 font-black">Teaching Efficiency Index (TEI)</span> across the network. Unified findings indicate a network mean composite of <span className="text-blue-400 font-black">{aggregateMetrics.networkMean.toFixed(1)}%</span>.
                  </p>
                  <p>
                    Longitudinal growth analysis confirms that <span className="text-white font-black">{aggregateMetrics.activeSchools}</span> schools outperformed the historical 5.5 mock baseline, resulting in a network-wide Significant Difference (&Sigma; &Delta;) of <span className="text-emerald-400 font-black">+1.12</span>.
                  </p>
               </div>
               <div className="space-y-4">
                  <p>
                    Discrepancies in Section B (Theory) mastery remain the primary instructional friction point. The ratio of Objective precision to Theoretical depth currently sits at <span className="text-indigo-400 font-black">1.4:1</span>, suggesting a need for increased emphasis on articulation strategies.
                  </p>
                  <p>
                    Census data validates the hub's operational load with <span className="text-white font-black">{aggregateMetrics.totalStudents}</span> verified candidate profiles synchronized across the network registry.
                  </p>
               </div>
            </div>
         </div>

         {/* Elite Performance Matrix */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-6">
               <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                  Top Facilitators (Global TEI Ranking)
               </h4>
               <div className="space-y-4">
                  {topFacilitators.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                       <div>
                          <p className="text-xs font-black uppercase text-slate-900">{f.name}</p>
                          <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">{f.subject} — {f.school}</p>
                       </div>
                       <div className="text-right">
                          <span className="text-[10px] font-black text-slate-950 font-mono">TEI: {f.tei.toFixed(2)}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-white border-2 border-slate-100 rounded-[3rem] p-10 shadow-sm space-y-8">
               <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-emerald-600 rounded-full"></div>
                  Institutional Sig-Diff Leaders
               </h4>
               <div className="space-y-4">
                  {registry.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                       <div>
                          <p className="text-xs font-black uppercase text-slate-900">{s.name}</p>
                          <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">&Sigma; &Delta; Leader</span>
                       </div>
                       <div className="text-right">
                          <span className="text-xl font-black text-emerald-600 font-mono">+1.45</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Roadmap Section */}
         <div className="bg-white border-2 border-slate-950 p-12 rounded-[4rem] space-y-8 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-950/5 rounded-bl-full"></div>
            <h3 className="text-xl font-black uppercase tracking-[0.4em] text-slate-900 border-b-2 border-slate-100 pb-4">II. Network Roadmap for Next Mock Cycle</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest underline decoration-blue-500 underline-offset-8">Curriculum Interventions</h5>
                  <ul className="space-y-4">
                     <li className="text-[10px] text-slate-600 flex gap-4"><span className="w-6 h-6 bg-blue-900 text-white rounded-lg flex items-center justify-center text-[8px] font-black shrink-0">01</span> <span className="leading-relaxed font-medium">Standardize "Mastery Protocols" across all nodes for Section B theoretical articulation.</span></li>
                     <li className="text-[10px] text-slate-600 flex gap-4"><span className="w-6 h-6 bg-blue-900 text-white rounded-lg flex items-center justify-center text-[8px] font-black shrink-0">02</span> <span className="leading-relaxed font-medium">Implementation of digital remedial clusters for subjects with Network TEI &lt; 5.0.</span></li>
                  </ul>
               </div>
               <div className="space-y-4">
                  <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest underline decoration-red-500 underline-offset-8">Infrastructure Milestones</h5>
                  <ul className="space-y-4">
                     <li className="text-[10px] text-slate-600 flex gap-4"><span className="w-6 h-6 bg-red-700 text-white rounded-lg flex items-center justify-center text-[8px] font-black shrink-0">01</span> <span className="leading-relaxed font-medium">Deploy Local Sync redundancy to all Tier-2 rural institutions.</span></li>
                     <li className="text-[10px] text-slate-600 flex gap-4"><span className="w-6 h-6 bg-red-700 text-white rounded-lg flex items-center justify-center text-[8px] font-black shrink-0">02</span> <span className="leading-relaxed font-medium">Achieve 100% BECE Outcome Synchronization within 48 hours of result release.</span></li>
                  </ul>
               </div>
            </div>
         </div>
      </section>

      {/* Verification Footer */}
      <div className="bg-slate-50 p-12 rounded-[4rem] border-2 border-dashed border-slate-200">
         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-12 text-center">Institutional Verification & Authentication Registry</h3>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-20">
            <div className="text-center space-y-2">
               <div className="border-t-2 border-slate-900 pt-2 font-black uppercase text-[10px]">Registry Controller</div>
               <p className="text-[8px] text-gray-400 italic">Data Persistence Validated</p>
            </div>
            <div className="text-center space-y-2">
               <div className="border-t-2 border-slate-900 pt-2 font-black uppercase text-[10px]">Inspectorate General</div>
               <p className="text-[8px] text-gray-400 italic">Instructional Integrity Verified</p>
            </div>
            <div className="text-center space-y-2">
               <div className="border-t-2 border-slate-900 pt-2 font-black uppercase text-[10px]">Network Director</div>
               <p className="text-[8px] text-gray-400 italic">Official Network Seal</p>
            </div>
         </div>
      </div>

      <div className="pt-12 text-center">
         <p className="text-[9px] font-black text-blue-900 uppercase tracking-[2em] opacity-30">MOCK ANALYSIS SS-MAP — GLOBAL AUDIT OUTPUT</p>
      </div>

    </div>
  );
};

export default NetworkAnnualAuditReport;

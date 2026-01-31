import React, { useState } from 'react';
import { SystemAuditEntry } from './SuperAdminPortal';

interface AuditLogViewProps {
  auditTrail: SystemAuditEntry[];
}

const AuditLogView: React.FC<AuditLogViewProps> = ({ auditTrail }) => {
  // Ensure auditTrail items are treated safely
  const years = (Array.from(new Set((auditTrail || []).map(a => a.year || new Date().getFullYear().toString()))) as string[])
    .sort((a,b) => b.localeCompare(a));
    
  const [selectedYear, setSelectedYear] = useState(years[0] || new Date().getFullYear().toString());

  const filteredLogs = (auditTrail || []).filter(log => (log.year || "") === selectedYear);

  return (
    <div className="animate-in slide-in-from-left-8 duration-500 flex flex-col h-full">
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-wrap gap-6 items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase text-white">System Audit Trail</h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Master Action History</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-[9px] font-black text-slate-500 uppercase">Successive Cycle:</label>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-950 text-white font-black py-2.5 px-6 rounded-xl border border-slate-800 text-[10px] uppercase outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            {years.length > 0 ? years.map(y => <option key={y} value={y}>{y} ACADEMIC PERIOD</option>) : <option value={new Date().getFullYear()}>{new Date().getFullYear()} PERIOD</option>}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar max-h-[600px]">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:border-slate-600 transition-all">
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-800 group-hover:border-blue-500/30">
                  <span className="text-[7px] font-black text-slate-600 leading-none">IDX</span>
                  <span className="text-xs font-black text-blue-400">{filteredLogs.length - i}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${
                      (log.action || "").includes('MASTER') ? 'bg-indigo-500/20 text-indigo-400' : 
                      (log.action || "").includes('DECOMMISSION') ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.action || "SYSTEM_EVENT"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'TBA'}</span>
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">{log.details || "Administrative node heartbeat detected."}</h4>
                  <p className="text-[9px] font-black text-slate-500 uppercase">Target: <span className="text-slate-300">{log.target || "GLOBAL_NODE"}</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800">
                  <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Actor Node</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-black">{log.actor || "SUPERADMIN"}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-40 text-center flex flex-col items-center gap-6 opacity-20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            <p className="text-white font-black uppercase text-xs tracking-[0.5em]">No synchronization history for this period</p>
          </div>
        )}
      </div>

      <div className="p-8 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center">
         <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">End of Succession Ledger</span>
         <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Audit Terminal Sync Active</span>
         </div>
      </div>
    </div>
  );
};

export default AuditLogView;
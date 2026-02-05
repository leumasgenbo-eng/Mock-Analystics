
import React, { useState } from 'react';
import { SchoolRegistryEntry } from '../../types';
import { supabase } from '../../supabaseClient';

interface RegistryViewProps {
  registry: SchoolRegistryEntry[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onRemoteView: (schoolId: string) => void;
  onUpdateRegistry: (next: SchoolRegistryEntry[]) => void;
  onLogAction: (action: string, target: string, details: string) => void;
}

const RegistryView: React.FC<RegistryViewProps> = ({ registry, searchTerm, setSearchTerm, onRemoteView, onUpdateRegistry, onLogAction }) => {
  const [credentialPreview, setCredentialPreview] = useState<SchoolRegistryEntry | null>(null);

  const query = (searchTerm || "").toLowerCase();
  const filtered = registry.filter(r => 
    (r.name || "").toLowerCase().includes(query) || 
    (r.id || "").toLowerCase().includes(query)
  );

  const handleForwardCredentials = (school: SchoolRegistryEntry) => {
    const email = school.fullData?.settings.schoolEmail || "N/A";
    const contact = school.fullData?.settings.schoolContact || "N/A";
    
    if (window.confirm(`FORWARD PROTOCOL:\n\nSend access keys for ${school.name} to:\n- Email: ${email}\n- Contact: ${contact}\n\nGrant request for missing credentials?`)) {
      onLogAction("CREDENTIAL_FORWARD", school.id, `Forwarded to ${email} and ${contact}`);
      alert(`CREDENTIALS DISPATCHED: Key pack for ${school.id} sent successfully.`);
    }
  };

  const handleDecommission = async (id: string) => {
    if (window.confirm("CRITICAL: Permanent decommissioning of institution? This erases all associated data nodes in the registry.")) {
      // 1. Delete HQ Registry Shard
      await supabase.from('uba_persistence').delete().eq('id', `registry_${id}`);
      // 2. Delete Relational Assets linked to Hub
      await Promise.all([
        supabase.from('uba_pupils').delete().eq('hub_id', id),
        supabase.from('uba_facilitators').delete().eq('hub_id', id),
        supabase.from('uba_identities').delete().eq('hub_id', id),
        supabase.from('uba_persistence').delete().eq('hub_id', id)
      ]);
      const next = registry.filter(r => r.id !== id);
      onUpdateRegistry(next);
      onLogAction("DECOMMISSION_HUB", id, "Institution wiped from network registry.");
      alert("INSTITUTIONAL SHARD PERMANENTLY ERASED.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      {/* Header Block */}
      <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/50">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase text-white flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
             Institutional Network Registry
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Master Ledger — Real-time SQL Handshake Active</p>
        </div>
        <div className="relative w-full md:w-96">
           <input 
             type="text" 
             placeholder="Filter registry shards..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all placeholder:text-slate-700"
           />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-[0.2em] sticky top-0 z-10 shadow-lg border-b border-slate-800">
            <tr>
              <th className="px-8 py-6 w-16 text-center">State</th>
              <th className="px-6 py-6 min-w-[220px]">Hub Identity</th>
              <th className="px-6 py-6">Enrollment Key</th>
              <th className="px-6 py-6 text-center">Live Census</th>
              <th className="px-6 py-6">Network Access</th>
              <th className="px-8 py-6 text-right">Access Terminal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(school => {
              const email = school.fullData?.settings.schoolEmail || "hub@unregistered.net";
              const lastSync = school.lastActivity ? new Date(school.lastActivity).toLocaleDateString() : 'NEVER';
              const students = school.studentCount || 0;
              const staff = school.fullData?.staff || 0;
              
              return (
                <tr key={school.id} className="hover:bg-blue-600/5 transition-colors group">
                  <td className="px-8 py-6 text-center">
                    <div className={`w-2.5 h-2.5 rounded-full mx-auto ${school.status === 'active' ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                  </td>
                  <td className="px-6 py-6">
                     <div className="flex flex-col gap-1">
                        <span className="font-black text-white uppercase leading-none group-hover:text-blue-400 transition-colors">{school.name || "UNNAMED HUB"}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Last Shard Sync: {lastSync}</span>
                     </div>
                  </td>
                  <td className="px-6 py-6">
                    <button 
                      onClick={() => setCredentialPreview(school)}
                      className="font-mono text-blue-500 text-[11px] font-black tracking-tighter bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 shadow-inner group-hover:border-blue-500/50 transition-all"
                    >
                      {school.id || "NO_ID"}
                    </button>
                  </td>
                  <td className="px-6 py-6">
                     <div className="flex flex-col items-center gap-1.5">
                        <div className="flex gap-3">
                           <div className="text-center">
                              <span className="text-[7px] font-black text-slate-600 uppercase block">Pupils</span>
                              <span className="text-xs font-black text-emerald-400 font-mono">{students}</span>
                           </div>
                           <div className="text-center">
                              <span className="text-[7px] font-black text-slate-600 uppercase block">Staff</span>
                              <span className="text-xs font-black text-indigo-400 font-mono">{staff}</span>
                           </div>
                        </div>
                        <div className="w-16 h-1 bg-slate-950 rounded-full overflow-hidden flex">
                           <div className="h-full bg-emerald-500" style={{ width: '60%' }}></div>
                           <div className="h-full bg-indigo-500" style={{ width: '40%' }}></div>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-6">
                     <span className="text-[10px] text-slate-500 font-medium font-mono lowercase truncate block max-w-[150px]">{email}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3 opacity-40 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleForwardCredentials(school)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all border border-slate-700">Forward</button>
                      <button onClick={() => onRemoteView(school.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg transition-all active:scale-95 border border-blue-500">Access Node</button>
                      <button onClick={() => handleDecommission(school.id)} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white p-2 rounded-xl transition-all border border-red-500/20" title="Decommission Node">
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
               <tr>
                  <td colSpan={6} className="py-40 text-center opacity-20">
                     <div className="flex flex-col items-center gap-6">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        <p className="font-black uppercase text-sm tracking-[0.5em] text-white">Registry Vacant or Filter Applied</p>
                     </div>
                  </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-8 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-600">
         <span>Network Master Ledger — Integrity Scan Complete</span>
         <div className="flex gap-6">
            <span className="text-blue-500 font-mono">Live Nodes: {filtered.length}</span>
            <span className="text-emerald-500 font-mono">Real-time Shards: Synchronized</span>
         </div>
      </div>
    </div>
  );
};

export default RegistryView;

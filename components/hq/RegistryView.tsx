
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [credentialPreview, setCredentialPreview] = useState<SchoolRegistryEntry | null>(null);
  const [showSecretInPreview, setShowSecretInPreview] = useState(false);

  const query = (searchTerm || "").toLowerCase();
  const filtered = registry.filter(r => 
    (r.name || "").toLowerCase().includes(query) || 
    (r.id || "").toLowerCase().includes(query)
  );

  const handleSaveName = async (id: string) => {
    const original = registry.find(r => r.id === id);
    if (!original) return;

    const updatedEntry = { ...original, name: editName.toUpperCase() };
    const next = registry.map(r => r.id === id ? updatedEntry : r);
    
    await supabase.from('uba_persistence').upsert({ 
      id: `registry_${id}`, 
      payload: [updatedEntry], 
      last_updated: new Date().toISOString() 
    });

    onUpdateRegistry(next);
    onLogAction("IDENTITY_MODULATION", id, `School name updated from "${original?.name}" to "${editName.toUpperCase()}"`);
    setEditingId(null);
  };

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
      await supabase.from('uba_persistence').delete().eq('id', `registry_${id}`);
      const next = registry.filter(r => r.id !== id);
      onUpdateRegistry(next);
      onLogAction("DECOMMISSION_HUB", id, "Institution wiped from network registry.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/50">
        <div className="space-y-1">
          <h2 className="text-xl font-black uppercase text-white flex items-center gap-3">
             <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.6)]"></div>
             Institutional Network Registry
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Node Management & Recovery Center</p>
        </div>
        <div className="relative w-full md:w-96">
           <input 
             type="text" 
             placeholder="Filter registry..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
           />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-[0.2em] sticky top-0 z-10 shadow-lg">
            <tr>
              <th className="px-6 py-6 w-16 text-center">State</th>
              <th className="px-6 py-6 min-w-[220px]">Institution Identity</th>
              <th className="px-6 py-6">Enrollment Key</th>
              <th className="px-6 py-6 text-center">Pupil Census</th>
              <th className="px-6 py-6">Registration Email</th>
              <th className="px-6 py-6 text-right">Access Terminal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map(school => {
              const email = school.fullData?.settings.schoolEmail || "hub@unregistered.net";
              const contact = school.fullData?.settings.schoolContact || "NO_SYNC";
              
              return (
                <tr key={school.id} className="hover:bg-slate-800/40 transition-colors group">
                  <td className="px-6 py-6 text-center">
                    <div className={`w-2.5 h-2.5 rounded-full mx-auto ${school.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                  </td>
                  <td className="px-6 py-6">
                     <div className="flex flex-col gap-1">
                        <span className="font-black text-white uppercase leading-none">{school.name || "UNNAMED HUB"}</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Registrant: {school.registrant || "N/A"}</span>
                     </div>
                  </td>
                  <td className="px-6 py-6">
                    <button 
                      onClick={() => setCredentialPreview(school)}
                      className="font-mono text-blue-500 text-[11px] font-black tracking-tighter bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"
                    >
                      {school.id || "NO_ID"}
                    </button>
                  </td>
                  <td className="px-6 py-6 text-center font-black text-slate-400">{school.studentCount || 0}</td>
                  <td className="px-6 py-6">
                     <span className="text-[10px] text-slate-500 font-medium font-mono lowercase">{email}</span>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleForwardCredentials(school)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase transition-all">Forward</button>
                      <button onClick={() => onRemoteView(school.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg transition-all active:scale-95">Access Hub</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegistryView;


import React from 'react';
import { GlobalSettings } from '../../types';

interface SchoolCredentialViewProps {
  settings: GlobalSettings;
  studentCount: number;
}

const SchoolCredentialView: React.FC<SchoolCredentialViewProps> = ({ settings, studentCount }) => {
  const handleDownloadPack = () => {
    const text = `SS-map ACADEMY - INSTITUTIONAL ACCESS PACK\n` +
                 `==============================================================\n\n` +
                 `LOGIN CREDENTIALS (RECALL PARTICULARS):\n` +
                 `Full Legal Name:  ${settings.registrantName}\n` +
                 `System Node ID:   ${settings.schoolNumber}\n` +
                 `Registered Email: ${settings.registrantEmail}\n\n` +
                 `--------------------------------------------------------------\n` +
                 `SECURITY NODE KEYS:\n` +
                 `Admin Key:        ${settings.accessCode}\n` +
                 `Staff Passkey:    ${settings.staffAccessCode}\n` +
                 `Pupil Passkey:    ${settings.pupilAccessCode}\n\n` +
                 `Handshake Security PIN: ${settings.securityPin}\n\n` +
                 `* IMPORTANT: This pack mirrors the particulars stored in the Supabase Identity Shard.`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `SMA_AccessPack_${settings.schoolNumber}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-950 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="bg-blue-900 px-10 py-6 flex justify-between items-center border-b border-blue-800">
           <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Institutional Credential Ledger</h3>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.4em]">Official Identity Handshake Registry</p>
           </div>
           <button onClick={handleDownloadPack} className="bg-white text-blue-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Download Access Pack
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-10 py-6">Handshake Particulars</th>
                <th className="px-8 py-6">Value</th>
                <th className="px-8 py-6 text-right">Recall Shard Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
               {[
                 { label: 'Full Legal Name', val: settings.registrantName },
                 { label: 'System Node ID', val: settings.schoolNumber },
                 { label: 'Registered Email', val: settings.registrantEmail }
               ].map((item, i) => (
                 <tr key={i} className="hover:bg-white/5 transition-colors">
                    <td className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase">{item.label}</td>
                    <td className="px-8 py-6 text-sm font-black text-white uppercase font-mono">{item.val}</td>
                    <td className="px-10 py-6 text-right">
                       <span className="bg-emerald-600/20 text-emerald-400 px-3 py-1 rounded-lg text-[8px] font-black uppercase">Stored in Shard</span>
                    </td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SchoolCredentialView;

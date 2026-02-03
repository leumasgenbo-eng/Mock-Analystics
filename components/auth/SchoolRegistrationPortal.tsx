
import React, { useState } from 'react';
import { GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface SchoolRegistrationPortalProps {
  settings: GlobalSettings;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  onComplete?: (hubId: string) => void;
  onResetStudents?: () => void;
  onSwitchToLogin?: () => void;
}

const SchoolRegistrationPortal: React.FC<SchoolRegistrationPortalProps> = ({ 
  settings, onBulkUpdate, onSave, onComplete, onResetStudents, onSwitchToLogin 
}) => {
  const [formData, setFormData] = useState({
    schoolName: '',
    location: '',
    registrant: '', 
    email: '',
    contact: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');
  const [finalHubId, setFinalHubId] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.registrant || !formData.email || !formData.contact) {
        alert("Complete all particulars."); return;
    }
    setIsLoading(true);
    try {
      const hubId = `SMA-2025-${Math.floor(1000 + Math.random() * 9000)}`;
      const targetEmail = formData.email.toLowerCase().trim();
      const targetName = formData.registrant.toUpperCase().trim();
      const accessKey = 'OPEN-HUB'; // Default access key for new registrations
      const ts = new Date().toISOString();

      // 1. REGISTER IDENTITY (Primary Admin) - This makes the school findable at the login gate
      await supabase.from('uba_identities').upsert({
        email: targetEmail,
        full_name: targetName,
        node_id: hubId,
        hub_id: hubId,
        role: 'school_admin',
        unique_code: accessKey 
      });

      const newSettings: GlobalSettings = {
        ...settings,
        schoolName: formData.schoolName.toUpperCase(),
        schoolAddress: formData.location.toUpperCase(),
        registrantName: targetName,
        registrantEmail: targetEmail,
        schoolContact: formData.contact,
        schoolEmail: targetEmail,
        schoolNumber: hubId,
        accessCode: accessKey,
        reportDate: new Date().toLocaleDateString()
      };

      // 2. INITIALIZE INSTITUTIONAL SHARDS IN PERSISTENCE HUB
      await supabase.from('uba_persistence').upsert([
        { id: `${hubId}_settings`, hub_id: hubId, payload: newSettings, last_updated: ts },
        { id: `${hubId}_students`, hub_id: hubId, payload: [], last_updated: ts },
        { id: `${hubId}_facilitators`, hub_id: hubId, payload: {}, last_updated: ts }
      ]);

      // 3. UPDATE REGISTRY VIEW FOR HQ
      await supabase.from('uba_persistence').upsert({ 
        id: `registry_${hubId}`, 
        hub_id: hubId, 
        payload: { 
          ...newSettings, 
          id: hubId,
          name: formData.schoolName.toUpperCase(),
          status: 'active', 
          lastActivity: ts, 
          studentCount: 0 
        } 
      });

      onBulkUpdate(newSettings);
      if (onResetStudents) onResetStudents();
      setFinalHubId(hubId);
      setStep('SUCCESS');
      
      // Auto-save local state
      onSave();

    } catch (err: any) {
      alert("Registration Fault: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'SUCCESS') {
    return (
      <div className="max-w-2xl mx-auto p-4 animate-in zoom-in-95 duration-700">
         <div className="bg-slate-900 rounded-[3rem] p-12 text-center shadow-2xl border border-white/10 space-y-8">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="space-y-2">
               <h3 className="text-3xl font-black text-white uppercase tracking-tight">Institutional Enrollment Complete</h3>
               <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">Network Shard Synchronized</p>
            </div>
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-4 text-left">
               <div>
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">System Node ID (Required for Login)</span>
                  <p className="text-2xl font-mono font-black text-blue-400 tracking-tighter">{finalHubId}</p>
               </div>
               <div className="pt-4 border-t border-white/5">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Master Access Key</span>
                  <p className="text-2xl font-mono font-black text-emerald-400 tracking-tighter">OPEN-HUB</p>
               </div>
            </div>
            <div className="text-left px-4">
              <p className="text-[10px] text-slate-400 italic">Notice: Use your Full Name and the System Node ID above at the Login Gate. You can change your particulars inside the Management Hub.</p>
            </div>
            <button 
              onClick={() => onComplete?.(finalHubId)}
              className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Access Dashboard
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in duration-700">
      <div className="bg-slate-950 p-1 rounded-[3.2rem] shadow-2xl border border-white/10">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Institutional Enrollment</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Storage Persistence Node Sync</p>
          </div>

          <form onSubmit={handleRegister} className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Academy Name</label>
              <input type="text" value={formData.schoolName} onChange={e=>setFormData({...formData, schoolName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="ENTER SCHOOL NAME..." required />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Registrant Full Name</label>
              <input type="text" value={formData.registrant} onChange={e=>setFormData({...formData, registrant: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="FULL LEGAL IDENTITY..." required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Contact Phone</label>
                <input type="text" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="000 000 0000" required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Location</label>
                <input type="text" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none uppercase" placeholder="TOWN / CITY" required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Official Email</label>
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="INFO@ACADEMY.COM" required />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] disabled:opacity-50 transition-all hover:bg-black mt-4 shadow-2xl">
              {isLoading ? "Syncing Shards..." : "Execute Enrollment"}
            </button>
            <button type="button" onClick={onSwitchToLogin} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline mt-4 text-center w-full">Already Registered? Recall Identity</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;

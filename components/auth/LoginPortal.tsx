
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

interface LoginPortalProps {
  onLoginSuccess: (hubId: string, user: { name: string, nodeId: string, role: string, email: string, subject?: string }) => void;
  onSuperAdminLogin: () => void;
  onSwitchToRegister: () => void;
}

type UserRole = 'admin' | 'facilitator' | 'pupil' | null;

const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess, onSuperAdminLogin, onSwitchToRegister }) => {
  const [activeGate, setActiveGate] = useState<UserRole>(null);
  const [fullName, setFullName] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGateSelect = (role: UserRole) => {
    setActiveGate(role);
    setError(null);
  };

  const handleSyncIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const inputName = fullName.toUpperCase().trim();
    const inputId = nodeId.trim().toUpperCase();

    // 1. MASTER KEY BYPASS (SUPER ADMIN PROTECTION - v9.5 Protocol)
    if (inputId === 'UBA-HQ-MASTER-2025') {
        onSuperAdminLogin();
        return;
    }

    if (!inputName || !inputId) {
      setError("Complete all identity fields.");
      setIsLoading(false);
      return;
    }

    try {
      // 2. RECALL FROM DB (UNIFIED HANDSHAKE)
      const { data: identity, error: idError } = await supabase
        .from('uba_identities')
        .select('*')
        .or(`node_id.eq.${inputId},unique_code.eq.${inputId}`)
        .eq('full_name', inputName)
        .maybeSingle();

      if (idError) throw new Error("Recall Shard unreachable: " + idError.message);
      
      if (!identity) {
        throw new Error("Identity Mismatch: Handshake particulars not found in registry.");
      }

      // 3. CHECK FOR SUPER ADMIN ROLE IN DB
      if (identity.role === 'super_admin') {
        onSuperAdminLogin();
        return;
      }

      // 4. SECTOR GATE VERIFICATION
      const roleMap: Record<string, string> = { 
        'school_admin': 'admin', 
        'facilitator': 'facilitator', 
        'pupil': 'pupil' 
      };
      
      if (roleMap[identity.role] !== activeGate) {
        throw new Error(`Gate Refusal: This identity node belongs to the ${identity.role.replace('_', ' ')} sector.`);
      }

      // 5. ACTIVITY LOG: Log Identity Recall (100% Data Capture)
      await supabase.from('uba_activity_logs').insert({
        node_id: identity.hub_id,
        staff_id: identity.email,
        action_type: 'IDENTITY_RECALL',
        context_data: { login_time: new Date().toISOString(), platform: 'ASSESSMENT_HUB' }
      });

      // 6. SUCCESSFUL LOGIN
      onLoginSuccess(identity.hub_id, {
        name: identity.full_name,
        nodeId: identity.node_id,
        role: identity.role,
        email: identity.email,
        subject: identity.role === 'facilitator' ? (identity.teaching_category || 'GENERAL') : undefined
      });

    } catch (err: any) { 
      setError(err.message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  if (!activeGate) {
    return (
      <div className="w-full max-w-4xl p-4 animate-in fade-in duration-500">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">UNITED BAYLOR ACADEMY</h2>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mt-3 leading-none">Identity Retrieval & Sector Access</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { id: 'admin', label: 'Institutional Admin', color: 'from-blue-600 to-blue-900', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
             { id: 'facilitator', label: 'Faculty Shard', color: 'from-indigo-600 to-indigo-900', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
             { id: 'pupil', label: 'Pupil Portal', color: 'from-emerald-600 to-emerald-900', icon: 'M22 10v6M2 10l10-5 10 5-10 5z' }
           ].map(gate => (
             <button key={gate.id} onClick={() => handleGateSelect(gate.id as UserRole)} className="group bg-slate-950 border border-white/10 p-12 rounded-[3.5rem] text-center hover:border-white/30 transition-all hover:-translate-y-2 shadow-2xl">
                <div className={`w-20 h-20 bg-gradient-to-br ${gate.color} text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:scale-110 transition-transform`}>
                   <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={gate.icon}/></svg>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">{gate.label}</h3>
             </button>
           ))}
        </div>
        <div className="mt-16 text-center space-y-4">
          <button onClick={onSwitchToRegister} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Onboard New Institution</button>
          <div className="pt-4 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-[7px] text-slate-600 uppercase tracking-widest mb-2 leading-none">Master Handshake (Super-Admin Only)</p>
            <button 
              onClick={() => { setFullName('HQ CONTROLLER'); setNodeId('UBA-HQ-MASTER-2025'); handleGateSelect('admin'); }} 
              className="text-[8px] font-black text-blue-500 border border-blue-500/20 px-4 py-1 rounded-full uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
            >
              Verify Master Shard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gateColor = activeGate === 'pupil' ? 'emerald' : activeGate === 'facilitator' ? 'indigo' : 'blue';

  return (
    <div className="w-full max-w-xl p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-950 p-10 md:p-14 rounded-[4rem] shadow-2xl border border-white/10 relative overflow-hidden">
        <button onClick={() => setActiveGate(null)} className="absolute top-10 left-10 text-slate-500 hover:text-white transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        <div className="text-center relative mb-12">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center text-white shadow-2xl border border-white/20 uppercase font-black text-xs bg-${gateColor}-600`}>{activeGate?.substring(0, 3)}</div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">IDENTITY RECALL</h2>
          <p className={`text-[9px] font-black text-${gateColor}-400 uppercase tracking-[0.4em] mt-3 leading-none`}>Authorized Recall Protocol</p>
        </div>

        <form onSubmit={handleSyncIdentity} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Registered Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" placeholder="ENTER FULL NAME" required />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">System Node ID or Access Key (PIN)</label>
            <input type="text" value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-sm font-mono font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" placeholder="ENTER ID OR PIN" required />
          </div>
          
          {error && <div className="bg-red-500/10 text-red-500 p-5 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20">{error}</div>}
          
          <button type="submit" disabled={isLoading} className={`w-full bg-${gateColor}-600 hover:bg-${gateColor}-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all`}>
            {isLoading ? "SYNCING..." : "ENTER ACADEMY HUB"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPortal;

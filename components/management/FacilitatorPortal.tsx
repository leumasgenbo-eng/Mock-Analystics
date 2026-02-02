
import React, { useState, useEffect } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings, InvigilationSlot } from '../../types';
import { supabase } from '../../supabaseClient';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  onSave: () => void;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ 
  subjects, facilitators, setFacilitators, settings, onSave, isFacilitator, activeFacilitator 
}) => {
  const [newStaff, setNewStaff] = useState({ 
    name: '', email: '', role: 'FACILITATOR' as StaffRole, subject: '', category: 'BASIC_SUBJECT_LEVEL', uniqueCode: ''
  });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [identities, setIdentities] = useState<any[]>([]);

  useEffect(() => {
     const fetchIdentities = async () => {
        const { data } = await supabase.from('uba_identities').select('*').eq('hub_id', settings.schoolNumber);
        if (data) setIdentities(data);
     };
     if (settings.schoolNumber) fetchIdentities();
  }, [settings.schoolNumber, facilitators]);

  const createEmptyRegister = (): InvigilationSlot[] => 
    Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));

  const handleAddStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    setIsEnrolling(true);
    try {
      const hubId = settings.schoolNumber || "SMA-UBA-NODE-2025";
      const staffId = `STAFF-${Math.floor(1000 + Math.random() * 9000)}`;
      const nodeId = `${hubId}/${staffId}`;
      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();
      const uniqueCode = newStaff.uniqueCode || `FAC-${Math.floor(100 + Math.random() * 899)}`;

      await supabase.from('uba_identities').upsert({
        email: targetEmail,
        full_name: targetName,
        node_id: nodeId, 
        hub_id: hubId,   
        role: newStaff.role.toLowerCase(),
        teaching_category: newStaff.category,
        unique_code: uniqueCode,
        merit_balance: 0,
        monetary_balance: 0
      });

      const staff: StaffAssignment = {
        name: targetName,
        email: targetEmail,
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        teachingCategory: newStaff.category,
        uniqueCode: uniqueCode,
        enrolledId: nodeId, 
        invigilations: createEmptyRegister(),
        account: { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] },
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      setFacilitators(prev => ({ ...prev, [targetEmail]: staff }));
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '', category: 'BASIC_SUBJECT_LEVEL', uniqueCode: '' });
      alert(`FACULTY SYNC: ${targetName} identity shared with companion app.`);
    } catch (err: any) {
      alert("Enrolment Error: " + err.message);
    } finally {
      setIsEnrolling(false);
      setTimeout(onSave, 100);
    }
  };

  const updateInvigilation = (email: string, index: number, field: keyof InvigilationSlot, value: string) => {
    setFacilitators(prev => {
      const staff = { ...prev[email] };
      const nextInv = [...staff.invigilations];
      nextInv[index] = { ...nextInv[index], [field]: value };
      return { ...prev, [email]: { ...staff, invigilations: nextInv } };
    });
  };

  const roles: StaffRole[] = ['FACILITATOR', 'INVIGILATOR', 'EXAMINER', 'CHIEF INVIGILATOR', 'CHIEF EXAMINER', 'SUPERVISOR', 'OFFICER'];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-950 text-white p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter">Faculty Shard Matrix</h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Institutional Account Oversight Node</p>
            </div>
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="LEGAL IDENTITY..." required />
                <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="STAFF@EMAIL.COM" required />
                <input type="text" value={newStaff.uniqueCode} onChange={e=>setNewStaff({...newStaff, uniqueCode: e.target.value.toUpperCase()})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none font-mono" placeholder="CUSTOM CODE (AUTH TOKEN)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select value={newStaff.role} onChange={e=>setNewStaff({...newStaff, role: e.target.value as StaffRole})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                   {roles.map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
                </select>
                <select value={newStaff.category} onChange={e=>setNewStaff({...newStaff, category: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                   <option value="BASIC_SUBJECT_LEVEL" className="text-slate-900">BASIC NINE SECTOR</option>
                   <option value="KG_NURSERY" className="text-slate-900">KG / NURSERY</option>
                   <option value="ADMINISTRATOR" className="text-slate-900">ADMINISTRATIVE</option>
                </select>
                <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                   <option value="" className="text-slate-900">SUBJECT SHARD...</option>
                   {subjects.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
                  {isEnrolling ? "SYNCING HUB..." : "Enroll Shared Identity"}
                </button>
              </div>
           </form>
         )}
      </section>

      <div className="grid grid-cols-1 gap-8">
        {(Object.values(facilitators) as StaffAssignment[]).map((f) => {
          const isExpanded = expandedStaff === f.email;
          const identity = identities.find(i => i.email === f.email);
          return (
            <div key={f.email} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group transition-all hover:shadow-2xl">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex flex-col items-center justify-center font-black shadow-lg border-4 border-white relative">
                        <span className="text-2xl">{f.name.charAt(0)}</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <h4 className="text-xl font-black text-slate-900 uppercase leading-none">{f.name}</h4>
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase bg-emerald-50 text-emerald-600`}>{f.teachingCategory || 'BASIC 9'}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           <span className="text-blue-600">{f.taughtSubject || 'GENERIC'}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span className="font-mono text-[9px] text-indigo-600">TOKEN: {f.uniqueCode || '—'}</span>
                        </div>
                     </div>
                  </div>
                  
                  {/* Account Summary Overlay */}
                  <div className="bg-slate-50 px-6 py-4 rounded-3xl border border-gray-100 flex items-center gap-6 shadow-inner">
                     <div className="text-center">
                        <span className="text-[7px] font-black text-gray-400 uppercase block">Q-Balance</span>
                        <p className="text-sm font-black text-blue-900 font-mono">{identity?.merit_balance || 0}</p>
                     </div>
                     <div className="w-px h-6 bg-gray-200"></div>
                     <div className="text-center">
                        <span className="text-[7px] font-black text-gray-400 uppercase block">Vault (GHS)</span>
                        <p className="text-sm font-black text-emerald-600 font-mono">{identity?.monetary_balance?.toFixed(2) || '0.00'}</p>
                     </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                     <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isExpanded ? 'bg-blue-900 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {isExpanded ? 'Close Register' : 'Audit Node'}
                     </button>
                  </div>
               </div>
               {isExpanded && (
                 <div className="bg-slate-50 p-10 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {f.invigilations.map((slot, idx) => (
                         <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-center">
                               <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-400">{idx + 1}.</span>
                               <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Duty Slot</span>
                            </div>
                            <div className="space-y-3">
                               <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Duty Date</label>
                                  <input type="date" value={slot.dutyDate} onChange={e => updateInvigilation(f.email, idx, 'dutyDate', e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" />
                               </div>
                               <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Assigned Discipline</label>
                                  <select value={slot.subject} onChange={e => updateInvigilation(f.email, idx, 'subject', e.target.value)} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 uppercase">
                                     <option value="">SELECT SUBJECT...</option>
                                     {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FacilitatorPortal;

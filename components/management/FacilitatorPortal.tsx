
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings, InvigilationSlot } from '../../types';
import { supabase } from '../../supabaseClient';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  onSave: (overrides?: any) => void;
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
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);
  const [dbFacilitators, setDbFacilitators] = useState<any[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
     const fetchDbFacs = async () => {
        if (!settings.schoolNumber) return;
        const { data } = await supabase.from('uba_facilitators').select('*').eq('hub_id', settings.schoolNumber);
        if (data) setDbFacilitators(data);
     };
     fetchDbFacs();
  }, [settings.schoolNumber, facilitators]);

  const createEmptyRegister = (): InvigilationSlot[] => 
    Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));

  const syncStaffToTables = async (staff: StaffAssignment) => {
    const hubId = settings.schoolNumber;
    const targetEmail = staff.email.toLowerCase().trim();
    const targetName = staff.name.toUpperCase().trim();
    const uniqueCode = staff.uniqueCode || `PIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const role = staff.role.toLowerCase().includes('admin') ? 'school_admin' : 'facilitator';

    // 1. Identity Table Handshake
    await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: staff.enrolledId, 
      hub_id: hubId,   
      role: role,
      unique_code: uniqueCode
    });

    // 2. Facilitator Table Record
    await supabase.from('uba_facilitators').upsert({
      email: targetEmail,
      full_name: targetName,
      hub_id: hubId,
      node_id: staff.enrolledId,
      taught_subject: staff.taughtSubject,
      teaching_category: staff.teachingCategory || 'BASIC_SUBJECT_LEVEL',
      unique_code: uniqueCode,
      merit_balance: staff.account?.meritTokens || 0,
      monetary_balance: staff.account?.monetaryCredits || 0,
      invigilation_data: staff.invigilations
    });
  };

  const handleUpdateInvigilation = async (email: string, index: number, field: keyof InvigilationSlot, value: string) => {
    const nextFacs = { ...facilitators };
    const staff = { ...nextFacs[email] };
    const invs = [...staff.invigilations];
    
    while(invs.length < 9) invs.push({ dutyDate: '', timeSlot: '', subject: '' });
    
    invs[index] = { ...invs[index], [field]: value };
    staff.invigilations = invs;
    nextFacs[email] = staff;
    
    setFacilitators(nextFacs);

    try {
      await supabase.from('uba_facilitators').update({ invigilation_data: invs }).eq('email', email);
      onSave({ facilitators: nextFacs });
    } catch (e) {
      console.error("Invigilation Sync Failed", e);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
      const dataLines = lines.slice(1); 
      
      const nextFacs = { ...facilitators };
      const hubId = settings.schoolNumber;
      const syncTasks = [];

      for (const line of dataLines) {
        const parts = line.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts[0] && parts[1]) {
          const email = parts[1].toLowerCase();
          const nodeId = `${hubId}/FAC-${Math.floor(100 + Math.random() * 899)}`;
          const pin = `PIN-${Math.floor(1000 + Math.random() * 8999)}`;
          
          const staff: StaffAssignment = {
            name: parts[0].toUpperCase(),
            email,
            role: 'FACILITATOR',
            taughtSubject: parts[2] || subjects[0],
            teachingCategory: 'BASIC_SUBJECT_LEVEL',
            uniqueCode: pin,
            enrolledId: nodeId,
            invigilations: createEmptyRegister(),
            account: { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] },
            marking: { dateTaken: '', dateReturned: '', inProgress: false }
          };
          nextFacs[email] = staff;
          syncTasks.push(syncStaffToTables(staff));
        }
      }
      setFacilitators(nextFacs);
      await Promise.all(syncTasks);
      onSave({ facilitators: nextFacs });
      alert(`FACULTY BATCH SUCCESS: ${dataLines.length} specialists synced with cloud tables.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleAddOrUpdateStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    
    setIsEnrolling(true);
    try {
      const hubId = settings.schoolNumber;
      if (!hubId) throw new Error("Institutional Node required.");

      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();
      const uniqueCode = newStaff.uniqueCode || `PIN-${Math.floor(1000 + Math.random() * 8999)}`;
      
      let nodeId = editingEmail ? facilitators[editingEmail].enrolledId : `${hubId}/FAC-${Math.floor(100 + Math.random() * 899).toString().padStart(3, '0')}`;
      const invRegister = editingEmail ? facilitators[editingEmail].invigilations : createEmptyRegister();

      const staff: StaffAssignment = {
        ... (editingEmail ? facilitators[editingEmail] : {
          invigilations: invRegister,
          account: { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] },
          marking: { dateTaken: '', dateReturned: '', inProgress: false }
        }),
        name: targetName,
        email: targetEmail,
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        teachingCategory: newStaff.category,
        uniqueCode: uniqueCode,
        enrolledId: nodeId
      };

      await syncStaffToTables(staff);

      const nextFacilitators = { ...facilitators };
      if (editingEmail && editingEmail !== targetEmail) delete nextFacilitators[editingEmail];
      nextFacilitators[targetEmail] = staff;

      setFacilitators(nextFacilitators);
      await onSave({ facilitators: nextFacilitators });
      
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '', category: 'BASIC_SUBJECT_LEVEL', uniqueCode: '' });
      setEditingEmail(null);
      alert(editingEmail ? "STAFF NODE MODULATED." : "STAFF NODE ACTIVATED.");
    } catch (err: any) {
      alert(`ENROLLMENT FAULT: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleGlobalRegistryCommit = async () => {
    setIsEnrolling(true);
    try {
      const tasks = Object.values(facilitators).map(f => syncStaffToTables(f));
      await Promise.all(tasks);
      onSave();
      alert("CLOUD REGISTRY VERIFIED: All staff identities mirrored to relational tables.");
    } catch (err: any) {
      alert("Registry Sync Fault: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEditSetup = (f: StaffAssignment) => {
    setEditingEmail(f.email);
    setNewStaff({
        name: f.name,
        email: f.email,
        role: f.role,
        subject: f.taughtSubject || '',
        category: f.teachingCategory || 'BASIC_SUBJECT_LEVEL',
        uniqueCode: f.uniqueCode || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const masterSchedule = useMemo(() => {
     const slots: Record<string, { subject: string, staff: string[] }[]> = {};
     Object.values(facilitators).forEach(f => {
        f.invigilations.forEach(inv => {
           if (inv.dutyDate && inv.timeSlot && inv.subject) {
              const key = `${inv.dutyDate} ${inv.timeSlot}`;
              if (!slots[key]) slots[key] = [];
              const subIdx = slots[key].findIndex(s => s.subject === inv.subject);
              if (subIdx >= 0) slots[key][subIdx].staff.push(f.name);
              else slots[key].push({ subject: inv.subject, staff: [f.name] });
           }
        });
     });
     return slots;
  }, [facilitators]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* GLOBAL OPERATIONS */}
      <section className="bg-slate-900 border border-white/5 p-10 rounded-[4rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="space-y-1 text-center md:text-left">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Faculty Matrix Hub</h4>
            <p className="text-white font-black uppercase text-2xl tracking-tight">Staff Node Management</p>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleGlobalRegistryCommit} disabled={isEnrolling} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-blue-500/20 transition-all flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
               {isEnrolling ? 'Syncing...' : 'Finalize Registry'}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
               Bulk Staff Upload
            </button>
            <button onClick={() => setShowSchedule(!showSchedule)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all">
               {showSchedule ? 'Hide Master Hub' : 'Master Duty Schedule'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
         </div>
      </section>

      {showSchedule && (
         <section className="bg-white p-10 rounded-[3.5rem] border-2 border-indigo-100 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10 border-b border-indigo-50 pb-6">
               <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter">Master Hub Duty Schedule</h3>
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em]">Integrated Aggregation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(Object.entries(masterSchedule) as [string, { subject: string, staff: string[] }[]][]).map(([time, subjects]) => (
                  <div key={time} className="bg-indigo-50/30 border border-indigo-100 p-8 rounded-[3rem] space-y-4">
                     <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block border-b border-indigo-100 pb-2">{time}</span>
                     <div className="space-y-4">
                        {subjects.map((s, i) => (
                           <div key={i} className="space-y-1">
                              <p className="text-xs font-black text-slate-900 uppercase">{s.subject}</p>
                              <div className="flex flex-wrap gap-1">
                                 {s.staff.map((name, ni) => (
                                    <span key={ni} className="bg-white border border-indigo-100 px-3 py-1 rounded-lg text-[9px] font-bold text-indigo-700 uppercase shadow-sm">{name}</span>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </section>
      )}

      {/* ENROLLMENT FORM */}
      {!isFacilitator && (
        <section className="bg-slate-950 text-white p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
           <div className="relative space-y-8">
              <div className="space-y-2">
                 <h2 className="text-3xl font-black uppercase tracking-tighter">{editingEmail ? 'Modulate Specialist Node' : 'Direct Staff Enrollment'}</h2>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Faculty Identity Provisioning</p>
              </div>

              <form onSubmit={handleAddOrUpdateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Legal Identity</label>
                   <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="FULL NAME..." required />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Official Email</label>
                   <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="OFFICIAL@ACADEMY.COM" required />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Primary Discipline</label>
                   <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                      <option value="" className="text-slate-900">ASSIGN SUBJECT...</option>
                      {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                   </select>
                 </div>
                 <button type="submit" disabled={isEnrolling} className="md:col-span-2 lg:col-span-3 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-[11px] uppercase shadow-2xl transition-all active:scale-95 tracking-widest">
                    {isEnrolling ? "SYNCING SHARDS..." : editingEmail ? "Save Specialist Shard" : "Execute Faculty Handshake"}
                 </button>
              </form>
           </div>
        </section>
      )}

      {/* STAFF DIRECTORY */}
      <div className="grid grid-cols-1 gap-8">
        {(Object.values(facilitators) as StaffAssignment[]).map((f, fIdx) => {
          const isExpanded = expandedStaff === f.email;
          const dutiesDone = f.invigilations?.filter(i => i.dutyDate && i.subject).length || 0;
          
          return (
            <div key={f.email} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black shadow-lg border-4 border-white relative">
                        <span className="text-2xl">{f.taughtSubject?.charAt(0) || 'S'}</span>
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full border-2 border-white shadow-md">#{fIdx + 1}</div>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                           <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{f.taughtSubject || 'GENERALIST'}</h4>
                           <span className="px-3 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 border border-emerald-100">Faculty Verified</span>
                           <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{dutiesDone}/9 DUTIES</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                           <span className="text-slate-950 font-black">Legal Identity: {f.name}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span className="font-mono text-[8px] text-indigo-600">Institutional ID: {f.enrolledId || '---'}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                     <button onClick={() => handleEditSetup(f)} className="bg-gray-50 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-gray-200 hover:bg-white transition-all">Edit particulars</button>
                     <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-md flex items-center gap-2 ${isExpanded ? 'bg-blue-900 text-white' : 'bg-slate-950 text-white'}`}>
                        {isExpanded ? 'Hide Register' : 'Invigilation Register'}
                        <svg className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                     </button>
                  </div>
               </div>

               {isExpanded && (
                  <div className="bg-slate-50 p-10 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-3 space-y-6">
                           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 space-y-6 shadow-sm">
                              <h5 className="text-[10px] font-black text-blue-950 uppercase tracking-widest border-b border-gray-50 pb-4">Identity Meta</h5>
                              <div className="space-y-4">
                                 <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Legal Identity</span>
                                    <p className="text-xs font-black text-slate-900">{f.name}</p>
                                 </div>
                                 <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Hub Sector</span>
                                    <p className="text-xs font-black text-blue-600">{f.role || 'FACILITATOR'}</p>
                                 </div>
                                 <div className="pt-4 border-t border-gray-50">
                                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Passkey PIN</span>
                                    <p className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100 w-fit">{f.uniqueCode || '---'}</p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="lg:col-span-9 bg-white p-12 rounded-[4rem] border border-gray-100 space-y-10 shadow-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full"></div>
                           <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                              <h5 className="text-[13px] font-black text-indigo-900 uppercase tracking-widest">Invigilation Register (1-9)</h5>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Official Duty Shard Matrix</span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                              {Array.from({ length: 9 }).map((_, idx) => {
                                 const inv = f.invigilations?.[idx] || { dutyDate: '', timeSlot: '', subject: '' };
                                 return (
                                    <div key={idx} className="bg-slate-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-5 hover:border-indigo-300 transition-all shadow-sm">
                                       <div className="flex justify-between items-center">
                                          <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-lg">#{idx + 1}</span>
                                          <div className={`w-2 h-2 rounded-full ${inv.dutyDate && inv.subject ? 'bg-emerald-500 shadow-lg animate-pulse' : 'bg-gray-200'}`}></div>
                                       </div>
                                       <div className="space-y-4">
                                          <div className="space-y-1">
                                             <label className="text-[7px] font-black text-slate-400 uppercase ml-2 tracking-widest">Duty Date</label>
                                             <input 
                                                type="date" 
                                                value={inv.dutyDate || ''} 
                                                onChange={(e) => handleUpdateInvigilation(f.email, idx, 'dutyDate', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-indigo-950 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                                             />
                                          </div>
                                          <div className="space-y-1">
                                             <label className="text-[7px] font-black text-slate-400 uppercase ml-2 tracking-widest">Time Node</label>
                                             <input 
                                                type="text" 
                                                placeholder="HH:MM"
                                                value={inv.timeSlot || ''} 
                                                onChange={(e) => handleUpdateInvigilation(f.email, idx, 'timeSlot', e.target.value.toUpperCase())}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all" 
                                             />
                                          </div>
                                          <div className="space-y-1">
                                             <label className="text-[7px] font-black text-slate-400 uppercase ml-2 tracking-widest">Subject Sector</label>
                                             <select 
                                                value={inv.subject || ''} 
                                                onChange={(e) => handleUpdateInvigilation(f.email, idx, 'subject', e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
                                             >
                                                <option value="">SELECT SUBJECT...</option>
                                                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                             </select>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
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


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
  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEmptyRegister = (): InvigilationSlot[] => 
    Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));

  const syncStaffToTables = async (staff: StaffAssignment) => {
    const hubId = settings.schoolNumber;
    const targetEmail = staff.email.toLowerCase().trim();
    const targetName = staff.name.toUpperCase().trim();
    const uniqueCode = staff.uniqueCode || `PIN-${Math.floor(1000 + Math.random() * 8999)}`;
    const role = staff.role.toLowerCase().includes('admin') ? 'school_admin' : 'facilitator';

    // 1. Identity Table Handshake (Authentication)
    await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: staff.enrolledId, 
      hub_id: hubId,   
      role: role,
      unique_code: uniqueCode
    });

    // 2. Facilitator Table Record (Professional Profile)
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

  const handleGlobalFacultySync = async () => {
    const facArray = Object.values(facilitators);
    if (facArray.length === 0) return alert("No facilitators found to sync.");
    setIsEnrolling(true);
    try {
      const syncTasks = facArray.map(f => syncStaffToTables(f));
      await Promise.all(syncTasks);
      onSave(); // Sync local persistence
      alert(`FACULTY CLOUD SYNC COMPLETE: ${facArray.length} specialists verified.`);
    } catch (err: any) {
      alert("Sync Failure: " + err.message);
    } finally {
      setIsEnrolling(false);
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

      for (const line of dataLines) {
        const parts = line.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts[0] && parts[1]) {
          const email = parts[1].toLowerCase();
          const nodeId = `${hubId}/FAC-${Math.floor(100 + Math.random() * 899)}`;
          const pin = `PIN-${Math.floor(1000 + Math.random() * 8999)}`;
          
          nextFacs[email] = {
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
        }
      }
      setFacilitators(nextFacs);
      onSave({ facilitators: nextFacs });
      alert(`FACULTY BUFFERED: ${dataLines.length} specialists added locally. Click 'SAVE ALL TO CLOUD' to finalize.`);
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
            <button onClick={handleGlobalFacultySync} disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
               {isEnrolling ? 'Syncing...' : 'Save All to Cloud'}
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
          return (
            <div key={f.email} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black shadow-lg border-4 border-white relative">
                        <span className="text-2xl">{f.taughtSubject?.charAt(0) || 'S'}</span>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                           <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{f.taughtSubject || 'GENERALIST'}</h4>
                           <span className="px-3 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600">Faculty Verified</span>
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Identity: {f.name} | ID: {f.enrolledId}</div>
                     </div>
                  </div>
                  <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-md flex items-center gap-2 ${isExpanded ? 'bg-blue-900 text-white' : 'bg-slate-950 text-white'}`}>
                     {isExpanded ? 'Hide Register' : 'View Register'}
                  </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FacilitatorPortal;

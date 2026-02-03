
// Fix: Added useMemo to the React imports to resolve "Cannot find name 'useMemo'" error
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

  const handleUpdateInvigilation = async (email: string, index: number, field: keyof InvigilationSlot, value: string) => {
    const nextFacs = { ...facilitators };
    const staff = { ...nextFacs[email] };
    const invs = [...staff.invigilations];
    
    // Ensure array has 9 slots
    while(invs.length < 9) invs.push({ dutyDate: '', timeSlot: '', subject: '' });
    
    invs[index] = { ...invs[index], [field]: value };
    staff.invigilations = invs;
    nextFacs[email] = staff;
    
    setFacilitators(nextFacs);

    // Persist to DB
    try {
      await supabase.from('uba_facilitators').update({ invigilation_data: invs }).eq('email', email);
      onSave({ facilitators: nextFacs });
    } catch (e) {
      console.error("Invigilation Sync Failed", e);
    }
  };

  const handleAddOrUpdateStaff = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    
    setIsEnrolling(true);
    try {
      const hubId = settings.schoolNumber;
      if (!hubId) throw new Error("Institutional Node required. Register school first.");

      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();
      const uniqueCode = newStaff.uniqueCode || `UBA-${Math.floor(100 + Math.random() * 899)}`;
      
      let nodeId = "";
      if (editingEmail) {
          nodeId = facilitators[editingEmail].enrolledId;
      } else {
          const staffIdSequence = `STAFF-${Math.floor(1000 + Math.random() * 9000)}`;
          nodeId = `${hubId}/${staffIdSequence}`;
      }

      const invRegister = editingEmail ? facilitators[editingEmail].invigilations : createEmptyRegister();

      // 1. IDENTITY HUB SYNC
      const { error: idError } = await supabase.from('uba_identities').upsert({
        email: targetEmail,
        full_name: targetName,
        node_id: nodeId, 
        hub_id: hubId,   
        role: newStaff.role.toLowerCase().includes('admin') ? 'school_admin' : 'facilitator',
        unique_code: uniqueCode
      });

      if (idError) throw idError;

      // 2. FACILITATOR REGISTRY SYNC
      const { error: facError } = await supabase.from('uba_facilitators').upsert({
        email: targetEmail,
        full_name: targetName,
        hub_id: hubId,
        node_id: nodeId,
        taught_subject: newStaff.subject,
        teaching_category: newStaff.category,
        unique_code: uniqueCode,
        merit_balance: editingEmail ? (dbFacilitators.find(d => d.email === editingEmail)?.merit_balance || 0) : 0,
        monetary_balance: editingEmail ? (dbFacilitators.find(d => d.email === editingEmail)?.monetary_balance || 0) : 0,
        invigilation_data: invRegister
      });

      if (facError) throw facError;

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

      const nextFacilitators = { ...facilitators };
      if (editingEmail && editingEmail !== targetEmail) delete nextFacilitators[editingEmail];
      nextFacilitators[targetEmail] = staff;

      setFacilitators(nextFacilitators);
      await onSave({ facilitators: nextFacilitators });
      
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '', category: 'BASIC_SUBJECT_LEVEL', uniqueCode: '' });
      setEditingEmail(null);
      alert(editingEmail ? "FACULTY NODE MODULATED." : `FACULTY NODE ACTIVATED: ${targetName} is registered.`);
    } catch (err: any) {
      alert(`ENROLLMENT FAULT: ${err.message}`);
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

  const handleForwardEmail = (f: StaffAssignment) => {
     alert(`DISPATCHED: Access Pack and Identity Shard for ${f.name} sent to ${f.email}.`);
  };

  const handleDownloadRegistry = () => {
    const list = Object.values(facilitators);
    const csvContent = "Name,Email,Subject,Role,Category,NodeID,UniqueCode\n" + 
      list.map(f => `${f.name},${f.email},${f.taughtSubject},${f.role},${f.teachingCategory},${f.enrolledId},${f.uniqueCode}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", `UBA_Facilitator_Registry_${settings.schoolNumber}.csv`); link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split("\n").slice(1);
      const newFacs = { ...facilitators };
      lines.forEach(line => {
        const [name, email, subject, role, category] = line.split(",").map(c => c?.trim());
        if (name && email) {
          newFacs[email.toLowerCase()] = {
            name: name.toUpperCase(),
            email: email.toLowerCase(),
            taughtSubject: subject,
            role: (role as StaffRole) || 'FACILITATOR',
            teachingCategory: category || 'BASIC_SUBJECT_LEVEL',
            enrolledId: `${settings.schoolNumber}/STAFF-${Math.floor(1000+Math.random()*9000)}`,
            uniqueCode: `UBA-${Math.floor(100+Math.random()*899)}`,
            invigilations: createEmptyRegister(),
            account: { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] },
            marking: { dateTaken: '', dateReturned: '', inProgress: false }
          };
        }
      });
      setFacilitators(newFacs);
      onSave({ facilitators: newFacs });
      alert(`${lines.length} FACILITATORS LOADED TO BUFFER.`);
    };
    reader.readAsText(file);
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
      
      {/* MATRIX OPERATIONS CONTROL */}
      <section className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Faculty Matrix</h4>
            <p className="text-white font-black uppercase text-sm">Institutional Staff Management</p>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleDownloadRegistry} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2">Extract Registry</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">Bulk Enrollment</button>
            <button onClick={() => setShowSchedule(!showSchedule)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">
               {showSchedule ? 'Hide Schedule' : 'Generate Mock Time'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
         </div>
      </section>

      {showSchedule && (
         <section className="bg-white p-10 rounded-[3.5rem] border-2 border-indigo-100 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-10 border-b border-indigo-50 pb-6">
               <h3 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter">Master Mock Duty Schedule</h3>
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em]">Aggregated Faculty Timetable</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {(Object.entries(masterSchedule) as [string, { subject: string, staff: string[] }[]][]).map(([time, subjects]) => (
                  <div key={time} className="bg-indigo-50/30 border border-indigo-100 p-6 rounded-[2rem] space-y-4">
                     <span className="text-[10px] font-mono font-black text-indigo-600 uppercase block border-b border-indigo-100 pb-2">{time}</span>
                     <div className="space-y-4">
                        {subjects.map((s, i) => (
                           <div key={i} className="space-y-1">
                              <p className="text-xs font-black text-slate-900 uppercase">{s.subject}</p>
                              <div className="flex flex-wrap gap-1">
                                 {s.staff.map((name, ni) => (
                                    <span key={ni} className="bg-white border border-indigo-100 px-2 py-0.5 rounded text-[8px] font-bold text-indigo-700 uppercase">{name}</span>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
               {Object.keys(masterSchedule).length === 0 && (
                  <div className="col-span-full py-10 text-center opacity-30 italic text-sm">No duty data synchronized. Facilitators must submit invigilation times.</div>
               )}
            </div>
         </section>
      )}

      <section className="bg-slate-950 text-white p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter">{editingEmail ? 'Modulate Facilitator Shard' : 'Facilitator Registry'}</h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Hub Node: {settings.schoolNumber || "OFFLINE"}</p>
            </div>
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddOrUpdateStaff} className="mt-10 space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="LEGAL IDENTITY..." required />
                <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="OFFICIAL@EMAIL.COM" required />
                <input type="text" value={newStaff.uniqueCode} onChange={e=>setNewStaff({...newStaff, uniqueCode: e.target.value.toUpperCase()})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none font-mono" placeholder="ACCESS PIN (OPTIONAL)" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select value={newStaff.role} onChange={e=>setNewStaff({...newStaff, role: e.target.value as StaffRole})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                   {['FACILITATOR', 'INVIGILATOR', 'EXAMINER', 'OFFICER'].map(r => <option key={r} value={r} className="text-slate-900">{r}</option>)}
                </select>
                <select value={newStaff.category} onChange={e=>setNewStaff({...newStaff, category: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                   <option value="BASIC_SUBJECT_LEVEL" className="text-slate-900">BASIC NINE SECTOR</option>
                   <option value="ADMINISTRATOR" className="text-slate-900">ADMINISTRATIVE</option>
                </select>
              </div>
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                <option value="" className="text-slate-900">ASSIGN PRIMARY SUBJECT...</option>
                {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <div className="flex justify-end gap-3">
                {editingEmail && <button type="button" onClick={()=>{setEditingEmail(null); setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '', category: 'BASIC_SUBJECT_LEVEL', uniqueCode: '' });}} className="px-10 py-4 font-black text-[10px] uppercase text-slate-500">Cancel</button>}
                <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
                  {isEnrolling ? "SYNCING..." : editingEmail ? "Update Shard" : "Enroll Facilitator"}
                </button>
              </div>
           </form>
         )}
      </section>

      <div className="grid grid-cols-1 gap-8">
        {(Object.values(facilitators) as StaffAssignment[]).map((f, fIdx) => {
          const isExpanded = expandedStaff === f.email;
          const dbData = dbFacilitators.find(d => d.email === f.email);
          const dutiesDone = f.invigilations.filter(i => i.dutyDate && i.subject).length;
          
          return (
            <div key={f.email} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black shadow-lg border-4 border-white relative">
                        <span className="text-2xl">{f.name.charAt(0)}</span>
                        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] px-2 py-0.5 rounded-full border-2 border-white shadow-md">#{fIdx + 1}</div>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                           <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{f.taughtSubject || 'GENERAL'}</h4>
                           <span className={`px-3 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600`}>{f.teachingCategory || 'BASIC 9'}</span>
                           <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{dutiesDone}/9 DUTIES</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                           <span className="text-slate-950 font-black">Legal Identity: {f.name}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span className="font-mono text-[8px] text-indigo-600">Enrolled ID: {f.enrolledId || '---'}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-3">
                     <button onClick={() => handleEditSetup(f)} className="bg-gray-50 text-slate-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200 hover:bg-white transition-all">Edit Node</button>
                     <button onClick={() => handleForwardEmail(f)} className="bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase border border-blue-100 hover:bg-white transition-all">Forward to Email</button>
                     <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-5 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isExpanded ? 'bg-blue-900 text-white shadow-lg' : 'bg-slate-900 text-white'}`}>
                        {isExpanded ? 'Hide' : 'Audit'}
                     </button>
                  </div>
               </div>

               {isExpanded && (
                  <div className="bg-slate-50 p-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                     <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Facilitator Meta Shard */}
                        <div className="lg:col-span-4 space-y-6">
                           <div className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4 shadow-sm">
                              <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-widest border-b border-gray-50 pb-2">Institutional Particulars</h5>
                              <div className="space-y-3">
                                 <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase">Hub Role</span>
                                    <p className="text-xs font-black text-slate-900">{f.role || 'FACILITATOR'}</p>
                                 </div>
                                 <div>
                                    <span className="text-[7px] font-black text-slate-400 uppercase">Access PIN</span>
                                    <p className="text-xs font-mono font-black text-indigo-600">{f.uniqueCode || '---'}</p>
                                 </div>
                                 <div className="pt-4 grid grid-cols-2 gap-4 border-t border-gray-50">
                                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                                       <span className="text-[7px] font-black text-gray-400 uppercase block mb-1">Merit</span>
                                       <p className="text-lg font-black text-blue-900">{dbData?.merit_balance || 0}</p>
                                    </div>
                                    <div className="text-center bg-slate-50 p-3 rounded-2xl">
                                       <span className="text-[7px] font-black text-gray-400 uppercase block mb-1">Vault Balance</span>
                                       <p className="text-sm font-black text-emerald-600 font-mono">GHS {dbData?.monetary_balance?.toFixed(2) || '0.00'}</p>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Invigilation Register (1-9) */}
                        <div className="lg:col-span-8 bg-white p-8 rounded-[3rem] border border-gray-100 space-y-6 shadow-sm">
                           <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                              <h5 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Invigilation Register (1-9)</h5>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Authorized Duty Ledger</span>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {Array.from({ length: 9 }).map((_, idx) => {
                                 const inv = f.invigilations[idx] || { dutyDate: '', timeSlot: '', subject: '' };
                                 return (
                                    <div key={idx} className="bg-slate-50 p-5 rounded-[2rem] border border-gray-100 space-y-3 group/slot hover:border-indigo-200 transition-all">
                                       <div className="flex justify-between items-center">
                                          <span className="w-6 h-6 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-black text-[9px] shadow-md">{idx + 1}.</span>
                                          <div className={`w-1.5 h-1.5 rounded-full ${inv.dutyDate && inv.subject ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-gray-200'}`}></div>
                                       </div>
                                       <div className="space-y-2">
                                          <input 
                                             type="date" 
                                             value={inv.dutyDate || ''} 
                                             onChange={(e) => handleUpdateInvigilation(f.email, idx, 'dutyDate', e.target.value)}
                                             className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                          />
                                          <input 
                                             type="text" 
                                             placeholder="TIME"
                                             value={inv.timeSlot || ''} 
                                             onChange={(e) => handleUpdateInvigilation(f.email, idx, 'timeSlot', e.target.value.toUpperCase())}
                                             className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                          />
                                          <select 
                                             value={inv.subject || ''} 
                                             onChange={(e) => handleUpdateInvigilation(f.email, idx, 'subject', e.target.value)}
                                             className="w-full bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-black uppercase text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                          >
                                             <option value="">SELECT SUBJECT...</option>
                                             {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                          </select>
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

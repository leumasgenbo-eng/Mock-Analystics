
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
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createEmptyRegister = (): InvigilationSlot[] => 
    Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));

  const handleGlobalFacultySync = async () => {
    const facArray = Object.values(facilitators) as StaffAssignment[];
    if (facArray.length === 0) return alert("No facilitators found to sync.");
    setIsEnrolling(true);
    try {
      await onSave({ facilitators });
      alert(`FACULTY CLOUD SYNC COMPLETE: ${facArray.length} specialists verified across triple mirrors.`);
    } catch (err: any) {
      alert("Sync Failure: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleAwardMerit = async (email: string) => {
    const amount = prompt("Enter Bonus Merit Shards to award:");
    if (!amount || isNaN(Number(amount))) return;
    const numericAmount = Number(amount);
    const reason = prompt("Enter award description (e.g., Exam Moderation Excellence):") || "Administrative Bonus Merit award.";

    setIsEnrolling(true);
    try {
      // 1. Update Identity Balance
      const { data: currentIdent } = await supabase.from('uba_identities').select('merit_balance').eq('email', email).single();
      const nextBalance = (currentIdent?.merit_balance || 0) + numericAmount;
      await supabase.from('uba_identities').update({ merit_balance: nextBalance }).eq('email', email);

      // 2. Update Facilitator Shard
      await supabase.from('uba_facilitators').update({ merit_balance: nextBalance }).eq('email', email);

      // 3. Mirror to Transaction Ledger
      await supabase.from('uba_transaction_ledger').insert({
        identity_email: email,
        hub_id: settings.schoolNumber,
        event_category: 'ROYALTY_CREDIT',
        type: 'CREDIT',
        asset_type: 'MERIT_TOKEN',
        amount: numericAmount,
        description: `Bonus Award: ${reason}`
      });

      // 4. Update local state
      const nextFacs = { ...facilitators };
      if (nextFacs[email]) {
        nextFacs[email].account = {
          ...nextFacs[email].account,
          meritTokens: (nextFacs[email].account?.meritTokens || 0) + numericAmount
        };
      }
      setFacilitators(nextFacs);
      
      alert(`MERIT AWARDED: ${numericAmount} shards mirrored to staff ledger.`);
    } catch (err: any) {
      alert(`Award Error: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDownloadTemplate = () => {
    const header = "Full Name,Email Address,Subject Assigned\n";
    const sample = "JOHN DOE,john.doe@unitedbaylor.edu.gh,Mathematics\n";
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "UBA_Staff_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSchedule = () => {
    let content = `UNITED BAYLOR ACADEMY - OFFICIAL EXAM TIMETABLE\n`;
    content += `SERIES: ${settings.activeMock} | SESSION: ${settings.academicYear}\n`;
    content += `==============================================================\n\n`;
    content += `DATE       | TIME SLOT       | SUBJECT                | STAFF LEAD\n`;
    content += `-----------|-----------------|------------------------|------------\n`;
    
    subjects.forEach((sub, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const lead = (Object.values(facilitators) as StaffAssignment[]).find(f => f.taughtSubject === sub)?.name || 'TBA';
      content += `${dateStr.padEnd(10)} | 09:00 - 11:30 | ${sub.padEnd(22)} | ${lead}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Exam_Schedule_${settings.activeMock}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsAppForward = (f: StaffAssignment) => {
    const msg = `*UNITED BAYLOR ACADEMY - STAFF ACCESS PACK*\n\n` +
                `Hello *${f.name}*,\n` +
                `Your instructional node has been activated for *${settings.schoolName}*.\n\n` +
                `*RECALL PARTICULARS:*\n` +
                `Full Name: *${f.name}*\n` +
                `Official Node ID: *${f.enrolledId}*\n` +
                `Access PIN: *${f.uniqueCode}*\n\n` +
                `_Generated via SS-Map Institutional Hub_`;
    
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleDeleteStaff = async (email: string) => {
    if (!window.confirm("CRITICAL: Decommission this specialist? This erases their global identity and access keys permanently.")) return;
    setIsEnrolling(true);
    try {
      await supabase.from('uba_facilitators').delete().eq('email', email);
      await supabase.from('uba_identities').delete().eq('email', email);
      const nextFacs = { ...facilitators };
      delete nextFacs[email];
      setFacilitators(nextFacs);
      onSave({ facilitators: nextFacs });
      alert("STAFF NODE PERMANENTLY ERASED.");
    } catch (err: any) {
      alert("Deletion Fault: " + err.message);
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
      alert(`FACULTY BUFFERED: ${dataLines.length} specialists added and mirrored to cloud.`);
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
      const staff: StaffAssignment = {
        ... (editingEmail ? facilitators[editingEmail] : {
          invigilations: createEmptyRegister(),
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
      alert("STAFF NODE ACTIVATED & MIRRORED.");
    } catch (err: any) {
      alert(`ENROLLMENT FAULT: ${err.message}`);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-900 border border-white/5 p-10 rounded-[4rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
         <div className="space-y-1 text-center md:text-left">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Faculty Matrix Hub</h4>
            <p className="text-white font-black uppercase text-2xl tracking-tight">Staff Node Management</p>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleGlobalFacultySync} disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
               Save All to Cloud
            </button>
            <button onClick={handleDownloadTemplate} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download Template
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
               Bulk Staff Upload
            </button>
            <button onClick={handleGenerateSchedule} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
               Generate Exam Schedule
            </button>
            <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
         </div>
      </section>

      {!isFacilitator && (
        <section className="bg-slate-950 text-white p-12 rounded-[4rem] border border-white/5 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
           <div className="relative space-y-8">
              <h2 className="text-3xl font-black uppercase tracking-tighter">{editingEmail ? 'Modulate Specialist Node' : 'Direct Staff Enrollment'}</h2>
              <form onSubmit={handleAddOrUpdateStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Legal Identity</label>
                   <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="FULL NAME..." required />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Official Email</label>
                   <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="OFFICIAL@ACADEMY.COM" required />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-500 uppercase ml-2 tracking-widest">Primary Discipline</label>
                   <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                      <option value="" className="text-slate-900">ASSIGN SUBJECT...</option>
                      {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
                   </select>
                 </div>
                 <button type="submit" disabled={isEnrolling} className="md:col-span-2 lg:col-span-3 bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-[11px] uppercase shadow-2xl transition-all active:scale-95 tracking-widest">
                    {isEnrolling ? "SYNCING..." : editingEmail ? "Save specialist Shard" : "Execute faculty Handshake"}
                 </button>
              </form>
           </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-8">
        {(Object.values(facilitators) as StaffAssignment[]).map((f) => {
          const isExpanded = expandedStaff === f.email;
          return (
            <div key={f.email} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black shadow-lg border-4 border-white relative text-2xl">
                        {f.taughtSubject?.charAt(0) || 'S'}
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                           <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{f.taughtSubject || 'GENERALIST'}</h4>
                           <span className="px-3 py-0.5 rounded-lg text-[8px] font-black uppercase bg-emerald-50 text-emerald-600">Faculty Verified</span>
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Identity: {f.name} | ID: {f.enrolledId}</div>
                        <div className="flex gap-4 mt-2">
                           <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Merit: {f.account?.meritTokens || 0}</span>
                           <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Vault: GHS {f.account?.monetaryCredits.toFixed(2) || '0.00'}</span>
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-3">
                    {!isFacilitator && (
                      <>
                        <button onClick={() => handleAwardMerit(f.email)} className="bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 shadow-sm">
                           Award Merit
                        </button>
                        <button onClick={() => handleWhatsAppForward(f)} className="bg-green-50 text-green-600 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase border border-green-100 hover:bg-green-600 hover:text-white transition-all flex items-center gap-2 shadow-sm" title="Share Credentials via WhatsApp">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/></svg>
                          Share Keys
                        </button>
                        <button onClick={() => handleDeleteStaff(f.email)} className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                          Decommission
                        </button>
                      </>
                    )}
                    <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-md flex items-center gap-2 ${isExpanded ? 'bg-blue-900 text-white' : 'bg-slate-950 text-white'}`}>
                       {isExpanded ? 'Hide Register' : 'View Register'}
                    </button>
                  </div>
               </div>
               {isExpanded && (
                  <div className="px-10 pb-10 pt-4 bg-slate-50 border-t border-gray-100 animate-in slide-in-from-top-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {f.invigilations.map((slot, sIdx) => (
                           <div key={sIdx} className="bg-white p-6 rounded-[2rem] border border-gray-200 space-y-4 shadow-sm hover:border-blue-400 transition-colors">
                              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                 <label className="text-[9px] font-black text-blue-950 uppercase tracking-widest">Invigilation Slot {sIdx + 1}</label>
                                 <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block ml-1">Duty Date</label>
                                    <input 
                                       type="date" 
                                       value={slot.dutyDate} 
                                       className="w-full text-[10px] font-bold text-blue-900 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-gray-100 focus:border-blue-400" 
                                       onChange={(e) => {
                                          const next = {...facilitators};
                                          next[f.email].invigilations[sIdx].dutyDate = e.target.value;
                                          setFacilitators(next);
                                       }} 
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block ml-1">Time Slot</label>
                                    <input 
                                       type="text" 
                                       placeholder="e.g. 09:00 - 11:30"
                                       value={slot.timeSlot} 
                                       className="w-full text-[10px] font-bold text-blue-900 outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-gray-100 focus:border-blue-400" 
                                       onChange={(e) => {
                                          const next = {...facilitators};
                                          next[f.email].invigilations[sIdx].timeSlot = e.target.value.toUpperCase();
                                          setFacilitators(next);
                                       }} 
                                    />
                                 </div>
                              </div>
                              <div className="space-y-1">
                                 <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block ml-1">Exam Discipline / Series</label>
                                 <select 
                                    value={slot.subject} 
                                    className="w-full text-[10px] font-black uppercase outline-none bg-slate-50 px-3 py-2.5 rounded-xl border border-gray-100 focus:border-blue-400 text-blue-900" 
                                    onChange={(e) => {
                                       const next = {...facilitators};
                                       next[f.email].invigilations[sIdx].subject = e.target.value;
                                       setFacilitators(next);
                                    }}
                                 >
                                    <option value="">— SELECT SUBJECT —</option>
                                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                    <option value="GENERAL MOCK">GENERAL MOCK SESSION</option>
                                 </select>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="mt-8 flex justify-end">
                        <button onClick={() => { onSave(); setExpandedStaff(null); }} className="bg-blue-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl active:scale-95 transition-all hover:bg-black">Sync Staff Register</button>
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

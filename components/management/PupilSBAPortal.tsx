import React, { useState, useRef } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  onSave: () => void;
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects, onSave }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    gender: 'M', 
    guardianName: '', 
    parentContact: '', 
    parentEmail: '' 
  });
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sbaEntryId, setSbaEntryId] = useState<number | null>(null);
  const [showCredsId, setShowCredsId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const enrollStudentAction = async (data: any, nextId: number) => {
    const targetEmail = data.email.toLowerCase().trim();
    const targetName = data.name.toUpperCase().trim();
    const hubId = settings.schoolNumber || "SSMAP-NODE";
    const nodeId = nextId.toString();

    // 1. IDENTITY RECALL SYNC (CLOUD MIRROR)
    const { error: idError } = await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: nodeId,
      hub_id: hubId,
      role: 'pupil'
    });

    if (idError) throw new Error(`Handshake Revoked for ${targetName}: ` + idError.message);

    // 2. AUTH TRIGGER (OPTIONAL HANDSHAKE)
    try {
      await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { role: 'pupil', hubId, nodeId, email: targetEmail, full_name: targetName, studentId: nextId },
          shouldCreateUser: true
        }
      });
    } catch (e) {
      console.warn("Auth handshake delayed for:", targetName);
    }

    return {
      id: nextId, 
      name: targetName, 
      email: targetEmail, 
      gender: (data.gender || 'M').charAt(0).toUpperCase(),
      parentName: (data.guardianName || "").toUpperCase(), 
      parentContact: data.parentContact || "",
      parentEmail: (data.parentEmail || "").toLowerCase().trim(),
      attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
    };
  };

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      if (editingId) {
        setStudents(prev => {
          const next = prev.map(s => s.id === editingId ? { 
            ...s, 
            name: formData.name.toUpperCase().trim(), 
            email: formData.email.toLowerCase().trim(),
            gender: formData.gender,
            parentName: formData.guardianName.toUpperCase(),
            parentContact: formData.parentContact,
            parentEmail: formData.parentEmail.toLowerCase().trim()
          } : s);
          return next;
        });
        alert("PUPIL IDENTITY REFACTORED.");
      } else {
        const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const student = await enrollStudentAction(formData, nextId);
        setStudents(prev => [...prev, student]);
        alert(`IDENTITY ESTABLISHED: Node ${nextId} is active.`);
      }

      setFormData({ name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
      setTimeout(onSave, 200);
    } catch (err: any) {
      alert("Enrolment Fault: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ["Name", "Email", "Gender", "GuardianName", "ParentContact", "ParentEmail"];
    const example = ["KOFI ADU", "kofi@example.com", "M", "SAMUEL ADU", "0243504091", "sam@example.com"];
    const csv = [headers, example].map(e => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pupil_Enrolment_Template.csv`;
    link.click();
  };

  const handleBulkCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) {
        alert("UPLOAD ABORTED: File contains no data rows.");
        return;
      }

      setBulkProcessing(true);
      const newEntries: StudentData[] = [];
      let successCount = 0;
      let errorCount = 0;
      let currentId = students.length > 0 ? Math.max(...students.map(s => s.id)) : 100;

      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const getCol = (row: string[], key: string) => {
        const idx = headers.indexOf(key.toLowerCase());
        return idx !== -1 ? row[idx]?.trim() : "";
      };

      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(",");
          const pupilData = {
            name: getCol(cols, "name") || getCol(cols, "full name"),
            email: getCol(cols, "email"),
            gender: getCol(cols, "gender") || "M",
            guardianName: getCol(cols, "guardianname") || getCol(cols, "parent name"),
            parentContact: getCol(cols, "parentcontact") || getCol(cols, "phone"),
            parentEmail: getCol(cols, "parentemail")
          };

          if (!pupilData.name || !pupilData.email) continue;

          currentId++;
          const enrolled = await enrollStudentAction(pupilData, currentId);
          newEntries.push(enrolled);
          successCount++;

          if (successCount % 5 === 0) await new Promise(r => setTimeout(r, 600));
        } catch (err) {
          errorCount++;
        }
      }

      if (newEntries.length > 0) {
        const finalSet = [...students, ...newEntries];
        setStudents(finalSet);

        // 1. Mirror to Cloud Identity Audit
        await supabase.from('uba_bulk_logs').insert({
          hub_id: settings.schoolNumber,
          job_type: 'PUPIL_ENROLLMENT',
          status: 'COMPLETED',
          filename: file.name,
          success_count: successCount,
          error_count: errorCount,
          actor_node: settings.registrantName || 'SYSTEM_NODE'
        });

        // 2. IMMEDIATE PERSISTENCE SHARD SYNC (Crucial for all Sheets)
        const hubId = settings.schoolNumber;
        await supabase.from('uba_persistence').upsert({ 
          id: `${hubId}_students`, 
          hub_id: hubId, 
          payload: finalSet, 
          last_updated: new Date().toISOString() 
        });

        // 3. Update Registry Data Node
        const { data: regData } = await supabase.from('uba_persistence').select('payload').eq('id', `registry_${hubId}`).maybeSingle();
        if (regData) {
           const registryArray = Array.isArray(regData.payload) ? regData.payload : [regData.payload];
           const updatedRegistry = [{ ...registryArray[0], studentCount: finalSet.length, lastActivity: new Date().toISOString() }];
           await supabase.from('uba_persistence').upsert({ id: `registry_${hubId}`, hub_id: hubId, payload: updatedRegistry });
        }

        alert(`MASS ENROLMENT SUCCESSFUL:\n- ${successCount} Identity shards created.\n- ${errorCount} Errors encountered.\n\nWorkforce registry updated and synchronized.`);
      }

      setBulkProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleForwardCredentials = async (student: StudentData) => {
    try {
      await supabase.auth.signInWithOtp({ email: student.email });
      alert(`Handshake PIN dispatched to ${student.name}.`);
    } catch (e) { alert("Dispatch error."); }
  };

  const handleCopyCredentials = (s: StudentData) => {
    const text = `SS-MAP LOGIN PACK\n------------------\nName: ${s.name}\nNodeID: ${s.id}\nHubID: ${settings.schoolNumber}\nPortal: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard.");
  };

  const handleDeletePupil = async (id: number, name: string) => {
    if (!window.confirm(`Revoke identity for ${name}?`)) return;
    const student = students.find(s => s.id === id);
    if (student) await supabase.from('uba_identities').delete().eq('email', student.email);
    const nextSet = students.filter(s => s.id !== id);
    setStudents(nextSet);
    
    // Immediate Cloud Sync on deletion
    const hubId = settings.schoolNumber;
    await supabase.from('uba_persistence').upsert({ 
      id: `${hubId}_students`, 
      hub_id: hubId, 
      payload: nextSet, 
      last_updated: new Date().toISOString() 
    });
  };

  const handleEditClick = (s: StudentData) => {
    setEditingId(s.id);
    setFormData({ name: s.name, email: s.email, gender: s.gender, guardianName: s.parentName || '', parentContact: s.parentContact || '', parentEmail: s.parentEmail || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSbaScore = (studentId: number, subject: string, score: string) => {
    const numeric = parseInt(score) || 0;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      return { ...s, mockData: { ...s.mockData, [settings.activeMock]: { ...mockSet, sbaScores: { ...mockSet.sbaScores, [subject]: numeric } } } };
    }));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      {bulkProcessing && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center space-y-8">
           <div className="w-24 h-24 border-[10px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <div className="text-center space-y-2">
             <p className="text-2xl font-black text-white uppercase tracking-[0.6em]">Forging Mass Identity</p>
             <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Synchronizing Shards with Cloud Registry...</p>
           </div>
        </div>
      )}

      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? `Modify Identity: ${editingId}` : 'Pupil Enrolment Registry'}</h3>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Official Institutional Onboarding Portal</p>
           </div>
           {!editingId && (
             <div className="flex gap-3">
                <button onClick={handleDownloadTemplate} className="bg-white border border-blue-100 text-blue-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Get Template
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Bulk CSV Upload
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleBulkCSVUpload} />
             </div>
           )}
        </div>
        
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="FULL LEGAL NAME..." required />
          <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="PUPIL EMAIL..." required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="GUARDIAN NAME..." />
          <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN PHONE..." />
          <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN EMAIL..." />

          <div className="md:col-span-2 lg:col-span-3 pt-4">
             <button type="submit" disabled={isEnrolling} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
                {isEnrolling ? "FORGING IDENTITY..." : editingId ? "Refactor Shard" : "Verify & Enroll"}
             </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6">
         {students.map(s => {
            const isSbaOpen = sbaEntryId === s.id;
            const isCredsOpen = showCredsId === s.id;
            return (
              <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                 <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6 flex-1">
                       <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">{s.name.charAt(0)}</div>
                       <div>
                          <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Node: {s.id} • {s.email}</p>
                       </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                       <button onClick={() => { setShowCredsId(isCredsOpen ? null : s.id); setSbaEntryId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isCredsOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Identity Matrix</button>
                       <button onClick={() => { setSbaEntryId(isSbaOpen ? null : s.id); setShowCredsId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isSbaOpen ? 'bg-indigo-900 text-white' : 'bg-indigo-50 text-indigo-700'}`}>SBA Ledger</button>
                       <button onClick={() => handleForwardCredentials(s)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all">Resend PIN</button>
                       <button onClick={() => handleEditClick(s)} className="bg-gray-50 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200">Modify</button>
                       <button onClick={() => handleDeletePupil(s.id, s.name)} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all">Revoke</button>
                    </div>
                 </div>

                 {isCredsOpen && (
                   <div className="bg-slate-50 p-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                      <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm flex flex-wrap gap-10 relative">
                           <button 
                             onClick={() => handleCopyCredentials(s)}
                             className="absolute top-4 right-4 bg-emerald-600 text-white p-2 rounded-xl shadow-lg hover:scale-110 active:scale-95 flex items-center gap-2 px-4"
                           >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              <span className="text-[9px] font-black uppercase">Copy Pack</span>
                           </button>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Registered Name</span>
                              <p className="text-sm font-black text-slate-800 uppercase">{s.name}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Node ID</span>
                              <p className="text-sm font-black text-blue-600 font-mono">{s.id}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Hub ID</span>
                              <p className="text-sm font-black text-slate-800 uppercase font-mono">{settings.schoolNumber}</p>
                           </div>
                      </div>
                   </div>
                 )}

                 {isSbaOpen && (
                   <div className="bg-slate-900 p-8 border-t border-white/5 animate-in slide-in-from-top-4">
                      <h5 className="text-white font-black text-sm uppercase tracking-widest mb-6">Continuous Assessment Ledger ({settings.activeMock})</h5>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {subjects.map(sub => (
                           <div key={sub} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2 truncate">{sub}</label>
                              <input type="number" value={s.mockData?.[settings.activeMock]?.sbaScores?.[sub] || 0} onChange={e => handleUpdateSbaScore(s.id, sub, e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white w-full outline-none" />
                           </div>
                         ))}
                      </div>
                      <div className="mt-8 flex justify-end">
                         <button onClick={() => { onSave(); setSbaEntryId(null); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Commit SBA</button>
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

export default PupilSBAPortal;
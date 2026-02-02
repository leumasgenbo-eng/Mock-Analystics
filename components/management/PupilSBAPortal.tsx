
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
    const hubId = settings.schoolNumber || "SMA-UBA-NODE-2025";
    const nodeId = nextId.toString();

    // 1. IDENTITY RECALL SYNC (IDENTITY HUB)
    const { error: idError } = await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: nodeId,
      hub_id: hubId,
      role: 'pupil',
      teaching_category: 'BASIC_SUBJECT_LEVEL'
    });

    if (idError) throw new Error(`Identity Node Fault for ${targetName}: ` + idError.message);

    // 2. SHARED PUPIL REGISTRY (COMPANION APP HANDSHAKE)
    // Structured data synchronization for Basic 9 Activity App
    await supabase.from('uba_pupils').upsert({
      student_id: nodeId,
      name: targetName,
      gender: data.gender === 'F' ? 'F' : 'M',
      class_name: 'BASIC 9',
      hub_id: hubId,
      is_jhs_level: true
    });

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
        setStudents(prev => prev.map(s => s.id === editingId ? { 
          ...s, 
          name: formData.name.toUpperCase().trim(), 
          email: formData.email.toLowerCase().trim(),
          gender: formData.gender,
          parentName: formData.guardianName.toUpperCase(),
          parentContact: formData.parentContact,
          parentEmail: formData.parentEmail.toLowerCase().trim()
        } : s));
        alert("PUPIL IDENTITY UPDATED.");
      } else {
        const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const student = await enrollStudentAction(formData, nextId);
        setStudents(prev => [...prev, student]);
        alert(`NODE ACTIVATED: Identity shared with Network Registry.`);
      }

      setFormData({ name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
      setTimeout(onSave, 200);
    } catch (err: any) {
      alert("Handshake Failure: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  // ... rest of the component (CSV, template, etc) ...
  const handleDownloadTemplate = () => {
    const headers = ["Name", "Email", "Gender", "GuardianName", "ParentContact", "ParentEmail"];
    const example = ["KOFI ADU", "kofi@example.com", "M", "SAMUEL ADU", "0243504091", "sam@example.com"];
    const csv = [headers, example].map(e => e.join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `Pupil_Enrolment_Template.csv`; link.click();
  };

  const handleBulkCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      if (lines.length < 2) return;
      setBulkProcessing(true);
      const newEntries: StudentData[] = [];
      let currentId = students.length > 0 ? Math.max(...students.map(s => s.id)) : 100;
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const getCol = (row: string[], key: string) => {
        const idx = headers.indexOf(key.toLowerCase());
        return idx !== -1 ? row[idx]?.trim() : "";
      };
      for (let i = 1; i < lines.length; i++) {
        try {
          const cols = lines[i].split(",");
          const pData = { name: getCol(cols, "name"), email: getCol(cols, "email"), gender: getCol(cols, "gender") || "M", guardianName: getCol(cols, "guardianname"), parentContact: getCol(cols, "parentcontact"), parentEmail: getCol(cols, "parentemail") };
          if (!pData.name || !pData.email) continue;
          currentId++;
          const enrolled = await enrollStudentAction(pData, currentId);
          newEntries.push(enrolled);
        } catch (err) {}
      }
      if (newEntries.length > 0) {
        const finalSet = [...students, ...newEntries];
        setStudents(finalSet);
        const hubId = settings.schoolNumber;
        await supabase.from('uba_persistence').upsert({ id: `${hubId}_students`, hub_id: hubId, payload: finalSet, last_updated: new Date().toISOString() });
        alert(`MASS ENROLMENT COMPLETE: ${newEntries.length} Identity shards propagated.`);
      }
      setBulkProcessing(false);
    };
    reader.readAsText(file);
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
             <p className="text-2xl font-black text-white uppercase tracking-[0.6em]">Forging Shared Identity</p>
             <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Synchronizing Shards with companion apps...</p>
           </div>
        </div>
      )}

      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative mb-10 flex flex-col md:flex-row justify-between items-start gap-6">
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? `Modify Identity: ${editingId}` : 'Pupil Enrolment Registry'}</h3>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Authorized Basic 9 Shared Handshake Portal</p>
           </div>
           {!editingId && (
             <div className="flex gap-3">
                <button onClick={handleDownloadTemplate} className="bg-white border border-blue-100 text-blue-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-sm hover:bg-blue-50 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Get Template
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
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
                {isEnrolling ? "FORGING IDENTITY..." : editingId ? "Update Shard" : "Verify & Enroll"}
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
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Node: {s.id} • JHS Shard</p>
                       </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-3">
                       <button onClick={() => { setShowCredsId(isCredsOpen ? null : s.id); setSbaEntryId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isCredsOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>Identity Matrix</button>
                       <button onClick={() => { setSbaEntryId(isSbaOpen ? null : s.id); setShowCredsId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isSbaOpen ? 'bg-indigo-900 text-white' : 'bg-indigo-50 text-indigo-700'}`}>SBA Ledger</button>
                       <button onClick={() => setEditingId(s.id)} className="bg-gray-50 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200">Modify</button>
                    </div>
                 </div>
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


import React, { useState, useRef } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  onSave: (overrides?: any) => void;
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects, onSave }) => {
  const [formData, setFormData] = useState({ 
    name: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' 
  });
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [activeSbaId, setActiveSbaId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateCompositeId = (schoolName: string, academicYear: string, sequence: number) => {
     const initials = (schoolName || "UBA").split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 3);
     const year = (academicYear || "2025").split(/[/|-]/).pop() || new Date().getFullYear().toString();
     const number = sequence.toString().padStart(3, '0');
     return `${initials}${year}${number}`;
  };

  const generateSixDigitPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const syncToRelationalTables = async (student: StudentData) => {
    const hubId = settings.schoolNumber;
    await supabase.from('uba_identities').upsert({
      email: student.parentEmail?.toLowerCase().trim() || `${student.indexNumber}@unitedbaylor.edu.gh`,
      full_name: student.name.toUpperCase().trim(),
      node_id: student.indexNumber!,
      hub_id: hubId,
      role: 'pupil',
      unique_code: student.uniqueCode 
    });

    await supabase.from('uba_pupils').upsert({
      student_id: student.indexNumber,
      name: student.name.toUpperCase().trim(),
      gender: student.gender === 'F' ? 'F' : 'M',
      class_name: settings.termInfo || 'BASIC 9',
      hub_id: hubId,
      is_jhs_level: true,
      enrollment_status: 'ACTIVE'
    });
  };

  const handleDeleteStudent = async (id: number, indexNumber?: string) => {
    if (!window.confirm(`CRITICAL: Purge candidate shard for ${indexNumber || 'this pupil'}? All assessments and global access will be revoked.`)) return;

    setIsEnrolling(true);
    try {
      if (indexNumber) {
        await supabase.from('uba_pupils').delete().eq('student_id', indexNumber);
        await supabase.from('uba_identities').delete().eq('node_id', indexNumber);
      }
      const nextStudents = students.filter(s => s.id !== id);
      setStudents(nextStudents);
      onSave({ students: nextStudents });
      alert("CANDIDATE SHARD PERMANENTLY PURGED.");
    } catch (err: any) {
      alert("Deletion Fault: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleGlobalCloudSync = async () => {
    if (students.length === 0) return alert("No pupils found to sync.");
    setIsEnrolling(true);
    try {
      const syncTasks = students.map(s => syncToRelationalTables(s));
      await Promise.all(syncTasks);
      onSave(); 
      alert(`CLOUD SYNCHRONIZATION COMPLETE: ${students.length} pupils mirrored.`);
    } catch (err: any) {
      alert("Sync Failure: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDownloadTemplate = () => {
    const header = "Full Name,Gender (M/F),Parent Name,Parent Contact,Parent Email\n";
    const sample = "KOFI ADU,M,MR. ADU,0240001111,parent@email.com\n";
    const blob = new Blob([header + sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "UBA_Pupil_Template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsEnrolling(true);
    try {
      if (editingId) {
        const student = students.find(s => s.id === editingId);
        if (!student) return;
        const updatedPupil = { 
          ...student, name: formData.name.toUpperCase(), gender: formData.gender, 
          parentName: formData.guardianName.toUpperCase(), parentContact: formData.parentContact, 
          parentEmail: formData.parentEmail.toLowerCase(), email: formData.parentEmail.toLowerCase()
        };
        const nextStudents = students.map(s => s.id === editingId ? updatedPupil : s);
        setStudents(nextStudents);
        await syncToRelationalTables(updatedPupil);
        onSave({ students: nextStudents });
        alert("CANDIDATE IDENTITY MODULATED.");
      } else {
        const nextSeq = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const studentId = generateCompositeId(settings.schoolName, settings.academicYear, nextSeq);
        const accessPin = generateSixDigitPin();
        const newPupil: StudentData = {
          id: nextSeq, indexNumber: studentId, uniqueCode: accessPin, name: formData.name.toUpperCase().trim(),
          gender: formData.gender, email: formData.parentEmail.toLowerCase().trim() || `${studentId}@ssmap.app`,
          parentName: formData.guardianName.toUpperCase().trim(), parentContact: formData.parentContact.trim(),
          parentEmail: formData.parentEmail.toLowerCase().trim(), attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
        };
        const nextStudents = [...students, newPupil];
        setStudents(nextStudents);
        await syncToRelationalTables(newPupil);
        onSave({ students: nextStudents });
        alert(`ENROLLMENT SUCCESS: ${studentId}`);
      }
      setFormData({ name: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
    } catch (err: any) { 
      alert("Matrix Fault: " + err.message); 
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
      const nextStudents = [...students];
      let startId = nextStudents.length > 0 ? Math.max(...nextStudents.map(s => s.id)) + 1 : 101;
      for (const line of dataLines) {
        const parts = line.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts[0]) {
          const studentId = generateCompositeId(settings.schoolName, settings.academicYear, startId);
          const pin = generateSixDigitPin();
          nextStudents.push({
            id: startId++, name: parts[0].toUpperCase(), gender: (parts[1] || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
            parentName: parts[2] || '', parentContact: parts[3] || '', parentEmail: parts[4] || '',
            email: parts[4] || `${studentId.toLowerCase()}@ssmap.app`, indexNumber: studentId, uniqueCode: pin,
            attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
          });
        }
      }
      setStudents(nextStudents);
      onSave({ students: nextStudents });
      alert(`BULK INGESTION SUCCESS: ${dataLines.length} candidates buffered.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const toggleSbaLedger = (id: number) => {
     setActiveSbaId(activeSbaId === id ? null : id);
  };

  const updateSbaScore = (studentId: number, subject: string, value: string) => {
    const numeric = Math.min(100, Math.max(0, parseInt(value) || 0));
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      return { ...s, sbaScores: { ...(s.sbaScores || {}), [subject]: numeric } };
    }));
  };

  const handleDownloadRegistry = () => {
    const header = "Name,Gender,Guardian,Contact,Email,NodeID,PIN\n";
    const rows = students.map(s => `"${s.name}","${s.gender}","${s.parentName || ''}","${s.parentContact || ''}","${s.parentEmail || ''}","${s.indexNumber || ''}","${s.uniqueCode || ''}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Pupil_Registry_${settings.schoolNumber}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 font-sans">
      <section className="bg-slate-950 border border-white/5 p-10 rounded-[4rem] shadow-2xl space-y-8">
         <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-1">
               <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Bulk Operation Hub</h4>
               <p className="text-white text-2xl font-black uppercase tracking-tight">Data Management Node</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
               <button onClick={handleGlobalCloudSync} disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 2v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg>
                  Save All to Cloud
               </button>
               <button onClick={handleDownloadTemplate} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download Template
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
                  Bulk Enrollment (CSV)
               </button>
               <button onClick={handleDownloadRegistry} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-indigo-100 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Registry
               </button>
               <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
            </div>
         </div>
      </section>

      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">{editingId ? 'Modulate Candidate Node' : 'Individual Enrollment'}</h3>
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase" placeholder="PUPIL FULL IDENTITY" required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase" placeholder="GUARDIAN NAME" />
          <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black" placeholder="PHONE CONTACT" />
          <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black md:col-span-2" placeholder="NOTIFICATION EMAIL" />
          <div className="lg:col-span-3 pt-4 flex gap-4">
             <button type="submit" disabled={isEnrolling} className={`flex-1 ${editingId ? 'bg-indigo-600' : 'bg-blue-900'} text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all`}>
                {isEnrolling ? "Syncing..." : editingId ? "Save Shard" : "Enroll Candidate"}
             </button>
             {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',gender:'M',guardianName:'',parentContact:'',parentEmail:''});}} className="px-10 bg-slate-100 text-slate-500 rounded-3xl font-black text-[11px] uppercase">Cancel</button>}
          </div>
        </form>
      </section>

      <div className="space-y-6">
         <div className="relative">
            <input type="text" placeholder="SEARCH CANDIDATE IDENTITY..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-100 rounded-3xl px-14 py-6 text-sm font-bold shadow-xl outline-none transition-all uppercase" />
            <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
         </div>

         <div className="grid grid-cols-1 gap-6">
            {filteredStudents.map(s => {
               const isOpen = activeSbaId === s.id;
               return (
                 <div key={s.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden group hover:border-blue-300 transition-all">
                    <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                       <div className="flex items-center gap-6 flex-1">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border-4 border-white shadow-md ${s.gender === 'F' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                             {s.name.charAt(0)}
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                             <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded tracking-widest">{s.indexNumber || 'NO_ID'}</span>
                                <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded tracking-widest">PIN: {s.uniqueCode || '----'}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={() => { setEditingId(s.id); setFormData({ name: s.name, gender: s.gender === 'F' ? 'F' : 'M', guardianName: s.parentName || '', parentContact: s.parentContact || '', parentEmail: s.parentEmail || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gray-50 text-slate-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-gray-200 hover:bg-white transition-all">Edit Identity</button>
                          <button onClick={() => toggleSbaLedger(s.id)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all shadow-md ${isOpen ? 'bg-blue-900 text-white' : 'bg-indigo-50 text-indigo-600'}`}>SBA Scores</button>
                          <button onClick={() => handleDeleteStudent(s.id, s.indexNumber)} className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">Purge Shard</button>
                       </div>
                    </div>
                    {isOpen && (
                       <div className="px-8 pb-8 pt-4 bg-slate-50 border-t border-gray-100 animate-in slide-in-from-top-2">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                             {subjects.map(sub => (
                                <div key={sub} className="space-y-1">
                                   <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest block ml-1">{sub}</label>
                                   <input 
                                     type="number" 
                                     value={s.sbaScores?.[sub] || 0} 
                                     onChange={(e) => updateSbaScore(s.id, sub, e.target.value)}
                                     className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                                   />
                                </div>
                             ))}
                          </div>
                          <div className="mt-6 flex justify-end">
                             <button onClick={() => { onSave(); toggleSbaLedger(s.id); }} className="bg-blue-900 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Sync SBA Shards</button>
                          </div>
                       </div>
                    )}
                 </div>
               );
            })}
         </div>
      </div>
    </div>
  );
};

export default PupilSBAPortal;

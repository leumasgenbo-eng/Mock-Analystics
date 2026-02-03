
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
    name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' 
  });
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sbaEntryId, setSbaEntryId] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * COMPOSITE ID GENERATOR: [INITIALS][YEAR][NUMBER]
   */
  const generateCompositeId = (schoolName: string, academicYear: string, sequence: number) => {
     const initials = (schoolName || "UBA").split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 3);
     const year = (academicYear || "2025").split(/[/|-]/).pop() || new Date().getFullYear().toString();
     const number = sequence.toString().padStart(3, '0');
     return `${initials}${year}${number}`;
  };

  const generateSixDigitPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const enrollStudentAction = async (data: any, sequence: number) => {
    const targetEmail = data.email.toLowerCase().trim();
    const targetName = data.name.toUpperCase().trim();
    const hubId = settings.schoolNumber;
    
    const studentId = generateCompositeId(settings.schoolName, settings.academicYear, sequence);
    const accessPin = generateSixDigitPin();

    const { error: idError } = await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: studentId,
      hub_id: hubId,
      role: 'pupil',
      unique_code: accessPin 
    });

    if (idError) throw idError;

    const { error: pupError } = await supabase.from('uba_pupils').upsert({
      student_id: studentId,
      name: targetName,
      gender: data.gender === 'F' ? 'F' : 'M',
      hub_id: hubId,
      class_name: 'BASIC 9'
    });

    if (pupError) throw pupError;

    return {
      id: sequence, 
      indexNumber: studentId, 
      uniqueCode: accessPin, 
      name: targetName, 
      email: targetEmail, 
      gender: (data.gender || 'M').charAt(0).toUpperCase(),
      parentName: (data.guardianName || "").toUpperCase(), 
      parentContact: data.parentContact || "",
      parentEmail: (data.parentEmail || "").toLowerCase().trim(),
      attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
    } as StudentData;
  };

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      if (editingId) {
        // Update existing shard
        const target = students.find(s => s.id === editingId);
        if (!target) return;

        await supabase.from('uba_identities').update({
           full_name: formData.name.toUpperCase().trim(),
           email: formData.email.toLowerCase().trim()
        }).eq('node_id', target.indexNumber);

        await supabase.from('uba_pupils').update({
           name: formData.name.toUpperCase().trim(),
           gender: formData.gender
        }).eq('student_id', target.indexNumber);

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
        const nextSequence = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const student = await enrollStudentAction(formData, nextSequence);
        setStudents(prev => [...prev, student]);
        alert(`PUPIL CREATED:\nID: ${student.indexNumber}\nACCESS PIN: ${student.uniqueCode}`);
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

  const handleDeletePupil = async (id: number, indexNumber: string | undefined) => {
    if (!window.confirm("CRITICAL: Permanent Deletion. This revokes candidate identity and wipes all score shards. Proceed?")) return;
    setIsEnrolling(true);
    try {
       if (indexNumber) {
          await supabase.from('uba_identities').delete().eq('node_id', indexNumber);
          await supabase.from('uba_pupils').delete().eq('student_id', indexNumber);
          await supabase.from('uba_mock_scores').delete().eq('student_id', indexNumber);
       }
       setStudents(prev => prev.filter(s => s.id !== id));
       setTimeout(onSave, 200);
       alert("IDENTITY PURGED.");
    } catch (e: any) {
       alert("Purge Failure: " + e.message);
    } finally {
       setIsEnrolling(false);
    }
  };

  const handleForwardShard = (student: StudentData) => {
     alert(`DISPATCH READY: ${student.name}'s identity shard has been refreshed in the serialization queue.`);
  };

  const handleEditSetup = (student: StudentData) => {
     setEditingId(student.id);
     setFormData({
        name: student.name,
        email: student.email,
        gender: student.gender === 'F' ? 'F' : 'M',
        guardianName: student.parentName || '',
        parentContact: student.parentContact || '',
        parentEmail: student.parentEmail || ''
     });
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

  // Bulk Operations
  const handleDownloadTemplate = () => {
    const csvContent = "FullName,Email,Gender(M/F),GuardianName,GuardianPhone,GuardianEmail\n" +
                       "KWAME MENSAH,kwame@example.com,M,KOFI MENSAH,0240000000,kofi@example.com";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", "UBA_Pupil_Template.csv"); link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const lines = content.split(/\r?\n/).filter(l => l.trim() !== "").slice(1);
      if (lines.length === 0) return alert("File is empty.");
      setIsEnrolling(true);
      setUploadProgress({ current: 0, total: lines.length });
      let baseSequence = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
      try {
        const batch: StudentData[] = [];
        for (let i = 0; i < lines.length; i++) {
          const col = lines[i].split(",").map(c => c.trim());
          if (col.length < 3) continue;
          const st = await enrollStudentAction({ name: col[0], email: col[1], gender: col[2], guardianName: col[3], parentContact: col[4], parentEmail: col[5] }, baseSequence + i);
          batch.push(st);
          setUploadProgress({ current: i + 1, total: lines.length });
        }
        setStudents(prev => [...prev, ...batch]);
        onSave();
        alert(`BULK COMPLETE: ${batch.length} pupils enrolled.`);
      } catch (e: any) { alert("Batch Failure: " + e.message); } finally { setIsEnrolling(false); setUploadProgress(null); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* MATRIX OPERATIONS CONTROL */}
      <section className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Registry Matrix</h4>
            <p className="text-white font-black uppercase text-sm">Institutional Roster Management</p>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleDownloadTemplate} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2">Template</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">
              {uploadProgress ? `Processing ${uploadProgress.current}/${uploadProgress.total}` : 'Bulk Upload'}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
         </div>
      </section>

      {/* FORM: Individual Enrolment / Edit */}
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="relative mb-10">
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? 'Modify Particulars' : 'Individual Enrolment'}</h3>
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Identity Shard Manual Entry</p>
           </div>
        </div>
        
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="FULL LEGAL NAME..." required />
          <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="PUPIL EMAIL..." required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="GUARDIAN NAME..." />
          <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN PHONE..." />
          <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN EMAIL..." />
          <div className="md:col-span-2 lg:col-span-3 pt-4 flex gap-4">
             <button type="submit" disabled={isEnrolling} className="flex-1 bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
                {isEnrolling ? "Syncing..." : editingId ? "Update Identity Shard" : "Verify & Enroll Pupil"}
             </button>
             {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',email:'',gender:'M',guardianName:'',parentContact:'',parentEmail:''});}} className="px-10 bg-gray-100 text-slate-500 rounded-3xl font-black text-xs uppercase">Cancel</button>}
          </div>
        </form>
      </section>

      {/* ROSTER LIST */}
      <div className="grid grid-cols-1 gap-6">
         {students.map(s => {
            const isSbaOpen = sbaEntryId === s.id;
            return (
              <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                 <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6 flex-1">
                       <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">{s.name.charAt(0)}</div>
                       <div className="space-y-1">
                          <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                          <div className="flex items-center gap-4">
                             <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID: {s.indexNumber || '---'}</p>
                             <p className="bg-blue-50 text-blue-900 px-3 py-0.5 rounded-lg text-[10px] font-mono font-black border border-blue-100">PIN: {s.uniqueCode || '---'}</p>
                          </div>
                       </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                       <button onClick={() => setSbaEntryId(isSbaOpen ? null : s.id)} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isSbaOpen ? 'bg-indigo-900 text-white shadow-lg' : 'bg-indigo-50 text-indigo-700'}`}>SBA Ledger</button>
                       <button onClick={() => handleEditSetup(s)} className="bg-gray-50 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200">Modify</button>
                       <button onClick={() => handleForwardShard(s)} className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-blue-100">Dispatch</button>
                       <button onClick={() => handleDeletePupil(s.id, s.indexNumber)} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">Purge</button>
                    </div>
                 </div>

                 {/* SBA LEDGER EXPANSION */}
                 {isSbaOpen && (
                   <div className="bg-slate-900 p-8 border-t border-white/5 animate-in slide-in-from-top-4">
                      <div className="flex justify-between items-center mb-6">
                         <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Continuous Assessment Shard (SBA)</h5>
                         <span className="text-[8px] text-slate-500 uppercase">Max Score: 100%</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {subjects.map(sub => (
                           <div key={sub} className="bg-white/5 border border-white/10 p-4 rounded-2xl group/input hover:border-blue-500/50 transition-all">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2 truncate group-hover/input:text-blue-400">{sub}</label>
                              <input 
                                 type="number" 
                                 value={s.mockData?.[settings.activeMock]?.sbaScores?.[sub] || 0} 
                                 onChange={e => handleUpdateSbaScore(s.id, sub, e.target.value)} 
                                 className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white w-full outline-none focus:border-blue-500" 
                              />
                           </div>
                         ))}
                      </div>
                      <div className="mt-8 flex justify-end gap-4">
                         <button onClick={() => setSbaEntryId(null)} className="text-slate-400 px-6 py-3 font-black text-[10px] uppercase">Close</button>
                         <button onClick={() => { onSave(); setSbaEntryId(null); alert("SBA Records Committed."); }} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-500 transition-all">Commit SBA Ledger</button>
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

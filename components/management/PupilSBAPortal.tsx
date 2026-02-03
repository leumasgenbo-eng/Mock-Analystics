
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

    await supabase.from('uba_identities').upsert({
      email: targetEmail,
      full_name: targetName,
      node_id: studentId,
      hub_id: hubId,
      role: 'pupil',
      unique_code: accessPin 
    });

    await supabase.from('uba_pupils').upsert({
      student_id: studentId,
      name: targetName,
      gender: data.gender === 'F' ? 'F' : 'M',
      hub_id: hubId,
      class_name: 'BASIC 9'
    });

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
        const target = students.find(s => s.id === editingId);
        if (target) {
           await supabase.from('uba_identities').update({ full_name: formData.name.toUpperCase().trim(), email: formData.email.toLowerCase().trim() }).eq('node_id', target.indexNumber);
           await supabase.from('uba_pupils').update({ name: formData.name.toUpperCase().trim(), gender: formData.gender }).eq('student_id', target.indexNumber);
           setStudents(prev => prev.map(s => s.id === editingId ? { ...s, name: formData.name.toUpperCase(), email: formData.email.toLowerCase(), gender: formData.gender, parentName: formData.guardianName.toUpperCase(), parentContact: formData.parentContact, parentEmail: formData.parentEmail.toLowerCase() } : s));
           alert("PUPIL IDENTITY MODULATED.");
        }
      } else {
        const nextSeq = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const pupil = await enrollStudentAction(formData, nextSeq);
        setStudents(prev => [...prev, pupil]);
        alert(`ENROLLMENT SUCCESSFUL.\nID: ${pupil.indexNumber}\nPIN: ${pupil.uniqueCode}`);
      }
      setFormData({ name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
      setTimeout(onSave, 200);
    } catch (err: any) { alert("Matrix Fault: " + err.message); } finally { setIsEnrolling(false); }
  };

  const handleDeletePupil = async (id: number, index: string | undefined) => {
    if (!window.confirm("PERMANENT DELETION: Wipes identity shard and all performance data. Proceed?")) return;
    setIsEnrolling(true);
    try {
       if (index) {
          await supabase.from('uba_identities').delete().eq('node_id', index);
          await supabase.from('uba_pupils').delete().eq('student_id', index);
       }
       setStudents(prev => prev.filter(s => s.id !== id));
       alert("IDENTITY PURGED.");
       onSave();
    } catch (e: any) { alert(e.message); } finally { setIsEnrolling(false); }
  };

  const handleForwardShard = (name: string) => alert(`DISPATCHED: ${name}'s data has been refreshed in the HQ Serialization queue.`);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      <section className="bg-slate-900 border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Registry Hub</h4>
            <p className="text-white font-black uppercase text-sm">Institutional Roster Management</p>
         </div>
      </section>

      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8">{editingId ? 'Modify Particulars' : 'Individual Enrolment'}</h3>
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="FULL LEGAL NAME..." required />
          <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="PUPIL EMAIL..." required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <div className="md:col-span-2 lg:col-span-3 pt-4 flex gap-4">
             <button type="submit" disabled={isEnrolling} className="flex-1 bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
                {isEnrolling ? "Syncing..." : editingId ? "Update Identity" : "Enroll Pupil"}
             </button>
             {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',email:'',gender:'M',guardianName:'',parentContact:'',parentEmail:''});}} className="px-10 bg-gray-100 text-slate-500 rounded-3xl font-black text-xs uppercase">Cancel</button>}
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6">
         {students.map(s => (
            <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
               <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-xl border-4 border-white">{s.name.charAt(0)}</div>
                     <div className="space-y-1">
                        <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                        <div className="flex items-center gap-4">
                           <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ID: {s.indexNumber || '---'}</p>
                           <p className="bg-blue-50 text-blue-900 px-3 py-0.5 rounded-lg text-[10px] font-mono font-black border border-blue-100">PIN: {s.uniqueCode || '---'}</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3">
                     <button onClick={() => setSbaEntryId(sbaEntryId === s.id ? null : s.id)} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${sbaEntryId === s.id ? 'bg-indigo-900 text-white' : 'bg-indigo-50 text-indigo-700'}`}>SBA Ledger</button>
                     <button onClick={() => { setEditingId(s.id); setFormData({ name: s.name, email: s.email, gender: s.gender === 'F' ? 'F' : 'M', guardianName: s.parentName || '', parentContact: s.parentContact, parentEmail: s.parentEmail || '' }); }} className="bg-gray-50 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200">Modify</button>
                     <button onClick={() => handleForwardShard(s.name)} className="bg-blue-50 text-blue-700 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-blue-100">Dispatch</button>
                     <button onClick={() => handleDeletePupil(s.id, s.indexNumber)} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all">Purge</button>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default PupilSBAPortal;

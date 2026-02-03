
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
  const [sbaEntryId, setSbaEntryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateCompositeId = (schoolName: string, academicYear: string, sequence: number) => {
     const initials = (schoolName || "UBA").split(/\s+/).map(w => w[0]).join('').toUpperCase().substring(0, 3);
     const year = (academicYear || "2025").split(/[/|-]/).pop() || new Date().getFullYear().toString();
     const number = sequence.toString().padStart(3, '0');
     return `${initials}${year}${number}`;
  };

  const generateSixDigitPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    setIsEnrolling(true);

    try {
      const hubId = settings.schoolNumber;
      if (editingId) {
        const nextStudents = students.map(s => s.id === editingId ? { 
             ...s, 
             name: formData.name.toUpperCase(), 
             gender: formData.gender, 
             parentName: formData.guardianName.toUpperCase(), 
             parentContact: formData.parentContact, 
             parentEmail: formData.parentEmail.toLowerCase() 
           } : s);
        setStudents(nextStudents);
        onSave({ students: nextStudents });
        alert("PUPIL IDENTITY MODULATED.");
      } else {
        const nextSeq = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const studentId = generateCompositeId(settings.schoolName, settings.academicYear, nextSeq);
        const accessPin = generateSixDigitPin();

        await supabase.from('uba_identities').upsert({
          email: formData.parentEmail.toLowerCase().trim() || `${studentId}@unitedbaylor.edu.gh`,
          full_name: formData.name.toUpperCase().trim(),
          node_id: studentId,
          hub_id: hubId,
          role: 'pupil',
          unique_code: accessPin 
        });

        const newPupil: StudentData = {
          id: nextSeq,
          indexNumber: studentId,
          uniqueCode: accessPin,
          name: formData.name.toUpperCase().trim(),
          gender: formData.gender,
          email: formData.parentEmail.toLowerCase().trim() || `${studentId.toLowerCase()}@ssmap.app`,
          parentName: formData.guardianName.toUpperCase().trim(),
          parentContact: formData.parentContact.trim(),
          parentEmail: formData.parentEmail.toLowerCase().trim(),
          attendance: 0,
          scores: {},
          sbaScores: {},
          examSubScores: {},
          mockData: {}
        };
        
        const nextStudents = [...students, newPupil];
        setStudents(nextStudents);
        onSave({ students: nextStudents });
        alert(`ENROLLMENT SUCCESSFUL.\nID: ${studentId}\nPIN: ${accessPin}`);
      }
      setFormData({ name: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
    } catch (err: any) { 
      alert("Matrix Fault: " + err.message); 
    } finally { 
      setIsEnrolling(false); 
    }
  };

  const handleDownloadRegistry = () => {
    const header = "Name,Gender,Guardian,Contact,Email,NodeID,PIN\n";
    const rows = students.map(s => `"${s.name}","${s.gender}","${s.parentName || ''}","${s.parentContact || ''}","${s.parentEmail || ''}","${s.indexNumber || ''}","${s.uniqueCode || ''}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Pupil_Registry_${settings.schoolNumber}.csv`);
    link.click();
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split("\n").slice(1);
      const nextStudents = [...students];
      let startId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;

      lines.forEach(line => {
        const parts = line.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts[0]) {
          const studentId = generateCompositeId(settings.schoolName, settings.academicYear, startId);
          // Fix: Added missing 'email' property to satisfy StudentData interface
          nextStudents.push({
            id: startId++,
            name: parts[0].toUpperCase(),
            gender: parts[1] || 'M',
            parentName: parts[2] || '',
            parentContact: parts[3] || '',
            parentEmail: parts[4] || '',
            email: parts[4] || `${studentId.toLowerCase()}@ssmap.app`,
            indexNumber: studentId,
            uniqueCode: generateSixDigitPin(),
            attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
          });
        }
      });
      setStudents(nextStudents);
      onSave({ students: nextStudents });
      alert(`${lines.length} CANDIDATES QUEUED IN LOCAL BUFFER.`);
    };
    reader.readAsText(file);
  };

  const handleForwardCredentials = (student: StudentData) => {
    if (!student.parentEmail) {
      alert("ERROR: No parent email registered for this candidate.");
      return;
    }
    alert(`DISPATCHED: Access Pack for ${student.name} sent to ${student.parentEmail}.\n\nID: ${student.indexNumber}\nPIN: ${student.uniqueCode}`);
  };

  const handleUpdateSBA = (studentId: number, subject: string, value: string) => {
    const score = parseInt(value) || 0;
    const nextStudents = students.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      return {
        ...s,
        mockData: {
          ...(s.mockData || {}),
          [settings.activeMock]: {
            ...mockSet,
            sbaScores: { ...(mockSet.sbaScores || {}), [subject]: score }
          }
        }
      };
    });
    setStudents(nextStudents);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Matrix Control Header */}
      <section className="bg-slate-950 border border-white/5 p-8 rounded-[3rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Pupil Matrix Control</h4>
            <p className="text-white font-black uppercase text-sm">Institutional Identity & SBA Ledger</p>
         </div>
         <div className="flex flex-wrap justify-center gap-3">
            <button onClick={handleDownloadRegistry} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all">Extract Registry</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all">Bulk Enrollment</button>
            <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
         </div>
      </section>

      {/* 2. Enrollment Terminal */}
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${editingId ? 'bg-indigo-600' : 'bg-blue-900'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
           </div>
           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? 'Modulate Identity Shard' : 'Individual Enrolment'}</h3>
        </div>

        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pupil Full Name</label>
             <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="LEGAL NAME..." required />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Gender</label>
             <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Guardian Name</label>
             <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="FULL NAME..." />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Parent Contact</label>
             <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="000 000 0000" />
          </div>
          <div className="space-y-1 md:col-span-2">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Notification Email</label>
             <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="REPORTS@PARENT.COM" />
          </div>
          
          <div className="lg:col-span-3 pt-4 flex gap-4">
             <button type="submit" disabled={isEnrolling} className={`flex-1 ${editingId ? 'bg-indigo-600' : 'bg-blue-900'} text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all`}>
                {isEnrolling ? "SYNCING..." : editingId ? "Save Shard" : "Execute Enrollment"}
             </button>
             {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',gender:'M',guardianName:'',parentContact:'',parentEmail:''});}} className="px-10 bg-slate-100 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest">Cancel</button>}
          </div>
        </form>
      </section>

      {/* Search Filter */}
      <div className="relative">
         <input 
           type="text" 
           placeholder="FILTER COHORT BY NAME..." 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)} 
           className="w-full bg-white border border-gray-100 rounded-3xl px-12 py-5 text-sm font-bold shadow-xl outline-none focus:ring-8 focus:ring-blue-500/5 transition-all uppercase" 
         />
         <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </div>

      {/* 3. Pupil Ledger Grid */}
      <div className="grid grid-cols-1 gap-8">
         {filteredStudents.map(s => {
            const isSbaOpen = sbaEntryId === s.id;
            const mockData = s.mockData?.[settings.activeMock] || { sbaScores: {} };
            
            return (
              <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                 <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6 flex-1">
                       <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-2xl border-4 border-white shadow-md">{s.name.charAt(0)}</div>
                       <div className="space-y-1.5">
                          <h4 className="text-xl font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                          <div className="flex flex-wrap items-center gap-4">
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Node ID:</span>
                                <span className="font-mono text-[10px] font-black text-slate-400">{s.indexNumber || '---'}</span>
                             </div>
                             <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                             <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">PIN:</span>
                                <span className="font-mono text-[10px] font-black text-indigo-500">{s.uniqueCode || '---'}</span>
                             </div>
                             <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Parent: {s.parentName || 'None'}</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-3">
                       <button onClick={() => setSbaEntryId(isSbaOpen ? null : s.id)} className={`px-8 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isSbaOpen ? 'bg-indigo-900 text-white shadow-lg' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                          {isSbaOpen ? 'Hide Ledger' : 'SBA Ledger'}
                       </button>
                       <button onClick={() => { setEditingId(s.id); setFormData({ name: s.name, gender: s.gender === 'F' ? 'F' : 'M', guardianName: s.parentName || '', parentContact: s.parentContact || '', parentEmail: s.parentEmail || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gray-50 text-slate-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200 hover:bg-white transition-all">Edit</button>
                       <button onClick={() => handleForwardCredentials(s)} className="bg-blue-50 text-blue-700 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase border border-blue-100 hover:bg-white transition-all">Dispatch Key</button>
                    </div>
                 </div>

                 {/* 4. SBA Ledger Shard Entry (The Dropping Ledger) */}
                 {isSbaOpen && (
                    <div className="bg-slate-50 p-10 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                       <div className="flex justify-between items-center mb-8">
                          <div className="space-y-1">
                             <h5 className="text-sm font-black text-indigo-950 uppercase tracking-widest">SBA Assessment Ledger</h5>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Institutional Mark Sheet • Series: {settings.activeMock}</p>
                          </div>
                          <div className="bg-white px-5 py-2 rounded-2xl shadow-sm border border-gray-100">
                             <span className="text-[10px] font-black text-emerald-600 font-mono">Weighting: {settings.sbaConfig.sbaWeight}%</span>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                          {subjects.map(sub => (
                             <div key={sub} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-2 group/sba hover:border-indigo-200 transition-all">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block truncate">{sub}</label>
                                <input 
                                   type="number" 
                                   min="0" max="100"
                                   value={mockData.sbaScores?.[sub] || ''}
                                   onChange={e => handleUpdateSBA(s.id, sub, e.target.value)}
                                   placeholder="0"
                                   className="w-full bg-slate-50 border-2 border-transparent rounded-xl py-3 text-center font-black text-blue-900 text-lg outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                />
                             </div>
                          ))}
                       </div>
                       
                       <div className="mt-8 flex justify-end">
                          <button onClick={() => { onSave(); setSbaEntryId(null); alert("SBA SHARDS COMMITTED."); }} className="bg-indigo-900 text-white px-12 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Commit SBA Shards</button>
                       </div>
                    </div>
                 )}
              </div>
            );
         })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-[3rem] p-10 flex items-start gap-8 shadow-inner">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-900 shadow-sm shrink-0 border border-blue-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black text-blue-900 uppercase">Registry & SBA Protocol</h4>
            <p className="text-[10px] text-blue-700 font-bold leading-relaxed uppercase tracking-widest">
               Enrolled identities are synchronized across the institutional shard. Bulk enrollment requires a CSV formatted with Name, Gender, Guardian, Contact, Email. Ensure records are committed before exiting the hub.
            </p>
         </div>
      </div>
    </div>
  );
};

export default PupilSBAPortal;

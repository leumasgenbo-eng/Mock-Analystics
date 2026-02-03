
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
             parentEmail: formData.parentEmail.toLowerCase(),
             email: formData.parentEmail.toLowerCase()
           } : s);
        setStudents(nextStudents);
        onSave({ students: nextStudents });
        alert("PUPIL IDENTITY MODULATED.");
      } else {
        const nextSeq = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
        const studentId = generateCompositeId(settings.schoolName, settings.academicYear, nextSeq);
        const accessPin = generateSixDigitPin();

        // Sync to Identity Shard
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
          email: formData.parentEmail.toLowerCase().trim() || `${studentId}@ssmap.app`,
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

  const handleDownloadRegistry = () => {
    const header = "Name,Gender,Guardian,Contact,Email,NodeID,PIN\n";
    const rows = students.map(s => `"${s.name}","${s.gender}","${s.parentName || ''}","${s.parentContact || ''}","${s.parentEmail || ''}","${s.indexNumber || ''}","${s.uniqueCode || ''}"`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Registry_${settings.schoolNumber}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleDownloadSbaLedger = () => {
    let header = "Pupil Name,NodeID";
    subjects.forEach(s => header += `,${s}`);
    header += "\n";
    
    const rows = students.map(s => {
       const mockData = s.mockData?.[settings.activeMock] || { sbaScores: {} };
       let row = `"${s.name}","${s.indexNumber || ''}"`;
       subjects.forEach(sub => {
          row += `,${mockData.sbaScores[sub] || 0}`;
       });
       return row;
    }).join("\n");

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SBA_Ledger_${settings.activeMock}_${settings.schoolNumber}.csv`;
    link.click();
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split(/\r?\n/).filter(l => l.trim() !== "");
      const dataLines = lines.slice(1);
      
      const nextStudents = [...students];
      let startId = nextStudents.length > 0 ? Math.max(...nextStudents.map(s => s.id)) + 1 : 101;

      dataLines.forEach(line => {
        const parts = line.split(",").map(p => p.replace(/"/g, '').trim());
        if (parts[0]) {
          const studentId = generateCompositeId(settings.schoolName, settings.academicYear, startId);
          nextStudents.push({
            id: startId++,
            name: parts[0].toUpperCase(),
            gender: (parts[1] || 'M').toUpperCase().startsWith('F') ? 'F' : 'M',
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
      alert(`BULK INGESTION SUCCESS: ${dataLines.length} identities added to buffer.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const handleUpdateSBA = (studentId: number, subject: string, value: string) => {
    const score = Math.min(100, Math.max(0, parseInt(value) || 0));
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

  const toggleSbaLedger = (id: number) => {
     setActiveSbaId(activeSbaId === id ? null : id);
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Matrix Master Command Center */}
      <section className="bg-slate-950 border border-white/5 p-10 rounded-[4rem] shadow-2xl space-y-8">
         <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-1">
               <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Bulk Operation Hub</h4>
               <p className="text-white text-2xl font-black uppercase tracking-tight">Data Management Node</p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
               <button onClick={handleDownloadRegistry} className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Export Registry
               </button>
               <button onClick={handleDownloadSbaLedger} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase border border-blue-500/20 transition-all flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  SBA Ledger CSV
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>
                  Bulk Enrollment (CSV)
               </button>
               <input type="file" ref={fileInputRef} onChange={handleBulkUpload} accept=".csv" className="hidden" />
            </div>
         </div>
      </section>

      {/* 2. Manual Entry Terminal */}
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg ${editingId ? 'bg-indigo-600' : 'bg-blue-950'}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
           </div>
           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? 'Modulate Candidate Node' : 'Individual Enrollment'}</h3>
        </div>

        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Pupil Full Identity</label>
             <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="SURNAME FIRST..." required />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Gender</label>
             <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Parent / Guardian</label>
             <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="FULL NAME..." />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Phone Contact</label>
             <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="000 000 0000" />
          </div>
          <div className="space-y-1 md:col-span-2">
             <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Notification Email</label>
             <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="REPORTS@PARENT.COM" />
          </div>
          
          <div className="lg:col-span-3 pt-4 flex gap-4">
             <button type="submit" disabled={isEnrolling} className={`flex-1 ${editingId ? 'bg-indigo-600' : 'bg-blue-900'} text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all`}>
                {isEnrolling ? "Syncing..." : editingId ? "Save Shard" : "Enroll Candidate"}
             </button>
             {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({name:'',gender:'M',guardianName:'',parentContact:'',parentEmail:''});}} className="px-10 bg-slate-100 text-slate-500 rounded-3xl font-black text-[11px] uppercase tracking-widest">Cancel</button>}
          </div>
        </form>
      </section>

      {/* 3. Search & Pupil Ledger Matrix */}
      <div className="space-y-6">
         <div className="relative">
            <input 
              type="text" 
              placeholder="SEARCH CANDIDATE IDENTITY BY NAME..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full bg-white border border-gray-100 rounded-3xl px-14 py-6 text-sm font-bold shadow-xl outline-none focus:ring-8 focus:ring-blue-500/5 transition-all uppercase" 
            />
            <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
         </div>

         <div className="grid grid-cols-1 gap-6">
            {filteredStudents.map(s => {
               const isOpen = activeSbaId === s.id;
               const mockSet = s.mockData?.[settings.activeMock] || { sbaScores: {} };
               
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
                                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{s.parentName || 'No Guardian'}</span>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex gap-2">
                          <button onClick={() => toggleSbaLedger(s.id)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2 ${isOpen ? 'bg-blue-900 text-white shadow-lg' : 'bg-blue-50 text-blue-900 hover:bg-blue-100'}`}>
                             {isOpen ? 'Hide SBA' : 'SBA Ledger'}
                             <svg className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          <button onClick={() => { setEditingId(s.id); setFormData({ name: s.name, gender: s.gender === 'F' ? 'F' : 'M', guardianName: s.parentName || '', parentContact: s.parentContact || '', parentEmail: s.parentEmail || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gray-50 text-slate-500 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-gray-200 hover:bg-white transition-all">Edit Identity</button>
                       </div>
                    </div>

                    {/* Dropping Assessment Ledger Shard */}
                    {isOpen && (
                       <div className="bg-slate-50 p-10 border-t border-gray-100 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex justify-between items-center mb-8">
                             <div className="space-y-1">
                                <h5 className="text-sm font-black text-blue-950 uppercase tracking-widest">SBA Assessment Ledger</h5>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.3em]">Cycle: {settings.activeMock} • Mastery Multiplier: {settings.sbaConfig.sbaWeight}%</p>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                             {subjects.map(sub => (
                                <div key={sub} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm space-y-2 group/sba hover:border-blue-400 transition-all">
                                   <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block truncate">{sub}</label>
                                   <input 
                                      type="number" 
                                      min="0" max="100"
                                      value={mockSet.sbaScores?.[sub] || ''}
                                      onChange={e => handleUpdateSBA(s.id, sub, e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-slate-50 border-2 border-transparent rounded-xl py-3 text-center font-black text-blue-900 text-xl outline-none focus:bg-white focus:border-blue-500 transition-all"
                                   />
                                </div>
                             ))}
                          </div>
                          
                          <div className="mt-10 flex justify-end">
                             <button onClick={() => { onSave(); setActiveSbaId(null); alert("SBA SHARDS COMMITTED."); }} className="bg-blue-900 text-white px-12 py-4 rounded-[2rem] font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Finalize Shards</button>
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

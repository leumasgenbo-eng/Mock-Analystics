
import React, { useState, useEffect, useMemo } from 'react';
import { SchoolRegistryEntry, StudentData, SerializationData, SerializedPupil } from '../../types';
import { supabase } from '../../supabaseClient';

interface SerializationHubViewProps {
  registry: SchoolRegistryEntry[];
  onLogAction: (action: string, target: string, details: string) => void;
}

const SerializationHubView: React.FC<SerializationHubViewProps> = ({ registry, onLogAction }) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [examiner, setExaminer] = useState('');
  const [chiefExaminer, setChiefExaminer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSerialization, setActiveSerialization] = useState<SerializationData | null>(null);

  const selectedSchool = registry.find(r => r.id === selectedSchoolId);

  const fetchSerialization = async (schoolId: string, mock: string) => {
    const { data } = await supabase
      .from('uba_persistence')
      .select('payload')
      .eq('id', `serialization_${schoolId}_${mock.replace(/\s+/g, '')}`)
      .maybeSingle();
    
    if (data && data.payload) {
      setActiveSerialization(data.payload as SerializationData);
      setExaminer(data.payload.examinerName);
      setChiefExaminer(data.payload.chiefExaminerName);
      setStartDate(data.payload.startDate);
    } else {
      setActiveSerialization(null);
    }
  };

  useEffect(() => {
    if (selectedSchoolId && selectedMock) {
      fetchSerialization(selectedSchoolId, selectedMock);
    }
  }, [selectedSchoolId, selectedMock]);

  const handleExecuteSerialization = async () => {
    if (!selectedSchoolId) return alert("Select an institution first.");
    if (!examiner || !chiefExaminer || !startDate) return alert("Complete all identity fields.");

    setIsProcessing(true);
    try {
      // 1. Fetch Students for the selected school
      const { data: studentData, error: fetchError } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `${selectedSchoolId}_students`)
        .maybeSingle();

      if (fetchError || !studentData) throw new Error("Could not pull network candidates.");

      const rawStudents = studentData.payload as StudentData[];
      const serials: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

      // 2. Map and Scramble Serials
      const serializedPupils: SerializedPupil[] = rawStudents.map((s, i) => {
        const serial = serials[i % 4];
        const mockShort = selectedMock.split(' ')[1];
        return {
          id: s.id,
          name: s.name,
          serial,
          questionCode: `${selectedSchoolId}/M${mockShort}/${serial}/${s.id}`
        };
      });

      const payload: SerializationData = {
        schoolId: selectedSchoolId,
        schoolName: selectedSchool?.name || "Unknown",
        mockSeries: selectedMock,
        startDate,
        examinerName: examiner.toUpperCase(),
        chiefExaminerName: chiefExaminer.toUpperCase(),
        pupils: serializedPupils,
        timestamp: new Date().toISOString()
      };

      // 3. Persist to Cloud
      const { error: saveError } = await supabase.from('uba_persistence').upsert({
        id: `serialization_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}`,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      if (saveError) throw saveError;

      setActiveSerialization(payload);
      onLogAction("EXAM_SERIALIZATION", selectedSchoolId, `Generated A/B/C/D scrambling for ${selectedMock}.`);
      alert("SERIALIZATION COMPLETE: Question codes synchronized for cohort.");
    } catch (err: any) {
      alert(`Serialization Fault: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const distribution = useMemo(() => {
    if (!activeSerialization) return { A: 0, B: 0, C: 0, D: 0 };
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    activeSerialization.pupils.forEach(p => counts[p.serial]++);
    return counts;
  }, [activeSerialization]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10">
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]"></div>
             Serialization Hub
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Multi-Variant Exam Distribution Controller</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 flex-1">
         
         {/* Configuration Side */}
         <div className="xl:col-span-1 space-y-8">
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-[3rem] shadow-2xl space-y-6">
               <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest border-b border-slate-800 pb-4">Exam Parameters</h3>
               
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Institution</label>
                     <select 
                       value={selectedSchoolId} 
                       onChange={(e) => setSelectedSchoolId(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                     >
                        <option value="">SELECT HUB...</option>
                        {registry.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
                     </select>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Mock Series</label>
                     <select 
                       value={selectedMock} 
                       onChange={(e) => setSelectedMock(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                     >
                        {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>

                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Scheme (Start Date)</label>
                     <input 
                       type="date" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                     />
                  </div>
               </div>

               <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest border-b border-slate-800 pb-4">Examiner Identification</h3>
                  <div className="space-y-4">
                     <input 
                       type="text" 
                       placeholder="EXAMINER IDENTITY..." 
                       value={examiner}
                       onChange={(e) => setExaminer(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none placeholder:text-slate-700"
                     />
                     <input 
                       type="text" 
                       placeholder="CHIEF EXAMINER IDENTITY..." 
                       value={chiefExaminer}
                       onChange={(e) => setChiefExaminer(e.target.value)}
                       className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none placeholder:text-slate-700"
                     />
                  </div>
               </div>

               <button 
                 onClick={handleExecuteSerialization}
                 disabled={isProcessing || !selectedSchoolId}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 disabled:opacity-30"
               >
                 {isProcessing ? "Processing Matrix..." : "Execute Serialization"}
               </button>
            </div>

            {activeSerialization && (
               <div className="bg-slate-950 border border-slate-800 p-8 rounded-[3rem] space-y-6">
                  <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest">Variant Distribution</h3>
                  <div className="grid grid-cols-2 gap-4">
                     {Object.entries(distribution).map(([key, count]) => (
                        <div key={key} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                           <span className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">{key}</span>
                           <span className="text-xl font-black text-white font-mono">{count}</span>
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>

         {/* Candidate Matrix Side */}
         <div className="xl:col-span-2 space-y-8">
            {activeSerialization ? (
               <div className="bg-slate-950 border border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl animate-in slide-in-from-right-4 duration-500">
                  <div className="p-8 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                     <div className="space-y-1">
                        <h4 className="text-xl font-black text-white uppercase">{activeSerialization.schoolName} Scrambling Matrix</h4>
                        <p className="text-[9px] font-mono text-slate-500 uppercase">Synchronized: {new Date(activeSerialization.timestamp).toLocaleString()}</p>
                     </div>
                     <div className="bg-blue-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg">
                        Total: {activeSerialization.pupils.length} Candidates
                     </div>
                  </div>
                  <div className="overflow-y-auto max-h-[600px] no-scrollbar">
                     <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black sticky top-0 z-10 border-b border-slate-800">
                           <tr>
                              <th className="px-8 py-5">Serial</th>
                              <th className="px-8 py-5">Candidate Name</th>
                              <th className="px-8 py-5">Question Code</th>
                              <th className="px-8 py-5 text-right">Index ID</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                           {activeSerialization.pupils.map((p, i) => (
                              <tr key={p.id} className="hover:bg-slate-800/30 transition-colors group">
                                 <td className="px-8 py-5">
                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                                       p.serial === 'A' ? 'bg-blue-600 text-white' : 
                                       p.serial === 'B' ? 'bg-indigo-600 text-white' : 
                                       p.serial === 'C' ? 'bg-purple-600 text-white' : 
                                       'bg-slate-700 text-white'
                                    }`}>
                                       {p.serial}
                                    </span>
                                 </td>
                                 <td className="px-8 py-5">
                                    <span className="text-xs font-black text-slate-200 uppercase group-hover:text-blue-400 transition-colors">{p.name}</span>
                                 </td>
                                 <td className="px-8 py-5">
                                    <code className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/5 px-3 py-1 rounded-lg border border-blue-500/10">
                                       {p.questionCode}
                                    </code>
                                 </td>
                                 <td className="px-8 py-5 text-right font-mono text-[10px] text-slate-500">
                                    #{p.id}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20 py-40 bg-slate-950 border border-slate-800 border-dashed rounded-[4rem]">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/><path d="M14 13l2 2 4-4"/></svg>
                  <p className="text-white font-black uppercase text-sm tracking-[0.5em]">Select Institutional Node to Scramble</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SerializationHubView;

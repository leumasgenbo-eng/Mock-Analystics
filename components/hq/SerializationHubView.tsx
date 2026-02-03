
import React, { useState, useEffect, useMemo } from 'react';
import { SchoolRegistryEntry, StudentData, SerializationData, SerializedPupil, ForwardingData, SerializedExam } from '../../types';
import { supabase } from '../../supabaseClient';

interface SerializationHubViewProps {
  registry: SchoolRegistryEntry[];
  onLogAction: (action: string, target: string, details: string) => void;
}

const SerializationHubView: React.FC<SerializationHubViewProps> = ({ registry, onLogAction }) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [forwardRequests, setForwardRequests] = useState<ForwardingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeSerialization, setActiveSerialization] = useState<SerializationData | null>(null);

  const fetchForwardRequests = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('uba_persistence').select('payload').like('id', 'forward_%');
    if (data) setForwardRequests(data.map(d => d.payload as ForwardingData));
    setIsLoading(false);
  };

  useEffect(() => { fetchForwardRequests(); }, []);

  const selectedRequest = useMemo(() => forwardRequests.find(r => r.schoolId === selectedSchoolId), [forwardRequests, selectedSchoolId]);
  const selectedSchool = registry.find(r => r.id === selectedSchoolId);

  const handleExecuteSerialization = async () => {
    if (!selectedSchoolId || !selectedRequest) return alert("Select a school request first.");
    setIsProcessing(true);
    try {
      // 1. Generate Index Numbers
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const schoolCode = selectedSchoolId.slice(-3).toUpperCase();
      
      // 2. Fetch Questions to link to packs
      const mockKey = selectedMock.replace(/\s+/g, '');
      const { data: examData } = await supabase.from('uba_persistence').select('payload')
        .like('id', `serialized_exam_${selectedSchoolId}_${mockKey}_%`).limit(1);

      const serializedPupils: SerializedPupil[] = Object.keys(selectedRequest.pupilPayments).map((pIdStr, i) => {
        const pId = parseInt(pIdStr);
        const serials: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
        const serial = serials[i % 4];
        return {
          id: pId,
          name: "CANDIDATE NODE", // Real name would come from student shard
          serial,
          questionCode: `${selectedSchoolId}/M${selectedMock.split(' ')[1]}/${serial}/${pId}`,
          indexNumber: `${schoolCode}${yearSuffix}${pId.toString().padStart(4, '0')}`
        };
      });

      const payload: SerializationData = {
        schoolId: selectedSchoolId,
        schoolName: selectedSchool?.name || "Unknown",
        mockSeries: selectedMock,
        startDate: new Date().toLocaleDateString(),
        examinerName: "NETWORK REGISTRY",
        chiefExaminerName: "HQ CONTROLLER",
        pupils: serializedPupils,
        timestamp: new Date().toISOString()
      };

      // 3. Persist Serialization Shard
      await supabase.from('uba_persistence').upsert({
        id: `serialization_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}`,
        hub_id: selectedSchoolId,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      // 4. Update Forwarding Status to SERIALIZED
      await supabase.from('uba_persistence').upsert({
        id: `forward_${selectedSchoolId}`,
        hub_id: selectedSchoolId,
        payload: { ...selectedRequest, approvalStatus: 'SERIALIZED' },
        last_updated: new Date().toISOString()
      });

      setActiveSerialization(payload);
      onLogAction("EXAM_SERIALIZATION", selectedSchoolId, `Serialized ${serializedPupils.length} candidates with Index Codes.`);
      alert("SERIALIZATION & ENDORSEMENT SUCCESSFUL.");
    } catch (err: any) {
      alert(`Serialization Fault: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintStudentList = () => {
    if (!activeSerialization) return;
    window.print();
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 bg-slate-950 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]"></div>
             Serialization & Endorsement Hub
          </h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Official Exam Clearance & Identity Generation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1">
         
         {/* Incoming Requests Panel */}
         <div className="xl:col-span-4 space-y-6 flex flex-col">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[3rem] shadow-xl space-y-6 flex-1 overflow-hidden flex flex-col">
               <div className="flex justify-between items-center border-b border-slate-800 pb-4">
                  <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest">Incoming Forwarding Shards</h3>
                  <button onClick={fetchForwardRequests} className="text-[9px] font-black text-slate-500 hover:text-white uppercase">Refresh</button>
               </div>
               
               <div className="flex-1 overflow-y-auto no-scrollbar space-y-3">
                  {forwardRequests.map(r => (
                    <button key={r.schoolId} onClick={() => setSelectedSchoolId(r.schoolId)} className={`w-full p-6 rounded-[2rem] border text-left transition-all ${selectedSchoolId === r.schoolId ? 'bg-blue-600 border-blue-400 shadow-xl' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}>
                       <p className="text-sm font-black text-white uppercase">{r.schoolName}</p>
                       <div className="flex justify-between items-center mt-3">
                          <span className="text-[8px] font-mono text-white/40">{r.schoolId}</span>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded uppercase ${r.approvalStatus === 'SERIALIZED' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                             {r.approvalStatus}
                          </span>
                       </div>
                    </button>
                  ))}
               </div>
            </div>
         </div>

         {/* Processing Terminal */}
         <div className="xl:col-span-8 space-y-8 flex flex-col">
            {selectedRequest ? (
               <div className="bg-slate-900 border border-slate-800 rounded-[3.5rem] p-10 shadow-2xl space-y-10 flex-1 flex flex-col animate-in slide-in-from-right-4">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-8">
                     <div className="space-y-1">
                        <h4 className="text-2xl font-black text-white uppercase">{selectedRequest.schoolName} Request</h4>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Forwarded: {new Date(selectedRequest.submissionTimestamp).toLocaleString()}</p>
                     </div>
                     <div className="flex gap-4">
                        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-center">
                           <span className="text-[7px] font-black text-slate-500 uppercase block mb-1">Bulk Pymt Ref</span>
                           <p className="text-xs font-mono font-black text-emerald-400">{selectedRequest.bulkPayment?.transactionId || 'INDIVIDUAL'}</p>
                        </div>
                        <button 
                          onClick={handleExecuteSerialization}
                          disabled={isProcessing || selectedRequest.approvalStatus === 'SERIALIZED'}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-5 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 disabled:opacity-30"
                        >
                           {isProcessing ? 'Serializing...' : 'Execute Serialization & Endorse'}
                        </button>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar print:overflow-visible">
                     {activeSerialization ? (
                       <div className="space-y-10">
                          <div className="flex justify-between items-center no-print">
                             <h5 className="text-sm font-black text-emerald-400 uppercase tracking-[0.2em]">Endorsement Matrix Synchronized</h5>
                             <button onClick={handlePrintStudentList} className="bg-white/5 border border-white/10 text-white px-6 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-white/10 transition-all flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                                Print Official List
                             </button>
                          </div>
                          
                          <table className="w-full text-left border-collapse bg-slate-950 rounded-[2rem] overflow-hidden shadow-inner">
                             <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black border-b border-slate-800">
                                <tr>
                                   <th className="px-8 py-5">Index Number</th>
                                   <th className="px-8 py-5">Candidate Identity</th>
                                   <th className="px-8 py-5 text-center">Variant</th>
                                   <th className="px-8 py-5 text-right">Question Code</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-900">
                                {activeSerialization.pupils.map(p => (
                                   <tr key={p.id} className="hover:bg-indigo-600/10 transition-all">
                                      <td className="px-8 py-5 font-mono font-black text-indigo-400 text-xs">{p.indexNumber}</td>
                                      <td className="px-8 py-5 font-black text-white text-[11px] uppercase">{p.name}</td>
                                      <td className="px-8 py-5 text-center">
                                         <span className="w-7 h-7 rounded bg-white/5 flex items-center justify-center font-black text-[10px] mx-auto">{p.serial}</span>
                                      </td>
                                      <td className="px-8 py-5 text-right font-mono text-[9px] text-slate-500">{p.questionCode}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                     ) : (
                       <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-6">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          <p className="text-white font-black uppercase text-sm tracking-[0.4em]">Audit Request Details Above to Execute Serialization</p>
                       </div>
                     )}
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-20 bg-slate-900 border border-slate-800 border-dashed rounded-[4rem]">
                  <p className="text-white font-black uppercase text-sm tracking-[0.5em]">Select Incoming Request Shard</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default SerializationHubView;

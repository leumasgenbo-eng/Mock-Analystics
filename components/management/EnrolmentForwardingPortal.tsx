
import React, { useState, useEffect } from 'react';
import { GlobalSettings, StudentData, StaffAssignment, ForwardingData, PaymentParticulars } from '../../types';
import { supabase } from '../../supabaseClient';

interface EnrolmentForwardingPortalProps {
  settings: GlobalSettings;
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
}

const GH_LANGS = ["TWI (AKUAPEM)", "TWI (ASANTE)", "FANTE", "GA", "EWE", "DANGME", "NZEMA", "KASEM", "GONJA"];

const EnrolmentForwardingPortal: React.FC<EnrolmentForwardingPortalProps> = ({ settings, students, setStudents, facilitators, isFacilitator, activeFacilitator }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [forwardingData, setForwardingData] = useState<ForwardingData | null>(null);
  const [bulkPayment, setBulkPayment] = useState<Partial<PaymentParticulars>>({
    transactionId: '', amount: 0, date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `forward_${settings.schoolNumber}`).maybeSingle();
      if (data?.payload) setForwardingData(data.payload as ForwardingData);
    };
    fetchData();
  }, [settings.schoolNumber]);

  const updatePupilLanguage = (id: number, lang: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ghanaianLanguage: lang } : s));
  };

  const togglePupilPayment = (id: number) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, paymentStatus: s.paymentStatus === 'PAID' ? 'UNPAID' : 'PAID' } : s));
  };

  const handleRecommendStaff = (email: string, role: 'EXAMINER' | 'INVIGILATOR') => {
    const nextFwd = forwardingData || {
      schoolId: settings.schoolNumber, schoolName: settings.schoolName, feedback: '',
      pupilLanguages: {}, pupilPayments: {}, facilitatorRecommendations: {},
      submissionTimestamp: new Date().toISOString(), approvalStatus: 'PENDING'
    };
    
    const recs = { ...nextFwd.facilitatorRecommendations };
    if (recs[email] === role) delete recs[email];
    else recs[email] = role;
    
    setForwardingData({ ...nextFwd, facilitatorRecommendations: recs });
  };

  const handlePushToHQ = async () => {
    setIsSyncing(true);
    try {
      const languages: Record<number, string> = {};
      const payments: Record<number, boolean> = {};
      students.forEach(s => {
        if (s.ghanaianLanguage) languages[s.id] = s.ghanaianLanguage;
        payments[s.id] = s.paymentStatus === 'PAID';
      });

      const payload: ForwardingData = {
        schoolId: settings.schoolNumber,
        schoolName: settings.schoolName,
        feedback: forwardingData?.feedback || '',
        pupilLanguages: languages,
        pupilPayments: payments,
        bulkPayment: bulkPayment.transactionId ? bulkPayment as PaymentParticulars : undefined,
        facilitatorRecommendations: forwardingData?.facilitatorRecommendations || {},
        submissionTimestamp: new Date().toISOString(),
        approvalStatus: 'PENDING'
      };

      await supabase.from('uba_persistence').upsert({
        id: `forward_${settings.schoolNumber}`,
        hub_id: settings.schoolNumber,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      alert("DATA DISPATCHED: Handshaking with SuperAdmin for Serialization.");
    } catch (err: any) {
      alert(`Dispatch Fault: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Header: Status Node */}
      <header className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2 text-center md:text-left">
               <h2 className="text-3xl font-black uppercase tracking-tighter">Serialization Gate</h2>
               <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em]">Official Institutional Forwarding Node</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                  <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Clearance Status</span>
                  <span className={`text-xs font-black uppercase ${forwardingData?.approvalStatus === 'SERIALIZED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {forwardingData?.approvalStatus || 'NOT DISPATCHED'}
                  </span>
               </div>
               <button onClick={handlePushToHQ} disabled={isSyncing} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95">
                 {isSyncing ? 'Syncing...' : 'Dispatch to HQ'}
               </button>
            </div>
         </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* 2. Pupil Partitioning: Language & Payment */}
         <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[3.5rem] shadow-xl overflow-hidden flex flex-col">
            <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Candidate Roster & Partitioning</h3>
               <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">{students.length} Nodes</span>
            </div>
            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest">
                     <tr>
                        <th className="px-8 py-5">Identity Shard</th>
                        <th className="px-6 py-5">Ghanaian Language Selection</th>
                        <th className="px-6 py-5 text-center">Clearance</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {students.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-5 font-black uppercase text-slate-800 text-xs truncate max-w-[180px]">{s.name}</td>
                           <td className="px-6 py-5">
                              <select 
                                value={s.ghanaianLanguage || ''} 
                                onChange={e => updatePupilLanguage(s.id, e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/10"
                              >
                                 <option value="">SELECT LANGUAGE...</option>
                                 {GH_LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                           </td>
                           <td className="px-6 py-5 text-center">
                              <button 
                                onClick={() => togglePupilPayment(s.id)}
                                className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center mx-auto ${s.paymentStatus === 'PAID' ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'border-gray-100 hover:border-blue-400 text-transparent'}`}
                              >
                                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>

         {/* 3. Side Panel: Bulk & Faculty */}
         <div className="lg:col-span-4 space-y-8">
            {/* Bulk Payment Block */}
            <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl space-y-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-blue-400">Institutional Bulk Clearance</h3>
               <div className="space-y-4">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-1">TX Ref / ID</label>
                     <input type="text" value={bulkPayment.transactionId} onChange={e=>setBulkPayment({...bulkPayment, transactionId: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs font-mono font-black text-blue-300 outline-none" placeholder="REF-XXXXXXXX" />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Aggregate Amount (GHS)</label>
                     <input type="number" value={bulkPayment.amount} onChange={e=>setBulkPayment({...bulkPayment, amount: parseFloat(e.target.value)||0})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-lg font-black text-white outline-none" placeholder="0.00" />
                  </div>
               </div>
            </div>

            {/* Facilitator Recommendations */}
            <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-xl space-y-6">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 border-b border-gray-100 pb-4">Faculty Contract Recommendations</h3>
               <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                  {Object.values(facilitators).map(f => {
                    const rec = forwardingData?.facilitatorRecommendations[f.email];
                    return (
                      <div key={f.email} className="bg-slate-50 p-5 rounded-3xl border border-gray-100 space-y-4 group">
                         <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                               <p className="text-[11px] font-black uppercase text-slate-900">{f.name}</p>
                               <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">{f.taughtSubject}</p>
                            </div>
                            {rec && <div className="bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">REC</div>}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={()=>handleRecommendStaff(f.email, 'EXAMINER')} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${rec === 'EXAMINER' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-400'}`}>Examiner</button>
                            <button onClick={()=>handleRecommendStaff(f.email, 'INVIGILATOR')} className={`flex-1 py-2 rounded-xl text-[8px] font-black uppercase transition-all ${rec === 'INVIGILATOR' ? 'bg-indigo-900 text-white shadow-lg' : 'bg-white border border-gray-200 text-slate-400'}`}>Invigilator</button>
                         </div>
                      </div>
                    );
                  })}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default EnrolmentForwardingPortal;

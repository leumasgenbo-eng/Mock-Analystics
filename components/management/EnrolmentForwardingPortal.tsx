
import React, { useState, useEffect } from 'react';
import { GlobalSettings, StudentData, StaffAssignment, ForwardingData, PaymentParticulars } from '../../types';
import { supabase } from '../../supabaseClient';

interface EnrolmentForwardingPortalProps {
  settings: GlobalSettings;
  students: StudentData[];
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const EnrolmentForwardingPortal: React.FC<EnrolmentForwardingPortalProps> = ({ settings, students, facilitators, isFacilitator, activeFacilitator }) => {
  const [feedback, setFeedback] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [forwardingData, setForwardingData] = useState<ForwardingData | null>(null);
  
  // Bulk States
  const [bulkPupilPayment, setBulkPupilPayment] = useState({ paidBy: '', sentBy: '', transactionId: '', amount: 0 });
  const [bulkStaffPayment, setBulkStaffPayment] = useState({ paidBy: '', sentBy: '', transactionId: '', amount: 0 });

  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `forward_${settings.schoolNumber}`)
        .maybeSingle();
      if (data && data.payload) {
        setForwardingData(data.payload as ForwardingData);
        setFeedback(data.payload.feedback || '');
      }
    };
    fetchExisting();
  }, [settings.schoolNumber]);

  const handleForwardToHQ = async () => {
    setIsSyncing(true);
    try {
      const payload: ForwardingData = forwardingData || {
        schoolId: settings.schoolNumber,
        schoolName: settings.schoolName,
        feedback: feedback,
        pupilPayments: {},
        facilitatorPayments: {},
        submissionTimestamp: new Date().toISOString(),
        approvalStatus: 'PENDING'
      };

      payload.feedback = feedback;
      payload.submissionTimestamp = new Date().toISOString();
      payload.schoolName = settings.schoolName;

      const { error } = await supabase.from('uba_persistence').upsert({
        id: `forward_${settings.schoolNumber}`,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      if (error) throw error;
      setForwardingData(payload);
      alert("HQ HANDSHAKE SUCCESSFUL: Details synchronised with SuperAdmin terminal.");
    } catch (err: any) {
      alert(`Forwarding Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateStaffPayment = (key: string, field: string, value: any) => {
    const next = { ...forwardingData?.facilitatorPayments } || {};
    if (!next[key]) next[key] = { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
    
    if (field === 'paid') next[key].paid = value;
    else next[key].particulars = { ...next[key].particulars, [field]: value };

    setForwardingData(prev => prev ? { ...prev, facilitatorPayments: next } : null);
  };

  const applyBulkStaff = () => {
    const next = { ...forwardingData?.facilitatorPayments } || {};
    const facKeys = Object.keys(facilitators);
    facKeys.forEach(k => {
      if (!next[k]) next[k] = { paid: true, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
      next[k].paid = true;
      next[k].particulars.paidBy = bulkStaffPayment.paidBy.toUpperCase();
      next[k].particulars.sentBy = bulkStaffPayment.sentBy.toUpperCase();
      next[k].particulars.transactionId = bulkStaffPayment.transactionId.toUpperCase();
      next[k].particulars.amount = bulkStaffPayment.amount / (facKeys.length || 1);
      next[k].particulars.isBulk = true;
      next[k].particulars.date = new Date().toLocaleDateString();
    });
    setForwardingData(prev => prev ? { ...prev, facilitatorPayments: next } : null);
  };

  const visibleStaff = (Object.values(facilitators) as StaffAssignment[]).filter(f => {
    if (!isFacilitator) return true;
    return f.name.toUpperCase() === activeFacilitator?.name.toUpperCase();
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      {/* 1. Feedback Channel to SuperAdmin - Admin Only */}
      {!isFacilitator && (
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative space-y-6">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Institutional Feedback Hub</h3>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Direct stream to SuperAdmin Marketing Desk</p>
                </div>
             </div>
             <textarea 
               value={feedback}
               onChange={(e) => setFeedback(e.target.value)}
               placeholder="Communicate service feedback, technical issues, or exam schedules to the SuperAdmin..."
               className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none focus:ring-8 focus:ring-orange-500/5 min-h-[160px] shadow-inner"
             />
             <div className="flex justify-between items-center px-4">
                <span className="text-[9px] font-black text-slate-400 uppercase italic">Verification will be mirrored in SuperAdmin terminal</span>
                <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50 tracking-widest">
                  {isSyncing ? 'Synchronizing Shards...' : 'Broadcast Feedback'}
                </button>
             </div>
          </div>
        </section>
      )}

      {/* 2. Pupil Enrolment Ledger - Admin Only */}
      {!isFacilitator && (
        <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-blue-900 px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
             <div className="space-y-1">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Pupil Enrolment Ledger</h3>
                <div className="flex items-center gap-3">
                   <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest bg-blue-800 px-3 py-1 rounded-full">Census Load: {students.length} Candidates</span>
                   <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg border ${forwardingData?.approvalStatus === 'APPROVED' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-amber-500 border-amber-400 text-white animate-pulse'}`}>
                     HQ Status: {forwardingData?.approvalStatus || 'PENDING'}
                   </span>
                </div>
             </div>
          </div>
          <div className="p-10 text-center opacity-40">
             <p className="font-black uppercase text-[10px] tracking-[0.5em]">Enrollment Financial particulars restricted to master terminal</p>
          </div>
        </section>
      )}

      {/* 3. Facilitator Payroll Verification */}
      <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
         <div className="bg-slate-900 px-10 py-8 flex justify-between items-center">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                 {isFacilitator ? 'My Payroll Verification' : 'Facilitator Payroll Ledger'}
               </h3>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                 {isFacilitator ? 'Individual revenue disbursement confirmation node' : 'Enrolment revenue disbursement confirmation'}
               </p>
            </div>
            {isFacilitator && (
               <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg active:scale-95">Sync My Status</button>
            )}
         </div>
         
         {!isFacilitator && (
           <div className="p-10 bg-slate-50/50 border-b border-gray-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bulk Facilitator Payment Data</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                 <input type="text" placeholder="Paid By..." value={bulkStaffPayment.paidBy} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, paidBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none uppercase" />
                 <input type="text" placeholder="Sent By..." value={bulkStaffPayment.sentBy} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, sentBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none uppercase" />
                 <input type="text" placeholder="Trans ID..." value={bulkStaffPayment.transactionId} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, transactionId: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-mono font-bold outline-none uppercase" />
                 <input type="number" placeholder="Total GHS..." value={bulkStaffPayment.amount} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, amount: Number(e.target.value)})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-black outline-none" />
                 <button onClick={applyBulkStaff} className="bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all">Apply to Staff</button>
              </div>
           </div>
         )}

         <div className="p-10">
            <div className={`grid grid-cols-1 ${isFacilitator ? 'md:grid-cols-1 max-w-2xl mx-auto' : 'md:grid-cols-2'} gap-6`}>
               {visibleStaff.map(f => {
                  const p = forwardingData?.facilitatorPayments[f.enrolledId] || { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
                  return (
                     <div key={f.enrolledId} className="flex items-center gap-6 p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-lg transition-all group">
                        {!isFacilitator && (
                          <input 
                             type="checkbox" 
                             checked={p.paid} 
                             onChange={e=>updateStaffPayment(f.enrolledId, 'paid', e.target.checked)} 
                             className="w-8 h-8 rounded-xl text-slate-900 focus:ring-slate-500" 
                          />
                        )}
                        <div className="flex-1 space-y-1">
                           <p className="text-sm font-black uppercase text-slate-800">{f.name}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{f.taughtSubject || f.role}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${p.particulars.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {p.particulars.isVerified ? 'VERIFIED' : 'AWAITING HQ'}
                           </span>
                           <div className="text-right">
                              <span className="text-[9px] font-black text-slate-300 uppercase block">TX REF</span>
                              <span className="text-[10px] font-mono font-black text-blue-600">{p.particulars.transactionId || 'NOT_SYNCED'}</span>
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </section>
    </div>
  );
};

export default EnrolmentForwardingPortal;


import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, StudentData, StaffAssignment, ForwardingData, PaymentParticulars, StaffRewardTrade } from '../../types';
import { supabase } from '../../supabaseClient';

interface EnrolmentForwardingPortalProps {
  settings: GlobalSettings;
  students: StudentData[];
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
}

const EnrolmentForwardingPortal: React.FC<EnrolmentForwardingPortalProps> = ({ settings, students, facilitators, isFacilitator, activeFacilitator }) => {
  const [feedback, setFeedback] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [forwardingData, setForwardingData] = useState<ForwardingData | null>(null);
  const [rewardHistory, setRewardHistory] = useState<StaffRewardTrade[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch regular forwarding data
      const { data: fwd } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `forward_${settings.schoolNumber}`)
        .maybeSingle();
      if (fwd && fwd.payload) {
        setForwardingData(fwd.payload as ForwardingData);
        setFeedback(fwd.payload.feedback || '');
      }

      // 2. Fetch Reward Status
      const { data: rewards } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', 'global_staff_rewards')
        .maybeSingle();
      if (rewards?.payload && activeFacilitator) {
         setRewardHistory((rewards.payload as StaffRewardTrade[]).filter(r => r.staffName === activeFacilitator.name));
      }
    };
    fetchData();
  }, [settings.schoolNumber, activeFacilitator]);

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
      await supabase.from('uba_persistence').upsert({
        id: `forward_${settings.schoolNumber}`,
        payload: payload,
        last_updated: new Date().toISOString()
      });
      alert("HQ HANDSHAKE SUCCESSFUL.");
    } catch (err: any) {
      alert(`Sync Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const visibleStaff = (Object.values(facilitators) as StaffAssignment[]).filter(f => {
    if (!isFacilitator) return true;
    return f.name.toUpperCase() === activeFacilitator?.name.toUpperCase();
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      {/* 1. Facilitator Reward Status - Focus for this update */}
      {isFacilitator && rewardHistory.length > 0 && (
        <section className="bg-emerald-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="relative space-y-6">
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                 <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Instructional Reward Ledger</h3>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Verified Credit Shards from HQ Valuation</p>
                 </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {rewardHistory.map((tr) => (
                    <div key={tr.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl flex justify-between items-center group/item hover:bg-white/10 transition-all">
                       <div className="space-y-1">
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block">Shard Pack #{tr.id.slice(-4)}</span>
                          <p className="text-[11px] font-bold uppercase">{tr.subject} — {tr.submissionCount} Items</p>
                       </div>
                       <div className="text-right">
                          <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase ${tr.status === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-emerald-400'}`}>
                             {tr.status === 'PAID' ? 'DISBURSED' : tr.status === 'APPROVED' ? `GHS ${tr.approvedAmount}` : tr.status}
                          </span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </section>
      )}

      {/* Standard Forwarding UI */}
      {!isFacilitator && (
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
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
             <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Communicate service feedback..." className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none focus:ring-8 focus:ring-orange-500/5 min-h-[160px] shadow-inner" />
             <div className="flex justify-end px-4">
                <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50">
                  {isSyncing ? 'Syncing...' : 'Broadcast Feedback'}
                </button>
             </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
         <div className="bg-slate-900 px-10 py-8 flex justify-between items-center">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-white uppercase tracking-tight">Facilitator Payroll Ledger</h3>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enrolment revenue disbursement confirmation</p>
            </div>
         </div>
         <div className="p-10">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6`}>
               {visibleStaff.map(f => {
                  const p = forwardingData?.facilitatorPayments[f.enrolledId] || { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
                  return (
                     <div key={f.enrolledId} className="flex items-center gap-6 p-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm hover:shadow-lg transition-all group">
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

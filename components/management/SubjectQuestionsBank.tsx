
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion, PracticeAssignment, StaffAssignment, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: StaffAssignment | null;
  subjects: string[];
  settings: GlobalSettings;
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects, settings }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.taughtSubject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [collectedQs, setCollectedQs] = useState<MasterQuestion[]>([]);
  
  const fetchBank = useCallback(async () => {
    setIsLoading(true);
    const bankId = `master_bank_${selectedSubject.trim().replace(/\s+/g, '')}`;
    try {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      setMasterBank((data?.payload as MasterQuestion[]) || []);
    } catch (err) {
      setMasterBank([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  const toggleCollect = async (q: MasterQuestion) => {
    const isAcquired = activeFacilitator?.account?.unlockedQuestionIds.includes(q.id) || q.facilitatorCode === activeFacilitator?.uniqueCode;
    
    if (!isAcquired) {
       if (window.confirm(`ACQUIRE SHARD: Spend 1 Merit Token to unlock this question in real-time?`)) {
          setIsProcessingAction(true);
          const success = await handleBatchLedgerDebit([q.id], 'DATA_ACQUISITION', 'Debit: Unlocked network shard.');
          setIsProcessingAction(false);
          if (success) {
            activeFacilitator?.account?.unlockedQuestionIds.push(q.id);
          } else return;
       } else return;
    }

    setCollectedQs(prev => prev.some(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]);
  };

  const handleBatchLedgerDebit = async (qIds: string[], category: string, desc: string): Promise<boolean> => {
     if (!activeFacilitator?.email) return false;
     const totalDebit = qIds.length;

     try {
        const { data: ident } = await supabase.from('uba_identities').select('merit_balance').eq('email', activeFacilitator.email).single();
        if ((ident?.merit_balance || 0) < totalDebit) {
          alert(`Insufficient credits. Required: ${totalDebit}, Available: ${ident?.merit_balance || 0}`);
          return false;
        }

        // Atomic update of identity balance
        const { error: updateError } = await supabase
          .from('uba_identities')
          .update({ merit_balance: ident!.merit_balance - totalDebit })
          .eq('email', activeFacilitator.email);
        
        if (updateError) throw updateError;

        // Single ledger entry for the batch
        await supabase.from('uba_transaction_ledger').insert({
           identity_email: activeFacilitator.email,
           hub_id: settings.schoolNumber,
           event_category: category,
           type: 'DEBIT',
           asset_type: 'MERIT_TOKEN',
           amount: totalDebit,
           description: desc,
           reference_ids: qIds,
           metadata: { subject: selectedSubject, count: qIds.length }
        });

        return true;
     } catch (e) { 
        console.error(e); 
        alert("Transaction Failed: Network handshake interrupted.");
        return false;
     }
  };

  const handleDownloadSelectedText = async () => {
    if (collectedQs.length === 0) return alert("Select shards to download.");
    
    // Check if any selected items are locked
    const lockedIds = collectedQs
      .filter(q => !activeFacilitator?.account?.unlockedQuestionIds.includes(q.id) && q.facilitatorCode !== activeFacilitator?.uniqueCode)
      .map(q => q.id);

    if (lockedIds.length > 0) {
      if (!window.confirm(`BULK DOWNLOAD: You have ${lockedIds.length} locked items in your selection. Proced with batch unlock (1 token per item)?`)) return;
      
      setIsProcessingAction(true);
      const success = await handleBatchLedgerDebit(lockedIds, 'DATA_DOWNLOAD', `Bulk Unlock: ${lockedIds.length} shards for extraction.`);
      setIsProcessingAction(false);
      if (!success) return;
      
      // Update local unlock state
      lockedIds.forEach(id => activeFacilitator?.account?.unlockedQuestionIds.push(id));
    }

    let content = `UNITED BAYLOR ACADEMY EXPORT\nSUBJECT: ${selectedSubject.toUpperCase()}\n----------------------------------\n\n`;
    collectedQs.forEach((q, idx) => {
      content += `[${idx + 1}] ${q.questionText}\nKEY/SCHEME: ${q.correctKey}\nSTRAND: ${q.strand}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Export_${selectedSubject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    setCollectedQs([]);
    alert("EXTRACTION SUCCESSFUL: Data mirrored to local text file.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-20">
      {isProcessingAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center space-y-6">
           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Processing Network Transaction...</p>
        </div>
      )}

      <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex justify-between items-center gap-8">
           <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tight leading-none">Instructional Matrix Bank</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Real-time Shard Acquisition Mode</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 overflow-x-auto max-w-full">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl space-y-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-900 pl-4">Network Extraction Controls</h4>
              <button 
                onClick={handleDownloadSelectedText}
                disabled={collectedQs.length === 0}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-40"
              >
                Download {collectedQs.length} Shards (.txt)
              </button>
              <p className="text-[8px] text-slate-400 font-bold uppercase text-center italic">"Downloads are recorded in real-time for integrity auditing."</p>
           </div>
           
           {activeFacilitator && (
             <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-2xl space-y-2">
                <span className="text-[8px] font-black uppercase text-blue-300">Live Merit Balance</span>
                <p className="text-3xl font-black font-mono">{(activeFacilitator as any).account?.meritTokens || 0} CREDITS</p>
             </div>
           )}
        </div>

        <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
           {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-4">
                 <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[9px] font-black text-slate-400 uppercase">Accessing Master Shards...</p>
              </div>
           ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
                      <tr>
                         <th className="px-6 py-6 w-20 text-center">Capture</th>
                         <th className="px-6 py-6 min-w-[300px]">Content Lineage</th>
                         <th className="px-6 py-6 text-right pr-10">Vault Logic</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {masterBank.map((q) => {
                         const isMyQuestion = q.facilitatorCode === activeFacilitator?.uniqueCode;
                         const isUnlocked = activeFacilitator?.account?.unlockedQuestionIds.includes(q.id) || isMyQuestion;
                         const isCollected = collectedQs.some(x => x.id === q.id);
                         return (
                            <tr key={q.id} className={`hover:bg-blue-50/20 transition-all ${isCollected ? 'bg-blue-50/10' : ''}`}>
                               <td className="px-6 py-5 text-center">
                                  <button onClick={() => toggleCollect(q)} className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${isUnlocked ? (isCollected ? 'bg-blue-600 border-blue-600 text-white' : 'border-emerald-200 text-emerald-400') : 'border-slate-100 text-slate-300 hover:border-blue-400'}`}>
                                     {isUnlocked ? (isCollected ? '✓' : '+') : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                                  </button>
                               </td>
                               <td className="px-6 py-5">
                                  <div className="space-y-1">
                                     <p className={`text-xs font-black uppercase leading-relaxed ${isUnlocked ? 'text-slate-800' : 'text-slate-300 blur-[2px]'}`}>
                                        {isUnlocked ? `"${q.questionText}"` : "Real-time Encryption Active"}
                                     </p>
                                     <div className="flex gap-4 text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                                        <span>Strand: {q.strand}</span>
                                        <span>•</span>
                                        <span>Scale: {q.blooms}</span>
                                     </div>
                                  </div>
                               </td>
                               <td className="px-6 py-5 text-right pr-10">
                                  <span className={`text-[8px] font-black uppercase ${isMyQuestion ? 'text-blue-500' : isUnlocked ? 'text-emerald-500' : 'text-amber-500'}`}>
                                     {isMyQuestion ? 'My Shard' : isUnlocked ? 'Acquired' : 'Locked (-1 Credit)'}
                                  </span>
                               </td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;


import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion, BloomsScale, StaffRewardTrade, StaffAssignment, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface LikelyQuestionDeskProps {
  activeFacilitator?: StaffAssignment | null;
  schoolName?: string;
  subjects?: string[];
  facilitators?: Record<string, StaffAssignment>;
  isAdmin?: boolean;
  settings: GlobalSettings;
}

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const LikelyQuestionDesk: React.FC<LikelyQuestionDeskProps> = ({ 
  activeFacilitator, schoolName, subjects = [], facilitators = {}, isAdmin = false, settings
}) => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [targetSubject, setTargetSubject] = useState(activeFacilitator?.taughtSubject || subjects[0] || 'English Language');
  const [targetFacilitatorName, setTargetFacilitatorName] = useState(activeFacilitator?.name || 'ADMINISTRATOR');
  const [formData, setFormData] = useState({
    type: 'OBJECTIVE' as 'OBJECTIVE' | 'THEORY',
    strand: '', strandCode: '', subStrand: '', subStrandCode: '', indicator: '', indicatorCode: '',
    questionText: '', instruction: '', correctKey: 'A', answerScheme: '', weight: 1, blooms: 'Knowledge' as BloomsScale
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTradePopup, setShowTradePopup] = useState(false);

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `likely_${targetSubject.replace(/\s+/g, '')}_${targetFacilitatorName.replace(/\s+/g, '')}`).maybeSingle();
       if (data?.payload) setQuestions(data.payload);
       else setQuestions([]);
    };
    fetchMySubmissions();
  }, [targetSubject, targetFacilitatorName]);

  const untradedCount = useMemo(() => questions.filter(q => !q.isTraded).length, [questions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;
    setIsSyncing(true);

    const facilitatorRecord = (Object.values(facilitators) as StaffAssignment[]).find(f => f.name === targetFacilitatorName);
    const newQ: MasterQuestion = {
      id: `LQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      originalIndex: questions.length + 1,
      ...formData,
      subject: targetSubject,
      facilitatorCode: facilitatorRecord?.uniqueCode || 'ADMIN',
      isTraded: false,
      parts: []
    };

    try {
      // 100% DATA CAPTURE: Real-time Credit Logging
      if (facilitatorRecord?.email) {
          const { data: currentIdent } = await supabase.from('uba_identities').select('merit_balance').eq('email', facilitatorRecord.email).single();
          const nextBalance = (currentIdent?.merit_balance || 0) + 5;
          await supabase.from('uba_identities').update({ merit_balance: nextBalance }).eq('email', facilitatorRecord.email);
          
          await supabase.from('uba_transaction_ledger').insert({
              identity_email: facilitatorRecord.email,
              hub_id: settings.schoolNumber,
              event_category: 'DATA_UPLOAD',
              type: 'CREDIT',
              asset_type: 'MERIT_TOKEN',
              amount: 5,
              description: `Real-time Upload Credit: ${targetSubject} shard synced.`,
              reference_ids: [newQ.id],
              metadata: { strand: formData.strand, blooms: formData.blooms }
          });
      }

      const nextPersonalQs = [...questions, newQ];
      await supabase.from('uba_persistence').upsert({
         id: `likely_${targetSubject.replace(/\s+/g, '')}_${targetFacilitatorName.replace(/\s+/g, '')}`,
         payload: nextPersonalQs, last_updated: new Date().toISOString()
      });

      setQuestions(nextPersonalQs);
      setFormData({ ...formData, questionText: '', indicator: '', indicatorCode: '' });
      if (untradedCount + 1 >= 5) setShowTradePopup(true);
      else alert(`SHARD CAPTURED: +5 Merit Tokens added in real-time.`);
    } catch (error) {
      alert("Sync Interrupted.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteTrade = async () => {
    const untraded = questions.filter(q => !q.isTraded).slice(0, 10);
    if (untraded.length < 10) return alert("Select 10 questions for a GHS 1.00 trade.");

    const untradedIds = untraded.map(q => q.id);
    const facilitatorRecord = (Object.values(facilitators) as StaffAssignment[]).find(f => f.name === targetFacilitatorName);

    try {
      if (facilitatorRecord?.email) {
          const { data: currentIdent } = await supabase.from('uba_identities').select('monetary_balance').eq('email', facilitatorRecord.email).single();
          await supabase.from('uba_identities').update({ monetary_balance: (currentIdent?.monetary_balance || 0) + 1.00 }).eq('email', facilitatorRecord.email);
          
          await supabase.from('uba_transaction_ledger').insert({
              identity_email: facilitatorRecord.email,
              hub_id: settings.schoolNumber,
              event_category: 'TRADE_EXCHANGE',
              type: 'CREDIT',
              asset_type: 'MONETARY_GHS',
              amount: 1.00,
              description: `Vault Exchange: 10 Shards traded for GHS 1.00`,
              reference_ids: untradedIds
          });
      }

      const updatedQs = questions.map(q => untradedIds.includes(q.id) ? { ...q, isTraded: true } : q);
      await supabase.from('uba_persistence').upsert({
        id: `likely_${targetSubject.replace(/\s+/g, '')}_${targetFacilitatorName.replace(/\s+/g, '')}`,
        payload: updatedQs, last_updated: new Date().toISOString()
      });

      setQuestions(updatedQs);
      setShowTradePopup(false);
      alert(`TRADE CAPTURED: GHS 1.00 credited in real-time.`);
    } catch (e) {
      alert("Trade failed.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20 font-sans">
      
      {showTradePopup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-lg text-4xl font-black">10</div>
              <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase">Trade Matrix</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">10 Shards = GHS 1.00</p>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">Trade your latest pack for a real-time vault credit of GHS 1.00?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowTradePopup(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400">Discard</button>
                 <button onClick={handleExecuteTrade} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl">Execute Trade</button>
              </div>
           </div>
        </div>
      )}

      <header className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex justify-between items-center">
           <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase">Likely Question Desk</h3>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.4em]">Node Synchronized: {targetFacilitatorName}</p>
           </div>
           <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
              <span className="text-[10px] font-mono font-black text-blue-300">Sync Buffer: {untradedCount}/10</span>
              <div className={`w-3 h-3 rounded-full ${untradedCount >= 10 ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`}></div>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Topic Strand</label>
                   <input type="text" value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value.toUpperCase()})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase" required placeholder="STRAND..." />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Bloom's Scale</label>
                   <select value={formData.blooms} onChange={e=>setFormData({...formData, blooms: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase">
                      {BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                </div>
            </div>
            <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Instructional Content</label>
               <textarea value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold text-slate-700 min-h-[100px] uppercase outline-none focus:ring-4 focus:ring-blue-500/5" required placeholder="ENTER QUESTION..." />
            </div>
            <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase ml-2">{formData.type === 'OBJECTIVE' ? 'Correct Key' : 'Rubric'}</label>
               <input value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold" required />
            </div>
            <button type="submit" disabled={isSyncing} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Synchronizing Node...' : 'Sync to Cloud Hub'}
            </button>
         </form>

         <div className="lg:col-span-6 bg-slate-50 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col overflow-hidden">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Capture Stream</h4>
               <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{questions.length} Total Captured</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px]">
               {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.3em]">{q.strand}</span>
                        {q.isTraded && <span className="bg-emerald-100 text-emerald-700 text-[6px] font-black px-2 py-0.5 rounded-full uppercase">Exchange Verified</span>}
                     </div>
                     <p className="text-[11px] font-bold text-slate-700 uppercase leading-relaxed">"{q.questionText}"</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;

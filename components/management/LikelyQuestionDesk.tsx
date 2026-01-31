
import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion, BloomsScale, StaffRewardTrade } from '../../types';
import { supabase } from '../../supabaseClient';

interface LikelyQuestionDeskProps {
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
  schoolName?: string;
}

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const LikelyQuestionDesk: React.FC<LikelyQuestionDeskProps> = ({ activeFacilitator, schoolName }) => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [formData, setFormData] = useState({
    type: 'OBJECTIVE' as 'OBJECTIVE' | 'THEORY',
    strand: '',
    subStrand: '',
    indicator: '',
    questionText: '',
    instruction: '',
    correctKey: 'A',
    answerScheme: '',
    weight: 1,
    blooms: 'Knowledge' as BloomsScale,
    diagramUrl: ''
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTradePopup, setShowTradePopup] = useState(false);

  const subject = activeFacilitator?.subject || 'General';

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const sanitizedSubject = subject.trim().replace(/\s+/g, '');
       const sanitizedName = activeFacilitator?.name.trim().replace(/\s+/g, '') || 'Unknown';
       const { data } = await supabase
         .from('uba_persistence')
         .select('payload')
         .eq('id', `likely_${sanitizedSubject}_${sanitizedName}`)
         .maybeSingle();
       if (data?.payload) setQuestions(data.payload);
    };
    if (activeFacilitator) fetchMySubmissions();
  }, [subject, activeFacilitator]);

  const untradedCount = useMemo(() => questions.filter(q => !q.isTraded).length, [questions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    setIsSyncing(true);
    const sanitizedSubject = subject.trim().replace(/\s+/g, '');
    const sanitizedName = activeFacilitator?.name.trim().replace(/\s+/g, '') || 'Unknown';
    const hubId = activeFacilitator?.email ? sanitizedName : 'HUB_NODE';

    const newQ: MasterQuestion = {
      id: `LQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      originalIndex: questions.length + 1,
      ...formData,
      isTraded: false,
      parts: formData.type === 'THEORY' ? [
        { partLabel: 'a.i', text: '', possibleAnswers: '', markingScheme: '', weight: 2, blooms: 'Knowledge' }
      ] : []
    };

    try {
      // 1. Save to Personal Shard
      const nextPersonalQs = [...questions, newQ];
      await supabase.from('uba_persistence').upsert({
         id: `likely_${sanitizedSubject}_${sanitizedName}`,
         hub_id: hubId,
         payload: nextPersonalQs,
         last_updated: new Date().toISOString()
      });

      // 2. ATOMIC MERGE WITH MASTER BANK (HQ HUB Sync)
      const bankId = `master_bank_${sanitizedSubject}`;
      const { data: currentMaster } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', bankId)
        .maybeSingle();
      
      const masterPool = Array.isArray(currentMaster?.payload) ? currentMaster.payload : [];
      
      if (!masterPool.some((q: MasterQuestion) => q.id === newQ.id)) {
        await supabase.from('uba_persistence').upsert({
           id: bankId,
           hub_id: 'HQ-HUB',
           payload: [...masterPool, newQ],
           last_updated: new Date().toISOString()
        });
      }

      setQuestions(nextPersonalQs);
      setFormData({
        type: formData.type, strand: formData.strand, subStrand: formData.subStrand, indicator: '', questionText: '', instruction: '', correctKey: 'A', answerScheme: '', weight: formData.type === 'OBJECTIVE' ? 1 : 10, blooms: 'Knowledge', diagramUrl: ''
      });

      if (untradedCount + 1 >= 5) setShowTradePopup(true);
      else alert("Shard mirrored to HQ Master Bank.");
    } catch (error) {
      console.error("Cloud Sync Error:", error);
      alert("Handshake Interrupted. Retrying internal cache...");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!activeFacilitator) return;
    const untraded = questions.filter(q => !q.isTraded).slice(0, 5);
    const untradedIds = untraded.map(q => q.id);
    const sanitizedSubject = subject.trim().replace(/\s+/g, '');
    const sanitizedName = activeFacilitator.name.trim().replace(/\s+/g, '');
    
    const tradeRequest: StaffRewardTrade = {
      id: `TR-${Date.now()}`,
      staffName: activeFacilitator.name,
      staffEmail: activeFacilitator.email || 'N/A',
      schoolName: schoolName || 'UNITED BAYLOR ACADEMY',
      subject: subject,
      questionIds: untradedIds,
      submissionCount: 5,
      status: 'PENDING',
      requestTimestamp: new Date().toISOString()
    };

    try {
      const updatedQs = questions.map(q => untradedIds.includes(q.id) ? { ...q, isTraded: true } : q);
      await supabase.from('uba_persistence').upsert({
        id: `likely_${sanitizedSubject}_${sanitizedName}`,
        hub_id: sanitizedName,
        payload: updatedQs,
        last_updated: new Date().toISOString()
      });

      const { data: currentTrades } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_staff_rewards').maybeSingle();
      const nextTrades = [...(currentTrades?.payload || []), tradeRequest];
      
      await supabase.from('uba_persistence').upsert({
        id: 'global_staff_rewards',
        hub_id: 'HQ-HUB',
        payload: nextTrades,
        last_updated: new Date().toISOString()
      });

      setQuestions(updatedQs);
      setShowTradePopup(false);
      alert("TRADE EXECUTED: Reward shard submitted for valuation.");
    } catch (e) {
      alert("Trade process failed.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      {showTradePopup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-lg text-4xl font-black">5</div>
              <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Milestone Reached</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Credit Eligibility Verified</p>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">You have contributed 5 instructional shards. Trade this pack now for HQ valuation?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowTradePopup(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                 <button onClick={handleExecuteTrade} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Initiate Trade</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex justify-between items-center">
           <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight">Likely Question Desk</h3>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.4em]">Mirroring to Master Bank • {subject}</p>
           </div>
           <div className="bg-white/10 px-6 py-4 rounded-[2rem] border border-white/10 flex items-center gap-6">
              <div className="text-right">
                 <span className="text-[8px] font-black text-blue-300 uppercase block mb-1">Untraded Shards</span>
                 <p className="text-xl font-black font-mono">{untradedCount} / 5</p>
              </div>
              <div className="w-px h-8 bg-white/10"></div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${untradedCount >= 5 ? 'bg-emerald-500 animate-pulse' : 'bg-white/10 text-white/20'}`}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shard Entry Matrix</h4>
              <div className="flex gap-2">
                 <button type="button" onClick={() => setFormData({...formData, type: 'OBJECTIVE', weight: 1})} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${formData.type === 'OBJECTIVE' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>Objective</button>
                 <button type="button" onClick={() => setFormData({...formData, type: 'THEORY', weight: 10})} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${formData.type === 'THEORY' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>Theory</button>
              </div>
            </div>

            <div className="space-y-4">
               <input type="text" placeholder="CURRICULUM STRAND..." value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" required />
               <input type="text" placeholder="SUB-STRAND..." value={formData.subStrand} onChange={e=>setFormData({...formData, subStrand: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" required />
               <input type="text" placeholder="INDICATOR CODE..." value={formData.indicator} onChange={e=>setFormData({...formData, indicator: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" required />
               <textarea placeholder="QUESTION CONTENT..." value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[120px] uppercase" required />
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Correct Key</label>
                     <select value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none" disabled={formData.type === 'THEORY'}>
                        <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                     </select>
                  </div>
                  <div className="space-y-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Bloom's</label>
                     <select value={formData.blooms} onChange={e=>setFormData({...formData, blooms: e.target.value as BloomsScale})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none">
                        {BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <button type="submit" disabled={isSyncing} className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Synchronizing Node...' : 'Submit to Master Hub'}
            </button>
         </form>

         <div className="lg:col-span-7 bg-slate-50 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col overflow-hidden">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">My Submission Shards</h4>
               <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{questions.length} Total</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[700px] no-scrollbar">
               {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 relative group">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{q.strand} → {q.indicator}</span>
                           <div className="flex items-center gap-2">
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type}</span>
                             {q.isTraded && <span className="bg-emerald-100 text-emerald-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified Credit</span>}
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-200">#{questions.length - i}</span>
                     </div>
                     <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">"{q.questionText}"</p>
                  </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;

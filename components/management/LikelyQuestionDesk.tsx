
import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion, BloomsScale, StaffRewardTrade, StaffAssignment } from '../../types';
import { supabase } from '../../supabaseClient';

interface LikelyQuestionDeskProps {
  activeFacilitator?: StaffAssignment | null;
  schoolName?: string;
  subjects?: string[];
  facilitators?: Record<string, StaffAssignment>;
  isAdmin?: boolean;
}

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const LikelyQuestionDesk: React.FC<LikelyQuestionDeskProps> = ({ 
  activeFacilitator, 
  schoolName, 
  subjects = [], 
  facilitators = {}, 
  isAdmin = false 
}) => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  
  const [targetSubject, setTargetSubject] = useState(activeFacilitator?.taughtSubject || subjects[0] || 'English Language');
  const [targetFacilitatorName, setTargetFacilitatorName] = useState(activeFacilitator?.name || 'ADMINISTRATOR');

  const [formData, setFormData] = useState({
    type: 'OBJECTIVE' as 'OBJECTIVE' | 'THEORY',
    strand: '',
    strandCode: '',
    subStrand: '',
    subStrandCode: '',
    indicator: '',
    indicatorCode: '',
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

  useEffect(() => {
    if (activeFacilitator) {
      setTargetSubject(activeFacilitator.taughtSubject || '');
      setTargetFacilitatorName(activeFacilitator.name);
    }
  }, [activeFacilitator]);

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const sanitizedSubject = targetSubject.trim().replace(/\s+/g, '');
       const sanitizedName = targetFacilitatorName.trim().replace(/\s+/g, '');
       const { data } = await supabase
         .from('uba_persistence')
         .select('payload')
         .eq('id', `likely_${sanitizedSubject}_${sanitizedName}`)
         .maybeSingle();
       if (data?.payload) setQuestions(data.payload);
       else setQuestions([]);
    };
    fetchMySubmissions();
  }, [targetSubject, targetFacilitatorName]);

  const untradedCount = useMemo(() => questions.filter(q => !q.isTraded).length, [questions]);

  const handleDownloadText = () => {
    if (questions.length === 0) return alert("No shards to download.");
    let content = `LIKELY QUESTIONS RECORD - ${targetSubject.toUpperCase()}\n`;
    content += `FACILITATOR: ${targetFacilitatorName}\n`;
    content += `SCHOOL: ${schoolName || 'UBA'}\n`;
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `==========================================\n\n`;

    questions.forEach((q, i) => {
      content += `[${i+1}] TYPE: ${q.type}\n`;
      content += `STRAND: ${q.strand} (${q.strandCode || '---'})\n`;
      content += `SUB-STRAND: ${q.subStrand} (${q.subStrandCode || '---'})\n`;
      content += `INDICATOR: ${q.indicator} (${q.indicatorCode || '---'})\n`;
      content += `QUESTION: ${q.questionText}\n`;
      content += `KEY/SCHEME: ${q.correctKey || q.answerScheme}\n`;
      content += `------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LikelyQs_${targetSubject.replace(/\s/g, '_')}_${targetFacilitatorName.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    setIsSyncing(true);
    const sanitizedSubject = targetSubject.trim().replace(/\s+/g, '');
    const sanitizedName = targetFacilitatorName.trim().replace(/\s+/g, '');
    
    const facilitatorRecord = (Object.values(facilitators) as StaffAssignment[]).find(f => f.name === targetFacilitatorName);
    const hubId = facilitatorRecord?.email ? sanitizedName : 'HUB_NODE';

    const newQ: MasterQuestion = {
      id: `LQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      originalIndex: questions.length + 1,
      ...formData,
      subject: targetSubject,
      facilitatorCode: facilitatorRecord?.uniqueCode || 'ADMIN',
      isTraded: false,
      parts: formData.type === 'THEORY' ? [
        { partLabel: 'a.i', text: '', possibleAnswers: '', markingScheme: '', weight: 2, blooms: 'Knowledge' }
      ] : []
    };

    try {
      // Award Tokens: 1 Submitted = 5 Tokens
      if (facilitatorRecord) {
        facilitatorRecord.account = facilitatorRecord.account || { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] };
        facilitatorRecord.account.meritTokens += 5;
        facilitatorRecord.account.totalSubmissions += 1;
      }

      const nextPersonalQs = [...questions, newQ];
      await supabase.from('uba_persistence').upsert({
         id: `likely_${sanitizedSubject}_${sanitizedName}`,
         hub_id: hubId,
         payload: nextPersonalQs,
         last_updated: new Date().toISOString()
      });

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
        ...formData, indicator: '', indicatorCode: '', questionText: '', instruction: '', correctKey: 'A', answerScheme: '', weight: formData.type === 'OBJECTIVE' ? 1 : 10, blooms: 'Knowledge', diagramUrl: ''
      });

      if (untradedCount + 1 >= 5) setShowTradePopup(true);
      else alert(`Instructional shard mirrored to cloud master bank. 5 Merit Tokens awarded.`);
    } catch (error) {
      console.error("Cloud Sync Error:", error);
      alert("Handshake Interrupted.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExecuteTrade = async () => {
    const untraded = questions.filter(q => !q.isTraded).slice(0, 5);
    const untradedIds = untraded.map(q => q.id);
    const sanitizedSubject = targetSubject.trim().replace(/\s+/g, '');
    const sanitizedName = targetFacilitatorName.trim().replace(/\s+/g, '');
    
    const facilitatorRecord = (Object.values(facilitators) as StaffAssignment[]).find(f => f.name === targetFacilitatorName);

    // Trade Logic: 10 Questions = 1 GHS (So 5 questions = 0.5 GHS)
    const monetaryValue = (untraded.length / 10);

    if (facilitatorRecord) {
       facilitatorRecord.account = facilitatorRecord.account || { meritTokens: 0, monetaryCredits: 0, totalSubmissions: 0, unlockedQuestionIds: [] };
       facilitatorRecord.account.monetaryCredits += monetaryValue;
    }

    const tradeRequest: StaffRewardTrade = {
      id: `TR-${Date.now()}`,
      staffName: targetFacilitatorName,
      staffEmail: facilitatorRecord?.email || 'N/A',
      schoolName: schoolName || 'UNITED BAYLOR ACADEMY',
      subject: targetSubject,
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
      alert(`TRADE EXECUTED. GHS ${monetaryValue.toFixed(2)} credited to vault.`);
    } catch (e) {
      alert("Trade failed.");
    }
  };

  const currentFacilitators = useMemo(() => {
    return (Object.values(facilitators) as StaffAssignment[]).filter(f => f.taughtSubject === targetSubject || !f.taughtSubject);
  }, [facilitators, targetSubject]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      {showTradePopup && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl border border-gray-100 text-center space-y-8 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-lg text-4xl font-black">5</div>
              <div className="space-y-2">
                 <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Trade Milestone</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Credit Eligibility Verified</p>
              </div>
              <p className="text-sm font-medium text-slate-600 leading-relaxed italic">You have contributed 5 instructional shards for {targetFacilitatorName}. Trade this pack now for GHS 0.50 (1 GHS per 10 Qs)?</p>
              <div className="flex gap-4">
                 <button onClick={() => setShowTradePopup(false)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:text-slate-900 transition-colors">Discard</button>
                 <button onClick={handleExecuteTrade} className="flex-1 bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">Initiate Trade</button>
              </div>
           </div>
        </div>
      )}

      <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-black uppercase tracking-tight">Likely Question Desk</h3>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.4em]">Mirroring to Master Bank • Attribution: {targetFacilitatorName}</p>
           </div>
           <div className="flex gap-4">
              <button onClick={handleDownloadText} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl font-black text-[9px] uppercase border border-white/10 transition-all flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Text
              </button>
              <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
                 <span className="text-[10px] font-mono font-black text-blue-300 uppercase">Shards: {untradedCount}/5</span>
                 <div className={`w-3 h-3 rounded-full ${untradedCount >= 5 ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`}></div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100 space-y-4">
              <h4 className="text-[9px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">Institutional Attribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Subject</label>
                   <select 
                     value={targetSubject} 
                     onChange={e => {
                       const sub = e.target.value;
                       setTargetSubject(sub);
                       if (isAdmin) {
                         const match = (Object.values(facilitators) as StaffAssignment[]).find(f => f.taughtSubject === sub);
                         if (match) setTargetFacilitatorName(match.name);
                         else setTargetFacilitatorName('ADMINISTRATOR');
                       }
                     }} 
                     className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none uppercase"
                     disabled={!isAdmin}
                   >
                     {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Lead Facilitator</label>
                   {isAdmin ? (
                     <select 
                        value={targetFacilitatorName} 
                        onChange={e => setTargetFacilitatorName(e.target.value)} 
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black outline-none uppercase"
                     >
                        <option value="ADMINISTRATOR">ADMINISTRATOR (GENERAL)</option>
                        {currentFacilitators.map(f => <option key={f.email} value={f.name}>{f.name}</option>)}
                     </select>
                   ) : (
                     <div className="w-full bg-gray-200 border border-gray-300 rounded-xl px-4 py-2 text-[10px] font-black text-gray-600 uppercase">
                        {targetFacilitatorName}
                     </div>
                   )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Strand Name & Code</label>
                    <div className="flex gap-2">
                       <input type="text" placeholder="STRAND..." value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-bold uppercase" required />
                       <input type="text" placeholder="CODE" value={formData.strandCode} onChange={e=>setFormData({...formData, strandCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-black text-blue-600 uppercase" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Sub-Strand Name & Code</label>
                    <div className="flex gap-2">
                       <input type="text" placeholder="SUB-STRAND..." value={formData.subStrand} onChange={e=>setFormData({...formData, subStrand: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-bold uppercase" required />
                       <input type="text" placeholder="CODE" value={formData.subStrandCode} onChange={e=>setFormData({...formData, subStrandCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-black text-blue-600 uppercase" />
                    </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Indicator & Code</label>
                    <div className="flex gap-2">
                       <input type="text" placeholder="INDICATOR..." value={formData.indicator} onChange={e=>setFormData({...formData, indicator: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-bold uppercase" required />
                       <input type="text" placeholder="CODE" value={formData.indicatorCode} onChange={e=>setFormData({...formData, indicatorCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 uppercase" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Type</label>
                        <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any, weight: e.target.value === 'OBJECTIVE' ? 1 : 10})} className="w-full bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-black">
                           <option value="OBJECTIVE">OBJECTIVE</option>
                           <option value="THEORY">THEORY</option>
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Bloom's</label>
                        <select value={formData.blooms} onChange={e=>setFormData({...formData, blooms: e.target.value as BloomsScale})} className="w-full bg-slate-50 border rounded-xl px-4 py-2 text-[10px] font-black">
                           {BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                     </div>
                  </div>
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Question Content</label>
               <textarea placeholder="ENTER CONTENT..." value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[100px] uppercase" required />
            </div>

            <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase ml-2">{formData.type === 'OBJECTIVE' ? 'Correct Key' : 'Full Marking Scheme / Rubric'}</label>
               {formData.type === 'OBJECTIVE' ? (
                  <select value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black outline-none">
                     <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
               ) : (
                  <textarea placeholder="ENTER RUBRIC..." value={formData.answerScheme} onChange={e=>setFormData({...formData, answerScheme: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold text-slate-700 outline-none min-h-[80px] uppercase" required />
               )}
            </div>

            <button type="submit" disabled={isSyncing} className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Mirroring to Hub...' : 'Sync to Cloud Hub'}
            </button>
         </form>

         <div className="lg:col-span-6 bg-slate-50 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col overflow-hidden">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
               <div className="space-y-1">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Submission Stream</h4>
                  <p className="text-[9px] font-bold text-blue-600 uppercase">{targetSubject} • {targetFacilitatorName}</p>
               </div>
               <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{questions.length} Shards</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[700px] no-scrollbar">
               {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 relative group">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{q.strandCode || q.strand} → {q.indicatorCode || q.indicator}</span>
                           <div className="flex items-center gap-2">
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type}</span>
                             {q.isTraded && <span className="bg-emerald-100 text-emerald-700 text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Verified</span>}
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-200">#{questions.length - i}</span>
                     </div>
                     <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">"{q.questionText}"</p>
                  </div>
               ))}
               {questions.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center">
                    <p className="font-black text-[10px] uppercase tracking-widest">Awaiting cloud ingestion...</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;

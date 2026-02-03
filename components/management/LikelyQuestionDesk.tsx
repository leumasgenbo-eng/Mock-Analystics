
import React, { useState, useEffect, useMemo } from 'react';
import { MasterQuestion, BloomsScale, StaffAssignment, GlobalSettings } from '../../types';
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
  activeFacilitator, subjects = [], facilitators = {}, settings
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
    correctKey: '', 
    answerScheme: '', 
    diagramUrl: '',
    weight: 1, 
    blooms: 'Knowledge' as BloomsScale
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `likely_${targetSubject.replace(/\s+/g, '')}_${targetFacilitatorName.replace(/\s+/g, '')}`).maybeSingle();
       if (data?.payload) setQuestions(data.payload);
       else setQuestions([]);
    };
    fetchMySubmissions();
  }, [targetSubject, targetFacilitatorName]);

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
      facilitatorName: targetFacilitatorName,
      isTraded: false,
      parts: []
    };

    try {
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
              description: `Submission Credit: ${targetSubject} shard.`,
              reference_ids: [newQ.id]
          });
      }

      const nextPersonalQs = [...questions, newQ];
      await supabase.from('uba_persistence').upsert({
         id: `likely_${targetSubject.replace(/\s+/g, '')}_${targetFacilitatorName.replace(/\s+/g, '')}`,
         payload: nextPersonalQs, last_updated: new Date().toISOString()
      });

      setQuestions(nextPersonalQs);
      setFormData({ 
        ...formData, 
        questionText: '', 
        indicator: '', 
        indicatorCode: '', 
        subStrand: '', 
        subStrandCode: '', 
        strand: '', 
        strandCode: '',
        diagramUrl: '',
        correctKey: '',
        answerScheme: ''
      });
      alert(`SHARD CAPTURED: Identity synced with Cloud Registry.`);
    } catch (error) {
      alert("Sync Interrupted.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto pb-20 font-sans">
      <header className="bg-slate-900 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative space-y-4">
           <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">Likely Questions Desk</h3>
           <p className="text-blue-400 font-bold text-[10px] uppercase tracking-[0.5em]">Synchronizing Instructional Shards with United Baylor Network</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-7 bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-xl space-y-8">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Type</label>
                   <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase">
                      <option value="OBJECTIVE">OBJECTIVE</option>
                      <option value="THEORY">THEORY</option>
                   </select>
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Bloom's Scale</label>
                   <select value={formData.blooms} onChange={e=>setFormData({...formData, blooms: e.target.value as any})} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase">
                      {BLOOMS.map(b => <option key={b} value={b}>{b}</option>)}
                   </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-4">
                  <div className="flex gap-2">
                     <input type="text" placeholder="S-CODE" value={formData.strandCode} onChange={e=>setFormData({...formData, strandCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                     <input type="text" placeholder="STRAND NAME" value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                  </div>
                  <div className="flex gap-2">
                     <input type="text" placeholder="SS-CODE" value={formData.subStrandCode} onChange={e=>setFormData({...formData, subStrandCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                     <input type="text" placeholder="SUB-STRAND NAME" value={formData.subStrand} onChange={e=>setFormData({...formData, subStrand: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                  </div>
                  <div className="flex gap-2">
                     <input type="text" placeholder="I-CODE" value={formData.indicatorCode} onChange={e=>setFormData({...formData, indicatorCode: e.target.value.toUpperCase()})} className="w-20 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                     <input type="text" placeholder="INDICATOR NAME" value={formData.indicator} onChange={e=>setFormData({...formData, indicator: e.target.value.toUpperCase()})} className="flex-1 bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase" />
                  </div>
               </div>
               <div className="space-y-4">
                  <textarea value={formData.instruction} onChange={e=>setFormData({...formData, instruction: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl p-4 text-[10px] font-bold text-blue-600 h-full min-h-[140px] uppercase" placeholder="INSTRUCTIONS TO CANDIDATE / DIAGRAM NOTE..." />
               </div>
            </div>

            <div className="space-y-1">
               <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Question Content</label>
               <textarea value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-2xl p-6 text-sm font-bold text-slate-700 min-h-[120px] uppercase focus:ring-8 focus:ring-blue-500/5 outline-none transition-all" required placeholder="ENTER QUESTION CONTENT..." />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Key / Answer / Rubric</label>
                   <input value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-black uppercase" required placeholder="A / B / C / ANSWER TEXT..." />
                </div>
                <div className="space-y-1">
                   <label className="text-[8px] font-black text-slate-400 uppercase ml-2">Diagram URL (Optional)</label>
                   <input type="text" value={formData.diagramUrl} onChange={e=>setFormData({...formData, diagramUrl: e.target.value})} className="w-full bg-slate-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-mono font-black" placeholder="HTTPS://..." />
                </div>
            </div>

            <button type="submit" disabled={isSyncing} className="w-full bg-blue-950 text-white py-6 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Handshaking Cloud Registry...' : 'Mirror Shard to Global Bank'}
            </button>
         </form>

         <div className="lg:col-span-5 bg-slate-900 rounded-[3.5rem] border border-white/5 shadow-inner flex flex-col overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Shard Sync Stream</h4>
               <span className="text-[9px] font-black text-slate-500 bg-white/5 px-3 py-1 rounded-full">{questions.length} Captured</span>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 max-h-[700px] no-scrollbar">
               {questions.length > 0 ? [...questions].reverse().map((q, i) => (
                  <div key={q.id} className="bg-slate-950 border border-white/5 p-6 rounded-3xl space-y-4 group">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">{q.indicatorCode} • {q.indicator}</span>
                           <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed line-clamp-3">"{q.questionText}"</p>
                        </div>
                        <div className="bg-slate-900 px-2 py-1 rounded text-[8px] font-black text-slate-500">{q.blooms}</div>
                     </div>
                  </div>
               )) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2v20m10-10H2"/></svg>
                    <p className="font-black uppercase text-xs mt-4">Buffer Vacant</p>
                 </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;

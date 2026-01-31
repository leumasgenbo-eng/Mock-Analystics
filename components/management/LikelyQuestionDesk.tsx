
import React, { useState, useEffect } from 'react';
import { MasterQuestion, BloomsScale } from '../../types';
import { supabase } from '../../supabaseClient';

interface LikelyQuestionDeskProps {
  activeFacilitator?: { name: string; subject: string } | null;
}

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const LikelyQuestionDesk: React.FC<LikelyQuestionDeskProps> = ({ activeFacilitator }) => {
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

  const subject = activeFacilitator?.subject || 'English Language';

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const { data } = await supabase
         .from('uba_persistence')
         .select('payload')
         .eq('id', `likely_${subject.replace(/\s+/g, '')}_${activeFacilitator?.name.replace(/\s+/g, '')}`)
         .maybeSingle();
       if (data?.payload) setQuestions(data.payload);
    };
    if (activeFacilitator) fetchMySubmissions();
  }, [subject, activeFacilitator]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFormData({ ...formData, diagramUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    const newQ: MasterQuestion = {
      id: `LQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      originalIndex: questions.length + 1,
      ...formData,
      parts: formData.type === 'THEORY' ? [
        { partLabel: 'a.i', text: '', possibleAnswers: '', markingScheme: '', weight: 2, blooms: 'Knowledge' }
      ] : []
    };

    const nextQs = [...questions, newQ];
    setIsSyncing(true);
    
    try {
      // Save to facilitator's personal likely bank
      await supabase.from('uba_persistence').upsert({
         id: `likely_${subject.replace(/\s+/g, '')}_${activeFacilitator?.name.replace(/\s+/g, '')}`,
         payload: nextQs,
         last_updated: new Date().toISOString()
      });

      // Also append to global master subject bank for HQ visibility
      const bankId = `master_bank_${subject.replace(/\s+/g, '')}`;
      const { data: currentMaster } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      const updatedMaster = [...(currentMaster?.payload || []), newQ];
      await supabase.from('uba_persistence').upsert({
         id: bankId,
         payload: updatedMaster,
         last_updated: new Date().toISOString()
      });

      setQuestions(nextQs);
      // Reset form
      setFormData({
        type: 'OBJECTIVE',
        strand: '',
        subStrand: '',
        indicator: '',
        questionText: '',
        instruction: '',
        correctKey: 'A',
        answerScheme: '',
        weight: formData.type === 'OBJECTIVE' ? 1 : 10,
        blooms: 'Knowledge',
        diagramUrl: ''
      });
      alert("Likely question mirrored to HQ Master Bank.");
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative space-y-2">
           <h3 className="text-2xl font-black uppercase tracking-tight">Facilitator's Likely Question Desk</h3>
           <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.4em]">Faculty Contribution Portal: {subject}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question Draft</h4>
              <div className="flex gap-2">
                 <button type="button" onClick={() => setFormData({...formData, type: 'OBJECTIVE'})} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${formData.type === 'OBJECTIVE' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>Objective</button>
                 <button type="button" onClick={() => setFormData({...formData, type: 'THEORY'})} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${formData.type === 'THEORY' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>Theory</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Correct Key</label>
                  <select value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10" disabled={formData.type === 'THEORY'}>
                     <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Bloom's Scale</label>
                  <select value={formData.blooms} onChange={e=>setFormData({...formData, blooms: e.target.value as BloomsScale})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10">
                     {BLOOMS.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-4">
               <input type="text" placeholder="STRAND..." value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" />
               <input type="text" placeholder="SUB-STRAND..." value={formData.subStrand} onChange={e=>setFormData({...formData, subStrand: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" />
               <input type="text" placeholder="INDICATOR CODE (e.g. B9.1.1.1)..." value={formData.indicator} onChange={e=>setFormData({...formData, indicator: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" />
               <input type="text" placeholder="QUESTION INSTRUCTION..." value={formData.instruction} onChange={e=>setFormData({...formData, instruction: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] italic font-bold outline-none uppercase" />
               
               <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Question Body</label>
                 <textarea placeholder="TYPE QUESTION HERE..." value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[100px] uppercase" />
               </div>

               <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Answer Scheme / Scoring Rubric</label>
                 <textarea placeholder="EXPECTED ANSWER..." value={formData.answerScheme} onChange={e=>setFormData({...formData, answerScheme: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-xs font-bold text-emerald-400 outline-none min-h-[80px] uppercase" />
               </div>

               <div className="flex items-center gap-4">
                  <div className="flex-1">
                     <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Weight (Points)</label>
                     <input type="number" value={formData.weight} onChange={e=>setFormData({...formData, weight: parseInt(e.target.value)||0})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-xs font-black outline-none" />
                  </div>
                  <div className="shrink-0 pt-4">
                     <input type="file" id="likely-diagram" className="hidden" accept="image/*" onChange={handleFileUpload} />
                     <label htmlFor="likely-diagram" className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase cursor-pointer transition-all border ${formData.diagramUrl ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'}`}>
                        {formData.diagramUrl ? 'Diagram Ready' : 'Attach Diagram'}
                     </label>
                  </div>
               </div>
            </div>

            <button type="submit" disabled={isSyncing} className="w-full bg-indigo-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Synchronizing Shards...' : 'Mirror to HQ Master Bank'}
            </button>
         </form>

         <div className="lg:col-span-7 bg-slate-50 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col h-full overflow-hidden">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">My Submission Ledger</h4>
               <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{questions.length} Items Sync'd</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[800px] no-scrollbar">
               {questions.map((q, i) => (
                  <div key={q.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4 relative group">
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{q.strand} → {q.subStrand} ({q.indicator})</span>
                           <div className="flex items-center gap-2">
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${q.type === 'OBJECTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type}</span>
                             <span className="text-[8px] font-bold text-gray-400 uppercase">Bloom's: {q.blooms}</span>
                           </div>
                        </div>
                        <span className="text-[10px] font-black text-gray-300">#{questions.length - i}</span>
                     </div>
                     <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed">"{q.questionText}"</p>
                     {q.diagramUrl && <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-100"><img src={q.diagramUrl} className="w-full h-full object-cover" /></div>}
                     <div className="pt-3 border-t border-gray-50 flex justify-between items-center">
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Key: {q.type === 'OBJECTIVE' ? q.correctKey : 'Rubric Sync' }</span>
                        <span className="text-[8px] font-black text-slate-400">Weight: {q.weight} pts</span>
                     </div>
                  </div>
               ))}
               {questions.length === 0 && (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                     <p className="font-black uppercase text-[10px] tracking-widest">No likely questions mirrored yet</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;

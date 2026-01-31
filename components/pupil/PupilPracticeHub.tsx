
import React, { useState, useEffect, useCallback } from 'react';
import { PracticeAssignment, MasterQuestion, ProcessedStudent } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilPracticeHubProps {
  schoolId: string;
  studentId: number;
  studentName?: string;
}

const PupilPracticeHub: React.FC<PupilPracticeHubProps> = ({ schoolId, studentId, studentName }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeSet, setActiveSet] = useState<PracticeAssignment | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedQs, setSubmittedQs] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  const subjects = [
    "English Language", "Mathematics", "Science", "Social Studies", 
    "Career Technology", "Creative Arts and Designing", 
    "Ghana Language (Twi)", "Religious and Moral Education", 
    "Computing", "French"
  ];

  const loadShards = useCallback(async (subject: string) => {
    setIsLoading(true);
    // HANDSHAKE PROTOCOL
    const hubId = schoolId || localStorage.getItem('uba_active_hub_id');
    const subKey = subject.trim().replace(/\s+/g, '');
    const shardId = `practice_shards_${hubId}_${subKey}`;

    try {
      const { data, error } = await supabase
        .from('uba_instructional_shards')
        .select('payload')
        .eq('id', shardId)
        .maybeSingle();

      if (data?.payload) {
        setActiveSet(data.payload as PracticeAssignment);
        setAnswers({});
        setSubmittedQs({});
        setCurrentQIndex(0);
        setIsCompleted(false);
        setSessionScore(0);
      } else {
        alert(`NO ACTIVE SHARDS: Facilitator hasn't broadcast "${subject}" items for this node yet.`);
        setActiveSet(null);
      }
    } catch (e) {
      console.error("[SHARD RETRIEVAL ERROR]", e);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  const handleObjectiveSelect = (qId: string, opt: string) => {
    if (submittedQs[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    setSubmittedQs(prev => ({ ...prev, [qId]: true }));
    
    // Immediate scoring feedback
    const q = activeSet?.questions.find(x => x.id === qId);
    if (q && opt === q.correctKey) {
       setSessionScore(prev => prev + 1);
    }
  };

  const handleFinalizeSession = async () => {
    if (!activeSet) return;
    
    const hubId = schoolId || localStorage.getItem('uba_active_hub_id') || 'GLOBAL';
    
    try {
      // Persist to Cloud Results Ledger
      await supabase.from('uba_practice_results').insert({
        hub_id: hubId,
        student_id: studentId,
        student_name: studentName || 'CANDIDATE',
        subject: activeSet.subject,
        assignment_id: activeSet.id,
        score: sessionScore,
        total_items: activeSet.questions.length,
        completed_at: new Date().toISOString()
      });

      setIsCompleted(true);
    } catch (e) {
      alert("Mirror Failed. Result kept in temporary cache.");
      setIsCompleted(true);
    }
  };

  if (activeSet && !isCompleted) {
    const q = activeSet.questions[currentQIndex];
    const hasSubmitted = submittedQs[q.id];
    const expectedWords = q.answerScheme ? q.answerScheme.trim().split(/\s+/).length : 0;

    return (
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[300] flex items-center justify-center p-4 md:p-10 font-sans">
         <div className="w-full max-w-5xl bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-500">
            
            {/* Terminal Interface HUD */}
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Instructional Handshake: {activeSet.subject}</span>
                  <h4 className="text-sm font-black uppercase">PRACTICE TERMINAL</h4>
               </div>
               <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-2xl flex items-center gap-4">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] font-mono font-black text-blue-300 uppercase">Node ID: {schoolId}</span>
               </div>
            </div>

            {/* Focus Instructional Workspace */}
            <div className="flex-1 overflow-y-auto p-10 md:p-16 space-y-12 no-scrollbar">
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="bg-blue-100 text-blue-900 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">ITEM {currentQIndex + 1} OF {activeSet.questions.length}</span>
                     {q.type === 'THEORY' && (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-6 py-2 rounded-full shadow-sm animate-bounce">
                           <span className="text-[10px] font-black text-amber-700 uppercase">Target: ~{expectedWords} Words</span>
                        </div>
                     )}
                  </div>
                  <h3 className="text-2xl md:text-4xl font-black text-slate-900 uppercase leading-snug tracking-tight">
                     "{q.questionText}"
                  </h3>
               </div>

               {q.type === 'OBJECTIVE' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                     {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                        const isCorrect = opt === q.correctKey;
                        const isSelected = answers[q.id] === opt;
                        
                        let btnClass = "bg-slate-50 border-gray-100 text-slate-700 hover:border-blue-400 hover:shadow-lg hover:bg-white";
                        if (hasSubmitted) {
                           if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-xl scale-110 z-10 ring-8 ring-emerald-500/20";
                           else if (isSelected) btnClass = "bg-red-500 border-red-500 text-white opacity-40 grayscale scale-95";
                           else btnClass = "bg-slate-50 border-gray-100 text-slate-300 opacity-20";
                        } else if (isSelected) {
                           btnClass = "bg-blue-950 border-blue-950 text-white shadow-2xl scale-110 ring-8 ring-blue-900/10";
                        }

                        return (
                           <button 
                             key={opt}
                             disabled={hasSubmitted}
                             onClick={() => handleObjectiveSelect(q.id, opt)}
                             className={`p-10 rounded-[3rem] border-2 transition-all flex flex-col items-center justify-center gap-4 text-center group ${btnClass}`}
                           >
                              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-4xl shrink-0 ${isSelected || (hasSubmitted && isCorrect) ? 'bg-white/20' : 'bg-white shadow-md group-hover:scale-110 transition-transform'}`}>
                                 {opt}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Choice {opt}</span>
                           </button>
                        );
                     })}
                  </div>
               ) : (
                  <div className="space-y-6">
                     <div className="flex justify-between items-center ml-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Theoretical Construction Terminal</label>
                        <span className="text-[9px] font-mono font-bold text-blue-500 uppercase">Input Terminal: SHARD-{q.id.slice(-4)}</span>
                     </div>
                     <textarea 
                        value={answers[q.id] || ""}
                        onChange={e => setAnswers({...answers, [q.id]: e.target.value.toUpperCase()})}
                        placeholder="CONSTRUCT COGNITIVE SHARD RESPONSE HERE..."
                        className="w-full bg-slate-50 border-2 border-gray-100 rounded-[3.5rem] p-12 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white min-h-[350px] shadow-inner uppercase transition-all leading-relaxed"
                     />
                  </div>
               )}

               {hasSubmitted && q.type === 'OBJECTIVE' && (
                  <div className="bg-slate-900 p-10 rounded-[3rem] text-white animate-in slide-in-from-bottom-8 flex justify-between items-center shadow-2xl border border-white/5">
                     <div className="space-y-2">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Logic Validation Hub</span>
                        <p className="text-sm font-bold italic uppercase leading-relaxed max-w-2xl">"The correct logic shard is {q.correctKey}. {q.answerScheme}"</p>
                     </div>
                     <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-lg ${answers[q.id] === q.correctKey ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d={answers[q.id] === q.correctKey ? "M20 6L9 17l-5-5" : "M18 6L6 18M6 6l12 12"}/></svg>
                     </div>
                  </div>
               )}
            </div>

            {/* Session Navigation Controls */}
            <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
               <button 
                 disabled={currentQIndex === 0}
                 onClick={() => setCurrentQIndex(prev => prev - 1)}
                 className="px-12 py-5 bg-white border border-gray-200 text-slate-400 rounded-3xl font-black uppercase text-[11px] transition-all hover:bg-slate-50 disabled:opacity-0 active:scale-95 shadow-sm"
               >Back Item</button>

               <div className="flex gap-3">
                  {activeSet.questions.map((_, i) => (
                     <div key={i} className={`h-2 rounded-full transition-all duration-700 ${i === currentQIndex ? 'w-14 bg-blue-950 shadow-[0_0_10px_rgba(30,58,138,0.4)]' : 'w-2 bg-slate-200'}`}></div>
                  ))}
               </div>

               {currentQIndex === activeSet.questions.length - 1 ? (
                 <button onClick={handleFinalizeSession} className="px-14 py-5 bg-emerald-600 text-white rounded-3xl font-black uppercase text-[11px] shadow-2xl active:scale-95 transition-all hover:bg-emerald-700 tracking-widest">Finalize Session</button>
               ) : (
                 <button 
                   onClick={() => {
                     if (q.type === 'OBJECTIVE' && !hasSubmitted) return alert("Select logic shard to proceed.");
                     setCurrentQIndex(prev => prev + 1);
                   }} 
                   className="px-14 py-5 bg-blue-950 text-white rounded-3xl font-black uppercase text-[11px] shadow-2xl active:scale-95 transition-all hover:bg-black tracking-widest"
                 >Proceed Shard</button>
               )}
            </div>
         </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="p-20 bg-white rounded-[5rem] shadow-2xl text-center space-y-12 animate-in zoom-in-95 duration-700">
         <div className="w-56 h-56 bg-blue-950 text-white rounded-full flex items-center justify-center mx-auto text-7xl font-black shadow-2xl border-[20px] border-blue-50 relative overflow-hidden">
           <div className="absolute inset-0 bg-blue-600/10 animate-pulse"></div>
           <span className="relative">DONE</span>
         </div>
         <div className="space-y-4">
            <h3 className="text-5xl font-black text-slate-900 uppercase tracking-tight">Mastery Recorded</h3>
            <p className="text-sm font-bold text-blue-500 uppercase tracking-[0.4em]">Final Score: {sessionScore} / {activeSet?.questions.length}</p>
         </div>
         <button onClick={() => { setActiveSet(null); setSelectedSubject(null); }} className="bg-slate-950 text-white px-20 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl">Return to Portal</button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="bg-blue-950 text-white p-16 rounded-[4rem] shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-[120px] group-hover:scale-125 transition-transform duration-1000"></div>
         <h3 className="text-4xl font-black uppercase tracking-tighter leading-none">Practice Terminal</h3>
         <p className="text-[12px] font-bold text-blue-400 uppercase tracking-[0.6em] mt-4">Autonomous Cloud Shard Retrieval Node</p>
      </div>

      {isLoading ? (
         <div className="py-48 flex flex-col items-center justify-center space-y-8">
            <div className="w-20 h-20 border-[10px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[11px] font-black text-blue-900 uppercase tracking-[0.5em] animate-pulse">Establishing handshake with cloud shards...</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map(sub => (
            <button 
              key={sub}
              onClick={() => { setSelectedSubject(sub); loadShards(sub); }}
              className="bg-white border border-gray-100 p-12 rounded-[3.5rem] shadow-xl text-left hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -mr-20 -mt-20 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative space-y-8">
                  <div className="w-20 h-20 bg-blue-50 text-blue-900 rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-inner group-hover:bg-blue-950 group-hover:text-white transition-all duration-500">
                     {sub.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 uppercase leading-tight group-hover:text-blue-900 transition-colors">{sub}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 block flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                       Synchronize Shards
                    </span>
                  </div>
               </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PupilPracticeHub;

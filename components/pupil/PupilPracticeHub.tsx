
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PracticeAssignment, MasterQuestion, StudentData } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilPracticeHubProps {
  schoolId: string;
  studentId: number;
}

const PupilPracticeHub: React.FC<PupilPracticeHubProps> = ({ schoolId, studentId }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeSet, setActiveSet] = useState<PracticeAssignment | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedQs, setSubmittedQs] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const subjects = ["English Language", "Mathematics", "Science", "Social Studies", "Career Technology", "Computing"];

  const loadShards = useCallback(async (subject: string) => {
    setIsLoading(true);
    const subKey = subject.trim().replace(/\s+/g, '');
    try {
      const { data } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `practice_shards_${schoolId}_${subKey}`)
        .maybeSingle();

      if (data?.payload) {
        setActiveSet(data.payload as PracticeAssignment);
        setAnswers({});
        setSubmittedQs({});
        setCurrentQIndex(0);
        setIsCompleted(false);
      } else {
        alert("No active instructional shards found for this subject.");
        setActiveSet(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  const handleSubjectSelect = (sub: string) => {
    setSelectedSubject(sub);
    loadShards(sub);
  };

  const handleObjectiveClick = (qId: string, opt: string) => {
    if (submittedQs[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    setSubmittedQs(prev => ({ ...prev, [qId]: true }));
  };

  if (activeSet && !isCompleted) {
    const q = activeSet.questions[currentQIndex];
    const hasSubmitted = submittedQs[q.id];
    
    // Cognitive Clue: Word Count Extractor
    const expectedWords = q.answerScheme ? q.answerScheme.trim().split(/\s+/).length : 0;

    return (
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[300] flex items-center justify-center p-4 md:p-10 font-sans">
        <div className="w-full max-w-5xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95">
           
           {/* Terminal HUD */}
           <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0 border-b border-white/5">
              <div className="space-y-1">
                 <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Active Shard Retrieval</span>
                 <h4 className="text-sm font-black uppercase">{activeSet.subject} SESSION</h4>
              </div>
              <div className="bg-white/5 border border-white/10 px-6 py-2 rounded-2xl flex items-center gap-4">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                 <span className="text-[10px] font-mono font-black text-blue-300">HUB_SYNC: {activeSet.id.slice(-6)}</span>
              </div>
           </div>

           {/* Instructional Workspace */}
           <div className="flex-1 overflow-y-auto p-10 md:p-16 space-y-12">
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <span className="bg-blue-100 text-blue-900 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Item {currentQIndex + 1} of {activeSet.questions.length}</span>
                    {q.type === 'THEORY' && (
                       <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-4 py-1.5 rounded-full shadow-sm animate-bounce">
                          <span className="text-[9px] font-black text-amber-700 uppercase">Cognitive Clue: ~{expectedWords} Words Target</span>
                       </div>
                    )}
                 </div>
                 <h3 className="text-2xl md:text-3xl font-black text-slate-900 uppercase leading-snug">
                    "{q.questionText}"
                 </h3>
              </div>

              {q.type === 'OBJECTIVE' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                      const isCorrect = opt === q.correctKey;
                      const isSelected = answers[q.id] === opt;
                      
                      let btnClass = "bg-slate-50 border-gray-100 text-slate-700 hover:border-blue-400 hover:bg-white";
                      if (hasSubmitted) {
                         if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-xl scale-[1.02]";
                         else if (isSelected) btnClass = "bg-red-500 border-red-500 text-white shadow-xl scale-[0.98]";
                         else btnClass = "bg-slate-50 border-gray-100 text-slate-300 opacity-40";
                      } else if (isSelected) {
                         btnClass = "bg-blue-900 border-blue-900 text-white shadow-2xl";
                      }

                      return (
                        <button 
                          key={opt}
                          disabled={hasSubmitted}
                          onClick={() => handleObjectiveClick(q.id, opt)}
                          className={`p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-8 text-left group ${btnClass}`}
                        >
                           <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 ${isSelected || (hasSubmitted && isCorrect) ? 'bg-white/20' : 'bg-white shadow-md'}`}>
                              {opt}
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black uppercase opacity-40">Alternative Participant</span>
                              <p className="text-xs font-black uppercase tracking-tight">Option {opt} Instance Shard</p>
                           </div>
                        </button>
                      );
                   })}
                </div>
              ) : (
                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Theoretical Response Terminal</label>
                   <textarea 
                      value={answers[q.id] || ""}
                      onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                      placeholder="CONSTRUCT COGNITIVE SHARD HERE..."
                      className="w-full bg-slate-50 border-2 border-gray-100 rounded-[3rem] p-10 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[300px] shadow-inner uppercase transition-all"
                   />
                </div>
              )}

              {hasSubmitted && q.type === 'OBJECTIVE' && (
                 <div className="bg-slate-900 p-8 rounded-[2rem] text-white animate-in slide-in-from-bottom-6 flex justify-between items-center">
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Logic Validation</span>
                       <p className="text-xs font-bold italic uppercase">"The correct logical shard is alternative {q.correctKey}. {q.answerScheme}"</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${answers[q.id] === q.correctKey ? 'bg-emerald-500' : 'bg-red-500'}`}>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d={answers[q.id] === q.correctKey ? "M20 6L9 17l-5-5" : "M18 6L6 18M6 6l12 12"}/></svg>
                    </div>
                 </div>
              )}
           </div>

           {/* Control Footnote */}
           <div className="p-10 bg-gray-50 border-t border-gray-100 flex justify-between items-center shrink-0">
              <button 
                 disabled={currentQIndex === 0}
                 onClick={() => setCurrentQIndex(prev => prev - 1)}
                 className="px-10 py-4 bg-white border border-gray-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] transition-all hover:bg-slate-50 disabled:opacity-0"
              >Back</button>

              <div className="flex gap-2">
                 {activeSet.questions.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === currentQIndex ? 'w-10 bg-blue-900' : 'w-2 bg-slate-200'}`}></div>
                 ))}
              </div>

              {currentQIndex === activeSet.questions.length - 1 ? (
                 <button onClick={() => setIsCompleted(true)} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all">Finalize Session</button>
              ) : (
                 <button onClick={() => setCurrentQIndex(prev => prev + 1)} className="px-12 py-4 bg-blue-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-2xl active:scale-95 transition-all">Proceed Shard</button>
              )}
           </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="p-16 bg-white rounded-[4rem] shadow-2xl text-center space-y-10 animate-in zoom-in-95">
         <div className="w-40 h-40 bg-blue-900 text-white rounded-full flex items-center justify-center mx-auto text-5xl font-black shadow-2xl border-[12px] border-blue-50">
           DONE
         </div>
         <div className="space-y-4">
            <h3 className="text-3xl font-black text-slate-900 uppercase">Session Shard Synchronized</h3>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-[0.4em]">Master Registry Updated with Temporal Mastery Shard</p>
         </div>
         <button onClick={() => setActiveSet(null)} className="bg-slate-950 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all">Return to Registry</button>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="bg-blue-950 text-white p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <h3 className="text-3xl font-black uppercase tracking-tight">Rapid Practice Terminal</h3>
         <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.6em] mt-2">Autonomous Cognitive Shard Retrieval Node</p>
      </div>

      {isLoading ? (
         <div className="py-40 flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 border-8 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest animate-pulse">Accessing Cloud Shards...</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {subjects.map(sub => (
            <button 
              key={sub}
              onClick={() => handleSubjectSelect(sub)}
              className="bg-white border border-gray-100 p-10 rounded-[3rem] shadow-xl text-left hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
               <div className="relative space-y-4">
                  <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-blue-900 group-hover:text-white transition-colors">
                     {sub.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 uppercase leading-tight">{sub}</h4>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">Retrieve Mastery Shards</span>
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

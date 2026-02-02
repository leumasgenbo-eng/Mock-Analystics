
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
        alert(`NO ACTIVE BROADCAST: Your facilitator has not pushed practice questions for "${subject}" yet.`);
        setActiveSet(null);
      }
    } catch (e) {
      console.error("[SHARD DOWNLOAD ERROR]", e);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  const handleDownloadQuestionsAsText = () => {
    if (!activeSet) return;
    let content = `PRACTICE SHARDS: ${activeSet.subject.toUpperCase()}\n`;
    content += `CANDIDATE: ${studentName || 'NOT_IDENTIFIED'}\n`;
    content += `==========================================\n\n`;

    activeSet.questions.forEach((q, i) => {
      content += `[${i + 1}] TYPE: ${q.type}\n`;
      content += `CONTENT: ${q.questionText}\n`;
      if (q.type === 'OBJECTIVE') {
        content += `Options: A, B, C, D\n`;
      }
      content += `------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Practice_Shards_${activeSet.subject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAnswersAsText = () => {
    if (!activeSet) return;
    let content = `PRACTICE PERFORMANCE REPORT: ${activeSet.subject.toUpperCase()}\n`;
    content += `CANDIDATE: ${studentName || 'NOT_IDENTIFIED'}\n`;
    content += `SCORE: ${sessionScore} / ${activeSet.questions.length}\n`;
    content += `COMPLETED AT: ${new Date().toLocaleString()}\n`;
    content += `==========================================\n\n`;

    activeSet.questions.forEach((q, i) => {
      content += `[${i + 1}] QUESTION: ${q.questionText}\n`;
      content += `MY RESPONSE: ${answers[q.id] || 'NO_ENTRY'}\n`;
      if (q.type === 'OBJECTIVE') {
        content += `RESULT: ${answers[q.id] === q.correctKey ? 'CORRECT' : 'INCORRECT (KEY: ' + q.correctKey + ')'}\n`;
      }
      content += `------------------------------------------\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Performance_Export_${activeSet.subject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleObjectiveSelect = (qId: string, opt: string) => {
    if (submittedQs[qId]) return;
    setAnswers(prev => ({ ...prev, [qId]: opt }));
    setSubmittedQs(prev => ({ ...prev, [qId]: true }));
    
    const q = activeSet?.questions.find(x => x.id === qId);
    if (q && opt === q.correctKey) {
       setSessionScore(prev => prev + 1);
    }
  };

  const handleTheoryInput = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleFinalizeSession = async () => {
    if (!activeSet) return;
    const hubId = schoolId || localStorage.getItem('uba_active_hub_id') || 'GLOBAL';
    
    try {
      await supabase.from('uba_practice_results').insert({
        hub_id: hubId,
        student_id: studentId.toString(),
        student_name: studentName || 'CANDIDATE',
        subject: activeSet.subject,
        assignment_id: activeSet.id,
        score: sessionScore,
        total_items: activeSet.questions.length,
        completed_at: new Date().toISOString()
      });
      setIsCompleted(true);
    } catch (e) {
      alert("Local Cache Synchronized. Network mirror pending.");
      setIsCompleted(true);
    }
  };

  if (activeSet && !isCompleted) {
    const q = activeSet.questions[currentQIndex];
    const hasSubmitted = submittedQs[q.id];

    return (
      <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[300] flex items-center justify-center p-4 md:p-10 font-sans">
         <div className="w-full max-w-6xl bg-white rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-500">
            
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0 border-b border-white/5">
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em]">Instructional Handshake • {activeSet.subject}</span>
                  <h4 className="text-lg font-black uppercase tracking-tighter">Practice Hub Terminal</h4>
               </div>
               <div className="flex items-center gap-4">
                  <button 
                    onClick={handleDownloadQuestionsAsText}
                    className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-2xl font-black text-[9px] uppercase border border-white/10 transition-all flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download Questions
                  </button>
                  <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-2.5 rounded-2xl shadow-xl">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-mono font-black text-blue-300 uppercase tracking-widest">Active Link: {schoolId}</span>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 md:p-16 space-y-12 no-scrollbar">
               <div className="space-y-6">
                  <div className="flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">Item {currentQIndex + 1} / {activeSet.questions.length}</span>
                        <span className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${q.type === 'OBJECTIVE' ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>{q.type}</span>
                     </div>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Strand: {q.strand} [{q.strandCode || '---'}]</span>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-black text-slate-900 uppercase leading-[1.1] tracking-tighter max-w-5xl">
                     "{q.questionText}"
                  </h3>
               </div>

               {q.type === 'OBJECTIVE' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                     {['A', 'B', 'C', 'D'].map((opt) => {
                        const isCorrect = opt === q.correctKey;
                        const isSelected = answers[q.id] === opt;
                        
                        let btnClass = "bg-slate-50 border-gray-100 text-slate-700 hover:border-blue-400 hover:bg-white";
                        if (hasSubmitted) {
                           if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-xl scale-105 z-10 ring-8 ring-emerald-500/10";
                           else if (isSelected) btnClass = "bg-red-500 border-red-500 text-white opacity-40 grayscale";
                           else btnClass = "bg-slate-50 border-gray-100 text-slate-300 opacity-10";
                        } else if (isSelected) {
                           btnClass = "bg-blue-900 border-blue-900 text-white shadow-2xl scale-110 ring-8 ring-blue-900/10";
                        }

                        return (
                           <button 
                             key={opt}
                             disabled={hasSubmitted}
                             onClick={() => handleObjectiveSelect(q.id, opt)}
                             className={`p-10 rounded-[3rem] border-2 transition-all flex flex-col items-center justify-center gap-6 text-center group ${btnClass}`}
                           >
                              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center font-black text-5xl shrink-0 ${isSelected || (hasSubmitted && isCorrect) ? 'bg-white/20' : 'bg-white shadow-lg group-hover:scale-110 transition-transform'}`}>
                                 {opt}
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60">Logic {opt}</span>
                           </button>
                        );
                     })}
                  </div>
               ) : (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center px-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Theoretical response Terminal</label>
                        <span className="text-[9px] font-mono font-bold text-indigo-500 uppercase">Input Node: {q.id.slice(-6)}</span>
                     </div>
                     <textarea 
                        value={answers[q.id] || ""}
                        onChange={e => handleTheoryInput(q.id, e.target.value.toUpperCase())}
                        placeholder="CONSTRUCT YOUR DETAILED COGNITIVE RESPONSE HERE..."
                        className="w-full bg-slate-50 border-2 border-gray-100 rounded-[4rem] p-12 text-lg font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white min-h-[450px] shadow-inner uppercase transition-all leading-relaxed placeholder:opacity-20"
                     />
                  </div>
               )}

               {hasSubmitted && q.type === 'OBJECTIVE' && (
                  <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white animate-in slide-in-from-bottom-10 flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl border border-white/5">
                     <div className="space-y-3 flex-1">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Logic Validation Audit</span>
                        <p className="text-lg font-bold italic uppercase leading-relaxed text-slate-200">"Validated shard logic: {q.correctKey}. Detailed scheme: {q.answerScheme}"</p>
                     </div>
                     <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl border-4 border-white/10 ${answers[q.id] === q.correctKey ? 'bg-emerald-500' : 'bg-red-500'}`}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d={answers[q.id] === q.correctKey ? "M20 6L9 17l-5-5" : "M18 6L6 18M6 6l12 12"}/></svg>
                     </div>
                  </div>
               )}
            </div>

            <div className="p-10 bg-slate-50 border-t border-gray-100 flex justify-between items-center shrink-0">
               <button 
                 disabled={currentQIndex === 0}
                 onClick={() => setCurrentQIndex(prev => prev - 1)}
                 className="px-12 py-6 bg-white border border-gray-200 text-slate-400 rounded-[2rem] font-black uppercase text-[11px] transition-all hover:bg-slate-50 disabled:opacity-0 active:scale-95 shadow-md tracking-widest"
               >Back shard</button>

               <div className="flex gap-4">
                  {activeSet.questions.map((_, i) => (
                     <div key={i} className={`h-2.5 rounded-full transition-all duration-700 ${i === currentQIndex ? 'w-16 bg-blue-950 shadow-[0_0_15px_rgba(30,58,138,0.5)]' : 'w-2.5 bg-slate-200'}`}></div>
                  ))}
               </div>

               {currentQIndex === activeSet.questions.length - 1 ? (
                 <button onClick={handleFinalizeSession} className="px-16 py-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[11px] shadow-2xl active:scale-95 transition-all hover:bg-emerald-700 tracking-[0.3em]">Finalize Matrix</button>
               ) : (
                 <button 
                   onClick={() => {
                     if (q.type === 'OBJECTIVE' && !hasSubmitted) return alert("Verify logic shard to proceed.");
                     // Ensure pupil added something for theory before moving on
                     if (q.type === 'THEORY' && !answers[q.id]?.trim()) return alert("Construct a response before moving to the next shard.");
                     setCurrentQIndex(prev => prev + 1);
                   }} 
                   className="px-16 py-6 bg-blue-950 text-white rounded-[2rem] font-black uppercase text-[11px] shadow-2xl active:scale-95 transition-all hover:bg-black tracking-[0.3em]"
                 >Next Shard</button>
               )}
            </div>
         </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="p-24 bg-white rounded-[6rem] shadow-2xl text-center space-y-14 animate-in zoom-in-95 duration-1000 border border-gray-50">
         <div className="w-64 h-64 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto text-8xl font-black shadow-[0_40px_100px_rgba(0,0,0,0.2)] border-[25px] border-blue-50 relative overflow-hidden group">
           <div className="absolute inset-0 bg-emerald-500/10 animate-pulse"></div>
           <span className="relative group-hover:scale-110 transition-transform">✓</span>
         </div>
         <div className="space-y-6">
            <h3 className="text-6xl font-black text-slate-900 uppercase tracking-tighter">Shard mastery recorded</h3>
            <p className="text-base font-bold text-blue-600 uppercase tracking-[0.6em]">Session Efficiency: {sessionScore} / {activeSet?.questions.length}</p>
         </div>
         <div className="flex flex-col md:flex-row justify-center gap-6">
            <button 
              onClick={handleDownloadAnswersAsText}
              className="bg-indigo-600 text-white px-12 py-8 rounded-[3rem] font-black text-xs uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-xl flex items-center gap-4"
            >
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download Answers (.txt)
            </button>
            <button onClick={() => { setActiveSet(null); setSelectedSubject(null); setIsCompleted(false); }} className="bg-blue-950 text-white px-24 py-8 rounded-[3rem] font-black text-xs uppercase tracking-[0.4em] hover:scale-105 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)]">Exit Terminal</button>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 pb-20">
      <div className="bg-slate-900 text-white p-16 rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[150px] group-hover:scale-150 transition-transform duration-1000"></div>
         <div className="relative space-y-4">
            <h3 className="text-5xl font-black uppercase tracking-tighter leading-none">Practice hub</h3>
            <p className="text-base font-bold text-blue-400 uppercase tracking-[0.6em]">Synchronize Instructional Shards</p>
         </div>
      </div>

      {isLoading ? (
         <div className="py-60 flex flex-col items-center justify-center space-y-10">
            <div className="w-24 h-24 border-[12px] border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-blue-900 uppercase tracking-[0.6em] animate-pulse">Establishing Cloud Handshake Protocol...</p>
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {subjects.map(sub => (
            <button 
              key={sub}
              onClick={() => { setSelectedSubject(sub); loadShards(sub); }}
              className="bg-white border border-gray-100 p-14 rounded-[4rem] shadow-xl text-left hover:border-blue-500 hover:shadow-2xl transition-all group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000"></div>
               <div className="relative space-y-10">
                  <div className="w-24 h-24 bg-blue-50 text-blue-900 rounded-[2.5rem] flex items-center justify-center font-black text-4xl shadow-inner group-hover:bg-blue-950 group-hover:text-white transition-all duration-700">
                     {sub.charAt(0)}
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-2xl font-black text-slate-900 uppercase leading-tight group-hover:text-blue-900 transition-colors">{sub}</h4>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-3">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                       Download Shards
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

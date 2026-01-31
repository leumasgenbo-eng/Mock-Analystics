import React, { useState, useEffect, useMemo } from 'react';
import { PracticeAssignment, MasterQuestion, StudentData } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilPracticeHubProps {
  schoolId: string;
  studentId: number;
}

const PupilPracticeHub: React.FC<PupilPracticeHubProps> = ({ schoolId, studentId }) => {
  const [assignments, setAssignments] = useState<PracticeAssignment[]>([]);
  const [activeTest, setActiveTest] = useState<PracticeAssignment | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submittedQs, setSubmittedQs] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const fetchPractice = async () => {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `practice_assign_${schoolId}`).maybeSingle();
      if (data?.payload) setAssignments(data.payload);
    };
    fetchPractice();
  }, [schoolId]);

  useEffect(() => {
    let timer: any;
    if (activeTest && timeLeft > 0 && !isCompleted) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && activeTest && !isCompleted) {
      handleCompleteTest();
    }
    return () => clearInterval(timer);
  }, [timeLeft, activeTest, isCompleted]);

  const handleStartTest = (test: PracticeAssignment) => {
    setActiveTest(test);
    setAnswers({});
    setSubmittedQs({});
    setCurrentQIndex(0);
    setTimeLeft(test.timeLimit * 60);
    setIsCompleted(false);
  };

  const handleSelectObjective = (qId: string, option: string) => {
    if (submittedQs[qId]) return; // Prevent double submission
    setAnswers(prev => ({ ...prev, [qId]: option }));
    setSubmittedQs(prev => ({ ...prev, [qId]: true }));
  };

  const calculateScore = (test: PracticeAssignment, pupilAnswers: Record<string, string>) => {
    let totalMarks = 0;
    let earnedMarks = 0;
    const indicatorResults: Record<string, { earned: number, total: number, strand: string, subStrand: string }> = {};

    test.questions.forEach(q => {
      totalMarks += q.weight;
      if (!indicatorResults[q.indicator]) {
        indicatorResults[q.indicator] = { earned: 0, total: 0, strand: q.strand, subStrand: q.subStrand };
      }
      indicatorResults[q.indicator].total += q.weight;

      const pupilAns = (pupilAnswers[q.id] || "").trim().toLowerCase();
      const masterAns = (q.answerScheme || q.correctKey || "").trim().toLowerCase();

      let qEarned = 0;
      if (q.type === 'OBJECTIVE') {
        if (pupilAns === masterAns) qEarned = q.weight;
      } else {
        const pWords = new Set(pupilAns.split(/\s+/).filter(w => w.length > 2));
        const mWords = new Set(masterAns.split(/\s+/).filter(w => w.length > 2));
        if (mWords.size > 0) {
          const intersect = new Set([...pWords].filter(w => mWords.has(w)));
          const matchRate = intersect.size / mWords.size;
          if (matchRate >= 0.9) qEarned = q.weight;
          else if (matchRate >= 0.5) qEarned = q.weight * 0.5;
        }
      }
      earnedMarks += qEarned;
      indicatorResults[q.indicator].earned += qEarned;
    });

    return { percentage: Math.round((earnedMarks / totalMarks) * 100), indicatorResults };
  };

  const handleCompleteTest = async () => {
    if (!activeTest) return;
    const { percentage, indicatorResults } = calculateScore(activeTest, answers);
    setFinalScore(percentage);
    setIsCompleted(true);

    const { data: stData } = await supabase.from('uba_persistence').select('payload').eq('id', `${schoolId}_students`).maybeSingle();
    if (stData?.payload) {
      const students: StudentData[] = stData.payload;
      const stIdx = students.findIndex(s => s.id === studentId);
      if (stIdx >= 0) {
        const currentMap = students[stIdx].masteryMap || [];
        Object.entries(indicatorResults).forEach(([indicator, data]) => {
          const mIdx = currentMap.findIndex(m => m.indicator === indicator);
          const score = (data.earned / data.total) * 100;
          if (mIdx >= 0) {
            currentMap[mIdx].attempts++;
            currentMap[mIdx].averageScore = (currentMap[mIdx].averageScore + score) / 2;
          } else {
            currentMap.push({
              strand: data.strand, subStrand: data.subStrand, indicator,
              averageScore: score, attempts: 1,
              status: score >= 75 ? 'MASTERED' : score >= 50 ? 'DEVELOPING' : 'CRITICAL'
            });
          }
          const finalM = currentMap.find(m => m.indicator === indicator)!;
          finalM.status = finalM.averageScore >= 75 ? 'MASTERED' : finalM.averageScore >= 50 ? 'DEVELOPING' : 'CRITICAL';
        });
        students[stIdx].masteryMap = currentMap;
        await supabase.from('uba_persistence').upsert({ id: `${schoolId}_students`, hub_id: schoolId, payload: students });
      }
    }

    supabase.from('uba_persistence').upsert({
       id: `practice_res_${studentId}_${activeTest.id}`,
       hub_id: schoolId,
       payload: { score: percentage, completedAt: new Date().toISOString() }
    });
  };

  if (isCompleted) {
    return (
      <div className="p-12 bg-white rounded-[3rem] shadow-2xl text-center space-y-8 animate-in zoom-in-95">
         <div className="w-32 h-32 bg-blue-900 text-white rounded-full flex items-center justify-center mx-auto text-4xl font-black shadow-xl border-8 border-blue-50">
           {finalScore}%
         </div>
         <div className="space-y-2">
            <h3 className="text-3xl font-black text-slate-900 uppercase">Evaluation Synchronized</h3>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Shard Recorded in Institutional Ledger</p>
         </div>
         <button onClick={() => setActiveTest(null)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase">Return to Hub</button>
      </div>
    );
  }

  if (activeTest) {
    const q = activeTest.questions[currentQIndex];
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const hasSubmitted = submittedQs[q.id];
    
    // Calculate expected words for theory
    const expectedWords = q.type === 'THEORY' ? (q.answerScheme || "").split(/\s+/).filter(w => w.length > 2).length : 0;

    return (
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[300] flex items-center justify-center p-4 md:p-10 font-sans">
         <div className="w-full max-w-4xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95">
            
            {/* HUD */}
            <div className="bg-slate-900 p-8 flex justify-between items-center text-white shrink-0">
               <div className="space-y-1">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{activeTest.subject} SHARD</span>
                  <h4 className="text-sm font-black uppercase truncate max-w-[200px] md:max-w-md">{activeTest.title}</h4>
               </div>
               <div className="flex items-center gap-8">
                  <div className="text-right hidden md:block">
                     <span className="text-[8px] font-black text-slate-500 uppercase block">Cognitive Node</span>
                     <span className="text-xs font-mono font-bold text-indigo-300">{q.indicator}</span>
                  </div>
                  <div className="text-right">
                     <span className="text-[8px] font-black text-slate-500 uppercase block">Time Remaining</span>
                     <span className={`text-2xl font-mono font-black ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                       {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
                     </span>
                  </div>
               </div>
            </div>

            {/* Question Workspace */}
            <div className="flex-1 overflow-y-auto p-8 md:p-14 space-y-10 custom-scrollbar">
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-[9px] font-black uppercase">Item {currentQIndex + 1} of {activeTest.questions.length}</span>
                     {q.type === 'THEORY' && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-1 rounded-full">
                           <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                           <span className="text-[9px] font-black text-amber-700 uppercase">Clue: Expected Response ~{expectedWords} words</span>
                        </div>
                     )}
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase leading-relaxed">
                     "{q.questionText}"
                  </h3>
               </div>

               {q.type === 'OBJECTIVE' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                        const isCorrect = opt.toLowerCase() === (q.correctKey || "").toLowerCase();
                        const isSelected = answers[q.id] === opt;
                        
                        let btnClass = "bg-slate-50 border-gray-100 text-slate-700 hover:border-blue-400";
                        if (hasSubmitted) {
                           if (isCorrect) btnClass = "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20";
                           else if (isSelected) btnClass = "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20";
                           else btnClass = "bg-slate-50 border-gray-100 text-slate-300 grayscale opacity-40";
                        } else if (isSelected) {
                           btnClass = "bg-blue-900 border-blue-900 text-white shadow-xl";
                        }

                        return (
                           <button 
                             key={opt}
                             disabled={hasSubmitted}
                             onClick={() => handleSelectObjective(q.id, opt)}
                             className={`p-6 rounded-[2rem] border-2 transition-all flex items-center gap-6 text-left group ${btnClass}`}
                           >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${isSelected || (hasSubmitted && isCorrect) ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                 {opt}
                              </div>
                              <span className="text-xs font-black uppercase tracking-tight">Option Participant {opt} Instance</span>
                           </button>
                        );
                     })}
                  </div>
               ) : (
                  <div className="space-y-6">
                     <textarea 
                        value={answers[q.id] || ""}
                        onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
                        placeholder="Construct your theoretical response shard..."
                        className="w-full bg-slate-50 border-2 border-gray-100 rounded-[2.5rem] p-8 md:p-10 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[250px] shadow-inner uppercase"
                     />
                  </div>
               )}

               {hasSubmitted && q.type === 'OBJECTIVE' && (
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white animate-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Master Proctor Validation</span>
                        <span className={`text-[10px] font-black uppercase ${answers[q.id] === q.correctKey ? 'text-emerald-400' : 'text-red-400'}`}>
                           {answers[q.id] === q.correctKey ? 'Precision Verified' : 'Logic Discrepancy'}
                        </span>
                     </div>
                     <p className="text-xs font-bold text-slate-300 italic uppercase">"The correct logical shard for this instance is alternative {q.correctKey}. {q.answerScheme}"</p>
                  </div>
               )}
            </div>

            {/* Footer Navigation */}
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
               <button 
                 disabled={currentQIndex === 0}
                 onClick={() => setCurrentQIndex(prev => prev - 1)}
                 className="px-8 py-4 bg-white border border-gray-200 text-slate-400 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-50 disabled:opacity-0 transition-all"
               >Back</button>
               
               <div className="flex-1 flex justify-center items-center">
                  <div className="flex gap-1.5">
                     {activeTest.questions.map((_, idx) => (
                        <div key={idx} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentQIndex ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-300'}`}></div>
                     ))}
                  </div>
               </div>

               {currentQIndex === activeTest.questions.length - 1 ? (
                 <button onClick={handleCompleteTest} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all">Submit Session</button>
               ) : (
                 <button 
                   onClick={() => {
                      if (q.type === 'OBJECTIVE' && !hasSubmitted) return alert("Verify alternative before proceeding.");
                      setCurrentQIndex(prev => prev + 1);
                   }} 
                   className="px-10 py-4 bg-blue-900 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg active:scale-95 transition-all"
                 >Continue Shard</button>
               )}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
         <h3 className="text-2xl font-black uppercase tracking-tight">Rapid Practice Hub</h3>
         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em] mt-1">Autonomous Cohort Cognitive Evaluation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assignments.map(ass => (
          <div key={ass.id} className="bg-white border border-gray-100 p-8 rounded-[3rem] shadow-xl flex justify-between items-center group hover:border-blue-400 transition-all">
             <div className="space-y-2">
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{ass.subject} • {ass.timeLimit} Min</span>
                <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{ass.title}</h4>
                <p className="text-[8px] text-slate-400 font-bold uppercase">Evaluator: {ass.pushedBy}</p>
             </div>
             <button onClick={() => handleStartTest(ass)} className="bg-blue-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 3l14 9-14 9V3z"/></svg>
             </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PupilPracticeHub;
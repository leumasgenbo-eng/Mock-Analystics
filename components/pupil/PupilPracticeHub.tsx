import React, { useState, useEffect, useMemo } from 'react';
import { PracticeAssignment, MasterQuestion, TopicMastery, StudentData } from '../../types';
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
    setCurrentQIndex(0);
    setTimeLeft(test.timeLimit * 60);
    setIsCompleted(false);
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
          if (matchRate >= 0.95) qEarned = q.weight;
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

    // Update Student Mastery Map
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
              strand: data.strand,
              subStrand: data.subStrand,
              indicator,
              averageScore: score,
              attempts: 1,
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
            <h3 className="text-3xl font-black text-slate-900 uppercase">Assessment Complete</h3>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Mastery Shard Updated in Live Registry</p>
         </div>
         <button onClick={() => setActiveTest(null)} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase">Back to Hub</button>
      </div>
    );
  }

  if (activeTest) {
    const q = activeTest.questions[currentQIndex];
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
      <div className="p-10 bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 space-y-10 animate-in slide-in-from-right-10">
         <div className="flex justify-between items-center bg-slate-950 p-6 rounded-[2rem] text-white">
            <div className="space-y-1">
               <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Active Practice</span>
               <h4 className="text-sm font-black uppercase">{activeTest.title}</h4>
            </div>
            <div className="text-right">
               <span className="text-[8px] font-black text-slate-500 uppercase block">Time Remaining</span>
               <span className={`text-2xl font-mono font-black ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                 {mins.toString().padStart(2, '0')}:{secs.toString().padStart(2, '0')}
               </span>
            </div>
         </div>

         <div className="space-y-8">
            <div className="flex justify-between items-end">
               <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-[9px] font-black uppercase">Shard {currentQIndex + 1} OF {activeTest.questions.length}</span>
               <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Focus Area</span>
                  <span className="text-[10px] font-black text-blue-900 uppercase">{q.strand} → {q.indicator}</span>
               </div>
            </div>
            <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-gray-100">
               <p className="text-lg font-black text-slate-800 uppercase leading-relaxed">"{q.questionText}"</p>
            </div>
            
            <textarea 
               value={answers[q.id] || ""}
               onChange={e => setAnswers({...answers, [q.id]: e.target.value})}
               placeholder="Enter your response shard..."
               className="w-full bg-white border-2 border-gray-100 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 min-h-[200px] shadow-inner uppercase"
            />
         </div>

         <div className="flex gap-4 pt-6">
            <button 
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex(prev => prev - 1)}
              className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px]"
            >Prev Shard</button>
            
            {currentQIndex === activeTest.questions.length - 1 ? (
              <button onClick={handleCompleteTest} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Finalize Evaluation</button>
            ) : (
              <button onClick={() => setCurrentQIndex(prev => prev + 1)} className="flex-[2] bg-blue-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Next Shard</button>
            )}
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
         <h3 className="text-2xl font-black uppercase tracking-tight">Practice Hub</h3>
         <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.4em] mt-1">Autonomous Cohort Evaluation Module</p>
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

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  SchoolRegistryEntry, 
  MasterQuestion, 
  SerializedExam, 
  QuestionPack, 
  SerializationData,
  BloomsScale,
  QuestionSubPart
} from '../../types';
import { SUBJECT_LIST } from '../../constants';
import EditableField from '../shared/EditableField';

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const QuestionSerializationPortal: React.FC<{ registry: SchoolRegistryEntry[] }> = ({ registry }) => {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_LIST[0]);
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'MATRIX' | 'EMBOSS' | 'NETWORK'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Global Instructions Control
  const [embossConfig, setEmbossConfig] = useState({
    academyName: 'SS-map ACADEMY',
    academyAddress: 'ACCRA DIGITAL CENTRE, GHANA',
    academyContact: '+233 24 350 4091',
    generalRules: 'Candidates must answer all questions in Section A. Use black or blue pen only.',
    sectionAInstructions: 'Answer all 40 items. 1 mark each.',
    sectionBInstructions: 'Answer any 4 questions. Each question carries sub-parts.'
  });

  const bankId = `master_bank_${selectedSubject.replace(/\s+/g, '')}`;

  useEffect(() => {
    const fetchExisting = async () => {
      try {
        const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
        if (data?.payload && Array.isArray(data.payload)) {
          setMasterQuestions(data.payload);
        } else {
          setMasterQuestions([]);
        }
      } catch (err) {
        setMasterQuestions([]);
      }
    };
    fetchExisting();
  }, [selectedSubject, bankId]);

  const handleAddTheoryRow = () => {
    const nextIdx = masterQuestions.length + 1;
    const newQ: MasterQuestion = {
      id: `MQ-${Date.now()}-${nextIdx}`,
      originalIndex: nextIdx,
      type: 'THEORY',
      strand: 'New Strand',
      subStrand: 'Sub-Strand',
      indicator: 'B9.x.x.x',
      questionText: 'ENTER MAIN QUESTION TEXT...',
      instruction: 'Answer all parts.',
      correctKey: 'RUBRIC',
      weight: 10,
      blooms: 'Knowledge',
      parts: [
        { partLabel: 'a.i', text: 'Part description...', possibleAnswers: '', markingScheme: 'Marking scheme...', weight: 2, blooms: 'Knowledge' }
      ],
      answerScheme: 'Overall assessment criteria...'
    };
    setMasterQuestions([...masterQuestions, newQ]);
  };

  const handleAdd40Objectives = () => {
    const newObjs: MasterQuestion[] = Array.from({ length: 40 }, (_, i) => ({
      id: `MQ-OBJ-${Date.now()}-${i + 1}`,
      originalIndex: masterQuestions.length + i + 1,
      type: 'OBJECTIVE',
      strand: 'GENERAL',
      subStrand: 'CORE',
      indicator: `B9.1.1.1.${i + 1}`,
      questionText: `Objective Item #${i + 1}`,
      instruction: 'Choose the most appropriate option.',
      correctKey: 'A',
      weight: 1,
      blooms: 'Knowledge',
      parts: [],
      answerScheme: 'Option A'
    }));
    setMasterQuestions([...masterQuestions, ...newObjs]);
  };

  const handleSaveMasterBank = async () => {
    setIsProcessing(true);
    try {
      await supabase.from('uba_persistence').upsert({
        id: bankId,
        payload: masterQuestions,
        last_updated: new Date().toISOString()
      });
      alert("MASTER HUB SYNCHRONIZED.");
    } catch (e) {
      alert("Persistence Failure.");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateQuestion = (id: string, field: keyof MasterQuestion, value: any) => {
    setMasterQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const createPack = (variant: 'A' | 'B' | 'C' | 'D', bank: MasterQuestion[]): QuestionPack => {
    const objs = bank.filter(q => q.type === 'OBJECTIVE');
    const theories = bank.filter(q => q.type === 'THEORY');
    const scrambledObjs = variant === 'A' ? objs : shuffle(objs);
    const scrambledTheories = variant === 'A' ? theories : shuffle(theories);
    const matchingMatrix: Record<string, { masterIdx: number; key: string; scheme: string }> = {};
    scrambledObjs.forEach((q, idx) => {
      matchingMatrix[`OBJ_${idx+1}`] = { masterIdx: q.originalIndex, key: q.correctKey, scheme: q.answerScheme };
    });
    return {
      variant,
      generalRules: embossConfig.generalRules,
      sectionInstructions: { A: embossConfig.sectionAInstructions, B: embossConfig.sectionBInstructions },
      objectives: scrambledObjs,
      theory: scrambledTheories,
      schemeCode: `UBA-SC-${variant}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      matchingMatrix
    };
  };

  const propagateToAllNodes = async () => {
    if (!masterQuestions || masterQuestions.length === 0) return alert("Populate Master Bank.");
    setIsProcessing(true);
    setProgress(0);
    const mockKey = selectedMock.replace(/\s+/g, '');
    const subKey = selectedSubject.replace(/\s+/g, '');

    try {
      for (let i = 0; i < registry.length; i++) {
        const school = registry[i];
        const newExam: SerializedExam = {
          schoolId: school.id,
          mockSeries: selectedMock,
          subject: selectedSubject,
          packs: { A: createPack('A', masterQuestions), B: createPack('B', masterQuestions), C: createPack('C', masterQuestions), D: createPack('D', masterQuestions) },
          timestamp: new Date().toISOString()
        };
        await supabase.from('uba_persistence').upsert({ id: `serialized_exam_${school.id}_${mockKey}_${subKey}`, payload: newExam });
        setProgress(Math.round(((i + 1) / registry.length) * 100));
      }
      alert("NETWORK DEPLOYMENT COMPLETE.");
    } catch (e) {
      alert("Deployment Interrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-6 bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Command Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter flex items-center gap-3">
             <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
             Master Hub Ingestion & Serialization
          </h2>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Active Node: {selectedSubject}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {SUBJECT_LIST.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={selectedMock} onChange={e => setSelectedMock(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {['MOCK 1', 'MOCK 2', 'MOCK 3', 'MOCK 4', 'MOCK 5'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={propagateToAllNodes} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
             {isProcessing ? `Deploying ${progress}%` : 'Apply to Network'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'EMBOSS'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'INGEST' ? 'Question Ingestion' : tab === 'PACKS' ? 'Variant Monitor' : 'Paper Embossing'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'INGEST' && (
          <div className="h-full flex flex-col space-y-6">
            
            {(!masterQuestions || masterQuestions.length === 0) ? (
               <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/50 border border-slate-800 border-dashed rounded-[3rem] p-20 text-center animate-in zoom-in-95">
                  <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 shadow-inner">
                     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500"><path d="M12 2v20m10-10H2"/></svg>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight">Ingestion Hub Ready</h3>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] max-w-sm">No institutional submissions found for {selectedSubject}. Start by auto-generating or manual entry.</p>
                  </div>
                  <div className="flex gap-4">
                     <button onClick={handleAdd40Objectives} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-500 transition-all">+ 40 Objectives</button>
                     <button onClick={handleAddTheoryRow} className="bg-white/10 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase border border-white/20 hover:bg-white/20 transition-all">+ Add Theory</button>
                  </div>
               </div>
            ) : (
               <>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Global Instructions</label>
                      <textarea value={embossConfig.generalRules} onChange={e=>setEmbossConfig({...embossConfig, generalRules: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Sec A Instructions</label>
                      <textarea value={embossConfig.sectionAInstructions} onChange={e=>setEmbossConfig({...embossConfig, sectionAInstructions: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Sec B Instructions</label>
                      <textarea value={embossConfig.sectionBInstructions} onChange={e=>setEmbossConfig({...embossConfig, sectionBInstructions: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
                   </div>
                </div>

                <div className="flex gap-4">
                   <button onClick={handleAdd40Objectives} className="bg-blue-600/20 text-blue-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-blue-500/30 hover:bg-blue-600 transition-all">+ Objective</button>
                   <button onClick={handleAddTheoryRow} className="bg-indigo-600/20 text-indigo-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-indigo-500/30 hover:bg-indigo-600 transition-all">+ Theory</button>
                   <button onClick={handleSaveMasterBank} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl ml-auto">Sync Master Hub</button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-900 rounded-[2rem] border border-slate-800 custom-scrollbar">
                   <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-950 sticky top-0 z-10 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                         <tr>
                            <th className="px-6 py-4 w-12 text-center">Sec</th>
                            <th className="px-4 py-4 w-12 text-center">Q#</th>
                            <th className="px-6 py-4">Content & Instructions</th>
                            <th className="px-6 py-4 w-64">Assessment Key/Parts</th>
                            <th className="px-4 py-4 text-center">Weight</th>
                            <th className="px-4 py-4 text-center">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                         {masterQuestions.map((q) => (
                            <tr key={q.id} className="hover:bg-blue-900/10 group transition-colors">
                               <td className="px-6 py-4 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black ${q.type === 'THEORY' ? 'bg-indigo-500' : 'bg-blue-500'} text-white`}>
                                     {q.type === 'THEORY' ? 'B' : 'A'}
                                  </span>
                               </td>
                               <td className="px-4 py-4 text-center font-black text-slate-500">{q.originalIndex}</td>
                               <td className="px-6 py-4 space-y-2">
                                  <input value={q.instruction} onChange={e=>updateQuestion(q.id, 'instruction', e.target.value)} className="w-full bg-transparent outline-none italic text-[9px] text-slate-500" placeholder="Instruction..." />
                                  <textarea value={q.questionText} onChange={e=>updateQuestion(q.id, 'questionText', e.target.value.toUpperCase())} className="w-full bg-transparent outline-none text-[11px] font-bold text-slate-200 resize-none" rows={2} />
                                  <div className="flex gap-4">
                                     <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Strand: {q.strand}</span>
                                     <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Indicator: {q.indicator}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4 space-y-2">
                                  {q.type === 'OBJECTIVE' ? (
                                    <div className="flex items-center gap-3">
                                       <span className="text-[8px] font-black text-slate-600 uppercase">Master Key:</span>
                                       <select value={q.correctKey} onChange={e=>updateQuestion(q.id, 'correctKey', e.target.value)} className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] font-black text-blue-400 outline-none">
                                          {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
                                       </select>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                       {q.parts?.map((p, pi) => (
                                          <div key={pi} className="flex gap-2 items-center">
                                             <span className="text-[8px] font-black text-indigo-400 w-6 uppercase">{p.partLabel}</span>
                                             <input value={p.text} onChange={e=>{
                                                const nextParts = [...(q.parts || [])];
                                                nextParts[pi].text = e.target.value;
                                                updateQuestion(q.id, 'parts', nextParts);
                                             }} className="bg-transparent border-b border-slate-800 text-[10px] text-slate-300 flex-1 outline-none" />
                                          </div>
                                       ))}
                                    </div>
                                  )}
                               </td>
                               <td className="px-4 py-4 text-center font-mono font-black text-slate-400">
                                  <input type="number" value={q.weight} onChange={e=>updateQuestion(q.id, 'weight', parseInt(e.target.value)||0)} className="w-10 bg-transparent text-center outline-none" />
                               </td>
                               <td className="px-4 py-4 text-center">
                                  <button onClick={()=>setMasterQuestions(prev=>prev.filter(x=>x.id!==q.id))} className="text-slate-700 hover:text-red-500 transition-colors">
                                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                  </button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
               </>
            )}
          </div>
        )}

        {activeTab === 'EMBOSS' && (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
             <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
             <p className="font-black uppercase text-xs tracking-widest">Embossing Module Active — Live Preview Pending Serialization</p>
          </div>
        )}

        {activeTab === 'PACKS' && (
           <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
             <p className="font-black uppercase text-xs tracking-widest">Variant Generation Monitor Operational</p>
           </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default QuestionSerializationPortal;

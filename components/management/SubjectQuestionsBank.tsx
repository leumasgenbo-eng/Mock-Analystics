
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion, StaffAssignment, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: StaffAssignment | null;
  subjects: string[];
  settings: GlobalSettings;
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects, settings }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.taughtSubject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [basket, setBasket] = useState<MasterQuestion[]>([]);
  
  const fetchBank = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('uba_persistence').select('payload').like('id', 'likely_%');
    if (data) {
      const flat: MasterQuestion[] = [];
      data.forEach(row => {
        if (Array.isArray(row.payload)) {
          row.payload.forEach(q => {
            if (q.subject === selectedSubject) flat.push(q);
          });
        }
      });
      setMasterBank(flat);
    }
    setIsLoading(false);
  }, [selectedSubject]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  // Group by Indicator
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, MasterQuestion[]> = {};
    masterBank.forEach(q => {
      const key = `${q.indicatorCode || 'N/A'} - ${q.indicator || 'GENERAL'}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(q);
    });
    return groups;
  }, [masterBank]);

  const toggleBasket = (q: MasterQuestion) => {
    setBasket(prev => prev.some(x => x.id === q.id) ? prev.filter(x => x.id !== q.id) : [...prev, q]);
  };

  const handleForwardToPracticeHub = async () => {
    if (basket.length === 0) return alert("Select shards to forward.");
    setIsSyncing(true);
    try {
      const hubId = settings.schoolNumber;
      const subKey = selectedSubject.replace(/\s+/g, '');
      const shardId = `practice_shards_${hubId}_${subKey}`;

      await supabase.from('uba_instructional_shards').upsert({
        id: shardId,
        hub_id: hubId,
        payload: {
          id: shardId,
          title: `Practice: ${selectedSubject}`,
          subject: selectedSubject,
          timeLimit: 30,
          questions: basket,
          pushedBy: activeFacilitator?.name || 'ADMIN',
          timestamp: new Date().toISOString()
        }
      });
      alert("MATRIX HANDSHAKE SUCCESSFUL: Selected shards mirrored to Pupil Practice Hub.");
    } catch (e) {
      alert("Sync Interrupted.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadTextFile = () => {
    if (basket.length === 0) return alert("Basket is vacant.");
    
    let content = `UNITED BAYLOR ACADEMY - ASSESSMENT SHARDS\n`;
    content += `SUBJECT: ${selectedSubject.toUpperCase()}\n`;
    content += `DATE: ${new Date().toLocaleDateString()}\n`;
    content += `==========================================\n\n`;
    
    content += `SECTION I: EXAMINATION ITEMS\n`;
    content += `------------------------------------------\n\n`;
    basket.forEach((q, i) => {
      content += `[${i + 1}] TYPE: ${q.type}\n`;
      if (q.instruction) content += `INSTRUCTION: ${q.instruction}\n`;
      content += `CONTENT: ${q.questionText}\n`;
      if (q.diagramUrl) content += `ATTACHED DIAGRAM NODE: ${q.diagramUrl}\n`;
      content += `STRAND: ${q.strandCode} ${q.strand} | INDICATOR: ${q.indicatorCode} ${q.indicator}\n\n`;
    });

    content += `\nSECTION II: VERIFIED ANSWERS & SCHEMES\n`;
    content += `------------------------------------------\n\n`;
    basket.forEach((q, i) => {
      content += `[${i + 1}] RESULT: ${q.correctKey || q.answerScheme || 'NO RUBRIC STORED'}\n`;
      content += `BLOOM SCALE: ${q.blooms}\n`;
      content += `SUBMITTER: ${q.facilitatorName || 'NETWORK_CORE'}\n`;
      content += `------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UBA_Shards_${selectedSubject.replace(/\s/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    alert("EXTRACTION SUCCESSFUL: Questions and Answers Partitioned.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans pb-32">
      {isSyncing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex flex-col items-center justify-center space-y-6">
           <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Mirroring Shards to Cloud Shard Table...</p>
        </div>
      )}

      <div className="bg-slate-950 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-3 text-center xl:text-left">
              <h2 className="text-3xl font-black uppercase tracking-tight">Instructional Shard Bank</h2>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.5em]">United Baylor Network-Wide Mastery Ledger</p>
           </div>
           <div className="flex bg-white/5 p-1.5 rounded-3xl border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                  {s}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Shard Basket */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-xl space-y-8 h-fit sticky top-24">
              <div className="space-y-1">
                 <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Active Extraction Basket</h4>
                 <p className="text-[9px] font-bold text-slate-400 uppercase">{basket.length} Selected Shards</p>
              </div>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
                 {basket.map(q => (
                    <div key={q.id} className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100 group animate-in slide-in-from-left-2">
                       <p className="text-[10px] font-black text-blue-900 uppercase truncate max-w-[200px]">{q.questionText}</p>
                       <button onClick={() => toggleBasket(q)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                       </button>
                    </div>
                 ))}
                 {basket.length === 0 && <div className="py-12 text-center opacity-20 italic text-[10px] uppercase font-black">Basket is vacant</div>}
              </div>

              <div className="pt-4 space-y-4">
                 <button 
                   onClick={handleForwardToPracticeHub}
                   disabled={basket.length === 0}
                   className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all disabled:opacity-40"
                 >
                   Push to Practice Hub
                 </button>
                 <button 
                   onClick={handleDownloadTextFile}
                   disabled={basket.length === 0}
                   className="w-full bg-slate-950 hover:bg-black text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl transition-all disabled:opacity-40"
                 >
                   Download Notepad (.txt)
                 </button>
              </div>
           </div>
        </div>

        {/* Shard Explorer */}
        <div className="lg:col-span-8 space-y-12">
           {isLoading ? (
              <div className="py-40 flex flex-col items-center justify-center gap-6 opacity-30">
                 <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-[10px] font-black uppercase tracking-0.4em">Querying Global Register...</p>
              </div>
           ) : (
             // Fix: Cast Object.entries to [string, MasterQuestion[]][] to resolve unknown type errors for qList access
             (Object.entries(groupedQuestions) as [string, MasterQuestion[]][]).map(([indicatorKey, qList]) => (
                <div key={indicatorKey} className="bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden animate-in fade-in duration-700">
                   <div className="bg-slate-900 px-10 py-6 border-b border-white/5 flex justify-between items-center">
                      <div className="space-y-1">
                         <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Indicator Node</span>
                         <h4 className="text-xs font-black text-white uppercase">{indicatorKey}</h4>
                      </div>
                      <span className="bg-white/10 text-white/60 px-3 py-1 rounded-full text-[8px] font-black uppercase">{qList.length} SHARDS</span>
                   </div>
                   <div className="divide-y divide-gray-50">
                      {qList.map(q => {
                        const isSelected = basket.some(x => x.id === q.id);
                        return (
                          <div key={q.id} className="p-8 hover:bg-slate-50 transition-colors flex items-start gap-8 group">
                             <button 
                               onClick={() => toggleBasket(q)}
                               className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-gray-100 text-transparent group-hover:border-blue-200'}`}
                             >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                             </button>
                             <div className="flex-1 space-y-4">
                                <div className="flex justify-between items-start">
                                   <div className="space-y-1">
                                      <p className="text-[13px] font-black text-slate-800 uppercase leading-relaxed">"{q.questionText}"</p>
                                      <div className="flex items-center gap-4 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                         <span>Strand: {q.strandCode || 'S0'}</span>
                                         <span>•</span>
                                         <span>Bloom: {q.blooms}</span>
                                         <span>•</span>
                                         <span>Type: {q.type}</span>
                                      </div>
                                   </div>
                                </div>
                                {q.diagramUrl && (
                                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                     <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-2">Diagram Payload</span>
                                     <code className="text-[10px] font-mono text-blue-900 break-all">{q.diagramUrl}</code>
                                  </div>
                                )}
                                <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[9px] font-black uppercase text-slate-300">
                                   <span>Submitter: {q.facilitatorName} ({q.facilitatorCode})</span>
                                   <span className="text-emerald-500">{isSelected ? 'Added to Extraction' : 'In Cloud Storage'}</span>
                                </div>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>
             ))
           )}
           {masterBank.length === 0 && !isLoading && (
              <div className="py-60 text-center opacity-20 flex flex-col items-center gap-6 border-4 border-dashed border-gray-100 rounded-[4rem]">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20m10-10H2"/></svg>
                 <p className="font-black uppercase text-sm tracking-[0.5em]">No instructional shards found for this subject</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;

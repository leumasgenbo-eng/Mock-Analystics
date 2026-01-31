
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface SubjectQuestionsBankProps {
  activeFacilitator?: { name: string; subject: string; schoolId?: string } | null;
  subjects: string[];
}

const SubjectQuestionsBank: React.FC<SubjectQuestionsBankProps> = ({ activeFacilitator, subjects }) => {
  const [selectedSubject, setSelectedSubject] = useState(activeFacilitator?.subject || subjects[0]);
  const [masterBank, setMasterBank] = useState<MasterQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [collectedQs, setCollectedQs] = useState<{ objectives: MasterQuestion[], theory: MasterQuestion[] }>({ objectives: [], theory: [] });
  
  // 3-Tier Filter State
  const [filterStrand, setFilterStrand] = useState('ALL');
  const [filterSubStrand, setFilterSubStrand] = useState('ALL');
  const [filterIndicator, setFilterIndicator] = useState('ALL');
  
  const [visibleShards, setVisibleShards] = useState<MasterQuestion[]>([]);
  const [editingQ, setEditingQ] = useState<MasterQuestion | null>(null);

  const fetchBank = useCallback(async () => {
    setIsLoading(true);
    const bankId = `master_bank_${selectedSubject.trim().replace(/\s+/g, '')}`;
    try {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      const questions = (data?.payload as MasterQuestion[]) || [];
      setMasterBank(questions);
    } catch (err) {
      setMasterBank([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => { fetchBank(); }, [fetchBank]);

  // Hierarchical Filter Shards
  const strandList = useMemo(() => ['ALL', ...Array.from(new Set(masterBank.map(q => q.strand)))].filter(Boolean), [masterBank]);
  
  const subStrandList = useMemo(() => {
    const subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.subStrand)))].filter(Boolean);
  }, [masterBank, filterStrand]);

  const indicatorList = useMemo(() => {
    let subset = filterStrand === 'ALL' ? masterBank : masterBank.filter(q => q.strand === filterStrand);
    if (filterSubStrand !== 'ALL') subset = subset.filter(q => q.subStrand === filterSubStrand);
    return ['ALL', ...Array.from(new Set(subset.map(q => q.indicator)))].filter(Boolean);
  }, [masterBank, filterStrand, filterSubStrand]);

  useEffect(() => {
    const pool = masterBank.filter(q => {
      const matchS = filterStrand === 'ALL' || q.strand === filterStrand;
      const matchSS = filterSubStrand === 'ALL' || q.subStrand === filterSubStrand;
      const matchI = filterIndicator === 'ALL' || q.indicator === filterIndicator;
      return matchS && matchSS && matchI;
    });
    setVisibleShards(pool);
  }, [masterBank, filterStrand, filterSubStrand, filterIndicator]);

  const toggleCollect = (q: MasterQuestion, folder: 'objectives' | 'theory') => {
    setCollectedQs(prev => {
      const current = prev[folder];
      const exists = current.some(x => x.id === q.id);
      return { ...prev, [folder]: exists ? current.filter(x => x.id !== q.id) : [...current, q] };
    });
  };

  const handleForwardToPupils = async () => {
    const allSelected = [...collectedQs.objectives, ...collectedQs.theory];
    if (allSelected.length === 0) return alert("Collect shards from bank first.");
    
    const timeLimit = prompt("Set session duration (minutes):", "30");
    if (!timeLimit) return;

    const hubId = activeFacilitator?.schoolId || 'GLOBAL';
    const subKey = selectedSubject.trim().replace(/\s+/g, '');
    
    const payload = {
      id: `PRACTICE-${Date.now()}`,
      title: `${selectedSubject} Mastery Shard`,
      subject: selectedSubject,
      timeLimit: parseInt(timeLimit),
      questions: allSelected, // Keeps order
      pushedBy: activeFacilitator?.name || 'FACILITATOR',
      timestamp: new Date().toISOString()
    };

    try {
      await supabase.from('uba_persistence').upsert({
        id: `practice_shards_${hubId}_${subKey}`,
        hub_id: hubId,
        payload: payload,
        last_updated: new Date().toISOString()
      });
      alert("INSTRUCTIONAL SHARD BROADCAST TO CLOUD.");
    } catch (e) {
      alert("Broadcast failed.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-1">
              <h2 className="text-2xl font-black uppercase tracking-tight">Curriculum Bank</h2>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Shard Filter & Local Ingestion Hub</p>
           </div>
           <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-xl">
              {subjects.slice(0, 5).map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${selectedSubject === s ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                  {s.substring(0, 3)}
                </button>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Registry Filter Shards */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl space-y-8">
              <div className="space-y-6">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-900 pl-4">Registry Filter Shards</h4>
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Strand</label>
                       <select value={filterStrand} onChange={e=>setFilterStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{strandList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Sub-strand</label>
                       <select value={filterSubStrand} onChange={e=>setFilterSubStrand(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{subStrandList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Indicator</label>
                       <select value={filterIndicator} onChange={e=>setFilterIndicator(e.target.value)} className="w-full bg-slate-50 border rounded-2xl px-5 py-4 text-xs font-black uppercase outline-none">{indicatorList.map(s => <option key={s} value={s}>{s}</option>)}</select>
                    </div>
                    <button onClick={handleForwardToPupils} className="w-full bg-blue-900 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all">Broadcast Shard Set</button>
                 </div>
              </div>
           </div>
        </div>

        {/* Shard Stream */}
        <div className="lg:col-span-8 space-y-6">
           {visibleShards.map((q, idx) => {
              const inObj = collectedQs.objectives.some(x => x.id === q.id);
              const inThy = collectedQs.theory.some(x => x.id === q.id);
              return (
                <div key={q.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-lg overflow-hidden hover:border-blue-400 transition-all flex flex-col group">
                   <div className="p-8 space-y-4">
                      <div className="flex justify-between items-center">
                         <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[8px] font-black uppercase">Shard #{idx+1}</span>
                         <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest">{q.indicator}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 uppercase italic">"{q.questionText}"</h4>
                   </div>
                   <div className="bg-slate-50 p-6 flex gap-4 border-t border-gray-100">
                      <button onClick={() => toggleCollect(q, 'objectives')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${inObj ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-blue-900 border border-gray-200'}`}>Collect Obj</button>
                      <button onClick={() => toggleCollect(q, 'theory')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${inThy ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-900 border border-gray-200'}`}>Collect Theory</button>
                   </div>
                </div>
              );
           })}
        </div>
      </div>
    </div>
  );
};

export default SubjectQuestionsBank;

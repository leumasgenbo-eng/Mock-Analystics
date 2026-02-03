
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlobalSettings, MockResource, QuestionIndicatorMapping, SerializedExam } from '../../types';
import { supabase } from '../../supabaseClient';

interface MockResourcesPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  subjects: string[];
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
}

const MockResourcesPortal: React.FC<MockResourcesPortalProps> = ({ 
  settings, onSettingChange, subjects, isFacilitator, activeFacilitator 
}) => {
  const filteredSubjects = isFacilitator && activeFacilitator ? [activeFacilitator.subject] : subjects;
  const [selectedSubject, setSelectedSubject] = useState(filteredSubjects[0]);
  const [editingIndicator, setEditingIndicator] = useState<QuestionIndicatorMapping | null>(null);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteBuffer, setPasteBuffer] = useState<Partial<QuestionIndicatorMapping>[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<'scheme' | 'question' | null>(null);

  useEffect(() => {
    const fetchSerialized = async () => {
      const mockKey = settings.activeMock.replace(/\s+/g, '');
      const subKey = selectedSubject.replace(/\s+/g, '');
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `serialized_exam_${settings.schoolNumber}_${mockKey}_${subKey}`).maybeSingle();
      if (data?.payload) setSerializedExam(data.payload as SerializedExam);
      else setSerializedExam(null);
    };
    fetchSerialized();
  }, [settings.schoolNumber, settings.activeMock, selectedSubject]);

  const activeResource: MockResource = useMemo(() => {
    return settings.resourcePortal?.[settings.activeMock]?.[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '' };
  }, [settings.resourcePortal, settings.activeMock, selectedSubject]);

  const updateResource = (updates: Partial<MockResource>) => {
    const currentPortal = settings.resourcePortal || {};
    const mockData = currentPortal[settings.activeMock] || {};
    const subjectData = mockData[selectedSubject] || { indicators: [], questionUrl: '', schemeUrl: '' };
    onSettingChange('resourcePortal', {
      ...currentPortal, [settings.activeMock]: { ...mockData, [selectedSubject]: { ...subjectData, ...updates } }
    });
  };

  const getNextQRef = (section: 'A' | 'B') => {
    const existing = activeResource.indicators.filter(i => i.section === section).map(i => parseInt(i.questionRef)).filter(n => !isNaN(n));
    return existing.length > 0 ? (Math.max(...existing) + 1).toString() : "1";
  };

  const handleDownloadPack = (variant: 'A' | 'B' | 'C' | 'D') => {
    if (!serializedExam) return;
    const pack = serializedExam.packs[variant];
    let content = `UNITED BAYLOR ACADEMY - OFFICIAL SERIALIZED EXAM\n`;
    content += `VARIANT: ${variant} | SCHEME CODE: ${pack.schemeCode}\n`;
    content += `SUBJECT: ${selectedSubject} | SCHOOL: ${settings.schoolName}\n`;
    content += `========================================================\n\n`;
    content += `GENERAL INSTRUCTIONS: ${pack.generalRules}\n\n`;
    
    content += `SECTION A: ${pack.sectionInstructions.A}\n--------------------------------------------------------\n`;
    pack.objectives.forEach((q, i) => { content += `${i+1}. ${q.questionText}\n`; });
    
    content += `\nSECTION B: ${pack.sectionInstructions.B}\n--------------------------------------------------------\n`;
    pack.theory.forEach((q, i) => { content += `${i+1}. ${q.questionText}\n`; });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `Exam_${selectedSubject}_Variant_${variant}.txt`; link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 font-sans">
      
      <header className="bg-slate-950 text-white p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative flex flex-col xl:flex-row justify-between items-center gap-10">
           <div className="space-y-2 text-center xl:text-left">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em]">Institutional Resource Hub</h3>
              <p className="text-3xl font-black uppercase tracking-tight leading-none">
                {selectedSubject} <span className="text-blue-500 mx-2">/</span> {settings.activeMock}
              </p>
           </div>
           {!isFacilitator && (
             <div className="flex flex-wrap bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-md overflow-x-auto no-scrollbar max-w-full z-10">
                {subjects.map(s => (
                  <button key={s} onClick={() => setSelectedSubject(s)} className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${selectedSubject === s ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    {s}
                  </button>
                ))}
             </div>
           )}
        </div>
      </header>

      {/* NEW SECTION: Serialized Exam Pack (Admin Only) */}
      {!isFacilitator && serializedExam && (
        <section className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden animate-in zoom-in-95">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
           <div className="relative space-y-6">
              <div className="flex items-center gap-4 border-b border-white/10 pb-6">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Official Endorsed Exam Pack</h3>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Serialized Variants (A/B/C/D) Dispatched by HQ</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {(['A', 'B', 'C', 'D'] as const).map(variant => (
                    <button key={variant} onClick={() => handleDownloadPack(variant)} className="bg-white/5 border border-white/10 hover:bg-white/20 p-6 rounded-3xl transition-all flex flex-col items-center gap-3 group">
                       <span className="text-4xl font-black text-indigo-400 group-hover:text-white">{variant}</span>
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Download Node</span>
                    </button>
                 ))}
              </div>
           </div>
        </section>
      )}

      {/* Rest of UI - Indicators Table, etc. */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden">
        <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-8">
           <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-black uppercase text-xs text-slate-900 tracking-widest">Indicator Mapping Ledger</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Authorized Shard Matrix</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => setShowPasteModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
                 Paste Hub Terminal
              </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-8 py-5 text-center w-16">Sec</th>
                <th className="px-6 py-5 w-20">#Q</th>
                <th className="px-6 py-5">Strand Shard</th>
                <th className="px-6 py-5">Sub-Strand</th>
                <th className="px-6 py-5">Code</th>
                <th className="px-6 py-5 min-w-[250px]">Instructional Topic</th>
                <th className="px-6 py-5 text-center w-20">Weight</th>
                <th className="px-6 py-5 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeResource.indicators.map((ind) => (
                <tr key={ind.id} className="hover:bg-blue-50/50 cursor-pointer h-16">
                  <td className="px-8 py-4 text-center"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${ind.section === 'A' ? 'bg-blue-100 text-blue-800' : 'bg-indigo-100 text-indigo-800'}`}>{ind.section}</span></td>
                  <td className="px-6 py-4 font-mono font-black text-[10px] text-blue-900">#{ind.questionRef}</td>
                  <td className="px-6 py-4 font-black text-[10px] text-slate-900 uppercase">{ind.strand || '—'}</td>
                  <td className="px-6 py-4 font-bold text-[10px] text-slate-400 uppercase">{ind.subStrand || '—'}</td>
                  <td className="px-6 py-4 font-mono text-[10px] text-indigo-600 font-black uppercase">{ind.indicatorCode || '—'}</td>
                  <td className="px-6 py-4 text-[10px] font-medium text-slate-600 uppercase truncate max-w-[250px]">{ind.indicator || '—'}</td>
                  <td className="px-6 py-4 text-center"><span className="bg-slate-100 px-3 py-1 rounded-lg font-mono font-black text-xs text-slate-900">{ind.weight}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MockResourcesPortal;

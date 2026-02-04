
import React, { useState } from 'react';
import { GlobalSettings, GradingThresholds } from '../../types';
import { SUBJECT_LIST } from '../../constants';

interface GradingConfigPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
}

const GradingConfigPortal: React.FC<GradingConfigPortalProps> = ({ settings, onSettingChange }) => {
  const [isNrtLocked, setIsNrtLocked] = useState(true);

  const handleUpdateThreshold = (grade: keyof GradingThresholds, value: string) => {
    const num = parseFloat(value);
    onSettingChange('gradingThresholds', { ...settings.gradingThresholds, [grade]: num });
  };

  const toggleSbaEnabled = () => {
    onSettingChange('sbaConfig', { ...settings.sbaConfig, enabled: !settings.sbaConfig.enabled });
  };

  const toggleSbaLocked = () => {
    onSettingChange('sbaConfig', { ...settings.sbaConfig, isLocked: !settings.sbaConfig.isLocked });
  };

  const handleNormalizationChange = (key: string, value: any) => {
    onSettingChange('normalizationConfig', { ...settings.normalizationConfig, [key]: value });
  };

  const grades: (keyof GradingThresholds)[] = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8'];

  const sortingOptions: { value: GlobalSettings['sortOrder']; label: string }[] = [
    { value: 'name-asc', label: 'A - Z' },
    { value: 'name-desc', label: 'Z - A' },
    { value: 'id-asc', label: 'INDEX NUMBER' },
    { value: 'score-desc', label: 'TOTAL SCORE RANK' },
    { value: 'aggregate-asc', label: 'BEST GRADE RANK' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-10">
      
      {/* Assessment Component Thresholds */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-amber-50/50 px-6 py-4 border-b border-amber-100 flex items-center gap-2">
           <div className="w-2 h-2 bg-amber-600 rounded-full"></div>
           <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Component Weighting Thresholds</h3>
        </div>
        <div className="p-6">
           <p className="text-[11px] text-gray-500 font-medium mb-6">Define the maximum allowed raw scores for Objective and Theory papers. The system enforces these during score entry.</p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Objective (Section A) Max Shard</label>
                 <input 
                   type="number" 
                   value={settings.maxSectionA} 
                   onChange={(e) => onSettingChange('maxSectionA', parseInt(e.target.value) || 0)}
                   className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-blue-900 outline-none focus:ring-4 focus:ring-amber-500/10"
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Theory (Section B) Max Shard</label>
                 <input 
                   type="number" 
                   value={settings.maxSectionB} 
                   onChange={(e) => onSettingChange('maxSectionB', parseInt(e.target.value) || 0)}
                   className="w-full bg-slate-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-blue-900 outline-none focus:ring-4 focus:ring-amber-500/10"
                 />
              </div>
           </div>
           <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white flex justify-between items-center shadow-lg border border-white/5">
              <div className="flex flex-col">
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Composite Calibration Total</span>
                 <span className="text-[7px] text-slate-600 uppercase font-bold italic">Should ideally total 100 for standard NRT efficiency</span>
              </div>
              <span className={`text-2xl font-black font-mono ${settings.maxSectionA + settings.maxSectionB === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                {settings.maxSectionA + settings.maxSectionB}%
              </span>
           </div>
        </div>
      </section>

      {/* Report Template Selection */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
           <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
           <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Report Visual Template</h3>
        </div>
        <div className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'standard', label: 'Standard Academy', desc: 'Classic blue-red high-contrast layout' },
                { id: 'minimal', label: 'Modern Minimal', desc: 'Clean white-space with badge UI' },
                { id: 'prestige', label: 'Executive Prestige', desc: 'Serif fonts and centered prestige layout' }
              ].map(tpl => (
                <button 
                   key={tpl.id}
                   onClick={() => onSettingChange('reportTemplate', tpl.id)}
                   className={`p-4 rounded-2xl border-2 text-left transition-all ${settings.reportTemplate === tpl.id ? 'bg-indigo-900 text-white border-indigo-900 shadow-lg scale-105' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-indigo-200'}`}
                >
                   <span className="text-[11px] font-black uppercase block mb-1">{tpl.label}</span>
                   <p className={`text-[9px] ${settings.reportTemplate === tpl.id ? 'text-indigo-200' : 'text-gray-400'}`}>{tpl.desc}</p>
                </button>
              ))}
           </div>
        </div>
      </section>

      {/* SBA Learner Integration */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-blue-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
           <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
           <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">SBA Learner Integration</h3>
        </div>
        <div className="p-6 space-y-6">
           <p className="text-[11px] text-gray-500 font-medium">Determine if Proposed SBA should be included in final grading and define master sorting.</p>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sort scores by:</label>
                 <div className="grid grid-cols-1 gap-2">
                    {sortingOptions.map(opt => (
                       <button 
                         key={opt.value}
                         onClick={() => onSettingChange('sortOrder', opt.value)}
                         className={`w-full text-left px-4 py-3 rounded-xl border font-black text-[10px] uppercase transition-all ${settings.sortOrder === opt.value ? 'bg-blue-900 text-white border-blue-900 shadow-md' : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-blue-200'}`}
                       >
                          {opt.label}
                       </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">SBA Control Settings:</label>
                 <div className="flex flex-col gap-3">
                    <button 
                      onClick={toggleSbaEnabled}
                      className={`flex items-center justify-between px-4 py-4 rounded-xl border font-black text-[10px] uppercase transition-all ${!settings.sbaConfig.enabled ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}
                    >
                       <span>{settings.sbaConfig.enabled ? 'SBA Included' : 'Exclude SBA'}</span>
                       <div className={`w-10 h-5 rounded-full p-1 transition-colors ${settings.sbaConfig.enabled ? 'bg-green-600' : 'bg-red-600'}`}>
                          <div className={`bg-white w-3 h-3 rounded-full transition-transform ${settings.sbaConfig.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                       </div>
                    </button>
                    
                    <button 
                      onClick={toggleSbaLocked}
                      className={`flex items-center justify-between px-4 py-4 rounded-xl border font-black text-[10px] uppercase transition-all ${settings.sbaConfig.isLocked ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-blue-900 border-blue-100'}`}
                    >
                       <span>{settings.sbaConfig.isLocked ? 'Lock SBA' : 'SBA Editable'}</span>
                       <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          {settings.sbaConfig.isLocked ? <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4" /> : <path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 9.9-1" />}
                       </svg>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Statistical Method Selection */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-indigo-50/50 px-6 py-4 border-b border-indigo-100 flex items-center gap-2">
           <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
           <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Statistical Methodology</h3>
        </div>
        <div className="p-6">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1">
                 <p className="text-[11px] text-gray-500 font-bold uppercase">Analysis Distribution Model</p>
                 <p className="text-[10px] text-gray-400 italic">Toggle between Normal (Z-score) and T-Distribution models for grading.</p>
              </div>
              <button 
                 onClick={() => onSettingChange('useTDistribution', !settings.useTDistribution)}
                 className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${settings.useTDistribution ? 'bg-indigo-900 text-white border-indigo-900 shadow-lg' : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'}`}
              >
                 <div className="flex flex-col items-start">
                    <span className="text-[10px] font-black uppercase">{settings.useTDistribution ? 'T-Distribution Active' : 'Normal Distribution'}</span>
                    <span className="text-[8px] opacity-70 font-bold">{settings.useTDistribution ? 'Using n-1 degrees of freedom' : 'Standard Z-score modeling'}</span>
                 </div>
                 <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings.useTDistribution ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full transition-transform ${settings.useTDistribution ? 'translate-x-6' : 'translate-x-0'}`}></div>
                 </div>
              </button>
           </div>
           
           <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100 flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                 <p className="text-[10px] font-black text-yellow-800 uppercase mb-1">Methodology Recommendation</p>
                 <p className="text-[10px] text-yellow-700 leading-relaxed">
                    The <strong>T-Distribution</strong> is mathematically superior for class sizes <strong>under 30 pupils</strong> as it compensates for the lack of population data by using <em>n-1</em> degrees of freedom. This provides a more equitable grade distribution in smaller cohorts.
                 </p>
              </div>
           </div>
        </div>
      </section>

      {/* Score Normalization */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-blue-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Score Normalization</h3>
           </div>
           <button 
             onClick={() => handleNormalizationChange('isLocked', !settings.normalizationConfig.isLocked)}
             className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${settings.normalizationConfig.isLocked ? 'bg-gray-900 text-white border-gray-900' : 'bg-red-600 text-white border-red-600 animate-pulse'}`}
           >
              {settings.normalizationConfig.isLocked ? 'Lock Active' : 'Lock Config'}
           </button>
        </div>
        <div className="p-6">
           <p className="text-[11px] text-gray-500 font-medium mb-6">Adjust raw exam scores down to a standard 100-point scale for fairness in specific papers.</p>
           
           <div className={`grid grid-cols-1 md:grid-cols-4 gap-6 items-end transition-opacity ${settings.normalizationConfig.isLocked ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}`}>
              <div>
                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Status</label>
                 <button 
                   disabled={settings.normalizationConfig.isLocked}
                   onClick={() => handleNormalizationChange('enabled', !settings.normalizationConfig.enabled)}
                   className={`w-full py-3 rounded-xl font-black text-[10px] uppercase border transition-all ${settings.normalizationConfig.enabled ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-400 border-gray-100'} ${settings.normalizationConfig.isLocked ? 'cursor-not-allowed' : ''}`}
                 >
                    {settings.normalizationConfig.enabled ? 'Enabled' : 'Disabled'}
                 </button>
              </div>
              <div className="md:col-span-1">
                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Target Subject</label>
                 <select 
                   disabled={settings.normalizationConfig.isLocked}
                   value={settings.normalizationConfig.subject}
                   onChange={(e) => handleNormalizationChange('subject', e.target.value)}
                   className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed"
                 >
                    {SUBJECT_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
              </div>
              <div>
                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Max Raw Score</label>
                 <input 
                   disabled={settings.normalizationConfig.isLocked}
                   type="number" 
                   value={settings.normalizationConfig.maxScore}
                   onChange={(e) => handleNormalizationChange('maxScore', parseInt(e.target.value) || 0)}
                   className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-blue-900 outline-none text-center disabled:cursor-not-allowed"
                 />
              </div>
              <div className="flex items-center justify-center pb-3">
                 <span className="text-gray-300 font-black text-2xl">→ 100</span>
              </div>
           </div>
        </div>
      </section>

      {/* NRT Grading Cut-offs */}
      <section className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-blue-50/50 px-6 py-4 border-b border-blue-900 flex items-center justify-between">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h3 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">NRT Grading Cut-offs</h3>
           </div>
           <button 
             onClick={() => setIsNrtLocked(!isNrtLocked)}
             className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${isNrtLocked ? 'bg-gray-900 text-white border-gray-900' : 'bg-red-600 text-white border-red-600 animate-pulse'}`}
           >
              {isNrtLocked ? 'Unlock Config' : 'Config Unlocked'}
           </button>
        </div>
        <div className="p-6">
           <p className="text-[11px] text-gray-500 font-medium mb-6">Adjust the {settings.useTDistribution ? 'T-score' : 'Z-score'} thresholds for normal reference testing (NRT) to control grade distribution.</p>
           
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
             {grades.map(grade => (
               <div key={grade} className="space-y-2">
                 <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block text-center">{grade} Threshold</label>
                 <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-300">{settings.useTDistribution ? 'T ≥' : 'Z ≥'}</span>
                    <input 
                      type="number" 
                      step="0.001" 
                      disabled={isNrtLocked}
                      value={settings.gradingThresholds[grade]} 
                      onChange={(e) => handleUpdateThreshold(grade, e.target.value)}
                      className={`w-full bg-gray-50 border rounded-xl pl-10 pr-4 py-3 text-sm font-black text-blue-900 outline-none transition-all ${isNrtLocked ? 'border-gray-50 opacity-60' : 'border-blue-100 focus:ring-2 focus:ring-blue-500'}`}
                    />
                 </div>
               </div>
             ))}
           </div>
        </div>
      </section>

    </div>
  );
};

export default GradingConfigPortal;

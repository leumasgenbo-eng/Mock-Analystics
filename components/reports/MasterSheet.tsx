
import React, { useState } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, StaffAssignment } from '../../types';
import CompositeSheet from './CompositeSheet';
import SupplementarySheet from './SupplementarySheet';
import InstitutionalAnalytics from './InstitutionalAnalytics';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';
import EditableField from '../shared/EditableField';

interface MasterSheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
}

const MOCK_SERIES = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);

const MasterSheet: React.FC<MasterSheetProps> = ({ students, stats, settings, onSettingChange, facilitators, isFacilitator }) => {
  const [sheetView, setSheetView] = useState<'composite' | 'sectionA' | 'sectionB' | 'analytics'>('composite');

  const getDynamicSubtitle = () => {
    switch (sheetView) {
      case 'analytics': return 'INSTITUTIONAL PERFORMANCE ANALYTICS';
      case 'composite': return 'OFFICIAL MASTER BROAD SHEET';
      case 'sectionA': return 'SUPPLEMENTARY SUB-SCORE SHEET (OBJ)';
      case 'sectionB': return 'SUPPLEMENTARY SUB-SCORE SHEET (THY)';
      default: return 'OFFICIAL ASSESSMENT REPORT';
    }
  };

  return (
    <div className="bg-white p-4 print:p-0 min-h-screen max-w-[420mm] mx-auto overflow-hidden print:overflow-visible print:max-w-none">
      
      <div className="no-print mb-8 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest border-r pr-4 border-gray-200">Broad Sheet Controller</h3>
            <div className="flex flex-wrap gap-2">
               <button onClick={() => setSheetView('composite')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'composite' ? 'bg-blue-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Composite</button>
               <button onClick={() => setSheetView('sectionA')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'sectionA' ? 'bg-indigo-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Sec A</button>
               <button onClick={() => setSheetView('sectionB')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'sectionB' ? 'bg-purple-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Sec B</button>
               <button onClick={() => setSheetView('analytics')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'analytics' ? 'bg-emerald-700 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Analytics</button>
            </div>
          </div>
          <button onClick={() => window.print()} className="bg-blue-950 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Print Sheet</button>
        </div>

        <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 p-1 bg-gray-100 rounded-xl border border-gray-200">
           {MOCK_SERIES.map(mock => (
             <button key={mock} onClick={() => onSettingChange('activeMock', mock)} className={`py-2 rounded-lg text-[10px] font-black uppercase transition-all ${settings.activeMock === mock ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-blue-900 hover:bg-blue-50'}`}>
               {mock.split(' ')[1]}
             </button>
           ))}
        </div>
      </div>

      <div id="broadsheet-export-container">
        <ReportBrandingHeader 
          settings={settings} 
          onSettingChange={onSettingChange} 
          reportTitle={settings.examTitle}
          subtitle={getDynamicSubtitle()}
          isLandscape={true}
        />

        <div className="min-h-[400px]">
          {sheetView === 'composite' && <CompositeSheet students={students} stats={stats} settings={settings} facilitators={facilitators} isFacilitator={isFacilitator} />}
          {sheetView === 'sectionA' && <SupplementarySheet students={students} stats={stats} settings={settings} section="sectionA" />}
          {sheetView === 'sectionB' && <SupplementarySheet students={students} stats={stats} settings={settings} section="sectionB" />}
          {sheetView === 'analytics' && <InstitutionalAnalytics students={students} stats={stats} settings={settings} facilitators={facilitators} onSettingChange={onSettingChange} />}
        </div>

        {/* ANALYTICAL STANDARDS & FORMULAS LEGEND */}
        <div className="mt-16 bg-slate-50 border border-slate-200 rounded-[3rem] p-10 page-break-inside-avoid shadow-sm">
           <div className="flex items-center gap-4 mb-10 border-b border-slate-200 pb-6">
              <div className="w-12 h-12 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-xl">Σ</div>
              <div>
                 <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mathematical Model & Performance Formulas</h4>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">ACADEMY ANALYTICAL STANDARDS</p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-900 rounded-lg flex items-center justify-center font-black text-xs">Z</div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">T Rank (Z-Score)</h5>
                 </div>
                 <p className="text-[10px] font-bold text-blue-900 font-mono italic">Z = (x - μ) / σ</p>
                 <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Calculates the relative distance of score (x) from the class mean (μ). It provides the statistical rank of a student relative to the cohort's overall spread.</p>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-900 rounded-lg flex items-center justify-center font-black text-xs">σ</div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Std. Deviation</h5>
                 </div>
                 <p className="text-[10px] font-bold text-indigo-900 font-mono italic">σ = √[Σ(x-μ)² / N]</p>
                 <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Determines the consistency of scores within the cohort. Low σ indicates high uniform absorption of the examined concepts.</p>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-900 rounded-lg flex items-center justify-center font-black text-xs">%</div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Quality Pass Rate</h5>
                 </div>
                 <p className="text-[10px] font-bold text-emerald-900 font-mono italic">QPR = (P₁₋₆ / N) * 100</p>
                 <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Percentage of pupils achieving Merit or better (Aggregates 1-6) in the examined subject area.</p>
              </div>

              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-900 rounded-lg flex items-center justify-center font-black text-xs">V</div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Vitality Index (SVI)</h5>
                 </div>
                 <p className="text-[10px] font-bold text-amber-900 font-mono italic">SVI = 0.4μ + 0.4Q + 0.2C</p>
                 <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Composite index weighting Mean (μ), Quality (Q), and Consistency (C) to rank institutional efficiency.</p>
              </div>
           </div>

           <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex gap-4">
                 <div className="w-1.5 bg-blue-600 rounded-full h-auto"></div>
                 <div className="space-y-2">
                    <h6 className="text-[11px] font-black text-slate-900 uppercase">Interpreting Deviation (σ)</h6>
                    <ul className="space-y-1">
                       <li className="text-[10px] text-slate-500 font-medium">● <strong>Low σ (&lt; 10):</strong> Indicates uniform learning outcomes across the cohort; concept mastery is consistent.</li>
                       <li className="text-[10px] text-slate-500 font-medium">● <strong>High σ (&gt; 15):</strong> Indicates extreme learning gaps; remedial action is required for lower-tier students.</li>
                    </ul>
                 </div>
              </div>
              <div className="flex gap-4">
                 <div className="w-1.5 bg-red-600 rounded-full h-auto"></div>
                 <div className="space-y-2">
                    <h6 className="text-[11px] font-black text-slate-900 uppercase">NRT Ranking Logic</h6>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                       The NRT System ensures that grades reflect the pupil's position within the local group context. Grades are derived from Z-score thresholds applied to the Normal Distribution Curve. This means pupils are measured against the actual difficulty experienced by their peers.
                    </p>
                 </div>
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end pt-12 pb-4 border-t-2 border-blue-900 mt-12 page-break-inside-avoid">
           <div className="flex flex-col items-center">
              <div className="w-48 border-t-2 border-gray-900 text-center font-black uppercase text-[10px] pt-2">
                 <EditableField 
                  value={settings.registryRoleTitle || "Examination Registry"} 
                  onChange={(v) => onSettingChange('registryRoleTitle', v)} 
                  className="text-center w-full" 
                 />
              </div>
              <p className="text-[8px] text-gray-400 mt-1 uppercase italic">Authorized Signature Node</p>
           </div>
           <div className="flex flex-col items-center">
              <div className="w-48 border-t-2 border-gray-900 text-center font-black uppercase text-[10px] pt-2">
                 <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center w-full mb-1" />
                 <EditableField 
                  value={settings.adminRoleTitle || "Academy Director"} 
                  onChange={(v) => onSettingChange('adminRoleTitle', v)} 
                  className="text-center w-full text-[8px] opacity-60" 
                 />
              </div>
              <p className="text-[8px] text-gray-400 mt-1 uppercase italic">Institutional Director's Seal</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MasterSheet;

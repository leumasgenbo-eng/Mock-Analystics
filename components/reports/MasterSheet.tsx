
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

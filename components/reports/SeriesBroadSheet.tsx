
import React from 'react';
import { StudentData, GlobalSettings, MockSeriesRecord } from '../../types';
import EditableField from '../shared/EditableField';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface SeriesBroadSheetProps {
  students: StudentData[];
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  currentProcessed: { id: number; bestSixAggregate: number; rank: number; totalScore: number; category: string }[];
}

const SeriesBroadSheet: React.FC<SeriesBroadSheetProps> = ({ students, settings, onSettingChange, currentProcessed }) => {
  const mockSeriesNames = settings.committedMocks || [];
  const subjectCount = 10;

  const getAggGrade = (agg: number) => {
    if (agg <= 10) return { label: 'EXC', color: 'text-emerald-600', weight: 4 };
    if (agg <= 20) return { label: 'HIGH', color: 'text-blue-600', weight: 3 };
    if (agg <= 36) return { label: 'PASS', color: 'text-orange-600', weight: 2 };
    return { label: 'REM', color: 'text-red-600', weight: 1 };
  };

  const getProgression = (currentWeight: number, prevWeight: number) => {
    if (prevWeight === 0) return null;
    if (currentWeight > prevWeight) return <span className="text-emerald-500 font-black" title="Improved Category">▲</span>;
    if (currentWeight < prevWeight) return <span className="text-red-500 font-black" title="Declined Category">▼</span>;
    return <span className="text-gray-300 font-black" title="Stable Category">▬</span>;
  };

  const calculateRate = (record: MockSeriesRecord | undefined) => {
    if (!record || !record.subScores) return '-';
    const total = Object.values(record.subScores).reduce((acc, sub) => acc + (sub.sectionA + sub.sectionB), 0);
    return ((total / (subjectCount * 100)) * 100).toFixed(1);
  };

  return (
    <div className="bg-white p-6 print:p-0 min-h-screen max-w-full font-sans">
      {/* 1. Editable Academy Particulars - Standard Branding */}
      <ReportBrandingHeader 
        settings={settings} 
        onSettingChange={onSettingChange} 
        reportTitle="INSTITUTIONAL PERFORMANCE SERIES TRACKER"
        subtitle="LONGITUDINAL ACADEMIC JOURNEY (MOCKS 1-10)"
        isLandscape={true}
      />

      {/* 2. Longitudinal Data Matrix */}
      <div className="shadow-2xl border border-gray-200 rounded-[2.5rem] bg-white overflow-hidden relative group mt-8">
        <div className="overflow-x-auto custom-scrollbar-horizontal scroll-smooth">
          <table className="w-full text-[10px] border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-blue-950 text-white uppercase text-[8px] tracking-widest">
                <th className="p-5 text-left min-w-[240px] border-r border-blue-900 sticky left-0 bg-blue-950 z-40 shadow-[4px_0_10px_rgba(0,0,0,0.3)]">
                  Candidate Profile
                </th>
                {mockSeriesNames.map((m) => (
                  <th key={m} className="p-3 border-r border-blue-900 text-center min-w-[140px]" colSpan={4}>{m}</th>
                ))}
                <th className="p-3 bg-red-700 text-center font-black min-w-[180px]" colSpan={3}>Live State</th>
              </tr>
              <tr className="bg-blue-50 text-blue-900 uppercase text-[7px] font-black border-b-2 border-blue-900">
                <th className="p-3 border-r border-blue-100 sticky left-0 bg-blue-50 z-40">Identity Node</th>
                {mockSeriesNames.map((m) => (
                  <React.Fragment key={m + '-sub'}>
                    <th className="p-1.5 border-r border-blue-100 w-10 text-center">Agg</th>
                    <th className="p-1.5 border-r border-blue-100 w-12 text-center">Rate%</th>
                    <th className="p-1.5 border-r border-blue-100 w-12 text-center">Grade</th>
                    <th className="p-1.5 border-r border-blue-100 w-8 text-center bg-white/50">Prog</th>
                  </React.Fragment>
                ))}
                <th className="p-1.5 border-r border-red-100 w-12 bg-red-50 text-red-700 text-center">Agg</th>
                <th className="p-1.5 border-r border-red-100 w-14 bg-red-50 text-red-700 text-center">Rate%</th>
                <th className="p-1.5 bg-red-50 text-red-700 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const live = currentProcessed.find(p => p.id === student.id);
                let previousWeight = 0; 
                return (
                  <tr key={student.id} className="border-b border-gray-100 hover:bg-blue-50/20 transition-colors group leading-none">
                    <td className="p-4 font-black uppercase text-blue-900 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-blue-50/50 z-30 shadow-[4px_0_10px_rgba(0,0,0,0.05)]">
                      {student.name}
                    </td>
                    {mockSeriesNames.map((m) => {
                      const record = student.seriesHistory?.[m];
                      const rate = calculateRate(record);
                      const gradeInfo = record ? getAggGrade(record.aggregate) : null;
                      const progression = gradeInfo ? getProgression(gradeInfo.weight, previousWeight) : '-';
                      if (gradeInfo) previousWeight = gradeInfo.weight;
                      return (
                        <React.Fragment key={m + student.id}>
                          <td className="p-2 border-r border-gray-50 text-center font-mono font-bold text-gray-500">{record?.aggregate || '-'}</td>
                          <td className="p-2 border-r border-gray-50 text-center font-mono text-[9px] text-indigo-400">{rate !== '-' ? rate + '%' : '-'}</td>
                          <td className={`p-2 border-r border-gray-50 text-center font-black text-[9px] ${gradeInfo?.color || ''}`}>{gradeInfo?.label || '-'}</td>
                          <td className="p-2 border-r border-gray-100 text-center text-xs bg-gray-50/30">{progression}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="p-3 bg-red-50 text-center font-black text-red-700 text-sm border-r border-red-100">{live?.bestSixAggregate || '-'}</td>
                    <td className="p-3 bg-red-50 text-center font-mono text-xs text-red-600 border-r border-red-100">{live ? ((live.totalScore / (subjectCount * 100)) * 100).toFixed(1) + '%' : '-'}</td>
                    <td className="p-3 bg-red-50 text-center font-black text-[8px] uppercase text-red-800">{live?.category || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Formal Authentication Signatures - Editable Role Titles */}
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
  );
};

export default SeriesBroadSheet;

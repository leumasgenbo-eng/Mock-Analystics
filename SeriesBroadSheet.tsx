
import React from 'react';
import { StudentData, GlobalSettings } from '../types';
import EditableField from './EditableField';

interface SeriesBroadSheetProps {
  students: StudentData[];
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  currentProcessed: { id: number; aggregate: number; rank: number }[];
}

const SeriesBroadSheet: React.FC<SeriesBroadSheetProps> = ({ students, settings, onSettingChange, currentProcessed }) => {
  const mockSeriesNames = settings.committedMocks || [];
  
  const getAggregateColor = (agg: number) => {
    if (agg <= 10) return 'text-green-700 font-black';
    if (agg <= 20) return 'text-blue-700 font-bold';
    if (agg <= 36) return 'text-orange-600 font-bold';
    return 'text-red-600 font-bold';
  };

  const getTrend = (student: StudentData, currentAgg: number) => {
    if (!mockSeriesNames.length) return null;
    const lastMockName = mockSeriesNames[mockSeriesNames.length - 1];
    const prevAgg = student.seriesHistory?.[lastMockName]?.aggregate;
    
    if (prevAgg === undefined) return null;
    if (currentAgg < prevAgg) return <span className="text-green-600 text-xl" title="Improved (Lower aggregate is better)">↑</span>;
    if (currentAgg > prevAgg) return <span className="text-red-600 text-xl" title="Declined">↓</span>;
    return <span className="text-gray-400 text-xl" title="Stable">→</span>;
  };

  return (
    <div className="bg-white p-6 print:p-0 min-h-screen">
      <div className="relative mb-8">
        {settings.schoolLogo && (
          <div className="absolute top-0 left-0 w-24 h-24 print:w-20 print:h-20">
             <img src={settings.schoolLogo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="text-center px-24">
          <h1 className="text-3xl font-black uppercase text-blue-900">
            <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="text-center w-full" />
          </h1>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
            <EditableField value={settings.schoolAddress || "ACADEMY ADDRESS, REGION, COUNTRY"} onChange={(v) => onSettingChange('schoolAddress', v)} className="text-center w-full" />
          </div>
          <div className="flex justify-center gap-4 text-xs font-semibold text-gray-600 mb-2 uppercase">
            <div className="flex gap-1">
               <span>Tel:</span>
               <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} placeholder="000-000-0000" />
            </div>
            <span>|</span>
            <div className="flex gap-1">
               <span>Email:</span>
               <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} placeholder="school@email.com" />
            </div>
          </div>
          <h2 className="text-xl font-bold uppercase text-red-700 tracking-tight">
             <EditableField value={settings.examTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
          </h2>
          <div className="mt-4 flex flex-col items-center">
             <p className="bg-gray-900 text-white px-6 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em]">
               Institutional Series Tracker (Mocks 1-10)
             </p>
             <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase">Academic Year: {settings.academicYear}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto shadow-xl border border-gray-200 rounded-xl relative">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-blue-900 text-white uppercase text-[9px] tracking-widest">
              <th className="p-4 border-r border-blue-800 sticky left-0 bg-blue-900 z-30 min-w-[200px]">Pupil Full Name</th>
              {mockSeriesNames.map(name => (
                <th key={name} className="p-3 border-r border-blue-800 text-center whitespace-nowrap" colSpan={2}>{name}</th>
              ))}
              <th className="p-3 border-r border-blue-800 bg-red-700 text-center sticky right-0 z-10" colSpan={3}>Live Data</th>
              <th className="p-3 border-r border-blue-800 bg-indigo-900 text-center">Avg</th>
              <th className="p-3 bg-indigo-900 text-center">Trend</th>
            </tr>
            <tr className="bg-blue-50 text-blue-900 font-black uppercase text-[8px]">
              <th className="p-2 border-r border-blue-100 sticky left-0 bg-blue-50 z-30"></th>
              {mockSeriesNames.map(name => (
                <React.Fragment key={name + '-sub'}>
                  <th className="p-1 border-r border-blue-100 w-10 text-center">Agg</th>
                  <th className="p-1 border-r border-blue-100 w-8 text-center">Pos</th>
                </React.Fragment>
              ))}
              <th className="p-1 border-r border-blue-100 w-12 bg-red-50 text-center sticky right-[100px] z-10">Agg</th>
              <th className="p-1 border-r border-blue-100 w-10 bg-red-50 text-center sticky right-[60px] z-10">Pos</th>
              <th className="p-1 border-r border-blue-100 w-16 bg-red-50 text-center sticky right-0 z-10">Rating</th>
              <th className="p-2 border-r border-blue-100 w-14 bg-indigo-50 text-center">Mean</th>
              <th className="p-2 bg-indigo-50 text-center">Dir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {students.map(student => {
              const current = currentProcessed.find(p => p.id === student.id);
              const currentAgg = current?.aggregate || 0;
              
              const historicalAggs = mockSeriesNames.map(n => student.seriesHistory?.[n]?.aggregate).filter(a => a !== undefined) as number[];
              const allAggs = [...historicalAggs, currentAgg];
              const seriesAvg = allAggs.length ? (allAggs.reduce((a, b) => a + b, 0) / allAggs.length).toFixed(1) : '-';

              return (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4 border-r border-gray-100 font-bold uppercase sticky left-0 bg-white group-hover:bg-gray-50 z-20 shadow-sm">
                    {student.name}
                  </td>
                  {mockSeriesNames.map(name => {
                    const record = student.seriesHistory?.[name];
                    return (
                      <React.Fragment key={name + student.id}>
                        <td className={`p-2 border-r border-gray-100 text-center font-mono text-[11px] ${record ? getAggregateColor(record.aggregate) : 'text-gray-200'}`}>
                          {record?.aggregate || '-'}
                        </td>
                        <td className="p-2 border-r border-gray-100 text-center text-[9px] text-gray-400 font-bold italic">
                          {record?.rank || '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}
                  <td className={`p-2 border-r border-red-50 text-center font-black bg-red-50/20 text-[12px] sticky right-[100px] z-10 shadow-sm ${getAggregateColor(currentAgg)}`}>
                    {currentAgg}
                  </td>
                  <td className="p-2 border-r border-red-50 text-center font-bold text-red-900 bg-red-50/20 sticky right-[60px] z-10 shadow-sm">
                    {current?.rank || '-'}
                  </td>
                  <td className="p-2 border-r border-red-50 text-center text-[8px] font-black uppercase bg-red-50/20 sticky right-0 z-10 shadow-sm">
                    <span className={`px-1.5 py-0.5 rounded-full border ${currentAgg <= 10 ? 'bg-green-100 text-green-700 border-green-200' : currentAgg <= 20 ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                       {currentAgg <= 10 ? 'DIST' : currentAgg <= 20 ? 'MERIT' : 'PASS'}
                    </span>
                  </td>
                  <td className="p-2 border-r border-indigo-50 text-center font-black bg-indigo-50/20 text-indigo-900 font-mono text-[11px]">
                    {seriesAvg}
                  </td>
                  <td className="p-2 text-center font-black text-lg bg-indigo-50/20">
                    {getTrend(student, currentAgg)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mt-12 text-center py-6 border-t border-gray-100 opacity-40">
         <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">SS-Map Hub — Multi-Series Integrity Engine</p>
      </div>
    </div>
  );
};

export default SeriesBroadSheet;

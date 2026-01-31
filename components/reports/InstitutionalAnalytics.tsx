
import React, { useMemo } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, StaffAssignment } from '../../types';
import { SUBJECT_LIST } from '../../constants';
import EditableField from '../shared/EditableField';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface InstitutionalAnalyticsProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  facilitators: Record<string, StaffAssignment>;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
}

const InstitutionalAnalytics: React.FC<InstitutionalAnalyticsProps> = ({ students, stats, settings, facilitators, onSettingChange }) => {
  const analytics = useMemo(() => {
    const subjectMetrics = SUBJECT_LIST.map(subject => {
      const total = students.length;
      const quality = students.filter(s => {
        const sub = s.subjects.find(sub => sub.subject === subject);
        return sub && sub.gradeValue <= 6;
      }).length;
      
      const qpr = total > 0 ? (quality / total) * 100 : 0;
      const mean = stats.subjectMeans[subject] || 0;
      const sd = stats.subjectStdDevs[subject] || 0;
      const consistency = Math.max(0, 100 - (sd * 3.33));
      const svi = (mean * 0.4) + (qpr * 0.4) + (consistency * 0.2);
      
      return { qpr, svi };
    });

    const avgQPR = subjectMetrics.reduce((a, b) => a + b.qpr, 0) / (SUBJECT_LIST.length || 1);
    const avgSVI = subjectMetrics.reduce((a, b) => a + b.svi, 0) / (SUBJECT_LIST.length || 1);

    const getAvgRange = (isSectionA: boolean) => {
      const ranges = SUBJECT_LIST.map(sub => {
        const scores = students.map(s => {
          const subSc = (s as any).mockData?.[settings.activeMock]?.examSubScores?.[sub] || { sectionA: 0, sectionB: 0 };
          return isSectionA ? subSc.sectionA : subSc.sectionB;
        });
        const max = scores.length > 0 ? Math.max(...scores) : 0;
        const min = scores.length > 0 ? Math.min(...scores) : 0;
        return max - min;
      });
      return ranges.reduce((a, b) => a + b, 0) / (ranges.length || 1);
    };

    const males = students.filter(s => s.gender === 'M');
    const females = students.filter(s => s.gender === 'F');
    const maleAvg = males.length > 0 ? males.reduce((sum, s) => sum + s.totalScore, 0) / males.length : 0;
    const femaleAvg = females.length > 0 ? females.reduce((sum, s) => sum + s.totalScore, 0) / females.length : 0;

    const globalMean = students.length > 0 ? students.reduce((sum, s) => sum + s.totalScore, 0) / students.length : 0;
    const meanAgg = students.length > 0 ? students.reduce((sum, s) => sum + s.bestSixAggregate, 0) / students.length : 1;
    const strengthIndex = (globalMean / meanAgg) / 5;

    return { avgQPR, avgSVI, rangeA: getAvgRange(true), rangeB: getAvgRange(false), males: males.length, females: females.length, maleAvg, femaleAvg, strengthIndex };
  }, [students, stats, settings.activeMock]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Academy Particulars & Header */}
      <ReportBrandingHeader 
        settings={settings} 
        onSettingChange={onSettingChange} 
        reportTitle={settings.examTitle}
        subtitle="INSTITUTIONAL PERFORMANCE ANALYTICS"
        isLandscape={true}
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-950 text-white p-8 rounded-[3rem] shadow-xl border border-blue-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full -mr-8 -mt-8"></div>
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">Academy NRT Strength</span>
          <p className="text-4xl font-black mt-2 font-mono">{analytics.strengthIndex.toFixed(2)}</p>
          <p className="text-[8px] mt-2 opacity-50 uppercase font-bold">Standardized Performance Index</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 relative">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Institutional QPR</span>
          <p className="text-4xl font-black mt-2 text-blue-900 font-mono">{analytics.avgQPR.toFixed(1)}%</p>
          <p className="text-[8px] mt-2 text-emerald-600 uppercase font-black">Quality Efficiency Ratio</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100 relative">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Mean Vitality (SVI)</span>
          <p className="text-4xl font-black mt-2 text-indigo-900 font-mono">{analytics.avgSVI.toFixed(2)}</p>
          <p className="text-[8px] mt-2 text-indigo-400 uppercase font-black">Institutional Momentum</p>
        </div>
        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-xl border border-slate-800 relative">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Candidates</span>
          <p className="text-4xl font-black mt-2 font-mono">{students.length}</p>
          <p className="text-[8px] mt-2 text-slate-400 uppercase font-bold">Verified Enrollment</p>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-10 py-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase text-gray-900 tracking-tighter">Institutional Performance Ledger</h3>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1 rounded-full uppercase tracking-widest border border-blue-100">Official Analytical Output</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-blue-950 text-white uppercase text-[8px] font-black tracking-[0.3em]">
            <tr>
              <th className="px-10 py-5">Metric Identity</th>
              <th className="px-10 py-5 text-center">Section Range (μ)</th>
              <th className="px-10 py-5 text-center">Gender Split</th>
              <th className="px-10 py-5 text-right">Composite Score / Gender</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            <tr className="hover:bg-blue-50/30 transition-colors">
              <td className="px-10 py-8">
                 <span className="text-[11px] font-black text-blue-900 uppercase block mb-1">Academy Vitality Index</span>
                 <p className="text-[9px] text-gray-400 italic font-medium uppercase leading-relaxed">Composite weighting of Mean, Quality, and Consistency</p>
              </td>
              <td className="px-10 py-8 text-center font-mono font-black text-lg text-indigo-900">
                 {analytics.rangeA.toFixed(1)} <span className="text-[10px] text-gray-300 mx-2">|</span> {analytics.rangeB.toFixed(1)}
              </td>
              <td className="px-10 py-8">
                 <div className="flex flex-col items-center gap-2">
                    <div className="flex gap-4">
                       <span className="text-[10px] font-black text-blue-600 uppercase">M: {analytics.males}</span>
                       <span className="text-[10px] font-black text-pink-600 uppercase">F: {analytics.females}</span>
                    </div>
                    <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                       <div className="bg-blue-600" style={{ width: `${(analytics.males/(students.length||1))*100}%` }}></div>
                       <div className="bg-pink-600" style={{ width: `${(analytics.females/(students.length||1))*100}%` }}></div>
                    </div>
                 </div>
              </td>
              <td className="px-10 py-8 text-right space-y-1">
                 <div className="flex justify-end items-center gap-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase">M_Avg:</span>
                    <span className="text-sm font-black text-blue-900 font-mono">{analytics.maleAvg.toFixed(1)}</span>
                 </div>
                 <div className="flex justify-end items-center gap-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase">F_Avg:</span>
                    <span className="text-sm font-black text-pink-700 font-mono">{analytics.femaleAvg.toFixed(1)}</span>
                 </div>
              </td>
            </tr>
          </tbody>
          <tfoot className="bg-slate-900 text-white">
            <tr>
              <td colSpan={2} className="px-10 py-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-lg">SI</div>
                   <div>
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block">Final Institutional Rating</span>
                      <p className="text-xs font-black uppercase">{analytics.strengthIndex >= 7 ? 'Elite Academic Standing' : analytics.strengthIndex >= 5 ? 'Standard Academic Standing' : 'Remedial Priority'}</p>
                   </div>
                </div>
              </td>
              <td colSpan={2} className="px-10 py-6 text-right">
                 <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Generated by SS-MAP Network Registry</p>
                 <p className="text-[10px] font-mono text-white/50">{new Date().toISOString()}</p>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signature Area for Analytics Verification */}
      <div className="flex justify-between items-end pt-12 pb-4 border-t-2 border-blue-900 mt-12 page-break-inside-avoid">
         <div className="flex flex-col items-center">
            <div className="w-48 border-t-2 border-gray-900 text-center font-black uppercase text-[10px] pt-2">
               <EditableField 
                value={settings.registryRoleTitle || "Examination Registry"} 
                onChange={(v) => onSettingChange('registryRoleTitle', v)} 
                className="text-center w-full" 
               />
            </div>
            <p className="text-[8px] text-gray-400 mt-1 uppercase italic">Performance Audit Signature</p>
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

export default InstitutionalAnalytics;

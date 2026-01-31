import React from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, StaffAssignment } from '../../types';
import { SUBJECT_LIST } from '../../constants';

interface CompositeSheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
}

const CompositeSheet: React.FC<CompositeSheetProps> = ({ students, stats, settings, facilitators, isFacilitator }) => {
  const getGradeColor = (grade: string) => {
    if (grade === 'A1') return 'bg-green-100 text-green-800';
    if (grade === 'B2' || grade === 'B3') return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-50 text-yellow-800';
    if (grade === 'F9') return 'bg-red-100 text-red-800 font-bold';
    return 'text-gray-600';
  };

  const facilitatorAnalytics = React.useMemo(() => {
    return SUBJECT_LIST.map(subject => {
      const facilitatorName = facilitators[subject]?.name || "TBA";
      const totalStudents = students.length;
      
      const qualityPasses = students.filter(s => {
        const subData = s.subjects.find(sub => sub.subject === subject);
        return subData && subData.gradeValue <= 6;
      }).length;
      
      const qpr = totalStudents > 0 ? (qualityPasses / totalStudents) * 100 : 0;
      const mean = stats.subjectMeans[subject] || 0;
      const sd = stats.subjectStdDevs[subject] || 0;

      // SVI Formula: Institutional Strength Metric
      // Weighted as: 40% Mean + 40% Quality Pass Rate + 20% Consistency (Inverse SD)
      const consistencyScore = Math.max(0, 100 - (sd * 3.33)); 
      const svi = (mean * 0.4) + (qpr * 0.4) + (consistencyScore * 0.2);
      
      return { subject, facilitatorName, mean, qpr, sd, svi };
    }).sort((a, b) => b.svi - a.svi);
  }, [students, stats, facilitators]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* NRT Composite Table */}
      <div className="overflow-x-auto shadow-2xl rounded-3xl border border-gray-200 bg-white">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-blue-950 text-white uppercase text-[8px] tracking-[0.2em]">
              <th className="p-4 border-r border-blue-900 w-10">Rank</th>
              <th className="p-4 border-r border-blue-900 text-left min-w-[200px]">Pupil Full Identity</th>
              {SUBJECT_LIST.map(sub => (
                <th key={sub} className="p-2 border-r border-blue-900" colSpan={2}>{sub.substring(0, 12)}</th>
              ))}
              <th className="p-2 bg-red-700 font-black">Total</th>
              <th className="p-2 bg-red-800 font-black">Agg</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-blue-50/40 transition-colors border-b border-gray-100">
                <td className="p-2 text-center font-black border-r border-gray-100">{student.rank}</td>
                <td className="p-2 uppercase font-black text-blue-950 border-r border-gray-100 truncate">{student.name}</td>
                {SUBJECT_LIST.map(subName => {
                  const subData = student.subjects.find(s => s.subject === subName);
                  return (
                    <React.Fragment key={subName}>
                      <td className="p-1.5 text-center font-mono font-bold text-gray-400 border-r border-gray-50">{Math.round(subData?.finalCompositeScore || 0)}</td>
                      <td className={`p-1.5 text-center font-black border-r border-gray-100 ${getGradeColor(subData?.grade || '')}`}>{subData?.grade || '-'}</td>
                    </React.Fragment>
                  );
                })}
                <td className="p-2 text-center font-black bg-gray-50 text-blue-900 border-r border-gray-100">{Math.round(student.totalScore)}</td>
                <td className="p-2 text-center font-black text-red-700 bg-red-50">{student.bestSixAggregate}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-blue-50 font-black border-t-2 border-blue-950 uppercase text-[8px]">
            <tr className="bg-blue-100/50">
              <td colSpan={2} className="p-3 text-right bg-blue-100 text-blue-950 tracking-widest border-r border-blue-200">Cohort Mean (μ)</td>
              {SUBJECT_LIST.map(sub => (
                <td key={sub + '-mean'} colSpan={2} className="p-2 text-center text-blue-900 font-mono text-[11px] border-r border-blue-100">
                   {Math.round(stats.subjectMeans[sub] || 0)}%
                </td>
              ))}
              <td colSpan={2} className="bg-blue-100"></td>
            </tr>
            <tr className="bg-indigo-50/50">
              <td colSpan={2} className="p-3 text-right bg-indigo-50 text-indigo-900 tracking-widest border-r border-indigo-100">Std Deviation (σ)</td>
              {SUBJECT_LIST.map(sub => (
                <td key={sub + '-std'} colSpan={2} className="p-2 text-center text-indigo-600 font-mono text-[10px] border-r border-indigo-50">
                   {(stats.subjectStdDevs[sub] || 0).toFixed(2)}
                </td>
              ))}
              <td colSpan={2} className="bg-indigo-50"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* SVI Ranking Section */}
      <section className="space-y-6 page-break-inside-avoid">
        <div className="flex items-center gap-4 border-b-2 border-gray-100 pb-4">
           <div className="w-12 h-12 bg-blue-950 text-white rounded-2xl flex items-center justify-center shadow-xl">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
           </div>
           <div>
              <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 leading-none">Subject Vitality Index (SVI)</h3>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Efficiency Ranking & Facilitator Impact</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {facilitatorAnalytics.map((fa, i) => (
            <div key={fa.subject} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300 border-b-4 border-b-blue-900 print:shadow-none print:border-gray-300">
              <div className="absolute top-0 right-0 bg-blue-950 text-white px-5 py-1.5 rounded-bl-3xl font-black text-[10px] tracking-widest">
                #{i+1}
              </div>
              <div className="mb-4">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">{fa.subject}</span>
                <p className="text-sm font-black text-gray-900 uppercase truncate">{fa.facilitatorName}</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                     <span className="text-[7px] font-black text-gray-400 uppercase block">Mean</span>
                     <p className="text-sm font-black text-blue-950">{Math.round(fa.mean)}%</p>
                   </div>
                   <div className="bg-gray-50 p-2 rounded-xl border border-gray-100 text-center">
                     <span className="text-[7px] font-black text-gray-400 uppercase block">SD (σ)</span>
                     <p className="text-sm font-black text-indigo-600">{fa.sd.toFixed(1)}</p>
                   </div>
                </div>
                <div className="flex justify-between items-center px-2">
                  <span className="text-[8px] font-black text-gray-400 uppercase">Vitality Index</span>
                  <span className="text-2xl font-black text-blue-900 font-mono tracking-tighter">{fa.svi.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Formulas & Interpretations Section - HIDDEN FOR FACILITATORS */}
      {!isFacilitator && (
        <div className="bg-slate-900 text-slate-100 p-10 rounded-[4rem] shadow-2xl border border-slate-800 space-y-12 page-break-inside-avoid print:bg-slate-50 print:text-slate-900 print:border-gray-300 print:rounded-3xl">
           <div className="text-center space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter text-blue-400 print:text-blue-900">Mathematical Model & Performance Formulas</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">ACADEMY ANALYTICAL STANDARDS</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              {/* Z-Score Formula */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-black text-sm print:bg-blue-100 print:text-blue-700">Z</div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">T Rank (Z-Score)</h4>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center print:bg-white print:border-gray-200">
                    <code className="text-lg font-mono font-black text-white print:text-blue-900">Z = (x - μ) / σ</code>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed italic print:text-gray-500">
                   Calculates the relative distance of score <strong>(x)</strong> from the class mean <strong>(μ)</strong>. It provides the statistical rank of a student relative to the cohort's overall spread.
                 </p>
              </div>

              {/* Standard Deviation Formula */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center font-black text-sm print:bg-emerald-100 print:text-emerald-700">σ</div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Std. Deviation</h4>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center print:bg-white print:border-gray-200">
                    <code className="text-lg font-mono font-black text-white print:text-blue-900">σ = √[Σ(x-μ)² / N]</code>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed italic print:text-gray-500">
                   Determines the consistency of scores within the cohort. Low σ indicates high uniform absorption of the examined concepts.
                 </p>
              </div>

              {/* QPR Formula */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center font-black text-sm print:bg-indigo-100 print:text-indigo-700">%</div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Quality Pass Rate</h4>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center print:bg-white print:border-gray-200">
                    <code className="text-lg font-mono font-black text-white print:text-blue-900">QPR = (P₁₋₆ / N) * 100</code>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed italic print:text-gray-500">
                   Percentage of pupils achieving Merit or better (Aggregates 1-6) in the examined subject area.
                 </p>
              </div>

              {/* SVI Formula */}
              <div className="space-y-4">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center font-black text-sm print:bg-red-100 print:text-red-700">V</div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest">Vitality Index (SVI)</h4>
                 </div>
                 <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center print:bg-white print:border-gray-200">
                    <code className="text-[13px] font-mono font-black text-white print:text-blue-900">SVI = 0.4μ + 0.4Q + 0.2C</code>
                 </div>
                 <p className="text-[9px] text-slate-400 leading-relaxed italic print:text-gray-500">
                   Composite index weighting Mean <strong>(μ)</strong>, Quality <strong>(Q)</strong>, and Consistency <strong>(C)</strong> to rank institutional efficiency.
                 </p>
              </div>
           </div>

           <div className="pt-8 border-t border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-12 print:border-gray-200">
              <div className="space-y-3">
                 <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest print:text-blue-900">Interpreting Deviation (σ)</h5>
                 <ul className="space-y-2">
                    <li className="text-[9px] text-slate-300 flex gap-2 print:text-gray-600">
                      <span className="text-emerald-400 font-bold">●</span>
                      <span><strong>Low σ (&lt; 10):</strong> Indicates uniform learning outcomes across the cohort; concept mastery is consistent.</span>
                    </li>
                    <li className="text-[9px] text-slate-300 flex gap-2 print:text-gray-600">
                      <span className="text-red-400 font-bold">●</span>
                      <span><strong>High σ (&gt; 15):</strong> Indicates extreme learning gaps; remedial action is required for lower-tier students.</span>
                    </li>
                 </ul>
              </div>
              <div className="space-y-3">
                 <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest print:text-indigo-900">NRT Ranking Logic</h5>
                 <p className="text-[9px] text-slate-300 leading-relaxed font-medium italic print:text-gray-600">
                   The <strong>NRT System</strong> ensures that grades reflect the pupil's position within the local group context. Grades are derived from Z-score thresholds applied to the <strong>Normal Distribution Curve</strong>. This means pupils are measured against the actual difficulty experienced by their peers.
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default CompositeSheet;

// Fix: Removed FACILITATORS from import as it does not exist in constants.ts and is not used here.
import { SUBJECT_LIST, CORE_SUBJECTS, PREDEFINED_CONDUCT_REMARKS, RAW_STUDENTS } from './constants';
import { ClassStatistics, ProcessedStudent, ComputedSubject, StudentData, GradingThresholds, GlobalSettings, MockScoreSet, MockResource, QuestionIndicatorMapping, MockSeriesRecord, MockSnapshotMetadata, SchoolRegistryEntry, InstitutionalPerformance } from './types';

export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const calculateStdDev = (values: number[], mean: number, useBessel: boolean = false): number => {
  if (values.length <= 1) return 0;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const denominator = useBessel ? values.length - 1 : values.length;
  return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / denominator);
};

export const getNormalizedScore = (score: number, subject: string, config: GlobalSettings['normalizationConfig']): number => {
  if (config.enabled && subject === config.subject && config.maxScore > 0) {
    return (score / config.maxScore) * 100;
  }
  return score;
};

export const getFinalCompositeScore = (
  rawExam: number, 
  rawSba: number, 
  normConfig: GlobalSettings['normalizationConfig'], 
  sbaConfig: GlobalSettings['sbaConfig'],
  subject: string
): number => {
  const normalizedExam = getNormalizedScore(rawExam, subject, normConfig);
  if (!sbaConfig.enabled) return normalizedExam;
  
  // Standard NRT weighting: (SBA% of 100) + (Exam% of normalized exam)
  const sbaWeight = sbaConfig.sbaWeight || 0;
  const examWeight = sbaConfig.examWeight || (100 - sbaWeight);
  
  return (rawSba * (sbaWeight / 100)) + (normalizedExam * (examWeight / 100));
};

export const getGradeFromZScore = (score: number, mean: number, stdDev: number, thresholds: GradingThresholds): { grade: string, value: number, remark: string } => {
  if (stdDev === 0) return { grade: 'C4', value: 4, remark: 'Credit' };
  const z = (score - mean) / stdDev;
  if (z >= thresholds.A1) return { grade: 'A1', value: 1, remark: 'Excellent' };
  if (z >= thresholds.B2) return { grade: 'B2', value: 2, remark: 'Very Good' };
  if (z >= thresholds.B3) return { grade: 'B3', value: 3, remark: 'Good' };
  if (z >= thresholds.C4) return { grade: 'C4', value: 4, remark: 'Credit' };
  if (z >= thresholds.C5) return { grade: 'C5', value: 5, remark: 'Credit' };
  if (z >= thresholds.C6) return { grade: 'C6', value: 6, remark: 'Credit' };
  if (z >= thresholds.D7) return { grade: 'D7', value: 7, remark: 'Pass' };
  if (z >= thresholds.E8) return { grade: 'E8', value: 8, remark: 'Pass' };
  return { grade: 'F9', value: 9, remark: 'Fail' };
};

export const getStudentMockData = (student: StudentData, activeMock: string): MockScoreSet => {
  if (student.mockData && student.mockData[activeMock]) {
    return student.mockData[activeMock];
  }
  return {
    scores: student.scores || {},
    sbaScores: student.sbaScores || {},
    examSubScores: student.examSubScores || {},
    facilitatorRemarks: {},
    observations: { facilitator: "", invigilator: "", examiner: "" },
    attendance: student.attendance || 0,
    conductRemark: student.conductRemark || ""
  };
};

export const calculateClassStatistics = (students: StudentData[], settings: GlobalSettings): ClassStatistics => {
  const subjectMeans: Record<string, number> = {};
  const subjectStdDevs: Record<string, number> = {};
  const subjectSectionAMeans: Record<string, number> = {};
  const subjectSectionBMeans: Record<string, number> = {};
  const subjectSectionAStdDevs: Record<string, number> = {};
  const subjectSectionBStdDevs: Record<string, number> = {};

  SUBJECT_LIST.forEach(subject => {
    const sectionAScores: number[] = [];
    const sectionBScores: number[] = [];
    const compositeScores = students.map(s => {
      const mockData = getStudentMockData(s, settings.activeMock);
      const subSc = mockData.examSubScores[subject] || { sectionA: 0, sectionB: 0 };
      sectionAScores.push(subSc.sectionA || 0);
      sectionBScores.push(subSc.sectionB || 0);
      const examTotal = (subSc.sectionA || 0) + (subSc.sectionB || 0);
      const actualExam = (examTotal === 0 && (mockData.scores[subject] || 0) > 0) ? mockData.scores[subject] : examTotal;
      return getFinalCompositeScore(actualExam, mockData.sbaScores[subject] || 0, settings.normalizationConfig, settings.sbaConfig, subject);
    });
    
    const mean = calculateMean(compositeScores);
    subjectMeans[subject] = mean;
    subjectStdDevs[subject] = calculateStdDev(compositeScores, mean, settings.useTDistribution);
    
    const meanA = calculateMean(sectionAScores);
    const meanB = calculateMean(sectionBScores);
    subjectSectionAMeans[subject] = meanA;
    subjectSectionBMeans[subject] = meanB;
    subjectSectionAStdDevs[subject] = calculateStdDev(sectionAScores, meanA, settings.useTDistribution);
    subjectSectionBStdDevs[subject] = calculateStdDev(sectionBScores, meanB, settings.useTDistribution);
  });

  return { subjectMeans, subjectStdDevs, subjectSectionAMeans, subjectSectionBMeans, subjectSectionAStdDevs, subjectSectionBStdDevs };
};

export const processStudentData = (stats: ClassStatistics, rawStudents: StudentData[], facilitators: Record<string, string>, settings: GlobalSettings): ProcessedStudent[] => {
  const processed = rawStudents.map(student => {
    let totalScore = 0;
    const computedSubjects: ComputedSubject[] = [];
    const mockData = getStudentMockData(student, settings.activeMock);

    SUBJECT_LIST.forEach(subject => {
      const subSc = mockData.examSubScores[subject] || { sectionA: 0, sectionB: 0 };
      const examTotal = (subSc.sectionA || 0) + (subSc.sectionB || 0);
      const actualExam = (examTotal === 0 && (mockData.scores[subject] || 0) > 0) ? mockData.scores[subject] : examTotal;
      const compositeScore = getFinalCompositeScore(actualExam, mockData.sbaScores[subject] || 0, settings.normalizationConfig, settings.sbaConfig, subject);
      totalScore += compositeScore;
      const mean = stats.subjectMeans[subject];
      const stdDev = stats.subjectStdDevs[subject];
      const { grade, value, remark } = getGradeFromZScore(compositeScore, mean, stdDev, settings.gradingThresholds);
      
      computedSubjects.push({
        subject, 
        score: actualExam, 
        sbaScore: mockData.sbaScores[subject] || 0, 
        finalCompositeScore: compositeScore,
        grade, 
        gradeValue: value, 
        remark, 
        facilitator: facilitators[subject] || 'TBA',
        zScore: stdDev === 0 ? 0 : (compositeScore - mean) / stdDev,
        sectionA: subSc.sectionA || 0,
        sectionB: subSc.sectionB || 0
      });
    });

    const cores = computedSubjects.filter(s => CORE_SUBJECTS.includes(s.subject));
    const electives = computedSubjects.filter(s => !CORE_SUBJECTS.includes(s.subject));
    const sortFn = (a: ComputedSubject, b: ComputedSubject) => a.gradeValue !== b.gradeValue ? a.gradeValue - b.gradeValue : b.finalCompositeScore - a.finalCompositeScore;
    cores.sort(sortFn); electives.sort(sortFn);
    const best4Cores = cores.slice(0, 4);
    const best2Electives = electives.slice(0, 2);
    const bestSixAggregate = best4Cores.reduce((sum, s) => sum + s.gradeValue, 0) + best2Electives.reduce((sum, s) => sum + s.gradeValue, 0);

    let category = "Pass";
    const foundCategory = settings.categoryThresholds.find(t => bestSixAggregate >= t.min && bestSixAggregate <= t.max);
    if (foundCategory) category = foundCategory.label;

    return { 
      id: student.id, 
      name: student.name, 
      email: student.email,
      gender: student.gender, 
      parentContact: student.parentContact, 
      attendance: mockData.attendance || 0, 
      conductRemark: student.conductRemark, 
      subjects: computedSubjects, 
      totalScore, 
      bestSixAggregate, 
      bestCoreSubjects: best4Cores, 
      bestElectiveSubjects: best2Electives, 
      overallRemark: mockData.facilitatorRemarks?.['overall'] || "", 
      weaknessAnalysis: "", 
      category, 
      rank: 0, 
      seriesHistory: student.seriesHistory,
      mockData: student.mockData 
    };
  });

  processed.sort((a, b) => {
    switch(settings.sortOrder) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'id-asc': return a.id - b.id;
      case 'aggregate-asc': return a.bestSixAggregate !== b.bestSixAggregate ? a.bestSixAggregate - b.bestSixAggregate : b.totalScore - a.totalScore;
      default: return b.totalScore - a.totalScore;
    }
  });
  processed.forEach((p, index) => { p.rank = index + 1; });
  return processed;
};

export const generateFullDemoSuite = (): { 
  students: StudentData[], 
  resourcePortal: Record<string, Record<string, MockResource>>,
  mockSnapshots: Record<string, MockSnapshotMetadata>,
  registryEntry: SchoolRegistryEntry
} => {
  const mockSeries = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);
  const resourcePortal: Record<string, Record<string, MockResource>> = {};
  const mockSnapshots: Record<string, MockSnapshotMetadata> = {};

  mockSeries.forEach(mock => {
    resourcePortal[mock] = {};
    SUBJECT_LIST.forEach(sub => {
      resourcePortal[mock][sub] = { 
          indicators: [], 
          questionUrl: 'https://demo.ssmap.app/q', 
          schemeUrl: 'https://demo.ssmap.app/s' 
      };
    });
    
    if (mock === 'MOCK 1' || mock === 'MOCK 2') {
        mockSnapshots[mock] = {
            submissionDate: mock === 'MOCK 1' ? '2025-01-15' : '2025-02-10',
            subjectsSubmitted: SUBJECT_LIST,
            subjectSubmissionDates: SUBJECT_LIST.reduce((acc, sub) => ({ ...acc, [sub]: mock === 'MOCK 1' ? '2025-01-15' : '2025-02-10' }), {}),
            confirmedScripts: ["KWAME MENSAH", "ABENA OSEI", "KOFI ADU"],
            approvalStatus: 'completed',
            approvedBy: "SIR SAMUEL ADU"
        };
    }
  });

  const students = RAW_STUDENTS.map((student, sIdx) => {
    const mockData: Record<string, MockScoreSet> = {};
    const seriesHistory: Record<string, MockSeriesRecord> = {};
    
    const profile = [
      { base: 34, variance: 4 }, { base: 28, variance: 5 }, { base: 22, variance: 6 }, { base: 18, variance: 8, trend: 4 }, { base: 12, variance: 5 }
    ][sIdx];

    mockSeries.forEach((mock, mIdx) => {
      const scores: Record<string, number> = {};
      const sbaScores: Record<string, number> = {};
      const examSubScores: Record<string, any> = {};
      
      SUBJECT_LIST.forEach(sub => {
        const trendBonus = (profile as any).trend ? (mIdx * (profile as any).trend) : 0;
        const obj = Math.floor(Math.random() * profile.variance) + profile.base + trendBonus;
        const thy = Math.floor(Math.random() * profile.variance) + profile.base + trendBonus + 5;
        examSubScores[sub] = { sectionA: obj, sectionB: thy };
        scores[sub] = obj + thy;
        sbaScores[sub] = Math.floor(Math.random() * 5) + 25;
      });

      mockData[mock] = {
        scores, sbaScores, examSubScores, facilitatorRemarks: {
          overall: sIdx === 0 ? "Kwame continues to lead the cohort with exceptional theoretical mastery." : ""
        },
        observations: { facilitator: "COMPLETED", invigilator: "VERIFIED", examiner: "MODERATED" },
        attendance: 58 + Math.floor(Math.random() * 3),
        conductRemark: PREDEFINED_CONDUCT_REMARKS[sIdx % PREDEFINED_CONDUCT_REMARKS.length]
      };

      if (mock === 'MOCK 1' || mock === 'MOCK 2') {
          const mockBestAgg = [[6, 6], [12, 10], [22, 20], [30, 24], [38, 36]][sIdx][mIdx];
          seriesHistory[mock] = {
              aggregate: mockBestAgg,
              rank: [1, 2, 3, 4, 5][sIdx],
              date: mock === 'MOCK 1' ? '2025-01-20' : '2025-02-15',
              reviewStatus: 'complete',
              isApproved: true,
              subScores: examSubScores
          };
      }
    });
    return { ...student, mockData, seriesHistory };
  });

  const performanceHistory: InstitutionalPerformance[] = [
    { mockSeries: "MOCK 1", avgComposite: 68.4, avgAggregate: 21.6, avgObjective: 32.1, avgTheory: 36.3, studentCount: 5, timestamp: "2025-01-20T10:00:00Z" },
    { mockSeries: "MOCK 2", avgComposite: 74.2, avgAggregate: 19.2, avgObjective: 35.4, avgTheory: 38.8, studentCount: 5, timestamp: "2025-02-15T14:30:00Z" }
  ];

  const registryEntry: SchoolRegistryEntry = {
    id: "SSMAP-2025-001",
    name: "CULBURY ACADEMY",
    registrant: "ADMINISTRATOR",
    registrantEmail: "admin@culbury.edu",
    accessCode: "SSMAP-HQ-SECURE",
    staffAccessCode: "SSMAP-STAFF-DEMO",
    pupilAccessCode: "SSMAP-PUPIL-DEMO",
    enrollmentDate: "2025-01-01",
    studentCount: 5,
    avgAggregate: 19.2,
    performanceHistory,
    status: 'active',
    lastActivity: new Date().toISOString()
  };

  return { students, resourcePortal, mockSnapshots, registryEntry };
};


import React, { useState } from 'react';
import { StudentData, GlobalSettings, ProcessedStudent, StaffAssignment } from '../../types';

// Sub-portals
import ScoreEntryPortal from './ScoreEntryPortal';
import AcademyIdentityPortal from './AcademyIdentityPortal';
import PupilSBAPortal from './PupilSBAPortal';
import FacilitatorPortal from './FacilitatorPortal';
import GradingConfigPortal from './GradingConfigPortal';
import SeriesHistoryPortal from './SeriesHistoryPortal';
import MockResourcesPortal from './MockResourcesPortal';
import FacilitatorDesk from './FacilitatorDesk';
import LikelyQuestionDesk from './LikelyQuestionDesk';
import SubjectQuestionsBank from './SubjectQuestionsBank';
import EnrolmentForwardingPortal from './EnrolmentForwardingPortal';
import LocalSyncPortal from './LocalSyncPortal';
import RewardPortal from './RewardPortal';
import SchoolCredentialView from './SchoolCredentialView';
import DataCleanupPortal from './DataCleanupPortal';
import CurriculumCoveragePortal from './CurriculumCoveragePortal';
import FacilitatorAccountHub from './FacilitatorAccountHub';

// Extracted UI Layout components
import ManagementHeader from './ManagementHeader';
import ManagementTabs, { ManagementTabType } from './ManagementTabs';

interface ManagementDeskProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  subjects: string[];
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  processedSnapshot: ProcessedStudent[];
  onLoadDummyData: () => void;
  onClearData: () => void;
  isFacilitator?: boolean;
  // Fix: activeFacilitator now typed as simplified identity object expected by core sub-portals
  activeFacilitator?: { name: string; subject: string; email?: string } | null;
  loggedInUser?: { name: string; nodeId: string } | null;
}

const ManagementDesk: React.FC<ManagementDeskProps> = ({ 
  students, setStudents, facilitators, setFacilitators, subjects, settings, onSettingChange, onBulkUpdate, onSave, processedSnapshot, onLoadDummyData, onClearData,
  isFacilitator, activeFacilitator, loggedInUser
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTabType>(isFacilitator ? 'facilitatorDesk' : 'scoreEntry');

  const resetSchoolParticulars = () => {
    if (window.confirm("CRITICAL ACTION: Reset all institutional identity particulars AND CLEAR ALL SHEETS? This cannot be undone.")) {
      onBulkUpdate({
        schoolName: "SS-MAP ACADEMY",
        schoolLogo: "",
        schoolContact: "+233 24 350 4091",
        schoolEmail: "info@ssmap.app",
        headTeacherName: "HEADMASTER NAME",
        academicYear: "2024/2025",
        termInfo: "TERM 2",
        examTitle: "OFFICIAL MOCK ASSESSMENT SERIES",
        nextTermBegin: "2025-05-12",
        accessCode: "",
        schoolNumber: ""
      });

      setStudents(prev => prev.map(student => ({
        ...student, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}, seriesHistory: {}, attendance: 0, conductRemark: ""
      })));
      setTimeout(() => onSave(), 500);
      alert("Institutional defaults restored.");
    }
  };

  return (
    <div className="p-0 max-w-7xl mx-auto pb-24 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <ManagementHeader 
            schoolName={settings.schoolName} 
            isHubActive={!!settings.schoolNumber} 
            onLoadDummyData={onLoadDummyData} 
            onClearData={onClearData}
            hasData={students.length > 0}
            isFacilitator={isFacilitator}
            loggedInUser={loggedInUser}
        />
        <ManagementTabs activeTab={activeTab} setActiveTab={setActiveTab} isFacilitator={isFacilitator} />
        <div className="p-6 md:p-10 min-h-[600px]">
          {activeTab === 'scoreEntry' && (
            <ScoreEntryPortal 
              students={students} 
              setStudents={setStudents} 
              settings={settings} 
              onSettingChange={onSettingChange} 
              subjects={subjects} 
              processedSnapshot={processedSnapshot} 
              onSave={onSave}
              // Fix: activeFacilitator simplified shape matches ScoreEntryPortal requirement
              activeFacilitator={activeFacilitator}
            />
          )}
          {activeTab === 'facilitatorDesk' && <FacilitatorDesk students={students} setStudents={setStudents} settings={settings} onSettingChange={onSettingChange} onSave={onSave} />}
          {/* Fix: Resolved full StaffAssignment record for account view using dictionary lookup */}
          {activeTab === 'facilitatorAccount' && activeFacilitator?.email && facilitators[activeFacilitator.email] && (
            <FacilitatorAccountHub activeFacilitator={facilitators[activeFacilitator.email]} settings={settings} />
          )}
          {activeTab === 'curriculumScope' && (
             <CurriculumCoveragePortal 
               settings={settings} 
               students={students} 
               subjects={subjects} 
               isFacilitator={isFacilitator} 
               activeFacilitator={activeFacilitator} 
               onSave={onSave} 
             />
          )}
          {activeTab === 'likelyQuestions' && (
            <LikelyQuestionDesk 
              // Fix: Passed full record to LikelyQuestionDesk using email lookup
              activeFacilitator={activeFacilitator?.email ? facilitators[activeFacilitator.email] : null} 
              schoolName={settings.schoolName} 
              subjects={subjects} 
              facilitators={facilitators} 
              isAdmin={!isFacilitator}
            />
          )}
          {activeTab === 'questionsBank' && (
            <SubjectQuestionsBank 
              // Fix: Passed full record to SubjectQuestionsBank using email lookup
              activeFacilitator={activeFacilitator?.email ? facilitators[activeFacilitator.email] : null} 
              subjects={subjects} 
            />
          )}
          {activeTab === 'enrolmentForward' && (
            <EnrolmentForwardingPortal 
              settings={settings} 
              students={students} 
              facilitators={facilitators} 
              isFacilitator={isFacilitator}
              activeFacilitator={activeFacilitator}
            />
          )}
          {activeTab === 'localSync' && <LocalSyncPortal students={students} settings={settings} />}
          {activeTab === 'rewards' && <RewardPortal students={students} setStudents={setStudents} settings={settings} subjects={subjects} facilitators={facilitators} onSave={onSave} onSettingChange={onSettingChange} isFacilitator={isFacilitator} />}
          {activeTab === 'cleanup' && (
            <DataCleanupPortal 
              students={students} 
              setStudents={setStudents} 
              settings={settings} 
              onSave={onSave} 
              subjects={subjects} 
              isFacilitator={isFacilitator}
              activeFacilitator={activeFacilitator}
            />
          )}
          {activeTab === 'school' && (
            <div className="space-y-6">
              <div className="flex justify-end"><button onClick={resetSchoolParticulars} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-red-100 shadow-sm">Reset Defaults</button></div>
              <AcademyIdentityPortal settings={settings} onSettingChange={onSettingChange} onSave={onSave} />
            </div>
          )}
          {activeTab === 'credentials' && <SchoolCredentialView settings={settings} studentCount={students.length} />}
          {activeTab === 'pupils' && <PupilSBAPortal students={students} setStudents={setStudents} settings={settings} subjects={subjects} onSave={onSave} />}
          {activeTab === 'facilitators' && (
            <FacilitatorPortal 
              subjects={subjects} 
              facilitators={facilitators} 
              setFacilitators={setFacilitators} 
              settings={settings} 
              onSave={onSave} 
              isFacilitator={isFacilitator} 
              activeFacilitator={activeFacilitator} 
            />
          )}
          {activeTab === 'grading' && <GradingConfigPortal settings={settings} onSettingChange={onSettingChange} />}
          {activeTab === 'history' && <SeriesHistoryPortal students={students} settings={settings} />}
          {activeTab === 'resources' && <MockResourcesPortal settings={settings} onSettingChange={onSettingChange} subjects={subjects} />}
        </div>
      </div>
    </div>
  );
};

export default ManagementDesk;

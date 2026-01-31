import React, { useState } from 'react';
import { StudentData, GlobalSettings, ProcessedStudent, StaffAssignment } from '../types';
import ScoreEntryPortal from './management/ScoreEntryPortal';
import AcademyIdentityPortal from './management/AcademyIdentityPortal';
import PupilSBAPortal from './management/PupilSBAPortal';
import FacilitatorPortal from './management/FacilitatorPortal';
import GradingConfigPortal from './management/GradingConfigPortal';
import SeriesHistoryPortal from './management/SeriesHistoryPortal';
import MockResourcesPortal from './management/MockResourcesPortal';
import SchoolRegistrationPortal from './management/SchoolRegistrationPortal';
import FacilitatorDesk from './management/FacilitatorDesk';

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
  onRegistrationStart?: () => void;
  onRegistrationComplete?: () => void;
  onRegistrationExit?: () => void;
  onResetStudents?: () => void;
}

const ManagementDesk: React.FC<ManagementDeskProps> = ({ 
  students, setStudents, facilitators, setFacilitators, subjects, settings, onSettingChange, onBulkUpdate, onSave, processedSnapshot, onLoadDummyData,
  onRegistrationStart, onRegistrationComplete, onRegistrationExit, onResetStudents
}) => {
  type Tab = 'scoreEntry' | 'school' | 'enrollment' | 'pupils' | 'facilitators' | 'grading' | 'history' | 'resources' | 'facilitatorDesk';
  const [activeTab, setActiveTab] = useState<Tab>(settings.accessCode ? 'scoreEntry' : 'enrollment');

  const resetSchoolParticulars = () => {
    if (window.confirm("CRITICAL ACTION: Reset all institutional identity particulars AND CLEAR ALL SHEETS? This cannot be undone.")) {
      onBulkUpdate({
        schoolName: "UNITED BAYLOR ACADEMY",
        schoolLogo: "",
        schoolContact: "+233 00 000 0000",
        schoolEmail: "info@ssmap.app",
        headTeacherName: "HEADMASTER NAME",
        academicYear: "2024/2024/2025",
        termInfo: "TERM 2",
        examTitle: "2ND MOCK 2025 BROAD SHEET EXAMINATION",
        nextTermBegin: "2025-05-12",
        accessCode: "",
        schoolNumber: ""
      });

      setStudents(prev => prev.map(student => ({
        ...student, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}, seriesHistory: {}, attendance: 0, conductRemark: ""
      })));
      setTimeout(() => onSave(), 500);
      if (onRegistrationExit) onRegistrationExit();
      alert("Institutional defaults restored.");
    }
  };

  return (
    <div className="p-0 sm:p-4 md:p-8 max-w-7xl mx-auto pb-24 sm:pb-8">
      <div className="bg-white rounded-none sm:rounded-2xl shadow-xl overflow-hidden border-b sm:border border-gray-200">
        
        <div className="bg-blue-900 text-white p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M9 20v-10M15 20V4M3 20h18"></path></svg>
                Management Hub
              </h2>
              <p className="text-blue-300 text-[9px] sm:text-xs uppercase tracking-widest mt-1 font-bold">Network Connectivity: {settings.schoolNumber ? 'HUB ACTIVE' : 'LOCAL ONLY'}</p>
            </div>
            <button onClick={onLoadDummyData} className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/20 transition-all active:scale-95 shadow-md">
              Initialize Demo
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto no-scrollbar sticky top-0 z-30">
          {[
            { id: 'scoreEntry', label: 'Score Entry' },
            { id: 'facilitatorDesk', label: 'Facilitator Desk' },
            { id: 'enrollment', label: 'Enrollment' },
            { id: 'school', label: 'Identity' },
            { id: 'pupils', label: 'Pupils & SBA' },
            { id: 'facilitators', label: 'Staff Hub' },
            { id: 'grading', label: 'Grading' },
            { id: 'history', label: 'History' },
            { id: 'resources', label: 'Resources' }
          ].map(tab => (
            <button 
              key={tab.id} 
              onClick={() => {
                setActiveTab(tab.id as Tab);
                if (tab.id === 'enrollment' && onRegistrationStart) onRegistrationStart();
              }} 
              className={`px-6 py-4 font-black text-[10px] uppercase transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'bg-white text-blue-900 border-blue-900' : 'text-gray-400 border-transparent hover:text-blue-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-6 md:p-8 min-h-[500px]">
          {activeTab === 'scoreEntry' && (
            <ScoreEntryPortal 
              students={students} setStudents={setStudents} settings={settings} onSettingChange={onSettingChange} subjects={subjects} processedSnapshot={processedSnapshot} onSave={onSave} 
            />
          )}
          {activeTab === 'facilitatorDesk' && (
            <FacilitatorDesk 
              students={students} setStudents={setStudents} settings={settings} onSettingChange={onSettingChange} onSave={onSave}
            />
          )}
          {activeTab === 'enrollment' && (
            <SchoolRegistrationPortal 
              settings={settings} 
              onBulkUpdate={onBulkUpdate} 
              onSave={onSave} 
              onComplete={onRegistrationComplete}
              onResetStudents={onResetStudents}
              onSwitchToLogin={() => setActiveTab('scoreEntry')}
            />
          )}
          {activeTab === 'school' && (
            <div className="space-y-6">
              <div className="flex justify-end"><button onClick={resetSchoolParticulars} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-black text-[10px] uppercase border border-red-100 shadow-sm">Reset Defaults</button></div>
              <AcademyIdentityPortal settings={settings} onSettingChange={onSettingChange} onSave={onSave} />
            </div>
          )}
          {activeTab === 'pupils' && <PupilSBAPortal students={students} setStudents={setStudents} settings={settings} subjects={subjects} onSave={onSave} />}
          {/* Fix: Added missing onSave prop to FacilitatorPortal to satisfy its FacilitatorPortalProps interface */}
          {activeTab === 'facilitators' && <FacilitatorPortal subjects={subjects} facilitators={facilitators} setFacilitators={setFacilitators} settings={settings} onSave={onSave} />}
          {activeTab === 'grading' && <GradingConfigPortal settings={settings} onSettingChange={onSettingChange} />}
          {activeTab === 'history' && <SeriesHistoryPortal students={students} settings={settings} />}
          {activeTab === 'resources' && <MockResourcesPortal settings={settings} onSettingChange={onSettingChange} subjects={subjects} />}
        </div>
      </div>
    </div>
  );
};

export default ManagementDesk;
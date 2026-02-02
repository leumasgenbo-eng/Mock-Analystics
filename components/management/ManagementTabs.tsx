
import React from 'react';

export type ManagementTabType = 'scoreEntry' | 'school' | 'credentials' | 'enrolmentForward' | 'pupils' | 'facilitators' | 'grading' | 'history' | 'resources' | 'facilitatorDesk' | 'localSync' | 'rewards' | 'likelyQuestions' | 'questionsBank' | 'cleanup' | 'curriculumScope' | 'facilitatorAccount';

interface ManagementTabsProps {
  activeTab: ManagementTabType;
  setActiveTab: (tab: ManagementTabType) => void;
  onRegistrationStart?: () => void;
  isFacilitator?: boolean;
}

const ManagementTabs: React.FC<ManagementTabsProps> = ({ activeTab, setActiveTab, onRegistrationStart, isFacilitator }) => {
  const tabs = [
    { id: 'scoreEntry', label: 'Score Entry' },
    { id: 'facilitatorDesk', label: 'Attendance & Conduct' },
    { id: 'curriculumScope', label: 'Scope Tracker' },
    { id: 'facilitatorAccount', label: 'Instructional Vault', facilitatorOnly: true },
    { id: 'questionsBank', label: 'Questions Bank' },
    { id: 'likelyQuestions', label: 'Submit Likely Qs' },
    { id: 'enrolmentForward', label: isFacilitator ? 'Payroll Status' : 'Enrolment Forwarding' },
    { id: 'cleanup', label: isFacilitator ? 'Subject Purge' : 'Data Forge' },
    { id: 'localSync', label: 'Local Sync Hub', adminOnly: true },
    { id: 'rewards', label: 'Reward Hub', adminOnly: true },
    { id: 'credentials', label: 'School Credential', adminOnly: true },
    { id: 'school', label: 'Identity', adminOnly: true },
    { id: 'pupils', label: 'Pupils & SBA', adminOnly: true },
    { id: 'facilitators', label: 'Staff Hub', adminOnly: true },
    { id: 'grading', label: 'Grading', adminOnly: true },
    { id: 'history', label: 'History', adminOnly: true },
    { id: 'resources', label: 'Resources' }
  ].filter(t => {
    if (isFacilitator) return !t.adminOnly;
    return !t.facilitatorOnly;
  });

  return (
    <div className="flex border-b border-gray-100 bg-gray-50 overflow-x-auto no-scrollbar sticky top-0 z-30 shadow-sm">
      {tabs.map(tab => (
        <button 
          key={tab.id} 
          onClick={() => {
            setActiveTab(tab.id as ManagementTabType);
            if (tab.id === 'credentials' && onRegistrationStart) onRegistrationStart();
          }} 
          className={`px-6 py-4 font-black text-[10px] uppercase transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'bg-white text-blue-900 border-blue-900' : 'text-gray-400 border-transparent hover:text-blue-700'}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ManagementTabs;

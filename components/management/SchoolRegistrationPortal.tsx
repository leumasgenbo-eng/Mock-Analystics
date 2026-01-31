import React, { useState } from 'react';
import { GlobalSettings, SchoolRegistryEntry } from '../../types';

interface SchoolRegistrationPortalProps {
  settings: GlobalSettings;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  onComplete?: () => void;
  onExit?: () => void;
  onResetStudents?: () => void;
  onSwitchToLogin?: () => void;
}

const SchoolRegistrationPortal: React.FC<SchoolRegistrationPortalProps> = ({ 
  settings, onBulkUpdate, onSave, onComplete, onExit, onResetStudents, onSwitchToLogin 
}) => {
  const isExistingRegistration = !!settings.accessCode;
  const [isRegistered, setIsRegistered] = useState(isExistingRegistration);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Force blank slate for new enrollments
  const [formData, setFormData] = useState({
    schoolName: isExistingRegistration ? settings.schoolName : '',
    location: isExistingRegistration ? settings.schoolAddress : '',
    registrant: isExistingRegistration ? settings.registrantName || '' : '',
    registrantEmail: isExistingRegistration ? settings.registrantEmail || '' : '',
    schoolEmail: isExistingRegistration ? settings.schoolEmail || '' : '',
    contact: isExistingRegistration ? settings.schoolContact || '' : ''
  });

  const generateAccessKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'SSMAP-SEC-';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const generateEnrollmentID = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ID-${year}-${rand}`;
  };

  const handleEnrollment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!(formData.schoolName || "").trim() || !(formData.registrant || "").trim()) {
      alert("Please provide the basic registration particulars.");
      return;
    }

    setIsSyncing(true);

    // 1. Verification Logic: Prevent redundant network entry
    const registryData = localStorage.getItem('uba_global_registry');
    if (registryData) {
      const existingRegistry: SchoolRegistryEntry[] = JSON.parse(registryData);
      const isDuplicate = existingRegistry.some(r => 
        (r.name || "").trim().toLowerCase() === (formData.schoolName || "").trim().toLowerCase()
      );

      if (isDuplicate) {
        setIsSyncing(false);
        alert(`REGISTRATION DENIED: An institution named "${formData.schoolName.toUpperCase()}" is already active in the network registry. Duplicate registration is restricted to maintain data integrity. Please use the administrative login keys.`);
        return;
      }
    }

    // 2. Simulation Logic
    setTimeout(() => {
      const newID = generateEnrollmentID();
      const newKey = generateAccessKey();

      onBulkUpdate({
        schoolName: (formData.schoolName || "").trim().toUpperCase(),
        schoolAddress: (formData.location || "").trim().toUpperCase(),
        registrantName: (formData.registrant || "").trim().toUpperCase(),
        registrantEmail: (formData.registrantEmail || "").trim().toLowerCase(),
        schoolEmail: (formData.schoolEmail || "").trim().toLowerCase(),
        schoolContact: (formData.contact || "").trim(),
        schoolNumber: newID,
        accessCode: newKey,
        enrollmentDate: new Date().toLocaleDateString()
      });

      if (onResetStudents) {
        onResetStudents();
      }

      setIsSyncing(false);
      setIsRegistered(true);
      
      setTimeout(() => {
        onSave();
      }, 500);
    }, 2000);
  };

  const downloadCredentials = () => {
    const text = `SS-MAP - INSTITUTIONAL ACCESS PACK\n` +
                 `==================================================\n\n` +
                 `USE THESE 4 FIELDS TO LOGIN TO YOUR ACCOUNT:\n\n` +
                 `1. Institution Name:   ${settings.schoolName}\n` +
                 `2. Institution ID:     ${settings.schoolNumber}\n` +
                 `3. Registrant Identity: ${settings.registrantName}\n` +
                 `4. System Access Key:   ${settings.accessCode}\n\n` +
                 `--------------------------------------------------\n` +
                 `REGISTRATION DETAILS:\n` +
                 `Location:         ${settings.schoolAddress}\n` +
                 `Registrant Email: ${settings.registrantEmail}\n` +
                 `School Email:     ${settings.schoolEmail}\n` +
                 `Contact:          ${settings.schoolContact}\n` +
                 `Date Registered:  ${settings.enrollmentDate}\n\n` +
                 `* IMPORTANT: Save this file. Your Access Key is unique.`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSMap_Credentials_${settings.schoolNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCredentials = () => {
    const text = `Institution: ${settings.schoolName}\nID: ${settings.schoolNumber}\nIdentity: ${settings.registrantName}\nKey: ${settings.accessCode}`;
    navigator.clipboard.writeText(text);
    alert("Credentials copied to clipboard.");
  };

  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-24 h-24 border-8 border-slate-100 border-t-blue-900 rounded-full animate-spin"></div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registering Institution...</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Validating institutional availability</p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="animate-in zoom-in-95 duration-700">
        <div className="bg-slate-900 rounded-[3rem] p-10 md:p-16 shadow-2xl border border-white/10 relative overflow-hidden text-center space-y-8">
           <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
           
           <div className="relative">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Institutional Login Pack</h2>
              <p className="text-blue-300/60 font-bold text-xs uppercase tracking-widest mt-1">Capture these 4 fields. You will need them to login.</p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {[
                { label: 'Institution Name', val: settings.schoolName },
                { label: 'Institution ID (Enrollment #)', val: settings.schoolNumber },
                { label: 'Registrant Identity', val: settings.registrantName },
                { label: 'System Access Key', val: settings.accessCode }
              ].map(field => (
                <div key={field.label} className="bg-white/5 border border-white/10 p-6 rounded-2xl text-left hover:bg-white/10 transition-colors">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block mb-1">{field.label}</span>
                  <p className="text-lg font-black text-white truncate">{field.val}</p>
                </div>
              ))}
           </div>

           <div className="flex flex-wrap justify-center gap-3">
              <button onClick={copyCredentials} className="bg-white/10 hover:bg-white text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Copy Pack</button>
              <button onClick={downloadCredentials} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all">Download (.txt)</button>
           </div>

           <div className="pt-8 border-t border-white/5 max-w-xl mx-auto">
              <p className="text-[10px] text-gray-500 uppercase font-bold leading-relaxed mb-6 italic text-blue-200">
                Notice: For security, your access key is only visible once. Your pupil database is ready for entry.
              </p>
              <button 
                onClick={onComplete}
                className="w-full max-w-md mx-auto bg-white text-slate-900 py-6 rounded-2xl font-black text-[11px] uppercase shadow-2xl transition-all active:scale-95 tracking-[0.2em]"
              >
                PROCEED TO LOGIN GATE
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="relative space-y-10 max-w-4xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">SSMap - MOCK Examination ANALYTICS</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Onboard your school to the SS-Map network</p>
          </div>

          <form onSubmit={handleEnrollment} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div className="space-y-1.5 md:col-span-2">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">School Name</label>
               <input 
                 type="text" 
                 placeholder="ENTER SCHOOL NAME..."
                 value={formData.schoolName}
                 onChange={(e) => setFormData({...formData, schoolName: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                 required
               />
            </div>

            <div className="space-y-1.5 md:col-span-2">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">School Location</label>
               <input 
                 type="text" 
                 placeholder="TOWN, REGION, COUNTRY..."
                 value={formData.location}
                 onChange={(e) => setFormData({...formData, location: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                 required
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Registrant Name</label>
               <input 
                 type="text" 
                 placeholder="FULL NAME..."
                 value={formData.registrant}
                 onChange={(e) => setFormData({...formData, registrant: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase"
                 required
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Registrant Email</label>
               <input 
                 type="email" 
                 placeholder="PERSONAL@EMAIL.COM"
                 value={formData.registrantEmail}
                 onChange={(e) => setFormData({...formData, registrantEmail: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                 required
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">School Official Email</label>
               <input 
                 type="email" 
                 placeholder="INFO@SCHOOL.COM"
                 value={formData.schoolEmail}
                 onChange={(e) => setFormData({...formData, schoolEmail: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                 required
               />
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Primary Contact</label>
               <input 
                 type="text" 
                 placeholder="000 000 0000"
                 value={formData.contact}
                 onChange={(e) => setFormData({...formData, contact: e.target.value})}
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                 required
               />
            </div>

            <div className="md:col-span-2 pt-8 space-y-6">
              <button 
                type="submit" 
                className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-4"
              >
                Execute SS-Map Registration
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
              </button>
              
              {onSwitchToLogin && (
                <div className="text-center">
                  <button 
                    type="button"
                    onClick={onSwitchToLogin}
                    className="text-[10px] font-black text-blue-900 uppercase tracking-[0.3em] hover:text-indigo-600 transition-colors border-b-2 border-transparent hover:border-indigo-600 pb-1"
                  >
                    Registered Member? Login Here
                  </button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;
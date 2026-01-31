
import React, { useState } from 'react';
import { GlobalSettings } from '../types';

interface LoginPortalProps {
  settings: GlobalSettings;
  onLoginSuccess: () => void;
  onSuperAdminLogin: () => void;
}

const LoginPortal: React.FC<LoginPortalProps> = ({ settings, onLoginSuccess, onSuperAdminLogin }) => {
  const [credentials, setCredentials] = useState({
    schoolName: '',
    schoolNumber: '',
    registrant: '',
    accessKey: ''
  });
  const [error, setError] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // HQ Master Access (Global Overseer)
    if (credentials.accessKey === "UBA-HQ-MASTER-2025") {
      onSuperAdminLogin();
      return;
    }

    // Normal Institution Authentication
    const inputSchoolName = credentials.schoolName.trim().toUpperCase();
    const inputSchoolNumber = credentials.schoolNumber.trim().toUpperCase();
    const inputRegistrant = credentials.registrant.trim().toUpperCase();
    const inputAccessKey = credentials.accessKey.trim().toUpperCase();

    const targetSchoolName = (settings.schoolName || "").trim().toUpperCase();
    const targetSchoolNumber = (settings.schoolNumber || "").trim().toUpperCase();
    const targetRegistrant = (settings.registrantName || "").trim().toUpperCase();
    const targetAccessKey = (settings.accessCode || "").trim().toUpperCase();

    if (inputSchoolName === targetSchoolName && inputSchoolNumber === targetSchoolNumber && 
        inputRegistrant === targetRegistrant && inputAccessKey === targetAccessKey) {
      onLoginSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 4000);
    }
  };

  const handleFactoryReset = () => {
    if (window.confirm("EMERGENCY ACTION: This will PERMANENTLY DELETE all local institution data. Proceed only if authorized.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="text-center relative mb-8">
          <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl transform hover:rotate-12 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">System Authenticator</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2">SS-Map Network Verification</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Institution Name</label>
              <input type="text" value={credentials.schoolName} onChange={(e) => setCredentials({...credentials, schoolName: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" placeholder="NAME..." />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Institution ID (Enrollment #)</label>
              <input type="text" value={credentials.schoolNumber} onChange={(e) => setCredentials({...credentials, schoolNumber: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" placeholder="ID-XXXX-XXX" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest">Registrant Identity</label>
              <input type="text" value={credentials.registrant} onChange={(e) => setCredentials({...credentials, registrant: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" placeholder="FULL NAME..." />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-indigo-900 uppercase tracking-widest">System Access Key</label>
              <input type="password" value={credentials.accessKey} onChange={(e) => setCredentials({...credentials, accessKey: e.target.value})} className="w-full bg-indigo-50/30 border border-indigo-100 rounded-2xl px-5 py-4 text-xs font-mono font-black outline-none focus:ring-4 focus:ring-indigo-500/10 uppercase" placeholder="SSMAP-SEC-XXXXXX" />
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-[10px] font-black uppercase text-center border border-red-100 animate-pulse">Authentication Failed: Check login pack details</div>}

          <button type="submit" className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-95 mt-4">
            Verify Hub Credentials
          </button>
        </form>

        <div className="pt-8 text-center">
           <button onClick={() => setShowRecovery(true)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Support Protocol & Emergency Access?</button>
        </div>

        {showRecovery && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative border border-gray-100 animate-in zoom-in-95 duration-300">
                <button onClick={() => setShowRecovery(false)} className="absolute top-8 right-8 text-gray-400 hover:text-black">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Network Support</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Verification Required</p>
                </div>
                <div className="space-y-6">
                  <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-[11px] font-bold text-blue-900 leading-relaxed text-center">
                    Contact the SS-Map Network Registry to recover lost keys or verify institutional status.
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry</span>
                      <span className="text-xs font-black text-blue-900 tracking-widest">0243504091</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 px-6 py-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mail</span>
                      <span className="text-xs font-black text-blue-900">leumasgenbo4@gmail.com</span>
                    </div>
                  </div>
                  <button onClick={handleFactoryReset} className="w-full py-4 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all">Emergency Wipe (System Clear)</button>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPortal;

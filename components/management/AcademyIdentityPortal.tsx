import React, { useRef, useState } from 'react';
import { GlobalSettings } from '../../types';

interface AcademyIdentityPortalProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onSave: () => void;
}

const AcademyIdentityPortal: React.FC<AcademyIdentityPortalProps> = ({ settings, onSettingChange, onSave }) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showKeys, setShowKeys] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onSettingChange('schoolLogo', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadCredentials = () => {
    const text = `UNITED BAYLOR ACADEMY - INSTITUTIONAL ACCESS PACK\n` +
                 `==================================================\n\n` +
                 `LOGIN CREDENTIALS:\n\n` +
                 `1. Institution Name:   ${settings.schoolName}\n` +
                 `2. Institution ID:     ${settings.schoolNumber}\n` +
                 `3. Registrant Identity: ${settings.registrantName}\n` +
                 `4. System Access Key:   ${settings.accessCode}\n\n` +
                 `--------------------------------------------------\n` +
                 `SECURITY NODE KEYS:\n` +
                 `Staff Passkey:    ${settings.staffAccessCode}\n` +
                 `Pupil Passkey:    ${settings.pupilAccessCode}\n\n` +
                 `* IMPORTANT: Save this file. Your Access Key is required for identity recall.`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UBA_Credentials_${settings.schoolNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetRoleCode = (role: 'staff' | 'pupil') => {
    const newCode = `${role.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    if (window.confirm(`SECURITY PROTOCOL: Reset ${role} access code? All currently logged-in ${role}s will need the new code immediately.`)) {
      onSettingChange(role === 'staff' ? 'staffAccessCode' : 'pupilAccessCode', newCode);
      setTimeout(onSave, 500);
    }
  };

  const fields = [
    { label: 'Academy Name', key: 'schoolName', val: settings.schoolName },
    { label: 'Academy Motto', key: 'schoolMotto', val: settings.schoolMotto || '' },
    { label: 'Official Website', key: 'schoolWebsite', val: settings.schoolWebsite || '' },
    { label: 'Report Header Title', key: 'examTitle', val: settings.examTitle },
    { label: 'Telephone Contact', key: 'schoolContact', val: settings.schoolContact },
    { label: 'Email Address', key: 'schoolEmail', val: settings.schoolEmail },
    { label: 'Academic Year', key: 'academicYear', val: settings.academicYear },
    { label: 'Term/Mock Info', key: 'termInfo', val: settings.termInfo },
    { label: 'Head Teacher Name', key: 'headTeacherName', val: settings.headTeacherName },
    { label: 'Admin Role Title', key: 'adminRoleTitle', val: settings.adminRoleTitle || 'Academy Director' },
    { label: 'Registry Role Title', key: 'registryRoleTitle', val: settings.registryRoleTitle || 'Examination Registry' },
    { label: 'Next Term Resumption', key: 'nextTermBegin', val: settings.nextTermBegin }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Security Node Control */}
      <section className="bg-slate-900 text-white p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-1">
              <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Security Node Control</h4>
              <p className="text-xl font-black uppercase tracking-tight">Institutional Access Management</p>
           </div>
           <div className="flex gap-3">
             <button 
               onClick={handleDownloadCredentials}
               className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2"
             >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
               Download Access Pack
             </button>
             <button 
               onClick={() => setShowKeys(!showKeys)}
               className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-white/10 transition-all flex items-center gap-2"
             >
               {showKeys ? 'Hide Keys' : 'View Passkeys'}
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
             </button>
           </div>
        </div>

        {showKeys && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
             <div className="bg-white/5 border border-white/10 p-5 rounded-2xl">
                <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Master Admin Key</span>
                <p className="text-sm font-mono font-black text-red-400">{settings.accessCode}</p>
             </div>
             <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center group">
                <div>
                   <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Facilitator Passkey</span>
                   <p className="text-sm font-mono font-black text-blue-400">{settings.staffAccessCode}</p>
                </div>
                <button onClick={() => handleResetRoleCode('staff')} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-opacity">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
             </div>
             <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex justify-between items-center group">
                <div>
                   <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Pupil Passkey</span>
                   <p className="text-sm font-mono font-black text-emerald-400">{settings.pupilAccessCode}</p>
                </div>
                <button onClick={() => handleResetRoleCode('pupil')} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-white transition-opacity">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                </button>
             </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col items-center">
          <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2 w-full">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Academy Branding
          </h4>
          <div className="w-48 h-48 bg-white rounded-3xl border border-gray-200 flex items-center justify-center overflow-hidden shadow-xl p-6 relative group">
            {settings.schoolLogo ? (
              <>
                <img src={settings.schoolLogo} alt="Logo" className="max-w-full max-h-full object-contain" />
                <button onClick={() => onSettingChange('schoolLogo', '')} className="absolute inset-0 bg-black/50 text-white font-black text-[10px] uppercase opacity-0 group-hover:opacity-100 transition-opacity">Remove Logo</button>
              </>
            ) : <span className="text-[10px] font-black text-gray-300 uppercase">No Logo Uploaded</span>}
          </div>
          <button onClick={() => logoInputRef.current?.click()} className="mt-8 bg-blue-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all w-full">Upload Institutional Seal</button>
          <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
        </section>

        <section className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          {fields.map(field => (
            <div key={field.key} className="flex flex-col space-y-1.5 border-b border-gray-50 pb-3 group/field">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest group-hover/field:text-blue-500 transition-colors">{field.label}</label>
              <input 
                type="text" 
                value={field.val as string} 
                onChange={(e) => onSettingChange(field.key as any, e.target.value.toUpperCase())} 
                className="focus:border-blue-600 outline-none text-sm font-black text-blue-900 py-1 transition-all uppercase bg-transparent" 
              />
            </div>
          ))}
        </section>
      </div>

      <div className="pt-4 flex justify-center">
        <button onClick={onSave} className="w-full md:w-auto bg-yellow-500 text-blue-900 px-16 py-5 rounded-[2rem] font-black text-xs uppercase shadow-2xl hover:bg-yellow-600 active:scale-95 transition-all tracking-widest">Update Institutional Profile</button>
      </div>
    </div>
  );
};

export default AcademyIdentityPortal;
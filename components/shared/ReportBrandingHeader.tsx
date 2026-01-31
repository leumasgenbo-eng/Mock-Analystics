import React from 'react';
import { GlobalSettings } from '../../types';
import EditableField from './EditableField';

interface ReportBrandingHeaderProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  reportTitle: string;
  subtitle?: string;
  isLandscape?: boolean;
  readOnly?: boolean;
}

const ReportBrandingHeader: React.FC<ReportBrandingHeaderProps> = ({ 
  settings, 
  onSettingChange, 
  reportTitle, 
  subtitle, 
  isLandscape = false, 
  readOnly = false 
}) => {
  const renderEditable = (value: string, key: keyof GlobalSettings, className: string = "", placeholder: string = "", isUpperCase: boolean = false) => {
    if (readOnly) return <span className={className}>{value}</span>;
    return (
      <EditableField 
        value={value || ""} 
        onChange={(v) => onSettingChange(key, isUpperCase ? v.toUpperCase() : v)} 
        className={className} 
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'} font-sans animate-in fade-in duration-700`}>
      {/* Institutional ID - Top level verification */}
      <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6 flex justify-center items-center gap-2">
        <span>INSTITUTIONAL HUB ID:</span>
        {renderEditable(settings.schoolNumber || "SSMAP-HUB-NODE", 'schoolNumber', "border-none font-mono bg-blue-50/50 px-2 rounded")}
      </div>

      {/* Main Identity Row */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-10 mb-6">
        {/* Left Seal / Logo */}
        <div className="w-28 h-28 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain shadow-sm" />
          ) : (
            <div className="w-24 h-24 bg-blue-950 text-white rounded-[2.5rem] flex items-center justify-center font-black text-4xl shadow-2xl border-4 border-blue-900/20">
              {settings.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase() || "UBA"}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {renderEditable(settings.schoolName || "UNITED BAYLOR ACADEMY", 'schoolName', "text-center font-black w-full text-blue-950 border-none", "UNITED BAYLOR ACADEMY", true)}
          </h1>
          <div className="text-[12px] font-black text-blue-900/60 uppercase tracking-[0.3em] italic py-1">
            {renderEditable(settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER", 'schoolMotto', "text-center w-full border-none", "ACADEMY MOTTO...", true)}
          </div>
          <p className="text-[13px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed pt-1">
            {renderEditable(settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA", 'schoolAddress', "text-center w-full text-gray-500 border-none", "ACADEMY ADDRESS...", true)}
          </p>
        </div>

        {/* Decorative Right Seal (Director Signature Node) */}
        <div className="hidden md:flex w-28 h-28 items-center justify-center shrink-0 group">
          <div className="w-24 h-24 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center border-2 border-dashed border-white/20 p-2 shadow-xl group-hover:scale-110 transition-transform">
            <span className="text-[6px] font-black uppercase opacity-40">Verified By</span>
            <div className="text-[7px] font-black uppercase text-center leading-tight">
               {renderEditable(settings.headTeacherName || "DIRECTOR NAME", 'headTeacherName', "border-none text-white text-center")}
            </div>
            <span className="text-[5px] font-mono mt-1 opacity-30">{settings.schoolNumber || "UBA-NODE-2025"}</span>
          </div>
        </div>
      </div>

      {/* Contact Matrix Particulars */}
      <div className="flex justify-center flex-wrap gap-x-12 gap-y-3 text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] pt-5 border-t border-gray-100 mt-6">
        <div className="flex gap-2">
          <span className="text-gray-400">TEL:</span>
          {renderEditable(settings.schoolContact || "+233 24 350 4091", 'schoolContact', "border-none")}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400">WEB:</span>
          {renderEditable(settings.schoolWebsite || "www.unitedbaylor.edu", 'schoolWebsite', "border-none lowercase font-mono")}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400">EMAIL:</span>
          {renderEditable(settings.schoolEmail || "info@unitedbaylor.edu", 'schoolEmail', "border-none lowercase font-mono")}
        </div>
      </div>

      {/* Assessment Series Branding Stripe */}
      <div className="mt-10 bg-slate-900 text-white py-8 rounded-[2rem] relative overflow-hidden group shadow-2xl border-4 border-white">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[3000ms]"></div>
        <h2 className="text-3xl font-black uppercase tracking-[0.1em] relative">
          {renderEditable(reportTitle, 'examTitle', "text-center w-full border-none bg-transparent text-white", "", true)}
        </h2>
        {subtitle && <p className="text-[10px] font-black text-blue-400 tracking-[0.6em] uppercase mt-3">{subtitle}</p>}
      </div>
      
      {/* Session Metadata Shards */}
      <div className="flex justify-center flex-wrap items-center gap-12 text-[12px] font-black text-gray-800 uppercase tracking-[0.3em] mt-8 px-4">
         <div className="flex flex-col items-center">
           <span className="text-[8px] text-blue-400 mb-1 uppercase tracking-widest">Active Series</span>
           <span className="text-blue-600 underline decoration-double underline-offset-4 font-mono uppercase">
              {settings.activeMock}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[8px] text-blue-400 mb-1 uppercase tracking-widest">Term Shard</span>
           <span className="bg-blue-900 text-white px-5 py-1 rounded-xl shadow-lg">
              {renderEditable(settings.termInfo || "TERM 2", 'termInfo', "border-none bg-transparent text-white", "", true)}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[8px] text-blue-400 mb-1 uppercase tracking-widest">Academic Year</span>
           <span className="italic px-2 bg-gray-50 rounded">
              {renderEditable(settings.academicYear || "2024/2025", 'academicYear', "border-none bg-transparent text-gray-800", "", true)}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[8px] text-blue-400 mb-1 uppercase tracking-widest">Authority Title</span>
           <span className="font-bold text-slate-500 border-b border-slate-200">
              {renderEditable(settings.adminRoleTitle || "Academy Director", 'adminRoleTitle', "border-none bg-transparent", "", true)}
           </span>
         </div>
         <div className="flex flex-col items-center">
           <span className="text-[8px] text-blue-400 mb-1 uppercase tracking-widest">Registry Node</span>
           <span className="font-bold text-slate-500 border-b border-slate-200">
              {renderEditable(settings.registryRoleTitle || "Examination Registry", 'registryRoleTitle', "border-none bg-transparent", "", true)}
           </span>
         </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
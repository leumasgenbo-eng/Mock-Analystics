
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
  return (
    <div className={`text-center relative border-b-[4px] border-double border-blue-950 pb-6 mb-6 w-full font-sans animate-in fade-in duration-1000`}>
      {/* Network Identifier */}
      <div className="text-[8px] font-black text-blue-600 uppercase tracking-[0.5em] mb-4 flex justify-center items-center gap-3 no-print">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
        <span>NETWORK HUB:</span>
        <span className="font-mono bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{settings.schoolNumber || "SMA-NODE-SYNC"}</span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-10">
        {/* Institutional Seal */}
        <div className="w-24 h-24 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-20 h-20 bg-slate-950 text-white rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl border-4 border-white">
              {settings.schoolName?.substring(0,1) || "U"}
            </div>
          )}
        </div>

        {/* Identity Matrix */}
        <div className="flex-1 space-y-1">
          <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {readOnly ? (settings.schoolName || "UNITED BAYLOR ACADEMY") : (
              <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} className="text-center w-full" />
            )}
          </h1>
          <div className="text-[11px] font-bold text-blue-800/50 uppercase tracking-[0.4em] italic">
            {readOnly ? (settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER") : (
              <EditableField value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} onChange={(v) => onSettingChange('schoolMotto', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] pt-1">
            {readOnly ? (settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA") : (
              <EditableField value={settings.schoolAddress} onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Primary Report Identification */}
      <div className="mt-6 mb-4">
         <h2 className="text-xl font-black text-red-700 uppercase tracking-[0.3em] bg-red-50/50 py-2 border-y border-red-100">
           {readOnly ? reportTitle : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full" />}
         </h2>
         {subtitle && <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.6em] mt-2">{subtitle}</p>}
      </div>

      {/* Connectivity Layer */}
      <div className="flex justify-center flex-wrap gap-x-12 gap-y-2 text-[9px] font-black text-blue-950 uppercase tracking-[0.2em] pt-4 border-t border-slate-50">
        <div className="flex gap-2">
          <span className="text-slate-300">TEL:</span>
          {readOnly ? settings.schoolContact : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />}
        </div>
        <div className="flex gap-2">
          <span className="text-slate-300">EMAIL:</span>
          {readOnly ? settings.schoolEmail : <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v.toLowerCase())} />}
        </div>
        <div className="flex gap-2">
          <span className="text-slate-300">WEB:</span>
          {readOnly ? (settings.schoolWebsite || "WWW.UBA.EDU") : <EditableField value={settings.schoolWebsite || "WWW.UBA.EDU"} onChange={(v) => onSettingChange('schoolWebsite', v.toLowerCase())} />}
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;

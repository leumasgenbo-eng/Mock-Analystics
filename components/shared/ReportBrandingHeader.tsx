
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
    <div className={`text-center relative border-b-[4px] border-double border-blue-950 pb-8 mb-8 w-full font-sans animate-in fade-in duration-1000`}>
      {/* Network Metadata */}
      <div className="text-[8px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6 flex justify-center items-center gap-3 no-print">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
        <span>INSTITUTIONAL HUB:</span>
        <span className="font-mono bg-blue-50 px-4 py-1 rounded-lg border border-blue-100">{settings.schoolNumber || "SMA-UBA-NODE"}</span>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-12">
        {/* Seal Node */}
        <div className="w-28 h-28 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl shadow-2xl border-4 border-white">
              {settings.schoolName?.substring(0,1) || "U"}
            </div>
          )}
        </div>

        {/* Identity Cluster */}
        <div className="flex-1 space-y-2">
          <h1 className={`${isLandscape ? 'text-6xl' : 'text-5xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {readOnly ? (settings.schoolName || "UNITED BAYLOR ACADEMY") : (
              <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} className="text-center w-full" />
            )}
          </h1>
          <div className="text-[12px] font-bold text-blue-800/60 uppercase tracking-[0.5em] italic">
            {readOnly ? (settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER") : (
              <EditableField value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} onChange={(v) => onSettingChange('schoolMotto', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
          <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] pt-2">
            {readOnly ? (settings.schoolAddress || "ACADEMY PHYSICAL ADDRESS, REGION") : (
              <EditableField value={settings.schoolAddress} onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Ident Title Cluster */}
      <div className="mt-8 mb-6">
         <h2 className="text-2xl font-black text-red-700 uppercase tracking-[0.4em] bg-red-50/50 py-3 border-y border-red-100">
           {readOnly ? reportTitle : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full" />}
         </h2>
         {subtitle && <p className="text-[11px] font-black text-blue-900 uppercase tracking-[0.6em] mt-3">{subtitle}</p>}
      </div>

      {/* Contact Matrix */}
      <div className="flex justify-center flex-wrap gap-x-14 gap-y-3 text-[10px] font-black text-blue-950 uppercase tracking-[0.3em] pt-6 border-t border-slate-50">
        <div className="flex gap-2">
          <span className="text-slate-300">TEL:</span>
          {readOnly ? settings.schoolContact : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />}
        </div>
        <div className="flex gap-2">
          <span className="text-slate-300">MAIL:</span>
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

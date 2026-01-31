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
    <div className={`text-center relative border-b-[3px] border-double border-blue-900 pb-2 mb-2 w-full font-sans animate-in fade-in duration-700`}>
      {/* CAPI Hub Identifier - Tightened */}
      <div className="text-[7px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2 flex justify-center items-center gap-2 no-print">
        <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse"></div>
        <span>INSTITUTIONAL NODE:</span>
        <span className="font-mono bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{settings.schoolNumber || "UBA-NODE-2025"}</span>
      </div>

      {/* Core Identity Matrix - Compacted */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-2">
        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-white">
              {settings.schoolName?.substring(0,1) || "U"}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-0.5">
          <h1 className={`${isLandscape ? 'text-3xl' : 'text-2xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {readOnly ? (settings.schoolName || "UNITED BAYLOR ACADEMY") : (
              <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} className="text-center w-full" />
            )}
          </h1>
          <div className="text-[9px] font-bold text-blue-800/60 uppercase tracking-[0.2em] italic">
            {readOnly ? (settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER") : (
              <EditableField value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} onChange={(v) => onSettingChange('schoolMotto', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
          <div className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] leading-tight">
            {readOnly ? (settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA") : (
              <EditableField value={settings.schoolAddress} onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Report Identification Stripe - Thinner */}
      {reportTitle && (
        <div className="mt-1 mb-1">
           <h2 className="text-sm font-black text-red-700 uppercase tracking-widest bg-red-50/50 py-0.5 border-y border-red-100">
             {readOnly ? reportTitle : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full" />}
           </h2>
           {subtitle && <p className="text-[8px] font-black text-blue-900 uppercase tracking-[0.2em] mt-0.5">{subtitle}</p>}
        </div>
      )}

      {/* Connectivity Layer - Micro Font */}
      <div className="flex justify-center flex-wrap gap-x-6 gap-y-1 text-[8px] font-black text-blue-950 uppercase tracking-[0.1em] pt-1 border-t border-slate-50 mt-1">
        <div className="flex gap-1">
          <span className="text-gray-400">TEL:</span>
          {readOnly ? settings.schoolContact : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />}
        </div>
        <div className="flex gap-1">
          <span className="text-gray-400">EMAIL:</span>
          {readOnly ? settings.schoolEmail : <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v.toLowerCase())} />}
        </div>
        {settings.schoolWebsite && (
          <div className="flex gap-1">
            <span className="text-gray-400">WEB:</span>
            {readOnly ? settings.schoolWebsite : <EditableField value={settings.schoolWebsite} onChange={(v) => onSettingChange('schoolWebsite', v.toLowerCase())} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
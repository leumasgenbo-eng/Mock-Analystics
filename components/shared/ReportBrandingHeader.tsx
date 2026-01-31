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
    <div className={`text-center relative border-b-[6px] border-double border-blue-900 pb-8 mb-8 w-full font-sans animate-in fade-in duration-700`}>
      {/* CAPI Hub Identifier */}
      <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6 flex justify-center items-center gap-3 no-print">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
        <span>INSTITUTIONAL NODE:</span>
        <span className="font-mono bg-blue-50 px-3 py-0.5 rounded-lg border border-blue-100">{settings.schoolNumber || "UBA-NODE-2025"}</span>
      </div>

      {/* Core Identity Matrix */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-6">
        <div className="w-28 h-28 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-24 h-24 bg-slate-950 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl shadow-2xl border-4 border-white">
              {settings.schoolName?.substring(0,1) || "U"}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {readOnly ? (settings.schoolName || "UNITED BAYLOR ACADEMY") : (
              <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} className="text-center w-full" />
            )}
          </h1>
          <div className="text-[12px] font-bold text-blue-800/60 uppercase tracking-[0.4em] italic py-1">
            {readOnly ? (settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER") : (
              <EditableField value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} onChange={(v) => onSettingChange('schoolMotto', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
          <div className="text-[12px] font-black text-gray-500 uppercase tracking-[0.5em] leading-relaxed pt-1">
            {readOnly ? (settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA") : (
              <EditableField value={settings.schoolAddress} onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} className="text-center w-full" />
            )}
          </div>
        </div>
      </div>

      {/* Report Identification Stripe */}
      {reportTitle && (
        <div className="mt-4 mb-2">
           <h2 className="text-lg font-black text-red-700 uppercase tracking-widest bg-red-50/50 py-1 border-y border-red-100">
             {readOnly ? reportTitle : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full" />}
           </h2>
           {subtitle && <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.3em] mt-1">{subtitle}</p>}
        </div>
      )}

      {/* Connectivity Layer */}
      <div className="flex justify-center flex-wrap gap-x-10 gap-y-2 text-[10px] font-black text-blue-950 uppercase tracking-[0.15em] pt-4 border-t border-slate-100 mt-4">
        <div className="flex gap-2">
          <span className="text-gray-400">TEL:</span>
          {readOnly ? settings.schoolContact : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />}
        </div>
        <div className="flex gap-2">
          <span className="text-gray-400">EMAIL:</span>
          {readOnly ? settings.schoolEmail : <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v.toLowerCase())} />}
        </div>
        {settings.schoolWebsite && (
          <div className="flex gap-2">
            <span className="text-gray-400">WEB:</span>
            {readOnly ? settings.schoolWebsite : <EditableField value={settings.schoolWebsite} onChange={(v) => onSettingChange('schoolWebsite', v.toLowerCase())} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
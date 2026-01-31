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
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-10 mb-10 w-full font-sans animate-in fade-in duration-700`}>
      {/* CAPI Hub Identifier */}
      <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.5em] mb-8 flex justify-center items-center gap-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>CAPI INSTITUTIONAL NODE:</span>
        <span className="font-mono bg-blue-50/50 px-3 py-0.5 rounded-lg border border-blue-100">{settings.schoolNumber || "UBA-HUB-2025"}</span>
      </div>

      {/* Core Identity Matrix */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-8">
        <div className="w-32 h-32 flex items-center justify-center shrink-0">
          {settings.schoolLogo ? (
            <img src={settings.schoolLogo} alt="Seal" className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-28 h-28 bg-slate-950 text-white rounded-[3rem] flex items-center justify-center font-black text-5xl shadow-2xl border-4 border-white">
              {settings.schoolName?.substring(0,1) || "U"}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <h1 className={`${isLandscape ? 'text-6xl' : 'text-5xl'} font-black text-blue-950 tracking-tighter uppercase leading-none`}>
            {settings.schoolName || "UNITED BAYLOR ACADEMY"}
          </h1>
          <div className="text-[14px] font-bold text-blue-800/40 uppercase tracking-[0.4em] italic py-1">
            {settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"}
          </div>
          <p className="text-[14px] font-black text-gray-500 uppercase tracking-[0.5em] leading-relaxed pt-2">
            {settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"}
          </p>
        </div>

        {/* CAPI Logic Seal */}
        <div className="hidden md:flex w-32 h-32 items-center justify-center shrink-0">
          <div className="w-28 h-28 border-4 border-slate-100 rounded-full flex flex-col items-center justify-center p-4 relative group">
             <div className="absolute inset-0 border-4 border-blue-900/10 rounded-full border-dashed group-hover:rotate-180 transition-transform duration-[5000ms]"></div>
             <span className="text-[7px] font-black uppercase text-gray-400">Authenticated</span>
             <div className="text-[8px] font-black uppercase text-center leading-none text-blue-900 mt-1">{settings.headTeacherName}</div>
             <span className="text-[6px] font-mono mt-2 opacity-30 tracking-tighter">NODE VERIFIED</span>
          </div>
        </div>
      </div>

      {/* Connectivity Layer */}
      <div className="flex justify-center flex-wrap gap-x-16 gap-y-3 text-[11px] font-black text-blue-950 uppercase tracking-[0.2em] pt-6 border-t border-slate-100 mt-8">
        <div className="flex gap-2"><span className="text-gray-400">T:</span>{settings.schoolContact}</div>
        <div className="flex gap-2"><span className="text-gray-400">W:</span>{settings.schoolWebsite || "WWW.UNITEDBAYLOR.EDU"}</div>
        <div className="flex gap-2"><span className="text-gray-400">E:</span>{settings.schoolEmail}</div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
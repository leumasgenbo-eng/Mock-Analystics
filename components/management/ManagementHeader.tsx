
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface ManagementHeaderProps {
  schoolName: string;
  isHubActive: boolean;
  onLoadDummyData: () => void;
  onClearData: () => void;
  hasData: boolean;
  isFacilitator?: boolean;
  loggedInUser?: { name: string; nodeId: string; email?: string } | null;
}

const ManagementHeader: React.FC<ManagementHeaderProps> = ({ 
  schoolName, 
  isHubActive, 
  onLoadDummyData, 
  onClearData, 
  hasData,
  isFacilitator,
  loggedInUser
}) => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!loggedInUser?.nodeId) return;
      const { count } = await supabase
        .from('uba_messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_node', loggedInUser.nodeId)
        .eq('is_read', false);
      
      if (count !== null) setUnreadCount(count);
    };
    fetchMessages();
  }, [loggedInUser?.nodeId]);

  return (
    <div className={`text-white p-4 sm:p-6 md:p-8 transition-colors duration-500 relative overflow-hidden ${isFacilitator ? 'bg-indigo-900' : 'bg-blue-900'}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
        <div className="text-center md:text-left flex-1">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center justify-center md:justify-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M9 20v-10M15 20V4M3 20h18"></path></svg>
            {isFacilitator ? 'Facilitator Node' : 'Management Hub'}
          </h2>
          <p className={`${isFacilitator ? 'text-indigo-300' : 'text-blue-300'} text-[9px] sm:text-xs uppercase tracking-widest mt-1 font-bold leading-none`}>
            Academy: {schoolName} | {isHubActive ? 'NETWORK AUTHORIZED' : 'LOCAL MODE'}
          </p>
        </div>
        
        {/* LOGGED IN USER IDENTITY BADGE */}
        {loggedInUser && (
          <div className="flex items-center gap-4">
             <div className="relative group cursor-pointer">
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-white/10 hover:bg-slate-950 transition-colors">
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                   {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-indigo-900">{unreadCount}</span>}
                </div>
             </div>
             <div className="bg-slate-950/40 border border-white/10 px-6 py-3 rounded-3xl flex items-center gap-4 shadow-2xl backdrop-blur-md">
                <div className="relative">
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute inset-0"></div>
                   <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full relative"></div>
                </div>
                <div className="flex flex-col">
                   <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none">Recall Shard Verified</span>
                   <span className="text-[11px] font-black uppercase text-white mt-1 leading-none">{loggedInUser.name}</span>
                   <span className="text-[7px] font-mono font-bold text-slate-500 uppercase mt-1 tracking-tighter leading-none">Node: {loggedInUser.nodeId}</span>
                </div>
             </div>
          </div>
        )}

        {!isFacilitator && (
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center">
            {!hasData ? (
              <button 
                onClick={onLoadDummyData} 
                className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-yellow-400 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                Initialize Hub Demo
              </button>
            ) : (
              <button 
                onClick={onClearData} 
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-red-500 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                Wipe Local Mode
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementHeader;

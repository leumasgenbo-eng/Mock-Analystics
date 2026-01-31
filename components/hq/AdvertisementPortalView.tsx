import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData } from '../../types';

interface AdvertisementPortalViewProps {
  onLogAction: (action: string, target: string, details: string) => void;
}

const AdvertisementPortalView: React.FC<AdvertisementPortalViewProps> = ({ onLogAction }) => {
  const [adContent, setAdContent] = useState('UPCOMING MOCK 2');
  const [isSaving, setIsSaving] = useState(false);
  const [activeAd, setActiveAd] = useState<string | null>(null);
  const [feedbackStream, setFeedbackStream] = useState<ForwardingData[]>([]);

  const fetchGlobalData = async () => {
    // Fetch Current Broadcast
    const { data: adData } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_advertisements').maybeSingle();
    if (adData?.payload) {
      setAdContent(adData.payload.message || '');
      setActiveAd(adData.payload.message || '');
    }

    // Fetch Feedback Feed
    const { data: feedbackData } = await supabase.from('uba_persistence').select('payload, last_updated').like('id', 'forward_%').order('last_updated', { ascending: false }).limit(10);
    if (feedbackData) {
      setFeedbackStream(feedbackData.map(d => d.payload as ForwardingData));
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async () => {
    if (!adContent.trim()) return;
    setIsSaving(true);
    try {
      const payload = { 
        message: adContent.toUpperCase(), 
        timestamp: new Date().toISOString(),
        author: 'HQ_SUPERADMIN'
      };
      
      await supabase.from('uba_persistence').upsert({
        id: 'global_advertisements',
        payload: payload,
        last_updated: new Date().toISOString()
      });
      
      setActiveAd(adContent.toUpperCase());
      onLogAction("AD_BROADCAST", "GLOBAL_NETWORK", `Broadcast updated: ${adContent.substring(0, 30)}...`);
      alert("GLOBAL BROADCAST EXECUTED.");
    } catch (err: any) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 space-y-12 bg-slate-950 font-sans">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-5 h-5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_20px_rgba(234,88,12,0.6)]"></div>
             Master Advertisement Desk
          </h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Network Announcement Hub</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Network Pulse: Operational</span>
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
               <div className="relative space-y-6">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] block px-2">Announcement Terminal</label>
                  <textarea 
                    value={adContent}
                    onChange={(e) => setAdContent(e.target.value.substring(0, 500))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-[2rem] p-10 text-xl font-black text-white outline-none focus:ring-8 focus:ring-orange-500/5 transition-all min-h-[250px] placeholder:text-slate-800 uppercase"
                  />
                  <div className="flex justify-between items-center px-4">
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Text streams in the header of all institutions</span>
                     <span className="text-[10px] font-mono font-black text-slate-500">{adContent.length} / 500</span>
                  </div>
                  <button 
                    onClick={handleBroadcast} 
                    disabled={isSaving} 
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? "Syncing Shards..." : "Execute Global Broadcast"}
                  </button>
               </div>
            </div>
         </div>

         <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[3rem] shadow-2xl flex flex-col max-h-[550px]">
               <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
                  <h3 className="text-xl font-black uppercase text-blue-400 tracking-tight">Marketing Feedback Stream</h3>
                  <span className="text-[8px] font-black text-slate-600 uppercase bg-slate-950 px-3 py-1 rounded-full">Real-time Feed</span>
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {feedbackStream.length > 0 ? feedbackStream.map((feed, i) => (
                    <div key={i} className="bg-slate-950 p-6 rounded-3xl border border-slate-800/50 hover:border-blue-500/30 transition-all">
                       <p className="text-[11px] font-black text-white uppercase mb-2">{feed.schoolName}</p>
                       <p className="text-[10px] text-slate-400 italic">"{feed.feedback || 'Institutional sync detected.'}"</p>
                       <p className="text-[7px] text-slate-600 mt-2 font-mono uppercase">{new Date(feed.submissionTimestamp).toLocaleTimeString()}</p>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                       <p className="text-[10px] font-black uppercase tracking-widest">No feedback detected in stream</p>
                    </div>
                  )}
               </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] space-y-4">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">Header Marquee Simulation</span>
               <div className="bg-blue-900 h-14 rounded-2xl flex items-center px-6 overflow-hidden shadow-inner border border-white/5">
                  <div className="flex-1 whitespace-nowrap overflow-hidden">
                     <p className="inline-block animate-[marquee_15s_linear_infinite] text-[10px] font-black text-orange-300 uppercase tracking-widest">
                        {activeAd || 'SYSTEM IDLE'} • {activeAd || 'SYSTEM IDLE'} • {activeAd || 'SYSTEM IDLE'}
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
      `}} />
    </div>
  );
};

export default AdvertisementPortalView;
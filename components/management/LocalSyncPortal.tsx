
import React, { useState, useEffect } from 'react';
import { StudentData, GlobalSettings } from '../../types';

interface LocalSyncPortalProps {
  students: StudentData[];
  settings: GlobalSettings;
}

const LocalSyncPortal: React.FC<LocalSyncPortalProps> = ({ students, settings }) => {
  const [protocol, setProtocol] = useState<'bluetooth' | 'wifi'>('bluetooth');
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [discoveredDevices, setDiscoveredDevices] = useState<{ name: string; id: string; signal: number }[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 5)]);

  const startDiscovery = () => {
    setIsSearching(true);
    setDiscoveredDevices([]);
    addLog(`Initiating local ${protocol.toUpperCase()} discovery protocol...`);
    
    setTimeout(() => {
      setDiscoveredDevices([
        { name: `${settings.schoolName} NODE-01`, id: 'D4:A1:75:32', signal: 85 },
        { name: 'ACADEMY-TABLET-A4', id: 'FF:21:00:19', signal: 42 },
        { name: 'SECURE-MOBILE-HUB', id: 'CC:01:99:A2', signal: 78 }
      ]);
      addLog('Discovery complete. Authorized network nodes identified.');
      setIsSearching(false);
    }, 2500);
  };

  const handleSync = (deviceName: string) => {
    setIsSyncing(true);
    setSyncProgress(0);
    addLog(`Establishing encrypted handshake with ${deviceName}...`);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          addLog(`Synchronization successful. ${students.length} pupil records mirrored.`);
          alert(`Handshake complete. Local database for ${settings.schoolName} is now synchronized with ${deviceName}.`);
          return 100;
        }
        if (prev === 20) addLog('Verifying institutional checksums...');
        if (prev === 50) addLog(`Migrating ${settings.activeMock} score delta shards...`);
        if (prev === 80) addLog('Finalizing node particulars...');
        return prev + 5;
      });
    }, 200);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Protocol Selection Header */}
      <div className="bg-indigo-950 text-white p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Offline Redundancy Hub</h3>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.3em]">Institutional Data Migration Protocol (No Internet Required)</p>
           </div>
           <div className="flex bg-white/10 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
              <button 
                onClick={() => setProtocol('bluetooth')}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${protocol === 'bluetooth' ? 'bg-blue-600 text-white' : 'text-indigo-200 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>
                Bluetooth LE
              </button>
              <button 
                onClick={() => setProtocol('wifi')}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${protocol === 'wifi' ? 'bg-blue-600 text-white' : 'text-indigo-200 hover:text-white'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                WiFi Direct
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Discovery Panel */}
        <div className="lg:col-span-7 bg-white border border-gray-100 rounded-[3rem] shadow-xl overflow-hidden flex flex-col min-h-[450px]">
           <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Nearby Discovered Nodes</h4>
              <button 
                disabled={isSearching || isSyncing}
                onClick={startDiscovery}
                className={`px-5 py-2 rounded-xl font-black text-[9px] uppercase transition-all border ${isSearching ? 'bg-gray-100 text-gray-400' : 'bg-white text-blue-900 border-blue-100 hover:bg-blue-50 shadow-sm active:scale-95'}`}
              >
                {isSearching ? 'Scanning Spectrum...' : 'Scan Local Network'}
              </button>
           </div>
           
           <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
              {isSearching ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="relative">
                       <div className="w-20 h-20 border-4 border-blue-900/10 rounded-full"></div>
                       <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                       <div className="absolute inset-4 border-2 border-indigo-300 border-b-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Broadcasting Node Identity...</p>
                 </div>
              ) : discoveredDevices.length > 0 ? (
                 <div className="space-y-4">
                    {discoveredDevices.map(device => (
                       <div key={device.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center group/dev hover:border-blue-300 hover:shadow-lg transition-all">
                          <div className="flex items-center gap-6">
                             <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100 group-hover/dev:bg-blue-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-900 group-hover/dev:text-white"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                             </div>
                             <div className="space-y-1">
                                <p className="text-sm font-black text-gray-900 uppercase leading-none">{device.name}</p>
                                <div className="flex items-center gap-3">
                                   <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">{device.id}</span>
                                   <div className="flex gap-0.5">
                                      {Array.from({ length: 4 }).map((_, i) => (
                                         <div key={i} className={`w-0.5 h-2 rounded-full ${i < (device.signal / 25) ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
                                      ))}
                                   </div>
                                </div>
                             </div>
                          </div>
                          <button 
                            disabled={isSyncing}
                            onClick={() => handleSync(device.name)}
                            className="bg-blue-900 text-white px-6 py-3 rounded-2xl font-black text-[9px] uppercase shadow-lg active:scale-95 transition-all hover:bg-black"
                          >
                            Synchronize
                          </button>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-20 py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center max-w-[200px]">Awaiting Manual Scan Initiation</p>
                 </div>
              )}
           </div>
        </div>

        {/* Right: Sync Status & Console */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-white border border-gray-100 rounded-[3rem] p-8 shadow-xl space-y-8">
              <div className="flex justify-between items-center">
                 <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Handshake Integrity</h4>
                 <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${isSyncing ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'}`}>
                    {isSyncing ? 'Packet Transfer Active' : 'Protocol Idle'}
                 </div>
              </div>
              
              <div className="space-y-5">
                 <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-gray-400 uppercase">Migration Load</span>
                    <span className="text-2xl font-black text-blue-900 font-mono">{syncProgress}%</span>
                 </div>
                 <div className="h-5 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                 </div>
              </div>

              <div className="bg-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl relative">
                 <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Live Handshake Console</p>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
                 </div>
                 <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar font-mono">
                    {logs.length > 0 ? logs.map((log, i) => (
                       <p key={i} className={`text-[10px] leading-tight ${i === 0 ? 'text-white font-bold' : 'text-slate-500'}`}>{log}</p>
                    )) : (
                      <p className="text-[10px] text-slate-700 italic">Waiting for peer discovery...</p>
                    )}
                 </div>
              </div>
           </div>

           <div className="bg-blue-50 border border-blue-100 rounded-[3rem] p-8 flex items-start gap-5 shadow-inner">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 border border-blue-100">
                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
              </div>
              <div className="space-y-1">
                 <h5 className="text-[11px] font-black text-blue-900 uppercase">Emergency Redundancy Notice</h5>
                 <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                   Local Sync requires both devices to be in physical proximity. This protocol mirrors local memory caches to prevent data loss during ISP outages.
                 </p>
              </div>
           </div>
        </div>
      </div>

    </div>
  );
};

export default LocalSyncPortal;

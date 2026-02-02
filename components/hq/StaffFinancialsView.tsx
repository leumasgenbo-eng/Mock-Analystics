
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';

interface StaffAccountRow {
  email: string;
  full_name: string;
  hub_id: string;
  merit_balance: number;
  monetary_balance: number;
  role: string;
  uploads_count?: number;
  downloads_count?: number;
}

const StaffFinancialsView: React.FC = () => {
  const [accounts, setAccounts] = useState<StaffAccountRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBalances = async () => {
    setIsLoading(true);
    const { data: idents } = await supabase.from('uba_identities').select('*').eq('role', 'facilitator');
    const { data: ledger } = await supabase.from('uba_transaction_ledger').select('identity_email, event_category, amount');

    if (idents) {
      const rows = idents.map(ident => {
        const myLogs = ledger?.filter(l => l.identity_email === ident.email) || [];
        return {
          ...ident,
          uploads_count: myLogs.filter(l => l.event_category === 'DATA_UPLOAD').length,
          downloads_count: myLogs.filter(l => l.event_category === 'DATA_DOWNLOAD').length
        };
      });
      setAccounts(rows as StaffAccountRow[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchBalances(); }, []);

  const globalStats = useMemo(() => ({
    tokens: accounts.reduce((a, b) => a + (b.merit_balance || 0), 0),
    cash: accounts.reduce((a, b) => a + (b.monetary_balance || 0), 0),
    totalUploads: accounts.reduce((a, b) => a + (b.uploads_count || 0), 0)
  }), [accounts]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col bg-slate-950 font-sans pb-20">
      <div className="p-10 border-b border-slate-800 bg-slate-900/50 flex flex-col xl:flex-row justify-between items-center gap-10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter leading-none">Global Asset Ledger</h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">100% Real-time Data Movement Capture</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-10">
              <div className="text-center">
                 <span className="text-[7px] font-black text-blue-500 uppercase block mb-1">Upload Traffic</span>
                 <p className="text-2xl font-black text-white font-mono">{globalStats.totalUploads} Shards</p>
              </div>
              <div className="w-px h-10 bg-white/10"></div>
              <div className="text-center">
                 <span className="text-[7px] font-black text-emerald-500 uppercase block mb-1">Global Vault</span>
                 <p className="text-2xl font-black text-white font-mono">GHS {globalStats.cash.toFixed(2)}</p>
              </div>
           </div>
           <input type="text" placeholder="Search Node..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-8 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-10 no-scrollbar">
         <div className="bg-slate-950 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
               <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
                  <tr>
                     <th className="px-8 py-6">Facilitator Identity</th>
                     <th className="px-8 py-6 text-center">Data Traffic (Up/Down)</th>
                     <th className="px-8 py-6 text-right pr-12">Total Merit Balance</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-900">
                  {accounts.map((acc, i) => (
                    <tr key={i} className="hover:bg-blue-600/5 transition-all">
                       <td className="px-8 py-8">
                          <div className="space-y-1">
                             <span className="text-sm font-black text-white uppercase">{acc.full_name}</span>
                             <p className="text-[9px] font-mono text-slate-500 lowercase">{acc.email}</p>
                          </div>
                       </td>
                       <td className="px-8 py-8">
                          <div className="flex justify-center items-center gap-10">
                             <div className="text-center">
                                <span className="text-[7px] font-black text-blue-400 uppercase block">Uploads</span>
                                <p className="text-sm font-black text-blue-400 font-mono">+{acc.uploads_count}</p>
                             </div>
                             <div className="text-center">
                                <span className="text-[7px] font-black text-red-400 uppercase block">Downloads</span>
                                <p className="text-sm font-black text-red-400 font-mono">-{acc.downloads_count}</p>
                             </div>
                          </div>
                       </td>
                       <td className="px-8 py-8 text-right pr-12">
                          <div className="flex flex-col items-end gap-1">
                             <span className="text-2xl font-black text-white font-mono">{acc.merit_balance.toFixed(0)} <span className="text-[8px] text-blue-500 tracking-widest ml-1">Credits</span></span>
                             <span className="text-[10px] font-black text-emerald-500 font-mono">Vault: GHS {acc.monetary_balance.toFixed(2)}</span>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default StaffFinancialsView;

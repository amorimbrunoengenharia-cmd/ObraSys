"use client";
import React, { useState, useMemo } from 'react';
import { 
  Monitor, Key, Headset, Search, Filter, Plus, X, Laptop, Smartphone, AlertCircle, CheckCircle, Clock, ArrowLeft, Trash2, Settings, Save, LogOut, LayoutDashboard, History, Calendar, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { 
  createItAsset, assignItAsset, deleteItAsset, createItLicense, updateLicenseSeats, deleteItLicense, createItTicket, updateItTicketStatus, updatePurchaseApprovalRules, getItAssetHistory 
} from '../../app/actions/ti';
import NotificationBell from '../NotificationBell';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function TIClient({ initialAssets, initialLicenses, initialTickets, employees, currentUserId, currentUserRole, initialApprovalRules }: any) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ativos' | 'licencas' | 'suporte' | 'regras'>('dashboard');

  const [approvalRules, setApprovalRules] = useState(initialApprovalRules || {
      enabled: true,
      levels: [
          { limit: 0, roles: ['Coordenador de Obras', 'Engenheiro Residente'] },
          { limit: 10000, roles: ['Gerente de Obras'] },
          { limit: 100000, roles: ['Diretor', 'Director'] }
      ]
  });

  const handleSaveRules = async () => {
      const res = await updatePurchaseApprovalRules(approvalRules);
      if(res.success) alert("Regras salvas com sucesso!");
      else alert("Erro: " + res.error);
  };
  
  // Modals state
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isNewLicenseModalOpen, setIsNewLicenseModalOpen] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [assetHistory, setAssetHistory] = useState<any[]>([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');

  // Form states
  const [newAsset, setNewAsset] = useState({ tag: '', category: 'Notebook', brand: '', model: '', purchaseDate: '', warrantyExpiration: '' });
  const [assignData, setAssignData] = useState({ employeeId: '' });
  const [newLicense, setNewLicense] = useState({ softwareName: '', type: 'Licença Perpétua', totalSeats: 1, costPerSeat: 0, expirationDate: '' });
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'Baixa' });

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createItAsset({
        ...newAsset,
        purchaseDate: newAsset.purchaseDate ? new Date(newAsset.purchaseDate) : undefined,
        warrantyExpiration: newAsset.warrantyExpiration ? new Date(newAsset.warrantyExpiration) : undefined
    });
    if (res.success) { setIsNewAssetModalOpen(false); router.refresh(); }
    else alert("Erro: " + res.error);
  };

  const handleAssignAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await assignItAsset(selectedAsset.id, assignData.employeeId || null);
    if (res.success) { setIsAssignAssetModalOpen(false); router.refresh(); }
    else alert("Erro: " + res.error);
  };

  const handleViewHistory = async (asset: any) => {
      setSelectedAsset(asset);
      setIsHistoryModalOpen(true);
      const history = await getItAssetHistory(asset.id);
      setAssetHistory(history);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createItLicense({
      ...newLicense,
      totalSeats: Number(newLicense.totalSeats),
      costPerSeat: Number(newLicense.costPerSeat),
      expirationDate: newLicense.expirationDate ? new Date(newLicense.expirationDate) : undefined
    });
    if (res.success) { setIsNewLicenseModalOpen(false); router.refresh(); }
    else alert("Erro: " + res.error);
  };

  const updateTicketStatus = async (id: string, status: string) => {
    const res = await updateItTicketStatus(id, status);
    if (res.success) router.refresh();
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createItTicket({
      ...newTicket,
      userId: currentUserId
    });
    if (res.success) { setIsNewTicketModalOpen(false); router.refresh(); }
    else alert("Erro: " + res.error);
  };

  const handleDeleteAsset = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;
    const res = await deleteItAsset(id);
    if (res.success) router.refresh();
    else alert("Erro: " + res.error);
  };

  const handleDeleteLicense = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta licença?")) return;
    const res = await deleteItLicense(id);
    if (res.success) router.refresh();
    else alert("Erro: " + res.error);
  };

  const filteredAssets = useMemo(() => {
      return initialAssets.filter((a: any) => {
          const matchSearch = (a.tag + ' ' + a.brand + ' ' + a.model + ' ' + (a.employee?.name || '')).toLowerCase().includes(searchQuery.toLowerCase());
          const matchStatus = filterStatus === 'Todos' || a.status === filterStatus;
          return matchSearch && matchStatus;
      });
  }, [initialAssets, searchQuery, filterStatus]);

  // Chart Data prep
  const assetCategoryData = useMemo(() => {
      const counts: any = {};
      initialAssets.forEach((a: any) => {
          counts[a.category] = (counts[a.category] || 0) + 1;
      });
      return Object.keys(counts).map(k => ({ name: k, value: counts[k] }));
  }, [initialAssets]);

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col font-sans transition-colors duration-300 text-slate-800 dark:text-slate-200">
      
      {/* HEADER */}
      <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          {(currentUserRole === 'Diretor' || currentUserRole === 'Director') && (
            <Link href="/" className="mr-4 text-slate-400 hover:text-violet-500 transition-colors">
              <ArrowLeft size={24} />
            </Link>
          )}
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <Monitor size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">T.I.</h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Tecnologia da Informação</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-[50vw]">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('ativos')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'ativos' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Ativos Físicos</button>
            <button onClick={() => setActiveTab('licencas')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'licencas' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Softwares</button>
            <button onClick={() => setActiveTab('suporte')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'suporte' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Service Desk</button>
            {(currentUserRole === 'TI' || currentUserRole === 'Diretor' || currentUserRole === 'Director') && (
               <button onClick={() => setActiveTab('regras')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'regras' ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}>Regras de Negócio</button>
            )}
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/perfil" className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-violet-500 hover:shadow-sm transition-all group">
                <div className="hidden md:block text-right">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-none">{user?.name || 'Usuário'}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user?.role || 'Cargo'}</p>
                </div>
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-600 shadow-sm group-hover:border-violet-500 transition-colors">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
            </Link>
            <button
                onClick={() => {
                    logout();
                    router.push('/login');
                }}
                className="ml-2 p-2 text-slate-500 hover:text-red-500 transition-colors"
                title="Sair"
            >
                <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">

        {activeTab === 'dashboard' && (
            <div className="space-y-6 fade-in">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Total de Ativos</p>
                        <h3 className="text-3xl font-black text-violet-600">{initialAssets.length}</h3>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Equipamentos em Uso</p>
                        <h3 className="text-3xl font-black text-orange-500">{initialAssets.filter((a:any) => a.status === 'Em Uso').length}</h3>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Custo Mensal Licenças</p>
                        <h3 className="text-3xl font-black text-emerald-500">{formatter.format(initialLicenses.filter((l:any)=>l.type.includes('Mensal') || l.type.includes('Assinatura')).reduce((acc:any, l:any)=>acc + (l.costPerSeat * l.totalSeats), 0))}</h3>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Chamados Abertos</p>
                        <h3 className="text-3xl font-black text-red-500">{initialTickets.filter((t:any) => t.status !== 'Fechado').length}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-96">
                        <h3 className="font-bold mb-6 flex items-center gap-2"><LayoutDashboard size={18} className="text-violet-500"/> Distribuição de Ativos Físicos</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <PieChart>
                                <Pie data={assetCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                                    {assetCategoryData.map((entry:any, index:number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-96">
                        <h3 className="font-bold mb-6 flex items-center gap-2"><Key size={18} className="text-violet-500"/> Top Licenças (Assentos Usados)</h3>
                        <ResponsiveContainer width="100%" height="80%">
                            <BarChart data={initialLicenses.slice(0, 5)} layout="vertical" margin={{top: 5, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.5} />
                                <XAxis type="number" />
                                <YAxis dataKey="softwareName" type="category" width={100} tick={{fontSize: 10}} />
                                <RechartsTooltip />
                                <Bar dataKey="usedSeats" name="Assentos Usados" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="totalSeats" name="Assentos Totais" fill="#3b82f6" radius={[0, 4, 4, 0]} opacity={0.3} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        )}
        
        {activeTab === 'ativos' && (
          <div className="space-y-6 fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm gap-4">
              
              {/* FILTROS E BUSCA */}
              <div className="flex flex-1 w-full flex-col sm:flex-row gap-3">
                  <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                          type="text" 
                          placeholder="Buscar por TAG, marca, modelo ou usuário..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                      />
                  </div>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {['Todos', 'Disponível', 'Em Uso', 'Manutenção'].map(status => (
                          <button 
                              key={status}
                              onClick={() => setFilterStatus(status)} 
                              className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${filterStatus === status ? 'bg-white dark:bg-slate-700 shadow-sm text-violet-600' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                              {status}
                          </button>
                      ))}
                  </div>
              </div>

              <button 
                onClick={() => setIsNewAssetModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-violet-500/30 transition-all active:scale-95 whitespace-nowrap"
              >
                <Plus size={16} /> Novo Equipamento
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset:any) => {
                let warrantyWarning = false;
                if(asset.warrantyExpiration) {
                    const daysLeft = (new Date(asset.warrantyExpiration).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
                    if(daysLeft > 0 && daysLeft <= 30) warrantyWarning = true;
                }

                return (
                <div key={asset.id} className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative group overflow-hidden hover:border-violet-500/50 hover:shadow-md transition-all">
                  {asset.status === 'Disponível' && <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>}
                  {asset.status === 'Em Uso' && <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
                  {asset.status === 'Manutenção' && <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${asset.category === 'Notebook' ? 'bg-blue-50 text-blue-500' : asset.category === 'Celular' ? 'bg-violet-50 text-violet-500' : 'bg-slate-100 text-slate-500'}`}>
                        {asset.category === 'Notebook' ? <Laptop size={20}/> : <Smartphone size={20}/>}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm leading-tight">{asset.brand} {asset.model}</h3>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{asset.tag}</p>
                      </div>
                    </div>
                  </div>
                  
                  {warrantyWarning && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit mb-2">
                          <AlertTriangle size={12}/> Garantia vencendo
                      </div>
                  )}

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mt-2 text-xs">
                    {asset.employeeId ? (
                      <div><span className="text-slate-400">Usuário Atual:</span> <span className="font-bold block text-sm mt-1 text-orange-600">{asset.employee?.name}</span></div>
                    ) : asset.status === 'Manutenção' ? (
                      <span className="text-red-600 font-bold flex items-center gap-1"><AlertCircle size={14}/> Em Manutenção</span>
                    ) : (
                      <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle size={14}/> Pronto para uso</span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2">
                    <button 
                      onClick={() => { setSelectedAsset(asset); setAssignData({employeeId: asset.employeeId || ''}); setIsAssignAssetModalOpen(true); }}
                      className="col-span-3 py-2 text-xs font-bold bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 text-violet-600 rounded-lg transition-colors"
                    >
                      {asset.employeeId ? 'Trocar' : 'Atribuir'}
                    </button>
                    <button 
                      onClick={() => handleViewHistory(asset)}
                      className="col-span-1 flex items-center justify-center py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                      title="Histórico"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="col-span-1 flex items-center justify-center py-2 text-xs font-bold bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-500 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )})}
            </div>
            {filteredAssets.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <Monitor size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Nenhum equipamento encontrado com os filtros atuais.</p>
                </div>
            )}
          </div>
        )}

        {/* ... SOFTWARES ... */}
        {activeTab === 'licencas' && (
          <div className="space-y-6 fade-in">
            <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-bold flex items-center gap-2"><Key className="text-violet-500"/> Gestão de Softwares</h2>
                  <p className="text-sm text-slate-500 mt-1">Controle de chaves, licenças anuais e nuvem.</p>
               </div>
               <button onClick={() => setIsNewLicenseModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase rounded-xl">
                <Plus size={16} /> Adicionar Licença
               </button>
            </div>
            
            <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                   <tr>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-400">Software</th>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-400">Tipo</th>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-400">Uso (Ocupado / Total)</th>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-400">Custo Total</th>
                     <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-right">Validade</th>
                     <th className="p-4 w-12"></th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                   {initialLicenses.map((lic:any) => {
                     const pct = Math.round((lic.usedSeats / lic.totalSeats) * 100);
                     return (
                     <tr key={lic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                       <td className="p-4 font-bold">{lic.softwareName}</td>
                       <td className="p-4 text-slate-500">{lic.type}</td>
                       <td className="p-4">
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div className={`h-full ${pct > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${pct}%`}}></div>
                             </div>
                             <span className="text-xs font-mono">{lic.usedSeats}/{lic.totalSeats}</span>
                          </div>
                       </td>
                       <td className="p-4">{formatter.format(lic.totalSeats * lic.costPerSeat)}</td>
                       <td className="p-4 text-right text-slate-500">{lic.expirationDate ? new Date(lic.expirationDate).toLocaleDateString() : 'Perpétua'}</td>
                       <td className="p-4 text-right">
                         <button onClick={() => handleDeleteLicense(lic.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                       </td>
                     </tr>
                   )})}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ... SERVICE DESK ... */}
        {activeTab === 'suporte' && (
          <div className="space-y-6 fade-in">
             <div className="flex justify-between items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2"><Headset className="text-violet-500"/> Service Desk</h2>
                   <p className="text-xs text-slate-500 mt-1">SLA Ativo. Chamados críticos vencem em 4h.</p>
                </div>
                <button onClick={() => setIsNewTicketModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-violet-500/30 transition-all active:scale-95 whitespace-nowrap">
                  <Plus size={16} /> Novo Chamado
                </button>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ABERTO */}
                <div className="bg-slate-100/50 dark:bg-[#0B1121] rounded-2xl p-4 border-2 border-dashed border-slate-200 dark:border-slate-800">
                   <h3 className="font-black text-xs uppercase text-slate-500 mb-4 flex justify-between">Abertos <span className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full">{initialTickets.filter((t:any)=>t.status==='Aberto').length}</span></h3>
                   <div className="space-y-3">
                     {initialTickets.filter((t:any)=>t.status==='Aberto').map((t:any) => (
                       <TicketCard key={t.id} ticket={t} onUpdate={updateTicketStatus} />
                     ))}
                   </div>
                </div>

                {/* EM ANDAMENTO */}
                <div className="bg-slate-100/50 dark:bg-[#0B1121] rounded-2xl p-4 border-2 border-dashed border-slate-200 dark:border-slate-800">
                   <h3 className="font-black text-xs uppercase text-blue-500 mb-4 flex justify-between">Em Andamento <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{initialTickets.filter((t:any)=>t.status==='Em Andamento').length}</span></h3>
                   <div className="space-y-3">
                     {initialTickets.filter((t:any)=>t.status==='Em Andamento').map((t:any) => (
                       <TicketCard key={t.id} ticket={t} onUpdate={updateTicketStatus} />
                     ))}
                   </div>
                </div>

                {/* FECHADO */}
                <div className="bg-slate-100/50 dark:bg-[#0B1121] rounded-2xl p-4 border-2 border-dashed border-slate-200 dark:border-slate-800">
                   <h3 className="font-black text-xs uppercase text-emerald-500 mb-4 flex justify-between">Fechados <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">{initialTickets.filter((t:any)=>t.status==='Fechado').length}</span></h3>
                   <div className="space-y-3">
                     {initialTickets.filter((t:any)=>t.status==='Fechado').map((t:any) => (
                       <TicketCard key={t.id} ticket={t} onUpdate={updateTicketStatus} />
                     ))}
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* ... REGRAS DE NEGÓCIO ... */}
        {activeTab === 'regras' && (currentUserRole === 'TI' || currentUserRole === 'Diretor' || currentUserRole === 'Director') && (
          <div className="space-y-6 fade-in">
             <div className="flex justify-between items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="text-violet-500"/> Regras de Negócio</h2>
                   <p className="text-xs text-slate-500 mt-1">Configuração de Alçadas de Aprovação e Fluxos</p>
                </div>
                <button onClick={handleSaveRules} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-sm shadow-violet-500/30 transition-all flex items-center gap-2">
                   <Save size={16}/> Salvar Configurações
                </button>
             </div>

             {/* ... UI DAS REGRAS (mantido igual) ... */}
             <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                      <div>
                          <h3 className="text-lg font-bold">Aprovações de Compras</h3>
                          <p className="text-xs text-slate-500">Defina os papéis necessários para aprovar cada nível de valor de compra.</p>
                      </div>
                      <label className="flex items-center cursor-pointer gap-3">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Habilitar Hierarquia de Aprovações</span>
                          <div className="relative">
                              <input type="checkbox" className="sr-only" checked={approvalRules.enabled} onChange={(e) => setApprovalRules({...approvalRules, enabled: e.target.checked})} />
                              <div className={`block w-14 h-8 rounded-full transition-colors ${approvalRules.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                              <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${approvalRules.enabled ? 'transform translate-x-6' : ''}`}></div>
                          </div>
                      </label>
                  </div>

                  {approvalRules.enabled && (
                      <div className="space-y-4">
                          {approvalRules.levels.map((lvl: any, index: number) => (
                              <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">A Partir de (R$)</label>
                                      <input 
                                          type="number" 
                                          value={lvl.limit}
                                          onChange={(e) => {
                                              const newLevels = [...approvalRules.levels];
                                              newLevels[index].limit = Number(e.target.value);
                                              setApprovalRules({...approvalRules, levels: newLevels});
                                          }}
                                          className="w-full bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl font-bold"
                                      />
                                  </div>
                                  <div className="flex-[2]">
                                      <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Cargos Aprovadores (Separados por vírgula)</label>
                                      <input 
                                          type="text" 
                                          value={lvl.roles.join(', ')}
                                          onChange={(e) => {
                                              const newLevels = [...approvalRules.levels];
                                              newLevels[index].roles = e.target.value.split(',').map((r: string) => r.trim());
                                              setApprovalRules({...approvalRules, levels: newLevels});
                                          }}
                                          className="w-full bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl font-bold"
                                          placeholder="Ex: Coordenador de Obras, Diretor"
                                      />
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
        )}

      </main>

      {/* MODALS */}

      {/* HISTÓRICO DE ATIVOS */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md h-full shadow-2xl animate-in slide-in-from-right flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><History size={20}/> Linha do Tempo</h2>
                <p className="text-xs text-slate-500 font-mono mt-1">{selectedAsset?.tag} - {selectedAsset?.brand}</p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
               {assetHistory.length === 0 ? (
                   <p className="text-slate-500 text-sm text-center py-10">Nenhum histórico encontrado para este equipamento.</p>
               ) : (
                   <div className="relative border-l-2 border-slate-200 dark:border-slate-700 ml-4 space-y-8">
                       {assetHistory.map((hist:any, idx:number) => (
                           <div key={hist.id} className="relative pl-6">
                               <div className={`absolute -left-2 top-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#162032] ${hist.action === 'Atribuído' ? 'bg-orange-500' : hist.action === 'Devolvido ao Estoque' ? 'bg-emerald-500' : hist.action === 'Criado' ? 'bg-violet-500' : 'bg-slate-500'}`}></div>
                               <h4 className="font-bold text-sm">{hist.action}</h4>
                               <p className="text-[10px] text-slate-400 font-mono mb-1">{new Date(hist.createdAt).toLocaleString()}</p>
                               {hist.employee && <p className="text-xs text-slate-600 dark:text-slate-300 font-bold mt-2">Usuário: {hist.employee.name}</p>}
                               {hist.notes && <p className="text-xs text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">{hist.notes}</p>}
                           </div>
                       ))}
                   </div>
               )}
            </div>
          </div>
        </div>
      )}

      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Novo Equipamento</h2>
              <button onClick={() => setIsNewAssetModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <form id="assetForm" onSubmit={handleCreateAsset} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Patrimônio / TAG</label>
                   <input required value={newAsset.tag} onChange={e=>setNewAsset({...newAsset,tag:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="EX: LAP-001" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                      <select value={newAsset.category} onChange={e=>setNewAsset({...newAsset,category:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                         <option>Notebook</option><option>Celular</option><option>Tablet</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Marca</label>
                      <input required value={newAsset.brand} onChange={e=>setNewAsset({...newAsset,brand:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Dell, Apple" />
                    </div>
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Modelo</label>
                   <input required value={newAsset.model} onChange={e=>setNewAsset({...newAsset,model:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" placeholder="Latitude 3420" />
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Data da Compra</label>
                      <input type="date" value={newAsset.purchaseDate} onChange={e=>setNewAsset({...newAsset,purchaseDate:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Fim da Garantia</label>
                      <input type="date" value={newAsset.warrantyExpiration} onChange={e=>setNewAsset({...newAsset,warrantyExpiration:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl" />
                    </div>
                 </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
               <button form="assetForm" type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-violet-500/30">Salvar Equipamento</button>
            </div>
          </div>
        </div>
      )}

      {isAssignAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Atribuir Equipamento</h2>
              <button onClick={() => setIsAssignAssetModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <p className="text-sm mb-4">Selecione o colaborador que será o responsável pelo <strong className="text-violet-600">{selectedAsset?.tag}</strong>.</p>
              <form id="assignForm" onSubmit={handleAssignAsset}>
                 <select value={assignData.employeeId} onChange={e=>setAssignData({employeeId:e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold">
                    <option value="">Nenhum (Devolver para Estoque)</option>
                    <option value="MAINTENANCE" disabled>--- Ou envie para manutenção ---</option>
                    {employees.map((emp:any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                 </select>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
               <button onClick={()=>setIsAssignAssetModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl hover:bg-slate-300 transition-colors">Cancelar</button>
               <button form="assignForm" type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isNewLicenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Nova Licença de Software</h2>
              <button onClick={() => setIsNewLicenseModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="licenseForm" onSubmit={handleCreateLicense} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Nome do Software</label>
                   <input required value={newLicense.softwareName} onChange={e=>setNewLicense({...newLicense,softwareName:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" placeholder="EX: AutoCAD LT" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Tipo</label>
                      <select value={newLicense.type} onChange={e=>setNewLicense({...newLicense,type:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl">
                         <option>Licença Perpétua</option><option>Assinatura Anual</option><option>SaaS Mensal</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Total de Assentos</label>
                      <input type="number" required min="1" value={newLicense.totalSeats} onChange={e=>setNewLicense({...newLicense,totalSeats:Number(e.target.value)})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Custo / Assento</label>
                      <input type="number" required min="0" step="0.01" value={newLicense.costPerSeat} onChange={e=>setNewLicense({...newLicense,costPerSeat:Number(e.target.value)})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Validade (Opcional)</label>
                      <input type="date" value={newLicense.expirationDate} onChange={e=>setNewLicense({...newLicense,expirationDate:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" />
                    </div>
                 </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
               <button form="licenseForm" type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-violet-500/30">Salvar Licença</button>
            </div>
          </div>
        </div>
      )}

      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Abrir Novo Chamado</h2>
              <button onClick={() => setIsNewTicketModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="ticketForm" onSubmit={handleCreateTicket} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Assunto</label>
                   <input required value={newTicket.title} onChange={e=>setNewTicket({...newTicket,title:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" placeholder="Ex: Computador não liga" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Descrição do Problema</label>
                   <textarea required rows={4} value={newTicket.description} onChange={e=>setNewTicket({...newTicket,description:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl" placeholder="Detalhe o que está acontecendo..."></textarea>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prioridade</label>
                    <select value={newTicket.priority} onChange={e=>setNewTicket({...newTicket,priority:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl">
                       <option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option>
                    </select>
                 </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
               <button form="ticketForm" type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-violet-500/30">Enviar Chamado</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function TicketCard({ ticket, onUpdate }: { ticket: any, onUpdate: (id:string, status:string)=>void }) {
  const prioColors:any = { 'Baixa': 'bg-slate-100 text-slate-600', 'Média': 'bg-blue-100 text-blue-600', 'Alta': 'bg-orange-100 text-orange-600', 'Crítica': 'bg-red-100 text-red-600' };
  
  // Calculate SLA
  const slaHours:any = { 'Baixa': 72, 'Média': 48, 'Alta': 24, 'Crítica': 4 };
  const createdTime = new Date(ticket.createdAt).getTime();
  const limitTime = createdTime + (slaHours[ticket.priority] * 3600 * 1000);
  const now = new Date().getTime();
  const isLate = now > limitTime && ticket.status !== 'Fechado';
  const hoursRemaining = Math.max(0, Math.floor((limitTime - now) / (1000 * 3600)));

  return (
    <div className={`bg-white dark:bg-[#162032] p-4 rounded-xl border-2 ${isLate ? 'border-red-500/50 shadow-sm shadow-red-500/20' : 'border-slate-200 dark:border-slate-700'} transition-all cursor-pointer`}>
       <div className="flex justify-between items-start mb-2">
          <div className="flex gap-2 items-center">
             <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${prioColors[ticket.priority]}`}>{ticket.priority}</span>
             {ticket.status !== 'Fechado' && (
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 ${isLate ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <Clock size={10}/> {isLate ? 'ATRASADO' : `Restam ${hoursRemaining}h`}
                </span>
             )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">#{ticket.id.substring(ticket.id.length-5).toUpperCase()}</span>
       </div>
       <h4 className="font-bold text-sm mb-1">{ticket.title}</h4>
       <p className="text-xs text-slate-500 line-clamp-2 mb-3">{ticket.description}</p>
       
       <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-3">
          <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(ticket.createdAt).toLocaleDateString()}</span>
          <span>{ticket.user?.name}</span>
       </div>

       {/* Quick Actions */}
       <div className="mt-3 flex gap-1">
         {ticket.status === 'Aberto' && <button onClick={()=>onUpdate(ticket.id, 'Em Andamento')} className="flex-1 py-1.5 text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded">Iniciar</button>}
         {ticket.status === 'Em Andamento' && <button onClick={()=>onUpdate(ticket.id, 'Fechado')} className="flex-1 py-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded">Concluir</button>}
         {ticket.status === 'Fechado' && <button onClick={()=>onUpdate(ticket.id, 'Aberto')} className="flex-1 py-1.5 text-[10px] font-bold bg-slate-50 text-slate-500 hover:bg-slate-100 rounded">Reabrir</button>}
       </div>
    </div>
  )
}

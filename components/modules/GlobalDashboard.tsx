"use client";
import React, { useState } from 'react';
import { Building2, Users, AlertTriangle, MapPin, ArrowRight, DollarSign, Activity, LayoutGrid, TrendingUp, CheckCircle, Target, LogOut, BookOpen, RefreshCw, Check, X, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { canAccessPage } from '../../lib/permissions';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { reviewPurchaseRequest } from '../../app/actions/supply';
import NotificationBell from '../NotificationBell';

export default function GlobalDashboard({ initialKpis, initialObras, initialChartData, initialEficienciaData, initialDreData }: { initialKpis?: any, initialObras?: any[], initialChartData?: any[], initialEficienciaData?: any[], initialDreData?: any[] }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [portfolioTab, setPortfolioTab] = useState<'ativas'|'inativas'|'sedes'>('ativas');

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleObsidianSync = async () => {
    setIsSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/obsidian/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(data.success 
        ? (data.message || `✅ ${data.totalNotes || 0} notas sincronizadas!`)
        : `❌ ${data.message || data.error || 'Erro desconhecido'}`
      );
    } catch {
      setSyncMsg('❌ Erro ao conectar com Obsidian');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMsg(null), 6000);
    }
  };

  // Dados derivados diretamente dos props do Server Component (single source of truth)
  const kpis = {
      obras_ativas: initialKpis?.obrasAtivas || 0,
      carteira_total: initialKpis?.carteiraTotal || "R$ 0",
      faturamento_total: initialKpis?.faturamentoTotal || "R$ 0",
      alertas_criticos: initialKpis?.alertasCriticos || 0,
      margem_lucro: initialKpis?.margemLucro || "0%",
      projetos_no_prazo: initialKpis?.projetosNoPrazo ?? 100,
      aprovacoes_pendentes: initialKpis?.pendingCount !== undefined 
          ? `${initialKpis.pendingCount} (${formatter.format(initialKpis.pendingTotal)})` 
          : "0",
      eficiencia_global: initialKpis?.upcomingTotal !== undefined 
          ? formatter.format(initialKpis.upcomingTotal) 
          : "R$ 0"
  };

  const obras = initialObras || [];
  
  const isSede = (name?: string) => name ? name.toUpperCase().startsWith('SEDE') && !name.toUpperCase().includes('REFORMA') : false;
  const activeObras = obras.filter(o => o.status !== 'Concluído' && o.status !== 'Distrato' && !isSede(o.nome));
  const archivedObras = obras.filter(o => (o.status === 'Concluído' || o.status === 'Distrato') && !isSede(o.nome));
  const sedeObras = obras.filter(o => isSede(o.nome));
  const displayedObras = portfolioTab === 'sedes' ? sedeObras : (portfolioTab === 'inativas' ? archivedObras : activeObras);
  const financeiro_global = initialChartData || [];
  const eficiencia_por_mes = initialEficienciaData || [];
  const dreReport = initialDreData || [];
  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  
  const canViewFinance = user?.role !== 'Téc. Segurança' && user?.role !== 'Mestre de Obras';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        
        {/* HEADER CORPORATIVO */}
        <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">W</div>
                <div>
                    <h1 className="text-xl font-bold leading-none tracking-tight">ObraSys <span className="text-emerald-500">Enterprise</span></h1>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Painel Corporativo</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-4 text-sm font-medium text-slate-500 items-center">
                    {canAccessPage(user?.role || '', 'comercial') && <Link href="/comercial" className="hover:text-blue-500 cursor-pointer">Comercial/Contratos</Link>}
                    {canAccessPage(user?.role || '', 'financeiro') && <Link href="/financeiro" className="hover:text-emerald-500 cursor-pointer">Financeiro Global</Link>}
                    {canAccessPage(user?.role || '', 'suprimentos') && <Link href="/suprimentos" className="hover:text-indigo-500 cursor-pointer">Suprimentos</Link>}
                    {canAccessPage(user?.role || '', 'orcamentos') && <Link href="/orcamentos" className="hover:text-amber-500 cursor-pointer">Orçamentos</Link>}
                    {canAccessPage(user?.role || '', 'configuracoes') && <Link href="/rh" className="hover:text-rose-500 cursor-pointer font-bold">Gente e Gestão</Link>}
                    {canAccessPage(user?.role || '', 'configuracoes') && <Link href="/ti" className="hover:text-violet-500 cursor-pointer font-bold">T.I.</Link>}
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <button
                        onClick={handleObsidianSync}
                        disabled={isSyncing}
                        title="Sincronizar todos os dados com o Obsidian Vault"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                    >
                        {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <BookOpen size={12} />}
                        {isSyncing ? 'Sincronizando...' : '📓 Sync Obsidian'}
                    </button>
                    {syncMsg && (
                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400 animate-pulse">{syncMsg}</span>
                    )}
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                <Link href="/perfil" className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold leading-none group-hover:text-emerald-500 transition-colors">{user?.name || 'Usuário'}</p>
                        <p className="text-[10px] text-slate-500 uppercase">{user?.role || 'Cargo'}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-600 shadow-sm group-hover:border-emerald-500 transition-colors">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                </Link>
                    <div className="ml-2">
                        <NotificationBell />
                    </div>
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
        </header>

        <div className="max-w-[1600px] mx-auto p-8">
            
            {/* KPIS GLOBAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-10">
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-blue-500 transition-all">
                    <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><Building2 size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.obras_ativas}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Obras Ativas</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-emerald-500 transition-all">
                    <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.carteira_total}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Carteira Total</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-emerald-500 transition-all">
                    <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><DollarSign size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.faturamento_total}</h3><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Fat. Realizado</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-purple-500 transition-all cursor-pointer" onClick={() => router.push('/suprimentos?tab=pedidos')}>
                    <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform"><CheckCircle size={20}/></div>
                    <div><h3 className="text-sm sm:text-base font-bold tracking-tight">{kpis.aprovacoes_pendentes}</h3><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">Aprovações Pendentes</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-red-500 transition-all cursor-pointer" onClick={() => {
                    const el = document.getElementById('alertas-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}>
                    <div className="p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 group-hover:scale-110 transition-transform"><AlertTriangle size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.alertas_criticos}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Alertas Críticos</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-green-500 transition-all">
                    <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 group-hover:scale-110 transition-transform"><TrendingUp size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.margem_lucro}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Margem de Lucro</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-orange-500 transition-all">
                    <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 group-hover:scale-110 transition-transform"><Target size={20}/></div>
                    <div><h3 className="text-sm sm:text-base font-bold tracking-tight">{kpis.eficiencia_global}</h3><p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">A Pagar (30 Dias)</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2 sm:gap-3 group hover:border-indigo-500 transition-all">
                    <div className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform"><CheckCircle size={20}/></div>
                    <div><h3 className="text-xl sm:text-2xl font-bold tracking-tight">{kpis.projetos_no_prazo}%</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Projetos no Prazo</p></div>
                </div>
            </div>

            {/* CENTRAL DE APROVAÇÕES (Substituindo Alertas Críticos) */}
            <div className="mb-10">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="text-blue-500"/> Ações Requeridas: Aprovação de Compras
                </h2>
                
                <div className="space-y-3">
                    {(!initialKpis?.pendingRequests || initialKpis.pendingRequests.length === 0) ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 p-8 rounded-2xl text-center">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Check size={24} strokeWidth={3} />
                            </div>
                            <p className="text-emerald-700 dark:text-emerald-400 font-bold">✅ Nenhuma aprovação pendente. O fluxo está em dia.</p>
                        </div>
                    ) : (
                        initialKpis.pendingRequests.map((req: any) => (
                            <div key={req.id} className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">{req.requestCode}</span>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{req.material?.name || 'Item não identificado'}</h4>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                        <div>
                                            <p className="text-slate-400 uppercase font-black text-[9px]">Obra/Projeto</p>
                                            <p className="font-bold text-slate-600 dark:text-slate-300">{req.project?.name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 uppercase font-black text-[9px]">Fornecedor</p>
                                            <p className="font-bold text-slate-600 dark:text-slate-300">{req.supplier?.name || 'Não definido'}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 uppercase font-black text-[9px]">Quantidade</p>
                                            <p className="font-bold text-slate-600 dark:text-slate-300">{req.quantity} {req.material?.unit}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 uppercase font-black text-[9px]">Valor Total</p>
                                            <p className="font-bold text-blue-600">{formatter.format(req.estimatedCost)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={async () => {
                                            if(confirm(`Aprovar compra de ${req.material?.name}?`)) {
                                                const res = await reviewPurchaseRequest(req.id, 'APROVAR');
                                                if(!res.success) alert(res.error);
                                            }
                                        }}
                                        className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                                    >
                                        <Check size={14} strokeWidth={3} /> APROVAR
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            if(confirm(`Recusar esta solicitação?`)) {
                                                const res = await reviewPurchaseRequest(req.id, 'RECUSAR');
                                                if(!res.success) alert(res.error);
                                            }
                                        }}
                                        className="flex-1 md:flex-none px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <X size={14} strokeWidth={3} /> RECUSAR
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                
                {/* COLUNA 1: LISTA DE OBRAS (PORTFÓLIO) */}
                <div className="flex-1" id="alertas-section">
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-bold flex items-center gap-3"><LayoutGrid className="text-slate-400"/> Portfólio de Projetos</h2>
                            <div className="bg-slate-200 dark:bg-slate-800 p-1 rounded-lg flex text-xs font-bold">
                                <button onClick={() => setPortfolioTab('ativas')} className={`px-3 py-1.5 rounded-md transition-colors ${portfolioTab === 'ativas' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Ativas ({activeObras.length})</button>
                                <button onClick={() => setPortfolioTab('inativas')} className={`px-3 py-1.5 rounded-md transition-colors ${portfolioTab === 'inativas' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Inativas/Arquivadas ({archivedObras.length})</button>
                                <button onClick={() => setPortfolioTab('sedes')} className={`px-3 py-1.5 rounded-md transition-colors ${portfolioTab === 'sedes' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Sedes ({sedeObras.length})</button>
                            </div>
                        </div>
                        <Link href="/mapa" title="Ver Mapa de Obras" className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">Ver Mapa <ArrowRight size={14}/></Link>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-5">
                        {displayedObras.length === 0 && (
                            <p className="text-center text-slate-500 py-8">Nenhuma obra encontrada nesta categoria.</p>
                        )}
                        {displayedObras.map((obra) => (
                            <Link href={`/projeto/${obra.id}`} key={obra.id} className="block group relative">
                                <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all overflow-hidden flex flex-col md:flex-row">
                                    
                                    {/* Imagem/Capa da Obra */}
                                    <div className={`h-32 md:h-auto md:w-48 bg-gradient-to-br ${obra.img_gradient} flex flex-col items-center justify-center text-white p-4 relative`}>
                                        <Building2 size={40} className="mb-2 opacity-80"/>
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm">{obra.tipo}</span>
                                        {/* Badge de Saúde */}
                                        <div className={`absolute top-3 left-3 w-3 h-3 rounded-full ${obra.saude === 'bom' ? 'bg-green-400' : obra.saude === 'atencao' ? 'bg-yellow-400' : 'bg-red-500'} ring-2 ring-white/50`}></div>
                                    </div>
                                    
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors mb-1">{obra.nome}</h3>
                                                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14}/> {obra.local}</p>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${obra.saude === 'critico' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {obra.status}
                                            </span>
                                        </div>

                                        {!isSede(obra.nome) && canViewFinance && (
                                            <>
                                                <div className="grid grid-cols-5 gap-4 mb-3 text-sm">
                                                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Orçamento</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.orcamento}</p></div>
                                                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Gasto Real</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.gasto}</p></div>
                                                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Saldo</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.saldo}</p></div>
                                                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Margem</p><p className={`font-bold ${obra.marginColor || 'text-slate-700'}`}>{obra.margem}</p></div>
                                                    <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Desvios</p><p className="font-bold text-orange-500">{obra.desvios}</p></div>
                                                </div>

                                                {/* Indicador de Último RDO — Visibilidade de reporting para Diretoria */}
                                                <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg w-fit">
                                                    <FileText size={12} className={obra.rdoColor || 'text-slate-400'} />
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${obra.rdoColor || 'text-slate-400'}`}>
                                                        Último RDO: {obra.rdoStatus || 'Sem RDO'}
                                                    </span>
                                                </div>
                                            </>
                                        )}

                                        <div className="flex items-center gap-4">
                                            {!isSede(obra.nome) ? (
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-[10px] mb-1 font-black uppercase text-slate-500 items-center">
                                                        <span className="flex items-center gap-1">
                                                            Avanço Físico
                                                            {obra.deviationAlert && (
                                                                <span title="Desvio Crítico: Gasto financeiro muito superior ao avanço físico" className="text-red-500 animate-pulse">⚠️</span>
                                                            )}
                                                        </span>
                                                        <span>{obra.progresso.toFixed(0)}%</span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                                                        <div className={`h-full rounded-full ${obra.cor} shadow-inner transition-all duration-500`} style={{width: `${obra.progresso}%`}}></div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unidade Corporativa</p>
                                                </div>
                                            )}
                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm" title={`Ver detalhes da obra ${obra.nome}`}>
                                                <ArrowRight size={20}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* COLUNA 2: GRÁFICOS GLOBAIS */}
                <div className="w-full xl:w-[400px] space-y-8">
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-6 flex items-center gap-2"><Activity size={16}/> Fluxo de Caixa (Consolidado)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <AreaChart data={financeiro_global}>
                                    <defs>
                                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis hide />
                                    <Tooltip 
                                        contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', fontWeight: 'bold'}} 
                                        formatter={(value: any) => formatter.format(value)}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                    />
                                    <Area name="Receitas" type="monotone" dataKey="receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                                    <Area name="Despesas" type="monotone" dataKey="despesas" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                                    <Line name="Saldo Acumulado" type="monotone" dataKey="saldo" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', strokeWidth: 2, r: 4 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* MINI DRE */}
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-6 flex items-center gap-2"><BookOpen size={16}/> Resumo DRE (Global)</h3>
                        <div className="space-y-4">
                            {dreReport.filter((r: any) => r.natureza === 'RECEITA').map((r: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-600 dark:text-slate-400">{r.categoria}</span>
                                    <span className="font-black text-emerald-500">{formatter.format(r.realizado)}</span>
                                </div>
                            ))}
                            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                            {dreReport.filter((r: any) => r.natureza === 'DESPESA').map((r: any, i: number) => (
                                <div key={i} className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-600 dark:text-slate-400 truncate w-2/3" title={r.categoria}>{r.categoria.replace(/^[0-9]+\.\s*/, '')}</span>
                                    <span className="font-black text-red-500">{formatter.format(r.realizado)}</span>
                                </div>
                            ))}
                            <div className="h-px bg-slate-200 dark:bg-slate-700"></div>
                            <div className="flex justify-between text-sm">
                                <span className="font-black uppercase text-slate-800 dark:text-white">Resultado</span>
                                <span className={`font-black ${dreReport.reduce((acc: number, r: any) => acc + (r.natureza === 'RECEITA' ? r.realizado : -r.realizado), 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatter.format(dreReport.reduce((acc: number, r: any) => acc + (r.natureza === 'RECEITA' ? r.realizado : -r.realizado), 0))}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-6 flex items-center gap-2"><Target size={16}/> Eficiência Operacional</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <LineChart data={eficiencia_por_mes}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155"/>
                                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff'}}/>
                                    <Line type="monotone" dataKey="eficiencia" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-6 flex items-center gap-2"><AlertTriangle size={16}/> Saúde das Obras</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                                <PieChart>
                                    <Pie data={[
                                        { name: 'Bom', value: obras.filter(o => o.saude === 'bom').length, color: '#10b981' },
                                        { name: 'Atenção', value: obras.filter(o => o.saude === 'atencao').length, color: '#f59e0b' },
                                        { name: 'Crítico', value: obras.filter(o => o.saude === 'critico').length, color: '#ef4444' }
                                    ]} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                                        {[
                                            { name: 'Bom', value: obras.filter(o => o.saude === 'bom').length, color: '#10b981' },
                                            { name: 'Atenção', value: obras.filter(o => o.saude === 'atencao').length, color: '#f59e0b' },
                                            { name: 'Crítico', value: obras.filter(o => o.saude === 'critico').length, color: '#ef4444' }
                                        ].map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 text-xs">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span>Bom ({obras.filter(o => o.saude === 'bom').length})</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span>Atenção ({obras.filter(o => o.saude === 'atencao').length})</span></div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div><span>Crítico ({obras.filter(o => o.saude === 'critico').length})</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}

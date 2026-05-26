"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Wallet, ArrowUpRight, ArrowDownRight, AlertCircle, TrendingDown, BookOpen, RefreshCw, Trash2, Edit3, Search, Plus, Upload, Save, Filter, ShoppingCart, Truck, CheckCircle } from 'lucide-react';
import { exportFinanceiroToObsidian } from '../../app/actions/obsidian';
import { 
    createFinancialRecord, 
    updateFinancialRecord,
    updateFinancialStatus, 
    deleteFinancialRecord,
    createBudgetItem,
    updateBudgetItem,
    deleteBudgetItem,
    getContacts,
    getSectors,
    getFinancialCategories,
    getDREReport
} from '@/app/actions/finance';
import { importFinancialsFromExcel } from '../../app/actions/financials';
import { Modal } from '../Shared';
import * as XLSX from 'xlsx';
import Link from 'next/link';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function Financeiro({ proj }: any) {
  const [tab, setTab] = useState('resumo');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Filtros Cash Flow
  const [filterTipo, setFilterTipo] = useState('TODOS'); 
  const [filterStatus, setFilterStatus] = useState('TODOS');

  // Estados para Cadastros Base
  const [contacts, setContacts] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dreReport, setDreReport] = useState<any[]>([]);
  const [loadingDre, setLoadingDre] = useState(false);

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    const [c, s, d] = await Promise.all([getContacts(), getSectors(), getFinancialCategories()]);
    setContacts(c);
    setSectors(s);
    setCategories(d);
  };

  useEffect(() => {
    if (tab === 'dre') {
      loadDreReport();
    }
  }, [tab]);

  const loadDreReport = async () => {
    setLoadingDre(true);
    try {
      const res = await getDREReport(proj.id);
      if (res.success && res.data) {
          setDreReport(res.data);
      } else {
          setDreReport([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDre(false);
    }
  };
  
  const initialRecordState = {
    tipo: 'SAÍDA',
    descricao: '',
    valorBruto: '',
    caucaoRetida: '0',
    iss: '0',
    inss: '0',
    impostosRetidos: '0',
    status: 'A Vencer',
    classificacaoDRE: '',
    clienteFornecedor: '',
    setor: '',
    cidade: proj.city || '',
    estado: proj.state || '',
    centroCusto: proj.name,
    projectId: proj.id,
    dataCompetencia: new Date().toISOString().split('T')[0],
    dataVencimento: new Date().toISOString().split('T')[0],
    dataEfetivacao: ''
  };

  const [newRecord, setNewRecord] = useState(initialRecordState);
  const [editingId, setEditingId] = useState<number | null>(null);

  const financials: any[] = proj.financials || [];
  const budgetItems: any[] = proj.budgetItems || [];
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // KPIs consolidados (Consolidação Task 24.1)
  const kpis = useMemo(() => {
    const totalRecebido = financials
        .filter((f: any) => f.tipo === 'ENTRADA' && (f.status === 'Recebido' || f.status === 'Pago'))
        .reduce((s: number, f: any) => s + (f.valorLiquido || 0), 0);
    
    const totalDespesas = financials
        .filter((f: any) => f.tipo === 'SAÍDA' && (f.status === 'Pago' || f.status === 'Recebido'))
        .reduce((s: number, f: any) => s + (f.valorLiquido || 0), 0);

    const totalProjetado = financials
        .filter((f: any) => f.tipo === 'SAÍDA' && f.status !== 'Pago' && f.status !== 'Recebido' && f.status !== 'Cancelado')
        .reduce((s: number, f: any) => s + (f.valorLiquido || 0), 0);

    const totalPago = financials
        .filter((f: any) => f.tipo === 'SAÍDA' && (f.status === 'Pago' || f.status === 'Recebido'))
        .reduce((s: number, f: any) => s + (f.valorLiquido || 0), 0);
    
    const saldoOperacional = totalRecebido - totalDespesas;
    const margem = totalRecebido > 0 ? (((totalRecebido - totalDespesas) / totalRecebido) * 100).toFixed(1) : '0';

    return { totalRecebido, totalDespesas, totalProjetado, totalPago, saldoOperacional, margem };
  }, [financials]);

  // Fluxo Mensal
  const fluxoMensal = useMemo(() => {
    const map: Record<string, { m: string; key: string; e: number; s: number }> = {};
    for (const f of financials) {
      const d = f.dataVencimento || f.dataCompetencia || f.createdAt;
      if (!d) continue;
      
      // Criar data baseada no fuso horário local para não haver deslocamento de dia/mês
      const dateParts = d.split('-');
      let date = new Date(d);
      if (dateParts.length === 3) {
          date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2].split('T')[0]));
      }
      
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) {
          map[key] = { 
              key, 
              m: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace(' de ', '/').replace('.', '').toUpperCase(), 
              e: 0, 
              s: 0 
          };
      }
      if (f.tipo === 'ENTRADA') map[key].e += (f.valorBruto || 0);
      else map[key].s += (f.valorLiquido || 0);
    }
    return Object.values(map).sort((a: any, b: any) => a.key.localeCompare(b.key)).slice(-6);
  }, [financials]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let res = editingId ? await updateFinancialRecord(editingId, newRecord) : await createFinancialRecord({ ...newRecord, projectId: proj.id });
    if (res.success) {
        setIsModalOpen(false);
        setEditingId(null);
        setNewRecord(initialRecordState);
    } else alert("Erro ao salvar: " + res.error);
    setIsSaving(false);
  };

  const handleToggleStatus = async (record: any) => {
    const isDone = record.status === 'Pago' || record.status === 'Recebido';
    const newStatus = isDone ? 'A Vencer' : (record.tipo === 'ENTRADA' ? 'Recebido' : 'Pago');
    await updateFinancialStatus(record.id, newStatus);
  };

  const filteredFinancials = financials.filter(f => {
    const matchSearch = (f.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) || f.clienteFornecedor?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTipo = filterTipo === 'TODOS' || f.tipo === filterTipo;
    const matchStatus = filterStatus === 'TODOS' || 
                        (filterStatus === 'PAGO' && (f.status === 'Pago' || f.status === 'Recebido')) ||
                        (filterStatus === 'PENDENTE' && (f.status !== 'Pago' && f.status !== 'Recebido'));
    return matchSearch && matchTipo && matchStatus;
  }).sort((a, b) => new Date(b.dataVencimento || 0).getTime() - new Date(a.dataVencimento || 0).getTime());

  return (
    <div className="flex flex-col h-full animate-in fade-in bg-slate-50 dark:bg-[#0B1121]">
      {/* TABS NAVEGAÇÃO */}
      <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-8 gap-8 bg-white dark:bg-[#162032] justify-between shadow-sm">
        <div className="flex gap-8 h-full">
          {['resumo', 'lancamentos', 'dre'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-[10px] font-black h-full border-b-2 px-2 capitalize transition-all tracking-widest uppercase ${
                tab === t ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {t === 'lancamentos' ? 'Cash Flow' : t === 'dre' ? 'DRE / Orçado' : 'Dashboard'}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
            <button onClick={() => { setEditingId(null); setNewRecord(initialRecordState); setIsModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all active:scale-95">
                <Plus size={14} /> Novo Lançamento
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">

        {/* TAB: RESUMO (KPIs e Gráficos) */}
        {tab === 'resumo' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-b-4 border-b-emerald-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Recebido</p>
                <p className="text-2xl font-black text-emerald-600">{formatter.format(kpis.totalRecebido)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Faturamento Efetivado</p>
              </div>
              <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-b-4 border-b-red-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gasto Realizado</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">{formatter.format(kpis.totalDespesas)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Previsão a Pagar: {formatter.format(kpis.totalProjetado)}</p>
              </div>
              <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-b-4 border-b-blue-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Operacional</p>
                <p className={`text-2xl font-black ${kpis.saldoOperacional >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatter.format(kpis.saldoOperacional)}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Margem de Contribuição</p>
              </div>
              <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm border-b-4 border-b-amber-500">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rentabilidade</p>
                <p className={`text-2xl font-black ${Number(kpis.margem) >= 0 ? 'text-amber-600' : 'text-red-500'}`}>{kpis.margem}%</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Eficiência Financeira</p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#162032] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <TrendingDown className="text-slate-400" size={20}/> Tendência de Fluxo Mensal
              </h3>
              <div className="h-80 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fluxoMensal} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="m" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={10} fontWeight={800} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`}/>
                      <Tooltip 
                          formatter={(v: any) => formatter.format(v)} 
                          contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', color: '#fff', padding: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                          cursor={{fill: '#334155', opacity: 0.1}}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', paddingTop: '20px' }} />
                      <Bar dataKey="e" name="Entradas (R$)" fill="#10b981" radius={[6,6,0,0]} barSize={32} />
                      <Bar dataKey="s" name="Saídas (R$)" fill="#ef4444" radius={[6,6,0,0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LANÇAMENTOS (Cash Flow) */}
        {tab === 'lancamentos' && (
          <div className="space-y-6">
            <div className="flex bg-white dark:bg-[#162032] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-[250px] bg-slate-50 dark:bg-slate-900/50 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Search size={20} className="text-slate-400" />
                    <input type="text" placeholder="Buscar por descrição, fornecedor ou cliente..." className="flex-1 bg-transparent outline-none text-sm font-bold text-slate-700 dark:text-slate-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                </div>
                <div className="flex gap-3">
                    <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-none">
                        <option value="TODOS">Todos Fluxos</option>
                        <option value="ENTRADA">Receitas (+)</option>
                        <option value="SAÍDA">Despesas (-)</option>
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none border-none">
                        <option value="TODOS">Todos Status</option>
                        <option value="PAGO">Liquidados</option>
                        <option value="PENDENTE">Em Aberto</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-[#162032] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <th className="px-8 py-5">Tipo</th>
                            <th className="px-8 py-5">Data</th>
                            <th className="px-8 py-5">Identificação</th>
                            <th className="px-8 py-5 text-right">Líquido (R$)</th>
                            <th className="px-8 py-5 text-center">Status</th>
                            <th className="px-8 py-5 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filteredFinancials.map((f: any) => (
                            <tr key={f.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all ${f.tipo === 'ENTRADA' ? 'bg-emerald-50/10' : ''}`}>
                                <td className="px-8 py-6">
                                    <span className={`flex items-center gap-2 font-black text-[10px] uppercase ${f.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {f.tipo === 'ENTRADA' ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                                        {f.tipo}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-[10px] font-black text-slate-500">
                                    {new Date(f.dataVencimento || f.createdAt).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-black text-slate-800 dark:text-white text-sm uppercase truncate max-w-[250px]">{f.descricao}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{f.clienteFornecedor || 'N/A'}</p>
                                </td>
                                <td className={`px-8 py-6 text-right font-black text-sm ${f.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                    {f.tipo === 'ENTRADA' ? '+' : '-'}{formatter.format(f.valorLiquido)}
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <button onClick={() => handleToggleStatus(f)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase shadow-sm transition-all hover:scale-105 ${f.status === 'Pago' || f.status === 'Recebido' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'}`}>
                                        {f.status}
                                    </button>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button onClick={() => deleteFinancialRecord(f.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* TAB: DRE */}
        {tab === 'dre' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm">Demonstrativo de Resultado (DRE)</h3>
                <button onClick={loadDreReport} className="text-slate-400 hover:text-blue-500 transition-colors"><RefreshCw size={16} className={loadingDre ? 'animate-spin' : ''}/></button>
              </div>
              
              {loadingDre ? (
                <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando DRE...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50">
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação DRE</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Orçado (R$)</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Realizado (R$)</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-x border-slate-100 dark:border-slate-800/50">Previsto (R$)</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Desvio Real</th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Farol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                      {dreReport.map((row, i) => {
                        const isReceita = row.natureza === 'RECEITA';
                        const desvioRuim = isReceita ? row.desvioReal < 0 : row.desvioReal > 0;
                        
                        return (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300">{row.categoria}</td>
                            <td className="p-4 text-xs font-medium text-slate-500 text-right">{formatter.format(row.orcado)}</td>
                            <td className="p-4 text-xs font-black text-slate-800 dark:text-white text-right">{formatter.format(row.realizado)}</td>
                            <td className="p-4 text-xs font-bold text-slate-400 text-right border-x border-slate-100 dark:border-slate-800/50">{formatter.format(row.projetado)}</td>
                            <td className={`p-4 text-xs font-black text-right ${desvioRuim ? 'text-red-500' : row.desvioReal === 0 ? 'text-slate-400' : 'text-emerald-500'}`}>
                              {row.desvioReal > 0 ? '+' : ''}{formatter.format(row.desvioReal)} <span className="text-[9px] opacity-70">({row.desvioPerc.toFixed(1)}%)</span>
                            </td>
                            <td className="p-4 text-center">
                              <div className={`w-2.5 h-2.5 rounded-full mx-auto ${desvioRuim ? 'bg-red-500' : row.desvioReal === 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-emerald-500'}`}></div>
                            </td>
                          </tr>
                        );
                      })}
                      
                      <tr className="bg-slate-50 dark:bg-slate-900/80 border-t-2 border-slate-200 dark:border-slate-700">
                        <td className="p-4 text-xs font-black text-slate-800 dark:text-white uppercase tracking-widest">Resultado Líquido</td>
                        <td className="p-4 text-xs font-black text-slate-800 dark:text-white text-right">
                          {formatter.format(dreReport.reduce((acc, r) => acc + (r.natureza === 'RECEITA' ? r.orcado : -r.orcado), 0))}
                        </td>
                        <td className="p-4 text-sm font-black text-blue-600 text-right">
                          {formatter.format(dreReport.reduce((acc, r) => acc + (r.natureza === 'RECEITA' ? r.realizado : -r.realizado), 0))}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL NOVO LANÇAMENTO */}
        {isModalOpen && (
            <Modal title="Lançamento Manual de Caixa" onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleCreate} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tipo de Fluxo</label>
                            <select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black uppercase" value={newRecord.tipo} onChange={e => setNewRecord({...newRecord, tipo: e.target.value})}>
                                <option value="ENTRADA">Receita (+)</option>
                                <option value="SAÍDA">Despesa (-)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Valor Bruto (R$)</label>
                            <input type="number" step="0.01" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black" value={newRecord.valorBruto} onChange={e => setNewRecord({...newRecord, valorBruto: e.target.value})}/>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Descrição do Lançamento</label>
                        <input type="text" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold" value={newRecord.descricao} onChange={e => setNewRecord({...newRecord, descricao: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Fornecedor / Cliente</label>
                        <select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold" value={newRecord.clienteFornecedor} onChange={e => setNewRecord({...newRecord, clienteFornecedor: e.target.value})}>
                            <option value="">Selecione...</option>
                            {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Data Vencimento</label>
                            <input type="date" className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold" value={newRecord.dataVencimento} onChange={e => setNewRecord({...newRecord, dataVencimento: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Categoria DRE</label>
                            <select className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-bold" value={newRecord.classificacaoDRE} onChange={e => setNewRecord({...newRecord, classificacaoDRE: e.target.value})}>
                                <option value="">Selecione...</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button type="submit" disabled={isSaving} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20">
                        {isSaving ? 'Gravando...' : 'Confirmar Lançamento'}
                    </button>
                </form>
            </Modal>
        )}
      </div>
    </div>
  );
}

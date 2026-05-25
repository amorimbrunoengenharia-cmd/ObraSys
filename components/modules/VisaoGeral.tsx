"use client";
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, ComposedChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { 
  CalendarClock, DollarSign, HardHat, Camera, CloudSun, 
  TrendingUp, TrendingDown, MapPin, BrainCircuit, ImageIcon, Clock, Target, AlertCircle
} from 'lucide-react';
import { CardResumo } from '../Shared';

import { getLiveWeather, getWorksiteStatus } from '../../app/actions/weather';

import { calculateSCurve } from '../../lib/utils/sCurve';

export default function VisaoGeral({ proj, localPosts, setActiveTab }: any) {
  // --- ESTADOS DINÂMICOS (Clima e Status do Canteiro) ---
  const [clima, setClima] = useState({ temp: '--', cond: 'Carregando...', icon: <CloudSun size={12}/> });
  const [canteiro, setCanteiro] = useState({ label: 'Verificando...', color: 'text-slate-500' });

  useEffect(() => {
    // Busca o clima e o status do canteiro
    getLiveWeather().then(res => {
      if (res.success) {
        setClima({ temp: `${res.temperature}°C`, cond: res.condition, icon: <CloudSun size={12}/> }); // Pode mapear ícones reais depois
      } else {
        setClima({ temp: '--', cond: 'Indisponível', icon: <CloudSun size={12}/> });
      }
    });
    
    if (proj?.id) {
        getWorksiteStatus(proj.id).then(res => {
            setCanteiro({ label: res.label, color: res.color });
        });
    }
  }, [proj?.id]);

  // --- SINCRONIZAÇÃO DA CURVA S (UTILITÁRIO CENTRALIZADO) ---
  const sCurveData = useMemo(() => {
    return calculateSCurve(proj.tasks || [], 'weekly');
  }, [proj.tasks]);

  // --- INTELIGÊNCIA FP&A (DRE & PERFORMANCE) ---
  const stats = useMemo(() => {
    const budget = proj.budget || 0;
    const spent = proj.spent || 0;
    
    // 1. Progresso Financeiro
    const progFinanceiro = budget > 0 ? (spent / budget) * 100 : 0;
    
    // 2. Progresso Físico (Hierárquico: Cronograma > RDO > Status)
    const tarefas = proj.tasks || [];
    const totalTasks = tarefas.length;
    const totalDuration = tarefas.reduce((acc: number, t: any) => acc + (t.duration || 0), 0);

    let progFisico = 0;

    if (totalTasks > 0) {
        if (totalDuration > 0) {
            // Ponderado por duração (mais preciso se houver cronograma)
            progFisico = tarefas.reduce((acc: number, t: any) => acc + ((t.progress || 0) * (t.duration || 0)), 0) / totalDuration;
        } else {
            // Média simples de progresso (fallback se não houver durações)
            progFisico = tarefas.reduce((acc: number, t: any) => acc + (t.progress || 0), 0) / totalTasks;
        }
    } else if (proj.rdos?.length > 0) {
        const allActivities = proj.rdos.flatMap((r: any) => r.activities || []);
        if (allActivities.length > 0) {
            progFisico = allActivities.reduce((acc: number, curr: any) => acc + (curr.progress || 0), 0) / allActivities.length;
        }
    } else {
        progFisico = proj.status === 'Concluído' ? 100 : 0;
    }

    // 3. IDC (Custo) e IDP (Prazo)
    const ev = (progFisico / 100) * budget;
    const idc = spent > 0 ? ev / spent : 1;
    
    const start = proj.startDate ? new Date(proj.startDate).getTime() : new Date().getTime();
    const end = proj.endDate ? new Date(proj.endDate).getTime() : new Date().getTime() + 86400000;
    const now = new Date().getTime();
    
    // Aderência baseada na baseline (se existir)
    const lastPoint = sCurveData[sCurveData.length - 1];
    const pvPerc = lastPoint ? lastPoint.planejado : 0;
    const pv = (pvPerc / 100) * budget;
    const idp = pv > 0 ? ev / pv : 1;
    
    // 4. EAC (Custo Estimado no Término)
    const eac = idc > 0 ? budget / idc : budget;
    const desvioEAC = eac - budget;
    
    // 5. Dias de Prazo (Contagem Regressiva)
    const diasRestantes = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    
    // 6. Distribuição de Custos por Categoria
    const categoriasMap: any = {};
    proj.budgetItems?.forEach((item: any) => {
        const cat = item.classificacaoDRE || 'Outros';
        categoriasMap[cat] = (categoriasMap[cat] || 0) + (item.valorVenda || 0);
    });
    const custoData = Object.keys(categoriasMap).map(cat => ({
        name: cat,
        value: categoriasMap[cat]
    })).sort((a,b) => b.value - a.value);

    // Margem
    const receitaPrevista = proj.budgetItems?.reduce((acc: number, b: any) => acc + (b.valorVenda || 0), 0) || (budget * 1.2);
    const margemR$ = receitaPrevista - spent;
    const margemPerc = receitaPrevista > 0 ? (margemR$ / receitaPrevista) * 100 : 0;

    return { 
        progFisico, progFinanceiro, idc, idp, eac, desvioEAC, 
        diasRestantes, custoData, budget, spent, margemPerc 
    };
  }, [proj, sCurveData]);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
              <span className="text-xs font-bold text-white">{entry.name}:</span>
              <span className="text-xs font-black text-white">
                {entry.name.includes('%') || entry.name.includes('Avanço')
                  ? `${entry.value.toFixed(1)}%` 
                  : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row h-full animate-in fade-in bg-slate-50 dark:bg-[#0B1121] overflow-hidden">
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            
            {/* HEADER EXECUTIVO */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight leading-none">{proj.nome}</h2>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-emerald-500"/> {(() => {
                            try {
                                const parsed = JSON.parse(proj.address || '{}');
                                if (parsed.city && parsed.state) return `${parsed.city}, ${parsed.state}`;
                            } catch (e) {}
                            return proj.city ? `${proj.city}, ${proj.state}` : (proj.location || "Localização não definida");
                        })()}</span>
                        <span className={`flex items-center gap-1 ${canteiro.color}`}>{clima.icon} {clima.temp} • {canteiro.label}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="bg-white dark:bg-[#162032] p-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Previsão no Término (EAC)</p>
                        <p className={`text-sm font-black ${stats.desvioEAC <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(stats.eac)}
                        </p>
                    </div>
                    <button onClick={() => setActiveTab('financeiro')} title="Ver Relatório Completo de Performance Financeira" className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/20 hover:scale-105 transition-all uppercase">Relatório FP&A</button>
                </div>
            </div>

            {/* KPIs COM TENDÊNCIA (Estilo Emerson Rocha) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desempenho de Prazo (SPI)</p>
                        {stats.idp >= 1 ? <TrendingUp className="text-emerald-500" size={16}/> : <TrendingDown className="text-red-500" size={16}/>}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h4 className={`text-2xl font-black ${stats.idp >= 1 ? 'text-emerald-500' : 'text-orange-500'}`}>{stats.idp.toFixed(2)}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Meta: ≥ 1.00</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter">{stats.idp >= 1 ? 'Aderente ao Plano' : 'Atraso Detectado'}</p>
                </div>

                <div className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desempenho de Custo (CPI)</p>
                        {stats.idc >= 1 ? <TrendingUp className="text-emerald-500" size={16}/> : <TrendingDown className="text-red-500" size={16}/>}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h4 className={`text-2xl font-black ${stats.idc >= 1 ? 'text-emerald-500' : 'text-red-500'}`}>{stats.idc.toFixed(2)}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Meta: ≥ 1.00</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter">{stats.idc >= 1 ? 'Eficiência de Custo' : 'Estouro de Verba'}</p>
                </div>

                <div className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prazo (Days Left)</p>
                        <Clock className="text-blue-500" size={16}/>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h4 className={`text-2xl font-black ${stats.diasRestantes > 0 ? 'text-blue-500' : 'text-red-500'}`}>{stats.diasRestantes} Dias</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Para o Término</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Cronograma {stats.idp >= 1 ? 'Saudável' : 'Crítico'}</p>
                </div>

                <div className="bg-white dark:bg-[#162032] p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margem Prevista</p>
                        <Target className="text-emerald-500" size={16}/>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h4 className={`text-2xl font-black ${stats.margemPerc >= 20 ? 'text-emerald-500' : 'text-orange-500'}`}>{stats.margemPerc.toFixed(1)}%</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Meta: 20%</span>
                    </div>
                    <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter">Rentabilidade do Projeto</p>
                </div>
            </div>

            {/* CURVA S & DISTRIBUIÇÃO DE CUSTO */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2 bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-10">Curva S - Físico Financeira (Sincronizada)</h3>
                    <div className="h-80 flex items-center justify-center">
                        {sCurveData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={sCurveData || []}>
                                    <defs>
                                        <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" align="left" iconType="plainline" iconSize={15} wrapperStyle={{paddingBottom: '20px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase'}} />
                                    <Area type="monotone" dataKey="planejado" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} name="Planejado (%)" />
                                    <Area type="monotone" dataKey="realizado" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorReal)" name="Realizado (%)" animationDuration={1500} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center space-y-3">
                                <AlertCircle className="text-slate-600 mx-auto" size={40}/>
                                <p className="text-xs font-black text-slate-500 uppercase">Aguardando definição de Linha de Base</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Distribuição de Custo (EAC)</h3>
                    <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={stats.custoData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={100} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {stats.custoData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v: any) => new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v)}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {stats.custoData.slice(0, 4).map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase truncate">{c.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* INDICADORES & MAPA (Estilo Emerson Rocha) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                <div className="xl:col-span-2 bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Radar de Indicadores de Desempenho</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase">Indicador</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase text-center">Valor Atual</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase text-center">Tendência</th>
                                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase text-right">Meta</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {[
                                    { label: 'IDC (Custo)', val: stats.idc.toFixed(2), trend: stats.idc >= 1 ? 'up' : 'down', meta: '≥ 1.00', color: stats.idc >= 1 ? 'text-emerald-500' : 'text-red-500' },
                                    { label: 'IDP (Prazo)', val: stats.idp.toFixed(2), trend: stats.idp >= 1 ? 'up' : 'down', meta: '≥ 1.00', color: stats.idp >= 1 ? 'text-emerald-500' : 'text-orange-500' },
                                    { label: 'Margem Bruta', val: stats.margemPerc.toFixed(1) + '%', trend: 'up', meta: '≥ 20.0%', color: 'text-emerald-500' },
                                    { label: 'Desvio EAC', val: (stats.desvioEAC / 1000).toFixed(0) + 'k', trend: stats.desvioEAC <= 0 ? 'up' : 'down', meta: '≤ 0.00', color: stats.desvioEAC <= 0 ? 'text-emerald-500' : 'text-red-500' }
                                ].map((item, i) => (
                                    <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-4 text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">{item.label}</td>
                                        <td className={`py-4 text-xs font-black text-center ${item.color}`}>{item.val}</td>
                                        <td className="py-4 text-center">
                                            {item.trend === 'up' ? <TrendingUp size={14} className="mx-auto text-emerald-500"/> : <TrendingDown size={14} className="mx-auto text-red-500"/>}
                                        </td>
                                        <td className="py-4 text-[10px] font-bold text-slate-400 text-right uppercase tracking-tighter">{item.meta}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between shadow-2xl min-h-[350px]">
                    <div className="relative z-10 mb-4">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Localização da Obra</h3>
                        <p className="text-white text-xs font-black flex items-center gap-2 bg-black/40 backdrop-blur-md w-fit p-2 rounded-lg border border-white/10">
                            <MapPin size={14} className="text-red-500 animate-bounce"/> {(() => {
                                try {
                                    const parsed = JSON.parse(proj.address || '{}');
                                    if (parsed.street) {
                                        return `${parsed.street}, ${parsed.number} - ${parsed.city}/${parsed.state}`;
                                    }
                                } catch (e) {}
                                return proj.address || proj.location || "Endereço não definido";
                            })()}
                        </p>
                    </div>
                    
                    {/* Mapa Real da Cidade (Google Maps Embed) */}
                    <div className="absolute inset-0 z-0 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <iframe 
                            width="100%" 
                            height="100%" 
                            title="Localização da Obra no Google Maps"
                            frameBorder="0" 
                            scrolling="no" 
                            marginHeight={0} 
                            marginWidth={0} 
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(
                                (() => {
                                    try {
                                        const parsed = JSON.parse(proj.address || '{}');
                                        if (parsed.street) return `${parsed.street}, ${parsed.number}, ${parsed.city}, ${parsed.state}`;
                                    } catch (e) {}
                                    return proj.address || proj.location || 'São Paulo, SP';
                                })()
                            )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                            style={{ filter: 'invert(90%) hue-rotate(180deg)' }} // Deixa o mapa no estilo dark
                        ></iframe>
                    </div>

                    <div className="relative z-10 flex justify-between items-end bg-black/40 backdrop-blur-md p-3 rounded-2xl border border-white/10 mt-auto">
                        <div className="text-[8px] font-black text-slate-400 uppercase leading-tight">
                            Status Geográfico<br/><span className="text-emerald-400 text-[10px]">Canteiro Ativo</span>
                        </div>
                        <button 
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                (() => {
                                    try {
                                        const parsed = JSON.parse(proj.address || '{}');
                                        if (parsed.street) return `${parsed.street}, ${parsed.number}, ${parsed.city}, ${parsed.state}`;
                                    } catch (e) {}
                                    return proj.address || proj.location || 'São Paulo, SP';
                                })()
                            )}`, '_blank')}
                            title="Abrir no Google Maps"
                            className="bg-white/10 hover:bg-white/20 p-2 rounded-lg text-white transition-all"
                        >
                            <TrendingUp size={14}/>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* DIÁRIO VISUAL LATERAL */}
        <div className="w-full lg:w-96 bg-white dark:bg-[#162032] border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl relative z-10 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#0B1121] flex justify-between items-center">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-xs uppercase tracking-tighter"><Camera size={18} className="text-emerald-500"/> Diário Visual</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Fotos do Canteiro</p>
                </div>
                <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#f8fafc] dark:bg-[#0f172a]/50">
                {(localPosts || []).map((item: any, index: number) => (
                    <div key={index} className="flex flex-col gap-3 group">
                        <div className="flex gap-2 items-center">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-black text-[10px]">{item.author?.[0]}</div>
                            <div>
                                <span className="font-black block text-[11px] text-slate-800 dark:text-white">{item.author}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.time}</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-blue-500">
                            {item.image && (
                                <div className="mb-3 rounded-xl overflow-hidden aspect-video bg-slate-200 dark:bg-slate-800 relative group-hover:scale-[1.02] transition-transform">
                                    <img src={item.image} alt="Campo" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-md p-1.5 rounded-lg text-white"><ImageIcon size={14}/></div>
                                </div>
                            )}
                            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 bg-white dark:bg-[#162032] border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setActiveTab('portal-cliente')} title="Ir para o Portal do Cliente e ver todas as fotos" className="w-full py-3 bg-slate-900 text-white dark:bg-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-xl">Ver Galeria Completa</button>
            </div>
        </div>

        <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar { width: 3px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.2); border-radius: 10px; }
        `}</style>
    </div>
  );
}

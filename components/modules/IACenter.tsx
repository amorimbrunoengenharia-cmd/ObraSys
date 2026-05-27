"use client";
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, History, DollarSign, Package, CalendarClock, AlertTriangle, CheckCircle2, RefreshCw, ClipboardCheck, Lightbulb } from 'lucide-react';
import { SwotCard } from '../Shared';
import { generateSwotAnalysis, getSwotHistory } from '../../app/actions/ia-center';

export default function IACenter({ proj }: { proj: any }) {
  const [pulseData, setPulseData] = useState<any>(null);
  const [swotResult, setSwotResult] = useState<any>(null);
  const [historicoSwot, setHistoricoSwot] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (proj?.id) {
        loadHistory();
    }
  }, [proj?.id]);

  const loadHistory = async () => {
      const res = await getSwotHistory(proj.id) as any;
      if (res.success && res.history) {
          setHistoricoSwot(res.history);
      }
  };

  const analyzeStrategicCenario = async () => {
      setLoading(true);
      setError(null);
      try {
          const res = await generateSwotAnalysis(proj.id) as any;
          if (res.success) {
              setPulseData(res.data.pulse);
              setSwotResult(res.data.swot);
              await loadHistory();
          } else {
              setError(res.error || "Erro desconhecido");
          }
      } catch (e) {
          setError("Falha ao processar análise com IA.");
      } finally {
          setLoading(false);
      }
  };

  const SkeletonCard = () => (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-pulse space-y-3">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="space-y-2">
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
    </div>
  );

  const getParsedArray = (field: any) => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  const strengths = swotResult ? getParsedArray(swotResult.strengths) : [];
  const weaknesses = swotResult ? getParsedArray(swotResult.weaknesses) : [];
  const opportunities = swotResult ? getParsedArray(swotResult.opportunities) : [];
  const threats = swotResult ? getParsedArray(swotResult.threats) : [];
  const mitigationPlan = swotResult ? getParsedArray(swotResult.mitigationPlan) : [];

  return (
    <div className="p-6 overflow-y-auto h-full flex flex-col lg:flex-row gap-6 animate-in fade-in bg-slate-50 dark:bg-[#0B1121]">
        <div className="flex-1 space-y-6 pb-12">
            
            {/* HEADER IA CENTER */}
            <div className="bg-white dark:bg-[#162032] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-700"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                                <BrainCircuit size={28}/>
                            </div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">SWOT <span className="text-emerald-500">Viva</span></h2>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Inteligência Artificial aplicada à Engenharia</p>
                    </div>

                    <div className="flex items-center gap-4">
                        {swotResult && (
                             <div className="hidden md:flex flex-col items-end">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status de Risco</p>
                                <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                                    swotResult.risco === 'Baixo' ? 'bg-emerald-100 text-emerald-600' :
                                    swotResult.risco === 'Médio' ? 'bg-amber-100 text-amber-600' :
                                    'bg-red-100 text-red-600 animate-pulse'
                                }`}>
                                    {swotResult.risco}
                                </span>
                             </div>
                        )}
                        <button 
                            onClick={analyzeStrategicCenario} 
                            disabled={loading}
                            className="group flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18}/> : <Sparkles className="group-hover:rotate-12 transition-transform" size={18}/>}
                            {loading ? 'Consultando Gemini...' : 'Analisar Cenário Atual'}
                        </button>
                    </div>
                </div>
            </div>

            {/* ERROR DISPLAY */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertTriangle size={20}/>
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            {/* PULSE DATA (SMALL) */}
            {pulseData && !loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                    <div className="bg-white/50 dark:bg-[#162032]/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><DollarSign size={16}/></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Saldo</p>
                            <p className="text-xs font-black">R$ {pulseData.finance.saldo.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>
                    <div className="bg-white/50 dark:bg-[#162032]/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><Package size={16}/></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Suprimentos Críticos</p>
                            <p className="text-xs font-black">{pulseData.supply.rmsAtrasadasCriticas.length} alertas</p>
                        </div>
                    </div>
                    <div className="bg-white/50 dark:bg-[#162032]/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-lg"><CalendarClock size={16}/></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase">Status de Campo</p>
                            <p className="text-xs font-black">{pulseData.field.countRdos} RDOs analisados</p>
                        </div>
                    </div>
                </div>
            )}

            {/* SWOT VIVA RESULTS */}
            {loading ? (
                <div className="grid grid-cols-2 gap-6">
                    <SkeletonCard/><SkeletonCard/><SkeletonCard/><SkeletonCard/>
                </div>
            ) : swotResult ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SwotCard t="Forças (Strengths)" i={strengths} c="green"/>
                        <SwotCard t="Fraquezas (Weaknesses)" i={weaknesses} c="red"/>
                        <SwotCard t="Oportunidades (Opportunities)" i={opportunities} c="blue"/>
                        <SwotCard t="Ameaças (Threats)" i={threats} c="orange"/>
                    </div>

                    {/* MITIGATION PLAN */}
                    <div className="bg-white dark:bg-[#162032] rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                                    <ClipboardCheck size={20}/>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Plano de Ação Sugerido pela IA</h3>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full">PMBOK 7 Compliant</span>
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {mitigationPlan.map((action: string, idx: number) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-200 transition-all">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-black text-xs">
                                            {idx + 1}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                                            {action}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[50vh] flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 bg-white/50 dark:bg-slate-900/20">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                        <Lightbulb className="text-slate-300" size={48}/>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">IA Center Offline</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm font-medium">
                        O cérebro estratégico está aguardando seu comando. Clique em analisar para processar os dados vivos da obra via Gemini.
                    </p>
                </div>
            )}
        </div>

        {/* TIMELINE / LOGS */}
        <div className="w-full lg:w-96 space-y-6">
            <div className="bg-white dark:bg-[#162032] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-xl h-full">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
                        <History size={20}/>
                    </div>
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-white">Consultoria IA Logs</h3>
                </div>
                
                <div className="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-800">
                    {historicoSwot.length === 0 ? (
                        <p className="text-xs font-bold text-slate-400 italic text-center py-8">Nenhum insight processado.</p>
                    ) : historicoSwot.map((e, i) => (
                        <div 
                            key={i} 
                            onClick={() => {
                                // Mapear o objeto do DB para o formato esperado pelo frontend
                                setSwotResult({
                                    ...e.raw,
                                    risco: e.raw.riskLevel || e.raw.risco
                                });
                            }}
                            className="relative pl-10 animate-in slide-in-from-left-2 duration-300 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800/50 p-2 -ml-2 rounded-xl transition-colors"
                        >
                            <div className="absolute left-2 top-3.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">{e.data}</p>
                            <h4 className="font-black text-sm text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">{e.fonte}</h4>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{e.obs}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
}

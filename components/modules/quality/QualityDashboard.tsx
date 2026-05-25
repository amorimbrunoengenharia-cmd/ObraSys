"use client";
import React from 'react';
import { ClipboardCheck, AlertTriangle, ShieldCheck, Plus, ArrowRight } from 'lucide-react';

export default function QualityDashboard({ onNavigate, stats }: any) {
  return (
    <div className="p-6 h-full overflow-y-auto animate-in fade-in">
        <div className="flex justify-between items-end mb-8">
            <div><h2 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="text-emerald-500"/> Controle de Qualidade & SMS</h2><p className="text-sm text-slate-500">Gestão integrada de padrões e segurança.</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div onClick={() => onNavigate('fvs')} className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 cursor-pointer group transition-all">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600"><ClipboardCheck size={24}/></div><span className="text-2xl font-bold text-slate-700 dark:text-white">{stats.fvs}</span></div>
                <h3 className="font-bold text-lg mb-1">Inspeções (FVS)</h3>
                <p className="text-xs text-slate-500 mb-4">Fichas de verificação de serviços controladas.</p>
                <div className="text-blue-500 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Acessar <ArrowRight size={12}/></div>
            </div>

            <div onClick={() => onNavigate('rnc')} className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-500 cursor-pointer group transition-all">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600"><AlertTriangle size={24}/></div><span className="text-2xl font-bold text-slate-700 dark:text-white">{stats.rnc}</span></div>
                <h3 className="font-bold text-lg mb-1">Não Conformidades</h3>
                <p className="text-xs text-slate-500 mb-4">Gestão de falhas, correções e custos da não-qualidade.</p>
                <div className="text-red-500 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Gerenciar <ArrowRight size={12}/></div>
            </div>

            <div onClick={() => onNavigate('safety')} className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-orange-500 cursor-pointer group transition-all">
                <div className="flex justify-between items-start mb-4"><div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600"><ShieldCheck size={24}/></div><span className="text-2xl font-bold text-slate-700 dark:text-white">{stats.safety}</span></div>
                <h3 className="font-bold text-lg mb-1">Segurança (SMS)</h3>
                <p className="text-xs text-slate-500 mb-4">Controle de EPIs, Treinamentos e Documentação.</p>
                <div className="text-orange-500 text-xs font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">Verificar <ArrowRight size={12}/></div>
            </div>
        </div>
    </div>
  );
}

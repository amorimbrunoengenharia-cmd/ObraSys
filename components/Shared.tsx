"use client";
import React from 'react';
import { X } from 'lucide-react';

// Botão do Menu Lateral
export function BotaoMenu({ icone, texto, ativo, destaque, onClick }: any) {
    const base = "flex items-center gap-3 w-full p-3 rounded-lg mb-1 transition-all cursor-pointer ";
    if (destaque) return <button onClick={onClick} className={base + (ativo ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' : 'text-blue-500 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10')}>{icone} <span className="font-bold">{texto}</span></button>;
    return <button onClick={onClick} className={base + (ativo ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white')}>{icone} {texto}</button>;
}

// Card de KPI (Pequeno)
export function CardKPI({ t, v, i }: any) {
    return <div className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"><div><p className="text-xs text-slate-500 dark:text-slate-400">{t}</p><h4 className="text-xl font-bold">{v}</h4></div><div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">{i}</div></div>; 
}

// Card de Resumo (Grande)
export function CardResumo({ titulo, valor, status, sub, icone }: any) {
    return <div className="bg-white dark:bg-[#162032] p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"><div className="flex justify-between items-start mb-2"><div className={`p-2 rounded-lg ${status==='bom'?'bg-green-100 text-green-600':status==='ruim'?'bg-red-100 text-red-600':'bg-yellow-100 text-yellow-600'}`}>{icone}</div><span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${status==='bom'?'bg-green-50 text-green-700':status==='ruim'?'bg-red-50 text-red-700':'bg-yellow-50 text-yellow-700'}`}>{status}</span></div><h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{valor}</h3><p className="text-xs font-bold text-slate-500">{titulo}</p><p className="text-[10px] text-slate-400 mt-1">{sub}</p></div>;
}

// Card da SWOT
export function SwotCard({ t, i, c }: any) { 
    const colors: any = { green: "text-green-500 bg-green-500/10", red: "text-red-500 bg-red-500/10", blue: "text-blue-500 bg-blue-500/10", orange: "text-orange-500 bg-orange-500/10" }; 
    return <div className={`p-4 rounded-xl border border-slate-700 ${colors[c]}`}><h5 className="font-bold uppercase text-xs mb-2">{t}</h5><ul className="list-disc pl-4 text-xs text-slate-300 space-y-1">{i.map((item:string,k:number)=><li key={k}>{item}</li>)}</ul></div>; 
}

// --- COMPONENTE MODAL (JANELA FLUTUANTE) ---
export function Modal({ title, children, onClose, maxWidth = "max-w-md" }: any) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className={`bg-white dark:bg-[#162032] w-full ${maxWidth} rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200 relative`}>
                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[85vh]">
                    {children}
                </div>
            </div>
        </div>
    );
}

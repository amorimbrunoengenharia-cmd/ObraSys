"use client";
import React from 'react';
import { Plus, Scale, ArrowRight, Trash2 } from 'lucide-react';

export default function ContractList({ contracts, onSelect, onNew, onDelete }: any) {
  return (
    <div className="p-6 h-full overflow-y-auto animate-in fade-in">
        <div className="flex justify-between items-end mb-6">
            <div><h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white"><Scale className="text-emerald-500"/> Gestão de Contratos</h2><p className="text-sm text-slate-500">{contracts.length} contratos registrados.</p></div>
            <button onClick={onNew} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-700"><Plus size={16}/> Novo Contrato</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {contracts.map((ct:any) => (
                <div key={ct.id} onClick={() => onSelect(ct)} className="bg-white dark:bg-[#162032] p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 cursor-pointer transition-all group relative">
                    <button onClick={(e) => {e.stopPropagation(); onDelete(ct.id)}} className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                    <div className="flex justify-between items-start mb-3"><h3 className="font-bold text-lg truncate w-4/5 text-slate-800 dark:text-white">{ct.empresa}</h3><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${ct.status==='Concluído'?'bg-blue-100 text-blue-700':'bg-green-100 text-green-700'}`}>{ct.status}</span></div>
                    <p className="text-xs text-slate-500 mb-4 uppercase tracking-wide">{ct.servico}</p>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Total</span><strong className="text-slate-700 dark:text-slate-300">R$ {ct.valorTotal.toLocaleString()}</strong></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2"><div className="bg-blue-500 h-full" style={{width: `${(ct.medido/ct.valorTotal)*100}%`}}></div></div>
                        <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-2"><span className="text-slate-500">Saldo</span><strong className="text-emerald-500">R$ {ct.saldo.toLocaleString()}</strong></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

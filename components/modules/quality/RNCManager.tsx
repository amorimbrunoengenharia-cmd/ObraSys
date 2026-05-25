"use client";
import React, { useState } from 'react';
import { AlertTriangle, ChevronLeft, DollarSign, Plus, Save } from 'lucide-react';
import { Modal } from '../../Shared';
import { createRNC } from '../../../app/actions/quality';

export default function RNCManager({ rncList, onBack, projectId }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', local: '', gravidade: 'Baixa', causa: '', acao: '', custo: '' });

  const handleSave = async () => {
      if (!formData.titulo || !formData.local) return alert("Preencha o título e local.");
      setIsSaving(true);
      await createRNC(Number(projectId), formData);
      setIsSaving(false);
      setIsModalOpen(false);
      setFormData({ titulo: '', local: '', gravidade: 'Baixa', causa: '', acao: '', custo: '' });
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-in slide-in-from-right">
        {isModalOpen && (
            <Modal title="Nova Não Conformidade (RNC)" onClose={() => setIsModalOpen(false)}>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Título do Problema</label><input type="text" autoFocus value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm" placeholder="Ex: Infiltração na Janela"/></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Local</label><input type="text" value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Gravidade</label><select value={formData.gravidade} onChange={(e) => setFormData({...formData, gravidade: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"><option>Baixa</option><option>Média</option><option>Alta</option></select></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Causa Raiz</label><input type="text" value={formData.causa} onChange={(e) => setFormData({...formData, causa: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"/></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Ação Corretiva</label><input type="text" value={formData.acao} onChange={(e) => setFormData({...formData, acao: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Custo Estimado (R$)</label><input type="number" value={formData.custo} onChange={(e) => setFormData({...formData, custo: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm" placeholder="0.00"/></div>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full py-3 bg-emerald-600 disabled:bg-emerald-800 text-white rounded font-bold mt-4 flex items-center justify-center gap-2"><Save size={16}/> {isSaving ? 'Salvando...' : 'Salvar RNC'}</button>
                </div>
            </Modal>
        )}

        <button onClick={onBack} className="mb-4 font-bold text-sm flex gap-2 hover:text-slate-500"><ChevronLeft size={16}/> Voltar</button>
        <div className="flex justify-between mb-6"><div><h2 className="text-2xl font-bold">Não Conformidades</h2></div><button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded flex gap-2 font-bold"><Plus size={16}/> Nova RNC</button></div>
        
        <div className="space-y-4">
            {rncList.length === 0 && <p className="text-slate-500">Nenhum RNC registrado.</p>}
            {rncList.map((r:any) => (
                <div key={r.id} className="bg-white dark:bg-[#162032] p-5 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex gap-4 items-start">
                        <div className={`p-3 rounded-lg ${r.gravidade === 'Alta' ? 'bg-red-50 text-red-600' : r.gravidade === 'Média' ? 'bg-orange-50 text-orange-600' : 'bg-yellow-50 text-yellow-600'}`}><AlertTriangle size={20}/></div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{r.titulo || r.description}</h3>
                            <p className="text-xs text-slate-500">{r.local || 'Geral'} | Causa: {r.causa || r.rootCause || '-'}</p>
                            <div className="mt-2 bg-slate-50 dark:bg-slate-900 p-2 rounded text-xs border border-slate-200 dark:border-slate-700"><strong>Ação:</strong> {r.acao || r.correctiveAction || '-'}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1 justify-end"><DollarSign size={14}/> R$ {r.custo || 0}</div>
                        <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold ${r.status==='Aberto'||r.status==='Aberta'?'bg-red-100 text-red-700':r.status==='Em Correção'||r.status==='Em Tratamento'?'bg-yellow-100 text-yellow-700':'bg-green-100 text-green-700'}`}>{r.status}</span>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}

"use client";
import React, { useState } from 'react';
import { ShieldCheck, ChevronLeft, User, AlertCircle, CheckCircle2, HardHat, Plus, Save } from 'lucide-react';
import { Modal } from '../../Shared';
import { createSafety } from '../../../app/actions/quality';

export default function SafetyControl({ safetyList, onBack, projectId }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({ nome: '', cargo: '', aso: 'Vigente', nr35: 'N/A', epi_pendente: false });

  const handleSave = async () => {
      if (!formData.nome || !formData.cargo) return alert("Preencha nome e cargo.");
      setIsSaving(true);
      await createSafety(Number(projectId), formData);
      setIsSaving(false);
      setIsModalOpen(false);
      setFormData({ nome: '', cargo: '', aso: 'Vigente', nr35: 'N/A', epi_pendente: false });
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-in slide-in-from-right">
        {isModalOpen && (
            <Modal title="Novo Registro de Segurança" onClose={() => setIsModalOpen(false)}>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome do Colaborador</label><input type="text" autoFocus value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm" placeholder="Ex: João Silva"/></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label><input type="text" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm" placeholder="Ex: Pedreiro"/></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Situação do ASO</label><select value={formData.aso} onChange={(e) => setFormData({...formData, aso: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"><option>Vigente</option><option>Vencido</option></select></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Situação NR-35</label><select value={formData.nr35} onChange={(e) => setFormData({...formData, nr35: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"><option>Vigente</option><option>Vencido</option><option>N/A</option></select></div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 bg-slate-50 dark:bg-[#0B1121] p-3 rounded border border-slate-200 dark:border-slate-700">
                        <input type="checkbox" id="epi" checked={formData.epi_pendente} onChange={(e) => setFormData({...formData, epi_pendente: e.target.checked})} className="w-4 h-4"/>
                        <label htmlFor="epi" className="text-sm font-bold cursor-pointer">Pendência de Entrega de EPI</label>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="w-full py-3 bg-emerald-600 disabled:bg-emerald-800 text-white rounded font-bold mt-4 flex items-center justify-center gap-2"><Save size={16}/> {isSaving ? 'Salvando...' : 'Salvar Registro'}</button>
                </div>
            </Modal>
        )}

        <button onClick={onBack} className="mb-4 font-bold text-sm flex gap-2 hover:text-slate-500"><ChevronLeft size={16}/> Voltar</button>
        <div className="flex justify-between mb-6"><div><h2 className="text-2xl font-bold">Segurança do Trabalho</h2></div><button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded flex gap-2 font-bold"><Plus size={16}/> Novo Colaborador</button></div>

        <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-[#111827] uppercase"><tr><th className="p-4">Colaborador</th><th className="p-4">Cargo</th><th className="p-4">ASO</th><th className="p-4">NR-35</th><th className="p-4">EPIs</th><th className="p-4 text-right">Ação</th></tr></thead>
                <tbody>
                    {safetyList.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Nenhum registro encontrado.</td></tr>}
                    {safetyList.map((s:any) => (
                        <tr key={s.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-4 font-bold flex items-center gap-2"><User size={16} className="text-slate-400"/> {s.nome}</td>
                            <td className="p-4 text-slate-500">{s.cargo}</td>
                            <td className="p-4">{s.aso === 'Vencido' ? <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14}/> Vencido</span> : <span className="text-green-500 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> OK</span>}</td>
                            <td className="p-4">{s.nr35 === 'Vigente' ? <span className="text-green-500 font-bold">OK</span> : <span className="text-slate-400">-</span>}</td>
                            <td className="p-4">{s.epi_pendente ? <span className="text-orange-500 font-bold text-xs">Pendente Entrega</span> : <span className="text-green-500 text-xs">Em dia</span>}</td>
                            <td className="p-4 text-right"><button className="text-blue-500 font-bold text-xs hover:underline flex items-center gap-1 justify-end"><HardHat size={14}/> {s.epi_pendente ? 'Entregar EPI' : 'Ver Ficha'}</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

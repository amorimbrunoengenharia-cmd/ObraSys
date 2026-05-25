"use client";
import React, { useState } from 'react';
import { Target, Calendar, Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, Clock, X, Save } from 'lucide-react';
import { Modal } from '../Shared';
import { createMilestone, updateMilestone, deleteMilestone } from '../../app/actions/milestones';

export default function MilestonesInternal({ proj, onRefresh }: any) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<any>(null);
    const [formData, setFormData] = useState({
        title: '',
        targetDate: '',
        completionPercentage: 0,
        status: 'Planejado'
    });

    const milestones = proj.milestones || [];

    const handleOpenModal = (m: any = null) => {
        if (m) {
            setEditingMilestone(m);
            setFormData({
                title: m.title,
                targetDate: new Date(m.targetDate).toISOString().split('T')[0],
                completionPercentage: m.completionPercentage,
                status: m.status
            });
        } else {
            setEditingMilestone(null);
            setFormData({
                title: '',
                targetDate: new Date().toISOString().split('T')[0],
                completionPercentage: 0,
                status: 'Planejado'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.targetDate) return alert("Preencha título e data.");

        let res;
        if (editingMilestone) {
            res = await updateMilestone(proj.id, editingMilestone.id, formData);
        } else {
            res = await createMilestone(proj.id, formData);
        }

        if (res.success) {
            setIsModalOpen(false);
            onRefresh();
        } else {
            alert("Erro ao salvar: " + res.error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm("Deseja excluir este marco?")) {
            const res = await deleteMilestone(proj.id, id);
            if (res.success) onRefresh();
            else alert("Erro ao excluir: " + res.error);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Concluído': return 'bg-emerald-500 text-white';
            case 'Em Andamento': return 'bg-blue-500 text-white';
            case 'Atrasado': return 'bg-red-500 text-white';
            default: return 'bg-slate-500 text-white';
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Target className="text-blue-600" size={28}/> Planejamento: Marcos / Cronograma
                    </h2>
                    <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Gestão de entregas e marcos críticos para o cliente</p>
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus size={18}/> Novo Marco
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {milestones.length === 0 ? (
                    <div className="bg-white dark:bg-[#162032] p-20 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                        <Calendar className="text-slate-300 mx-auto mb-4" size={64}/>
                        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Nenhum marco cadastrado para este projeto.</p>
                        <button onClick={() => handleOpenModal()} className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">Clique para criar o primeiro</button>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-[#162032] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marco / Título</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data Alvo</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progresso</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {milestones.map((m: any) => (
                                    <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                                                    <Target size={20}/>
                                                </div>
                                                <span className="font-black text-slate-800 dark:text-white uppercase text-sm tracking-tight">{m.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                                                <Calendar size={14}/> {new Date(m.targetDate).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="w-full max-w-[120px] space-y-1.5">
                                                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase">
                                                    <span>Progresso</span>
                                                    <span>{m.completionPercentage}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-600 transition-all" style={{ width: `${m.completionPercentage}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase ${getStatusStyle(m.status)}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleOpenModal(m)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                                                    <Edit2 size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(m.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <Modal title={editingMilestone ? "Editar Marco" : "Novo Marco"} onClose={() => setIsModalOpen(false)}>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título do Marco</label>
                            <input 
                                type="text" 
                                value={formData.title} 
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                placeholder="Ex: Entrega de Chaves"
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-blue-500 font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Alvo</label>
                                <input 
                                    type="date" 
                                    value={formData.targetDate} 
                                    onChange={e => setFormData({...formData, targetDate: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-blue-500 font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conclusão (%)</label>
                                <input 
                                    type="number" 
                                    min="0" max="100"
                                    value={formData.completionPercentage} 
                                    onChange={e => setFormData({...formData, completionPercentage: Number(e.target.value)})}
                                    className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-blue-500 font-bold text-blue-600"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                            <select 
                                value={formData.status} 
                                onChange={e => setFormData({...formData, status: e.target.value})}
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-blue-500 font-bold"
                            >
                                <option value="Planejado">Planejado</option>
                                <option value="Em Andamento">Em Andamento</option>
                                <option value="Concluído">Concluído</option>
                                <option value="Atrasado">Atrasado</option>
                            </select>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
                            <button onClick={handleSave} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <Save size={18}/> Salvar Marco
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { Send, FileText, CheckCircle2, Clock, XCircle, Plus, DollarSign, FileSearch, Trash2 } from 'lucide-react';
import { createApproval, getAllApprovals } from '../../app/actions/approvals';
import { Modal } from '../Shared';

export default function ApprovalsInternal({ proj }: any) {
    const [approvals, setApprovals] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        title: '',
        type: 'Medição (BM)',
        amount: '',
        documentUrl: ''
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        const res = await getAllApprovals(proj.id);
        if (res.success) setApprovals(res.approvals || []);
        setIsLoading(false);
    }, [proj.id]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSend = async () => {
        if (!form.title) return alert("Título é obrigatório");
        
        setIsSubmitting(true);
        const res = await createApproval(proj.id, {
            ...form,
            amount: form.amount ? parseFloat(form.amount) : null
        });

        if (res.success) {
            setIsModalOpen(false);
            setForm({ title: '', type: 'Medição (BM)', amount: '', documentUrl: '' });
            loadData();
            alert("Solicitação enviada ao cliente!");
        } else {
            alert("Erro ao enviar: " + res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B1121] p-6 space-y-6 overflow-hidden">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Send className="text-blue-500"/> Gestão de Aprovações do Cliente
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Envie boletins e aditivos para aceite formal do cliente</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all">
                    <Plus size={18}/> Nova Solicitação
                </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">Solicitação</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Resposta do Cliente</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {approvals.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">Nenhuma solicitação enviada.</td>
                            </tr>
                        )}
                        {approvals.map((app: any) => (
                            <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                                <td className="px-6 py-4">
                                    <p className="font-bold text-slate-700 dark:text-slate-200">{app.title}</p>
                                    <p className="text-[10px] text-slate-400">Enviado em {new Date(app.requestedAt).toLocaleDateString()}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase">
                                        {app.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-600 dark:text-slate-400">
                                    {app.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.amount) : '-'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase ${
                                        app.status === 'Aprovado' ? 'text-emerald-500' : 
                                        app.status === 'Reprovado' ? 'text-red-500' : 'text-amber-500'
                                    }`}>
                                        {app.status === 'Aprovado' ? <CheckCircle2 size={12}/> : 
                                         app.status === 'Reprovado' ? <XCircle size={12}/> : <Clock size={12}/>}
                                        {app.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {app.resolvedAt ? (
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">Por: {app.clientName}</p>
                                            {app.observations && <p className="text-[10px] text-slate-400 italic">"{app.observations}"</p>}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">Aguardando cliente...</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal title="Nova Solicitação de Aprovação" onClose={() => setIsModalOpen(false)}>
                    <div className="space-y-6 p-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Título da Solicitação</label>
                            <input 
                                value={form.title}
                                onChange={e => setForm({...form, title: e.target.value})}
                                placeholder="Ex: Medição BM 05 - Março/2026"
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:border-blue-500 outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</label>
                                <select 
                                    value={form.type}
                                    onChange={e => setForm({...form, type: e.target.value})}
                                    className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none"
                                >
                                    <option>Medição (BM)</option>
                                    <option>Aditivo Extra</option>
                                    <option>Documentação/Projeto</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Financeiro (Opcional)</label>
                                <input 
                                    type="number"
                                    value={form.amount}
                                    onChange={e => setForm({...form, amount: e.target.value})}
                                    placeholder="R$ 0,00"
                                    className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL do Documento (PDF/Link)</label>
                            <input 
                                value={form.documentUrl}
                                onChange={e => setForm({...form, documentUrl: e.target.value})}
                                placeholder="https://..."
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none"
                            />
                        </div>

                        <button onClick={handleSend} disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50">
                            {isSubmitting ? "Enviando..." : "Enviar para o Portal do Cliente"}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

"use client";
import React, { useState } from 'react';
import { AlertTriangle, Plus, CheckCircle, Calendar, User, Check, X } from 'lucide-react';
import { createRNC, updateRNCStatus } from '../../../app/actions/quality';
import { Modal } from '../../../components/Shared';

export default function RNCList({ proj, rncs, onRefresh }: any) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRnc, setSelectedRnc] = useState<any>(null);
  
  // Form Nova RNC
  const [form, setForm] = useState({
    description: '',
    responsible: '',
    deadline: ''
  });

  // Form Tratamento
  const [treatment, setTreatment] = useState({
    rootCause: '',
    correctiveAction: ''
  });

  const handleCreate = async () => {
    if (!form.description || !form.responsible) return alert("Preencha os campos obrigatórios");
    const res = await createRNC(proj.id, form);
    if (res.success) {
      setIsModalOpen(false);
      setForm({ description: '', responsible: '', deadline: '' });
      onRefresh();
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    const res = await updateRNCStatus(proj.id, id, status, status === 'Fechada' ? treatment : null);
    if (res.success) {
      setSelectedRnc(null);
      setTreatment({ rootCause: '', correctiveAction: '' });
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Relatórios de Não Conformidade</span>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all">
          <Plus size={14}/> Nova RNC
        </button>
      </div>

      {rncs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/50">
          <AlertTriangle size={32} className="text-slate-300 mb-2"/>
          <p className="text-sm text-slate-500">Nenhuma não conformidade registrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rncs.map((rnc: any) => (
            <div key={rnc.id} className={`bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md ${rnc.status==='Fechada'?'opacity-70':''}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-xl ${rnc.status==='Aberta'?'bg-amber-50 text-amber-600':'bg-emerald-50 text-emerald-600'}`}>
                  <AlertTriangle size={20}/>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${rnc.status==='Aberta'?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
                  {rnc.status}
                </span>
              </div>
              <h4 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2">{rnc.description}</h4>
              <div className="space-y-1 mb-4">
                <p className="text-[10px] text-slate-500 flex items-center gap-1"><User size={12}/> <span className="font-bold uppercase">Responsável:</span> {rnc.responsible}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1"><Calendar size={12}/> <span className="font-bold uppercase">Prazo:</span> {rnc.deadline ? new Date(rnc.deadline).toLocaleDateString() : 'Imediato'}</p>
                {rnc.status === 'Fechada' && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                    <CheckCircle size={10}/> Resolvido em {new Date(rnc.resolvedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              {rnc.status === 'Aberta' && (
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                  <button 
                    onClick={() => setSelectedRnc(rnc)}
                    className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded hover:bg-blue-600 hover:text-white transition-all"
                  >
                    Tratar Problema
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL CRIAÇÃO */}
      {isModalOpen && (
        <Modal title="Registrar Não Conformidade (RNC)" onClose={() => setIsModalOpen(false)}>
          <div className="space-y-5 p-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Descrição do Problema</label>
              <textarea 
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                placeholder="O que foi detectado de errado?"
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm h-24"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Responsável</label>
                <input 
                  value={form.responsible}
                  onChange={e => setForm({...form, responsible: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase">Prazo</label>
                <input 
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm({...form, deadline: e.target.value})}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm"
                />
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-4 bg-amber-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/20 transition-all">
              Abrir RNC
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL TRATAMENTO */}
      {selectedRnc && (
        <Modal title="Tratamento de RNC" onClose={() => setSelectedRnc(null)}>
          <div className="space-y-5 p-2">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl text-sm border border-amber-100">
              <span className="font-bold text-amber-800 block mb-1">PROBLEMA:</span>
              {selectedRnc.description}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Causa Raiz</label>
              <textarea 
                value={treatment.rootCause}
                onChange={e => setTreatment({...treatment, rootCause: e.target.value})}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm h-20"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase">Ação Corretiva</label>
              <textarea 
                value={treatment.correctiveAction}
                onChange={e => setTreatment({...treatment, correctiveAction: e.target.value})}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none text-sm h-20"
              />
            </div>
            <button 
              onClick={() => handleUpdateStatus(selectedRnc.id, 'Fechada')}
              className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18}/> Finalizar e Fechar RNC
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

"use client";
import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronLeft, Plus, Save } from 'lucide-react';
import { Modal } from '../../Shared';
import { createFVS } from '../../../app/actions/quality';

export default function InspectionForm({ fvsList, onBack, projectId }: any) {
  const [selected, setSelected] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ servico: '', local: '', responsavel: '' });
  const [itens, setItens] = useState([{ item: '', status: 'ok' }]);

  const handleSave = async () => {
      if (!formData.servico || !formData.local) return alert("Preencha serviço e local.");
      setIsSaving(true);
      await createFVS(Number(projectId), {
          title: formData.servico,
          inspector: formData.responsavel,
          observations: formData.local,
          items: itens.map(i => ({
              description: i.item,
              isConform: i.status === 'ok'
          }))
      });
      setIsSaving(false);
      setIsNewModalOpen(false);
      setFormData({ servico: '', local: '', responsavel: '' });
      setItens([{ item: '', status: 'ok' }]);
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-in slide-in-from-right">
        {/* MODAL DETALHE (LEITURA) */}
        {isModalOpen && selected && (
            <Modal title={`FVS: ${selected.servico}`} onClose={() => setIsModalOpen(false)}>
                <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-[#0B1121] p-3 rounded border text-sm">
                        <p><strong>Local:</strong> {selected.local}</p><p><strong>Responsável:</strong> {selected.responsavel}</p>
                    </div>
                    <div className="space-y-2">
                        {(typeof selected.itens === 'string' ? JSON.parse(selected.itens || '[]') : selected.itens).map((it:any, i:number)=>(
                            <div key={i} className="flex justify-between items-center border-b pb-2"><span className="text-sm w-2/3">{it.item}</span><div className="flex gap-1"><span className={`p-1 rounded ${it.status==='ok'?'bg-green-500 text-white':'bg-slate-200 text-slate-400'}`}><CheckCircle2 size={16}/></span><span className={`p-1 rounded ${it.status==='nok'?'bg-red-500 text-white':'bg-slate-200 text-slate-400'}`}><XCircle size={16}/></span></div></div>
                        ))}
                    </div>
                    <button onClick={()=>setIsModalOpen(false)} className="w-full py-3 bg-slate-900 text-white rounded font-bold">Fechar</button>
                </div>
            </Modal>
        )}

        {/* MODAL NOVA FVS */}
        {isNewModalOpen && (
            <Modal title="Nova Ficha de Verificação (FVS)" onClose={() => setIsNewModalOpen(false)}>
                <div className="space-y-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Serviço/Atividade</label><input type="text" autoFocus value={formData.servico} onChange={(e) => setFormData({...formData, servico: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm" placeholder="Ex: Concretagem Laje L2"/></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Local</label><input type="text" value={formData.local} onChange={(e) => setFormData({...formData, local: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"/></div>
                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Responsável</label><input type="text" value={formData.responsavel} onChange={(e) => setFormData({...formData, responsavel: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded p-2 text-sm"/></div>
                    </div>
                    
                    <div className="pt-2 border-t mt-4">
                        <label className="block text-xs font-bold text-slate-500 mb-2">Itens de Verificação</label>
                        {itens.map((it, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 items-center">
                                <input type="text" value={it.item} onChange={(e) => { const n = [...itens]; n[idx].item = e.target.value; setItens(n); }} className="flex-1 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded p-2 text-xs" placeholder="Critério de verificação"/>
                                <select value={it.status} onChange={(e) => { const n = [...itens]; n[idx].status = e.target.value; setItens(n); }} className="w-24 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded p-2 text-xs">
                                    <option value="ok">Conforme</option>
                                    <option value="nok">Não Conf.</option>
                                    <option value="na">N/A</option>
                                </select>
                            </div>
                        ))}
                        <button onClick={() => setItens([...itens, {item: '', status: 'ok'}])} className="text-xs font-bold text-emerald-600">+ Adicionar Item</button>
                    </div>

                    <button onClick={handleSave} disabled={isSaving} className="w-full py-3 bg-emerald-600 disabled:bg-emerald-800 text-white rounded font-bold mt-4 flex items-center justify-center gap-2"><Save size={16}/> {isSaving ? 'Salvando...' : 'Salvar FVS'}</button>
                </div>
            </Modal>
        )}

        <button onClick={onBack} className="mb-4 font-bold text-sm flex gap-2 hover:text-slate-500"><ChevronLeft size={16}/> Voltar</button>
        <div className="flex justify-between mb-6"><div><h2 className="text-2xl font-bold">Inspeções de Qualidade</h2></div><button onClick={() => setIsNewModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded flex gap-2 font-bold"><Plus size={16}/> Nova FVS</button></div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fvsList.length === 0 && <p className="text-slate-500 col-span-2">Nenhuma ficha registrada.</p>}
            {fvsList.map((f:any) => (
                <div key={f.id} onClick={() => {setSelected(f); setIsModalOpen(true)}} className="bg-white dark:bg-[#162032] p-5 rounded-xl border hover:border-emerald-500 cursor-pointer group transition-all">
                    <div className="flex justify-between items-start mb-3"><h3 className="font-bold text-lg">{f.servico}</h3><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${f.status==='Aprovado'?'bg-green-100 text-green-700':f.status==='Reprovado'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{f.status}</span></div>
                    <p className="text-xs text-slate-500">{f.local} | Resp: {f.responsavel} | {f.data}</p>
                    <div className="mt-4 text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Ver Checklist</div>
                </div>
            ))}
        </div>
    </div>
  );
}

"use client";
import React, { useState } from 'react';
import { FileCode, Send, AlertTriangle, CheckCircle2, Plus, Edit, Trash2 } from 'lucide-react';
import { createMaterialList, updateMaterialList, deleteMaterialList, addMaterialListItem, updateMaterialListItem, deleteMaterialListItem } from '../../../app/actions/lm';
import { Modal } from '../../Shared';

export default function GEDMaterials({ projId, initialLms, onRefresh }: any) {
  const [lms, setLms] = useState<any[]>(initialLms || []);
  const [selectedLM, setSelectedLM] = useState<any>(null);
  
  // Modals state
  const [isLMModalOpen, setIsLMModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [lmForm, setLmForm] = useState({ titulo: '', disciplina: '' });
  const [itemForm, setItemForm] = useState({ item: '', qtd: '', unid: 'UN', orcamento: '' });

  React.useEffect(() => {
    setLms(initialLms || []);
    if (selectedLM) {
        const updated = (initialLms || []).find((l:any) => l.id === selectedLM.id);
        if (updated) setSelectedLM(updated);
    }
  }, [initialLms]);

  const handleCreateLM = async () => {
      const res = await createMaterialList(projId, lmForm);
      if (res.success) {
          setIsLMModalOpen(false);
          setLmForm({ titulo: '', disciplina: '' });
          onRefresh();
      } else {
          alert(res.error);
      }
  };

  const handleDeleteLM = async (id: number) => {
      if(!confirm("Tem certeza que deseja excluir esta LM?")) return;
      const res = await deleteMaterialList(projId, id);
      if(res.success) {
          setSelectedLM(null);
          onRefresh();
      }
  };

  const handleSendLM = async (lm: any) => {
      const temEstouro = lm?.itens.some((i:any) => i.qtd > i.orcamento);
      if(temEstouro && !confirm("⚠️ ALERTA FINANCEIRO: Itens acima do orçamento. Enviar mesmo assim?")) return;
      
      const res = await updateMaterialList(projId, lm.id, { status: "Enviado Suprimentos" });
      if(res.success) {
          alert(temEstouro ? "⚠️ Enviado com Alerta!" : "✅ Enviado com sucesso!");
          onRefresh();
      }
  };

  const handleSaveItem = async () => {
      if (!selectedLM) return;
      if (editingItem) {
          const res = await updateMaterialListItem(projId, editingItem.id, itemForm);
          if(res.success) {
              setIsItemModalOpen(false);
              setEditingItem(null);
              onRefresh();
          }
      } else {
          const res = await addMaterialListItem(projId, selectedLM.id, itemForm);
          if(res.success) {
              setIsItemModalOpen(false);
              setItemForm({ item: '', qtd: '', unid: 'UN', orcamento: '' });
              onRefresh();
          }
      }
  };

  const handleDeleteItem = async (itemId: number) => {
      if(!confirm("Excluir item?")) return;
      const res = await deleteMaterialListItem(projId, itemId);
      if(res.success) onRefresh();
  };

  return (
    <div className="flex-1 flex h-full">
        <div className="w-80 bg-white dark:bg-[#162032] border-r border-slate-200 dark:border-slate-700 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">LMs Emitidas</span>
                <button onClick={() => setIsLMModalOpen(true)} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold hover:bg-emerald-500">
                    + Nova LM
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {lms.map((lm:any) => (
                    <div key={lm.id} onClick={() => setSelectedLM(lm)} className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${selectedLM?.id === lm.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''}`}>
                        <div className="flex justify-between mb-1">
                            <span className="font-bold text-sm text-slate-800 dark:text-white">{lm.codigo}</span>
                            <span className={`text-[10px] px-2 rounded-full font-bold flex items-center ${lm.status.includes('Enviado') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {lm.status}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{lm.titulo}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-mono">{lm.disciplina}</p>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="flex-1 bg-slate-50 dark:bg-[#0B1121] p-8 overflow-y-auto">
            {selectedLM ? (
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-4">
                                {selectedLM.codigo}
                                <button onClick={() => handleDeleteLM(selectedLM.id)} className="text-red-500 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                            </h2>
                            <p className="text-sm text-slate-500">{selectedLM.titulo}</p>
                        </div>
                        <div className="flex gap-2">
                            {selectedLM.status === 'Em Edição' && (
                                <button onClick={() => { setEditingItem(null); setItemForm({ item: '', qtd: '', unid: 'UN', orcamento: '' }); setIsItemModalOpen(true); }} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                                    <Plus size={16}/> Adicionar Item
                                </button>
                            )}
                            {selectedLM.status === 'Em Edição' ? (
                                <button onClick={() => handleSendLM(selectedLM)} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2">
                                    <Send size={16}/> Enviar LM
                                </button>
                            ) : (
                                <button disabled className="bg-gray-200 text-gray-500 px-6 py-2 rounded-lg font-bold cursor-not-allowed">Já Enviada</button>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#162032] rounded-xl border overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 dark:bg-[#111827] text-slate-500 uppercase text-xs">
                                <tr>
                                    <th className="p-4">Item</th>
                                    <th className="p-4">Qtd</th>
                                    <th className="p-4">Orçamento</th>
                                    <th className="p-4">Status</th>
                                    {selectedLM.status === 'Em Edição' && <th className="p-4 text-right">Ações</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {selectedLM.itens?.map((it:any) => (
                                    <tr key={it.id} className="border-b dark:border-slate-800">
                                        <td className="p-4 font-bold">{it.item}</td>
                                        <td className="p-4">{it.qtd} {it.unid}</td>
                                        <td className="p-4">{it.orcamento} {it.unid}</td>
                                        <td className="p-4">
                                            {it.qtd > it.orcamento ? 
                                                <span className="text-red-500 font-bold flex gap-1 text-xs items-center"><AlertTriangle size={12}/> Estouro</span> : 
                                                <span className="text-green-500 font-bold flex gap-1 text-xs items-center"><CheckCircle2 size={12}/> OK</span>
                                            }
                                        </td>
                                        {selectedLM.status === 'Em Edição' && (
                                            <td className="p-4 text-right">
                                                <button onClick={() => { setEditingItem(it); setItemForm(it); setIsItemModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit size={14}/></button>
                                                <button onClick={() => handleDeleteItem(it.id)} className="text-red-500 hover:bg-red-50 p-2 rounded ml-1"><Trash2 size={14}/></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {(!selectedLM.itens || selectedLM.itens.length === 0) && (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum item adicionado à lista.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <FileCode size={48} className="opacity-20 mb-4"/>
                    <p>Selecione uma Lista.</p>
                </div>
            )}
        </div>

        {/* Modal Nova LM */}
        {isLMModalOpen && (
            <Modal title="Nova Lista de Materiais" onClose={() => setIsLMModalOpen(false)}>
                <div className="space-y-4 p-2">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Título da Lista</label>
                        <input value={lmForm.titulo} onChange={e=>setLmForm({...lmForm, titulo: e.target.value})} className="w-full p-2 border rounded mt-1" placeholder="Ex: Pedido Eletrodutos" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Disciplina</label>
                        <select value={lmForm.disciplina} onChange={e=>setLmForm({...lmForm, disciplina: e.target.value})} className="w-full p-2 border rounded mt-1">
                            <option value="">Selecione...</option>
                            <option value="ELÉTRICA">Elétrica</option>
                            <option value="HIDRÁULICA">Hidráulica</option>
                            <option value="CIVIL">Civil</option>
                            <option value="ESTRUTURA">Estrutura</option>
                        </select>
                    </div>
                    <button onClick={handleCreateLM} className="w-full bg-emerald-600 text-white font-bold p-3 rounded">Criar Lista</button>
                </div>
            </Modal>
        )}

        {/* Modal Item */}
        {isItemModalOpen && (
            <Modal title={editingItem ? "Editar Item" : "Adicionar Item"} onClose={() => { setIsItemModalOpen(false); setEditingItem(null); }}>
                <div className="space-y-4 p-2">
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Nome do Material</label>
                        <input value={itemForm.item} onChange={e=>setItemForm({...itemForm, item: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Quantidade Solic.</label>
                            <input type="number" value={itemForm.qtd} onChange={e=>setItemForm({...itemForm, qtd: e.target.value})} className="w-full p-2 border rounded mt-1" />
                        </div>
                        <div className="w-24">
                            <label className="text-xs font-bold text-slate-400 uppercase">Unid</label>
                            <select value={itemForm.unid} onChange={e=>setItemForm({...itemForm, unid: e.target.value})} className="w-full p-2 border rounded mt-1">
                                <option value="UN">UN</option>
                                <option value="M">M</option>
                                <option value="M2">M²</option>
                                <option value="M3">M³</option>
                                <option value="KG">KG</option>
                                <option value="CX">CX</option>
                                <option value="SC">SC</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 uppercase">Qtd. Orçada (Limite)</label>
                        <input type="number" value={itemForm.orcamento} onChange={e=>setItemForm({...itemForm, orcamento: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <button onClick={handleSaveItem} className="w-full bg-blue-600 text-white font-bold p-3 rounded">Salvar Item</button>
                </div>
            </Modal>
        )}
    </div>
  );
}

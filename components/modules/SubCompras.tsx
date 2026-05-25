"use client";
import React, { useState } from 'react';
import { ShoppingCart, Truck, AlertCircle, DollarSign, Calculator, CheckCircle, Plus, Trash2, Save, Gavel, Paperclip, Upload, FileText, X } from 'lucide-react';
import { Modal } from '../Shared';
import { saveQuotations, selectWinningQuote, updatePurchaseRequestStatus } from '../../app/actions/supply';
import { canApprovePurchase } from '../../lib/permissions';
import { useAuth } from '../AuthContext';

export default function SubCompras({ requests, suppliers, onRefresh }: any) {
  const { user } = useAuth();
  const isMestre = user?.role === 'Mestre de Obras';
  // Filtramos apenas solicitações PENDENTES, EM_COTACAO ou APROVADO
  const pendentes = requests.filter((r: any) => r.status === 'PENDENTE' || r.status === 'EM_COTACAO' || r.status === 'APROVADO');

  const [cotacaoAberta, setCotacaoAberta] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleApproveSC = async (id: string) => {
      if(!confirm("Aprovar este pedido de compra?")) return;
      const res = await updatePurchaseRequestStatus(id, 'APROVADO', user?.role);
      if(res.success) onRefresh();
      else alert("Erro: " + res.error);
  };
  
  const handleRejectSC = async (id: string) => {
      if(!confirm("Tem certeza que deseja REJEITAR este pedido?")) return;
      const res = await updatePurchaseRequestStatus(id, 'REJEITADO', user?.role);
      if(res.success) onRefresh();
      else alert("Erro: " + res.error);
  };
  
  // Estado das Cotações no Modal
  const [quotes, setQuotes] = useState<any[]>([
    { supplierName: "", supplierId: "", unitPrice: 0, totalPrice: 0, deliveryDays: 0, paymentTerms: "30 dias" },
    { supplierName: "", supplierId: "", unitPrice: 0, totalPrice: 0, deliveryDays: 0, paymentTerms: "30 dias" }
  ]);

  const handleOpenQuotation = (req: any) => {
    setCotacaoAberta(req);
    // Se já existem cotações salvas (no caso de EM_COTACAO), poderíamos carregar aqui.
    // Por simplicidade, iniciaremos limpo ou com as cotações atuais se o objeto as trouxer.
    if (req.quotations && req.quotations.length > 0) {
        setQuotes(req.quotations.map((q: any) => ({
            ...q,
            supplierId: q.supplierId || ""
        })));
    } else {
        setQuotes([
            { supplierName: "", supplierId: "", unitPrice: 0, totalPrice: 0, deliveryDays: 0, paymentTerms: "30 dias" },
            { supplierName: "", supplierId: "", unitPrice: 0, totalPrice: 0, deliveryDays: 0, paymentTerms: "30 dias" }
        ]);
    }
  };

  const addQuoteField = () => {
    setQuotes([...quotes, { supplierName: "", supplierId: "", unitPrice: 0, totalPrice: 0, deliveryDays: 0, paymentTerms: "30 dias" }]);
  };

  const removeQuoteField = (index: number) => {
    setQuotes(quotes.filter((_, i) => i !== index));
  };

  const updateQuote = (index: number, field: string, value: any) => {
    const newQuotes = [...quotes];
    newQuotes[index][field] = value;
    
    // Auto-calcula total se mudar preço unitário e tivermos a quantidade do pedido
    if (field === 'unitPrice' && cotacaoAberta) {
        newQuotes[index].totalPrice = Number(value) * cotacaoAberta.quantity;
    }
    
    setQuotes(newQuotes);
  };

  const handleFileUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.url) {
            updateQuote(index, 'attachmentUrl', data.url);
        } else {
            alert("Erro ao subir arquivo.");
        }
    } catch (e) {
        console.error("Upload error:", e);
        alert("Falha na conexão com o servidor de upload.");
    }
  };

  const handleSaveQuotes = async () => {
    if (quotes.some(q => !q.supplierName || q.totalPrice <= 0)) {
        return alert("Preencha o nome do fornecedor e o valor total para todas as cotações.");
    }
    setIsSaving(true);
    // Adiciona o nome do usuário nas cotações
    const quotesWithUser = quotes.map(q => ({ ...q, userName: user?.name || "Sistema" }));
    const res = await saveQuotations(cotacaoAberta.id, quotesWithUser);
    if (res.success) {
        onRefresh();
        setCotacaoAberta(null);
    } else {
        alert("Erro ao salvar: " + res.error);
    }
    setIsSaving(false);
  };

  const handleSelectWinner = async (quote: any) => {
    if (!confirm(`Confirmar compra com ${quote.supplierName} por R$ ${quote.totalPrice.toLocaleString()}?`)) return;
    
    setIsSaving(true);
    // Se a cotação ainda não tem ID (foi apenas digitada e não salva), primeiro salvamos
    if (!quote.id) {
        const saveRes = await saveQuotations(cotacaoAberta.id, quotes);
        if (!saveRes.success) {
            alert("Erro ao salvar cotações antes de escolher vencedor.");
            setIsSaving(false);
            return;
        }
        // Após salvar, precisamos do ID gerado. É melhor salvar antes de permitir escolher vencedor,
        // ou recarregar os dados. Aqui, assumiremos que o usuário clica em "Salvar Cotações" primeiro,
        // ou faremos um fluxo unificado.
    }

    // Para este MVP, vamos garantir que salvamos e depois pegamos a cotação recém-criada ou usamos o ID se existir
    const res = await selectWinningQuote(quote.id, user?.name);
    if (res.success) {
        onRefresh();
        setCotacaoAberta(null);
        alert("✅ Compra confirmada e título financeiro gerado!");
    } else {
        alert("Erro ao finalizar compra: " + (res as any).error);
    }
    setIsSaving(false);
  };

  // Lógica de destaque
  const validQuotes = quotes.filter(q => q.totalPrice > 0);
  const menorPreco = validQuotes.length > 0 ? Math.min(...validQuotes.map(q => q.totalPrice)) : 0;
  const menorPrazo = validQuotes.length > 0 ? Math.min(...validQuotes.map(q => q.deliveryDays)) : 0;

  return (
    <div className="space-y-6 animate-in fade-in">
        
        {/* --- MODAL MAPA DE COTAÇÃO --- */}
        {cotacaoAberta && (
            <Modal title={`Mapa de Cotação: ${cotacaoAberta.requestCode} - ${cotacaoAberta.material?.name}`} onClose={() => setCotacaoAberta(null)}>
                <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantidade Solicitada</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{cotacaoAberta.quantity} {cotacaoAberta.material?.unit}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra Destino</p>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{cotacaoAberta.project?.name}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {quotes.map((q, i) => (
                            <div key={i} className={`p-4 rounded-3xl border-2 transition-all relative ${q.totalPrice === menorPreco && q.totalPrice > 0 ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121]'}`}>
                                <button onClick={() => removeQuoteField(i)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 size={14}/>
                                </button>

                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
                                        <select 
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                                            value={q.supplierId}
                                            onChange={e => {
                                                const s = suppliers.find((sup: any) => sup.id === e.target.value);
                                                updateQuote(i, 'supplierId', e.target.value);
                                                updateQuote(i, 'supplierName', s?.name || "");
                                            }}
                                        >
                                            <option value="">Selecionar Fornecedor</option>
                                            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        {!q.supplierId && (
                                            <input 
                                                type="text" 
                                                placeholder="Ou digite o nome..." 
                                                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                                                value={q.supplierName}
                                                onChange={e => updateQuote(i, 'supplierName', e.target.value)}
                                            />
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preço Unit.</label>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:border-emerald-500"
                                                value={q.unitPrice}
                                                onChange={e => updateQuote(i, 'unitPrice', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prazo (Dias)</label>
                                            <input 
                                                type="number" 
                                                className={`w-full p-2 bg-slate-50 dark:bg-slate-900 border rounded-xl text-xs font-bold outline-none focus:border-emerald-500 ${q.deliveryDays === menorPrazo && q.deliveryDays > 0 ? 'border-blue-500 text-blue-600' : 'border-slate-100 dark:border-slate-800'}`}
                                                value={q.deliveryDays}
                                                onChange={e => updateQuote(i, 'deliveryDays', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-emerald-600">Valor Total da Oferta</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                                            <input 
                                                type="number" 
                                                className="w-full p-2 pl-8 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl text-sm font-black text-emerald-700 dark:text-emerald-400 outline-none"
                                                value={q.totalPrice}
                                                onChange={e => updateQuote(i, 'totalPrice', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pagamento</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: 30/60 dias" 
                                            className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-xs font-bold outline-none"
                                            value={q.paymentTerms}
                                            onChange={e => updateQuote(i, 'paymentTerms', e.target.value)}
                                        />
                                    </div>

                                    <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Anexo do Orçamento</label>
                                        {q.attachmentUrl ? (
                                            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-emerald-200 dark:border-emerald-900/30">
                                                <a href={q.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 truncate max-w-[120px]">
                                                    <FileText size={14}/> {q.attachmentUrl.split('/').pop()}
                                                </a>
                                                <button onClick={() => updateQuote(i, 'attachmentUrl', null)} className="text-slate-400 hover:text-red-500">
                                                    <X size={12}/>
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex items-center justify-center gap-2 w-full p-2 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-emerald-500 hover:border-emerald-500 cursor-pointer transition-all">
                                                <Upload size={14}/> Anexar PDF/IMG
                                                <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleFileUpload(i, e.target.files[0])} />
                                            </label>
                                        )}
                                    </div>

                                    {q.id && (
                                        <button 
                                            onClick={() => handleSelectWinner(q)}
                                            disabled={isSaving}
                                            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Gavel size={14}/> {isSaving ? 'Processando...' : 'Confirmar Compra'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button 
                            onClick={addQuoteField}
                            className="p-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:bg-emerald-50">
                                <Plus size={20}/>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Opção</span>
                        </button>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-2xl flex gap-3">
                        <Calculator className="text-blue-500 shrink-0" size={20}/>
                        <div>
                            <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Análise Inteligente:</p>
                            <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80">O menor preço está em verde. Cotações com menor prazo de entrega destacam o campo de dias em azul. Clique em "Salvar Cotações" para liberar o botão de compra.</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setCotacaoAberta(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                        <button 
                            onClick={handleSaveQuotes} 
                            disabled={isSaving}
                            className="flex-[2] bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Save size={18}/> {isSaving ? 'Salvando...' : 'Salvar Cotações'}
                        </button>
                    </div>
                </div>
            </Modal>
        )}

        <div className="flex justify-between items-center">
            <div>
                <h3 className="text-2xl font-black flex items-center gap-3 text-slate-800 dark:text-white"><ShoppingCart className="text-emerald-500" size={28}/> Mapa de Cotações</h3>
                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Comparativo de fornecedores e decisão de compra</p>
            </div>
            <div className="px-4 py-2 bg-white dark:bg-[#162032] border border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-sm uppercase tracking-widest">
                <AlertCircle size={14} className="text-orange-500"/> Aguardando: {pendentes.length}
            </div>
        </div>

        <div className="bg-white dark:bg-[#162032] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-5">Solicitação</th>
                        <th className="px-8 py-5">Item / Insumo</th>
                        <th className="px-8 py-5 text-center">Quantidade</th>
                        <th className="px-8 py-5 text-center">Status</th>
                        <th className="px-8 py-5 text-right">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {pendentes.length === 0 && (
                        <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma compra pendente de cotação.</td></tr>
                    )}
                    
                    {pendentes.map((p: any) => (
                        <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                            <td className="px-8 py-6">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-[10px] font-black text-slate-600 dark:text-slate-400">{p.requestCode}</span>
                            </td>
                            <td className="px-8 py-6">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-slate-800 dark:text-white uppercase text-sm">{p.material?.name}</p>
                                    {p.quotations?.some((q: any) => q.attachmentUrl) && (
                                        <span title="Possui anexo de orçamento"><Paperclip size={12} className="text-emerald-500" /></span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase">{p.project?.name}</p>
                            </td>
                            <td className="px-8 py-6 text-center font-bold text-slate-600 dark:text-slate-400">
                                {p.quantity} {p.material?.unit}
                            </td>
                            <td className="px-8 py-6 text-center">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center justify-center gap-1 w-fit mx-auto ${
                                    p.status === 'EM_COTACAO' ? 'bg-blue-100 text-blue-600' : 
                                    p.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-600' : 
                                    'bg-amber-100 text-amber-600'
                                }`}>
                                    {p.status === 'EM_COTACAO' ? <DollarSign size={12}/> : 
                                     p.status === 'APROVADO' ? <CheckCircle size={12}/> :
                                     <Truck size={12}/>}
                                    {p.status.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                                {p.status === 'ORDEM_EMITIDA' ? (
                                    <button 
                                        onClick={() => {
                                            if ((window as any).openReceiveModal) (window as any).openReceiveModal(p);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                    >
                                        <Truck size={14}/> Confirmar Recebimento
                                    </button>
                                ) : (
                                    isMestre ? (
                                        <span className="text-xs font-bold text-slate-400">Aguardando Setor de Compras</span>
                                    ) : (
                                        <div className="flex justify-end gap-2">
                                            {p.status === 'PENDENTE' && canApprovePurchase(user?.role || '') && (
                                                <>
                                                    <button 
                                                        onClick={() => handleApproveSC(p.id)}
                                                        title="Aprovar Pedido"
                                                        className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <CheckCircle size={16}/>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRejectSC(p.id)}
                                                        title="Rejeitar Pedido"
                                                        className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <Trash2 size={16}/>
                                                    </button>
                                                </>
                                            )}
                                            {(p.status === 'APROVADO' || p.status === 'EM_COTACAO') && user?.role === 'Comprador' && (
                                                <button 
                                                    onClick={() => handleOpenQuotation(p)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                                >
                                                    <Calculator size={14}/> {p.status === 'EM_COTACAO' ? 'Revisar Mapa' : 'Iniciar Mapa'}
                                                </button>
                                            )}
                                        </div>
                                    )
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}

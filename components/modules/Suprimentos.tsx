"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Package, Wrench, ArrowUp, ArrowDown, AlertTriangle, Search, Filter, User, History, Plus, Minus, RefreshCw, ClipboardList, CheckCircle2, AlertCircle, BookOpen, Save, ShoppingCart, TrendingUp, Upload, Truck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Modal } from '../Shared';
import { useAuth } from '../AuthContext';
import { moveInventoryItem, toolCaution, createInventoryItem, createInventoryTool } from '../../app/actions/inventory';
import { exportSuprimentosToObsidian } from '../../app/actions/obsidian';
import { registerConsumption, getSupplyData, receivePurchaseRequest } from '../../app/actions/supply';
import SubCompras from './SubCompras';
import SuppliesAnalytics from './SuppliesAnalytics';

export default function Suprimentos({ proj }: any) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'materiais';
  const [activeTab, setActiveTab] = useState(defaultTab); // materiais | ferramentas | compras | dashboard | historico
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<any[]>([]);
  const [isLoadingSupply, setIsLoadingSupply] = useState(false);
  const { user } = useAuth();
  const isMestre = user?.role === 'Mestre de Obras';
  
  // --- DADOS REAIS DO PROJETO ---
  const estoque = proj?.estoque || [];
  const ferramentas = proj?.ferramentas || [];
  const historico = proj?.historico_estoque || [];

  // --- LÓGICA DOS MODAIS ---
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState(''); // material_entrada, material_saida, ferramenta_emp, ferramenta_dev, novo_material, nova_ferramenta, receber_pedido
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [inputValue, setInputValue] = useState(''); 
  const [appliedAt, setAppliedAt] = useState('');
  const [responsible, setResponsible] = useState('');
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    (window as any).openReceiveModal = (p: any) => {
        setSelectedItem(p);
        setModalMode('receber_pedido');
        setModalOpen(true);
    };
    return () => { delete (window as any).openReceiveModal; };
  }, []);

  // Form states for new items
  const [newItem, setNewItem] = useState({ material: '', unidade: 'Sacos', quantidadeAtual: 0, estoqueMinimo: 10 });
  const [newTool, setNewTool] = useState({ nome: '', marca: '', patrimonio: '' });

  const loadGlobalSupplyData = useCallback(async () => {
    setIsLoadingSupply(true);
    try {
        const data = await getSupplyData();
        setSuppliers(data.suppliers || []);
        // Filtramos solicitações que pertencem a este projeto específico
        const projectRequests = data.requests?.filter((r: any) => r.projectId === proj.id) || [];
        setPurchaseRequests(projectRequests);
    } catch (e) {
        console.error("Erro ao carregar dados globais de suprimentos:", e);
    } finally {
        setIsLoadingSupply(false);
    }
  }, [proj.id]);

  useEffect(() => {
    loadGlobalSupplyData();
  }, [loadGlobalSupplyData]);

  const openModal = (item: any, mode: string) => {
      setSelectedItem(item);
      setModalMode(mode);
      setInputValue('');
      setAppliedAt('');
      setResponsible('');
      setModalOpen(true);
  };

  const handleAction = async () => {
      setIsSaving(true);
      try {
          if (modalMode === 'material_entrada') {
              await moveInventoryItem(selectedItem.id, Number(inputValue), 'entrada', "Almoxarifado", proj.id);
          } 
          else if (modalMode === 'material_saida') {
              const formData = new FormData();
              formData.append('inventoryItemId', selectedItem.id.toString());
              formData.append('quantity', inputValue);
              formData.append('appliedAt', appliedAt);
              formData.append('responsible', responsible);
              formData.append('projectId', proj.id.toString());
              
              const res = await registerConsumption(formData);
              if (res.error) {
                  alert(res.error);
                  return;
              }
          }
          else if (modalMode === 'ferramenta_emp') {
              await toolCaution(selectedItem.id, inputValue, 'emprestimo', proj.id);
          }
          else if (modalMode === 'ferramenta_dev') {
              await toolCaution(selectedItem.id, "Almoxarifado", 'devolucao', proj.id);
          }
          else if (modalMode === 'novo_material') {
              await createInventoryItem(newItem, proj.id);
          }
          else if (modalMode === 'nova_ferramenta') {
              await createInventoryTool(newTool, proj.id);
          }
          else if (modalMode === 'receber_pedido') {
              await receivePurchaseRequest(selectedItem.id, 1, 30, invoicePhotoUrl);
          }
          setModalOpen(false);
          window.location.reload(); 
      } catch (e) {
          alert("Erro ao processar ação.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleObsidianSync = async () => {
    setIsSyncing(true); setSyncDone(false);
    await exportSuprimentosToObsidian();
    setIsSyncing(false); setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
  };

  // Filtros e Cálculos
  const estoqueFiltrado = estoque.filter((i:any) => i.material.toLowerCase().includes(searchTerm.toLowerCase()));
  const ferramentasFiltradas = ferramentas.filter((f:any) => f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || (f.responsavel && f.responsavel.toLowerCase().includes(searchTerm.toLowerCase())));

  const metrics = useMemo(() => {
    let totalComprado = 0;
    let totalAberto = 0;
    let economia = 0;

    purchaseRequests.forEach((req: any) => {
        if (req.status === 'APROVADO' || req.status === 'ENTREGUE') {
            totalComprado += req.estimatedCost || 0;
            
            // Cálculo de Economia: Maior cotação - Vencedora
            if (req.quotations && req.quotations.length > 1) {
                const prices = req.quotations.map((q: any) => q.totalPrice);
                const maxPrice = Math.max(...prices);
                const winPrice = req.quotations.find((q: any) => q.isWinner)?.totalPrice || req.estimatedCost;
                economia += (maxPrice - winPrice);
            }
        } else if (req.status === 'PENDENTE' || req.status === 'EM_COTACAO') {
            totalAberto += req.estimatedCost || 0;
        }
    });

    return { totalComprado, totalAberto, economia };
  }, [purchaseRequests]);

  return (
    <div className="p-6 h-full flex flex-col animate-in fade-in relative bg-slate-50 dark:bg-[#0B1121] overflow-y-auto">
        
        {/* MODAL DE AÇÃO */}
        {modalOpen && modalMode !== 'receber_pedido' && (
            <Modal title={
                modalMode.includes('material') ? `Movimentar: ${selectedItem?.material || 'Novo'}` : 
                modalMode.includes('ferramenta') ? `Cautela: ${selectedItem?.nome || 'Nova'}` : 'Ação'
            } onClose={() => setModalOpen(false)}>
                <div className="space-y-4">
                    {(modalMode === 'material_entrada' || modalMode === 'material_saida') && (
                        <>
                            <div className="flex justify-center mb-2">
                                <div className={`p-4 rounded-full ${modalMode.includes('entrada') ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {modalMode.includes('entrada') ? <ArrowUp size={32}/> : <CheckCircle2 size={32}/>}
                                </div>
                            </div>
                            
                            {modalMode === 'material_saida' && (
                                <div className="p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl mb-4">
                                    <p className="text-[10px] font-black text-orange-600 uppercase">Saldo Disponível</p>
                                    <p className="text-xl font-black text-orange-700 dark:text-orange-400">{selectedItem.quantidadeAtual} {selectedItem.unidade}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="qtd_material" className="block text-[10px] font-black uppercase text-slate-500 mb-1">Quantidade ({selectedItem.unidade})</label>
                                    <input id="qtd_material" type="number" step="0.01" autoFocus className="w-full text-2xl font-black text-center bg-slate-100 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:border-emerald-500" value={inputValue} onChange={e => setInputValue(e.target.value)} />
                                </div>

                                {modalMode === 'material_saida' && (
                                    <>
                                        <div>
                                            <label htmlFor="aplicacao" className="block text-[10px] font-black uppercase text-slate-500 mb-1">Onde será aplicado?</label>
                                            <input id="aplicacao" type="text" placeholder="Ex: Viga Baldrame" className="w-full bg-slate-100 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-orange-500" value={appliedAt} onChange={e => setAppliedAt(e.target.value)} />
                                        </div>
                                        <div>
                                            <label htmlFor="responsavel" className="block text-[10px] font-black uppercase text-slate-500 mb-1">Responsável pela Retirada</label>
                                            <input id="responsavel" type="text" placeholder="Nome de quem retirou" className="w-full bg-slate-100 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-orange-500" value={responsible} onChange={e => setResponsible(e.target.value)} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {modalMode === 'ferramenta_emp' && (
                        <>
                             <div className="flex justify-center mb-2"><div className="p-4 rounded-full bg-blue-100 text-blue-600"><User size={32}/></div></div>
                             <label htmlFor="resp_ferramenta" className="block text-xs font-bold uppercase text-slate-500">Nome do Responsável</label>
                             <input id="resp_ferramenta" type="text" autoFocus placeholder="Ex: Pedreiro João" className="w-full bg-slate-100 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl p-4 outline-none focus:border-blue-500" value={inputValue} onChange={e => setInputValue(e.target.value)} />
                        </>
                    )}

                    {modalMode === 'ferramenta_dev' && (
                        <p className="text-center text-slate-600 dark:text-slate-300">Confirmar devolução da ferramenta ao almoxarifado?</p>
                    )}

                    {modalMode === 'novo_material' && (
                        <div className="space-y-3">
                            <div><label htmlFor="nome_material" className="block text-xs font-bold text-slate-500 mb-1">Nome do Material</label><input id="nome_material" type="text" value={newItem.material} onChange={e => setNewItem({...newItem, material: e.target.value})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label htmlFor="unid_material" className="block text-xs font-bold text-slate-500 mb-1">Unidade</label><input id="unid_material" type="text" value={newItem.unidade} onChange={e => setNewItem({...newItem, unidade: e.target.value})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                                <div><label htmlFor="min_material" className="block text-xs font-bold text-slate-500 mb-1">Mínimo Stock</label><input id="min_material" type="number" value={newItem.estoqueMinimo} onChange={e => setNewItem({...newItem, estoqueMinimo: Number(e.target.value)})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                            </div>
                        </div>
                    )}

                    {modalMode === 'nova_ferramenta' && (
                        <div className="space-y-3">
                            <div><label htmlFor="nome_ferr" className="block text-xs font-bold text-slate-500 mb-1">Nome da Ferramenta</label><input id="nome_ferr" type="text" value={newTool.nome} onChange={e => setNewTool({...newTool, nome: e.target.value})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label htmlFor="marca_ferr" className="block text-xs font-bold text-slate-500 mb-1">Marca</label><input id="marca_ferr" type="text" value={newTool.marca} onChange={e => setNewTool({...newTool, marca: e.target.value})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                                <div><label htmlFor="patr_ferr" className="block text-xs font-bold text-slate-500 mb-1">Nº Patrimônio</label><input id="patr_ferr" type="text" value={newTool.patrimonio} onChange={e => setNewTool({...newTool, patrimonio: e.target.value})} className="w-full bg-slate-100 dark:bg-[#0B1121] border p-2 rounded text-sm"/></div>
                            </div>
                        </div>
                    )}

                    <button onClick={handleAction} disabled={isSaving} className="w-full py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        {isSaving ? <RefreshCw size={16} className="animate-spin"/> : <Save size={16}/>}
                        {isSaving ? 'Salvando...' : 'Confirmar'}
                    </button>
                </div>
            </Modal>
        )}

        {/* MODAL RECEBIMENTO NF */}
        {modalMode === 'receber_pedido' && modalOpen && (
            <Modal title={`Receber Pedido: ${selectedItem.requestCode}`} onClose={() => setModalOpen(false)}>
                <div className="space-y-6">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Confirmação Física</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-1">
                            Você está confirmando que o item <span className="text-emerald-600">"{selectedItem.material?.name}"</span> na quantidade de <span className="text-emerald-600">{selectedItem.quantity} {selectedItem.material?.unit}</span> chegou à obra.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evidência Fiscal (NF / Canhoto)</label>
                        {invoicePhotoUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500">
                                <img src={invoicePhotoUrl} alt="NF" className="w-full h-40 object-cover" />
                                <button onClick={() => setInvoicePhotoUrl('')} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"><AlertCircle size={14}/></button>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-2 w-full h-40 bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-500 transition-all">
                                <Upload size={24} className="text-slate-400"/>
                                <span className="text-xs font-bold text-slate-400">Subir Foto da NF</span>
                                <input type="file" className="hidden" onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const fd = new FormData(); fd.append('file', file);
                                        const res = await fetch('/api/upload', { method: 'POST', body: fd });
                                        const data = await res.json();
                                        if (data.url) setInvoicePhotoUrl(data.url);
                                    }
                                }} />
                            </label>
                        )}
                    </div>

                    <button onClick={handleAction} disabled={isSaving || !invoicePhotoUrl} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 disabled:opacity-50">
                        {isSaving ? 'Processando...' : 'Confirmar Recebimento e NF'}
                    </button>
                </div>
            </Modal>
        )}

        {/* HEADER & NAVEGAÇÃO */}
        <div className="space-y-6 mb-8 mt-2">
            {/* LINHA 1: Título e Botão */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-white"><Package className="text-emerald-500" size={24}/> Suprimentos</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Gestão de Estoque e Almoxarifado</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Link href="/suprimentos" className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all shadow-sm w-full sm:w-auto justify-center border border-emerald-100 dark:border-emerald-800">
                        <ShoppingCart size={14} /> Central de Compras
                    </Link>
                    <button onClick={handleObsidianSync} disabled={isSyncing} className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 disabled:opacity-60 text-violet-600 dark:text-violet-400 text-[10px] uppercase tracking-widest font-black rounded-lg transition-all shadow-sm w-full sm:w-auto justify-center border border-violet-100 dark:border-violet-800">
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                        {isSyncing ? 'Sincronizando...' : syncDone ? 'Sincronizado!' : 'Exportar Obsidian'}
                    </button>
                </div>
            </div>

            {/* LINHA 2: KPIs */}
            {!isMestre && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShoppingCart size={14} className="text-blue-500"/> Total Comprado</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalComprado)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500"/> Economia Real</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.economia)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col justify-between h-28 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Truck size={14} className="text-orange-500"/> Aguardando Cotação</p>
                        <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalAberto)}</p>
                    </div>
                </div>
            )}

            {/* LINHA 3: Controles */}
            <div className="flex flex-col xl:flex-row gap-6">
                 <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                      <input type="text" placeholder="Buscar insumos e ativos..." className="w-full h-full bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-800 rounded-[1.5rem] py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500 font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all" onChange={e => setSearchTerm(e.target.value)}/>
                 </div>
                 <div className="flex bg-white dark:bg-[#162032] p-1.5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto custom-scrollbar">
                    <button onClick={() => setActiveTab('materiais')} className={`px-6 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'materiais' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}><Package size={16}/> Materiais</button>
                    <button onClick={() => setActiveTab('ferramentas')} className={`px-6 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'ferramentas' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}><Wrench size={16}/> Ferramentas</button>
                    <button onClick={() => setActiveTab('compras')} className={`px-6 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'compras' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}><ShoppingCart size={16}/> Compras / Pedidos</button>
                    {!isMestre && <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}><TrendingUp size={16}/> Dashboard</button>}
                    <button onClick={() => setActiveTab('historico')} className={`px-6 py-4 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'historico' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'}`}><ClipboardList size={16}/> Logs</button>
                 </div>
            </div>
        </div>

        {/* CONTEÚDO: DASHBOARD */}
        {activeTab === 'dashboard' && (
            <SuppliesAnalytics 
                requests={purchaseRequests} 
                suppliers={suppliers} 
                project={proj}
            />
        )}

        {/* CONTEÚDO: COMPRAS */}
        {activeTab === 'compras' && (
            <SubCompras 
                requests={purchaseRequests} 
                suppliers={suppliers} 
                onRefresh={loadGlobalSupplyData}
            />
        )}

        {/* CONTEÚDO: MATERIAIS */}
        {activeTab === 'materiais' && (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-4">
                {estoqueFiltrado.length === 0 && (
                    <div className="col-span-full bg-white dark:bg-[#162032] border border-dashed border-slate-300 dark:border-slate-700 rounded-[2rem] p-12 text-center">
                        <Package className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48}/>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Nenhum material cadastrado.</p>
                    </div>
                )}
                {estoqueFiltrado.map((item:any) => (
                    <div key={item.id} className={`bg-white dark:bg-[#162032] p-8 rounded-[2.5rem] border-2 transition-all hover:-translate-y-1 hover:shadow-2xl group flex flex-col justify-between ${item.quantidadeAtual < item.estoqueMinimo ? 'border-red-100 dark:border-red-900/30 shadow-red-500/5' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div>
                            <div className="flex justify-between items-start mb-6 gap-2">
                                <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter leading-none break-words">{item.material}</h3>
                                <div className="flex-shrink-0">
                                    {item.quantidadeAtual < item.estoqueMinimo ? (
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 animate-pulse" title="Estoque Crítico"><AlertTriangle size={14}/></span>
                                    ) : (
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500" title="Estoque Estável"><CheckCircle2 size={14}/></span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-end gap-2 mb-8">
                                <span className="font-black text-6xl italic leading-none text-slate-900 dark:text-white">{item.quantidadeAtual}</span>
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1.5">{item.unidade}</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-4 mt-auto">
                            <button onClick={() => openModal(item, 'material_entrada')} title="Registrar Entrada" className="flex-1 bg-slate-50 hover:bg-emerald-500 dark:bg-slate-900 dark:hover:bg-emerald-500 text-slate-600 hover:text-white dark:text-slate-400 dark:hover:text-white py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"><Plus size={16}/> Entrada</button>
                            <button onClick={() => openModal(item, 'material_saida')} title="Registrar Saída" className="flex-1 bg-slate-50 hover:bg-orange-500 dark:bg-slate-900 dark:hover:bg-orange-500 text-slate-600 hover:text-white dark:text-slate-400 dark:hover:text-white py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black flex items-center justify-center gap-2 transition-all group-hover:shadow-lg"><Minus size={16}/> Saída</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* TASK 6: ÚLTIMOS CONSUMOS (Sempre visível abaixo do estoque) */}
            <div className="mt-8 bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111827] flex items-center justify-between">
                    <h3 className="font-black text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} className="text-orange-500"/> Últimos Consumos no Canteiro</h3>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded-full uppercase">Rastreabilidade Total</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Insumo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Local de Aplicação</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {(!proj.consumos || proj.consumos.length === 0) ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold italic">Nenhum consumo registrado nesta obra.</td></tr>
                            ) : proj.consumos.map((c: any) => (
                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                    <td className="px-6 py-4 text-sm font-black text-slate-700 dark:text-slate-200">
                                        {c.inventoryItem?.materialName || 'Material'}
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm font-black text-orange-600">-{c.quantityUsed}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-500 italic">"{c.appliedAt || '-'}"</td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-500">{c.responsible || '-'}</td>
                                    <td className="px-6 py-4 text-right text-xs font-mono text-slate-400">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
        )}

        {/* CONTEÚDO: FERRAMENTAS */}
        {activeTab === 'ferramentas' && (
            <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">Equipamento</th>
                            <th className="px-6 py-4">Patrimônio</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Responsável</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {ferramentasFiltradas.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma ferramenta cadastrada.</td></tr>}
                        {ferramentasFiltradas.map((ferr:any) => (
                            <tr key={ferr.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 dark:text-white">{ferr.nome}</div>
                                    <div className="text-xs text-slate-400">{ferr.marca}</div>
                                </td>
                                <td className="px-6 py-4"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{ferr.patrimonio || '-'}</span></td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${ferr.status === 'Disponível' ? 'bg-green-100 text-green-700' : ferr.status === 'Manutenção' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {ferr.status === 'Disponível' ? <CheckCircle2 size={12}/> : ferr.status === 'Manutenção' ? <AlertTriangle size={12}/> : <User size={12}/>}
                                        {ferr.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ferr.responsavel || '-'}</span>
                                        {ferr.dataMov && <span className="text-[10px] text-slate-400 flex items-center gap-1"><History size={10}/> {ferr.dataMov}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {ferr.status === 'Disponível' ? (
                                        <button onClick={() => openModal(ferr, 'ferramenta_emp')} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition-all">Emprestar</button>
                                    ) : ferr.status === 'Em uso' ? (
                                        <button onClick={() => openModal(ferr, 'ferramenta_dev')} className="border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ml-auto transition-all"><RefreshCw size={14}/> Devolver</button>
                                    ) : (
                                        <span className="text-xs text-orange-500 font-bold">Em Manutenção</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* CONTEÚDO: HISTÓRICO LEGADO */}
        {activeTab === 'historico' && (
            <div className="space-y-6">
                <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#111827]">
                        <h3 className="font-bold text-sm text-slate-500 uppercase">Logs de Movimentação Geral</h3>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {historico.length === 0 && <p className="p-8 text-center text-slate-500">Nenhum log registrado.</p>}
                        {historico.map((h: any, i:number) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${h.tipo === 'entrada' || h.tipo === 'devolucao' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {h.tipo === 'entrada' ? <ArrowDown size={16}/> : h.tipo === 'saida' ? <ArrowUp size={16}/> : h.tipo === 'emprestimo' ? <User size={16}/> : <RefreshCw size={16}/>}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{h.item} <span className="font-normal text-slate-500">({h.quantidade})</span></p>
                                        <p className="text-xs text-slate-400 capitalize">{h.tipo} • Responsável: {h.responsavel}</p>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{h.data}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

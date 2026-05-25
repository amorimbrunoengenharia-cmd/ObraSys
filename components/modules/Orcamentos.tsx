"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '../AuthContext';
import { 
  Plus, Search, FileText, Calculator, Layers, Database, 
  Trash2, Edit, ChevronRight, ChevronDown, Check, X,
  ArrowLeft, Download, Filter, MoreVertical, Building2, LogOut,
  TrendingUp, DollarSign, Briefcase, RefreshCw, History, Sparkles, Bot, Send
} from 'lucide-react';
import { 
  createEstimate, addStage, addItemToStage, searchReferenceCompositions,
  deleteEstimateItem, deleteEstimateStage, importReferenceBatch, deleteEstimate,
  syncLocalSinapiFiles, getReferenceDates, createRevision, getRevisions, restoreRevision, deleteRevision
} from '../../app/actions/estimate';
import { askAICenter } from '../../app/actions/ai';
import NotificationBell from '../NotificationBell';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ComposedChart, Line } from 'recharts';

export default function Orcamentos({ initialEstimates, projects, userRole }: { initialEstimates: any[], projects: any[], userRole?: string }) {
  const router = useRouter();
    const { user, logout } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const estimateId = searchParams.get('id');

  const [view, setView] = useState<'list' | 'editor'>(estimateId ? 'editor' : 'list');
  const [selectedEstimate, setSelectedEstimate] = useState<any>(null);

  const isReadOnly = ['Gerente de Obras', 'Coordenador de Obras', 'Engenheiro', 'Engenheiro Residente'].includes(userRole || '');

  useEffect(() => {
    if (estimateId) {
      const est = initialEstimates.find(e => e.id === estimateId);
      if (est) {
        setSelectedEstimate(est);
        setView('editor');
      } else {
        setView('list');
      }
    } else {
      setView('list');
      setSelectedEstimate(null);
    }
  }, [estimateId, initialEstimates]);

  const openEditor = (est: any) => {
    const params = new URLSearchParams(searchParams);
    params.set('id', est.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeEditor = () => {
    router.push(pathname);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newEstimateName, setNewEstimateName] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingRef, setIsSearchingRef] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    const loadDates = async () => {
      const dates = await getReferenceDates();
      setAvailableDates(dates as string[]);
      if (dates.length > 0 && !filterDate) {
        setFilterDate(dates[0] || ''); // Seleciona a mais recente por padrão
      }
    };
    if (isRefModalOpen) loadDates();
  }, [isRefModalOpen]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [filterDb, setFilterDb] = useState('CDHU');
  const [filterState, setFilterState] = useState('SP');
  const [isAddingStage, setIsAddingStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCreateEstimate = async () => {
    if (!newEstimateName) return;
    const res = await createEstimate(selectedProject ? parseInt(selectedProject) : null, newEstimateName);
    if (res.success) {
      setIsCreating(false);
      setNewEstimateName('');
      router.refresh();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const handleDeleteEstimate = async (id: string) => {
    if (confirm('Deseja realmente excluir este ORÇAMENTO completo? Esta ação é irreversível.')) {
      const res = await deleteEstimate(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Erro ao excluir orçamento');
      }
    }
  };

  const handleAddStage = async () => {
    if (!newStageName) return;
    const res = await addStage(selectedEstimate.id, newStageName);
    if (res.success) {
      setIsAddingStage(false);
      setNewStageName('');
      router.refresh();
    }
  };

  const handleMagicSearch = async () => {
    if (!searchQuery) return;
    setIsAiSearching(true);
    setSearchResults([]);
    const res = await askAICenter(searchQuery, selectedEstimate?.name);
    if (res.success) {
      setSearchResults(res.items || []);
    } else {
      alert('Erro na busca IA: ' + res.error);
    }
    setIsAiSearching(false);
  };

  const handleSearchRef = async () => {
    if (isSearchingRef) return;
    setIsSearchingRef(true);
    try {
      const results = await searchReferenceCompositions(searchQuery, filterDb, filterState, filterDate);
      setSearchResults(results);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearchingRef(false);
    }
  };

  useEffect(() => {
    if (isRefModalOpen) {
      handleSearchRef();
    }
  }, [isRefModalOpen, filterDb, filterState, filterDate, searchQuery]);

  const handleAddRefToBudget = async (ref: any) => {
    if (!selectedStageId) return;
    
    // Calcula o preço baseado nos insumos caso o preço principal esteja zerado
    const calculatedPrice = ref.resources?.reduce((acc: number, r: any) => acc + (r.coefficient * (r.defaultPrice || 0)), 0) || 0;
    const finalUnitPrice = ref.unitPrice > 0 ? ref.unitPrice : calculatedPrice;

    const res = await addItemToStage(selectedStageId, {
      description: ref.description,
      unit: ref.unit,
      quantity: 1,
      unitPrice: finalUnitPrice,
      code: ref.code,
      resources: ref.resources || []
    });

    if (res.success) {
      setIsRefModalOpen(false);
      router.refresh();
    }
  };

  const [bdiConfig, setBdiConfig] = useState({
    admin: 5.0,
    risk: 1.0,
    financial: 1.5,
    profit: 8.0,
    taxes: 12.0
  });
  const [showBdiConfig, setShowBdiConfig] = useState(false);
  const [activeItemForCpu, setActiveItemForCpu] = useState<any>(null);

  const calculateBdiTotal = () => {
    const { admin, risk, financial, profit, taxes } = bdiConfig;
    // Simplificado: Soma das taxas
    return admin + risk + financial + profit + taxes;
  };

  const bdi = calculateBdiTotal();
  const getItemBdi = (item: any) => item.bdi !== null && item.bdi !== undefined ? item.bdi : bdi;
  const calculateWithBdi = (value: number, itemBdi?: number) => value * (1 + (itemBdi ?? bdi) / 100);

  const [viewMode, setViewMode] = useState<'wbs' | 'abc'>('wbs');

  const getConsolidatedResources = () => {
    const resources: any = {};
    let totalEstimateCost = 0;
    
    selectedEstimate.stages.forEach((stage: any) => {
      stage.items.forEach((item: any) => {
        item.resources?.forEach((res: any) => {
          const key = res.description;
          if (!resources[key]) {
            resources[key] = { ...res, totalQuantity: 0, totalAmount: 0 };
          }
          const cost = res.coefficient * item.quantity * res.unitPrice;
          resources[key].totalQuantity += res.coefficient * item.quantity;
          resources[key].totalAmount += cost;
          totalEstimateCost += cost;
        });
      });
    });
    
    const sorted = Object.values(resources).sort((a: any, b: any) => b.totalAmount - a.totalAmount);
    
    let cumulativeAmount = 0;
    
    return sorted.map((res: any) => {
      const impact = totalEstimateCost > 0 ? (res.totalAmount / totalEstimateCost) * 100 : 0;
      cumulativeAmount += res.totalAmount;
      const cumulativeImpact = totalEstimateCost > 0 ? (cumulativeAmount / totalEstimateCost) * 100 : 0;
      
      let abcClass = 'C';
      if (cumulativeImpact <= 80) abcClass = 'A';
      else if (cumulativeImpact <= 95) abcClass = 'B';
      
      return {
        ...res,
        impact,
        cumulativeImpact,
        abcClass
      };
    });
  };

   const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({});

   const toggleResource = (id: string) => {
      setExpandedResources(prev => ({ ...prev, [id]: !prev[id] }));
   };

   const renderResourceRows = (resources: any[], depth = 0) => {
      return resources.map((res: any) => (
         <React.Fragment key={res.id}>
            <tr className={`text-sm ${depth > 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
               <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                     {depth > 0 && <div className="w-4 h-px bg-slate-300 dark:bg-slate-600"></div>}
                     <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${res.type === 'MATERIAL' ? 'bg-blue-100 text-blue-700' : res.type === 'MÃO DE OBRA' ? 'bg-orange-100 text-orange-700' : res.type === 'COMPOSIÇÃO' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}`}>
                        {res.type}
                     </span>
                  </div>
               </td>
               <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {res.description}
                  {res.type === 'COMPOSIÇÃO' && (
                     <button 
                        onClick={() => toggleResource(res.id)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                     >
                        {expandedResources[res.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                     </button>
                  )}
               </td>
               <td className="px-6 py-4 text-center text-slate-500">{res.unit}</td>
               <td className="px-6 py-4 text-center font-black">{res.coefficient}</td>
               <td className="px-6 py-4 text-right text-slate-500">{formatter.format(res.unitPrice)}</td>
               <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white">{formatter.format(res.coefficient * res.unitPrice)}</td>
            </tr>
            {res.type === 'COMPOSIÇÃO' && expandedResources[res.id] && res.linkedComposition?.resources && (
               renderResourceRows(res.linkedComposition.resources, depth + 1)
            )}
         </React.Fragment>
      ));
   };

   const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
   const [activeItemForTask, setActiveItemForTask] = useState<any>(null);

   const handleLinkTask = async (taskId: number) => {
      if (!activeItemForTask) return;
      // In real scenario, call linkItemToTask(activeItemForTask.id, taskId)
      alert(`Item vinculado à tarefa ID: ${taskId}`);
      setIsTaskModalOpen(false);
   };

   const handleDeleteItem = async (itemId: string) => {
      console.log('handleDeleteItem called for:', itemId);
      if (!window.confirm('Tem certeza que deseja excluir este item?')) return;
      
      const res = await deleteEstimateItem(itemId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Erro ao excluir item');
      }
   };

   const handleDeleteStage = async (stageId: string) => {
      if (!window.confirm('Tem certeza que deseja excluir esta ETAPA e todos os seus itens?')) return;
      
      const res = await deleteEstimateStage(stageId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Erro ao excluir etapa');
      }
   };

   const handleExportExcel = () => {
      try {
         const XLSX = require('xlsx');
         const data: any[] = [];
         
         selectedEstimate.stages.forEach((stage: any) => {
            // Linha da Etapa
            data.push({
               'Item': stage.name.split(' ')[0] || '',
               'Descrição': stage.name,
               'Unid': '',
               'Qtd': '',
               'Preço Unit (Custo)': '',
               'Preço Total (Custo)': stage.items.reduce((acc: number, it: any) => acc + it.totalPrice, 0),
               'BDI (%)': '',
               'Preço Unit (Venda)': '',
               'Preço Total (Venda)': stage.items.reduce((acc: number, it: any) => acc + calculateWithBdi(it.totalPrice, it.bdi), 0),
            });

            stage.items.forEach((item: any) => {
               data.push({
                  'Item': item.code || '',
                  'Descrição': item.description,
                  'Unid': item.unit,
                  'Qtd': item.quantity,
                  'Preço Unit (Custo)': item.unitPrice,
                  'Preço Total (Custo)': item.totalPrice,
                  'BDI (%)': getItemBdi(item),
                  'Preço Unit (Venda)': calculateWithBdi(item.unitPrice, item.bdi),
                  'Preço Total (Venda)': calculateWithBdi(item.totalPrice, item.bdi),
               });
            });
         });

         const ws = XLSX.utils.json_to_sheet(data);
         const wb = XLSX.utils.book_new();
         XLSX.utils.book_append_sheet(wb, ws, "Orçamento");
         XLSX.writeFile(wb, `Orcamento_${selectedEstimate.name}.xlsx`);
      } catch (error) {
         console.error('Erro ao exportar Excel:', error);
         alert('Erro ao exportar Excel. Verifique se a biblioteca xlsx está instalada.');
      }
   };

   const handleImportExcel = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsSearchingRef(true);

      try {
         const formData = new FormData();
         formData.append('file', file);
         formData.append('state', filterState || 'SP');
         formData.append('date', filterDate || '');

         const response = await fetch('/api/import/excel', {
            method: 'POST',
            body: formData,
         });

         const res = await response.json();
         
         if (res.success) {
            alert(`${res.isSinapi ? `SINAPI ${res.date} Detectada! ` : ''}Sucesso: ${res.count} itens processados.`);
         } else {
            alert('Erro ao importar: ' + (res.error || 'Erro desconhecido'));
         }
      } catch (error) {
         console.error('Erro no import:', error);
         alert('Erro ao enviar arquivo para o servidor.');
      } finally {
         setIsSearchingRef(false);
         // Limpar input
         e.target.value = '';
      }
   };

   const [isImportingBudget, setIsImportingBudget] = useState(false);

   const handleImportBudgetExcel = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setIsImportingBudget(true);

      try {
         const formData = new FormData();
         formData.append('file', file);
         formData.append('estimateId', selectedEstimate.id);

         const response = await fetch('/api/import/budget', {
            method: 'POST',
            body: formData,
         });

         const res = await response.json();
         
         if (res.success) {
            alert(`Sucesso! ${res.stagesAdded} etapas e ${res.itemsAdded} itens importados.`);
            window.location.reload();
         } else {
            alert('Erro ao importar orçamento: ' + (res.error || 'Erro desconhecido'));
         }
      } catch (error) {
         console.error('Erro no import:', error);
         alert('Erro ao enviar arquivo para o servidor.');
      } finally {
         setIsImportingBudget(false);
         e.target.value = '';
      }
   };

   const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);
   const [revisions, setRevisions] = useState<any[]>([]);
   const [isAiCenterOpen, setIsAiCenterOpen] = useState(false);
   const [aiPrompt, setAiPrompt] = useState('');
   const [aiChatHistory, setAiChatHistory] = useState<any[]>([{
      role: 'ai',
      text: 'Olá! Sou a sua IA de Engenharia de Custos. Precisa de ajuda com alguma composição SINAPI?'
   }]);
   const [isAiLoading, setIsAiLoading] = useState(false);
   const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
   const [newRevisionName, setNewRevisionName] = useState('');
   const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
   const [customItemData, setCustomItemData] = useState({ description: '', unit: '', quantity: 1, unitPrice: 0 });

   const handleAddCustomItem = async () => {
      if (!selectedStageId || !customItemData.description) return;
      
      const totalPrice = customItemData.quantity * customItemData.unitPrice;
      
      const res = await addItemToStage(selectedStageId, {
         code: 'PRÓPRIO',
         description: customItemData.description,
         unit: customItemData.unit,
         quantity: customItemData.quantity,
         unitPrice: customItemData.unitPrice,
         resources: [{
            description: customItemData.description,
            unit: customItemData.unit,
            type: 'MATERIAL',
            coefficient: 1,
            unitPrice: customItemData.unitPrice,
            totalPrice: totalPrice
         }]
      });

      if (res.success) {
         setIsCustomItemModalOpen(false);
         setCustomItemData({ description: '', unit: '', quantity: 1, unitPrice: 0 });
         router.refresh();
      } else {
         alert('Erro ao adicionar item próprio: ' + res.error);
      }
   };

      const handleAskAICenter = async () => {
      if (!aiPrompt.trim()) return;
      const newHistory = [...aiChatHistory, { role: 'user', text: aiPrompt }];
      setAiChatHistory(newHistory);
      setAiPrompt('');
      setIsAiLoading(true);

      const contextStr = selectedEstimate ? `Orçamento Atual: ${selectedEstimate.name}` : undefined;
      const res = await askAICenter(aiPrompt, contextStr);
      
      setIsAiLoading(false);
      if (res.success) {
         setAiChatHistory([...newHistory, { role: 'ai', text: res.message, items: res.items }]);
      } else {
         setAiChatHistory([...newHistory, { role: 'ai', text: 'Erro ao conectar: ' + res.error }]);
      }
   };

   const handleLoadRevisions = async () => {
      setIsLoadingRevisions(true);
      const res = await getRevisions(selectedEstimate.id);
      if (res.success) {
         setRevisions(res.revisions || []);
      } else {
         alert('Erro ao carregar revisão: ' + (res.error || 'Erro Desconhecido'));
      }
      setIsLoadingRevisions(false);
   };

   const handleCreateRevision = async () => {
      if (!newRevisionName) return;
      setIsLoadingRevisions(true);
      const res = await createRevision(selectedEstimate.id, newRevisionName);
      if (res.success) {
         setNewRevisionName('');
         handleLoadRevisions();
      } else {
         alert('Erro ao criar revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   const handleRestoreRevision = async (revId: string) => {
      if (!confirm('ATENÇÃO: Restaurar esta revisão apagará todas as modificações não salvas do orçamento atual. Deseja continuar?')) return;
      
      setIsLoadingRevisions(true);
      const res = await restoreRevision(revId);
      if (res.success) {
         alert('Revisão restaurada com sucesso!');
         window.location.reload();
      } else {
         alert('Erro ao restaurar revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   const handleDeleteRevision = async (revId: string) => {
      if (!confirm('Deseja realmente excluir esta versão do histórico?')) return;
      
      setIsLoadingRevisions(true);
      const res = await deleteRevision(revId);
      if (res.success) {
         setRevisions(revisions.filter((r: any) => r.id !== revId));
         setIsLoadingRevisions(false);
      } else {
         alert('Erro ao excluir revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   if (view === 'editor' && selectedEstimate) {
    const consolidated = getConsolidatedResources();
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col">
        {/* Editor Header */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            aside { display: none !important; }
            header { display: none !important; }
            .print-only { display: block !important; }
            body { background: white !important; color: black !important; }
            .bg-slate-50 { background: white !important; }
            .dark { color-scheme: light !important; }
            .dark * { color: black !important; border-color: #e2e8f0 !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            th, td { border: 1px solid #e2e8f0 !important; padding: 8px !important; }
            .sticky { position: static !important; }
          }
        `}} />
        <header className="h-16 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-40 no-print">
          <div className="flex items-center gap-4">
            <button onClick={closeEditor} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" aria-label="Voltar para lista">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold leading-none">{selectedEstimate.name}</h1>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                {selectedEstimate.project?.name || 'Projeto não vinculado'}
              </p>
            </div>
          </div>
          
          {/* Navigation Mode */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
             <button 
               onClick={() => setViewMode('wbs')}
               className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'wbs' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
             >
               Planilha (EAP)
             </button>
             <button 
               onClick={() => setViewMode('abc')}
               className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${viewMode === 'abc' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
             >
               Consolidado (ABC)
             </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <button 
                onClick={() => setShowBdiConfig(!showBdiConfig)}
                className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 px-3 py-1.5 rounded-xl hover:bg-amber-100 transition-all"
              >
                <span className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase">BDI: {bdi.toFixed(2)}%</span>
                <ChevronDown size={14} className={`text-amber-500 transition-transform ${showBdiConfig ? 'rotate-180' : ''}`} />
              </button>

              {showBdiConfig && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#162032] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-5 z-50">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Composição do BDI</h4>
                  <div className="space-y-3">
                    {[
                      { label: 'Adm. Central', key: 'admin' },
                      { label: 'Risco/Seguro', key: 'risk' },
                      { label: 'Custo Financ.', key: 'financial' },
                      { label: 'Lucro Líquido', key: 'profit' },
                      { label: 'Impostos', key: 'taxes' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">{item.label}</span>
                        <div className="flex items-center">
                          <input 
                            type="number" 
                            aria-label={item.label}
                            value={bdiConfig[item.key as keyof typeof bdiConfig]} 
                            onChange={(e) => setBdiConfig({...bdiConfig, [item.key]: parseFloat(e.target.value) || 0})}
                            className="w-12 bg-slate-50 dark:bg-slate-800 border-none text-right text-xs font-black p-1 rounded"
                          />
                          <span className="text-[10px] ml-1 text-slate-400">%</span>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                      <span className="text-xs font-black text-slate-800 dark:text-white uppercase">Total BDI</span>
                      <span className="text-xs font-black text-amber-600 uppercase">{bdi.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-right mr-4 border-l border-slate-200 dark:border-slate-700 pl-6">
              <p className="text-[10px] text-slate-500 font-black uppercase">Venda c/ BDI</p>
              <p className="text-xl font-black text-emerald-600">{formatter.format(calculateWithBdi(selectedEstimate.totalAmount))}</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={() => { handleLoadRevisions(); setIsRevisionsModalOpen(true); }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-colors"
                >
                  <History size={14} /> HISTÓRICO
                </button>
                <button 
                  onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
              >
                <Download size={14} /> PDF
              </button>
              <button 
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2"
              >
                <Briefcase size={14} /> EXCEL
              </button>
              <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 cursor-pointer text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-colors">
                <Download size={14} /> IMPORTAR {isImportingBudget ? '...' : ''}
                <input type="file" className="hidden" onChange={handleImportBudgetExcel} accept=".xlsx, .xls" disabled={isImportingBudget} />
              </label>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: Estrutura de Etapas (WBS) */}
          <aside className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Estrutura (EAP)</h3>
              {!isReadOnly && (
                <button 
                  onClick={() => setIsAddingStage(!isAddingStage)}
                  className="p-1.5 bg-blue-500 text-white rounded-lg active:scale-95 transition-transform"
                  aria-label="Adicionar nova etapa"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>

            {isAddingStage && (
              <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <input
                  autoFocus
                  placeholder="Nome da etapa..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddStage()}
                  className="w-full text-sm bg-transparent outline-none font-bold text-slate-700 dark:text-white mb-2"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddStage} className="flex-1 text-[9px] font-black bg-blue-600 text-white py-1.5 rounded-lg">ADICIONAR</button>
                  <button onClick={() => setIsAddingStage(false)} className="flex-1 text-[9px] font-black bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg">CANCELAR</button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {selectedEstimate.stages.map((stage: any) => (
                <div 
                  key={stage.id} 
                  onClick={() => setSelectedStageId(stage.id)}
                  className={`w-full group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer ${selectedStageId === stage.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'} border`}
                >
                  <div className="flex items-center gap-3">
                    <Layers size={16} className={selectedStageId === stage.id ? 'text-blue-500' : 'text-slate-400'} />
                    <span className={`text-sm font-bold ${selectedStageId === stage.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isReadOnly && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }}
                        className="p-1 hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Excluir etapa"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <span className="text-[10px] font-black text-slate-400">{stage.items.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-[#0B1121]">
            {viewMode === 'abc' ? (() => {
              const totalA = consolidated.filter((r: any) => r.abcClass === 'A').reduce((acc: number, r: any) => acc + r.totalAmount, 0);
              const totalB = consolidated.filter((r: any) => r.abcClass === 'B').reduce((acc: number, r: any) => acc + r.totalAmount, 0);
              const totalC = consolidated.filter((r: any) => r.abcClass === 'C').reduce((acc: number, r: any) => acc + r.totalAmount, 0);
              
              const chartData = consolidated.map((r: any, i: number) => ({
                name: r.description.length > 15 ? r.description.substring(0, 15) + '...' : r.description,
                fullDesc: r.description,
                valor: r.totalAmount,
                acumulado: r.cumulativeImpact
              }));

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                      Dashboard Curva ABC
                    </h2>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Classe A (80%)</p>
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-500">{formatter.format(totalA)}</p>
                      <p className="text-xs text-emerald-600/70 mt-1">{consolidated.filter((r: any) => r.abcClass === 'A').length} itens de maior impacto</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-2">Classe B (15%)</p>
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-500">{formatter.format(totalB)}</p>
                      <p className="text-xs text-blue-600/70 mt-1">{consolidated.filter((r: any) => r.abcClass === 'B').length} itens de impacto intermediário</p>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Classe C (5%)</p>
                      <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{formatter.format(totalC)}</p>
                      <p className="text-xs text-slate-500 mt-1">{consolidated.filter((r: any) => r.abcClass === 'C').length} itens de menor impacto</p>
                    </div>
                  </div>

                  {/* Pareto Chart */}
                  <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-6">Gráfico de Pareto</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={60} />
                          <YAxis yAxisId="left" tickFormatter={(v) => `R$ ${v > 1000 ? (v/1000).toFixed(1)+'k' : v}`} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any, name: string) => name === 'valor' ? [formatter.format(value), 'Custo Total'] : [`${value.toFixed(2)}%`, 'Acumulado']}
                            labelFormatter={(label: any, payload: any) => payload[0]?.payload?.fullDesc || label}
                          />
                          <Bar yAxisId="left" dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="acumulado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Classe</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Tipo</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Insumo</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Quant. Total</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Preço Unit.</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Acumulado</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">% ABC</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {consolidated.map((res: any, idx) => {
                          const isA = res.abcClass === 'A';
                          const isB = res.abcClass === 'B';
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${isA ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : isB ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                  {res.abcClass}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${res.type === 'MATERIAL' ? 'bg-indigo-100 text-indigo-700' : res.type === 'MÃO DE OBRA' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                                  {res.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">{res.description}</td>
                              <td className="px-6 py-4 text-center font-black">{res.totalQuantity.toFixed(2)} <span className="text-xs font-medium text-slate-500">{res.unit}</span></td>
                              <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">{formatter.format(res.unitPrice)}</td>
                              <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white">{formatter.format(res.totalAmount)}</td>
                              <td className="px-6 py-4 text-center">
                                 <div className="flex flex-col gap-1 items-end">
                                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">{res.impact.toFixed(2)}%</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Acum. {res.cumulativeImpact.toFixed(2)}%</span>
                                 </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })() : selectedStageId ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    {selectedEstimate.stages.find((s: any) => s.id === selectedStageId)?.name}
                  </h2>
                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsRefModalOpen(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                      >
                        <Database size={14} /> BUSCAR CDHU / REF
                      </button>
                      <button onClick={() => setIsCustomItemModalOpen(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={14} /> ITEM PRÓPRIO
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Código</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Descrição do Serviço</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Unid</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Quant</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Custo Unit.</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Venda Unit.</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Total Venda</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedEstimate.stages.find((s: any) => s.id === selectedStageId)?.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500">{item.code || 'PRÓPRIO'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => setActiveItemForCpu(item)}
                              className="text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-blue-500 transition-colors text-left"
                            >
                              {item.description}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{item.unit}</td>
                          <td className="px-6 py-4 text-center">
                            {isReadOnly ? (
                              <span className="text-sm font-black text-slate-700 dark:text-slate-300">{item.quantity}</span>
                            ) : (
                              <input 
                                type="number" 
                                defaultValue={item.quantity}
                                aria-label="Quantidade"
                                className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-center text-sm font-black p-1 focus:border-blue-500 outline-none"
                              />
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-slate-400">{formatter.format(item.unitPrice)}</td>
                          <td className="px-6 py-4 text-right text-sm font-black text-blue-600 flex flex-col items-end">
                            {formatter.format(calculateWithBdi(item.unitPrice, item.bdi))}
                            {item.bdi !== null && item.bdi !== undefined && (
                              <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded mt-0.5">BDI {item.bdi}%</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-black text-slate-900 dark:text-white">{formatter.format(calculateWithBdi(item.totalPrice, item.bdi))}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => { setActiveItemForTask(item); setIsTaskModalOpen(true); }} 
                                className="p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 rounded-lg" 
                                title="Vincular ao Cronograma"
                              >
                                <Layers size={14}/>
                              </button>
                              <button onClick={() => setActiveItemForCpu(item)} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg" title="Ver Composição (CPU)"><Calculator size={14}/></button>
                              {!isReadOnly && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg" title="Excluir Item"><Trash2 size={14}/></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!selectedEstimate.stages.find((s: any) => s.id === selectedStageId)?.items.length) && (
                    <div className="p-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calculator size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold">Esta etapa está vazia. Adicione serviços CDHU ou composições próprias.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                  <Layers size={40} className="text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-400">Selecione uma etapa na estrutura à esquerda</h2>
                <p className="text-sm text-slate-500 mt-2">Para começar a orçar, escolha ou crie uma etapa da obra.</p>
              </div>
            )}
          </main>
        </div>

        {/* CPU Detailed Modal */}
        {activeItemForCpu && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setActiveItemForCpu(null)}></div>
            <div className="relative bg-white dark:bg-[#162032] w-full max-w-5xl max-h-[90vh] rounded-[40px] border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
               <div className="p-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase">Composição Unitária (CPU)</span>
                       <span className="text-slate-400 text-[10px] font-bold">{activeItemForCpu.code}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{activeItemForCpu.description}</h2>
                  </div>
                  <button onClick={() => setActiveItemForCpu(null)} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={24}/></button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-8">
                  <div className="grid grid-cols-3 gap-6 mb-8">
                     <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Custo Direto</p>
                        <p className="text-2xl font-black text-slate-700 dark:text-slate-200">{formatter.format(activeItemForCpu.unitPrice)}</p>
                     </div>
                     <div className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-3xl border border-amber-100 dark:border-amber-800/30">
                        <p className="text-[10px] font-black text-amber-600 uppercase mb-1">BDI ({bdi}%)</p>
                        <p className="text-2xl font-black text-amber-700 dark:text-amber-500">{formatter.format(activeItemForCpu.unitPrice * (bdi/100))}</p>
                     </div>
                     <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Preço de Venda</p>
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{formatter.format(calculateWithBdi(activeItemForCpu.unitPrice))}</p>
                     </div>
                  </div>

                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[3px] mb-4">Detalhamento de Insumos</h3>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400">
                           <tr>
                              <th className="px-6 py-4">Tipo</th>
                              <th className="px-6 py-4">Insumo</th>
                              <th className="px-6 py-4 text-center">Unid</th>
                              <th className="px-6 py-4 text-center">Coeficiente</th>
                              <th className="px-6 py-4 text-right">Preço Unit.</th>
                              <th className="px-6 py-4 text-right">Total</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                           {renderResourceRows(activeItemForCpu.resources || [])}
                        </tbody>
                     </table>
                  </div>
               </div>
               
               <div className="p-8 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex justify-end gap-3">
                  <button onClick={() => setActiveItemForCpu(null)} className="px-8 py-3 text-slate-500 font-black text-xs uppercase">Fechar</button>
                  {!isReadOnly && (
                    <button className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-500/20 active:scale-95 transition-all">Salvar Alterações</button>
                  )}
               </div>
            </div>
          </div>
        )}

        {isRefModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsRefModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-[#162032] w-full max-w-4xl max-h-[80vh] rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Bancos de Referência</h2>
                  <div className="flex gap-4 mt-2">
                    <select 
                      value={filterDb} 
                      onChange={(e) => setFilterDb(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase px-2 py-1 rounded-lg outline-none border-none"
                    >
                      <option>CDHU</option>
                      <option>SINAPI</option>
                      <option>PROPRIO</option>
                    </select>
                    <select 
                      value={filterState} 
                      onChange={(e) => setFilterState(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase px-2 py-1 rounded-lg outline-none border-none"
                    >
                      <option>SP</option>
                      <option>RJ</option>
                      <option>MG</option>
                      <option>PR</option>
                    </select>
                    <select 
                      value={filterDate} 
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase px-2 py-1 rounded-lg outline-none border-none"
                    >
                      <option value="">DATA (AUTO)</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>{date}</option>
                      ))}
                    </select>
                    {!isReadOnly && (
                      <>
                        <label className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase px-3 py-1 rounded-lg cursor-pointer flex items-center gap-1 shadow-sm transition-colors" title="Importar arquivo manualmente">
                          <Download size={10} /> Importar Excel
                          <input type="file" className="hidden" onChange={handleImportExcel} accept=".xlsx, .xls" />
                        </label>
                        <button 
                          onClick={async () => {
                            setIsSearchingRef(true);
                            try {
                              const res = await syncLocalSinapiFiles(filterState || 'SP');
                              if (res.success) {
                                alert(`Sincronização Local Concluída! ${res.count} itens importados (${res.date}).`);
                              }
                            } catch (e) {
                              console.error(e);
                              alert("Erro na sincronização local.");
                            } finally {
                              setIsSearchingRef(false);
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-[9px] font-black uppercase px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-colors" title="Sincronizar arquivos locais"
                        >
                          <RefreshCw size={10} className={isSearchingRef ? 'animate-spin' : ''} /> Sincronizar Local
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => setIsRefModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/30">
                <div className="flex gap-4">
                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center px-4 shadow-sm">
                    <Search size={18} className="text-slate-400" />
                    <input 
                      placeholder="Ex: Concreto fck=25, Alvenaria, Pintura..."
                      className="flex-1 bg-transparent p-4 text-sm font-bold"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchRef()}
                    />
                  </div>
                  <button onClick={handleSearchRef} className="px-6 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center">
                    BUSCAR
                  </button>
                  <button onClick={handleMagicSearch} disabled={isAiSearching} className="px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isAiSearching ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    BUSCA IA
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {(isSearchingRef || isAiSearching) ? (
                  <div className="h-40 flex items-center justify-center"><RefreshCw size={24} className="animate-spin text-blue-500" /></div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map((res: any) => (
                      <div key={res.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-2xl hover:border-emerald-500 transition-all flex items-center justify-between group">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{res.database} {res.code}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{res.unit}</span>
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-white">{res.description}</h4>
                        </div>
                        <div className="text-right mr-6">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Preço Ref.</p>
                          <p className="text-lg font-black text-emerald-600">
                            {formatter.format(res.unitPrice || (res.resources?.reduce((acc: number, r: any) => acc + (r.coefficient * (r.defaultPrice || 0)), 0)) || 0)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleAddRefToBudget(res)}
                          className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                    <Search size={32} className="mb-2 opacity-20" />
                    <p className="text-sm font-bold">Nenhum item encontrado com os filtros atuais</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Task Selection Modal */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsTaskModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-[#162032] w-full max-w-lg rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden">
               <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h2 className="text-xl font-bold">Vincular ao Cronograma</h2>
                  <button onClick={() => setIsTaskModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20}/></button>
               </div>
               <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                  <p className="text-xs text-slate-500 mb-4 font-medium">Selecione a atividade do cronograma que corresponde a este serviço para controle de avanço físico-financeiro.</p>
                  {selectedEstimate.project?.tasks?.map((task: any) => (
                    <button 
                      key={task.id} 
                      onClick={() => handleLinkTask(task.id)}
                      className="w-full text-left p-4 border border-slate-100 dark:border-slate-800 hover:border-blue-500 rounded-2xl transition-all group"
                    >
                      <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{task.wbs}</p>
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-500">{task.name}</h4>
                    </button>
                  ))}
                  {(!selectedEstimate.project?.tasks?.length) && (
                    <div className="text-center py-10 text-slate-400">
                      <Layers size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-bold">Nenhuma tarefa encontrada no cronograma deste projeto.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

      {/* Histórico de Versões Modal */}
      {isRevisionsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="text-indigo-500" />
                  Histórico de Versões (Snapshots)
                </h3>
                <p className="text-sm text-slate-500 mt-1">Salve versões deste orçamento para poder restaurar depois.</p>
              </div>
              <button onClick={() => setIsRevisionsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex gap-4 mb-6">
                <input 
                  type="text" 
                  value={newRevisionName}
                  onChange={e => setNewRevisionName(e.target.value)}
                  placeholder="Nome da nova versão (ex: Original v1.0)"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button 
                  onClick={handleCreateRevision}
                  disabled={isLoadingRevisions || !newRevisionName}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-xs uppercase transition-colors"
                >
                  SALVAR VERSÃO
                </button>
              </div>

              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Versões Salvas</h4>
              
              {isLoadingRevisions && revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">Nenhuma versão salva para este orçamento.</div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {revisions.map((rev) => (
                    <div key={rev.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex justify-between items-center hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
                      <div>
                        <h5 className="font-bold text-slate-800 dark:text-slate-200">{rev.name}</h5>
                        <p className="text-xs text-slate-500">{new Date(rev.createdAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleRestoreRevision(rev.id)}
                          disabled={isLoadingRevisions}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                        >
                          RESTAURAR
                        </button>
                        <button 
                          onClick={() => handleDeleteRevision(rev.id)}
                          disabled={isLoadingRevisions}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Excluir versão"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Próprio Modal */}
      {isCustomItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="text-blue-500" />
                  Novo Item Próprio
                </h3>
              </div>
              <button onClick={() => setIsCustomItemModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Item</label>
                <input 
                  type="text" 
                  value={customItemData.description}
                  onChange={e => setCustomItemData({...customItemData, description: e.target.value})}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  placeholder="Ex: Instalação de Ar Condicionado"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Unidade</label>
                  <input 
                    type="text" 
                    value={customItemData.unit}
                    onChange={e => setCustomItemData({...customItemData, unit: e.target.value})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                    placeholder="Ex: un"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    value={customItemData.quantity}
                    onChange={e => setCustomItemData({...customItemData, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Preço Unit. (R$)</label>
                  <input 
                    type="number" 
                    value={customItemData.unitPrice}
                    onChange={e => setCustomItemData({...customItemData, unitPrice: parseFloat(e.target.value) || 0})}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm font-medium outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleAddCustomItem}
                  disabled={!customItemData.description}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-xs uppercase transition-colors"
                >
                  ADICIONAR ITEM
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IA Center Floating Button */}
      {view === 'editor' && (
        <button 
          onClick={() => setIsAiCenterOpen(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95 transition-all z-40 group"
        >
          <Sparkles size={24} className="group-hover:animate-pulse" />
        </button>
      )}

      {/* IA Center Chat Modal */}
      {isAiCenterOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-end sm:justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-[#0B1121] w-full sm:w-[450px] h-[80vh] sm:rounded-3xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 transform transition-all">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 sm:rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">IA Center</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Assistente de Custos</p>
                </div>
              </div>
              <button onClick={() => setIsAiCenterOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-tl-sm'}`}>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    
                    {/* Render Item Cards if AI returned any */}
                    {msg.items && msg.items.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.items.map((item: any, i: number) => (
                          <div key={i} className="bg-white dark:bg-slate-700 p-2 rounded-xl border border-slate-200 dark:border-slate-600">
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">{item.database} {item.code}</span>
                              <span className="text-[9px] font-bold text-slate-500 uppercase">{item.unit}</span>
                            </div>
                            <p className="text-[10px] font-bold line-clamp-2 leading-tight mb-2 text-slate-800 dark:text-slate-200">{item.description}</p>
                            <button 
                              onClick={() => { setIsRefModalOpen(true); setSearchQuery(item.code); setIsAiCenterOpen(false); }}
                              className="w-full py-1.5 bg-slate-100 dark:bg-slate-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-black uppercase transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm p-4 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1121] sm:rounded-b-3xl">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 pr-2">
                <input 
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskAICenter()}
                  placeholder="Pergunte sobre um serviço..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 text-slate-800 dark:text-white placeholder:text-slate-400"
                />
                <button 
                  onClick={handleAskAICenter}
                  disabled={!aiPrompt.trim() || isAiLoading}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all active:scale-95"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] font-sans">
      <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-50 no-print">
        <div className="flex items-center gap-6">
          {userRole !== 'Orçamentista' && (
              <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <ArrowLeft size={20} />
              </Link>
            )}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-200/50 dark:border-indigo-800/50">
              <Calculator size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
                ORÇAMENTOS <span className="text-slate-300 dark:text-slate-600 font-light">|</span> <span className="text-indigo-600 uppercase">Engenharia</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] leading-none mt-1.5">Central de Custos & Orçamentação</p>
            </div>
          </div>
        </div>
                  <div className="flex items-center gap-4">
             {userRole === 'Orçamentista' && (
               <>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                  <Link href="/perfil" className="hidden sm:flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group">
                      <div className="text-right">
                          <p className="text-sm font-bold leading-none group-hover:text-indigo-500 transition-colors">{user?.name || 'Usuário'}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{user?.role || 'Cargo'}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-600 shadow-sm group-hover:border-indigo-500 transition-colors">
                          {user?.name?.charAt(0) || 'U'}
                      </div>
                  </Link>
               </>
             )}
             <NotificationBell />
             {userRole === 'Orçamentista' && (
               <button
                   onClick={() => {
                       logout();
                       router.push('/login');
                   }}
                   className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                   title="Sair"
               >
                   <LogOut size={18} />
               </button>
             )}
           {(!['Gerente de Obras', 'Coordenador de Obras', 'Engenheiro', 'Engenheiro Residente'].includes(userRole || '')) && (
             <button 
               onClick={() => setIsCreating(true)}
               className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black rounded-xl shadow-xl flex items-center gap-2 active:scale-95 transition-all"
             >
               <Plus size={16} /> NOVO ORÇAMENTO
             </button>
           )}
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-8">
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Orçamentos Ativos</span>
              <FileText size={16} className="text-blue-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{initialEstimates.length}</p>
          </div>
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Volume Orçado</span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{formatter.format(initialEstimates.reduce((a, b) => a + b.totalAmount, 0))}</p>
          </div>
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aguardando Aprovação</span>
              <DollarSign size={16} className="text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">{initialEstimates.filter(e => e.status === 'Rascunho').length}</p>
          </div>
          <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bancos Conectados</span>
              <Database size={16} className="text-violet-500" />
            </div>
            <p className="text-3xl font-black text-slate-800 dark:text-white">CDHU, SINAPI</p>
          </div>
        </div>

        {/* Budget List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {initialEstimates.map((est) => (
            <div key={est.id} className="bg-white dark:bg-[#162032] rounded-[32px] border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-blue-500 transition-all overflow-hidden group">
               <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                      <Calculator size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      {!isReadOnly && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteEstimate(est.id); }}
                          className="p-2 hover:bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                          title="Excluir Orçamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${est.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {est.status}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-1 text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">{est.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-6">
                    <Building2 size={14} />
                    <span className="font-bold">{est.project?.name || 'Sem vínculo'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Total</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{formatter.format(est.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Itens</p>
                      <p className="text-lg font-black text-slate-800 dark:text-white">{est.stages.reduce((a: number, b: any) => a + b.items.length, 0)}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => openEditor(est)}
                    className="w-full py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-600 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-black transition-all"
                  >
                    ABRIR EDITOR <ChevronRight size={16} />
                  </button>
               </div>
            </div>
          ))}

          {/* Empty State / Create Card */}
          {(!['Gerente de Obras', 'Coordenador de Obras', 'Engenheiro', 'Engenheiro Residente'].includes(userRole || '')) && (
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-dashed border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] p-8 flex flex-col items-center justify-center group hover:border-blue-500 transition-all"
            >
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <Plus size={24} />
              </div>
              <p className="text-sm font-bold text-slate-400 group-hover:text-blue-500 transition-colors">Criar Novo Orçamento</p>
            </button>
          )}
        </div>
      </main>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsCreating(false)}></div>
          <div className="relative bg-white dark:bg-[#162032] w-full max-w-lg rounded-[32px] p-8 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6">Novo Orçamento</h2>
            
            <div className="space-y-5">
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome do Orçamento</label>
                  <input 
                    placeholder="Ex: Orçamento Final Residencial"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-sm font-bold"
                    value={newEstimateName}
                    onChange={(e) => setNewEstimateName(e.target.value)}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Vincular Projeto (Opcional)</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-sm font-bold appearance-none"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                  >
                    <option value="">Nenhum vínculo</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
               </div>
            </div>

            <div className="flex gap-4 mt-10">
               <button onClick={() => setIsCreating(false)} className="flex-1 py-4 text-slate-500 font-black text-xs uppercase">Cancelar</button>
               <button onClick={handleCreateEstimate} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs uppercase active:scale-95 transition-all">
                 CRIAR ORÇAMENTO
               </button>
            </div>
          </div>
        </div>
      )}

      </div>
  );
}

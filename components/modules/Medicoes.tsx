"use client";
import React, { useState, useMemo } from 'react';
import { 
  FileText, DollarSign, Calculator, CheckCircle2, AlertCircle, Paperclip, 
  Printer, Search, ChevronDown, Building2, UserCheck, Scale, Plus, Save, 
  X, ArrowRight, ListChecks, History, ScrollText, Check, Trash2, 
  Image as ImageIcon, ShieldAlert, Package, TrendingUp, Lock, Unlock, 
  Upload, Eye, Sparkles, BarChart3, PieChart as PieIcon, FileSearch, 
  FileSpreadsheet, Download, ArrowLeft, Wand2, RefreshCw, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Modal } from '../Shared';
import { createContract, addContractItem, createMeasurement, addAdditive, deleteContract, deleteContractItem, updateContractItem } from '../../app/actions/measurements';
import { getSuppliers, getContacts } from '../../app/actions/finance';
import MeasurementPDF from './medicoes_components/MeasurementPDF';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Medicoes({ proj, onRefresh, onApprove }: any) {
  const [viewMode, setViewMode] = useState<'lista' | 'nova' | 'detalhe' | 'contrato_detalhe'>('lista');
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null);
  const [selectedBM, setSelectedBM] = useState<any>(null);
  const [contratoTab, setContratoTab] = useState('dashboard'); 
  const [printBM, setPrintBM] = useState<any>(null);
  
  // --- DADOS REAIS ---
  const contratos = proj?.contratos || [];
  const medicoes = proj?.medicoes || [];

  const selectedContrato = useMemo(() => contratos.find((c: any) => c.id === selectedContratoId), [contratos, selectedContratoId]);

  // --- ESTADOS DE MODAIS ---
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isAditivoModalOpen, setIsAditivoModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // --- ESTADOS FORMULÁRIOS ---
  const [newContract, setNewContract] = useState({ empresa: '', servico: '', valor: 0, retencao: 5 });
  const [newItem, setNewItem] = useState({ desc: '', unidade: 'un', qtd: 0, unitario: 0 });
  const [novaMedicao, setNovaMedicao] = useState<any>({ 
    ref: '',
    periodo: '',
    iss: 0,
    inss: 0,
    itens: [] 
  });
  const [novoAditivo, setNovoAditivo] = useState({ valor: 0, motivo: "" });
  const [importedCronogramaItems, setImportedCronogramaItems] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadSuppliers() {
      const sups = await getSuppliers();
      setAvailableSuppliers(sups);
    }
    loadSuppliers();
  }, []);

  const getContractTotals = (ct: any) => {
      const valorInicial = ct.valorInicial || 0;
      const aditivos = (ct.additives || []).reduce((acc: number, a: any) => acc + a.valor, 0);
      const valorTotal = valorInicial + aditivos;
      const medido = (ct.measurements || []).filter((m:any) => m.status === 'Aprovado' || m.status === 'Pago').reduce((acc: number, m: any) => acc + m.bruto, 0);
      const saldo = valorTotal - medido;
      const retencaoAcumulada = (ct.measurements || []).reduce((acc: number, m: any) => acc + m.retencao, 0);
      return { valorInicial, aditivos, valorTotal, medido, saldo, retencaoAcumulada };
  };

  const totals = selectedContrato ? getContractTotals(selectedContrato) : null;

  const getItemMedidoAcumulado = (itemId: number) => {
      if (!selectedContrato) return 0;
      const items = selectedContrato.items || [];
      return (selectedContrato.measurements || [])
          .filter((m: any) => m.status === 'Aprovado' || m.status === 'Pago')
          .reduce((sum: number, m: any) => {
              // Se não houver breakdown (BM antigo), mas houver apenas 1 item no contrato,
              // assumimos que o valor medido pertence a esse item.
              if (!m.breakdown) {
                  return items.length === 1 && items[0].id === itemId ? sum + (m.bruto || 0) : sum;
              }
              try {
                  const breakdown = JSON.parse(m.breakdown);
                  const item = breakdown.find((b: any) => b.itemId === itemId);
                  return sum + (item?.valor || 0);
              } catch (e) { return sum; }
          }, 0);
  };

  // --- FUNÇÕES REAL ---
  const handleCreateContract = async () => {
      if (!newContract.empresa || !newContract.servico) return alert("Preencha os dados.");
      setIsSaving(true);
      const res = await createContract(newContract, proj.id);
      setIsSaving(false);
      
      if (res.success) {
          setIsContractModalOpen(false);
          setNewContract({ empresa: '', servico: '', valor: 0, retencao: 5 });
          if (onRefresh) onRefresh();
          alert("Contrato criado com sucesso!");
      } else {
          alert("Erro ao criar contrato: " + res.error);
      }
  };

  const handleSaveBM = async () => {
      const bruto = novaMedicao.itens.reduce((acc:number, it:any) => acc + (it.total * ((it.pctAtual || 0) / 100)), 0);
      if (bruto <= 0) return alert("Adicione valores à medição.");
      
      // Validação de estouro de 100%
      const hasOverflow = novaMedicao.itens.some((it: any) => {
          const pctAnterior = (it.medido / it.total) * 100;
          return (pctAnterior + (it.pctAtual || 0)) > 100.01; // Margem de erro para floats
      });

      if (hasOverflow) {
          return alert("Erro: Um ou mais itens excedem 100% de faturamento acumulado. Ajuste os valores antes de salvar.");
      }
      
      const caucao = bruto * (selectedContrato.retencao / 100);
      const iss = bruto * (Number(novaMedicao.iss) / 100);
      const inss = bruto * (Number(novaMedicao.inss) / 100);
      const liq = bruto - caucao - iss - inss;
      
      const itemsBreakdown = (novaMedicao.itens || []).map((it: any) => ({
          itemId: it.id,
          valor: it.total * ((it.pctAtual || 0) / 100)
      })).filter((ib: any) => ib.valor > 0);
      
      setIsSaving(true);
      const res = await createMeasurement(selectedContrato.id, {
          ref: novaMedicao.ref || `BM-${selectedContrato.measurements.length + 1}`,
          periodo: novaMedicao.periodo,
          bruto,
          retencao: caucao, // Caução Retida
          iss: Number(novaMedicao.iss),
          inss: Number(novaMedicao.inss),
          liquido: liq,
          breakdown: JSON.stringify(itemsBreakdown)
      });
      setIsSaving(false);
      
      if (res.success) {
          alert("Medição (BM) salva com sucesso!");
          if (onRefresh) onRefresh();
          setViewMode('lista');
          setSelectedContratoId(null); // Limpa para forçar atualização se necessário
      } else {
          alert("Erro ao salvar medição: " + res.error);
      }
  };

  const handleImportAdvances = () => {
      if (!selectedContrato) return;
      
      const tasks = (proj.tasks || []);
      if (tasks.length === 0) {
          return alert("Nenhuma tarefa encontrada no Cronograma Master desta obra.");
      }
      
      const items = selectedContrato.items || [];
      
      // CASO 1: Contrato já tem itens vinculados a tarefas
      if (items.length > 0 && items.some((it: any) => it.taskId)) {
          const newItens = items.map((it: any) => {
              if (it.taskId) {
                  const task = tasks.find((t: any) => t.id === Number(it.taskId));
                  if (task) {
                      const physicalProgress = task.progress || 0;
                      const totalItem = it.total || (it.qtd * it.unitario) || 0;
                      if (totalItem === 0) return { ...it, pctAtual: 0 };
                      const medidoAcumulado = getItemMedidoAcumulado(it.id);
                      const pctAnterior = (medidoAcumulado / totalItem) * 100;
                      const deltaPct = Math.max(0, physicalProgress - pctAnterior);
                      return { ...it, pctAtual: Number(deltaPct.toFixed(2)) };
                  }
              }
              return { ...it, pctAtual: 0 };
          });
          setNovaMedicao({ ...novaMedicao, itens: newItens });
          alert(`✅ Avanços importados com sucesso!\n\n${newItens.filter((i: any) => i.pctAtual > 0).length} item(ns) com progresso atualizado.`);
          return;
      }
      
      // CASO 2: Contrato sem itens — importar tarefas do cronograma diretamente
      // Ordenar por WBS natural
      const sortedTasks = [...tasks].sort((a: any, b: any) => {
          const p1 = (a.wbs || '').split('.').map(Number);
          const p2 = (b.wbs || '').split('.').map(Number);
          for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
              if ((p1[i] || 0) !== (p2[i] || 0)) return (p1[i] || 0) - (p2[i] || 0);
          }
          return 0;
      });
      
      // Filtrar apenas tarefas folha (não-sumário) — as que realmente têm trabalho
      const leafTasks = sortedTasks.filter((t: any) => {
          const wbs = t.wbs || '';
          return !sortedTasks.some((other: any) => 
              other.wbs && other.wbs !== wbs && other.wbs.startsWith(wbs + '.')
          );
      });
      
      // Criar itens temporários a partir das tarefas do cronograma
      const cronogramaItens = leafTasks.map((t: any) => ({
          id: t.id,
          desc: `${t.wbs} - ${t.name || t.title}`,
          unidade: 'vb',
          qtd: 1,
          unitario: 0,
          total: 0,
          taskId: t.id,
          pctAtual: t.progress || 0,
          fromCronograma: true
      }));
      
      setNovaMedicao({ ...novaMedicao, itens: cronogramaItens });
      
      // Também precisamos mostrar esses itens na tabela — vamos sobrescrever os items do contrato temporariamente
      setImportedCronogramaItems(cronogramaItens);
      
      alert(`✅ ${cronogramaItens.length} etapas importadas do Cronograma Master!\n\nOs avanços físicos (%) foram preenchidos automaticamente a partir do progresso de cada tarefa.`);
  };

  const handleSyncCronograma = async () => {
      if (!selectedContrato) return;
      const tasks = (proj.tasks || []);
      if (tasks.length === 0) return alert("Nenhuma tarefa no Cronograma Master.");
      
      const items = selectedContrato.items || [];
      
      // Encontrar apenas tarefas folha do cronograma
      const sortedTasks = [...tasks].sort((a: any, b: any) => {
          const p1 = (a.wbs || '').split('.').map(Number);
          const p2 = (b.wbs || '').split('.').map(Number);
          for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
              if ((p1[i] || 0) !== (p2[i] || 0)) return (p1[i] || 0) - (p2[i] || 0);
          }
          return 0;
      });
      const leafTasks = sortedTasks.filter((t: any) => {
          const wbs = t.wbs || '';
          return !sortedTasks.some((other: any) => other.wbs && other.wbs !== wbs && other.wbs.startsWith(wbs + '.'));
      });

      // Filtrar as tarefas que AINDA NÃO estão na planilha do contrato
      const newTasksToImport = leafTasks.filter((t: any) => !items.some((it: any) => Number(it.taskId) === t.id));
      
      if (newTasksToImport.length === 0) {
          return alert("Todas as tarefas do cronograma já estão vinculadas na planilha do contrato!");
      }

      if (!confirm(`Foram encontradas ${newTasksToImport.length} novas tarefas no cronograma.\nDeseja importar todas como itens na planilha deste contrato?`)) return;

      setIsSaving(true);
      let successCount = 0;
      for (const t of newTasksToImport) {
          const newItemPayload = {
              desc: `${t.wbs} - ${t.name || t.title}`,
              unidade: 'vb',
              qtd: 1,
              unitario: 0,
              taskId: t.id.toString()
          };
          const res = await addContractItem(selectedContrato.id, newItemPayload);
          if (res.success) successCount++;
      }
      setIsSaving(false);
      
      if (onRefresh) onRefresh();
      alert(`✅ Sincronização concluída!\n\n${successCount} novas tarefas do cronograma foram importadas.\nAgora você pode editar os valores unitários delas na planilha.`);
  };

  const handleAddItem = async () => {
      if (!newItem.desc || newItem.qtd <= 0 || newItem.unitario <= 0) return alert("Preencha os campos obrigatórios.");
      setIsSaving(true);
      
      let res;
      if (editingItem) {
          res = await updateContractItem(editingItem.id, newItem);
      } else {
          res = await addContractItem(selectedContrato.id, newItem);
      }
      
      setIsSaving(false);
      
      if (res.success) {
          setIsItemModalOpen(false);
          setEditingItem(null);
          setNewItem({ desc: '', unidade: 'un', qtd: 0, unitario: 0 });
          if (onRefresh) onRefresh();
          alert(editingItem ? "Item atualizado com sucesso!" : "Item adicionado à planilha com sucesso!");
      } else {
          console.error("DEBUG: Erro retornado pela Action ->", res.error);
          alert("Erro ao processar item: " + (res.error || "Verifique o console para detalhes."));
      }
  };

  const handleDeleteContract = async (id: number) => {
      if (!confirm("Tem certeza que deseja excluir este contrato? Todas as medições vinculadas serão perdidas.")) return;
      setIsSaving(true);
      const res = await deleteContract(id);
      setIsSaving(false);
      if (res.success) {
          if (onRefresh) onRefresh();
          alert("Contrato excluído com sucesso.");
          setViewMode('lista');
      } else {
          alert("Erro ao excluir contrato: " + res.error);
      }
  };

  const handleDeleteItem = async (id: number) => {
      if (!confirm("Deseja excluir este item da planilha?")) return;
      setIsSaving(true);
      const res = await deleteContractItem(id);
      setIsSaving(false);
      if (res.success) {
          if (onRefresh) onRefresh();
          alert("Item excluído com sucesso.");
      } else {
          alert("Erro ao excluir item: " + res.error);
      }
  };

  const handleSaveAditivo = async () => {
      if (novoAditivo.valor <= 0) return alert("Informe o valor do aditivo.");
      setIsSaving(true);
      const res = await addAdditive(selectedContrato.id, novoAditivo);
      setIsSaving(true);
      if (res.success) {
          setIsAditivoModalOpen(false);
          setNovoAditivo({ valor: 0, motivo: "" });
          if (onRefresh) onRefresh();
          alert("Aditivo registrado com sucesso!");
      } else {
          alert("Erro ao registrar aditivo: " + res.error);
      }
  };

  const handlePrintBM = (bm: any) => {
      setPrintBM(bm);
      // Aguarda o React renderizar o componente no DOM e o CSS de print ser aplicado
      setTimeout(() => {
          window.print();
          // Não limpamos imediatamente para dar tempo do spooler de impressão processar
          setTimeout(() => setPrintBM(null), 2000);
      }, 1200);
  };

  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExportExcel = () => {
      try {
          const XLSX = require('xlsx');
          
          const data = contratos.map((ct: any) => {
              const { valorInicial, aditivos, valorTotal, medido, saldo, retencaoAcumulada } = getContractTotals(ct);
              return {
                  "Fornecedor": ct.empresa,
                  "Serviço": ct.servico,
                  "Valor_Inicial": valorInicial,
                  "Aditivos": aditivos,
                  "Valor_Total": valorTotal,
                  "Medido_Bruto": medido,
                  "Saldo": saldo,
                  "Pct_Executado": ((medido / valorTotal) * 100).toFixed(2) + "%",
                  "Caucao_Retida": retencaoAcumulada,
                  "Status": ct.status
              };
          });

          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Contratos");
          
          // Helper para converter string binária em ArrayBuffer
          const s2ab = (s: string) => {
              const buf = new ArrayBuffer(s.length);
              const view = new Uint8Array(buf);
              for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
              return buf;
          };

          const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
          const blob = new Blob([s2ab(wbout)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Relatorio_Contratos_Obra.xlsx";
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
          }, 100);
      } catch (error) {
          console.error("Erro ao exportar Excel, tentando CSV:", error);
          // Fallback para CSV se o XLSX falhar
          const headers = ["Fornecedor", "Servico", "Valor_Total", "Medido", "Saldo"];
          const csvData = contratos.map((ct: any) => {
              const { valorTotal, medido, saldo } = getContractTotals(ct);
              return `${ct.empresa},${ct.servico},${valorTotal},${medido},${saldo}`;
          });
          const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + csvData.join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "Relatorio_Contratos.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const handleApproveBM = async (bm: any) => {
      if (bm.status === 'Aprovado' || bm.status === 'Pago') return alert("Este BM já está aprovado.");
      if (!confirm(`Deseja aprovar o ${bm.ref}? Isso gerará lançamentos financeiros.`)) return;
      
      if (onApprove) {
          await onApprove(bm.id);
          if (onRefresh) onRefresh();
      } else {
          alert("Função de aprovação não configurada no componente pai.");
      }
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in relative bg-slate-50 dark:bg-[#0B1121] overflow-y-auto custom-scrollbar print:overflow-visible print:h-auto">
        {/* PDF EXPORT (Visible only during print) */}
        {printBM && <MeasurementPDF project={proj} contract={selectedContrato} measurement={printBM} />}

        <div className="flex-1 flex flex-col print:hidden no-print h-full">
        
        {/* MODAIS */}
        {isContractModalOpen && (
            <Modal title="Novo Contrato de Prestação de Serviço" onClose={()=>setIsContractModalOpen(false)}>
                <div className="space-y-4 p-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Empresa / Fornecedor</label>
                                <button onClick={async () => {
                                    const sups = await getSuppliers();
                                    setAvailableSuppliers(sups);
                                }} className="text-[9px] font-bold text-blue-500 hover:underline flex items-center gap-1">
                                    <RefreshCw size={10}/> Atualizar Lista
                                </button>
                            </div>
                            <select 
                                value={newContract.empresa} 
                                onChange={e=>setNewContract({...newContract, empresa: e.target.value})} 
                                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                            >
                                <option value="">Selecione uma empresa...</option>
                                {availableSuppliers.map(s => (
                                    <option key={s.id} value={s.name}>{s.name} ({s.type || "LEGADO"})</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Objeto / Serviço</label>
                            <input value={newContract.servico} onChange={e=>setNewContract({...newContract, servico: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-all" placeholder="Ex: Pintura, Drywall" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label htmlFor="valor_contrato" className="text-[10px] font-black text-slate-400 uppercase">Valor Total (R$)</label>
                            <input id="valor_contrato" type="number" value={newContract.valor} onChange={e=>setNewContract({...newContract, valor: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-all font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="caucao_contrato" className="text-[10px] font-black text-slate-400 uppercase">% Caução Retida</label>
                            <input id="caucao_contrato" type="number" value={newContract.retencao} onChange={e=>setNewContract({...newContract, retencao: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 transition-all font-bold" />
                        </div>
                    </div>
                    <button onClick={handleCreateContract} disabled={isSaving} className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:opacity-90 transition-all">
                        {isSaving ? "Gravando Contrato..." : "Confirmar e Abrir Contrato"}
                    </button>
                </div>
            </Modal>
        )}

        {isAditivoModalOpen && (
            <Modal title="Registrar Termo Aditivo (Valor)" onClose={()=>setIsAditivoModalOpen(false)}>
                <div className="space-y-4 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Valor do Aditivo (R$)</label>
                        <input type="number" value={novoAditivo.valor} onChange={e=>setNovoAditivo({...novoAditivo, valor: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Motivo / Justificativa</label>
                        <textarea value={novoAditivo.motivo} onChange={e=>setNovoAditivo({...novoAditivo, motivo: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 h-24 text-sm" placeholder="Ex: Reequilíbrio de preços, acréscimo de escopo..." />
                    </div>
                    <button onClick={handleSaveAditivo} disabled={isSaving} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:opacity-90 transition-all">
                        {isSaving ? "Gravando Aditivo..." : "Confirmar Aditivo"}
                    </button>
                </div>
            </Modal>
        )}

        {isItemModalOpen && (
            <Modal title={editingItem ? "Editar Item da Planilha" : "Adicionar Item à Planilha do Contrato"} onClose={()=>{setIsItemModalOpen(false); setEditingItem(null);}}>
                <div className="space-y-4 p-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Descrição do Serviço / Insumo</label>
                        <input value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500" placeholder="Ex: Piso Porcelanato 60x60" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Unidade</label>
                            <input value={newItem.unidade} onChange={e=>setNewItem({...newItem, unidade: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500" placeholder="m2, un, kg" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">Quantidade</label>
                            <input type="number" value={newItem.qtd} onChange={e=>setNewItem({...newItem, qtd: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase">P. Unitário (R$)</label>
                            <input type="number" value={newItem.unitario} onChange={e=>setNewItem({...newItem, unitario: Number(e.target.value)})} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 font-bold" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Vincular à Tarefa do Cronograma (Opcional)</label>
                        <select 
                            value={(newItem as any).taskId || ''} 
                            onChange={e => setNewItem({...newItem, taskId: e.target.value} as any)}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                        >
                            <option value="">Nenhuma tarefa vinculada</option>
                            {(proj.tasks || []).map((t: any) => (
                                <option key={t.id} value={t.id}>{t.wbs} - {t.title || t.name}</option>
                            ))}
                        </select>
                        <p className="text-[9px] text-slate-400 mt-1 italic">* Vincular permite importar avanços físicos do RDO automaticamente para o faturamento.</p>
                    </div>

                    <button onClick={handleAddItem} disabled={isSaving} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:opacity-90 transition-all">
                        {isSaving ? "Gravando Item..." : "Adicionar à Planilha"}
                    </button>
                </div>
            </Modal>
        )}

        {/* CABEÇALHO EXECUTIVO */}
        <div className="p-8 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">Gestão de Terceiros & Subempreitadas</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Controladoria de Contratos de Fornecedores e Custos de Obra</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExportExcel} title="Exportar para Excel" className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-500 transition-colors border"><FileSpreadsheet size={20}/></button>
                    <button onClick={()=>setIsContractModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:scale-105 transition-all">
                        <Plus size={16}/> Novo Contrato
                    </button>
                </div>
            </div>
        </div>

        {/* VIEW: LISTA DE CONTRATOS (DASHBOARD) */}
        {viewMode === 'lista' && (
            <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
                {/* KPIs GLOBAIS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Contratado</span>
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Scale size={18}/></div>
                        </div>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">
                            {formatter.format(contratos.reduce((acc:number, c:any) => acc + (c.valorInicial + (c.additives?.reduce((a:number,ad:any)=>a+ad.valor,0)||0)), 0))}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">{contratos.length} Contratos Ativos</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Medido (BM)</span>
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg"><ListChecks size={18}/></div>
                        </div>
                        <p className="text-2xl font-black text-emerald-600">
                            {formatter.format(medicoes.filter((m:any)=>m.status==='Aprovado'||m.status==='Pago').reduce((acc:number, m:any)=>acc+m.bruto,0))}
                        </p>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                            <div className="bg-emerald-500 h-full" style={{width: '45%'}}></div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Caução Retida</span>
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg"><Lock size={18}/></div>
                        </div>
                        <p className="text-2xl font-black text-amber-600">
                            {formatter.format(medicoes.reduce((acc:number, m:any)=>acc+m.retencao, 0))}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">Garantia de Execução</p>
                    </div>
                </div>

                {/* TABELA DE CONTRATOS */}
                <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="font-black text-sm uppercase tracking-tighter text-slate-800 dark:text-white">Contratos em Vigência</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                            <input placeholder="Filtrar por empresa..." className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0B1121] border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 w-64" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 dark:bg-[#111827] text-[10px] text-slate-500 uppercase font-black">
                                <tr>
                                    <th className="px-6 py-4">Fornecedor</th>
                                    <th className="px-6 py-4">Serviço</th>
                                    <th className="px-6 py-4 text-right">Valor Total</th>
                                    <th className="px-6 py-4 text-right">Medido</th>
                                    <th className="px-6 py-4 text-right">Saldo</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {contratos.map((ct: any) => {
                                    const { valorTotal, medido, saldo } = getContractTotals(ct);
                                    const pct = (medido / valorTotal) * 100;
                                    return (
                                        <tr key={ct.id} onClick={()=>{setSelectedContratoId(ct.id); setViewMode('contrato_detalhe');}} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl flex items-center justify-center font-black text-xs">
                                                        {ct.empresa[0]}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-slate-800 dark:text-white block">{ct.empresa}</span>
                                                        <span className="text-[9px] text-slate-400 uppercase font-bold">Ref: #CT-0{ct.id}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-slate-500 font-medium">{ct.servico}</td>
                                            <td className="px-6 py-5 text-right font-black text-slate-700 dark:text-slate-200">{formatter.format(valorTotal)}</td>
                                            <td className="px-6 py-5 text-right font-bold text-emerald-500">{formatter.format(medido)}</td>
                                            <td className="px-6 py-5 text-right">
                                                <span className={`font-black ${saldo > 0 ? 'text-slate-500' : 'text-red-500'}`}>{formatter.format(saldo)}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-tighter">{ct.status}</span>
                                            </td>
                                            <td className="px-6 py-5 text-right flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteContract(ct.id); }} 
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Excluir Contrato"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                                <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all"/>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: DETALHE DO CONTRATO */}
        {viewMode === 'contrato_detalhe' && selectedContrato && (
            <div className="flex-1 flex flex-col p-8 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
                <button onClick={()=>setViewMode('lista')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-blue-500 transition-colors mb-6">
                    <ArrowLeft size={14}/> Voltar para Contratos
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* COLUNA ESQUERDA: INFO & STATUS */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Building2 size={80}/></div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-none mb-1">{selectedContrato.empresa}</h3>
                            <p className="text-xs font-bold text-slate-400 mb-6">{selectedContrato.servico}</p>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Valor do Contrato</span>
                                    <span className="text-lg font-black text-slate-800 dark:text-white">{formatter.format(totals?.valorTotal || 0)}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Medido (Realizado)</span>
                                    <span className="text-lg font-black text-emerald-500">{formatter.format(totals?.medido || 0)}</span>
                                </div>
                                <div className="flex justify-between items-end border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Saldo a Medir</span>
                                    <span className="text-lg font-black text-blue-500">{formatter.format(totals?.saldo || 0)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Caução Retida</span>
                                    <span className="text-lg font-black text-amber-500">{formatter.format(totals?.retencaoAcumulada || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={()=>setIsAditivoModalOpen(true)} className="flex flex-col items-center justify-center gap-2 p-4 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-3xl hover:border-blue-500 transition-all group">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><Plus size={20}/></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase">Aditivo</span>
                            </button>
                            <button onClick={()=>setViewMode('nova')} className="flex flex-col items-center justify-center gap-2 p-4 bg-slate-900 dark:bg-blue-600 border border-transparent rounded-3xl hover:opacity-90 transition-all group shadow-xl shadow-blue-600/20">
                                <div className="p-3 bg-white/20 text-white rounded-2xl group-hover:scale-110 transition-transform"><Calculator size={20}/></div>
                                <span className="text-[10px] font-black text-white uppercase">Medir (BM)</span>
                            </button>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: ABAS DE DETALHE */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex gap-4 p-1 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-2xl w-fit">
                            {['dashboard', 'itens', 'bm'].map(t => (
                                <button key={t} onClick={()=>setContratoTab(t)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contratoTab === t ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                                    {t === 'dashboard' ? 'Overview' : t === 'itens' ? 'Planilha de Itens' : 'Histórico de BMs'}
                                </button>
                            ))}
                        </div>

                        {/* TAB: DASHBOARD CONTRATO */}
                        {contratoTab === 'dashboard' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Avanço Físico do Contrato</h4>
                                    <div className="h-48 flex items-center justify-center relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <p className="text-4xl font-black text-slate-800 dark:text-white">{((totals?.medido||0)/(totals?.valorTotal||1)*100).toFixed(0)}%</p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase">Executado</p>
                                            </div>
                                        </div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={[{v: totals?.medido || 0}, {v: totals?.saldo || 0}]} innerRadius={60} outerRadius={80} dataKey="v" startAngle={90} endAngle={450}>
                                                    <Cell fill="#3b82f6" />
                                                    <Cell fill="#f1f5f9" className="dark:fill-slate-800" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Status de Saúde</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                                            <CheckCircle2 className="text-emerald-500" size={24}/>
                                            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">Contrato dentro do orçamento previsto.</p>
                                        </div>
                                        {(totals?.saldo || 0) < 0 && (
                                            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl">
                                                <AlertTriangle className="text-red-500" size={24}/>
                                                <p className="text-[11px] font-bold text-red-800 dark:text-red-400">Alerta: Contrato excedeu o valor original.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: PLANILHA DE ITENS */}
                        {contratoTab === 'itens' && (
                             <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in fade-in">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#111827] flex justify-between items-center">
                                    <h3 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Itens Contratados</h3>
                                    <div className="flex gap-2">
                                        <button onClick={handleSyncCronograma} title="Sincronizar tarefas do Cronograma Master" className="flex items-center gap-1 p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg border border-blue-100 hover:bg-blue-100 font-bold text-[10px] uppercase">
                                            <Wand2 size={14}/> Sincronizar do Cronograma
                                        </button>
                                        <button onClick={()=>setIsItemModalOpen(true)} title="Adicionar Novo Item Manual" className="p-2 bg-white dark:bg-slate-800 rounded-lg border text-blue-500 hover:bg-blue-50"><Plus size={16}/></button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 dark:bg-[#111827] text-[10px] text-slate-500 uppercase font-black">
                                            <tr>
                                                <th className="px-6 py-4">Descrição do Serviço</th>
                                                <th className="px-6 py-4 text-center">Un.</th>
                                                <th className="px-6 py-4 text-right">Qtd.</th>
                                                <th className="px-6 py-4 text-right">Unitário</th>
                                                <th className="px-6 py-4 text-right">Total</th>
                                                <th className="px-6 py-4 text-right">Medido</th>
                                                <th className="px-6 py-4 text-right">Saldo</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {(selectedContrato.items || []).map((it: any) => (
                                                <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{it.desc}</td>
                                                    <td className="px-6 py-4 text-center uppercase font-bold text-slate-400">{it.unidade}</td>
                                                    <td className="px-6 py-4 text-right font-bold">{it.qtd}</td>
                                                    <td className="px-6 py-4 text-right">{formatter.format(it.unitario)}</td>
                                                    <td className="px-6 py-4 text-right font-black">{formatter.format(it.total)}</td>
                                                    <td className="px-6 py-4 text-right text-emerald-500 font-bold">{formatter.format(getItemMedidoAcumulado(it.id))}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-slate-400">{formatter.format(it.total - getItemMedidoAcumulado(it.id))}</td>
                                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-3">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingItem(it);
                                                                setNewItem({ desc: it.desc, unidade: it.unidade, qtd: it.qtd, unitario: it.unitario, taskId: it.taskId } as any);
                                                                setIsItemModalOpen(true);
                                                            }}
                                                            className="text-slate-300 hover:text-blue-500 transition-colors"
                                                            title="Editar Item"
                                                        >
                                                            <Eye size={14}/>
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteItem(it.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            title="Excluir Item"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                             </div>
                        )}

                        {/* TAB: HISTÓRICO DE BMs */}
                        {contratoTab === 'bm' && (
                            <div className="space-y-4 animate-in fade-in">
                                {(selectedContrato.measurements || []).length === 0 && <p className="text-center py-20 text-slate-400 text-xs font-black uppercase">Nenhum Boletim de Medição emitido.</p>}
                                {(selectedContrato.measurements || []).map((m: any) => (
                                    <div key={m.id} className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between group hover:border-blue-500 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                                <FileText size={24}/>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white text-sm">{m.ref}</h4>
                                                <p className="text-[10px] font-black text-slate-400 uppercase">{m.periodo} • {m.data}</p>
                                            </div>
                                        </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Valor Líquido</p>
                                                    <p className="text-lg font-black text-slate-800 dark:text-white">{formatter.format(m.liquido)}</p>
                                                </div>
                                                <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                                                    m.status === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 
                                                    m.status === 'Aprovado' ? 'bg-blue-100 text-blue-700' : 
                                                    m.status === 'Reprovado' ? 'bg-red-100 text-red-700' : 
                                                    'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {m.status}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {m.status === 'Em Análise' && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleApproveBM(m); }} 
                                                            title="Aprovar BM para Pagamento" 
                                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 font-bold text-[10px]"
                                                        >
                                                            <Check size={14}/> APROVAR PAGAMENTO
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handlePrintBM(m); }} 
                                                        title="Imprimir Boletim de Medição" 
                                                        className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                                                    >
                                                        <Printer size={16}/>
                                                    </button>
                                                </div>
                                            </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* VIEW: NOVA MEDIÇÃO (BM) - FP&A ALIGNED */}
        {viewMode === 'nova' && selectedContrato && (
            <div className="p-8 max-w-5xl mx-auto w-full animate-in slide-in-from-bottom-8 duration-500">
                 <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Emissão de Boletim de Medição (BM)</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase">Obra: {proj.nome} • Contrato: {selectedContrato.empresa}</p>
                    </div>
                    <button onClick={()=>setViewMode('contrato_detalhe')} title="Fechar Medição" className="p-3 bg-white dark:bg-slate-800 rounded-2xl border text-slate-500"><X size={20}/></button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Referência (Ex: BM-01)</label>
                                    <input value={novaMedicao.ref} onChange={e=>setNovaMedicao({...novaMedicao, ref: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Auto-gerado se vazio" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">Período de Medição</label>
                                    <input value={novaMedicao.periodo} onChange={e=>setNovaMedicao({...novaMedicao, periodo: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="Ex: Mai/2026" />
                                </div>
                            </div>

                            <table className="w-full text-xs text-left mb-8">
                                <thead className="bg-slate-50 dark:bg-[#111827] text-[10px] text-slate-500 uppercase font-black">
                                    <tr>
                                        <th className="px-4 py-4">Descrição do Item</th>
                                        <th className="px-4 py-4 text-right">Total Orçado</th>
                                        <th className="px-4 py-4 text-right">% Ant.</th>
                                        <th className="px-4 py-4 text-right w-32">% no Período</th>
                                        <th className="px-4 py-4 text-right">Valor Período</th>
                                    </tr>
                                    <tr className="bg-blue-50/50 dark:bg-blue-900/10 border-b dark:border-slate-800">
                                        <td colSpan={5} className="px-4 py-2">
                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={handleImportAdvances}
                                                    className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
                                                >
                                                    <Wand2 size={12}/> Importar Avanços do Cronograma
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </thead>
                                <tbody>
                                    {((importedCronogramaItems.length > 0 ? importedCronogramaItems : selectedContrato.items) || []).map((it: any, idx: number) => {
                                        const pct = novaMedicao.itens[idx]?.pctAtual || 0;
                                        const totalItem = it.total || (it.qtd * it.unitario) || 0;
                                        const medidoAcum = importedCronogramaItems.length > 0 ? 0 : getItemMedidoAcumulado(it.id);
                                        const pctAnterior = totalItem > 0 ? (medidoAcum / totalItem) * 100 : 0;
                                        const valorPeriodo = totalItem * (pct / 100);
                                        return (
                                            <tr key={it.id} className="border-b dark:border-slate-800">
                                                <td className="px-4 py-6">
                                                    <span className="font-bold text-slate-700 dark:text-slate-200">{it.desc}</span>
                                                    {it.fromCronograma && <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-[8px] font-black uppercase rounded">Cronograma</span>}
                                                    <p className="text-[9px] text-slate-400 uppercase font-black">{it.unidade} {totalItem > 0 ? `• ${formatter.format(it.unitario)}/un` : ''}</p>
                                                </td>
                                                <td className="px-4 py-6 text-right font-bold text-slate-400">{totalItem > 0 ? formatter.format(totalItem) : '-'}</td>
                                                <td className="px-4 py-6 text-right font-bold text-slate-400">{pctAnterior.toFixed(2)}%</td>
                                                <td className="px-4 py-6 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <input 
                                                            type="number" 
                                                            value={pct || ''}
                                                            onChange={e => {
                                                                let its = [...novaMedicao.itens];
                                                                // Se o item ainda não existe no array de itens da medição, inicializamos ele
                                                                if (!its[idx]) {
                                                                    its[idx] = { ...it, pctAtual: Number(e.target.value) };
                                                                } else {
                                                                    its[idx] = { ...its[idx], pctAtual: Number(e.target.value) };
                                                                }
                                                                setNovaMedicao({...novaMedicao, itens: its});
                                                            }}
                                                            className={`w-20 p-2 text-right border-none rounded-lg font-black outline-none ${pctAnterior + pct > 100 ? 'bg-red-50 text-red-600 ring-1 ring-red-500' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'}`} 
                                                            placeholder="0"
                                                        />
                                                        <span className={`text-[10px] font-bold ${pctAnterior + pct > 100 ? 'text-red-400' : 'text-blue-400'}`}>%</span>
                                                    </div>
                                                    {pctAnterior + pct > 100 && <p className="text-[8px] text-red-500 font-bold mt-1 uppercase text-right">Excede 100%</p>}
                                                </td>
                                                <td className="px-4 py-6 text-right font-black text-slate-800 dark:text-white">
                                                    {formatter.format(valorPeriodo)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-slate-900 dark:bg-blue-600 p-8 rounded-3xl text-white shadow-2xl shadow-blue-600/20">
                            <h4 className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-6">Resumo da Medição (Cálculo FP&A)</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center opacity-80">
                                    <span className="text-xs font-bold">Valor Bruto</span>
                                    <span className="font-black">{formatter.format(novaMedicao.itens.reduce((acc:number, it:any)=>acc+(it.total * ((it.pctAtual||0)/100)), 0))}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-80">
                                    <span className="text-xs font-bold">Caução Retida ({selectedContrato.retencao}%)</span>
                                    <span className="font-black text-amber-300">-{formatter.format(novaMedicao.itens.reduce((acc:number, it:any)=>acc+(it.total * ((it.pctAtual||0)/100)), 0) * (selectedContrato.retencao/100))}</span>
                                </div>
                                
                                <div className="pt-4 border-t border-white/10 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1"><label htmlFor="iss_percent" className="text-[10px] font-black uppercase">ISS (%)</label></div>
                                        <input id="iss_percent" type="number" value={novaMedicao.iss} onChange={e=>setNovaMedicao({...novaMedicao, iss: Number(e.target.value)})} className="w-16 bg-white/10 text-right p-1 rounded font-black text-xs" />
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1"><label htmlFor="inss_percent" className="text-[10px] font-black uppercase">INSS (%)</label></div>
                                        <input id="inss_percent" type="number" value={novaMedicao.inss} onChange={e=>setNovaMedicao({...novaMedicao, inss: Number(e.target.value)})} className="w-16 bg-white/10 text-right p-1 rounded font-black text-xs" />
                                    </div>
                                </div>

                                <div className="pt-6 mt-6 border-t-2 border-white/20">
                                    <p className="text-[10px] font-black opacity-60 uppercase mb-1">Valor Líquido a Pagar</p>
                                    <p className="text-4xl font-black">
                                        {formatter.format(
                                            novaMedicao.itens.reduce((acc:number, it:any)=>acc+(it.total * ((it.pctAtual||0)/100)), 0) * (1 - (selectedContrato.retencao/100) - (novaMedicao.iss/100) - (novaMedicao.inss/100))
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveBM} disabled={isSaving} className="w-full py-6 bg-white dark:bg-[#162032] border-2 border-emerald-500 text-emerald-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3">
                            <Save size={20}/> {isSaving ? "Gravando Medição..." : "Finalizar e Enviar para Aprovação"}
                        </button>
                        <p className="text-[9px] text-slate-400 font-bold uppercase text-center">Ao finalizar, este BM será enviado para a fila de aprovação e gerará uma previsão no financeiro.</p>
                     </div>
                 </div>
            </div>
        )}

        <style jsx>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(156, 163, 175, 0.2);
                border-radius: 4px;
            }
        `}</style>
        </div>
    </div>
  );
}


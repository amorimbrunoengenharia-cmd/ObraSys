"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CalendarClock, Clock, AlertTriangle, Target, FileUp, FileDown, Plus, X, Save, Trash2, LinkIcon, CheckCircle2, TrendingUp, Printer, ChevronRight, ChevronDown, Users, GripVertical } from 'lucide-react';
import { Modal } from '../Shared';
import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { updateTaskDetails, deleteTask, setBaseline, createKanbanTask } from '../../app/actions/task';
import { getStaff } from '../../app/actions/user';
import { importMSProjectXML } from '../../app/actions/import';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { calculateSCurve } from '../../lib/utils/sCurve';

export default function Cronograma({ proj, onRefresh }: any) {
  const { user } = useAuth();
  const isMestre = user?.role === 'Mestre de Obras';
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<'overwrite' | 'update'>('update');
  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const [staff, setStaff] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'report'>('table');
  const [showBaseline, setShowBaseline] = useState(false);
  const [isGanttVisible, setIsGanttVisible] = useState(true);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'>('weekly');

  const [splitWidth, setSplitWidth] = useState(55); // Porcentagem para a tabela
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 15 && newWidth < 85) {
      setSplitWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const formatDateForInput = (date: any) => {
    if (!date) return "";
    return new Date(date).toISOString().split('T')[0];
  };

  // Carregar Staff
  React.useEffect(() => {
    getStaff().then(setStaff);
  }, []);
  
  // DADOS REAIS DO PROJETO
  const rawTarefas = useMemo(() => proj?.tasks || [], [proj]);

  const dynamicBaseDate = useMemo(() => {
      let bDate = proj?.startDate ? new Date(proj.startDate) : (proj?.osDate ? new Date(proj.osDate) : null);
      if (bDate && !isNaN(bDate.getTime())) return bDate;
      
      const validDates = rawTarefas.filter((t:any) => t.actualStart).map((t:any) => new Date(t.actualStart).getTime());
      if (validDates.length > 0) return new Date(Math.min(...validDates));
      
      return new Date(proj?.createdAt || Date.now());
  }, [proj, rawTarefas]);

  // --- LÓGICA DE WBS (NATURAL SORT & INFERÊNCIA DE NÍVEL) ---
  const tarefas = useMemo(() => {
    const sortWBS = (a: any, b: any) => {
        const p1 = (a.wbs || "").split('.').map(Number);
        const p2 = (b.wbs || "").split('.').map(Number);
        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const num1 = p1[i] || 0;
            const num2 = p2[i] || 0;
            if (num1 !== num2) return num1 - num2;
        }
        return 0;
    };
    
    let sorted = [...rawTarefas].sort(sortWBS);

    return sorted.map((t, index) => {
      const wbs = t.wbs || "";
      const level = Math.max(0, wbs.split('.').length - 1);
      const isSummary = sorted.some((child, i) => i > index && (child.wbs || "").startsWith(wbs + '.') && child.wbs !== wbs);
      
      let start = t.start;
      let duration = t.duration;
      
      if (!start && !duration && t.actualStart && t.actualFinish) {
          const d1 = new Date(t.actualStart);
          const d2 = new Date(t.actualFinish);
          duration = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
          
          if (dynamicBaseDate && !isNaN(dynamicBaseDate.getTime())) {
              start = Math.max(0, Math.round((d1.getTime() - dynamicBaseDate.getTime()) / (1000 * 60 * 60 * 24)));
          }
      }
      
      if (isSummary) {
        const nextSameLevelIndex = sorted.findIndex((c, i) => i > index && Math.max(0, (c.wbs || "").split('.').length - 1) <= level);
        const subTasks = nextSameLevelIndex === -1 ? sorted.slice(index + 1) : sorted.slice(index + 1, nextSameLevelIndex);
        
        if (subTasks.length > 0) {
          const validStarts = subTasks.map(st => Number(st.start) || 0);
          const validEnds = subTasks.map(st => (Number(st.start) || 0) + (Number(st.duration) || 0));
          
          start = Math.min(...validStarts);
          const end = Math.max(...validEnds);
          duration = end - start;
        }
      }

      // Cálculo de Status para a Task (Priorizando Actuals)
      let statusLabel = "No Prazo";
      let statusColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      
      const varDays = (start + duration) - (t.baseStart + (t.baseDur || duration));
      if (t.actualFinish || t.progress >= 100) {
          statusLabel = "Concluído";
          statusColor = "bg-blue-500/10 text-blue-500 border-blue-500/20";
      } else if (varDays > 2) {
          statusLabel = "Atrasado";
          statusColor = "bg-red-500/10 text-red-500 border-red-500/20";
      } else if (varDays > 0) {
          statusLabel = "Atenção";
          statusColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
      } else if (t.status === 'blocked') {
          statusLabel = "Impedido";
          statusColor = "bg-red-500/10 text-red-500 border-red-500/20";
      }

      return { 
          ...t, 
          wbs,
          level,
          isSummary,
          start, 
          duration,
          statusLabel,
          statusColor
      };
    });
  }, [rawTarefas, dynamicBaseDate]);

  // CÁLCULO DA CURVA S COM GRANULARIDADE (UTILITÁRIO CENTRALIZADO)
  const sCurveData = useMemo(() => {
    return calculateSCurve(tarefas, granularity);
  }, [tarefas, granularity]);

  // RESUMO DE DIRETORIA
  const performance = useMemo(() => {
    const totalPlanned = tarefas.reduce((acc, t) => acc + (t.baseDur || t.duration), 0);
    const totalActual = tarefas.reduce((acc, t) => acc + (t.duration * (t.progress / 100)), 0);
    const delay = tarefas.some(t => (t.start + t.duration) > (t.baseStart + t.baseDur)) ? 'ATRASADO' : 'NO PRAZO';
    const cpi = (totalActual / (totalPlanned || 1)).toFixed(2);
    return { delay, cpi };
  }, [tarefas]);

  // FILTRAGEM DE TAREFAS RECOLHIDAS
  const visibleTarefas = useMemo(() => {
    const visible: any[] = [];
    let skipUntilLevel = -1;

    tarefas.forEach(t => {
      if (skipUntilLevel !== -1 && (t.level || 0) > skipUntilLevel) return;
      skipUntilLevel = -1;

      visible.push(t);
      if (collapsedTasks.has(t.id) && t.isSummary) {
        skipUntilLevel = t.level || 0;
      }
    });
    return visible;
  }, [tarefas, collapsedTasks]);

  // ESTADOS DE INTERFACE
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // --- FUNÇÕES DE INTERAÇÃO ---
  const toggleCollapse = (id: number) => {
    const newCollapsed = new Set(collapsedTasks);
    if (newCollapsed.has(id)) newCollapsed.delete(id);
    else newCollapsed.add(id);
    setCollapsedTasks(newCollapsed);
  };

  const handleEdit = (task: any) => { setEditingTask({ ...task }); setIsPanelOpen(true); };
  
  const handleSaveTask = async () => { 
      await updateTaskDetails(editingTask.id, editingTask);
      setIsPanelOpen(false); 
      onRefresh?.();
  };
  
  const handleDeleteTask = async () => { 
      if(confirm("Excluir tarefa permanentemente?")) { 
          await deleteTask(editingTask.id);
          setIsPanelOpen(false); 
          onRefresh?.();
      } 
  };

  const handleImportClick = () => {
      setIsImportModalOpen(true);
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsImporting(true);
      setIsImportModalOpen(false);

      const reader = new FileReader();
      reader.onload = async (event) => {
          const content = event.target?.result as string;
          const result = await importMSProjectXML(proj.id, content, importMode);
          
          setIsImporting(false);
          if (result.success) {
              alert(`✅ Importação concluída! ${result.count} tarefas processadas.`);
              onRefresh?.();
          } else {
              alert(`❌ Erro na importação: ${result.error}`);
          }
      };
      reader.readAsText(file);
  };

  const handleAddTask = async () => {
    const topLevelTasks = (proj?.tasks || []).map((t: any) => parseInt(t.wbs)).filter((n: any) => !isNaN(n));
    const nextWbs = topLevelTasks.length > 0 ? (Math.max(...topLevelTasks) + 1).toString() : "1";
    
    const res = await createKanbanTask({
      title: "Nova Atividade",
      projectId: proj.id,
      wbs: nextWbs,
      priority: "media"
    });
    if (res.success && res.data) {
      // Abrir o painel de edição para a nova tarefa imediatamente
      setEditingTask(res.data);
      setIsPanelOpen(true);
      onRefresh?.();
    }
  };

  const handleSetBaseline = async () => {
    if(confirm("Deseja definir o cronograma atual como a LINHA DE BASE? Isso substituirá a base anterior.")) {
        await setBaseline(proj.id);
        alert("✅ Linha de Base definida com sucesso!");
        onRefresh?.();
    }
  };

  const handleActualUpdate = async (taskId: number, field: string, value: any) => {
    const task = tarefas.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, [field]: value };
    await updateTaskDetails(taskId, updated);
  };

  const handleToggleComplete = async (task: any) => {
    const isDone = task.progress >= 100;
    const now = new Date().toISOString();
    const updated = { 
        ...task, 
        progress: isDone ? 0 : 100,
        actualStart: (!isDone && !task.actualStart) ? now : task.actualStart,
        actualFinish: isDone ? null : now
    };
    await updateTaskDetails(task.id, updated);
    onRefresh?.();
  };

  const handleRelativeChange = (field: 'start' | 'duration', value: number) => {
    let newStartRel = field === 'start' ? value : editingTask.start;
    let newDuration = field === 'duration' ? value : editingTask.duration;
    
    let updates: any = { [field]: value };
    
    const baseDate = dynamicBaseDate;
    
    if (baseDate && !isNaN(baseDate.getTime())) {
        const startMs = baseDate.getTime() + (newStartRel * 24 * 60 * 60 * 1000);
        const endMs = startMs + (newDuration * 24 * 60 * 60 * 1000);
        
        updates.actualStart = new Date(startMs).toISOString();
        updates.actualFinish = new Date(endMs).toISOString();
    }
    
    setEditingTask({ ...editingTask, ...updates });
  };

  const handleActualDatesChange = (field: 'actualStart' | 'actualFinish', value: string) => {
    let newStart = field === 'actualStart' ? value : editingTask.actualStart;
    let newFinish = field === 'actualFinish' ? value : editingTask.actualFinish;
    
    let updates: any = { [field]: value };
    
    if (newStart && newFinish) {
        const d1 = new Date(newStart);
        const d2 = new Date(newFinish);
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) updates.duration = Math.max(0, diffDays);
    }

    if (newStart) {
        const baseDate = dynamicBaseDate;
        if (baseDate && !isNaN(baseDate.getTime())) {
            const tStart = new Date(newStart);
            const diffTime = tStart.getTime() - baseDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (!isNaN(diffDays)) updates.start = Math.max(0, diffDays);
        }
    }

    setEditingTask({ ...editingTask, ...updates });
  };

  const handleExport = () => alert("⬇️ Gerando arquivo XML compatível com MS Project...");

  // --- RENDERIZADOR DE LINHAS DE CONEXÃO (GANTT) ---
  const renderGanttLines = () => {
    const scale = 2.5; 
    const rowHeight = 32; 
    
    return (
        <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-30">
            {visibleTarefas.map((t: any, idx: number) => {
                if (!t.predecessors) return null;
                const preds = t.predecessors.split(/[,;]/);
                
                return preds.map((pStr: any) => {
                    const pMatch = pStr.trim();
                    if (!pMatch) return null;
                    const pIdx = visibleTarefas.findIndex(x => x.wbs === pMatch || x.id.toString() === pMatch);
                    if (pIdx === -1) return null;
                    
                    const parent = visibleTarefas[pIdx];
                    const x1 = (parent.start + parent.duration) * scale;
                    const y1 = pIdx * rowHeight + rowHeight / 2;
                    const x2 = t.start * scale;
                    const y2 = idx * rowHeight + rowHeight / 2;
                    
                    return (
                        <path 
                            key={`${t.id}-${pMatch}`} 
                            d={`M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`} 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="1"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                });
            })}
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
            </defs>
        </svg>
    );
  };

  return (
    <div className="h-full flex flex-col animate-in fade-in relative overflow-hidden bg-[#0B1121] text-slate-200 font-['Urbanist',_sans-serif]">
         
         {isImporting && <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div><h3 className="font-bold">Sincronizando MS Project...</h3></div>}

         {/* TOOLBAR FIXA (NOVO) */}
         <div className="px-6 py-4 border-b border-slate-800 bg-[#0f172a] flex justify-between items-center sticky top-0 z-40 shadow-xl">
            <div className="flex items-center gap-6">
                <div>
                    <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                        <CalendarClock className="text-blue-500" size={20}/> Cronograma Master
                    </h2>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Way Service Engineering • V2.5</p>
                </div>
                
                <div className="flex bg-[#162032] p-1 rounded-lg border border-slate-800">
                    <button onClick={() => setActiveTab('table')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'table' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Estrutura</button>
                    <button onClick={() => setActiveTab('report')} className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Relatórios</button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#162032] p-1 rounded-lg border border-slate-800 mr-4">
                    <button onClick={() => setIsGanttVisible(!isGanttVisible)} className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase flex items-center gap-2 transition-all ${isGanttVisible ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>
                        {isGanttVisible ? <CheckCircle2 size={12}/> : <Clock size={12}/>} Visão Gantt
                    </button>
                </div>

                <div className="flex gap-1.5 border-r border-slate-800 pr-3 mr-3">
                    {!isMestre && <button onClick={handleImportClick} title="Importar do MS Project" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"><FileUp size={16}/></button>}
                    {!isMestre && <button onClick={handleExport} title="Exportar para XML" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"><FileDown size={16}/></button>}
                </div>

                <div className="flex gap-2">
                    {!isMestre && <button onClick={handleSetBaseline} className="px-3 py-2 bg-emerald-900/20 hover:bg-emerald-900/30 text-emerald-500 text-[10px] font-black uppercase rounded-lg border border-emerald-900/30 transition-all flex items-center gap-2"><Target size={14}/> Baseline</button>}
                    <button onClick={() => setShowBaseline(!showBaseline)} className={`px-3 py-2 text-[10px] font-black uppercase rounded-lg border transition-all flex items-center gap-2 ${showBaseline ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>Comparar</button>
                    {!isMestre && <button onClick={handleAddTask} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-[10px] font-black uppercase rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-white"><Plus size={14}/> Nova Tarefa</button>}
                </div>
            </div>
         </div>

         {activeTab === 'table' ? (
            <div className="flex-1 flex overflow-hidden select-none">
                {/* TABELA WBS (ESQUERDA) */}
                <div 
                  className="overflow-auto bg-[#0B1121] border-r border-slate-800 transition-all duration-75"
                  style={{ width: isGanttVisible ? `${splitWidth}%` : '100%' }}
                >
                    <table className="w-full border-collapse text-[10px]">
                        <thead className="sticky top-0 z-20 bg-[#162032] border-b border-slate-700">
                            <tr className="text-slate-500 uppercase font-black tracking-widest text-[9px]">
                                <th className="px-3 py-4 text-left w-12 border-r border-slate-800">WBS</th>
                                <th className="px-4 py-4 text-left min-w-[250px] border-r border-slate-800">Nome da Atividade</th>
                                <th className="px-2 py-4 text-center w-16 border-r border-slate-800">Status</th>
                                <th className="px-2 py-4 text-center w-12 border-r border-slate-800">Pred.</th>
                                <th className="px-2 py-4 text-center w-12 border-r border-slate-800">Marco</th>
                                <th className="px-2 py-4 text-center w-12 border-r border-slate-800">Início</th>
                                <th className="px-2 py-4 text-center w-12 border-r border-slate-800">Fim</th>
                                {showBaseline && (
                                    <>
                                        <th className="px-2 py-4 text-center w-12 border-r border-blue-900 bg-blue-900/10">Base Fim</th>
                                        <th className="px-2 py-4 text-center w-12 border-r border-blue-900 bg-blue-900/10">Var.</th>
                                    </>
                                )}
                                <th className="px-2 py-4 text-center w-16 border-r border-slate-800 bg-emerald-900/10">Início Real</th>
                                <th className="px-2 py-4 text-center w-16 border-r border-slate-800 bg-emerald-900/10">Fim Real</th>
                                <th className="px-4 py-4 text-left w-20 border-r border-slate-800">%</th>
                                <th className="px-2 py-4 text-center w-24">Equipe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {visibleTarefas.map((t: any) => {
                                const isSummary = t.isSummary;
                                const isCollapsed = collapsedTasks.has(t.id);
                                const level = t.level || 0;
                                const isCritical = t.critico;
                                const assignees = t.assignees || [];
                                const bEnd = (Number(t.baseStart) || 0) + (Number(t.baseDur) || 0);
                                const cEnd = (Number(t.start) || 0) + (Number(t.duration) || 0);
                                const varDays = bEnd > 0 ? cEnd - bEnd : 0;
                                
                                return (
                                    <tr key={t.id} onClick={() => handleEdit(t)} className={`group hover:bg-blue-600/5 transition-colors cursor-pointer border-b border-slate-800/30 ${isSummary ? 'bg-slate-900/40 font-bold text-white' : 'text-slate-400'}`}>
                                        <td className="px-3 py-2.5 border-r border-slate-800/50 text-slate-500 font-mono">{t.wbs}</td>
                                        <td className="px-4 py-2.5 border-r border-slate-800/50">
                                            <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 20}px` }}>
                                                {isSummary ? (
                                                    <button onClick={(e) => { e.stopPropagation(); toggleCollapse(t.id); }} className={`p-1 rounded transition-colors ${isCollapsed ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:bg-slate-700'}`}>
                                                        {isCollapsed ? <ChevronRight size={14} strokeWidth={3}/> : <ChevronDown size={14} strokeWidth={3}/>}
                                                    </button>
                                                ) : <div className="w-6"></div>}
                                                <span className={`truncate ${isCritical ? 'text-red-400' : ''}`}>{t.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${t.statusColor}`}>
                                                {t.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 text-center text-blue-500 font-bold">{t.predecessors || '-'}</td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 text-center">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleActualUpdate(t.id, 'isMilestone', !t.isMilestone); onRefresh?.(); }}
                                                className={`p-1 rounded-md border transition-all ${t.isMilestone ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                                                title="Marcar como Marco do Cliente"
                                            >
                                                <Target size={12}/>
                                            </button>
                                        </td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 text-center">{t.start}</td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 text-center font-bold">{cEnd}</td>
                                        
                                        {showBaseline && (
                                            <>
                                                <td className="px-2 py-2.5 border-r border-slate-800/50 text-center bg-blue-900/5 text-blue-400/60 font-mono">{bEnd || '-'}</td>
                                                <td className={`px-2 py-2.5 border-r border-slate-800/50 text-center bg-blue-900/5 font-black ${varDays > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {varDays > 0 ? `+${varDays}` : (varDays < 0 ? varDays : '0')}
                                                </td>
                                            </>
                                        )}

                                        <td className="px-2 py-2.5 border-r border-slate-800/50 bg-emerald-900/5">
                                            <input 
                                                type="date" 
                                                value={formatDateForInput(t.actualStart)} 
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => handleActualUpdate(t.id, 'actualStart', e.target.value)}
                                                className="bg-transparent text-[8px] text-emerald-500 outline-none w-full font-bold"
                                            />
                                        </td>
                                        <td className="px-2 py-2.5 border-r border-slate-800/50 bg-emerald-900/5">
                                            <input 
                                                type="date" 
                                                value={formatDateForInput(t.actualFinish)} 
                                                onClick={e => e.stopPropagation()}
                                                onChange={e => handleActualUpdate(t.id, 'actualFinish', e.target.value)}
                                                className="bg-transparent text-[8px] text-emerald-500 outline-none w-full font-bold"
                                            />
                                        </td>

                                        <td className="px-4 py-2.5 border-r border-slate-800/50">
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(t); }}
                                                    className={`p-1 rounded-md border transition-all ${t.progress >= 100 ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    <CheckCircle2 size={10}/>
                                                </button>
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <div className="flex justify-between text-[7px] font-black text-slate-500 uppercase"><span>{t.progress}%</span></div>
                                                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className={`h-full transition-all duration-500 ${(Number(t.progress) || 0) >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${Number(t.progress) || 0}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-2.5 text-center">
                                            <div className="flex -space-x-1 justify-center overflow-hidden">
                                                {assignees.slice(0,3).map((u: any) => (
                                                    <div key={u.id} className="w-6 h-6 rounded-full bg-slate-700 border-2 border-[#0B1121] flex items-center justify-center text-[8px] font-black text-white uppercase" title={u.name}>
                                                        {u.name.substring(0, 2)}
                                                    </div>
                                                ))}
                                                {assignees.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-[#0B1121] flex items-center justify-center text-[8px] font-black text-slate-500">+{assignees.length - 3}</div>}
                                                {assignees.length === 0 && <span className="text-slate-800">-</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* RESIZER BAR */}
                {isGanttVisible && (
                  <div 
                    onMouseDown={handleMouseDown}
                    className={`w-1.5 hover:w-2 bg-slate-800 hover:bg-blue-600 cursor-col-resize transition-all flex items-center justify-center group relative z-30 ${isResizing ? 'bg-blue-600 w-2' : ''}`}
                  >
                    <div className="h-10 w-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <GripVertical size={12} className="text-white"/>
                    </div>
                  </div>
                )}

                {/* GRÁFICO GANTT (DIREITA) */}
                {isGanttVisible && (
                    <div className="flex-1 overflow-auto bg-[#0f172a] relative transition-all duration-75">
                        <div className="sticky top-0 z-10 bg-[#111827] border-b border-slate-800 h-10 flex">
                            {Array.from({ length: 100 }).map((_, i) => (
                                <div key={i} className="w-[10px] flex-shrink-0 border-r border-slate-800/20 h-full flex items-center justify-center text-[7px] text-slate-700 font-bold">{i % 5 === 0 ? i : ''}</div>
                            ))}
                        </div>
                        <div className="relative min-w-[1000px]">
                            {visibleTarefas.map((t: any, idx: number) => {
                                const scale = 2.5;
                                const barLeft = (Number(t.start) || 0) * scale;
                                const barWidth = (Number(t.duration) || 0) * scale;
                                const isCritical = t.critico;

                                return (
                                    <div key={t.id} className="h-8 border-b border-slate-800/30 relative flex items-center group">
                                        {/* Baseline Shadow */}
                                        {showBaseline && (
                                            <div 
                                                className="absolute h-0.5 bg-blue-500/20 rounded-full bottom-1"
                                                style={{ left: `${t.baseStart * scale}px`, width: `${t.baseDur * scale}px` }}
                                            />
                                        )}
                                        {/* Active Bar (Planned/Current) */}
                                        <div 
                                            className={`absolute h-4 rounded-sm shadow-lg transition-all duration-300 group-hover:scale-y-110 ${t.isSummary ? 'bg-slate-600' : (isCritical ? 'bg-red-600 shadow-red-500/20' : 'bg-blue-600 shadow-blue-500/20')} ring-1 ring-white/10`}
                                            style={{ left: `${barLeft}px`, width: `${Math.max(barWidth, 4)}px` }}
                                        >
                                            {/* Actual Progress Overlay */}
                                            <div className="h-full bg-emerald-400/60 transition-all rounded-l-sm" style={{ width: `${t.progress}%` }}>
                                                {t.progress >= 100 && <div className="h-full w-full bg-emerald-500 flex items-center justify-end px-1"><CheckCircle2 size={8} className="text-white"/></div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {renderGanttLines()}
                        </div>
                    </div>
                )}
            </div>
         ) : (
            /* RELATÓRIOS E CURVA S */
            <div className="flex-1 p-8 bg-[#0B1121] overflow-auto space-y-8">
                <div className="bg-[#162032] p-8 rounded-2xl border border-slate-800 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white">Curva S Físico-Financeira</h3>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-black mt-1">Comparativo Planejado (Base) vs Realizado Acumulado</p>
                        </div>
                        <div className="flex items-center gap-6">
                            {/* GRANULARIDADE SELECT */}
                            <div className="flex items-center gap-2 bg-[#0B1121] p-1 rounded-lg border border-slate-700">
                                {['daily', 'weekly', 'biweekly', 'monthly', 'yearly'].map((g: any) => (
                                    <button 
                                        key={g}
                                        onClick={() => setGranularity(g as any)}
                                        className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${granularity === g ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {g === 'daily' ? 'Dia' : g === 'weekly' ? 'Semana' : g === 'biweekly' ? 'Quinzena' : g === 'monthly' ? 'Mês' : 'Ano'}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-4 border-l border-slate-800 pl-6">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> <span className="text-[10px] font-bold text-slate-400 uppercase">Planejado</span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> <span className="text-[10px] font-bold text-slate-400 uppercase">Realizado</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-[400px] w-full flex items-center justify-center">
                        {sCurveData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sCurveData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPlanejado" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false}/>
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`}/>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#162032', border: '1px solid #334155', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="planejado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPlanejado)" />
                                    <Area type="monotone" dataKey="realizado" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRealizado)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-900/10 rounded-full flex items-center justify-center mx-auto">
                                    <Target className="text-blue-500" size={32}/>
                                </div>
                                <div>
                                    <p className="text-white font-bold">Aguardando definição de Linha de Base</p>
                                    <p className="text-xs text-slate-500 mt-1">Defina a Baseline na aba Estrutura para habilitar a análise de performance.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div className="bg-[#162032] p-6 rounded-2xl border border-slate-800">
                        <h4 className="text-sm font-bold text-white mb-4">Análise de Valor Agregado (EVA)</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                                <span className="text-xs text-slate-400">PV (Planned Value)</span>
                                <span className="text-sm font-bold text-blue-400">
                                    {sCurveData.length > 0 ? sCurveData[sCurveData.length - 1]?.planejado : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg">
                                <span className="text-xs text-slate-400">EV (Earned Value)</span>
                                <span className="text-sm font-bold text-emerald-400">
                                    {sCurveData.length > 0 ? sCurveData[sCurveData.length - 1]?.realizado : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-lg border-l-4 border-red-500">
                                <span className="text-xs text-slate-400">SV (Schedule Variance)</span>
                                <span className="text-sm font-bold text-red-400">
                                    {sCurveData.length > 0 ? (sCurveData[sCurveData.length - 1]?.realizado - sCurveData[sCurveData.length - 1]?.planejado) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#162032] p-6 rounded-2xl border border-slate-800 flex flex-col justify-center text-center space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumo de Desempenho</p>
                        <h5 className={`text-4xl font-black ${performance.delay === 'ATRASADO' ? 'text-red-500' : 'text-emerald-500'}`}>{performance.delay}</h5>
                        <p className="text-xs text-slate-400 italic">"O projeto apresenta um CPI de {performance.cpi}, indicando {(Number(performance.cpi) < 1) ? 'atraso em relação à base' : 'execução dentro do esperado'}."</p>
                    </div>
                </div>
            </div>
         )}

         {/* PAINEL DE EDIÇÃO LATERAL */}
         {isPanelOpen && editingTask && (
             <div className="absolute top-0 right-0 w-96 h-full bg-[#162032] border-l border-slate-800 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-[#0f172a]">
                    <h3 className="font-bold text-sm flex items-center gap-2"><Target size={16} className="text-blue-500"/> Atividade #{editingTask.id}</h3>
                    <button onClick={() => setIsPanelOpen(false)} className="p-1 hover:bg-slate-700 rounded transition-colors"><X size={18}/></button>
                </div>
                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Descrição</label>
                        <input type="text" disabled={isMestre} value={editingTask.name} onChange={e => setEditingTask({...editingTask, name: e.target.value})} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-sm font-bold text-white outline-none disabled:opacity-50"/>
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Progresso (%)</label>
                        <input 
                            type="number" 
                            min="0" max="100"
                            value={editingTask.progress} 
                            onChange={e => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                const now = new Date().toISOString();
                                let actualStart = editingTask.actualStart;
                                let actualFinish = editingTask.actualFinish;

                                if (val > 0 && !actualStart) actualStart = now;
                                if (val >= 100 && !actualFinish) actualFinish = now;
                                if (val < 100 && actualFinish) actualFinish = null;

                                setEditingTask({...editingTask, progress: val, actualStart, actualFinish});
                            }} 
                            className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-sm font-bold text-blue-400 outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Início Relativo</label>
                            <input type="number" disabled={isMestre} value={editingTask.start} onChange={e => handleRelativeChange('start', Number(e.target.value))} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-sm text-white outline-none disabled:opacity-50"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Duração (Dias)</label>
                            <input type="number" disabled={isMestre} value={editingTask.duration} onChange={e => handleRelativeChange('duration', Number(e.target.value))} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-sm text-white outline-none disabled:opacity-50"/>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Início Real (Actual)</label>
                            <input type="date" value={formatDateForInput(editingTask.actualStart)} onChange={e => handleActualDatesChange('actualStart', e.target.value)} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-xs text-white outline-none"/>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Término Real (Actual)</label>
                            <input type="date" value={formatDateForInput(editingTask.actualFinish)} onChange={e => handleActualDatesChange('actualFinish', e.target.value)} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-xs text-white outline-none"/>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Estrutura WBS (Ex: 1, 1.1, 2)</label>
                        <input type="text" disabled={isMestre} value={editingTask.wbs || ''} onChange={e => setEditingTask({...editingTask, wbs: e.target.value})} className="w-full p-3 bg-[#0B1121] border border-slate-700 rounded-xl text-sm text-white outline-none disabled:opacity-50" placeholder="Ex: 1.1.2"/>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Responsáveis (Resources)</label>
                        <div className="bg-[#0B1121] border border-slate-700 rounded-xl p-3 max-h-32 overflow-y-auto space-y-2">
                            {staff.map(u => (
                                <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-800/50 p-1 rounded transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={editingTask.assignees?.some((a: any) => a.id === u.id)}
                                        onChange={(e) => {
                                            const current = editingTask.assignees || [];
                                            const next = e.target.checked 
                                                ? [...current, u]
                                                : current.filter((a: any) => a.id !== u.id);
                                            setEditingTask({...editingTask, assignees: next, assigneeIds: next.map((a: any) => a.id)});
                                        }}
                                        className="w-3 h-3 accent-blue-500"
                                    />
                                    <span className="text-xs text-slate-300">{u.name}</span>
                                    <span className="text-[9px] text-slate-600 ml-auto">{u.role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Predecessoras (Auto-Schedule)</label>
                        <div className="flex items-center gap-2 bg-[#0B1121] border border-slate-700 rounded-xl p-3">
                            <LinkIcon size={14} className="text-blue-500"/>
                            <input 
                                type="text" 
                                value={editingTask.predecessors || ''} 
                                onChange={e => setEditingTask({...editingTask, predecessors: e.target.value})} 
                                className="bg-transparent w-full text-sm outline-none text-white font-mono" 
                                placeholder="Ex: 1; 2FS+2d"/>
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">IDs separados por vírgula ou ponto e vírgula.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center gap-2 p-3 bg-[#0B1121] border border-slate-700 rounded-xl flex-1">
                            <input type="checkbox" checked={editingTask.critico} onChange={e => setEditingTask({...editingTask, critico: e.target.checked})} className="w-4 h-4 accent-red-500"/>
                            <span className="text-[10px] font-bold text-red-500">Caminho Crítico</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-3 bg-[#0B1121] border border-slate-700 rounded-xl">
                        <input type="checkbox" checked={editingTask.isMilestone} onChange={e => setEditingTask({...editingTask, isMilestone: e.target.checked})} className="w-4 h-4 accent-amber-500"/>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Exibir como Marco no Portal do Cliente</span>
                    </div>

                    {!isMestre && <button onClick={handleDeleteTask} className="w-full py-2 text-red-500 text-[10px] font-black uppercase hover:bg-red-900/10 rounded-lg border border-red-900/20 transition-all flex items-center justify-center gap-2"><Trash2 size={14}/> Excluir Permanente</button>}
                </div>
                <div className="p-4 bg-[#0f172a] border-t border-slate-700">
                    <button onClick={handleSaveTask} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"><Save size={18}/> Salvar & Agendar</button>
                </div>
             </div>
         )}

         {/* MODAL DE IMPORTAÇÃO */}
         <ImportModal 
            isOpen={isImportModalOpen} 
            onClose={() => setIsImportModalOpen(false)} 
            mode={importMode}
            setMode={setImportMode}
            onFileChange={onFileChange}
          />
    </div>
  );
}

// COMPONENTE MODAL DE IMPORTAÇÃO
function ImportModal({ isOpen, onClose, mode, setMode, onFileChange }: any) {
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#162032] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                        <FileUp className="text-blue-500" size={20}/> Importar MS Project
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400"><X size={20}/></button>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
                        <p className="text-xs text-blue-400 font-bold uppercase tracking-wider flex items-center gap-2">
                            <AlertTriangle size={14}/> Atenção à Sincronização
                        </p>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            A importação irá processar a estrutura de tarefas, durações e dependências do seu arquivo XML.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Estratégia de Carga</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setMode('update')}
                                className={`p-4 rounded-xl border-2 transition-all text-left space-y-1 ${mode === 'update' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                            >
                                <p className={`text-xs font-bold ${mode === 'update' ? 'text-white' : 'text-slate-400'}`}>Apenas Atualizar</p>
                                <p className="text-[9px] text-slate-500">Mantém tarefas atuais e adiciona novas.</p>
                            </button>
                            <button 
                                onClick={() => setMode('overwrite')}
                                className={`p-4 rounded-xl border-2 transition-all text-left space-y-1 ${mode === 'overwrite' ? 'border-red-500 bg-red-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}
                            >
                                <p className={`text-xs font-bold ${mode === 'overwrite' ? 'text-white' : 'text-slate-400'}`}>Limpar e Recriar</p>
                                <p className="text-[9px] text-slate-500">Apaga o cronograma atual antes da carga.</p>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <label className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/30 hover:bg-slate-900/50 hover:border-blue-500/50 transition-all cursor-pointer group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <FileUp className="text-blue-500" size={24}/>
                            </div>
                            <p className="text-sm font-bold text-white">Selecionar arquivo XML</p>
                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter font-black">Somente .xml exportado do MS Project</p>
                            <input type="file" accept=".xml" className="hidden" onChange={onFileChange}/>
                        </label>
                    </div>
                </div>

                <div className="p-4 bg-[#0f172a] border-t border-slate-800 text-center">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">MS Project Integration Engine v2.0</p>
                </div>
            </div>
        </div>
    );
}

"use client";
import React, { useState, DragEvent } from 'react';
import { Columns, LayoutGrid, Plus, MoreHorizontal, AlertCircle, CheckCircle2, Flag, MessageSquare, Calendar, HardHat, FileText, RefreshCw } from 'lucide-react';
import { Modal } from '../Shared';

type Priority = 'baixa' | 'media' | 'alta' | 'urgente';

interface Task {
    id: string;
    title: string;
    description: string;
    columnId: string;
    priority: Priority;
    assignee: string;
    avatar: string;
    tags: string[];
    dueDate: string;
    comments: number;
}

interface Column {
    id: string;
    title: string;
    color: string;
}

const INITIAL_COLUMNS: Column[] = [
    { id: 'todo', title: 'A Fazer', color: 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300' },
    { id: 'in_progress', title: 'Em Andamento', color: 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
    { id: 'blocked', title: 'Impedimento', color: 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
    { id: 'done', title: 'Concluído', color: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
];

import { updateTaskColumn, createKanbanTask } from '../../app/actions/task';
import { generateRdoFromKanban } from '../../app/actions/rdo';
import { pullKanbanUpdatesFromObsidian } from '../../app/actions/obsidian_pull';

export default function GestaoTarefas({ proj, onRefresh }: any) {
    // Adapter do banco de dados para a UI
    const dbTasks = (proj?.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        description: t.description || t.wbs,
        columnId: t.columnId || 'todo',
        priority: t.priority || 'media',
        assignee: t.assignee || 'N/A',
        avatar: (t.assignee || 'U').substring(0, 2).toUpperCase(),
        tags: t.tags ? t.tags.split(',') : [t.wbs],
        dueDate: new Date(t.endDate).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}),
        comments: 0
    }));

    const [tasks, setTasks] = useState<Task[]>(dbTasks);
    
    // Sincronizar estado local se as props mudarem
    React.useEffect(() => {
        setTasks(dbTasks);
    }, [proj?.tasks]);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [rdoMsg, setRdoMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [isGeneratingRdo, setIsGeneratingRdo] = useState(false);
    const [isSyncingObsidian, setIsSyncingObsidian] = useState(false);

    const handleSyncObsidian = async () => {
        setIsSyncingObsidian(true);
        setRdoMsg(null);
        try {
            const res = await pullKanbanUpdatesFromObsidian();
            if (res.success) {
                setRdoMsg({ 
                    text: res.updatedCount > 0 
                        ? `✅ Obsidian sincronizado com sucesso! ${res.updatedCount} tarefa(s) atualizada(s) no banco de dados.` 
                        : 'ℹ️ Nenhuma alteração pendente no Obsidian. O Kanban já está sincronizado!', 
                    type: 'success' 
                });
                onRefresh?.();
            } else {
                setRdoMsg({ text: `❌ Erro ao puxar dados do Obsidian: ${res.error}`, type: 'error' });
            }
        } catch {
            setRdoMsg({ text: '❌ Falha ao tentar ler o Vault do Obsidian.', type: 'error' });
        } finally {
            setIsSyncingObsidian(false);
            setTimeout(() => setRdoMsg(null), 8000);
        }
    };

    const doneCount = tasks.filter(t => t.columnId === 'done').length;

    const handleGenerateRDO = async () => {
        setIsGeneratingRdo(true);
        setRdoMsg(null);
        try {
            const res = await generateRdoFromKanban(proj.id);
            if (res.success) {
                setRdoMsg({ text: res.message || '✅ RDO gerado com sucesso!', type: 'success' });
                onRefresh?.();
            } else {
                setRdoMsg({ text: `❌ ${res.error}`, type: 'error' });
            }
        } catch {
            setRdoMsg({ text: '❌ Erro ao gerar RDO.', type: 'error' });
        } finally {
            setIsGeneratingRdo(false);
            setTimeout(() => setRdoMsg(null), 6000);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createKanbanTask({
            title: newTaskTitle,
            description: newTaskDesc,
            projectId: proj.id,
            priority: 'media'
        });
        if (res.success) {
            setIsModalOpen(false);
            setNewTaskTitle('');
            setNewTaskDesc('');
            // Optional: force reload logic if state isn't revalidating deeply
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: DragEvent<HTMLDivElement>, id: string) => {
        setDraggedTaskId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Hide the dragged ghost slightly
        setTimeout(() => {
            const el = document.getElementById(`task-${id}`);
            if (el) el.classList.add('opacity-50');
        }, 0);
    };

    const handleDragEnd = (e: DragEvent<HTMLDivElement>, id: string) => {
        const el = document.getElementById(`task-${id}`);
        if (el) el.classList.remove('opacity-50');
        setDraggedTaskId(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>, columnId: string) => {
        e.preventDefault();
        if (draggedTaskId) {
            // Optimistic Update
            setTasks(prev => prev.map(task => 
                task.id === draggedTaskId ? { ...task, columnId } : task
            ));

            // Server Update
            if (draggedTaskId.startsWith('t')) return; // Ignore fake tasks
            const res = await updateTaskColumn(draggedTaskId, columnId);
            if (res?.success || res) {
                onRefresh?.();
            }
        }
    };

    // --- UI Helpers ---
    const getPriorityColor = (p: Priority) => {
        switch(p) {
            case 'urgente': return 'bg-red-500 text-white';
            case 'alta': return 'bg-orange-500 text-white';
            case 'media': return 'bg-blue-500 text-white';
            case 'baixa': return 'bg-slate-400 text-white';
        }
    };

    const getPriorityIcon = (p: Priority) => {
        switch(p) {
            case 'urgente': return <AlertCircle size={12}/>;
            case 'alta': return <Flag size={12}/>;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col animate-in fade-in bg-slate-50 dark:bg-[#0B1121]">
            
            {/* Header */}
            <div className="p-6 pb-0 flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Columns className="text-blue-500"/> Kanban Ágil
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Gestão de tarefas e produtividade da equipe</p>
                </div>
                <div className="flex gap-3">
                    <div className="flex -space-x-2 mr-4">
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0B1121] bg-emerald-500 text-white flex items-center justify-center text-xs font-bold z-30">MC</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0B1121] bg-blue-500 text-white flex items-center justify-center text-xs font-bold z-20">EB</div>
                        <div className="w-8 h-8 rounded-full border-2 border-white dark:border-[#0B1121] bg-amber-500 text-white flex items-center justify-center text-xs font-bold z-10">+3</div>
                    </div>
                    <button className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors">
                        <LayoutGrid size={16}/> Filtros
                    </button>
                    <button 
                        onClick={handleSyncObsidian}
                        disabled={isSyncingObsidian}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95"
                        title="Puxar atualizações de status diretamente do Obsidian"
                    >
                        <RefreshCw size={16} className={isSyncingObsidian ? "animate-spin" : ""}/>
                        {isSyncingObsidian ? "Sincronizando..." : "Sincronizar Obsidian"}
                    </button>
                    <button 
                        onClick={handleGenerateRDO} 
                        disabled={isGeneratingRdo || doneCount === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                        title={doneCount === 0 ? 'Nenhuma tarefa concluída para registrar' : `Gerar RDO com ${doneCount} tarefa(s) concluída(s)`}
                    >
                        {isGeneratingRdo ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <HardHat size={16}/>}
                        Gerar RDO do Dia
                        {doneCount > 0 && (
                            <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{doneCount}</span>
                        )}
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95">
                        <Plus size={16}/> Nova Tarefa
                    </button>
                </div>
            </div>

            {/* Feedback Banner — RDO Generation */}
            {rdoMsg && (
                <div className={`mx-6 mb-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-sm animate-in slide-in-from-top duration-300 flex items-center gap-3 ${rdoMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                    {rdoMsg.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
                    {rdoMsg.text}
                </div>
            )}

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 pt-2 flex gap-6">
                {INITIAL_COLUMNS.map(column => {
                    const columnTasks = tasks.filter(t => t.columnId === column.id);
                    
                    return (
                        <div 
                            key={column.id}
                            className={`flex-shrink-0 w-80 flex flex-col rounded-xl border-t-4 shadow-sm bg-slate-100/50 dark:bg-[#162032]/50 ${column.color}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            {/* Column Header */}
                            <div className="p-4 flex justify-between items-center font-bold">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm uppercase tracking-wide">{column.title}</h3>
                                    <span className="bg-white dark:bg-[#0B1121] text-slate-500 px-2 py-0.5 rounded-full text-xs shadow-sm">
                                        {columnTasks.length}
                                    </span>
                                </div>
                                <button title="Opções da Coluna" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><MoreHorizontal size={16}/></button>
                            </div>

                            {/* Column Body (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                                {columnTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        id={`task-${task.id}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id)}
                                        onDragEnd={(e) => handleDragEnd(e, task.id)}
                                        className="bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all group"
                                    >
                                        {/* Tags & Priority */}
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex gap-1 flex-wrap">
                                                {task.tags.map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold rounded uppercase">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getPriorityColor(task.priority)} shadow-sm`}>
                                                {getPriorityIcon(task.priority)} {task.priority}
                                            </div>
                                        </div>

                                        {/* Title & Desc */}
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {task.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                                            {task.description}
                                        </p>

                                        {/* Footer */}
                                        <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-3">
                                            <div className="flex flex-col gap-1.5">
                                                <div className={`flex items-center gap-1 text-[10px] font-bold ${task.dueDate === 'Atrasado' ? 'text-red-500' : 'text-slate-400'}`}>
                                                    {task.columnId === 'done' ? <CheckCircle2 size={12} className="text-emerald-500"/> : <Calendar size={12}/>}
                                                    {task.dueDate}
                                                </div>
                                                {task.comments > 0 && (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                                                        <MessageSquare size={12}/> {task.comments}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[9px] font-bold" title={task.assignee}>
                                                    {task.avatar}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Drop Area Placeholder when dragging over an empty column */}
                                {columnTasks.length === 0 && (
                                    <div className="h-24 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 text-sm font-bold opacity-50">
                                        Solte tarefas aqui
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL NOVA TAREFA */}
            {isModalOpen && (
                <Modal title="Nova Tarefa" onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleCreateTask} className="space-y-4">
                        <div>
                            <label htmlFor="task_title" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Título da Tarefa</label>
                            <input id="task_title" type="text" required placeholder="Ex: Preparar documentação" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"/>
                        </div>
                        <div>
                            <label htmlFor="task_desc" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Descrição</label>
                            <textarea id="task_desc" required placeholder="Detalhes do que precisa ser feito..." value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500 min-h-[100px]"></textarea>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors">Salvar Tarefa</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Custom CSS for scrollbar */}
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.3);
                    border-radius: 4px;
                }
            `}} />
        </div>
    );
}

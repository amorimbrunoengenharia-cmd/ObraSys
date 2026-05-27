"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContractHistory, createContractEvent } from '../../actions/commercial';
import { 
    ArrowLeft, 
    Plus, 
    FileText, 
    DollarSign, 
    Calendar, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    ChevronRight,
    TrendingUp,
    Trash2
} from 'lucide-react';
import { deleteContractEvent, createContractMeasurement, deleteContractMeasurement, releaseRetention } from '../../actions/commercial';
import Link from 'next/link';
import { Modal } from '../../../components/Shared';

export default function ContractHistoryPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [project, setProject] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Measurement states
    const [isMeasurementModalOpen, setIsMeasurementModalOpen] = useState(false);
    const [numBM, setNumBM] = useState('1');
    const [dataMedicao, setDataMedicao] = useState(new Date().toISOString().split('T')[0]);
    const [valorBrutoMedicao, setValorBrutoMedicao] = useState('0');
    const [statusMedicao, setStatusMedicao] = useState('A Receber');
    const [valorImpostosMedicao, setValorImpostosMedicao] = useState('0');
    const [expectedRetentionDate, setExpectedRetentionDate] = useState('');

    useEffect(() => {
        if (isMeasurementModalOpen && project) {
            if (project.retentionRule === 'AT_END') {
                const deliveryDate = project.estimatedDelivery ? new Date(project.estimatedDelivery) : null;
                if (deliveryDate) {
                    const forecast = new Date(deliveryDate);
                    forecast.setDate(forecast.getDate() + (project.retentionDays || 0));
                    setExpectedRetentionDate(forecast.toISOString().split('T')[0]);
                } else {
                    setExpectedRetentionDate('');
                }
            } else {
                // Se for por BM, deixa vazio para preenchimento manual ou pega data atual + 30 dias como sugestão
                const suggestion = new Date();
                suggestion.setDate(suggestion.getDate() + 30);
                setExpectedRetentionDate(suggestion.toISOString().split('T')[0]);
            }
        }
    }, [isMeasurementModalOpen, project]);

    // UI states for custom delete confirmation
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<number | null>(null);
    const [deleteType, setDeleteType] = useState<'event' | 'measurement'>('event');

    // Retention Release States
    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [retentionToRelease, setRetentionToRelease] = useState<any>(null);
    const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split('T')[0]);

    // Form states
    const [tipo, setTipo] = useState('Valor');
    const [descricao, setDescricao] = useState('');
    const [valorAdicional, setValorAdicional] = useState('0');
    const [diasAdicionais, setDiasAdicionais] = useState('0');
    const [status, setStatus] = useState('Em Análise');
    const [dataEvento, setDataEvento] = useState(new Date().toISOString().split('T')[0]);

    const loadData = async () => {
        setIsLoading(true);
        const res = await getContractHistory(projectId);
        if (res.success) {
            setProject(res.project);
        } else {
            alert("Erro ao carregar histórico: " + res.error);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const stats = useMemo(() => {
        if (!project) return { baseValue: 0, additivesValue: 0, totalContratado: 0, totalMedido: 0, saldoAMedir: 0, novaDataEntrega: null, baseDays: 0, additionalDays: 0 };

        // RECUPERAÇÃO DE VALORES (ALMAVIVA): Se initialValue for nulo/0, usa a soma dos itens
        const sumVendaBudget = (project.budgetItems || []).reduce((acc: number, it: any) => acc + (it.valorVenda ?? 0), 0);
        const baseValue = (project.initialValue ?? 0) > 0 ? project.initialValue : sumVendaBudget;
        
        const approvedEvents = (project.contractEvents || []).filter((e: any) => e.status === 'Aprovado');
        
        const additivesValue = approvedEvents.filter((e: any) => e.tipo === 'Valor').reduce((acc: number, e: any) => acc + (e.valorAdicional ?? 0), 0);
        const totalContratado = baseValue + additivesValue;

        const baseDays = project.executionDays ?? 0;
        const additionalDays = approvedEvents.filter((e: any) => e.tipo === 'Prazo').reduce((acc: number, e: any) => acc + (e.diasAdicionais ?? 0), 0);
        
        let novaDataEntrega = null;
        if (project.osDate) {
            // Tratamento de data seguro para evitar erro de fuso horário
            const d = new Date(project.osDate);
            const year = d.getUTCFullYear();
            const month = d.getUTCMonth();
            const day = d.getUTCDate();
            
            novaDataEntrega = new Date(year, month, day + baseDays + additionalDays, 12, 0, 0);
        }

        const financials = project.financials || [];
        const measurementRecords = financials.filter((f: any) => f.classificacaoDRE?.toUpperCase() === '1. RECEITA OPERACIONAL');
        const releaseRecords = financials.filter((f: any) => f.classificacaoDRE?.toUpperCase() === '1. RECEITA OPERACIONAL (RESGATE DE CAUÇÃO)');

        const totalMedido = measurementRecords.reduce((acc: number, curr: any) => acc + (curr.valorBruto ?? 0), 0);
        const totalRetido = measurementRecords.reduce((acc: number, curr: any) => acc + (curr.caucaoRetida ?? 0), 0);
        const totalLiberado = releaseRecords.reduce((acc: number, curr: any) => acc + (curr.valorBruto ?? 0), 0);

        return { 
            baseValue: baseValue ?? 0, 
            additivesValue: additivesValue ?? 0, 
            totalContratado: totalContratado ?? 0, 
            totalMedido: totalMedido ?? 0, 
            totalRetido: totalRetido ?? 0,
            totalLiberado: totalLiberado ?? 0,
            saldoAResgatar: (totalRetido ?? 0) - (totalLiberado ?? 0),
            saldoAMedir: (totalContratado ?? 0) - (totalMedido ?? 0), 
            novaDataEntrega,
            baseDays,
            additionalDays
        };
    }, [project]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await createContractEvent({
                projectId: Number(projectId),
                tipo,
                descricao,
                valorAdicional: parseFloat(valorAdicional) || 0,
                diasAdicionais: parseInt(diasAdicionais) || 0,
                status,
                data: dataEvento ? new Date(dataEvento + 'T12:00:00').toISOString() : undefined
            });

            if (res.success) {
                alert("Evento registrado com sucesso!");
                setIsModalOpen(false);
                resetForm();
                loadData();
            } else {
                alert("Erro ao salvar: " + res.error);
            }
        } catch (error: any) {
            alert("Erro crítico: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDeleteId) return;
        
        setIsSaving(true);
        try {
            const response = deleteType === 'event' 
                ? await fetch(`/api/projects/events/${itemToDeleteId}`, { method: 'DELETE' })
                : await deleteContractMeasurement(itemToDeleteId, Number(projectId));

            if (deleteType === 'event' ? (response as Response).ok : (response as any).success) {
                setProject((prev: any) => ({
                    ...prev,
                    contractEvents: deleteType === 'event' ? prev.contractEvents.filter((ev: any) => ev.id !== itemToDeleteId) : prev.contractEvents,
                    financials: deleteType === 'measurement' ? prev.financials.filter((m: any) => m.id !== itemToDeleteId) : prev.financials
                }));
                setIsDeleteModalOpen(false);
                setItemToDeleteId(null);
            } else {
                alert("Erro ao excluir.");
            }
        } catch (error: any) {
            console.error("Erro na exclusão:", error);
            alert("Falha na comunicação com o servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMeasurementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const vBruto = parseFloat(valorBrutoMedicao) || 0;
        const vRetencao = (vBruto * (project.retentionPercent || 0)) / 100;
        const vImpostos = (vBruto * (project.taxPercent || 0)) / 100;
        const vLiquido = vBruto - vRetencao - vImpostos;

        try {
            const res = await createContractMeasurement({
                projectId: Number(projectId),
                numeroMedicao: numBM,
                dataMedicao,
                valorBruto: vBruto,
                valorRetencao: vRetencao,
                valorImpostos: vImpostos,
                valorLiquido: vLiquido,
                status: statusMedicao,
                expectedDate: expectedRetentionDate
            });

            if (res.success) {
                alert("Medição registrada e integrada ao financeiro!");
                setIsMeasurementModalOpen(false);
                loadData();
            } else {
                alert("Erro ao salvar medição: " + res.error);
            }
        } catch (error: any) {
            alert("Erro crítico: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setTipo('Valor');
        setDescricao('');
        setValorAdicional('0');
        setDiasAdicionais('0');
        setStatus('Em Análise');
        setDataEvento(new Date().toISOString().split('T')[0]);
    };

    const handleReleaseRetention = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!retentionToRelease) return;
        
        setIsSaving(true);
        try {
            const res = await releaseRetention({
                projectId: Number(projectId),
                bmNumber: retentionToRelease.bmNumber,
                amount: retentionToRelease.amount,
                date: releaseDate
            });

            if (res.success) {
                alert("Solicitação de resgate de retenção enviada ao financeiro!");
                setIsReleaseModalOpen(false);
                loadData();
            } else {
                alert("Erro ao liberar retenção: " + res.error);
            }
        } catch (error: any) {
            alert("Erro crítico: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    if (isLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (!project) return <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col items-center justify-center gap-4 text-slate-500"><AlertCircle size={48}/><p>Projeto não encontrado.</p><button onClick={() => router.back()} className="text-blue-500 font-bold">Voltar</button></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans pb-20">
            {/* HEADER */}
            <header className="min-h-[5rem] py-4 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center px-8 sticky top-0 z-40 shadow-sm">
                <Link href="/comercial" className="mr-6 text-slate-400 hover:text-blue-500 transition-colors"><ArrowLeft size={24} /></Link>
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <Link href="/comercial" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-500">Comercial</Link>
                        <ChevronRight size={10} className="text-slate-300"/>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Histórico do Contrato</span>
                    </div>
                    <h1 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                        {project.name}
                        {project.status && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-1 rounded-md tracking-widest">
                                {project.status}
                            </span>
                        )}
                    </h1>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {project.clientName && <span><span className="text-slate-300 dark:text-slate-600">Cliente:</span> {project.clientName}</span>}
                        {project.signatureDate && <span><span className="text-slate-300 dark:text-slate-600">Assinatura:</span> {new Date(project.signatureDate).toLocaleDateString('pt-BR')}</span>}
                        {project.osDate && <span><span className="text-slate-300 dark:text-slate-600">Ordem de Serviço:</span> {new Date(project.osDate).toLocaleDateString('pt-BR')}</span>}
                    </div>
                </div>
                <div className="ml-auto flex gap-3">
                    {project.contractFileUrl && (
                        <a 
                            href={`/api/contract-download?url=${encodeURIComponent(project.contractFileUrl)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                        >
                            <FileText size={18}/> Baixar Contrato
                        </a>
                    )}
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
                    >
                        <Plus size={18}/> Registrar Evento / Aditivo
                    </button>
                </div>
            </header>

            <div className="p-8 max-w-[1400px] mx-auto space-y-8">
                
                {/* SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* FINANCEIRO MACRO */}
                    <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo Financeiro Contratual</p>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Gestão de Aditivos</h2>
                            </div>
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                                <DollarSign size={24}/>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Valor Base (Original)</p>
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-400">{formatter.format(stats.baseValue)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-emerald-500 uppercase mb-1">+ Aditivos Aprovados</p>
                                    <p className="text-lg font-black text-emerald-600">{formatter.format(stats.additivesValue)}</p>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Contratado Atualizado</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{formatter.format(stats.totalContratado)}</p>
                                </div>

                                <div className="mt-3 mb-2 flex gap-2">
                                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        Impostos: {project.taxPercent || 0}%
                                    </span>
                                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        Retenção Téc.: {project.retentionPercent || 0}%
                                    </span>
                                </div>
                                
                                {/* BARRA DE PROGRESSO DE MEDIÇÃO */}
                                <div className="mt-6">
                                    <div className="flex justify-between text-[10px] font-black uppercase mb-2">
                                        <span className="text-emerald-500 font-black">Medido: {formatter.format(stats.totalMedido)}</span>
                                        <span className="text-slate-400">Saldo: {formatter.format(stats.saldoAMedir)}</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                            style={{ width: `${stats.totalContratado > 0 ? Math.min(100, (stats.totalMedido / stats.totalContratado) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 mt-2 italic text-center">
                                        {stats.totalContratado > 0 ? Math.round((stats.totalMedido / stats.totalContratado) * 100) : 0}% do contrato já foi medido e faturado.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRAZO MACRO */}
                    <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Resumo de Prazo Contratual</p>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Linha do Tempo Legal</h2>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                                <Calendar size={24}/>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Prazo Inicial</p>
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-400">{stats.baseDays} Dias Corridos</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-blue-500 uppercase mb-1">+ Dias Aditados</p>
                                    <p className="text-lg font-black text-blue-600">{stats.additionalDays} Dias</p>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 mb-2">
                                    <p className="text-[11px] font-black text-slate-400 uppercase">Nova Data de Entrega Prevista</p>
                                    {project.osDate ? (
                                        <span className="text-[9px] font-bold text-slate-400 lowercase">(Base: Data OS)</span>
                                    ) : (
                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black tracking-widest uppercase animate-pulse">Aguardando OS</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {stats.novaDataEntrega ? stats.novaDataEntrega.toLocaleDateString('pt-BR') : '--/--/----'}
                                    </span>
                                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        <p className="text-[9px] font-black text-slate-500 uppercase leading-none mb-0.5">Total Prazo</p>
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">{stats.baseDays + stats.additionalDays} Dias</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RESGATE DE RETENÇÕES */}
                    <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Retenções Técnicas (Caução)</p>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white">Resgate de Saldo</h2>
                            </div>
                            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl">
                                <Clock size={24}/>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">Total Retido (Nas BMs)</p>
                                    <p className="text-lg font-black text-slate-600 dark:text-slate-400">{formatter.format(stats.totalRetido)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold text-emerald-500 uppercase mb-1">Total Liberado</p>
                                    <p className="text-lg font-black text-emerald-600">{formatter.format(stats.totalLiberado)}</p>
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-slate-100 dark:border-slate-700">
                                <p className="text-[11px] font-black text-slate-400 uppercase mb-2">Saldo Líquido a Resgatar</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-4xl font-black text-orange-600 dark:text-orange-500 tracking-tighter">
                                        {formatter.format(stats.saldoAResgatar ?? 0)}
                                    </span>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        Liberação: {project.retentionRule === 'AT_END' ? 'Fim da Obra' : 'Por Medição'}
                                    </span>
                                    <span className="px-2 py-1 bg-slate-50 dark:bg-slate-800/50 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                        Prazo: +{project.retentionDays || 0} Dias
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* EVENTS TABLE */}
                <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <Clock size={18} className="text-blue-500"/> Registro de Eventos e Aditivos
                        </h3>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase">
                            {project.contractEvents?.length || 0} Registros
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição / Motivação</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Adic.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Dias Adic.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {project.contractEvents?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic text-sm">
                                            Nenhum evento contratual registrado para esta obra.
                                        </td>
                                    </tr>
                                ) : (
                                    project.contractEvents.map((event: any) => (
                                        <tr key={event.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-5 text-xs font-bold text-slate-500">
                                                {new Date(event.data).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                                    event.tipo === 'Valor' ? 'bg-emerald-50 text-emerald-600' :
                                                    event.tipo === 'Prazo' ? 'bg-blue-50 text-blue-600' :
                                                    'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {event.tipo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                {event.descricao}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-sm text-slate-800 dark:text-slate-200">
                                                {event.valorAdicional !== 0 ? formatter.format(event.valorAdicional) : '---'}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-sm text-slate-800 dark:text-slate-200">
                                                {event.diasAdicionais !== 0 ? `+${event.diasAdicionais}d` : '---'}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    event.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                                                    event.status === 'Reprovado' ? 'bg-red-100 text-red-700' :
                                                    'bg-amber-100 text-amber-700 animate-pulse'
                                                }`}>
                                                    {event.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault(); 
                                                        e.stopPropagation(); 
                                                        setItemToDeleteId(event.id);
                                                        setDeleteType('event');
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all cursor-pointer relative z-[50]"
                                                    title="Excluir Evento"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MEASUREMENTS SECTION */}
                <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/20 dark:bg-emerald-900/10">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <FileText size={18} className="text-emerald-500"/> Boletins de Medição (BM)
                        </h3>
                        <button 
                            onClick={() => {
                                setNumBM((project.financials?.length + 1).toString());
                                setIsMeasurementModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Plus size={14}/> Nova Medição
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº da BM</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Bruto (R$)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Retenção (R$)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Impostos (R$)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-emerald-600">Líquido (R$)</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {project.financials?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic text-xs">
                                            Nenhum lançamento de BM encontrado no financeiro desta obra.
                                        </td>
                                    </tr>
                                ) : (
                                    project.financials.map((m: any) => (
                                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-slate-200">
                                                {m.descricao}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-sm text-slate-600 dark:text-slate-400">
                                                {formatter.format(m.valorBruto)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-sm text-red-400">
                                                {formatter.format(m.caucaoRetida)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-sm text-amber-500">
                                                {formatter.format((m.impostosRetidos || 0) + (m.iss || 0) + (m.inss || 0))}
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-sm text-emerald-600">
                                                {formatter.format(m.valorLiquido)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    m.status === 'Recebido' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-amber-100 text-amber-700 animate-pulse'
                                                }`}>
                                                    {m.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { 
                                                        e.preventDefault(); 
                                                        e.stopPropagation(); 
                                                        setItemToDeleteId(m.id);
                                                        setDeleteType('measurement');
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* RETENTIONS HISTORY SECTION */}
                <div className="bg-white dark:bg-[#162032] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-orange-50/20 dark:bg-orange-900/10">
                        <h3 className="font-black text-sm uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-2">
                            <Clock size={18} className="text-orange-500"/> Histórico de Retenções (Caução)
                        </h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origem</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Retenção</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Retido</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Previsão</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {project.financials?.filter((f: any) => (f.caucaoRetida || 0) > 0).length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic text-xs">
                                            Nenhuma retenção técnica identificada nos faturamentos.
                                        </td>
                                    </tr>
                                ) : (
                                    project.financials.filter((f: any) => (f.caucaoRetida || 0) > 0).map((m: any) => {
                                        // Verificar se já existe um resgate para esta BM
                                        const bmMatch = m.descricao?.match(/BM(\d+)/);
                                        const bmNum = bmMatch ? bmMatch[1] : null;
                                        const isReleased = project.financials.some((f: any) => 
                                            f.classificacaoDRE?.toUpperCase() === '1. RECEITA OPERACIONAL (RESGATE DE CAUÇÃO)' && 
                                            f.descricao?.includes(`BM ${bmNum}`)
                                        );

                                        return (
                                            <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-4 text-sm font-black text-slate-800 dark:text-slate-200 uppercase">
                                                    {m.descricao}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-500">
                                                    {m.dataCompetencia ? new Date(m.dataCompetencia).toLocaleDateString('pt-BR') : '---'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-sm text-orange-600">
                                                    {formatter.format(m.caucaoRetida)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {m.expectedDate ? (
                                                        <span className={`text-[10px] font-black ${
                                                            new Date(m.expectedDate) < new Date() && !isReleased
                                                            ? 'text-red-500 animate-pulse' 
                                                            : 'text-emerald-600'
                                                        }`}>
                                                            {new Date(m.expectedDate).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px]">---</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        isReleased ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {isReleased ? 'Liberado' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {!isReleased && (
                                                        <button 
                                                            onClick={() => {
                                                                setRetentionToRelease({ bmNumber: bmNum, amount: m.caucaoRetida });
                                                                setIsReleaseModalOpen(true);
                                                            }}
                                                            className="text-[9px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm"
                                                        >
                                                            Liberar p/ Faturamento
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL NOVO EVENTO */}
            {isModalOpen && (
                <Modal title="Registrar Evento Contratual" onClose={() => setIsModalOpen(false)} maxWidth="max-w-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tipo de Evento</label>
                                <select 
                                    value={tipo} 
                                    onChange={e => setTipo(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                >
                                    <option value="Valor">Aditivo de Valor</option>
                                    <option value="Prazo">Aditivo de Prazo</option>
                                    <option value="Pleito">Pleito / Notificação</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data do Evento</label>
                                <input 
                                    type="date" 
                                    value={dataEvento} 
                                    onChange={e => setDataEvento(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Descrição / Motivação Legal</label>
                            <textarea 
                                required
                                rows={3}
                                placeholder="Descreva o motivo do aditivo ou pleito..."
                                value={descricao} 
                                onChange={e => setDescricao(e.target.value)}
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Valor Adicional (R$)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    value={valorAdicional} 
                                    onChange={e => setValorAdicional(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dias Adicionais</label>
                                <input 
                                    type="number" 
                                    value={diasAdicionais} 
                                    onChange={e => setDiasAdicionais(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-blue-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Status do Evento</label>
                            <div className="flex gap-2">
                                {['Em Análise', 'Aprovado', 'Reprovado'].map(s => (
                                    <button 
                                        key={s}
                                        type="button"
                                        onClick={() => setStatus(s)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                            status === s 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-500'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Registrando...' : <><CheckCircle2 size={18}/> Confirmar Registro</>}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
            {isDeleteModalOpen && (
                <Modal title="Confirmar Exclusão" onClose={() => { setIsDeleteModalOpen(false); setItemToDeleteId(null); }} maxWidth="max-w-md">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl">
                            <AlertCircle size={32} />
                            <p className="text-sm font-bold leading-tight">
                                Tem certeza que deseja excluir este aditivo? Esta ação removerá o registro permanentemente e atualizará os totais do contrato.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                type="button"
                                onClick={() => { setIsDeleteModalOpen(false); setItemToDeleteId(null); }}
                                className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-100 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="button"
                                onClick={handleDelete}
                                disabled={isSaving}
                                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/20 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Excluindo...' : 'Sim, Excluir'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL NOVA MEDIÇÃO */}
            {isMeasurementModalOpen && (
                <Modal title="Registrar Boletim de Medição (BM)" onClose={() => setIsMeasurementModalOpen(false)} maxWidth="max-w-xl">
                    <form onSubmit={handleMeasurementSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nº da Medição (BM)</label>
                                <input 
                                    type="number" 
                                    required
                                    value={numBM} 
                                    onChange={e => setNumBM(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data da Medição</label>
                                <input 
                                    type="date" 
                                    required
                                    value={dataMedicao} 
                                    onChange={e => setDataMedicao(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Valor Bruto Medido (R$)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    required
                                    value={valorBrutoMedicao} 
                                    onChange={e => setValorBrutoMedicao(e.target.value)}
                                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-lg font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* RESUMO DE CÁLCULO EM TEMPO REAL */}
                        <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Retenção Técnica ({project.retentionPercent}%)</span>
                                <span className="text-red-500">-{formatter.format((parseFloat(valorBrutoMedicao) || 0) * (project.retentionPercent || 0) / 100)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-400 uppercase tracking-widest">Impostos ({project.taxPercent}%)</span>
                                <span className="text-amber-500">-{formatter.format((parseFloat(valorBrutoMedicao) || 0) * (project.taxPercent || 0) / 100)}</span>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valor Líquido a Receber</span>
                                <span className="text-xl font-black text-emerald-600">
                                    {formatter.format(
                                        (parseFloat(valorBrutoMedicao) || 0) - 
                                        ((parseFloat(valorBrutoMedicao) || 0) * (project.retentionPercent || 0) / 100) -
                                        ((parseFloat(valorBrutoMedicao) || 0) * (project.taxPercent || 0) / 100)
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* PREVISÃO DE RECEBIMENTO DA CAUÇÃO */}
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                                Previsão de Recebimento da Caução
                            </label>
                            {project.retentionRule === 'AT_END' ? (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 font-bold flex items-center gap-2">
                                    <Clock size={14}/>
                                    <span>Previsão: {expectedRetentionDate ? new Date(expectedRetentionDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Indefinida'} (Regra: Final do Contrato)</span>
                                </div>
                            ) : (
                                <input 
                                    type="date" 
                                    required
                                    value={expectedRetentionDate} 
                                    onChange={e => setExpectedRetentionDate(e.target.value)}
                                    className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Status de Recebimento</label>
                            <div className="flex gap-2">
                                {['A Receber', 'Recebido'].map(s => (
                                    <button 
                                        key={s}
                                        type="button"
                                        onClick={() => setStatusMedicao(s)}
                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                            statusMedicao === s 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-blue-500'
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                type="button" 
                                onClick={() => setIsMeasurementModalOpen(false)} 
                                className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Registrando...' : <><CheckCircle2 size={18}/> Confirmar Medição</>}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL LIBERAR RETENÇÃO */}
            {isReleaseModalOpen && (
                <Modal title="Confirmar Resgate de Retenção" onClose={() => setIsReleaseModalOpen(false)} maxWidth="max-w-md">
                    <form onSubmit={handleReleaseRetention} className="space-y-6">
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30">
                            <p className="text-xs text-orange-800 dark:text-orange-400 font-medium leading-relaxed">
                                Você está solicitando a liberação da retenção técnica referente à <strong>BM {retentionToRelease?.bmNumber}</strong> no valor de <strong>{formatter.format(retentionToRelease?.amount)}</strong>.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Data Prevista do Resgate</label>
                            <input 
                                type="date" 
                                required
                                value={releaseDate} 
                                onChange={e => setReleaseDate(e.target.value)} 
                                className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                type="button" 
                                onClick={() => setIsReleaseModalOpen(false)}
                                className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? 'Processando...' : 'Confirmar Resgate'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

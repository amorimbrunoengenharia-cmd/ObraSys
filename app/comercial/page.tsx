"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/navigation';
import { canAccessPage } from '../../lib/permissions';
import { getProjectsWithBudget, createProjectWithBudget, updateProjectWithBudget, deleteProject } from '../actions/commercial';
import { getEstimates } from '../actions/estimate';
import { exportComercialToObsidian } from '../actions/obsidian';
import { Building2, Plus, ArrowLeft, Target, Briefcase, FileText, CheckCircle2, Trash2, BookOpen, RefreshCw, DollarSign, Calendar, Pencil, Map, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '../../components/Shared';
import MapWrapper from '../../components/MapWrapper';

export default function ComercialPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    const [projects, setProjects] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<'obras' | 'sedes'>('obras');

    const [estimates, setEstimates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCreatingSede, setIsCreatingSede] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [estimateId, setEstimateId] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncDone, setSyncDone] = useState(false);

    const handleObsidianSync = async () => {
        setIsSyncing(true);
        setSyncDone(false);
        await exportComercialToObsidian();
        setIsSyncing(false);
        setSyncDone(true);
        setTimeout(() => setSyncDone(false), 3000);
    };

    // Form State
    const [projectName, setProjectName] = useState('');
    const [clientName, setClientName] = useState('');
    const [status, setStatus] = useState('Em Orçamento');
    const [initialValue, setInitialValue] = useState('');
    const [retentionPercent, setRetentionPercent] = useState('0');
    const [signatureDate, setSignatureDate] = useState('');
    const [osDate, setOsDate] = useState('');
    const [executionDays, setExecutionDays] = useState('0');
    const [taxPercent, setTaxPercent] = useState('0');
    const [retentionRule, setRetentionRule] = useState('AT_END');
    const [retentionDays, setRetentionDays] = useState('0');
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [cep, setCep] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
    const [loadingGeocode, setLoadingGeocode] = useState(false);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const [showMiniMap, setShowMiniMap] = useState(false);

    const [budgetItems, setBudgetItems] = useState<any[]>([
        { classificacaoDRE: '1. Receita Operacional', subItem: '', valorOrcado: '', valorVenda: '' }
    ]);

    const estimatedDelivery = useMemo(() => {
        if (!osDate || !executionDays) return null;
        try {
            const date = new Date(osDate);
            if (isNaN(date.getTime())) return null;
            date.setDate(date.getDate() + parseInt(executionDays || '0'));
            return date.toLocaleDateString('pt-BR');
        } catch (e) {
            return null;
        }
    }, [osDate, executionDays]);

    const loadData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [projs, ests] = await Promise.all([
                getProjectsWithBudget(),
                (async () => {
                    const { getEstimates } = await import('../actions/estimate');
                    return await getEstimates();
                })()
            ]);
            setProjects(projs);
            setEstimates(ests);
        } catch (e) {
            console.error(e);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login');
            return;
        }

        if (user && !canAccessPage(user.role, 'comercial')) {
            alert("Acesso Negado. Sem permissão para esta página.");
            router.push('/');
            return;
        }

        loadData();
    }, [user, isAuthLoading, router, loadData]);

    const handleAddBudgetItem = () => {
        setBudgetItems([...budgetItems, { classificacaoDRE: '3. Custo Direto - Mão de Obra', subItem: '', valorOrcado: '', valorVenda: '' }]);
    };

    const handleRemoveBudgetItem = (index: number) => {
        const newItems = budgetItems.filter((_, i) => i !== index);
        setBudgetItems(newItems);
    };

    const handleItemChange = (index: number, field: string, value: string) => {
        const newItems = [...budgetItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setBudgetItems(newItems);
    };


    const autoTotalVenda = useMemo(() => {
        return budgetItems.reduce((acc, it) => acc + (parseFloat(it.valorVenda) || 0), 0);
    }, [budgetItems]);

    const autoTotalOrcado = useMemo(() => {
        return budgetItems.reduce((acc, it) => acc + (parseFloat(it.valorOrcado) || 0), 0);
    }, [budgetItems]);

    const handleGeocode = async () => {
        setLoadingGeocode(true);
        setLocationConfirmed(false);
        try {
            const fullAddress = `${street}, ${number}, ${city}, ${state}, ${cep}`;
            
            // Tenta 1: Nominatim com endereço completo
            const query = encodeURIComponent(fullAddress);
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`);
            let data = await res.json();

            // Tenta 2: Apenas Cidade e Estado se falhar
            if (!data || data.length === 0) {
                const simplified = encodeURIComponent(`${city}, ${state}`);
                const res2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${simplified}&format=json&limit=1`);
                data = await res2.json();
            }

            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                const nLat = parseFloat(lat);
                const nLng = parseFloat(lon);
                setCoords({ lat: nLat, lng: nLng });
                setLatitude(lat);
                setLongitude(lon);
                setLocationConfirmed(true);
                setShowMiniMap(true);
            } else {
                // SAÍDA DE EMERGÊNCIA: Sede em Araçatuba
                const confirmFallback = window.confirm("Não encontramos o ponto exato. Deseja marcar a sede da empresa (Araçatuba/SP) e ajustar o Pin manualmente?");
                if (confirmFallback) {
                    const fallback = { lat: -21.2089, lng: -50.4404 };
                    setCoords(fallback);
                    setLatitude(fallback.lat.toString());
                    setLongitude(fallback.lng.toString());
                    setLocationConfirmed(true);
                    setShowMiniMap(true);
                }
            }
        } catch (e: any) {
            console.error("ERRO CRÍTICO GEOLOCALIZAÇÃO:", e);
            alert("Erro de conexão com o serviço de mapas. Tente inserir as coordenadas manualmente.");
        } finally {
            setLoadingGeocode(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            let uploadedUrl = null;
            
            // 1. Upload do Arquivo se existir
            if (contractFile) {
                const formData = new FormData();
                formData.append('file', contractFile);
                
                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                if (uploadRes.ok) {
                    const data = await uploadRes.json();
                    uploadedUrl = data.url;
                } else {
                    console.error("Falha no upload do contrato");
                }
            }

            const payload = {
                name: projectName,
                clientName,
                status,
                initialValue: autoTotalVenda,
                retentionPercent: parseFloat(retentionPercent) || 0,
                taxPercent: parseFloat(taxPercent) || 0,
                retentionRule,
                retentionDays: parseInt(retentionDays) || 0,
                signatureDate: signatureDate ? new Date(signatureDate + 'T12:00:00').toISOString() : undefined,
                osDate: osDate ? new Date(osDate + 'T12:00:00').toISOString() : undefined,
                executionDays: parseInt(executionDays) || 0,
                estimatedDelivery: osDate && executionDays ? (function() {
                    const d = new Date(osDate + 'T12:00:00');
                    d.setDate(d.getDate() + parseInt(executionDays));
                    return d.toISOString();
                })() : undefined,
                contractFileUrl: uploadedUrl,
                budgetItems: budgetItems.map(it => ({
                    classificacaoDRE: it.classificacaoDRE,
                    subItem: it.subItem,
                    valorOrcado: parseFloat(it.valorOrcado) || 0,
                    valorVenda: parseFloat(it.valorVenda) || 0
                })),
                address: JSON.stringify({ street, number, cep, city, state }),
                city,
                state,
                latitude: parseFloat(latitude) || undefined,
                longitude: parseFloat(longitude) || undefined,

                estimateId: estimateId || undefined
            };

            console.log("DEBUG: Iniciando salvamento...", payload);
            
            if (!projectName) {
                setIsSaving(false);
                return alert("O nome da obra é obrigatório!");
            }

            console.log("DEBUG: Chamando Server Action...");
            const res = isEditMode && selectedProjectId 
                ? await updateProjectWithBudget(selectedProjectId.toString(), payload)
                : await createProjectWithBudget(payload);

            console.log("DEBUG: Resposta recebida:", res);

            if (res.success) {
                console.log("DEBUG: Sucesso! Atualizando listagem...");
                await loadData();
                resetForm();
                setIsModalOpen(false);
                alert(isEditMode ? "Contrato atualizado com sucesso!" : "Nova Obra e Orçamento cadastrados com sucesso!");
            } else {
                console.error("DEBUG: Erro retornado:", res.error);
                alert("Erro ao salvar o contrato: " + res.error);
            }
        } catch (error: any) {
            console.error("DEBUG: Exceção no handleSubmit:", error);
            alert("ERRO DE CONEXÃO OU SISTEMA: " + (error.message || error));
        } finally {
            setIsSaving(false);
        }
    };

    const resetForm = () => {
        setProjectName('');
        setClientName('');
        setStatus('Em Orçamento');
        setInitialValue('');
        setRetentionPercent('0');
        setSignatureDate('');
        setOsDate('');
        setExecutionDays('0');
        setTaxPercent('0');
        setRetentionRule('AT_END');
        setRetentionDays('0');
        setBudgetItems([{ classificacaoDRE: '1. RECEITA OPERACIONAL', subItem: '', valorOrcado: '', valorVenda: '' }]);
        setStreet('');
        setNumber('');
        setCep('');
        setCity('');
        setState('');
        setLatitude('');
        setLongitude('');

        setEstimateId('');
        setLocationConfirmed(false);
        setShowMiniMap(false);
        setIsEditMode(false);
        setIsCreatingSede(false);
        setSelectedProjectId(null);
    };

    const handleEdit = (project: any) => {
        setProjectName(project.name);
        setClientName(project.clientName || '');
        setStatus(project.status || 'Em Orçamento');
        setInitialValue(project.initialValue?.toString() || '');
        setRetentionPercent(project.retentionPercent?.toString() || '0');
        setSignatureDate(project.signatureDate ? new Date(project.signatureDate).toISOString().split('T')[0] : '');
        setOsDate(project.osDate ? new Date(project.osDate).toISOString().split('T')[0] : '');
        setExecutionDays(project.executionDays?.toString() || '0');
        setTaxPercent(project.taxPercent?.toString() || '0');
        setRetentionRule(project.retentionRule || 'AT_END');
        setRetentionDays(project.retentionDays?.toString() || '0');
        
        if (project.estimates && project.estimates.length > 0) {
            setEstimateId(project.estimates[0].id);
        } else {
            setEstimateId('');
        }

        if (project.budgetItems && project.budgetItems.length > 0) {
            setBudgetItems(project.budgetItems.map((it: any) => ({
                classificacaoDRE: it.classificacaoDRE,
                subItem: it.subItem || '',
                valorOrcado: it.valorOrcado?.toString() || '',
                valorVenda: it.valorVenda?.toString() || ''
            })));
        } else {
            setBudgetItems([{ classificacaoDRE: '1. RECEITA OPERACIONAL', subItem: '', valorOrcado: '', valorVenda: '' }]);
        }

        setIsEditMode(true);
        setIsCreatingSede((project.name || '').toUpperCase().startsWith('SEDE') && !(project.name || '').toUpperCase().includes('REFORMA'));
        setSelectedProjectId(project.id);
        
        let parsedAddr: any = {};
        try {
            parsedAddr = JSON.parse(project.address || '{}');
        } catch {
            parsedAddr = { street: project.address || '' };
        }
        setStreet(parsedAddr.street || '');
        setNumber(parsedAddr.number || '');
        setCep(parsedAddr.cep || '');
        setCity(parsedAddr.city || project.city || '');
        setState(parsedAddr.state || project.state || '');

        setLatitude(project.latitude?.toString() || '');
        setLongitude(project.longitude?.toString() || '');

        setIsModalOpen(true);
    };

    const handleDelete = async (id: number, name: string) => {
        if (window.confirm(`TEM CERTEZA? Isso excluirá permanentemente o contrato "${name}" e TODOS os dados vinculados (Financeiro, RDO, GED, etc). Esta ação não pode ser desfeita.`)) {
            const res = await deleteProject(id);
            if (res.success) {
                alert("Contrato excluído com sucesso.");
                loadData();
            } else {
                alert("Erro ao excluir: " + res.error);
            }
        }
    };

    if (isLoading || isAuthLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans">
            {/* HEADER */}
            <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center px-8 sticky top-0 z-40 shadow-sm">
                <Link href="/" className="mr-6 text-slate-400 hover:text-emerald-500 transition-colors"><ArrowLeft size={24} /></Link>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><Briefcase className="text-blue-500"/> Comercial & Contratos</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Gestão de Portfólio e Orçamentos Base</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={handleObsidianSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all"
                    >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                        {isSyncing ? 'Exportando...' : syncDone ? '✅ Exportado!' : '📓 Exportar Obsidian'}
                    </button>
                    {!['Gerente de Obras', 'Coordenador de Obras', 'Engenheiro', 'Engenheiro Residente'].includes(user?.role || '') && (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }} 
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
                            >
                                <Plus size={18}/> Novo Contrato / Obra
                            </button>
                            <button 
                                onClick={() => {
                                    resetForm();
                                    setProjectName('SEDE - ');
                                    setClientName('Uso Interno');
                                    setStatus('Em Execução');
                                    setIsCreatingSede(true);
                                    setIsModalOpen(true);
                                }} 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all transform active:scale-95"
                            >
                                <Building2 size={18}/> Nova Sede / Escritório
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="p-8 max-w-[1600px] mx-auto">
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-800">
                    <button 
                        onClick={() => setViewMode('obras')}
                        className={`pb-3 px-2 font-bold text-sm uppercase tracking-widest transition-all ${viewMode === 'obras' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        Obras de Clientes
                    </button>
                    <button 
                        onClick={() => setViewMode('sedes')}
                        className={`pb-3 px-2 font-bold text-sm uppercase tracking-widest transition-all ${viewMode === 'sedes' ? 'border-b-2 border-emerald-500 text-emerald-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                    >
                        Sedes e Escritórios Internos
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects.filter(p => {
                        const isSede = p.name && p.name.toUpperCase().startsWith('SEDE') && !p.name.toUpperCase().includes('REFORMA');
                        return viewMode === 'sedes' ? isSede : !isSede;
                    }).map((p) => {
                        // CÁLCULO DINÂMICO RELACIONAL + ADITIVOS (Etapa 3)
                        const baseVenda = p.budgetItems?.reduce((acc: number, it: any) => acc + (it.valorVenda || 0), 0) || 0;
                        const approvedEvents = p.contractEvents?.filter((e: any) => e.status === 'Aprovado') || [];
                        const additivesValue = approvedEvents.reduce((acc: number, e: any) => acc + (e.valorAdicional || 0), 0);
                        const totalVenda = baseVenda + additivesValue;

                        const totalOrcado = p.budgetItems?.reduce((acc: number, it: any) => acc + (it.valorOrcado || 0), 0) || 0;

                        // Lógica da Barra de Progresso (Macro Contratual)
                        let progress = 0;
                        let isLate = false;
                        let showProgress = false;

                        if (p.osDate) {
                            const additionalDays = approvedEvents.reduce((acc: number, e: any) => acc + (e.diasAdicionais || 0), 0);
                            const start = new Date(p.osDate).getTime();
                            
                            // Data de entrega baseada no prazo inicial + aditivos
                            const baseDelivery = p.estimatedDelivery ? new Date(p.estimatedDelivery) : new Date(start);
                            const finalDeliveryDate = new Date(baseDelivery.getTime());
                            if (additionalDays > 0) {
                                finalDeliveryDate.setDate(finalDeliveryDate.getDate() + additionalDays);
                            }
                            
                            const end = finalDeliveryDate.getTime();
                            const today = new Date().getTime();
                            
                            if (today > end) {
                                progress = 100;
                                isLate = true;
                                showProgress = true;
                            } else if (today >= start) {
                                const total = end - start;
                                const elapsed = today - start;
                                progress = Math.min(100, Math.round((elapsed / total) * 100));
                                showProgress = true;
                            } else {
                                progress = 0;
                                showProgress = true;
                            }
                            
                            // Atualizamos o objeto p temporariamente para exibição do cronograma aditado
                            p.displayDeliveryDate = finalDeliveryDate;
                        }

                        // Cores do Status (Incluindo mapeamento legado)
                        const getStatusClasses = (status: string) => {
                            const s = status?.toUpperCase();
                            if (s === 'EM ANDAMENTO' || s === 'EM EXECUÇÃO') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
                            
                            switch(status) {
                                case 'Em Orçamento': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
                                case 'Assinado': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
                                case 'Paralisado': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                                case 'Concluído': return 'bg-emerald-800 text-white dark:bg-emerald-900 dark:text-emerald-200';
                                case 'Distrato': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
                                default: return 'bg-slate-100 text-slate-700';
                            }
                        };

                        const financials = p.financials || [];
                        const totalRetido = financials.filter((f: any) => f.classificacaoDRE === '1. RECEITA OPERACIONAL' || f.classificacaoDRE === '1. Receita Operacional').reduce((acc: number, f: any) => acc + (f.caucaoRetida || 0), 0);
                        const totalLiberado = financials.filter((f: any) => f.classificacaoDRE === '1. RECEITA OPERACIONAL (Resgate de Caução)' || f.classificacaoDRE === '1. Receita Operacional (Resgate de Caução)').reduce((acc: number, f: any) => acc + (f.valorBruto || 0), 0);
                        const saldoCaucao = totalRetido - totalLiberado;

                        return (
                            <div key={p.id} className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 hover:shadow-xl transition-all group flex flex-col justify-between h-full relative">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h3 className="font-black text-sm text-slate-800 dark:text-white leading-tight uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">{p.name}</h3>
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusClasses(p.status)}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleEdit(p)}
                                                className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-blue-500 rounded-xl border border-slate-100 dark:border-slate-700 transition-all shadow-sm"
                                                title="Editar Contrato"
                                            >
                                                <Pencil size={16}/>
                                            </button>
                                            {['Diretor', 'Director', 'Orçamentista'].includes(user?.role || '') && (
                                                <button 
                                                    onClick={() => handleDelete(p.id, p.name)}
                                                    className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 dark:border-slate-700 transition-all shadow-sm"
                                                    title="Excluir Contrato"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                            <div className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-400 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <Building2 size={18}/>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
                                        <div>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Valor do Contrato</p>
                                            {totalVenda > 0 ? (
                                                <p className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                                                    {formatter.format(totalVenda)}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] font-bold text-slate-300 italic">Valor não definido</p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">Custo Base</p>
                                            <p className="text-sm font-black text-slate-500 dark:text-slate-400 tracking-tighter">
                                                {totalOrcado > 0 ? formatter.format(totalOrcado) : '---'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-6 pt-2 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Caução Retida</p>
                                        <p className={`text-[10px] font-black tracking-tight ${saldoCaucao > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                                            {formatter.format(saldoCaucao)}
                                        </p>
                                    </div>

                                    {showProgress ? (
                                        <div className="space-y-4 mb-2">
                                            <div className="flex justify-between items-end text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                                                <div>
                                                    <p className="text-slate-400 mb-0.5">Início (OS)</p>
                                                    <p className="text-slate-700 dark:text-slate-300">{p.osDate ? new Date(p.osDate).toLocaleDateString('pt-BR') : '--/--/--'}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-slate-400 mb-0.5">Entrega Prevista</p>
                                                    <p className={`font-black ${isLate ? 'text-red-500' : 'text-blue-500'}`}>
                                                        {p.displayDeliveryDate ? p.displayDeliveryDate.toLocaleDateString('pt-BR') : '--/--/--'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="relative pt-1">
                                                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                                                    <div 
                                                        style={{ width: `${progress}%` }} 
                                                        className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${isLate ? 'bg-red-500 animate-pulse' : (progress === 100 ? 'bg-emerald-500' : 'bg-blue-500')}`}
                                                    ></div>
                                                </div>
                                                <div className="flex justify-between items-center px-1">
                                                    <span className={`text-[9px] font-black uppercase ${isLate ? 'text-red-500' : 'text-slate-400'}`}>
                                                        {isLate ? 'Atrasado' : (p.status === 'Concluído' ? 'Obra Finalizada' : 'Em Andamento')}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-500">{progress}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pt-4 mt-2 border-t border-slate-50 dark:border-slate-800/50">
                                            <p className="text-[10px] font-bold text-slate-300 italic uppercase tracking-widest text-center py-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-lg">
                                                Cronograma não inicializado
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                        <Link 
                                            href={`/comercial/${p.id}`}
                                            className="w-full py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 shadow-sm"
                                        >
                                            <FileText size={14}/> Ver Histórico de Aditivos
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL NOVA OBRA E ORÇAMENTO (Design Refinado - ERP Style) */}
            {isModalOpen && (
                <Modal title={isEditMode ? "Editar Contrato / Projeto" : "Novo Contrato / Projeto"} onClose={() => { setIsModalOpen(false); resetForm(); }} maxWidth="max-w-4xl">
                    <form onSubmit={handleSubmit} className="space-y-10">
                        
                        {/* BLOCO A - DADOS IDENTIFICADORES */}
                        <div className="space-y-6">
                            <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Building2 className="text-blue-500" size={20}/> Dados Identificadores
                                </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Nome da Obra / Identificador Interno</label>
                                    <input 
                                        type="text" 
                                        required 
                                        placeholder="Ex: WS05_ALMAVIVA - REFORMA" 
                                        value={projectName} 
                                        onChange={e => setProjectName(e.target.value)} 
                                        className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                {!isCreatingSede && (
                                    <>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Cliente / Empresa Contratante</label>
                                        <input 
                                            type="text" 
                                            required={!isCreatingSede}
                                            placeholder="Ex: Condomínio Almaviva" 
                                            value={clientName} 
                                            onChange={e => setClientName(e.target.value)} 
                                            className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Status Inicial do Contrato</label>
                                        <select 
                                            required={!isCreatingSede}
                                            value={status} 
                                            onChange={e => setStatus(e.target.value)} 
                                            className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                            <option value="Em Orçamento">Em Orçamento</option>
                                            <option value="Assinado">Assinado</option>
                                            <option value="Em Execução">Em Execução</option>
                                            <option value="Paralisado">Paralisado</option>
                                            <option value="Concluído">Concluído</option>
                                            <option value="Distrato">Distrato</option>
                                        </select>
                                    </div>
                                    </>
                                )}
                                
                                <div className="md:col-span-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">Endereço da Obra / Localização</label>
                                        <button 
                                            type="button"
                                            onClick={handleGeocode}
                                            disabled={loadingGeocode || (!street && !city)}
                                            className="px-4 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {loadingGeocode ? <RefreshCw size={14} className="animate-spin"/> : "🔍 Localizar no Mapa"}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-3">
                                            <input type="text" placeholder="CEP" value={cep} onChange={e => { setCep(e.target.value); setLocationConfirmed(false); }} className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
                                        </div>
                                        <div className="md:col-span-7">
                                            <input type="text" placeholder="Rua / Avenida" value={street} onChange={e => { setStreet(e.target.value); setLocationConfirmed(false); }} className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
                                        </div>
                                        <div className="md:col-span-2">
                                            <input type="text" placeholder="Número" value={number} onChange={e => { setNumber(e.target.value); setLocationConfirmed(false); }} className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
                                        </div>
                                        <div className="md:col-span-8">
                                            <input type="text" placeholder="Cidade" value={city} onChange={e => { setCity(e.target.value); setLocationConfirmed(false); }} className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
                                        </div>
                                        <div className="md:col-span-4">
                                            <input type="text" placeholder="Estado (UF)" value={state} onChange={e => { setState(e.target.value); setLocationConfirmed(false); }} className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"/>
                                        </div>
                                    </div>
                                    {locationConfirmed && (
                                        <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                            ✅ Localização encontrada: {parseFloat(latitude).toFixed(4)}, {parseFloat(longitude).toFixed(4)}
                                        </p>
                                    )}
                                </div>

                                {showMiniMap && (
                                    <div className="md:col-span-2">
                                        <div className="h-48 w-full rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-inner bg-slate-100 relative group">
                                            <MapWrapper projects={[{ id: 999, name: projectName || 'Prévia da Obra', lat: parseFloat(latitude), lng: parseFloat(longitude), margin: 15, saude: 'bom', progresso: 0 }]} />
                                            <div className="absolute inset-0 bg-transparent z-[1000] pointer-events-none border-2 border-emerald-500/50 rounded-xl"></div>
                                        </div>
                                        <p className="text-[9px] text-slate-400 mt-1 italic">Mapa de conferência: Confirme se o Pin está no local correto.</p>
                                    </div>
                                )}
                                


                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Latitude (Opcional)</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            placeholder="-21.2089" 
                                            value={latitude} 
                                            onChange={e => setLatitude(e.target.value)} 
                                            className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Longitude (Opcional)</label>
                                        <input 
                                            type="number" 
                                            step="any"
                                            placeholder="-50.4404" 
                                            value={longitude} 
                                            onChange={e => setLongitude(e.target.value)} 
                                            className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {!isCreatingSede && (
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">
                                            Anexar Contrato Assinado (PDF/Word)
                                        </label>
                                        <input 
                                            type="file" 
                                            accept=".pdf,.doc,.docx"
                                            onChange={e => setContractFile(e.target.files?.[0] || null)}
                                            className="w-full p-3 bg-slate-50 dark:bg-[#0B1121] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-500 outline-none focus:border-blue-500 transition-all cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {!isCreatingSede && (
                            <>
                            {/* BLOCO B - FINANCEIRO BASE */}
                            <div className="space-y-6">
                            <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <DollarSign className="text-emerald-500" size={20}/> Financeiro Base
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Valor Inicial do Contrato (Automático R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input 
                                            type="text" 
                                            readOnly
                                            value={autoTotalVenda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-emerald-600 outline-none transition-all cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Custo Base Orçado (Automático R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">R$</span>
                                        <input 
                                            type="text" 
                                            readOnly
                                            value={autoTotalOrcado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} 
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-blue-600 outline-none transition-all cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Retenção Técnica (%)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.1" 
                                            placeholder="5.0" 
                                            value={retentionPercent} 
                                            onChange={e => setRetentionPercent(e.target.value)} 
                                            className="w-full pr-10 pl-4 py-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-orange-500 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Impostos s/ Nota (%)</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder="13.0" 
                                            value={taxPercent} 
                                            onChange={e => setTaxPercent(e.target.value)} 
                                            className="w-full pr-10 pl-4 py-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-amber-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO C - CRONOGRAMA E PRAZOS */}
                        <div className="space-y-6">
                            <div className="border-b border-slate-200 dark:border-slate-700 pb-2">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Calendar className="text-violet-500" size={20}/> Cronograma e Prazos
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Data de Assinatura</label>
                                    <input 
                                        type="date" 
                                        value={signatureDate} 
                                        onChange={e => setSignatureDate(e.target.value)} 
                                        className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Data da Ordem de Serviço</label>
                                    <input 
                                        type="date" 
                                        value={osDate} 
                                        onChange={e => setOsDate(e.target.value)} 
                                        className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Prazo (Dias Corridos)</label>
                                    <input 
                                        type="number" 
                                        placeholder="Ex: 90" 
                                        value={executionDays} 
                                        onChange={e => setExecutionDays(e.target.value)} 
                                        className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Data de Entrega Prevista (Automática)</label>
                                    <div className="w-full p-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black text-blue-600 dark:text-blue-400 flex items-center justify-center h-[46px]">
                                        {estimatedDelivery || '--/--/----'}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Regra de Liberação de Caução</label>
                                    <select 
                                        value={retentionRule} 
                                        onChange={e => setRetentionRule(e.target.value)} 
                                        className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer"
                                    >
                                        <option value="AT_END">Ao final do contrato</option>
                                        <option value="PER_BM">A cada Medição (BM)</option>
                                    </select>
                                </div>
                                
                                {retentionRule === 'AT_END' && (
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block">Dias para liberação após a entrega</label>
                                        <input 
                                            type="number" 
                                            placeholder="Ex: 30" 
                                            value={retentionDays} 
                                            onChange={e => setRetentionDays(e.target.value)} 
                                            className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PLANILHA DE VALOR ORÇADO (BDI) */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 dark:bg-[#111827] p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                                <h3 className="font-bold text-sm flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <FileText size={18}/> Composição do Orçamento Base (BDI)
                                </h3>
                                <button 
                                    type="button" 
                                    onClick={handleAddBudgetItem} 
                                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5"
                                >
                                    <Plus size={14}/> Adicionar Item
                                </button>
                            </div>
                            
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#162032]">
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                                    <LinkIcon size={12} className="text-violet-500" /> Vincular a Orçamento (Opcional)
                                </label>
                                <select 
                                    value={estimateId} 
                                    onChange={e => setEstimateId(e.target.value)} 
                                    className="w-full p-3 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all cursor-pointer"
                                >
                                    <option value="">Nenhum orçamento vinculado</option>
                                    {estimates.filter(est => !est.projectId || est.id === estimateId).map(est => (
                                        <option key={est.id} value={est.id}>
                                            {est.name} ({est.totalAmount ? est.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem valor'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar bg-white dark:bg-[#162032]">
                                {budgetItems.map((item, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-end bg-slate-50/50 dark:bg-[#0B1121]/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 group">
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Classificação DRE</label>
                                            <select required value={item.classificacaoDRE} onChange={e => handleItemChange(index, 'classificacaoDRE', e.target.value)} className="w-full p-2.5 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold uppercase text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm cursor-pointer">
                                                <option value="1. RECEITA OPERACIONAL">1. RECEITA OPERACIONAL</option>
                                                <option value="2. CUSTO DIRETO - MATERIAIS">2. CUSTO DIRETO - MATERIAIS</option>
                                                <option value="3. CUSTO DIRETO - MÃO DE OBRA">3. CUSTO DIRETO - MÃO DE OBRA</option>
                                                <option value="4. CUSTO DIRETO - EQUIPAMENTOS/LOGÍSTICA">4. CUSTO DIRETO - EQUIPAMENTOS/LOGÍSTICA</option>
                                                <option value="5. DESPESA ADMINISTRATIVA">5. DESPESA ADMINISTRATIVA</option>
                                                <option value="6. DESPESA COMERCIAL">6. DESPESA COMERCIAL</option>
                                                <option value="7. IMPOSTOS SOBRE SERVIÇO">7. IMPOSTOS SOBRE SERVIÇO</option>
                                                <option value="8. INVESTIMENTOS / CAPEX">8. INVESTIMENTOS / CAPEX</option>
                                                <option value="9. CUSTO FINANCEIRO">9. CUSTO FINANCEIRO</option>
                                                <option value="10. PROVISÕES">10. PROVISÕES</option>
                                                <option value="11. CONTINGÊNCIAS">11. CONTINGÊNCIAS</option>
                                            </select>
                                        </div>
                                        <div className="col-span-12 md:col-span-4">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Descrição do Item</label>
                                            <input type="text" placeholder="Ex: Serviços Preliminares" value={item.subItem} onChange={e => handleItemChange(index, 'subItem', e.target.value)} className="w-full p-2.5 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 shadow-sm"/>
                                        </div>
                                        <div className="col-span-12 md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Valor Orçado (R$)</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">R$</span>
                                                <input type="number" step="0.01" required placeholder="0,00" value={item.valorOrcado} onChange={e => handleItemChange(index, 'valorOrcado', e.target.value)} className="w-full pl-8 pr-2.5 py-2.5 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200 font-bold shadow-sm"/>
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Venda BDI (R$)</label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</span>
                                                <input type="number" step="0.01" required placeholder="0,00" value={item.valorVenda} onChange={e => handleItemChange(index, 'valorVenda', e.target.value)} className="w-full pl-8 pr-2.5 py-2.5 bg-white dark:bg-[#162032] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-blue-500 text-emerald-600 font-bold shadow-sm"/>
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-1 flex justify-center pb-1">
                                            {budgetItems.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveBudgetItem(index)} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><Trash2 size={18}/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        </>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                            <button 
                                type="button" 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-6 py-2.5 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className={`px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isSaving ? <RefreshCw size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
                                {isSaving ? 'Salvando...' : 'Salvar Contrato'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

        </div>
    );
}

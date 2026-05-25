"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/navigation';
import { canAccessPage, canEditFinanceiro } from '../../lib/permissions';
import { 
    getFinancialRecords, 
    getProjectsList, 
    createFinancialRecord, 
    updateFinancialRecord,
    updateFinancialStatus,
    deleteFinancialRecord,
    getContacts,
    getSectors,
    getFinancialCategories,
    createSector,
    updateSector,
    deleteSector,
    createFinancialCategory,
    updateFinancialCategory,
    deleteFinancialCategory,
    seedLegacyData,
    getSuppliers,
    deleteSupplier,
    deleteContact
} from '../actions/finance';
import { createSupplier } from '../actions/supply';
import { exportFinanceiroToObsidian } from '../actions/obsidian';
import { 
    DollarSign, Plus, ArrowLeft, ArrowUpRight, ArrowDownRight, 
    Building2, Calendar, FileText, CheckCircle2, AlertCircle, 
    BookOpen, RefreshCw, Search, Trash2, Users, Grid, LayoutDashboard,
    Briefcase, MapPin, Percent, Save, X, Edit3, BarChart3, Package, User
} from 'lucide-react';
import Link from 'next/link';
import { Modal } from '../../components/Shared';
import { 
    ResponsiveContainer, PieChart, Pie, Cell, 
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    Line, ComposedChart
} from 'recharts';

export default function FinanceiroPage() {
    const { user, logout, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Estados de Dados
    const [tab, setTab] = useState('lancamentos');
    const [records, setRecords] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [sectors, setSectors] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    
    // Estados de UI
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncDone, setSyncDone] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    // Estados para Novos Cadastros Base
    const [newContactName, setNewContactName] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isSavingBase, setIsSavingBase] = useState(false);

    // Novos Estados Task 7.4
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [isDreModalOpen, setIsDreModalOpen] = useState(false);
    const [entityFormData, setEntityFormData] = useState({
        name: '',
        type: 'FORNECEDOR',
        cnpj: '',
        email: '',
        phone: '',
        address: ''
    });
    const [dreFormData, setDreFormData] = useState({
        code: '',
        name: '',
        nature: 'DESPESA'
    });
    const [isSectorModalOpen, setIsSectorModalOpen] = useState(false);
    const [sectorFormData, setSectorFormData] = useState({
        name: '',
        code: '',
        manager: ''
    });

    // Filtros de busca
    const [contactSearch, setContactSearch] = useState('');
    const [sectorSearch, setSectorSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    // Estados de Edição Inline
    const [editingContactId, setEditingContactId] = useState<number | null>(null);
    const [tempContactName, setTempContactName] = useState('');
    
    const [editingSectorId, setEditingSectorId] = useState<number | null>(null);
    const [tempSectorName, setTempSectorName] = useState('');
    
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [tempCategoryName, setTempCategoryName] = useState('');

    // Estados do DRE
    const [dreStartDate, setDreStartDate] = useState(() => {
        const d = new Date();
        return formatDate(new Date(d.getFullYear(), d.getMonth(), 1)); // Primeiro dia do mês
    });
    const [dreEndDate, setDreEndDate] = useState(() => {
        const d = new Date();
        return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)); // Último dia do mês
    });
    const [dreSelectedProject, setDreSelectedProject] = useState('GLOBAL');

    // Estados do Fluxo de Caixa
    const [caixaPeriodo, setCaixaPeriodo] = useState('30DIAS');
    const [caixaSelectedProject, setCaixaSelectedProject] = useState('GLOBAL');

    // Task 7.5 / Etapa 1 do Plano: Uso exclusivo do modelo Supplier
    const unifiedEntities = useMemo(() => {
        const searchTermLower = contactSearch.toLowerCase();
        
        return suppliers
            .map(s => ({
                id: s.id,
                name: s.name || "Sem Nome",
                type: s.type || "FORNECEDOR",
                cnpj: s.cnpj || null,
                email: s.email || null,
                phone: s.phone || null,
                address: s.address || null,
                isSupplier: true
            }))
            .filter(e => e.name.toLowerCase().includes(searchTermLower))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers, contactSearch]);

    // Handlers de Exclusão com Reatividade e Tratamento de Erros
    const handleDeleteContact = async (id: number, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
        try {
            const res = await deleteContact(id);
            if (res.success) {
                setContacts(prev => prev.filter(c => c.id !== id));
            } else {
                alert("Não foi possível excluir. Este cadastro já possui lançamentos vinculados a ele.");
            }
        } catch (error) {
            alert("Erro ao excluir contato.");
        }
    };

    const handleDeleteSector = async (id: number, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
        try {
            const res = await deleteSector(id);
            if (res.success) {
                setSectors(prev => prev.filter(s => s.id !== id));
            } else {
                alert("Não foi possível excluir. Este setor já possui lançamentos vinculados a ele.");
            }
        } catch (error) {
            alert("Erro ao excluir setor.");
        }
    };

    const handleDeleteCategory = async (id: number, name: string) => {
        if (!window.confirm(`Tem certeza que deseja excluir "${name}"?`)) return;
        try {
            const res = await deleteFinancialCategory(id);
            if (res.success) {
                setCategories(prev => prev.filter(cat => cat.id !== id));
            } else {
                alert("Não foi possível excluir. Esta classificação já possui lançamentos vinculados a ela.");
            }
        } catch (error) {
            alert("Erro ao excluir classificação.");
        }
    };
    const handleDeleteLancamento = async (id: number) => {
        if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
        try {
            const res = await deleteFinancialRecord(id);
            if (res.success) {
                setRecords(prev => prev.filter(item => item.id !== id));
            } else {
                alert("Erro ao excluir: " + res.error);
            }
        } catch (error) {
            console.error(error);
            alert("Erro ao excluir lançamento.");
        }
    };

    // Estado do Formulário Padronizado (18 campos)
    const initialFormState = {
        tipo: 'SAÍDA',
        descricao: '',
        valorBruto: '',
        caucaoRetida: '0',
        iss: '0',
        inss: '0',
        impostosRetidos: '0',
        status: 'A Vencer',
        classificacaoDRE: '',
        clienteFornecedor: '',
        setor: '',
        cidade: '',
        estado: '',
        centroCusto: '',
        projectId: '',
        dataCompetencia: new Date().toISOString().split('T')[0],
        dataVencimento: new Date().toISOString().split('T')[0],
        dataEfetivacao: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    const formatDateForInput = (date: any) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        // Usar getUTCDate/getUTCMonth se o banco salvar como UTC zero-hour
        // Mas para evitar o shift de timezone do usuário (UTC-3), o mais seguro é:
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const loadData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const [recs, projs, c, s, cats, sups] = await Promise.all([
                getFinancialRecords(), 
                getProjectsList(),
                getContacts(),
                getSectors(),
                getFinancialCategories(),
                getSuppliers()
            ]);
            setRecords(recs);
            setProjects(projs);
            setContacts(c);
            setSectors(s);
            setCategories(cats);
            setSuppliers(sups);
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
        if (user && !canAccessPage(user.role, 'financeiro')) {
            alert("Acesso Negado. Sem permissão para esta página.");
            router.push('/');
            return;
        }
        loadData();
    }, [user, isAuthLoading, router, loadData]);

    // KPIs calculados
    const kpis = useMemo(() => {
        const entradas = records.filter(r => r.tipo === 'ENTRADA' && r.status === 'Recebido').reduce((acc, r) => acc + r.valorLiquido, 0);
        const saidas = records.filter(r => r.tipo === 'SAÍDA' && r.status === 'Pago').reduce((acc, r) => acc + r.valorLiquido, 0);
        const pendentes = records.filter(r => (r.status === 'A Vencer' || r.status === 'Pendente') && r.tipo === 'SAÍDA').reduce((acc, r) => acc + r.valorLiquido, 0);
        const atrasados = records.filter(r => r.status === 'Atrasado').length;
        return { entradas, saidas, saldo: entradas - saidas, pendentes, atrasados };
    }, [records]);

    const filteredRecords = records.filter(r => 
        r.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.clienteFornecedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.centroCusto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Lógica do DRE Gerencial
    const dreData = useMemo(() => {
        // 1. Filtragem dos Lançamentos para o DRE
        const dreFiltered = records.filter(r => {
            // Pegar a data e tratar como local para evitar shift de timezone
            const recordDateStr = r.dataCompetencia || r.dataEfetivacao;
            if (!recordDateStr) return false;

            const date = new Date(recordDateStr);
            const start = new Date(dreStartDate + 'T00:00:00');
            const end = new Date(dreEndDate + 'T23:59:59');

            const inDateRange = date >= start && date <= end;
            const inProject = dreSelectedProject === 'GLOBAL' || r.centroCusto === dreSelectedProject;

            return inDateRange && inProject;
        });

        // Função auxiliar para separar Realizado e Previsto
        const calcDreLine = (filterFn: (r: any) => boolean) => {
            const lines = dreFiltered.filter(filterFn);
            const realizado = lines
                .filter(r => r.status === 'Pago' || r.status === 'Recebido')
                .reduce((acc, r) => acc + Math.abs(r.valorBruto || 0), 0);
            const previsto = lines
                .filter(r => r.status !== 'Pago' && r.status !== 'Recebido' && r.status !== 'Cancelado')
                .reduce((acc, r) => acc + Math.abs(r.valorBruto || 0), 0);
            return { realizado, previsto };
        };

        // Linha 1: RECEITA BRUTA OPERACIONAL
        const l1 = calcDreLine(r => r.tipo === 'ENTRADA' && r.classificacaoDRE?.toUpperCase().includes('RECEITA OPERACIONAL'));

        // Linha 2: DEDUÇÕES / IMPOSTOS (INSS, ISS)
        const l2 = calcDreLine(r => r.classificacaoDRE?.toUpperCase().includes('IMPOSTOS SOBRE SERVIÇO') || r.classificacaoDRE?.toUpperCase().includes('IMPOSTOS SOBRE SERVICO'));

        // Linha 3: RECEITA LÍQUIDA
        const l3 = {
            realizado: l1.realizado - l2.realizado,
            previsto: l1.previsto - l2.previsto
        };

        // Linha 4: CUSTOS DIRETOS
        const l4_materiais = calcDreLine(r => r.classificacaoDRE?.toUpperCase().includes('MATERIAIS'));
        const l4_maodeobra = calcDreLine(r => (r.classificacaoDRE?.toUpperCase().includes('MÃO DE OBRA') || r.classificacaoDRE?.toUpperCase().includes('MAO DE OBRA')));
        const l4_equiplog = calcDreLine(r => (r.classificacaoDRE?.toUpperCase().includes('EQUIPAMENTOS/LOGÍSTICA') || r.classificacaoDRE?.toUpperCase().includes('LOGISTICA')));

        const l4 = {
            realizado: l4_materiais.realizado + l4_maodeobra.realizado + l4_equiplog.realizado,
            previsto: l4_materiais.previsto + l4_maodeobra.previsto + l4_equiplog.previsto
        };

        // Linha 5: MARGEM DE CONTRIBUIÇÃO
        const l5 = {
            realizado: l3.realizado - l4.realizado,
            previsto: l3.previsto - l4.previsto
        };

        // Linha 6: DESPESAS FIXAS / ADMINISTRATIVAS
        const l6 = calcDreLine(r => (r.classificacaoDRE?.toUpperCase().includes('ADMINISTRATIVA') || r.classificacaoDRE?.toUpperCase().includes('COMERCIAL')));

        // Linha 7: RESULTADO LÍQUIDO
        const l7 = {
            realizado: l5.realizado - l6.realizado,
            previsto: l5.previsto - l6.previsto
        };

        // Dados para Gráficos e Cards
        const costComposition = [
            { name: 'Materiais', value: l4_materiais.realizado },
            { name: 'Mão de Obra', value: l4_maodeobra.realizado },
            { name: 'Equip/Log', value: l4_equiplog.realizado },
        ].filter(d => d.value > 0);

        const evolutionData = [
            { name: 'Rec. Bruta', valor: l1.realizado, color: '#10b981' },
            { name: 'Custos Dir.', valor: l4.realizado, color: '#f59e0b' },
            { name: 'Desp. Fixas', valor: l6.realizado, color: '#ef4444' },
            { name: 'EBITDA', valor: l7.realizado, color: l7.realizado >= 0 ? '#3b82f6' : '#94a3b8' },
        ];

        const tableData = [
            { label: '1. Receita Operacional', realizado: l1.realizado, previsto: l1.previsto, isTotal: true },
            { label: '  1.1 Receita Bruta', realizado: l1.realizado, previsto: l1.previsto },
            { label: '  1.2 Impostos / Deduções', realizado: l2.realizado, previsto: l2.previsto },
            { label: '2. Receita Líquida', realizado: l3.realizado, previsto: l3.previsto, isTotal: true },
            { label: '3. Custos Diretos', realizado: l4.realizado, previsto: l4.previsto, isTotal: true },
            { label: '  3.1 Materiais', realizado: l4_materiais.realizado, previsto: l4_materiais.previsto },
            { label: '  3.2 Mão de Obra', realizado: l4_maodeobra.realizado, previsto: l4_maodeobra.previsto },
            { label: '  3.3 Equip. / Logística', realizado: l4_equiplog.realizado, previsto: l4_equiplog.previsto },
            { label: '4. Margem de Contribuição', realizado: l5.realizado, previsto: l5.previsto, isTotal: true },
            { label: '5. Despesas Fixas / Adm', realizado: l6.realizado, previsto: l6.previsto, isTotal: true },
            { label: '6. Resultado Líquido', realizado: l7.realizado, previsto: l7.previsto, isTotal: true },
        ];

        return {
            l1: l1.realizado,
            l2: l2.realizado,
            l3: l3.realizado,
            l4: l4.realizado,
            l5: l5.realizado,
            l6: l6.realizado,
            l7: l7.realizado,
            costComposition,
            evolutionData,
            tableData
        };
    }, [records, dreStartDate, dreEndDate, dreSelectedProject]);

    // Lógica do Fluxo de Caixa (Regime de Caixa)
    const caixaData = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);

        // 1. Definir intervalo de datas baseado no seletor
        let start = new Date(now);
        let end = new Date(now);

        if (caixaPeriodo === '15DIAS') {
            end.setDate(now.getDate() + 15);
        } else if (caixaPeriodo === '30DIAS') {
            end.setDate(now.getDate() + 30);
        } else if (caixaPeriodo === 'MES_ATUAL') {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (caixaPeriodo === 'MES_SEGUINTE') {
            start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
        }

        // 2. Saldo Atual (Histórico Efetivado até hoje)
        const lancamentosPassados = records.filter(r => {
            if (caixaSelectedProject !== 'GLOBAL' && r.centroCusto !== caixaSelectedProject) return false;
            return r.status === 'Pago' || r.status === 'Recebido'; // Lançamentos liquidados
        });

        const saldoAtual = lancamentosPassados.reduce((acc, r) => {
            const val = Math.abs(r.valorLiquido || 0);
            return r.tipo === 'ENTRADA' ? acc + val : acc - val;
        }, 0);

        // 3. Projeções para o Período Filtrado
        const periodoRecords = records.filter(r => {
            if (caixaSelectedProject !== 'GLOBAL' && r.centroCusto !== caixaSelectedProject) return false;
            
            const dateStr = r.status === 'Pago' || r.status === 'Recebido' ? r.dataEfetivacao : r.dataVencimento;
            if (!dateStr) return false;
            
            const date = new Date(dateStr);
            date.setHours(0,0,0,0);
            return date >= start && date <= end;
        });

        const aReceber = periodoRecords
            .filter(r => r.tipo === 'ENTRADA' && (r.status === 'A Vencer' || r.status === 'Atrasado'))
            .reduce((acc, r) => acc + Math.abs(r.valorLiquido || 0), 0);

        const aPagar = periodoRecords
            .filter(r => r.tipo === 'SAÍDA' && (r.status === 'A Vencer' || r.status === 'Atrasado'))
            .reduce((acc, r) => acc + Math.abs(r.valorLiquido || 0), 0);

        const saldoProjetado = saldoAtual + aReceber - aPagar;

        // 4. Dados do Gráfico Diário
        const chartData = [];
        let tempDate = new Date(start);
        let runningBalance = saldoAtual;

        // Se o período começar no futuro, precisamos calcular o saldo acumulado até o início do período
        if (start > now) {
            const prePeriodo = records.filter(r => {
                if (caixaSelectedProject !== 'GLOBAL' && r.centroCusto !== caixaSelectedProject) return false;
                const dateStr = r.status === 'Pago' || r.status === 'Recebido' ? r.dataEfetivacao : r.dataVencimento;
                if (!dateStr) return false;
                const date = new Date(dateStr);
                return date < start;
            });
            runningBalance = prePeriodo.reduce((acc, r) => {
                const val = Math.abs(r.valorLiquido || 0);
                return r.tipo === 'ENTRADA' ? acc + val : acc - val;
            }, 0);
        }

        while (tempDate <= end) {
            const dateKey = formatDate(tempDate);
            const diaLancamentos = periodoRecords.filter(r => {
                const dStr = r.status === 'Pago' || r.status === 'Recebido' ? r.dataEfetivacao : r.dataVencimento;
                return dStr && formatDate(new Date(dStr)) === dateKey;
            });

            const entradas = diaLancamentos
                .filter(r => r.tipo === 'ENTRADA')
                .reduce((acc, r) => acc + Math.abs(r.valorLiquido || 0), 0);
            
            const saidas = diaLancamentos
                .filter(r => r.tipo === 'SAÍDA')
                .reduce((acc, r) => acc + Math.abs(r.valorLiquido || 0), 0);

            runningBalance += (entradas - saidas);

            chartData.push({
                name: tempDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                entradas,
                saidas,
                saldo: runningBalance
            });

            tempDate.setDate(tempDate.getDate() + 1);
        }

        // 5. Tabela Detalhada (Ordenada)
        const tableData = [...periodoRecords].sort((a, b) => {
            const dA = new Date(a.status === 'Pago' || a.status === 'Recebido' ? a.dataEfetivacao : a.dataVencimento);
            const dB = new Date(b.status === 'Pago' || b.status === 'Recebido' ? b.dataEfetivacao : b.dataVencimento);
            return dA.getTime() - dB.getTime();
        });

        return { saldoAtual, aReceber, aPagar, saldoProjetado, chartData, tableData };
    }, [records, caixaPeriodo, caixaSelectedProject]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        let res;
        if (editingId) {
            res = await updateFinancialRecord(editingId, formData);
        } else {
            res = await createFinancialRecord(formData);
        }

        if (res.success) {
            setIsModalOpen(false);
            setEditingId(null);
            setFormData(initialFormState);
            await loadData(); // Atualiza a lista após salvar
        } else {
            alert("Erro: " + res.error);
        }
        setIsSaving(false);
    };

    const handleSeed = async () => {
        setIsLoading(true);
        const res = await seedLegacyData();
        if (res.success) {
            alert("Base de dados populada com sucesso!");
            await loadData();
        } else {
            alert("Erro ao popular: " + res.error);
        }
        setIsLoading(false);
    };

    const handleEdit = (record: any) => {
        setEditingId(record.id);
        setFormData({
            tipo: record.tipo,
            descricao: record.descricao || '',
            valorBruto: record.valorBruto ? record.valorBruto.toString() : '0',
            caucaoRetida: record.caucaoRetida !== null ? record.caucaoRetida.toString() : '0',
            iss: record.iss !== null ? record.iss.toString() : '0',
            inss: record.inss !== null ? record.inss.toString() : '0',
            impostosRetidos: record.impostosRetidos !== null ? record.impostosRetidos.toString() : '0',
            status: record.status === 'Recebido' ? 'Pago' : (record.status || 'A Vencer'),
            classificacaoDRE: record.classificacaoDRE || '',
            clienteFornecedor: record.clienteFornecedor || '',
            setor: record.setor || '',
            cidade: record.cidade || '',
            estado: record.estado || '',
            centroCusto: record.centroCusto || '',
            projectId: record.projectId?.toString() || '',
            dataCompetencia: formatDateForInput(record.dataCompetencia),
            dataVencimento: formatDateForInput(record.dataVencimento),
            dataEfetivacao: formatDateForInput(record.dataEfetivacao)
        });
        setIsModalOpen(true);
    };

    const handleObsidianSync = async () => {
        setIsSyncing(true);
        setSyncDone(false);
        await exportFinanceiroToObsidian();
        setIsSyncing(false);
        setSyncDone(true);
        setTimeout(() => setSyncDone(false), 3000);
    };

    if (isLoading || isAuthLoading) return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans pb-20">
            {/* HEADER */}
            <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center px-8 sticky top-0 z-40 shadow-sm">
                {canAccessPage(user?.role || '', 'dashboard') && (
                    <Link href="/" className="mr-6 text-slate-400 hover:text-emerald-500 transition-colors"><ArrowLeft size={24} /></Link>
                )}
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><DollarSign className="text-emerald-500"/> Central Financeira</h1>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Gestão Unificada WayService</p>
                </div>
                
                <div className="ml-auto flex items-center gap-3">
                    {tab === 'cadastros' && (
                        <button
                            onClick={handleSeed}
                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                        >
                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                            Popular Dados Oficiais
                        </button>
                    )}
                    <button
                        onClick={handleObsidianSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all"
                    >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : syncDone ? <CheckCircle2 size={14} /> : <BookOpen size={14} />}
                        {isSyncing ? 'Exportando...' : syncDone ? '✅ Exportado!' : 'Obsidian'}
                    </button>
                    {canEditFinanceiro(user?.role || '') && (
                        <button onClick={() => { setEditingId(null); setFormData(initialFormState); setIsModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg transition-colors">
                            <Plus size={18}/> Novo Lançamento
                        </button>
                    )}

                    {/* User Profile */}
                    <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                        <div className="flex flex-col text-right">
                            <span className="text-xs font-bold text-slate-800 dark:text-white">{user?.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium">{user?.role}</span>
                        </div>
                        <div 
                            onClick={logout}
                            className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center font-bold text-xs uppercase cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors" 
                            title="Sair (Logout)"
                        >
                            {user?.name?.substring(0, 2) || 'U'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="p-8 max-w-[1600px] mx-auto space-y-6">
                
                {/* KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Entradas Totais</p>
                        <p className="text-2xl font-black text-emerald-500">{formatter.format(kpis.entradas)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saídas Totais</p>
                        <p className="text-2xl font-black text-red-500">{formatter.format(kpis.saidas)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo em Caixa</p>
                        <p className={`text-2xl font-black ${kpis.saldo >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>{formatter.format(kpis.saldo)}</p>
                    </div>
                    <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-yellow-400">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Contas a Vencer</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{formatter.format(kpis.pendentes)}</p>
                    </div>
                </div>

                {/* TABS NAVEGAÇÃO */}
                <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-fit">
                    <button onClick={() => setTab('lancamentos')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'lancamentos' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Lançamentos</button>
                    {canEditFinanceiro(user?.role || '') && (
                        <button onClick={() => setTab('cadastros')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'cadastros' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Cadastros Base</button>
                    )}
                    <button onClick={() => setTab('resumo')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'resumo' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Resumo DRE</button>
                    <button onClick={() => setTab('fluxo')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${tab === 'fluxo' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Fluxo de Caixa</button>
                </div>

                {/* CONTEÚDO: LANÇAMENTOS */}
                {tab === 'lancamentos' && (
                    <div className="space-y-4">
                        <div className="flex bg-white dark:bg-[#162032] p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm items-center gap-3">
                            <Search size={18} className="text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Filtrar por descrição, fornecedor, centro de custo ou cidade..." 
                                className="flex-1 bg-transparent outline-none text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-black">Tipo / Status</th>
                                            <th className="px-6 py-4 font-black">Data Venc.</th>
                                            <th className="px-6 py-4 font-black">Centro de Custo / Obra</th>
                                            <th className="px-6 py-4 font-black">Localização</th>
                                            <th className="px-6 py-4 font-black">Fornecedor / Cliente</th>
                                            <th className="px-6 py-4 font-black">Descrição</th>
                                            <th className="px-6 py-4 font-black">DRE</th>
                                            <th className="px-6 py-4 font-black text-right">Valor Líquido</th>
                                            <th className="px-6 py-4 font-black text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredRecords.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${r.tipo === 'ENTRADA' ? 'text-emerald-500' : 'text-red-500'}`}>
                                                            {r.tipo === 'ENTRADA' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                                                            {r.tipo}
                                                        </span>
                                                        <div className="flex gap-1 items-center">
                                                            <span className={`text-[9px] px-2 py-0.5 rounded-full w-fit font-bold ${
                                                                r.status === 'Pago' || r.status === 'Recebido' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                                {r.status}
                                                            </span>
                                                            {r.purchaseRequestId && (
                                                                <span className="text-[9px] px-2 py-0.5 rounded-full w-fit font-bold bg-orange-100 text-orange-700 flex items-center gap-1" title="Origem: Suprimentos">
                                                                    <Package size={10}/> Suprimentos
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-medium">
                                                    {r.dataVencimento ? new Date(r.dataVencimento).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.centroCusto || 'Geral'}</span>
                                                        <span className="text-[10px] text-slate-500 italic">{r.project?.name || 'Matriz'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                                        <MapPin size={10} className="text-red-400"/> {r.cidade || '-'}{r.estado ? `, ${r.estado}` : ''}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-xs">{r.clienteFornecedor || '-'}</td>
                                                <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[200px]">{r.descricao}</td>
                                                <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{r.classificacaoDRE}</td>
                                                <td className={`px-6 py-4 text-right font-black ${r.tipo === 'ENTRADA' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'}`}>
                                                    {r.tipo === 'SAÍDA' ? '-' : ''}{formatter.format(r.valorLiquido)}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {canEditFinanceiro(user?.role || '') && (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleEdit(r)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar">
                                                                <Edit3 size={16}/>
                                                            </button>
                                                            {r.purchaseRequestId ? (
                                                                <button disabled className="p-2 text-slate-300 dark:text-slate-600 rounded-lg cursor-not-allowed" title="Não é possível excluir. Cancele o Pedido no módulo de Suprimentos.">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            ) : (
                                                                <button onClick={() => handleDeleteLancamento(r.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all" title="Excluir">
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTEÚDO: CADASTROS */}
                {tab === 'cadastros' && canEditFinanceiro(user?.role || '') && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4">
                        {/* CLIENTES / FORNECEDORES */}
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[650px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                        <Users size={18}/>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Clientes / Fornecedores</h3>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full">{unifiedEntities.length}</span>
                            </div>
                            
                            <div className="p-4 space-y-3 bg-white dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setIsEntityModalOpen(true)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <Plus size={20} strokeWidth={3}/> Cadastrar Nova Empresa
                                </button>

                                <div className="relative pt-2">
                                    <Search className="absolute left-3 top-4.5 text-slate-400" size={14} />
                                    <input 
                                        placeholder="Filtrar empresas..." 
                                        value={contactSearch}
                                        onChange={(e) => setContactSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar max-h-[400px]">
                                <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900/20">
                                    {unifiedEntities.map((s) => (
                                            <div key={s.id} className="flex flex-col p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.name}</span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button 
                                                            onClick={async () => {
                                                                if(window.confirm(`Excluir ${s.name}?`)) {
                                                                    if (s.id.toString().startsWith('contact-')) {
                                                                        await deleteContact(parseInt(s.id.toString().replace('contact-', '')));
                                                                    } else {
                                                                        await deleteSupplier(s.id.toString());
                                                                    }
                                                                    loadData();
                                                                }
                                                            }} 
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                        s.type === 'CLIENTE' ? 'bg-emerald-100 text-emerald-600' : 
                                                        s.type === 'FORNECEDOR' ? 'bg-orange-100 text-orange-600' : 
                                                        s.type === 'AMBOS' ? 'bg-purple-100 text-purple-600' : 
                                                        'bg-slate-100 text-slate-400'}`}>
                                                        {s.type || "LEGADO"}
                                                    </span>
                                                    {s.cnpj && <span className="text-[9px] text-slate-400 font-bold">Doc: {s.cnpj}</span>}
                                                    {s.email && <span className="text-[9px] text-slate-400 font-bold">{s.email}</span>}
                                                    {s.isSupplier === false && <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-400 px-1 rounded font-black">LEGADO</span>}
                                                </div>
                                            </div>
                                        ))}
                                    {unifiedEntities.length === 0 && (
                                        <div className="p-10 text-center text-slate-400 text-[10px] italic">Nenhuma empresa encontrada</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SETORES */}
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[650px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                                        <Briefcase size={18}/>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Setores</h3>
                                </div>
                                <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] font-black rounded-full">{sectors.length}</span>
                            </div>
                            
                            <div className="p-4 space-y-3 bg-white dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setIsSectorModalOpen(true)}
                                    className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <Plus size={20} strokeWidth={3}/> Novo Setor / Centro de Custo
                                </button>

                                <div className="relative pt-2">
                                    <Search className="absolute left-3 top-4.5 text-slate-400" size={14} />
                                    <input 
                                        placeholder="Filtrar setores..." 
                                        value={sectorSearch}
                                        onChange={(e) => setSectorSearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-orange-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar max-h-[400px]">
                                <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900/20">
                                    {sectors
                                        .filter(s => s.name.toLowerCase().includes(sectorSearch.toLowerCase()))
                                        .map((s) => (
                                            <div key={s.id} className="flex flex-col p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.name}</span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button 
                                                            onClick={() => handleDeleteSector(s.id, s.name)} 
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                                {(s.code || s.manager) && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {s.code && <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded text-[9px] font-black uppercase border border-orange-100 dark:border-orange-800">{s.code}</span>}
                                                        {s.manager && <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold flex items-center gap-1">
                                                            <User size={10}/> {s.manager}
                                                        </span>}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {/* CLASSIFICAÇÕES DRE */}
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[650px]">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                                        <BarChart3 size={18}/>
                                    </div>
                                    <h3 className="font-bold text-slate-800 dark:text-white text-sm">Classificações DRE</h3>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black rounded-full">{categories.length}</span>
                            </div>
                            
                            <div className="p-4 space-y-3 bg-white dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-800">
                                <button 
                                    onClick={() => setIsDreModalOpen(true)}
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <Plus size={20} strokeWidth={3}/> Nova Classificação DRE
                                </button>

                                <div className="relative pt-2">
                                    <Search className="absolute left-3 top-4.5 text-slate-400" size={14} />
                                    <input 
                                        placeholder="Filtrar classificações..." 
                                        value={categorySearch}
                                        onChange={(e) => setCategorySearch(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl text-xs outline-none focus:border-emerald-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-4 pb-4 custom-scrollbar max-h-[400px]">
                                <div className="border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden bg-white dark:bg-slate-900/20">
                                    {categories
                                        .filter(cat => cat.name.toLowerCase().includes(categorySearch.toLowerCase()))
                                        .map((cat) => (
                                            <div key={cat.id} className="flex flex-col p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        {cat.code && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{cat.code}</span>}
                                                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase">{cat.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button 
                                                            onClick={() => handleDeleteCategory(cat.id, cat.name)} 
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                                                        >
                                                            <Trash2 size={14}/>
                                                        </button>
                                                    </div>
                                                </div>
                                                {(() => {
                                                    const computedNature = cat.name.toUpperCase().includes('RECEITA') ? 'RECEITA' : cat.nature;
                                                    return (
                                                        <span className={`w-fit px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                            computedNature === 'RECEITA' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                            {computedNature}
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTEÚDO: RESUMO DRE */}
                {tab === 'resumo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* BARRA DE FILTROS DRE */}
                        <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Período de Análise</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="date" 
                                            value={dreStartDate}
                                            onChange={(e) => setDreStartDate(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                        <span className="text-slate-400 font-bold">até</span>
                                        <input 
                                            type="date" 
                                            value={dreEndDate}
                                            onChange={(e) => setDreEndDate(e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 min-w-[250px]">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Centro de Custo / Obra</label>
                                    <select 
                                        value={dreSelectedProject}
                                        onChange={(e) => setDreSelectedProject(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20"
                                    >
                                        <option value="GLOBAL">VISÃO GLOBAL (Toda Empresa)</option>
                                        {projects.map(p => (
                                            <option key={p.id || p.name} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="ml-auto">
                                    <button 
                                        onClick={() => loadData()}
                                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                        title="Atualizar Dados"
                                    >
                                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* CARDS EXECUTIVOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Receita Líquida</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{formatter.format(dreData.l3)}</p>
                            </div>
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-orange-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Custos Diretos</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{formatter.format(dreData.l4)}</p>
                            </div>
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-indigo-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Margem de Contribuição</p>
                                <div className="flex items-center gap-2">
                                    <p className="text-2xl font-black text-slate-800 dark:text-white">
                                        {dreData.l3 > 0 ? ((dreData.l5 / dreData.l3) * 100).toFixed(1) : '0.0'}%
                                    </p>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ (dreData.l5 / dreData.l3) > 0.2 ? 'bg-emerald-100 text-emerald-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                        { (dreData.l5 / dreData.l3) > 0.2 ? 'ALTA' : 'BAIXA'}
                                    </span>
                                </div>
                            </div>
                            <div className={`bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 ${dreData.l7 >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">EBITDA / Lucro</p>
                                <p className={`text-2xl font-black ${dreData.l7 >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {formatter.format(dreData.l7)}
                                </p>
                            </div>
                        </div>

                        {/* GRÁFICOS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-[400px]">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <LayoutDashboard size={14} className="text-blue-500"/> Composição de Custos Diretos
                                </h4>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={dreData.costComposition}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {dreData.costComposition.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b'][index % 3]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value: any) => formatter.format(value)}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Legend iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-[400px]">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <BarChart3 size={14} className="text-emerald-500"/> Evolução do DRE (Visão Rápida)
                                </h4>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={dreData.evolutionData}>
                                            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                            <YAxis hide />
                                            <Tooltip 
                                                cursor={{fill: 'transparent'}}
                                                formatter={(value: any) => formatter.format(value)}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                                                {dreData.evolutionData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* TABELA DRE COMPLETA (BAIXO) */}
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden mt-8">
                            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-6 border-b border-slate-100 dark:border-slate-800">
                                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <LayoutDashboard className="text-blue-500" />
                                    Demonstração do Resultado do Exercício (DRE) Completa
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Análise gerencial consolidada para o período selecionado.</p>
                            </div>
                            <div className="p-8">
                                <div className="max-w-4xl mx-auto space-y-1">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-100 dark:bg-slate-800">
                                            <tr>
                                                <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-widest rounded-tl-xl">Classificação</th>
                                                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Realizado</th>
                                                <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-widest rounded-tr-xl">Previsto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dreData.tableData.map((linha, idx) => (
                                                <tr key={idx} className={`border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${linha.isTotal ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                                                    <td className={`p-4 ${linha.isTotal ? 'font-bold' : 'text-sm text-slate-600 dark:text-slate-400 pl-8'}`}>{linha.label}</td>
                                                    <td className={`p-4 text-right font-mono ${linha.isTotal ? 'font-bold' : 'text-sm text-slate-600 dark:text-slate-400'}`}>R$ {linha.realizado.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                                                    <td className={`p-4 text-right font-mono text-slate-400 ${linha.isTotal ? 'font-bold' : 'text-sm'}`}>R$ {linha.previsto.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* CONTEÚDO: FLUXO DE CAIXA */}
                {tab === 'fluxo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* FILTROS FLUXO */}
                        <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex flex-wrap items-center gap-6">
                                <div className="flex flex-col gap-1.5 min-w-[200px]">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Período de Projeção</label>
                                    <select 
                                        value={caixaPeriodo}
                                        onChange={(e) => setCaixaPeriodo(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        <option value="15DIAS">Próximos 15 dias</option>
                                        <option value="30DIAS">Próximos 30 dias</option>
                                        <option value="MES_ATUAL">Mês Atual</option>
                                        <option value="MES_SEGUINTE">Mês Seguinte</option>
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5 min-w-[250px]">
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Centro de Custo / Obra</label>
                                    <select 
                                        value={caixaSelectedProject}
                                        onChange={(e) => setCaixaSelectedProject(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                        <option value="GLOBAL">VISÃO GLOBAL (Toda Empresa)</option>
                                        {projects.map(p => (
                                            <option key={p.id || p.name} value={p.name}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* CARDS DE CAIXA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-blue-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Atual em Conta</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-white">{formatter.format(caixaData.saldoAtual)}</p>
                            </div>
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">A Receber (Previsto)</p>
                                <p className="text-2xl font-black text-emerald-600">{formatter.format(caixaData.aReceber)}</p>
                            </div>
                            <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-red-500">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">A Pagar (Previsto)</p>
                                <p className="text-2xl font-black text-red-600">{formatter.format(caixaData.aPagar)}</p>
                            </div>
                            <div className={`bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 ${caixaData.saldoProjetado >= 0 ? 'border-l-indigo-500' : 'border-l-red-600 animate-pulse'}`}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Saldo Projetado</p>
                                <p className={`text-2xl font-black ${caixaData.saldoProjetado >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600'}`}>
                                    {formatter.format(caixaData.saldoProjetado)}
                                </p>
                            </div>
                        </div>

                        {/* GRÁFICO DE PROJEÇÃO */}
                        <div className="bg-white dark:bg-[#162032] p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8 flex items-center gap-2">
                                <BarChart3 size={16} className="text-emerald-500" /> Projeção de Liquidez Diária
                            </h3>
                            <div className="h-[400px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={caixaData.chartData}>
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `R$ ${val/1000}k`} />
                                        <Tooltip 
                                            formatter={(value: any) => formatter.format(value)}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                                        <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                                        {/* @ts-ignore */}
                                        <Line type="monotone" dataKey="saldo" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} name="Saldo Acumulado" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* TABELA DE DETALHAMENTO CAIXA */}
                        <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Detalhamento de Movimentações</h4>
                                <span className="text-[10px] text-slate-400 font-bold">{caixaData.tableData.length} lançamentos no período</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-[10px] text-slate-400 uppercase bg-slate-50/50 dark:bg-[#111827] border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-black">Data Ref.</th>
                                            <th className="px-6 py-4 font-black">Tipo</th>
                                            <th className="px-6 py-4 font-black">Fornecedor / Cliente</th>
                                            <th className="px-6 py-4 font-black">Obra / C. Custo</th>
                                            <th className="px-6 py-4 font-black">Descrição</th>
                                            <th className="px-6 py-4 font-black">Status</th>
                                            <th className="px-6 py-4 font-black text-right">Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {caixaData.tableData.map((r) => {
                                            const date = r.status === 'Pago' || r.status === 'Recebido' ? r.dataEfetivacao : r.dataVencimento;
                                            return (
                                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-slate-500">{new Date(date).toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${r.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                            {r.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{r.clienteFornecedor}</td>
                                                    <td className="px-6 py-4">
                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200 dark:border-slate-700">
                                                            {r.centroCusto || 'Geral'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 truncate max-w-[250px]">{r.descricao}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`flex items-center gap-1.5 text-[10px] font-bold ${r.status === 'Pago' || r.status === 'Recebido' ? 'text-emerald-500' : r.status === 'Atrasado' ? 'text-red-500' : 'text-slate-400'}`}>
                                                            {r.status === 'Pago' || r.status === 'Recebido' ? <CheckCircle2 size={12}/> : <Calendar size={12}/>}
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-black text-slate-800 dark:text-white">
                                                        {formatter.format(r.valorLiquido)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {caixaData.tableData.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold italic">Nenhuma movimentação prevista para este período.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <Modal title={editingId ? "📝 Editar Lançamento" : "✨ Novo Lançamento"} onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto px-4 py-2 custom-scrollbar">
                        
                        {/* SEÇÃO 1: CATEGORIZAÇÃO E VÍNCULO */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Categorização</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Tipo de Registro</label>
                                    <select 
                                        value={formData.tipo} 
                                        onChange={e => setFormData({...formData, tipo: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="SAÍDA">🔴 SAÍDA (Despesa)</option>
                                        <option value="ENTRADA">🟢 ENTRADA (Receita)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Status Atual</label>
                                    <select 
                                        value={formData.status} 
                                        onChange={e => setFormData({...formData, status: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="A Vencer">⏳ A Vencer</option>
                                        <option value="Pago">✅ Pago / Recebido</option>
                                        <option value="Atrasado">⚠️ Atrasado</option>
                                        <option value="Cancelado / Distrato">🚫 Cancelado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Classificação DRE</label>
                                    <select 
                                        required
                                        value={formData.classificacaoDRE} 
                                        onChange={e => setFormData({...formData, classificacaoDRE: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="">Selecione...</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        {formData.classificacaoDRE && !categories.some(c => c.name === formData.classificacaoDRE) && (
                                            <option value={formData.classificacaoDRE}>{formData.classificacaoDRE} (Existente)</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Centro de Custo / Obra</label>
                                    <select 
                                        required
                                        value={formData.projectId} 
                                        onChange={e => {
                                            const p = projects.find(proj => proj.id.toString() === e.target.value);
                                            setFormData({...formData, projectId: e.target.value, centroCusto: p ? p.name : ''});
                                        }}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="">Selecione a Obra...</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        {formData.projectId && !projects.some(p => p.id.toString() === formData.projectId) && (
                                            <option value={formData.projectId}>{formData.centroCusto} (Obra Externa)</option>
                                        )}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 2: CRONOGRAMA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Datas</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Competência</label>
                                    <input type="date" value={formData.dataCompetencia} onChange={e => setFormData({...formData, dataCompetencia: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Vencimento</label>
                                    <input type="date" required value={formData.dataVencimento} onChange={e => setFormData({...formData, dataVencimento: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-emerald-500/30 dark:border-emerald-500/20 rounded-xl text-xs outline-none"/>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Efetivação</label>
                                    <input type="date" value={formData.dataEfetivacao} onChange={e => setFormData({...formData, dataEfetivacao: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 3: DETALHES DO LANÇAMENTO */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Detalhes</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Cliente / Fornecedor</label>
                                    <select 
                                        required 
                                        value={formData.clienteFornecedor} 
                                        onChange={e => setFormData({...formData, clienteFornecedor: e.target.value})} 
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="">Selecione...</option>
                                        {contacts.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        {formData.clienteFornecedor && !contacts.some(c => c.name === formData.clienteFornecedor) && (
                                            <option value={formData.clienteFornecedor}>{formData.clienteFornecedor} (Existente)</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Descrição do Item</label>
                                    <input required placeholder="Ex: NF 1234 - Compra de Aço..." value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"/>
                                </div>
                             </div>
 
                             <div className="grid grid-cols-3 gap-3">
                                 <div>
                                     <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Cidade</label>
                                     <input placeholder="Marília" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                 </div>
                                 <div>
                                     <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Estado (UF)</label>
                                     <input placeholder="SP" maxLength={2} value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none uppercase"/>
                                 </div>
                                 <div>
                                     <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Setor</label>
                                     <select 
                                        value={formData.setor} 
                                        onChange={e => setFormData({...formData, setor: e.target.value})} 
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                     >
                                        <option value="">Geral / N/A</option>
                                        {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                        {formData.setor && !sectors.some(s => s.name === formData.setor) && (
                                            <option value={formData.setor}>{formData.setor} (Existente)</option>
                                        )}
                                     </select>
                                 </div>
                             </div>
                        </div>

                        {/* SEÇÃO 4: COMPOSIÇÃO FINANCEIRA */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Composição do Valor</h4>
                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="text-[10px] font-black uppercase text-emerald-600 mb-1 block">Valor Bruto (R$)</label>
                                        <input type="number" step="0.01" required value={formData.valorBruto} onChange={e => setFormData({...formData, valorBruto: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 border-2 border-emerald-500/20 rounded-2xl text-xl font-black outline-none focus:border-emerald-500 shadow-sm"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Caução Retida (R$)</label>
                                        <input type="number" step="0.01" value={formData.caucaoRetida} onChange={e => setFormData({...formData, caucaoRetida: e.target.value})} className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none"/>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">ISS (R$)</label>
                                        <input type="number" step="0.01" value={formData.iss} onChange={e => setFormData({...formData, iss: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">INSS (R$)</label>
                                        <input type="number" step="0.01" value={formData.inss} onChange={e => setFormData({...formData, inss: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Outros Retidos (R$)</label>
                                        <input type="number" step="0.01" value={formData.impostosRetidos} onChange={e => setFormData({...formData, impostosRetidos: e.target.value})} className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"/>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor Líquido Estimado</span>
                                        <span className="text-xs text-slate-500 font-medium italic">Calculado automaticamente</span>
                                    </div>
                                    <div className={`text-3xl font-black px-6 py-2 rounded-2xl shadow-sm ${formData.tipo === 'ENTRADA' ? 'text-emerald-500 bg-emerald-500/5 border border-emerald-500/20' : 'text-red-500 bg-red-500/5 border border-red-500/20'}`}>
                                        {formatter.format(
                                            Number(formData.valorBruto || 0) - 
                                            Number(formData.caucaoRetida || 0) - 
                                            Number(formData.iss || 0) - 
                                            Number(formData.inss || 0) - 
                                            Number(formData.impostosRetidos || 0)
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AÇÕES FINAIS */}
                        <div className="pt-6 flex gap-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all uppercase text-[10px] tracking-widest">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-slate-900 dark:bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 uppercase text-[10px] tracking-widest">
                                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                {isSaving ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Confirmar Lançamento')}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
            {isEntityModalOpen && (
                <Modal title="🏢 Nova Empresa" onClose={() => setIsEntityModalOpen(false)}>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSavingBase(true);
                        const dataToSave = {
                            ...entityFormData,
                            cnpj: entityFormData.cnpj || undefined,
                            email: entityFormData.email || undefined,
                            phone: entityFormData.phone || undefined,
                            address: entityFormData.address || undefined
                        };
                        const res = await createSupplier(dataToSave);
                        if (res.success) {
                            setIsEntityModalOpen(false);
                            setEntityFormData({ name: '', type: 'FORNECEDOR', cnpj: '', email: '', phone: '', address: '' });
                            await loadData();
                        } else {
                            alert(res.error);
                        }
                        setIsSavingBase(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Razão Social / Nome</label>
                                <input required value={entityFormData.name} onChange={e => setEntityFormData({...entityFormData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Ex: Construções Ltda" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Tipo de Empresa</label>
                                <select value={entityFormData.type} onChange={e => setEntityFormData({...entityFormData, type: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                                    <option value="FORNECEDOR">FORNECEDOR</option>
                                    <option value="CLIENTE">CLIENTE</option>
                                    <option value="AMBOS">AMBOS (Cliente e Fornecedor)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">CNPJ / CPF</label>
                                <input value={entityFormData.cnpj} onChange={e => setEntityFormData({...entityFormData, cnpj: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" placeholder="00.000.000/0001-00" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">E-mail</label>
                                <input type="email" value={entityFormData.email} onChange={e => setEntityFormData({...entityFormData, email: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" placeholder="contato@empresa.com" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Telefone</label>
                                <input value={entityFormData.phone} onChange={e => setEntityFormData({...entityFormData, phone: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" placeholder="(00) 00000-0000" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Endereço Completo</label>
                                <input value={entityFormData.address} onChange={e => setEntityFormData({...entityFormData, address: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none" placeholder="Rua, Número, Bairro, Cidade - UF" />
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsEntityModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl uppercase text-[10px]">Cancelar</button>
                            <button type="submit" disabled={isSavingBase} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 uppercase text-[10px]">
                                {isSavingBase ? 'Salvando...' : 'Salvar Cadastro'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isDreModalOpen && (
                <Modal title="📊 Nova Classificação DRE" onClose={() => setIsDreModalOpen(false)}>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSavingBase(true);
                        const res = await createFinancialCategory(dreFormData);
                        if (res.success) {
                            setIsDreModalOpen(false);
                            setDreFormData({ code: '', name: '', nature: 'DESPESA' });
                            await loadData();
                        } else {
                            alert(res.error);
                        }
                        setIsSavingBase(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Código de Ordenação (Opcional)</label>
                                <input value={dreFormData.code} onChange={e => setDreFormData({...dreFormData, code: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" placeholder="Ex: 1.1 ou 2" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nome da Classificação</label>
                                <input required value={dreFormData.name} onChange={e => setDreFormData({...dreFormData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-emerald-500" placeholder="Ex: Materiais Básicos" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Natureza</label>
                                <select value={dreFormData.nature} onChange={e => setDreFormData({...dreFormData, nature: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none">
                                    <option value="DESPESA">DESPESA (Saída)</option>
                                    <option value="RECEITA">RECEITA (Entrada)</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsDreModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl uppercase text-[10px]">Cancelar</button>
                            <button type="submit" disabled={isSavingBase} className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 uppercase text-[10px]">
                                {isSavingBase ? 'Salvando...' : 'Salvar Classificação'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isSectorModalOpen && (
                <Modal title="🏢 Novo Setor / Centro de Custo" onClose={() => setIsSectorModalOpen(false)}>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsSavingBase(true);
                        const res = await createSector(sectorFormData);
                        if (res.success) {
                            setIsSectorModalOpen(false);
                            setSectorFormData({ name: '', code: '', manager: '' });
                            await loadData();
                        } else {
                            alert(res.error);
                        }
                        setIsSavingBase(false);
                    }} className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Nome do Setor / Centro de Custo</label>
                                <input required value={sectorFormData.name} onChange={e => setSectorFormData({...sectorFormData, name: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-orange-500" placeholder="Ex: Administrativo, Obra Lapa" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Código (Opcional)</label>
                                <input value={sectorFormData.code} onChange={e => setSectorFormData({...sectorFormData, code: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-orange-500" placeholder="Ex: CC-001, ADM-FIN" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-500 mb-1 block">Responsável (Opcional)</label>
                                <input value={sectorFormData.manager} onChange={e => setSectorFormData({...sectorFormData, manager: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-orange-500" placeholder="Nome do gestor" />
                            </div>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsSectorModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl uppercase text-[10px]">Cancelar</button>
                            <button type="submit" disabled={isSavingBase} className="flex-1 py-3 bg-orange-600 text-white font-black rounded-xl shadow-lg shadow-orange-500/20 uppercase text-[10px]">
                                {isSavingBase ? 'Salvando...' : 'Salvar Setor'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center pb-8">
                <button 
                    onClick={async () => {
                        if (window.confirm("Isso irá sincronizar os dados da planilha legada. Continuar?")) {
                            setIsSavingBase(true);
                            const res = await seedLegacyData();
                            if (res.success) {
                                alert("Sincronização concluída com sucesso!");
                                await loadData();
                            } else {
                                alert("Erro na sincronização: " + res.error);
                            }
                            setIsSavingBase(false);
                        }
                    }}
                    disabled={isSavingBase}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all flex items-center gap-2"
                >
                    {isSavingBase ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Sincronizar Dados Legados (Planilha)
                </button>
            </div>

        </div>

    );
}

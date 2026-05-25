"use client";
import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { canAccessPage, canEmitPurchaseOrder, canApprovePurchase } from '../../lib/permissions';
import { getSupplyData, createPurchaseOrder, receivePurchaseOrder, createMaterial, createPurchaseRequest, updatePurchaseRequest, updatePurchaseRequestStatus, receivePurchaseRequest, registerMaterialConsumption, createSupplier, updateInventoryItem, emitPurchaseOrder, receiveInvoice, saveQuotations, selectWinningQuote, approvePurchaseRequest, approveFinancialQuotation, cancelPurchaseRequest } from '../actions/supply';
import { exportSuprimentosToObsidian } from '../actions/obsidian';
import { 
    PackageSearch, 
    Plus, 
    ArrowLeft, 
    ShoppingCart, 
    Archive, 
    CheckCircle2, 
    PackageCheck, 
    BookOpen, 
    RefreshCw, 
    DollarSign, 
    ClipboardList, 
    AlertTriangle, 
    Truck,
    Layers,
    Search,
    Filter,
    Edit,
    TrendingUp,
    TrendingDown,
    Trash2,
    Eye,
    FileText,
    Receipt,
    ClipboardCheck,
    Building2,
    User,
    LogOut,
    Scale,
    Trophy,
    Zap,
    Star
} from 'lucide-react';
import Link from 'next/link';
import { Modal } from '../../components/Shared';

const formatCurrency = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (!v) return '';
    const num = (parseInt(v, 10) / 100).toFixed(2);
    return num.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

function SuprimentosContent() {
    const { user, logout, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    const [orders, setOrders] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [contacts, setContacts] = useState<any[]>([]);
    const [approvalRules, setApprovalRules] = useState<any>(null);
    const [sectors, setSectors] = useState<any[]>([]);
    const [dreCategories, setDreCategories] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const searchParams = useSearchParams();
    const defaultTab = searchParams?.get('tab') as 'estoque'|'pedidos'|'ordens' || 'estoque';
    const [activeTab, setActiveTab] = useState<'estoque'|'pedidos'|'ordens'>(defaultTab);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncDone, setSyncDone] = useState(false);
    
    // Task 6: Consumo
    const [isConsumptionModalOpen, setIsConsumptionModalOpen] = useState(false);
    const [selectedInventoryItem, setSelectedInventoryItem] = useState<any>(null);
    const [isEditInventoryModalOpen, setIsEditInventoryModalOpen] = useState(false);
    const [inventoryEditData, setInventoryEditData] = useState({ id: 0, materialName: '', estoqueMinimo: 0 });
    const [consumptionFormData, setConsumptionFormData] = useState({
        quantidade: '',
        appliedAt: '',
        responsible: ''
    });

    // Task 7.2: Entrega com Parcelamento
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [selectedDeliveryRequestId, setSelectedDeliveryRequestId] = useState<string | null>(null);
    const [deliveryFormData, setDeliveryFormData] = useState({
        numInstallments: '1',
        intervalDays: '30'
    });
    
    // Estado Modal NF (Invoice)
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
    const [invoiceFormData, setInvoiceFormData] = useState({
        invoiceNumber: '',
        accessKey: '',
        receiverName: '',
        numInstallments: '1',
        intervalDays: '30',
        items: [] as { purchaseOrderItemId: string; quantityReceived: number }[],
        invoiceFile: null as File | null
    });

    // Task 22.2: Mapa de Cotações
    const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
    const [selectedQuotationRequest, setSelectedQuotationRequest] = useState<any>(null);
    const [quotationSortBy, setQuotationSortBy] = useState<'price' | 'delivery'>('price');
    const [quotationFormData, setQuotationFormData] = useState({
        supplierId: '',
        supplierName: '',
        unitPrice: '',
        deliveryDays: '',
        paymentTerms: '30 dias'
    });
    const [pendingQuotations, setPendingQuotations] = useState<any[]>([]);

    const openQuotationModal = (req: any) => {
        setSelectedQuotationRequest(req);
        setPendingQuotations(req.quotations || []);
        setQuotationSortBy('price');
        setIsQuotationModalOpen(true);
    };

    const handleAddQuotation = () => {
        if (!quotationFormData.unitPrice) return;
        const qty = selectedQuotationRequest?.items?.reduce((acc: number, it: any) => acc + it.quantity, 0) || 1;
        const rawUnit = parseFloat(quotationFormData.unitPrice.replace(/\./g, '').replace(',', '.'));
        const rawTotal = rawUnit * qty;
        const newQuote = {
            id: 'temp-' + Date.now(),
            supplierId: quotationFormData.supplierId || null,
            supplierName: quotationFormData.supplierId 
                ? suppliers.find(s => s.id === quotationFormData.supplierId)?.name || 'Fornecedor'
                : quotationFormData.supplierName,
            unitPrice: rawUnit,
            totalPrice: rawTotal,
            deliveryDays: parseInt(quotationFormData.deliveryDays || '0'),
            paymentTerms: quotationFormData.paymentTerms,
            isWinner: false
        };
        setPendingQuotations([...pendingQuotations, newQuote]);
        setQuotationFormData({ supplierId: '', supplierName: '', unitPrice: '', deliveryDays: '', paymentTerms: '30 dias' });
    };

    const handleSaveQuotations = async () => {
        if (!selectedQuotationRequest) return;
        try {
            const res = await saveQuotations(selectedQuotationRequest.id, pendingQuotations);
            if (res.success) {
                alert("Cotações salvas no rascunho com sucesso! Lembre-se de abrir o mapa novamente e clicar em 'Escolher e Enviar p/ Aprovação' na melhor cotação.");
                loadData();
                setIsQuotationModalOpen(false);
            } else {
                alert("Erro: " + res.error);
            }
        } catch (err: any) {
            alert("Erro: " + err.message);
        }
    };

    const handleSelectWinner = async (quoteId: string) => {
        if (!selectedQuotationRequest) return;
        if (quoteId.startsWith('temp-')) {
            alert("Você adicionou novas cotações! Clique em 'Salvar Mapa' primeiro. Depois abra novamente e clique em 'Escolher e Enviar p/ Aprovação'.");
            return;
        }
        try {
            const res = await selectWinningQuote(quoteId, user?.name);
            if (res.success) {
                alert("Vencedor selecionado! Pedido enviado para aprovação.");
                setIsQuotationModalOpen(false);
                loadData();
            } else {
                alert("Erro: " + (res as any).error);
            }
        } catch (err: any) {
            alert("Erro: " + err.message);
        }
    };

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState('all');

    // Filter Data based on selectedProject and searchTerm
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesProject = selectedProject === 'all' || item.projectId.toString() === selectedProject;
            const searchLower = searchTerm.toLowerCase();
            const materialName = item.linkedMaterial?.name || item.materialName || '';
            const matchesSearch = materialName.toLowerCase().includes(searchLower) || (item.linkedMaterial?.code || '').toLowerCase().includes(searchLower);
            return matchesProject && matchesSearch;
        });
    }, [inventory, selectedProject, searchTerm]);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            if (['ORDEM_EMITIDA', 'ENTREGUE', 'PARCIALMENTE_ENTREGUE', 'ENTREGUE_TOTAL'].includes(req.status)) return false;
            const matchesProject = selectedProject === 'all' || req.projectId?.toString() === selectedProject;
            const searchLower = searchTerm.toLowerCase();
            const materialName = req.material?.name || '';
            const supplierName = req.supplier?.name || '';
            const matchesSearch = materialName.toLowerCase().includes(searchLower) || supplierName.toLowerCase().includes(searchLower) || req.requestCode?.toLowerCase().includes(searchLower);
            return matchesProject && matchesSearch;
        });
    }, [requests, selectedProject, searchTerm]);

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const matchesProject = selectedProject === 'all' || order.projectId?.toString() === selectedProject;
            const searchLower = searchTerm.toLowerCase();
            const supplierName = order.supplier?.name || '';
            const orderCode = order.orderCode || '';
            const matchesSearch = supplierName.toLowerCase().includes(searchLower) || orderCode.toLowerCase().includes(searchLower);
            return matchesProject && matchesSearch;
        });
    }, [orders, selectedProject, searchTerm]);

    // Calculate Summary Metrics
    const capitalEmEstoque = filteredInventory.reduce((acc, item) => acc + (item.quantidadeAtual * 35), 0); // Cost Mockup for now
    const pendingRequestsCount = filteredRequests.filter(r => r.status === 'PENDENTE').length;
    const criticalStockCount = filteredInventory.filter(item => item.quantidadeAtual < item.estoqueMinimo).length;
    const transitRequestsCount = filteredRequests.filter(r => r.status === 'APROVADO').length;

    const handleObsidianSync = async () => {
        setIsSyncing(true);
        setSyncDone(false);
        await exportSuprimentosToObsidian();
        setIsSyncing(false);
        setSyncDone(true);
        setTimeout(() => setSyncDone(false), 3000);
    };

    // Form State
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        materialId: '',
        quantidade: '',
        unidade: 'UN',
        valorEstimado: '',
        projectId: '',
        requesterName: '',
        supplierId: '',
        sector: '',
        dreCategory: '',
        city: '',
        state: ''
    });

    const [catalogFormData, setCatalogFormData] = useState({
        code: '',
        name: '',
        unit: 'UN',
        category: 'Materiais Básicos'
    });

    const loadData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSupplyData();
            setOrders(data.orders);
            setRequests(data.requests);
            setInventory(data.inventory);
            setProjects(data.projects);
            setMaterials(data.materials);
            setSuppliers(data.suppliers || []);
            setContacts(data.contacts || []);
            setSectors(data.sectors || []);
            setDreCategories(data.dreCategories || []);
            setApprovalRules(data.approvalRules || null);
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
        if (user && !canAccessPage(user.role, 'suprimentos')) {
            router.push('/');
            return;
        }
        loadData();
    }, [user, isAuthLoading, router, loadData]);

    const handleEditRequest = (req: any) => {
        setEditingRequestId(req.id);
        setFormData({
            materialId: req.items[0]?.materialId || '',
            quantidade: req.items[0]?.quantity?.toString() || '',
            unidade: req.items[0]?.material?.unit || 'UN',
            valorEstimado: req.items[0]?.estimatedCost?.toString() || '',
            projectId: req.projectId?.toString() || '',
            requesterName: req.requesterName || '',
            supplierId: req.supplierId || '',
            sector: req.sector || '',
            dreCategory: req.dreCategory || '',
            city: req.project?.city || '',
            state: req.project?.state || ''
        });
        setIsModalOpen(true);
    };

    const handlePurchaseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                requesterName: user?.name || 'Usuário do Sistema',
                items: [{
                    materialId: formData.materialId,
                    quantidade: formData.quantidade,
                    valorEstimado: formData.valorEstimado,
                    urgencia: 'BAIXA'
                }]
            };
            let res;
            if (editingRequestId) {
                res = await updatePurchaseRequest(editingRequestId, payload);
            } else {
                res = await createPurchaseRequest(payload);
            }

            if (res.success) {
                alert(editingRequestId ? "Solicitação atualizada com sucesso!" : "Solicitação de compra enviada com sucesso!");
                setIsModalOpen(false);
                setEditingRequestId(null);
                setFormData({ materialId: '', quantidade: '', unidade: 'UN', valorEstimado: '', projectId: '', requesterName: '', supplierId: '', sector: '', dreCategory: '', city: '', state: '' });
                loadData();
            } else {
                alert("Erro ao enviar: " + res.error);
            }
        } catch (err: any) {
            console.error(err);
            alert("Erro crítico na comunicação com o servidor.");
        }
    };

    const handleCatalogSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await createMaterial(catalogFormData);
        if (res.success) {
            alert("Insumo cadastrado no catálogo com sucesso!");
            setIsCatalogModalOpen(false);
            setCatalogFormData({ code: '', name: '', unit: 'UN', category: 'Materiais Básicos' });
        } else {
            alert("Erro ao cadastrar: " + res.error);
        }
    };

    const handleStatusUpdate = async (reqId: string, newStatus: string) => {
        try {
        const res = await updatePurchaseRequestStatus(reqId, newStatus, user?.role);
        if(res.success) {
                loadData();
                setIsDetailsModalOpen(false);
            }
        } catch(e) { console.error(e); }
    };

    const handleEmitOrder = async () => {
        if (!selectedRequest) return;
        if (!confirm("Tem certeza que deseja emitir a Ordem de Compra para este pedido?")) return;
        try {
            const res = await emitPurchaseOrder(selectedRequest.id, user?.name || "Comprador");
            if (res.success) {
                alert("Ordem de Compra emitida com sucesso!");
                setIsDetailsModalOpen(false);
                loadData();
            } else {
                alert("Erro ao emitir ordem: " + res.error);
            }
        } catch (e) { console.error(e); }
    };

    const handleApproveSC = async (reqId: string) => {
        if (!confirm("Tem certeza que deseja aprovar esta Solicitação de Compra?")) return;
        try {
            const res = await approvePurchaseRequest(reqId, user?.name || "Engenheiro");
            if (res.success) {
                alert("Solicitação aprovada com sucesso!");
                loadData();
            } else {
                alert("Erro ao aprovar: " + res.error);
            }
        } catch (e) { console.error(e); }
    };

    const handleApproveFinancial = async (reqId: string) => {
        if (!confirm("Tem certeza que deseja aprovar financeiramente esta cotação?")) return;
        try {
            const res = await approveFinancialQuotation(reqId, user?.name || "Aprovador");
            if (res.success) {
                alert("Aprovação financeira realizada com sucesso!");
                loadData();
                setIsDetailsModalOpen(false);
            } else {
                alert("Erro: " + res.error);
            }
        } catch (e) { console.error(e); }
    };

    const handleCancelPurchase = async (reqId: string) => {
        if (!confirm("Tem certeza que deseja cancelar este pedido? Se houver um Contas a Pagar associado, ele será excluído.")) return;
        try {
            const res = await cancelPurchaseRequest(reqId, user?.name || "Usuário");
            if (res.success) {
                alert("Pedido cancelado com sucesso!");
                loadData();
                setIsDetailsModalOpen(false);
            } else {
                alert("Erro ao cancelar: " + res.error);
            }
        } catch (e) { console.error(e); }
    };

    const handleDelivery = (id: string) => {
        setSelectedDeliveryRequestId(id);
        setIsDeliveryModalOpen(true);
    };

    const handleConfirmDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeliveryRequestId) return;
        
        try {
            const res = await receivePurchaseRequest(
                selectedDeliveryRequestId, 
                parseInt(deliveryFormData.numInstallments), 
                parseInt(deliveryFormData.intervalDays)
            );
            if (res.success) {
                alert("Entrega registrada e parcelas geradas no financeiro!");
                setIsDeliveryModalOpen(false);
                loadData();
            } else {
                alert("Erro ao registrar: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Erro técnico ao registrar.");
        }
    };

    const handleEditInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                id: inventoryEditData.id,
                materialName: inventoryEditData.materialName,
                estoqueMinimo: Number(inventoryEditData.estoqueMinimo)
            };
            const res = await updateInventoryItem(payload);
            if(res.success) {
                alert("Estoque atualizado com sucesso!");
                setIsEditInventoryModalOpen(false);
                loadData();
            } else {
                alert("Erro: " + res.error);
            }
        } catch(err) {
            console.error(err);
        }
    };

    const handleConsumptionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInventoryItem) return;
        
        try {
            const res = await registerMaterialConsumption({
                inventoryItemId: selectedInventoryItem.id,
                quantity: parseFloat(consumptionFormData.quantidade),
                appliedAt: consumptionFormData.appliedAt,
                responsible: consumptionFormData.responsible
            });
            
            if (res.success) {
                alert("Consumo registrado e estoque baixado!");
                setIsConsumptionModalOpen(false);
                setConsumptionFormData({ quantidade: '', appliedAt: '', responsible: '' });
                loadData();
            } else {
                alert("Erro: " + res.error);
            }
        } catch (err: any) {
            alert("Erro técnico: " + err.message);
        }
    };

    const handleOpenInvoiceModal = (order: any) => {
        setSelectedOrder(order);
        setInvoiceFormData({
            invoiceNumber: '',
            accessKey: '',
            receiverName: user?.name || '',
            numInstallments: '1',
            intervalDays: '30',
            items: order.items.map((item: any) => ({ purchaseOrderItemId: item.id, quantityReceived: item.quantityPurchased - item.quantityReceived })),
            invoiceFile: null
        });
        setIsInvoiceModalOpen(true);
    };

    const handleInvoiceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;
        try {
            let invoicePhotoUrl = undefined;
            if (invoiceFormData.invoiceFile) {
                const formData = new FormData();
                formData.append('file', invoiceFormData.invoiceFile);
                const uploadRes = await fetch('/api/upload/nf', { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                if (uploadData.url) {
                    invoicePhotoUrl = uploadData.url;
                }
            }

            const res = await receiveInvoice({
                purchaseOrderId: selectedOrder.id,
                invoiceNumber: invoiceFormData.invoiceNumber,
                accessKey: invoiceFormData.accessKey || undefined,
                receiverName: invoiceFormData.receiverName,
                invoicePhotoUrl,
                items: invoiceFormData.items,
                numInstallments: parseInt(invoiceFormData.numInstallments),
                intervalDays: parseInt(invoiceFormData.intervalDays)
            });
            if (res.success) {
                alert('Nota Fiscal registrada com sucesso! Estoque e financeiro atualizados.');
                setIsInvoiceModalOpen(false);
                setInvoiceFormData(prev => ({ ...prev, invoiceFile: null }));
                loadData();
            } else {
                alert('Erro: ' + (res as any).error);
            }
        } catch (err: any) {
            alert('Erro tecnico: ' + err.message);
        }
    };

    const isAlmoxarife = user?.role === 'Almoxarife';

    const handleRepositionRequest = (item: any) => {
        setFormData({
            ...formData,
            materialId: item.materialId || item.linkedMaterial?.id || '',
            projectId: item.projectId?.toString() || '',
            city: item.project?.city || '',
            state: item.project?.state || '',
        });
        setIsModalOpen(true);
    };

    if (isLoading || isAuthLoading) return <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>;

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans">
            {/* HEADER */}
            <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center px-8 sticky top-0 z-40 shadow-sm">
                {!isAlmoxarife && (
                    <Link href="/" className="mr-6 text-slate-400 hover:text-indigo-500 transition-colors"><ArrowLeft size={24} /></Link>
                )}
                <div>
                    <h1 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter italic">
                        <PackageSearch className="text-indigo-500" size={28}/> Suprimentos <span className="text-slate-300 font-light">&</span> Almoxarifado
                    </h1>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Central de Compras & Logística</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <button
                        onClick={handleObsidianSync}
                        disabled={isSyncing}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-violet-100 dark:border-violet-800 shadow-sm hover:bg-violet-100"
                    >
                        {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <BookOpen size={14} />}
                        {isSyncing ? 'Exportando...' : syncDone ? '✅ Exportado!' : 'Relatório Obsidian'}
                    </button>
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#162032] px-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ml-2">
                        <Link href="/perfil" className="flex items-center gap-3 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer group">
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/50 rounded-full flex items-center justify-center transition-colors">
                                <User size={16} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-none mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user?.name}</p>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">{user?.role}</p>
                            </div>
                        </Link>
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                        <button 
                            onClick={() => {
                                document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                                document.cookie = "userEmail=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                                logout();
                                router.push('/login');
                            }}
                            title="Sair do sistema"
                            className="text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-all"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                    {!isAlmoxarife && (
                        <button onClick={() => setIsCatalogModalOpen(true)} className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                            <Plus size={18}/> + CADASTRAR CATÁLOGO
                        </button>
                    )}
                    {!isAlmoxarife && (
                        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95">
                            <ShoppingCart size={18}/> Solicitar Compra
                        </button>
                    )}
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                
                {/* EXECUTIVE SUMMARY CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/70 backdrop-blur-xl dark:bg-[#162032]/80 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 flex items-center gap-5 group hover:-translate-y-1 hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-600 transition-all">
                            <Layers size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital em Estoque</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">{formatter.format(capitalEmEstoque)}</h3>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl dark:bg-[#162032]/80 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 flex items-center gap-5 group hover:-translate-y-1 hover:shadow-orange-500/10 hover:border-orange-500/50 transition-all duration-300">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 group-hover:text-orange-600 transition-all">
                            <ClipboardList size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Solicitações Pendentes</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">{pendingRequestsCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl dark:bg-[#162032]/80 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 flex items-center gap-5 group hover:-translate-y-1 hover:shadow-red-500/10 hover:border-red-500/50 transition-all duration-300">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-red-50 dark:group-hover:bg-red-900/20 group-hover:text-red-600 transition-all">
                            <AlertTriangle size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estoque Crítico</p>
                            <h3 className="text-xl font-black text-red-600 dark:text-red-400">{criticalStockCount} Itens</h3>
                        </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-xl dark:bg-[#162032]/80 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg shadow-slate-200/20 flex items-center gap-5 group hover:-translate-y-1 hover:shadow-blue-500/10 hover:border-blue-500/50 transition-all duration-300">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 rounded-2xl group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-all">
                            <Truck size={24}/>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pedidos em Trânsito</p>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">{transitRequestsCount}</h3>
                        </div>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="space-y-6">
                    {/* TABS & FILTERS */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-700 px-2">
                        <div className="flex gap-8">
                            <button 
                                onClick={() => setActiveTab('estoque')} 
                                className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'estoque' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {activeTab === 'estoque' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full shadow-[0_-4px_10px_rgba(99,102,241,0.5)]"></span>}
                                Controle de Estoque
                            </button>
                            <button 
                                onClick={() => setActiveTab('pedidos')} 
                                className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'pedidos' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {activeTab === 'pedidos' && <span className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full shadow-[0_-4px_10px_rgba(99,102,241,0.5)]"></span>}
                                Pedidos de Compra
                            </button>
                            <button 
                                onClick={() => setActiveTab('ordens')} 
                                className={`pb-4 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'ordens' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {activeTab === 'ordens' && <span className='absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full shadow-[0_-4px_10px_rgba(99,102,241,0.5)]'></span>}
                                Ordens de Compra
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pb-3">
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                                <input 
                                    type="text" 
                                    placeholder="Buscar insumo..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-64"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
                                <select 
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="pl-9 pr-8 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="all">Todas as Obras</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#162032] rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            
                            {activeTab === 'estoque' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Código / Material</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra / Local</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Atual / Mínimo</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Custo Médio</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredInventory.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold italic">Nenhum item em estoque encontrado.</td></tr>
                                        ) : filteredInventory.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                                <td className="px-6 py-5">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-0.5">{item.linkedMaterial?.code || `ID: ${item.materialId || 'N/A'}`}</p>
                                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                                                        {item.linkedMaterial?.name || (item.materialId ? `${item.materialId} (Material não cadastrado)` : "Item sem ID")}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-500">{item.project?.name || 'Local'}</td>
                                                <td className="px-6 py-5 text-right font-black">
                                                    <span className={item.quantidadeAtual < item.estoqueMinimo ? 'text-red-500' : 'text-indigo-600 dark:text-indigo-400'}>{item.quantidadeAtual}</span>
                                                    <span className="text-slate-300 dark:text-slate-600 mx-1">/</span>
                                                    <span className="text-slate-400 font-bold text-xs">{item.estoqueMinimo}</span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <p className="font-black text-slate-700 dark:text-slate-200 text-sm">
                                                        {formatter.format(35.00)} 
                                                        <span className="text-slate-400 text-xs font-bold ml-1">/ {item.unidade}</span>
                                                    </p>
                                                    <div className={`flex items-center justify-end gap-1 text-[9px] font-black uppercase text-emerald-500`}>
                                                        <TrendingDown size={10}/> 0% vs. última
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-slate-700 dark:text-slate-200 text-sm">{formatter.format(item.quantidadeAtual * 35)}</td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        item.quantidadeAtual >= item.estoqueMinimo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700 animate-pulse'
                                                    }`}>
                                                        {item.quantidadeAtual >= item.estoqueMinimo ? 'Normal' : 'Baixo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => { setSelectedInventoryItem(item); setIsConsumptionModalOpen(true); }}
                                                            title="Registrar Consumo / Baixa" 
                                                            className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                                        >
                                                            <PackageCheck size={14}/>
                                                        </button>
                                                        <button onClick={() => handleRepositionRequest(item)} title="Nova Solicitação de Reposição" className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                                            <ShoppingCart size={14}/>
                                                        </button>
                                                        {!isAlmoxarife && (
                                                            <button onClick={() => { setInventoryEditData({ id: item.id, materialName: item.materialName || item.linkedMaterial?.name, estoqueMinimo: item.estoqueMinimo }); setIsEditInventoryModalOpen(true); }} title="Editar Cadastro de Insumo" className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                                <Edit size={14}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'pedidos' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Pedido</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra / Destino</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Data</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Previsto</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredRequests.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold italic">Nenhuma solicitação de compra encontrada.</td></tr>
                                        ) : filteredRequests.map((req, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-5 text-sm font-black text-blue-600 dark:text-blue-400">{req.requestCode}</td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-800 dark:text-slate-200 uppercase">
                                                    {req.project?.name || 'N/A'}
                                                    <div className="text-[10px] text-slate-400 font-bold">{req.project?.city || ''} {req.project?.state ? `- ${req.project.state}` : ''}</div>
                                                </td>
                                                <td className="px-6 py-5 text-xs font-bold text-slate-600 dark:text-slate-400">{req.supplier?.name || '-'}</td>
                                                <td className="px-6 py-5 text-sm font-medium text-slate-500">{req.requesterName}</td>
                                                <td className="px-6 py-5 text-center text-xs text-slate-500 font-bold">{new Date(req.createdAt).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-6 py-5 text-right font-black text-slate-800 dark:text-slate-100 text-sm">
                                                    {(() => {
                                                        const winner = req.quotations?.find((q: any) => q.isWinner);
                                                        if (winner) return formatter.format(winner.totalPrice);
                                                        return formatter.format(req.items?.reduce((acc: number, item: any) => acc + (item.estimatedCost || 0), 0) || 0);
                                                    })()}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        req.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : 
                                                        req.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : 
                                                        req.status === 'REJEITADO' ? 'bg-red-100 text-red-700' :
                                                        req.status === 'ENTREGUE' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button 
                                                            onClick={() => { setSelectedRequest(req); setIsDetailsModalOpen(true); }}
                                                            title="Ver Detalhes do Pedido" 
                                                            className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                        >
                                                            <Eye size={16}/>
                                                        </button>

                                                        {req.status === 'PENDENTE' && (
                                                            <button 
                                                                onClick={() => handleEditRequest(req)}
                                                                title="Editar Pedido" 
                                                                className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                            >
                                                                <Edit size={16}/>
                                                            </button>
                                                        )}

                                                        {req.status === 'PENDENTE' && ['Engenheiro Residente', 'Coordenador de Obras', 'Diretor'].includes(user?.role || '') && (
                                                            <button 
                                                                onClick={() => handleApproveSC(req.id)}
                                                                title="Aprovar SC"
                                                                className="p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 hover:bg-yellow-500 hover:text-white rounded-xl transition-all border border-transparent"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                            </button>
                                                        )}

                                                         {req.status === 'ORDEM_EMITIDA' && ['Almoxarife', 'Engenheiro Residente', 'Diretor'].includes(user?.role as string) && (
                                                            <button 
                                                                onClick={() => handleDelivery(req.id)}
                                                                title="Registrar Entrega"
                                                                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                            >
                                                                <Truck size={18} />
                                                            </button>
                                                        )}
                                                        {(req.status === 'APROVADO' || req.status === 'EM_COTACAO') && user?.role === 'Comprador' && (
                                                            <button 
                                                                onClick={() => openQuotationModal(req)}
                                                                title="Mapa de Cotações" 
                                                                className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                            >
                                                                <Scale size={16}/>
                                                            </button>
                                                        )}
                                                        {req.status === 'PENDENTE' && canApprovePurchase(user?.role || '') && (
                                                            <>
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(req.id, 'APROVADO')}
                                                                    title="Aprovar Pedido" 
                                                                    className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                >
                                                                    <CheckCircle2 size={16}/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(req.id, 'REJEITADO')}
                                                                    title="Rejeitar Solicitação" 
                                                                    className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                                >
                                                                    <Trash2 size={16}/>
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {activeTab === 'ordens' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Codigo / Obra</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Valor Total</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">NFs</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Acoes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {filteredOrders.length === 0 ? (
                                            <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-bold italic">Nenhuma Ordem de Compra encontrada.</td></tr>
                                        ) : filteredOrders.map((order: any, i: number) => {
                                            const totalReceived = order.items.reduce((acc: number, item: any) => acc + item.quantityReceived, 0);
                                            const totalPurchased = order.items.reduce((acc: number, item: any) => acc + item.quantityPurchased, 0);
                                            const progressPct = totalPurchased > 0 ? Math.round((totalReceived / totalPurchased) * 100) : 0;
                                            const canReceive = order.status !== 'ENTREGUE_TOTAL';
                                            return (
                                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{order.orderCode}</p>
                                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">{order.project?.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase">{order.supplier?.name || '-'}</td>
                                                    <td className="px-6 py-5">
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{order.items.length} item(s)</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1">{progressPct}% recebido</p>
                                                    </td>
                                                    <td className="px-6 py-5 text-right text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                        R$ {order.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-full">
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center text-xs font-bold text-slate-500">
                                                        {order.invoices?.length > 0 ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                {order.invoices.map((inv: any, idx: number) => (
                                                                    inv.invoicePhotoUrl ? (
                                                                        <a key={idx} href={inv.invoicePhotoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline">
                                                                            <FileText size={12}/> NF {inv.invoiceNumber}
                                                                        </a>
                                                                    ) : (
                                                                        <span key={idx} className="flex items-center gap-1"><FileText size={12}/> NF {inv.invoiceNumber}</span>
                                                                    )
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            "0 NF(s)"
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedOrder(order); setIsOrderDetailOpen(true); }}
                                                                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center justify-center transition-all"
                                                            >
                                                                <Eye size={14}/>
                                                            </button>
                                                            {canReceive && (
                                                                <button 
                                                                    onClick={() => handleOpenInvoiceModal(order)}
                                                                    className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-sm shadow-emerald-500/20"
                                                                    title="Registrar Entrega (NF)"
                                                                >
                                                                    <Truck size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                        </div>
                    </div>
                </div>
            </div>
            {/* MODAL DETALHE ORDEM DE COMPRA */}
            {isOrderDetailOpen && selectedOrder && (
                <Modal title={`Ordem de Compra: ${selectedOrder.orderCode}`} onClose={() => setIsOrderDetailOpen(false)}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Obra</p><p className="text-sm font-black text-indigo-600">{selectedOrder.project?.name}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Fornecedor</p><p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedOrder.supplier?.name || 'N/D'}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Valor Total</p><p className="text-sm font-black text-slate-700 dark:text-slate-200">{formatter.format(selectedOrder.totalCost)}</p></div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase">Status</p><p className="text-sm font-black">{selectedOrder.status.replace(/_/g, ' ')}</p></div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Itens da Ordem</p>
                            <div className="space-y-2">
                                {selectedOrder.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                        <div>
                                            <p className="text-sm font-black text-slate-800 dark:text-white">{item.material?.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">R$ {item.unitPrice?.toFixed(2)}/un</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{item.quantityReceived}/{item.quantityPurchased} <span className="text-[10px] text-slate-400">{item.material?.unit}</span></p>
                                            <p className="text-[10px] font-bold text-emerald-600">{Math.round((item.quantityReceived/item.quantityPurchased)*100)}% recebido</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {selectedOrder.invoices?.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Notas Fiscais Recebidas</p>
                                <div className="space-y-2">
                                    {selectedOrder.invoices.map((inv: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                                            <div>
                                                <p className="text-sm font-black text-slate-800 dark:text-white">NF #{inv.invoiceNumber}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">Recebido por: {inv.receiverName}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 font-bold">{new Date(inv.receivedAt).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setIsOrderDetailOpen(false)} className="flex-1 p-3 text-slate-600 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700">Fechar</button>
                            {selectedOrder.status !== 'ENTREGUE_TOTAL' && (
                                <button onClick={() => { setIsOrderDetailOpen(false); handleOpenInvoiceModal(selectedOrder); }} className="flex-1 p-3 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                                    <Receipt size={16}/> Registrar NF
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL RECEBIMENTO DE NOTA FISCAL */}
            {isInvoiceModalOpen && selectedOrder && (
                <Modal title={`Entrada de NF - ${selectedOrder.orderCode}`} onClose={() => setIsInvoiceModalOpen(false)}>
                    <form onSubmit={handleInvoiceSubmit} className="space-y-5">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Dados da Nota Fiscal</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Numero da NF *</label>
                                    <input type="text" required placeholder="Ex: 000123" value={invoiceFormData.invoiceNumber} onChange={e => setInvoiceFormData({...invoiceFormData, invoiceNumber: e.target.value})} className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Chave NF-e (opcional)</label>
                                    <input type="text" placeholder="44 digitos..." value={invoiceFormData.accessKey} onChange={e => setInvoiceFormData({...invoiceFormData, accessKey: e.target.value})} className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Almoxarife / Responsavel pelo Recebimento *</label>
                                <input type="text" required value={invoiceFormData.receiverName} onChange={e => setInvoiceFormData({...invoiceFormData, receiverName: e.target.value})} className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold" />
                            </div>
                            <div className="mt-4">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Anexo da Nota Fiscal (PDF ou Imagem) *</label>
                                <input type="file" required accept="image/*,.pdf" onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        setInvoiceFormData({...invoiceFormData, invoiceFile: e.target.files[0]});
                                    }
                                }} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 transition-all cursor-pointer" />
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Quantidades Recebidas por Item</p>
                            <div className="space-y-3">
                                {selectedOrder.items?.map((item: any, idx: number) => {
                                    const remaining = item.quantityPurchased - item.quantityReceived;
                                    return (
                                        <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-black text-slate-800 dark:text-white">{item.material?.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400">Pendente: {remaining} {item.material?.unit}</p>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max={remaining}
                                                value={invoiceFormData.items[idx]?.quantityReceived ?? remaining}
                                                onChange={e => {
                                                    const newItems = [...invoiceFormData.items];
                                                    newItems[idx] = { purchaseOrderItemId: item.id, quantityReceived: parseFloat(e.target.value) || 0 };
                                                    setInvoiceFormData({...invoiceFormData, items: newItems});
                                                }}
                                                className="w-full p-2 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold"
                                                placeholder={`Qtd recebida (max: ${remaining})`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">Condicoes de Pagamento</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Parcelamento</label>
                                    <select value={invoiceFormData.numInstallments} onChange={e => setInvoiceFormData({...invoiceFormData, numInstallments: e.target.value})} className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-indigo-500">
                                        <option value="1">A Vista (1x)</option>
                                        <option value="2">2 Parcelas</option>
                                        <option value="3">3 Parcelas</option>
                                        <option value="4">4 Parcelas</option>
                                        <option value="5">5 Parcelas</option>
                                        <option value="6">6 Parcelas</option>
                                        <option value="12">12 Parcelas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Intervalo (Dias)</label>
                                    <input type="number" value={invoiceFormData.intervalDays} onChange={e => setInvoiceFormData({...invoiceFormData, intervalDays: e.target.value})} className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-indigo-500" />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={() => setIsInvoiceModalOpen(false)} className="flex-1 p-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
                            <button type="submit" className="flex-1 p-3 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-2">
                                <ClipboardCheck size={16}/> Confirmar Entrada
                            </button>
                        </div>
                    </form>
                </Modal>
            )}


            {/* MODAL SOLICITAÇÃO COMPRA */}
            {isModalOpen && (
                <Modal title={editingRequestId ? "Editar Solicitação de Compra (SC)" : "Nova Solicitação de Compra (SC)"} onClose={() => { setIsModalOpen(false); setEditingRequestId(null); setFormData({ materialId: '', quantidade: '', unidade: 'UN', valorEstimado: '', projectId: '', requesterName: '', supplierId: '', sector: '', dreCategory: '', city: '', state: '' }); }}>
                    <form onSubmit={handlePurchaseSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Material / Serviço (Catálogo)</label>
                            <select 
                                required 
                                value={formData.materialId} 
                                onChange={e => {
                                    const mat = materials.find(m => m.id === e.target.value);
                                    setFormData({...formData, materialId: e.target.value, unidade: mat?.unit || 'UN'});
                                }} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold"
                            >
                                <option value="">Selecione um insumo do catálogo...</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>[{m.code}] {m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantidade</label>
                                <input type="number" step="0.01" required value={formData.quantidade} onChange={e => setFormData({...formData, quantidade: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500"/>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade (Auto)</label>
                                <input type="text" readOnly value={formData.unidade} className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none text-slate-400 font-black" />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Solicitante</label>
                            <input type="text" readOnly value={user?.name || ''} className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none text-slate-500 font-bold cursor-not-allowed" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Para qual Obra?</label>
                                <select 
                                    required 
                                    value={formData.projectId} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val) {
                                            setFormData({...formData, projectId: '', city: '', state: ''});
                                            return;
                                        }
                                        const projId = Number(val);
                                        const proj = projects.find(p => p.id === projId);
                                        console.log("Obra selecionada:", proj);
                                        let parsedCity = proj?.city || '';
                                        let parsedState = proj?.state || '';
                                        if (!parsedCity && proj?.address) {
                                            try {
                                                const addr = JSON.parse(proj.address);
                                                parsedCity = addr.city || '';
                                                parsedState = addr.state || '';
                                            } catch (e) {}
                                        }

                                        setFormData({
                                            ...formData, 
                                            projectId: val,
                                            city: parsedCity,
                                            state: parsedState
                                        });
                                    }} 
                                    className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold"
                                >
                                    <option value="">Selecione a obra destino...</option>
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cidade (Auto)</label>
                                    <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estado</label>
                                    <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Setor Destino</label>
                                <select 
                                    value={formData.sector} 
                                    onChange={e => setFormData({...formData, sector: e.target.value})}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500"
                                >
                                    <option value="">Selecione o Setor...</option>
                                    {sectors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Classificação DRE</label>
                                <select 
                                    value={formData.dreCategory} 
                                    onChange={e => setFormData({...formData, dreCategory: e.target.value})}
                                    className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:border-indigo-500 font-bold"
                                >
                                    <option value="">Selecione DRE...</option>
                                    {dreCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg flex justify-center items-center gap-2 shadow-lg transition-colors"><CheckCircle2 size={18}/> Enviar Solicitação</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL CADASTRAR CATÁLOGO */}
            {isCatalogModalOpen && (
                <Modal title="Novo Item no Catálogo Global" onClose={() => setIsCatalogModalOpen(false)}>
                    <form onSubmit={handleCatalogSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Código do Insumo</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="Ex: MAT-001" 
                                    value={catalogFormData.code} 
                                    onChange={e => setCatalogFormData({...catalogFormData, code: e.target.value})} 
                                    className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unidade de Medida</label>
                                <select 
                                    value={catalogFormData.unit} 
                                    onChange={e => setCatalogFormData({...catalogFormData, unit: e.target.value})} 
                                    className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                                >
                                    <option value="UN">Unidade (UN)</option>
                                    <option value="SC">Saco (SC)</option>
                                    <option value="KG">Quilo (KG)</option>
                                    <option value="M3">Metro Cúbico (M3)</option>
                                    <option value="L">Litro (L)</option>
                                    <option value="M">Metro (M)</option>
                                    <option value="CX">Caixa (CX)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome / Descrição</label>
                            <input 
                                type="text" 
                                required 
                                placeholder="Ex: Cimento CP-II 50kg" 
                                value={catalogFormData.name} 
                                onChange={e => setCatalogFormData({...catalogFormData, name: e.target.value})} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Categoria</label>
                            <select 
                                value={catalogFormData.category} 
                                onChange={e => setCatalogFormData({...catalogFormData, category: e.target.value})} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                            >
                                <option value="Materiais Básicos">Materiais Básicos</option>
                                <option value="Elétrica">Elétrica</option>
                                <option value="Hidráulica">Hidráulica</option>
                                <option value="Acabamento">Acabamento</option>
                                <option value="EPI">EPI</option>
                                <option value="Ferramentas">Ferramentas</option>
                            </select>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button type="button" onClick={() => setIsCatalogModalOpen(false)} className="flex-1 p-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex justify-center items-center gap-2 shadow-lg transition-colors"><Plus size={18}/> Salvar Insumo</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL DETALHES E APROVAÇÃO DA SC */}
            {isDetailsModalOpen && selectedRequest && (
                <Modal title={`Ficha de Aprovação - ${selectedRequest.requestCode}`} onClose={() => setIsDetailsModalOpen(false)}>
                    <div className="space-y-6">
                        {/* Status Header */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Atual</p>
                                <span className={`mt-1 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                    selectedRequest.status === 'APROVADO' ? 'bg-emerald-100 text-emerald-700' : 
                                    selectedRequest.status === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : 
                                    selectedRequest.status === 'REJEITADO' ? 'bg-red-100 text-red-700' :
                                    selectedRequest.status === 'ENTREGUE' ? 'bg-purple-100 text-purple-700' :
                                    'bg-blue-100 text-blue-700'
                                }`}>
                                    {selectedRequest.status}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data da Solicitação</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{new Date(selectedRequest.createdAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                        </div>

                        {selectedRequest.requiredApprovals > 1 && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Progresso de Aprovação</p>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="flex-1 bg-blue-200 dark:bg-blue-800 h-2 rounded-full overflow-hidden">
                                        <div 
                                            className="bg-blue-600 h-full rounded-full transition-all" 
                                            style={{width: `${Math.min(100, ((selectedRequest.currentApprovalLevel - 1) / selectedRequest.requiredApprovals) * 100)}%`}}
                                        ></div>
                                    </div>
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                                        {selectedRequest.status === 'APROVADO' ? selectedRequest.requiredApprovals : (selectedRequest.currentApprovalLevel - 1)} / {selectedRequest.requiredApprovals}
                                    </span>
                                </div>
                                {selectedRequest.approvalHistory && (
                                    <div className="mt-3 space-y-2">
                                        {JSON.parse(selectedRequest.approvalHistory).map((h: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <span className="text-blue-600 dark:text-blue-400">Nível {h.level}: {h.approvedBy} ({h.role})</span>
                                                <span className="text-slate-400">{new Date(h.date).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Detalhes do Material */}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obra / Destino</p>
                                                <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase">{selectedRequest.project?.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">{selectedRequest.project?.city} - {selectedRequest.project?.state}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante / Setor</p>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{selectedRequest.requesterName}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">{selectedRequest.sector || 'Obras'}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor Vinculado</p>
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedRequest.supplier?.name || 'Não informado'}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classificação DRE</p>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedRequest.dreCategory || 'Não informado'}</p>
                                            </div>
                                        </div>

                        <div className="p-5 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3">Itens Solicitados</p>
                            <div className="space-y-4">
                                {selectedRequest.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start justify-between border-b border-indigo-100 dark:border-indigo-900/30 pb-4 last:border-0 last:pb-0">
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                                                {item.material?.name}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1">CÓD. {item.material?.code}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-800 dark:text-white">{item.quantity} <span className="text-[10px] text-slate-400 font-bold uppercase">{item.material?.unit}</span></p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-1">{formatter.format(item.estimatedCost || 0)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Total Estimado</p>
                                <p className="text-xl font-black text-slate-800 dark:text-white">
                                    {(() => {
                                        const winner = selectedRequest.quotations?.find((q: any) => q.isWinner);
                                        if (winner) return formatter.format(winner.totalPrice);
                                        return formatter.format(selectedRequest.items?.reduce((acc: number, item: any) => acc + (item.estimatedCost || 0), 0) || 0);
                                    })()}
                                </p>
                            </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button 
                                onClick={() => setIsDetailsModalOpen(false)} 
                                className="flex-1 p-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                            >
                                Fechar
                            </button>
                            {selectedRequest.status === 'PENDENTE' && canApprovePurchase(user?.role || '') && (
                                <>
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedRequest.id, 'REJEITADO')}
                                        className="flex-1 p-3 bg-red-50 text-red-600 font-bold hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-100"
                                    >
                                        Rejeitar Pedido
                                    </button>
                                    <button 
                                        onClick={() => handleStatusUpdate(selectedRequest.id, 'APROVADO')}
                                        className="flex-1 p-3 bg-blue-600 text-white font-bold hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20 transition-all"
                                    >
                                        Aprovar Pedido
                                    </button>
                                </>
                            )}
                            {selectedRequest.status === 'AGUARDANDO_APROVACAO_FINANCEIRA' && (
                                (() => {
                                    const winnerQuote = selectedRequest.quotations?.find((q:any) => q.isWinner);
                                    if(!winnerQuote) return null;
                                    let requiredRoles: string[] = [];
                                    if(approvalRules?.enabled) {
                                        for(const level of approvalRules.levels) {
                                            if(winnerQuote.totalPrice > level.limit) {
                                                requiredRoles = level.roles;
                                            } else if(winnerQuote.totalPrice <= level.limit && requiredRoles.length === 0) {
                                                requiredRoles = level.roles;
                                            }
                                        }
                                    }
                                    if(!requiredRoles.includes(user?.role || '') && user?.role !== 'Diretor') return null;

                                    return (
                                        <button 
                                            onClick={() => handleApproveFinancial(selectedRequest.id)}
                                            className="flex-1 p-3 bg-green-600 text-white font-bold hover:bg-green-500 rounded-xl shadow-lg shadow-green-500/20 transition-all"
                                        >
                                            Aprovar Cotação (Financeiro)
                                        </button>
                                    );
                                })()
                            )}
                            {selectedRequest.status === 'COTADA' && canEmitPurchaseOrder(user?.role || '') && (
                                <button 
                                    onClick={handleEmitOrder}
                                    className="flex-1 p-3 bg-emerald-600 text-white font-bold hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                                >
                                    Emitir Ordem de Compra
                                </button>
                            )}
                            {['PENDENTE', 'APROVADO', 'AGUARDANDO_APROVACAO_FINANCEIRA', 'COTADA', 'ORDEM_EMITIDA'].includes(selectedRequest.status) && ['Comprador', 'Diretor', 'Engenheiro Residente', 'Coordenador de Obras'].includes(user?.role || '') && (
                                <button 
                                    onClick={() => handleCancelPurchase(selectedRequest.id)}
                                    className="flex-1 p-3 bg-red-100 text-red-600 font-bold hover:bg-red-600 hover:text-white rounded-xl transition-all border border-red-200"
                                >
                                    Cancelar Pedido
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* MODAL REGISTRAR CONSUMO */}
            {isConsumptionModalOpen && selectedInventoryItem && (
                <Modal title={`Baixa de Estoque: ${selectedInventoryItem.linkedMaterial?.name || selectedInventoryItem.materialName}`} onClose={() => setIsConsumptionModalOpen(false)}>
                    <form onSubmit={handleConsumptionSubmit} className="space-y-4">
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl mb-4">
                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Saldo Disponível</p>
                            <p className="text-xl font-black text-orange-700 dark:text-orange-400">{selectedInventoryItem.quantidadeAtual} {selectedInventoryItem.unidade}</p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Quantidade Utilizada</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                required 
                                max={selectedInventoryItem.quantidadeAtual}
                                value={consumptionFormData.quantidade} 
                                onChange={e => setConsumptionFormData({...consumptionFormData, quantidade: e.target.value})} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-orange-500 font-bold"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Local de Aplicação</label>
                            <input 
                                type="text" 
                                placeholder="Ex: Viga Baldrame, Alvenaria 2º Pav" 
                                value={consumptionFormData.appliedAt} 
                                onChange={e => setConsumptionFormData({...consumptionFormData, appliedAt: e.target.value})} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-orange-500" 
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Responsável pela Retirada</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Nome de quem retirou o material" 
                                value={consumptionFormData.responsible} 
                                onChange={e => setConsumptionFormData({...consumptionFormData, responsible: e.target.value})} 
                                className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-orange-500" 
                            />
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button type="button" onClick={() => setIsConsumptionModalOpen(false)} className="flex-1 p-3 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg flex justify-center items-center gap-2 shadow-lg transition-colors"><PackageCheck size={18}/> Confirmar Baixa</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* MODAL CONFIRMAR ENTREGA (Task 7.2) */}
            {isDeliveryModalOpen && (
                <Modal title="Confirmar Recebimento de Material" onClose={() => setIsDeliveryModalOpen(false)}>
                    <form onSubmit={handleConfirmDelivery} className="space-y-6">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                            <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">Condições de Pagamento</h4>
                            <p className="text-[10px] text-slate-500 mb-4 leading-relaxed">
                                Ao confirmar a entrega, o sistema gerará automaticamente as obrigações financeiras no módulo de Contas a Pagar.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Parcelamento</label>
                                    <select 
                                        value={deliveryFormData.numInstallments}
                                        onChange={e => setDeliveryFormData({...deliveryFormData, numInstallments: e.target.value})}
                                        className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
                                    >
                                        <option value="1">À Vista (1x)</option>
                                        <option value="2">2 Parcelas</option>
                                        <option value="3">3 Parcelas</option>
                                        <option value="4">4 Parcelas</option>
                                        <option value="5">5 Parcelas</option>
                                        <option value="6">6 Parcelas</option>
                                        <option value="12">12 Parcelas</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase mb-1 block">Intervalo (Dias)</label>
                                    <input 
                                        type="number" 
                                        value={deliveryFormData.intervalDays}
                                        onChange={e => setDeliveryFormData({...deliveryFormData, intervalDays: e.target.value})}
                                        className="w-full p-2.5 bg-white dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button type="button" onClick={() => setIsDeliveryModalOpen(false)} className="flex-1 p-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-1 p-3 bg-purple-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-500 transition-all flex items-center justify-center gap-2">
                                <Truck size={16}/> Confirmar Entrada
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {isEditInventoryModalOpen && (
                <Modal title="Editar Insumo (Estoque)" onClose={() => setIsEditInventoryModalOpen(false)}>
                    <form onSubmit={handleEditInventorySubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nome do Insumo (Apelido)</label>
                            <input type="text" required value={inventoryEditData.materialName} onChange={e => setInventoryEditData({...inventoryEditData, materialName: e.target.value})} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Estoque Mínimo (Alerta)</label>
                            <input type="number" step="0.01" required value={inventoryEditData.estoqueMinimo} onChange={e => setInventoryEditData({...inventoryEditData, estoqueMinimo: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:border-indigo-500 font-bold" />
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all">Salvar Alterações</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Modal de Cotações */}
            {isQuotationModalOpen && selectedQuotationRequest && (
                <Modal title={`Mapa de Cotações - ${selectedQuotationRequest.requestCode}`} onClose={() => setIsQuotationModalOpen(false)}>
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Solicitado</p>
                            {selectedQuotationRequest.items?.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center mb-2 last:mb-0">
                                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{item.material?.name}</p>
                                    <p className="text-xs font-bold text-slate-500">{item.quantity} {item.material?.unit}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cotações Lançadas</p>
                                {pendingQuotations.length > 0 && (
                                    <div className="flex gap-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setQuotationSortBy('price')}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${quotationSortBy === 'price' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                                        >Focar Preço</button>
                                        <button 
                                            onClick={() => setQuotationSortBy('delivery')}
                                            className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${quotationSortBy === 'delivery' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500'}`}
                                        >Focar Prazo</button>
                                    </div>
                                )}
                            </div>
                            {pendingQuotations.length === 0 ? (
                                <p className="text-xs text-slate-400 italic font-medium py-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                    Nenhuma cotação inserida ainda.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {pendingQuotations
                                        .sort((a, b) => quotationSortBy === 'price' ? a.totalPrice - b.totalPrice : a.deliveryDays - b.deliveryDays)
                                        .map((quote, idx) => {
                                            const minPrice = Math.min(...pendingQuotations.map(q => q.totalPrice));
                                            const minDelivery = Math.min(...pendingQuotations.map(q => q.deliveryDays));
                                            const isBestPrice = quote.totalPrice === minPrice;
                                            const isFastest = quote.deliveryDays === minDelivery;
                                            const isBestOverall = isBestPrice && isFastest;
                                            return (
                                        <div key={quote.id} className={`p-3 rounded-xl border flex justify-between items-center ${isBestOverall ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' : isBestPrice ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : isFastest ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {isBestOverall ? <Star size={14} className="text-amber-500" /> : isBestPrice ? <Trophy size={14} className="text-emerald-500" /> : isFastest ? <Zap size={14} className="text-blue-500" /> : null}
                                                    <p className={`text-sm font-black ${isBestOverall ? 'text-amber-700 dark:text-amber-400' : isBestPrice ? 'text-emerald-700 dark:text-emerald-400' : isFastest ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                        {quote.supplierName}
                                                    </p>
                                                </div>
                                                <div className="flex gap-4 mt-1">
                                                    <p className="text-[10px] text-slate-500 font-bold">Un: {formatter.format(quote.unitPrice)}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold">Total: {formatter.format(quote.totalPrice)}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold">Entrega: {quote.deliveryDays} dias</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleSelectWinner(quote.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isBestOverall ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20' : isBestPrice ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20' : isFastest ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'}`}
                                            >
                                                {quote.isWinner ? 'Enviada p/ Aprovação' : 'Escolher e Enviar'}
                                            </button>
                                        </div>
                                    )})}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adicionar Nova Cotação</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Fornecedor (Cadastro)</label>
                                    <select 
                                        value={quotationFormData.supplierId} 
                                        onChange={e => setQuotationFormData({...quotationFormData, supplierId: e.target.value})} 
                                        className="w-full p-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    >
                                        <option value="">Selecione...</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Ou Nome Avulso</label>
                                    <input 
                                        type="text" 
                                        value={quotationFormData.supplierName} 
                                        onChange={e => setQuotationFormData({...quotationFormData, supplierName: e.target.value})} 
                                        placeholder="Ex: Depósito do Zé"
                                        className="w-full p-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Valor Unitário Médio (R$)</label>
                                    <input 
                                        type="text" 
                                        value={quotationFormData.unitPrice} 
                                        onChange={e => {
                                            const formatted = formatCurrency(e.target.value);
                                            setQuotationFormData({...quotationFormData, unitPrice: formatted});
                                        }} 
                                        placeholder="0,00"
                                        className="w-full p-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                    {quotationFormData.unitPrice && (
                                        <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">
                                            Total Pacote: {formatter.format((parseFloat(quotationFormData.unitPrice.replace(/\./g, '').replace(',', '.')) || 0) * (selectedQuotationRequest?.items?.reduce((acc: number, it: any) => acc + it.quantity, 0) || 1))}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Prazo Entrega (Dias)</label>
                                    <input 
                                        type="number" 
                                        value={quotationFormData.deliveryDays} 
                                        onChange={e => setQuotationFormData({...quotationFormData, deliveryDays: e.target.value})} 
                                        placeholder="Ex: 5"
                                        className="w-full p-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleAddQuotation}
                                disabled={!quotationFormData.unitPrice || (!quotationFormData.supplierId && !quotationFormData.supplierName)}
                                className="w-full p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                            >
                                + Adicionar à Lista
                            </button>
                        </div>
                        
                        <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setIsQuotationModalOpen(false)} className="flex-1 py-3 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">Cancelar</button>
                            <button onClick={handleSaveQuotations} className="flex-1 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30">Salvar Mapa</button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}

export default function SuprimentosPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
            <SuprimentosContent />
        </Suspense>
    );
}

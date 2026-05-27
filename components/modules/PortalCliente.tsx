"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { Heart, MessageCircle, Share2, MapPin, Calendar, CheckCircle2, TrendingUp, Plus, PlayCircle, Download, ChevronRight, FileText, CloudSun, Trash2, Image as ImageIcon, Send, ShieldAlert, Check, X, FileSearch, Folder, Users } from 'lucide-react';
import { createFeedPost, toggleLikePost, deleteFeedPost, addComment, getComments, getUserLikes } from '../../app/actions/feed';
import { respondToApproval, getPendingApprovals } from '../../app/actions/approvals';
import { getLiveWeather } from '../../app/actions/weather';
import { Modal } from '../Shared';
import { useAuth } from '../AuthContext';

export default function PortalCliente({ proj, localPosts, setLocalPosts, setActiveTab }: any) {
    const [liked, setLiked] = useState<{[key:number]:boolean}>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
    const [deletionReason, setDeletionReason] = useState('');
    const [showComments, setShowComments] = useState<{[key:number]:boolean}>({});
    const [commentText, setCommentText] = useState<{[key:number]:string}>({});
    const [commentsData, setCommentsData] = useState<{[key:number]:any[]}>({});
    
    // Filtros e Timeline
    const [activeFilter, setActiveFilter] = useState('Todos');
    const [selectedRDO, setSelectedRDO] = useState<any>(null);
    const [portalTab, setPortalTab] = useState('Geral'); // 'Geral', 'Cronograma', 'Documentos'
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [breadcrumb, setBreadcrumb] = useState<{id: number | null, name: string}[]>([{id: null, name: 'Início'}]);
    
    // Clima Dinâmico
    const [clima, setClima] = useState({ temp: '--', cond: 'Buscando...', icon: <CloudSun size={120} className="absolute -right-6 -top-6 opacity-20 group-hover:scale-125 transition-transform duration-1000" /> });

    useEffect(() => {
        getLiveWeather().then(res => {
            if (res.success) {
                setClima({ temp: `${res.temperature}°C`, cond: res.condition, icon: <CloudSun size={120} className="absolute -right-6 -top-6 opacity-20 group-hover:scale-125 transition-transform duration-1000" /> });
            } else {
                setClima({ temp: '--', cond: 'Indisponível', icon: <CloudSun size={120} className="absolute -right-6 -top-6 opacity-20 group-hover:scale-125 transition-transform duration-1000" /> });
            }
        });
    }, []);

    // Aprovações
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [selectedApproval, setSelectedApproval] = useState<any>(null);
    const [approvalStatus, setApprovalStatus] = useState<'Aprovado' | 'Reprovado' | null>(null);
    const [approvalForm, setApprovalForm] = useState({ observations: '' });

    const { user } = useAuth();
    // Nome do usuário logado
    const currentUserName = user?.name || 'Visitante';
    const isClient = user?.role === 'Cliente / Investidor';

    // --- CARREGAR CURTIDAS DO BANCO DE DADOS (POR USUÁRIO) ---
    useEffect(() => {
        const fetchLikes = async () => {
            if (!localPosts || localPosts.length === 0) return;
            const postIds = localPosts.map((p: any) => p.id);
            const userLikedIds = await getUserLikes(currentUserName, postIds);
            
            const likedMap: {[key:number]:boolean} = {};
            userLikedIds.forEach(id => {
                likedMap[id] = true;
            });
            setLiked(likedMap);
        };
        fetchLikes();
    }, [localPosts, currentUserName]);

    // --- BUSCAR COMENTÁRIOS AO ABRIR ---
    const toggleComments = async (postId: number) => {
        const isOpen = !showComments[postId];
        setShowComments(prev => ({ ...prev, [postId]: isOpen }));

        if (isOpen && !commentsData[postId]) {
            const comments = await getComments(postId);
            setCommentsData(prev => ({ ...prev, [postId]: comments }));
        }
    };

    const loadApprovals = async () => {
        const res = await getPendingApprovals(proj.id);
        if (res.success) setPendingApprovals(res.approvals || []);
    };

    useEffect(() => {
        loadApprovals();
    }, [proj.id]);

    // --- CÁLCULO DE PROGRESSO ---
    const stats = useMemo(() => {
        const tasks = proj.tasks || [];
        const budget = proj.budget || 0;
        const spent = proj.spent || 0;

        const totalDuration = tasks.reduce((acc: number, t: any) => {
            const start = new Date(t.startDate).getTime();
            const end = new Date(t.endDate).getTime();
            return acc + Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
        }, 0);

        const progFisico = totalDuration > 0 
            ? tasks.reduce((acc: number, t: any) => {
                const duration = Math.max(1, (new Date(t.endDate).getTime() - new Date(t.startDate).getTime()) / (1000 * 60 * 60 * 24));
                return acc + ((t.progress || 0) * duration);
              }, 0) / totalDuration 
            : 0;

        return {
            progFisico: Math.min(100, Math.round(progFisico)),
            progFinanceiro: budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
        };
    }, [proj]);

    // --- TIMELINE UNIFICADA ---
    const timelineData = useMemo(() => {
        const items: any[] = [];

        // 1. Fotos do Feed
        (localPosts || []).forEach((p: any) => {
            items.push({
                ...p,
                type: 'PHOTO',
                sortDate: new Date(p.createdAt || Date.now())
            });
        });

        // 2. RDOs (Relatórios Diários)
        (proj.rdos || []).forEach((r: any) => {
            items.push({
                ...r,
                type: 'RDO',
                author: 'Mestre de Obras',
                role: 'Campo',
                sortDate: new Date(r.date || Date.now()),
                time: r.data // Já formatado no action
            });
        });

        // 3. Aprovações (Decisões)
        // Pegamos as pendentes do estado local para reatividade rápida, 
        // mas também as resolvidas do proj se existirem
        const allApprovals = [...(proj.approvals || [])];
        // Atualiza as pendentes com o estado local (caso tenham sido respondidas nesta sessão)
        const combinedApprovals = allApprovals.map(app => {
            const pending = pendingApprovals.find(p => p.id === app.id);
            return pending || app;
        });

        combinedApprovals.forEach((a: any) => {
            items.push({
                ...a,
                type: 'APPROVAL',
                author: 'Controladoria',
                role: 'Financeiro',
                sortDate: new Date(a.requestedAt || Date.now()),
                time: new Date(a.requestedAt).toLocaleDateString('pt-BR')
            });
        });

        // Ordenar por data (mais recente primeiro)
        const sorted = items.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

        // Filtrar
        if (activeFilter === 'Fotos') return sorted.filter(i => i.type === 'PHOTO');
        if (activeFilter === 'RDOs') return sorted.filter(i => i.type === 'RDO');
        if (activeFilter === 'Aprovações') return sorted.filter(i => i.type === 'APPROVAL');
        
        return sorted;
    }, [localPosts, proj.rdos, proj.approvals, pendingApprovals, activeFilter]);

    const [newPost, setNewPost] = useState({ location: '', description: '', tags: '', image: '' });

    const toggleLike = async (id: number) => {
        // Otimismo na UI: Muda o estado na hora
        const isAlreadyLiked = !!liked[id];
        setLiked(prev => ({ ...prev, [id]: !isAlreadyLiked }));

        const res = await toggleLikePost(id, currentUserName);
        if (res.success) {
            setLocalPosts((prev: any[]) => prev.map(p => 
                p.id === id ? { ...p, likes: res.likes } : p
            ));
            // Força o tipo booleano para o TS não reclamar
            setLiked(prev => ({ ...prev, [id]: !!res.liked }));
        } else {
            // Reverte se der erro
            setLiked(prev => ({ ...prev, [id]: isAlreadyLiked }));
        }
    };

    const handleShare = async (post: any) => {
        const shareData = {
            title: `ObraSys - ${proj.nome}`,
            text: `Veja a evolução da obra ${proj.nome} em ${post.location}!`,
            url: window.location.href
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                alert("Link copiado!");
            }
        } catch (err) {}
    };

    const handleCommentSubmit = async (postId: number) => {
        const text = commentText[postId];
        if (!text?.trim()) return;

        const authorName = isClient ? `${currentUserName} (Cliente)` : currentUserName;
        const res = await addComment(postId, text, authorName);

        if (res.success) {
            setLocalPosts((prev: any[]) => prev.map(p => 
                p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p
            ));
            setCommentsData(prev => ({
                ...prev,
                [postId]: [res.comment, ...(prev[postId] || [])]
            }));
            setCommentText(prev => ({ ...prev, [postId]: '' }));
        }
    };

    const handleDeleteClick = (id: number) => {
        setSelectedPostId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!selectedPostId) return;
        const res = await deleteFeedPost(selectedPostId, deletionReason, currentUserName);
        if (res.success) {
            setLocalPosts((prev: any[]) => prev.filter(p => p.id !== selectedPostId));
            setIsDeleteModalOpen(false);
            setDeletionReason('');
            setSelectedPostId(null);
        }
    };

    const handleRespondApproval = async () => {
        if (approvalStatus === 'Reprovado' && !approvalForm.observations) return alert("Por favor, informe o motivo da revisão.");

        const res = await respondToApproval(proj.id, selectedApproval.id, approvalStatus!, currentUserName, approvalForm.observations);
        if (res.success) {
            setSelectedApproval(null);
            setApprovalStatus(null);
            setApprovalForm({ observations: '' });
            loadApprovals();
            alert("Resposta enviada com sucesso!");
        }
    };

    const [uploading, setUploading] = useState(false);
    const handleFileChange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.url) setNewPost(prev => ({ ...prev, image: data.url }));
        } finally { setUploading(false); }
    };

    const handleCreatePost = async (e: any) => {
        e.preventDefault();
        const createdPost = await createFeedPost({
            ...newPost,
            author: currentUserName,
            role: user?.role || 'Engenharia',
            projectId: proj.id
        });
        if (createdPost) {
            setLocalPosts((prev: any[]) => [{
                ...createdPost,
                time: "Agora",
                desc: createdPost.description,
                tags: createdPost.tags.split(','),
                image: createdPost.image.replace('/uploads/', '/api/images/')
            }, ...prev]);
        }
        setIsModalOpen(false);
        setNewPost({ location: '', description: '', tags: '', image: '' });
    };

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (stats.progFisico / 100) * circumference;

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-[#0B1121] overflow-hidden">
            
            <div className="flex-1 flex flex-col min-w-0">
                <div className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-8 h-full">
                        {['Geral', 'Cronograma', 'Documentos'].map(t => (
                            <button 
                                key={t} 
                                onClick={() => setPortalTab(t)}
                                className={`h-full px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${portalTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                            <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">{proj.nome}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {proj.status}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex justify-center p-6 pb-20">
                    <div className="w-full max-w-2xl space-y-8">
                        {portalTab === 'Geral' && (
                            <>
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 tracking-tight">Diário da Obra</h1>
                                        <p className="text-slate-500 text-sm font-medium uppercase tracking-widest opacity-60">Canteiro Digital ObraSys</p>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                        {['Todos', 'Fotos', 'RDOs', 'Aprovações'].map(f => (
                                            <button 
                                                key={f}
                                                onClick={() => setActiveFilter(f)}
                                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeFilter === f ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                    {!isClient && (
                                        <button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95">
                                            <Plus size={18}/> Novo Registro
                                        </button>
                                    )}
                                </div>

                                {timelineData.map((item: any) => {
                                    // ... existing map logic ... (will keep the same)
                        if (item.type === 'PHOTO') return (
                            <div key={`photo-${item.id}`} className="bg-white dark:bg-[#162032] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden group transition-all hover:shadow-2xl">
                                <div className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-400 p-0.5">
                                            <div className="w-full h-full bg-white dark:bg-[#0B1121] rounded-full flex items-center justify-center font-black text-slate-800 dark:text-white text-lg">
                                                {item.author.charAt(0)}
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight">{item.author}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.role} • {item.time}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!isClient && (
                                            <button onClick={() => handleDeleteClick(item.id)} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16}/>
                                            </button>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-xl uppercase tracking-tighter">
                                            <MapPin size={12}/> {item.location}
                                        </div>
                                    </div>
                                </div>

                                <div className="relative aspect-video bg-slate-100 dark:bg-black overflow-hidden mx-2 rounded-[2rem]">
                                    <img src={item.image ? (item.image.startsWith('http') || item.image.startsWith('/') ? item.image : `/${item.image}`) : ''} alt="Obra" className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                </div>

                                <div className="p-6 flex justify-between items-center">
                                    <div className="flex gap-6">
                                        <button onClick={() => toggleLike(item.id)} className={`flex items-center gap-2 transition-all hover:scale-110 ${liked[item.id] ? 'text-red-500' : 'text-slate-600 dark:text-slate-400'}`}>
                                            <Heart size={24} className={liked[item.id] ? "fill-red-500" : ""} />
                                            <span className="font-black text-sm">{item.likes}</span>
                                        </button>
                                        <button onClick={() => toggleComments(item.id)} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all hover:scale-110">
                                            <MessageCircle size={24} />
                                            <span className="font-black text-sm">{item.comments}</span>
                                        </button>
                                        <button onClick={() => handleShare(item)} className="text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-all hover:scale-110">
                                            <Share2 size={24} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        {item.tags?.map((tag: string) => (
                                            <span key={tag} className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg uppercase italic">#{tag.trim()}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-8 pb-4">
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
                                        <span className="font-black mr-2 text-slate-900 dark:text-white uppercase text-xs tracking-tighter">{item.author.split(' ')[1]}</span>
                                        {item.desc}
                                    </p>
                                </div>

                                {showComments[item.id] && (
                                    <div className="px-8 pb-8 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                        <div className="h-px bg-slate-100 dark:bg-slate-800 w-full mb-4"></div>
                                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-3">
                                            {commentsData[item.id]?.map((c: any) => (
                                                <div key={c.id} className="flex gap-2 text-sm items-start">
                                                    <span className={`font-black text-xs lowercase ${c.author.includes('(Cliente)') ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>@{c.author.split(' ')[0].toLowerCase().replace('(cliente)', '')} {c.author.includes('(Cliente)') && <span className="bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[8px] uppercase tracking-widest ml-1">Cliente</span>}</span>
                                                    <p className="text-slate-600 dark:text-slate-400 text-xs">{c.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-3 items-center bg-slate-50 dark:bg-[#0B1121] p-3 rounded-2xl border border-slate-100 dark:border-slate-800 focus-within:border-blue-500 transition-all">
                                            <input type="text" placeholder="Adicionar um comentário..." value={commentText[item.id] || ''} onChange={(e) => setCommentText(prev => ({...prev, [item.id]: e.target.value}))} onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(item.id)} className="flex-1 bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-300 placeholder:text-slate-400 font-medium"/>
                                            <button onClick={() => handleCommentSubmit(item.id)} className="text-blue-600 hover:text-blue-500 p-1 transition-colors"><Send size={18} /></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );

                        if (item.type === 'RDO') return (
                            <div key={`rdo-${item.id}`} onClick={() => setSelectedRDO(item)} className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><FileText size={60}/></div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400"><Calendar size={20}/></div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white text-sm tracking-tight">Relatório Diário de Obra (RDO)</h3>
                                            <p className="text-xs font-medium text-slate-500">{item.time} • Mestre de Obras</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                                        {item.status}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <CloudSun size={16} className="text-slate-400"/>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Clima Manhã</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{item.clima?.manha || 'Sol'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users size={16} className="text-slate-400"/>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Efetivo</p>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.mo_direta?.length || 0} Colaboradores</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">"{item.obs || 'Nenhuma observação registrada para este dia.'}"</p>
                            </div>
                        );

                        if (item.type === 'APPROVAL') return (
                            <div key={`app-${item.id}`} className={`rounded-[2.5rem] border-2 shadow-2xl p-8 relative overflow-hidden transition-all ${item.status === 'Pendente' ? 'bg-amber-50/30 border-amber-400/50 dark:bg-amber-900/10' : 'bg-white dark:bg-[#162032] border-slate-200 dark:border-slate-800'}`}>
                                <div className="absolute -right-4 -top-4 opacity-5"><ShieldAlert size={120}/></div>
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.status === 'Pendente' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}><CheckCircle2 size={24}/></div>
                                        <div>
                                            <h3 className="font-black text-slate-800 dark:text-white text-sm tracking-tight uppercase">Marco de Decisão: {item.type}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.time} • Engenharia</p>
                                        </div>
                                    </div>
                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${item.status === 'Aprovado' ? 'bg-emerald-500 text-white' : item.status === 'Reprovado' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <div className="bg-white/50 dark:bg-black/20 backdrop-blur-sm p-6 rounded-3xl border border-white/50 dark:border-white/5 mb-8">
                                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">{item.title}</h4>
                                    {item.amount && <p className="text-3xl font-black text-slate-900 dark:text-white italic">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}</p>}
                                </div>
                                
                                {item.status === 'Pendente' ? (
                                    <div className="flex gap-4">
                                        {item.documentUrl && (
                                            <a href={item.documentUrl} target="_blank" className="flex-1 flex items-center justify-center gap-2 py-4 bg-white dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all">
                                                <FileSearch size={18}/> Analisar Documento
                                            </a>
                                        )}
                                        <button onClick={() => { setSelectedApproval(item); setApprovalStatus('Aprovado'); }} className="flex-1 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">Aprovar Agora</button>
                                        <button onClick={() => { setSelectedApproval(item); setApprovalStatus('Reprovado'); }} className="px-8 py-4 bg-white dark:bg-slate-800 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all">Revisar</button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-[#0B1121] rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-slate-500">Resolvido por <span className="text-slate-800 dark:text-white">{item.clientName}</span> em {new Date(item.resolvedAt).toLocaleDateString()}</p>
                                        {item.observations && <p className="text-xs text-slate-400 italic mt-2">"{item.observations}"</p>}
                                    </div>
                                )}
                            </div>
                        );

                        return null;
                    })}
                </>
            )}

            {portalTab === 'Cronograma' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 italic tracking-tighter">Marcos do Projeto</h1>
                        <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Cronograma Executivo de Entregas</p>
                    </div>
                    
                    <div className="space-y-4">
                        {(() => {
                            const portalMilestones = (proj.tasks || []).filter((t: any) => t.isMilestone);
                            if (portalMilestones.length === 0) {
                                return (
                                    <div className="bg-white dark:bg-[#162032] p-10 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                        <Calendar className="text-slate-300 mx-auto mb-4" size={48}/>
                                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Nenhum marco definido ainda.</p>
                                    </div>
                                );
                            }

                            return portalMilestones.map((m: any) => {
                                // Cálculo da data de fim para Tasks do Gantt (start + duration)
                                // Se a task tiver endDate (Kanban), usamos ela.
                                const date = m.endDate ? new Date(m.endDate) : new Date();
                                
                                return (
                                    <div key={m.id} className="bg-white dark:bg-[#162032] p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-8">
                                        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center text-blue-600">
                                            <p className="text-[10px] font-black uppercase">{date.toLocaleDateString('pt-BR', {month: 'short'})}</p>
                                            <p className="text-xl font-black">{date.getDate()}</p>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{m.name || m.title}</h3>
                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${m.status === 'Concluído' ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}`}>{m.status}</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                                <div className="h-full bg-blue-600 transition-all" style={{width: `${m.progress}%`}}></div>
                                            </div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-2 tracking-widest text-right">{m.progress}% Concluído</p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            )}

            {portalTab === 'Documentos' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 dark:text-white mb-2 italic tracking-tighter">Documentação</h1>
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest opacity-60">Arquivos e Certificações Liberadas</p>
                        </div>
                        
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                            {breadcrumb.map((crumb, idx) => (
                                <React.Fragment key={crumb.id || 'root'}>
                                    <button 
                                        onClick={() => {
                                            setCurrentFolderId(crumb.id);
                                            setBreadcrumb(breadcrumb.slice(0, idx + 1));
                                        }}
                                        className={`text-[9px] font-black uppercase tracking-widest transition-all ${idx === breadcrumb.length - 1 ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {crumb.name}
                                    </button>
                                    {idx < breadcrumb.length - 1 && <ChevronRight size={10} className="text-slate-300"/>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* PASTAS */}
                        {(proj.documentFolders || [])
                            .filter((f: any) => f.visibleToClient && f.parentId === currentFolderId)
                            .map((folder: any) => (
                                <div 
                                    key={folder.id} 
                                    onClick={() => {
                                        setCurrentFolderId(folder.id);
                                        setBreadcrumb([...breadcrumb, {id: folder.id, name: folder.name}]);
                                    }}
                                    className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                                            <Folder size={28} fill="currentColor" fillOpacity={0.2}/>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight">{folder.name}</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pasta do Projeto</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                        {/* DOCUMENTOS */}
                        {(proj.documents || [])
                            .filter((d: any) => d.visibleToClient && d.folderId === currentFolderId)
                            .map((doc: any) => (
                                <div 
                                    key={doc.id} 
                                    className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                            <FileText size={24}/>
                                        </div>
                                        <a 
                                            href={doc.url} 
                                            download 
                                            target="_blank" 
                                            className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Download size={18}/>
                                        </a>
                                    </div>
                                    <h3 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-tight line-clamp-1">{doc.nome}</h3>
                                    <div className="flex items-center gap-4 mt-3">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{doc.tipo}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{doc.data}</span>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* ESTADO VAZIO */}
                    {((proj.documentFolders || []).filter((f: any) => f.visibleToClient && f.parentId === currentFolderId).length === 0 && 
                        (proj.documents || []).filter((d: any) => d.visibleToClient && d.folderId === currentFolderId).length === 0) && (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileSearch size={32} className="text-slate-300"/>
                            </div>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Esta pasta está vazia.</p>
                            {currentFolderId && (
                                <button 
                                    onClick={() => {
                                        const lastCrumb = breadcrumb[breadcrumb.length - 2];
                                        setCurrentFolderId(lastCrumb.id);
                                        setBreadcrumb(breadcrumb.slice(0, -1));
                                    }}
                                    className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                >
                                    Voltar para {breadcrumb[breadcrumb.length - 2]?.name}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
                    </div>
                </div>
            </div>

            <div className="w-full md:w-[380px] bg-white dark:bg-[#162032] border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#162032] z-20">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">Resumo Executivo <CheckCircle2 className="text-emerald-500" size={20}/></h2>
                </div>

                <div className="p-8 space-y-10">
                    {/* SEÇÃO DE APROVAÇÕES PENDENTES */}
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ShieldAlert size={14} className={pendingApprovals.length > 0 ? "text-amber-500 animate-pulse" : "text-slate-300"}/> 
                            Ações Necessárias {pendingApprovals.length > 0 && `(${pendingApprovals.length})`}
                        </h3>
                        
                        {pendingApprovals.length > 0 ? (
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                                {pendingApprovals.map(app => (
                                    <div key={app.id} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 space-y-3 shadow-sm transition-all hover:border-amber-300">
                                        <div>
                                            <p className="text-[9px] font-black text-amber-600 uppercase mb-1">{app.type}</p>
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 leading-tight">{app.title}</h4>
                                            {app.amount && (
                                                <p className="text-lg font-black text-amber-700 dark:text-amber-500 mt-1">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(app.amount)}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-2">
                                            {app.documentUrl && (
                                                <a href={app.documentUrl} target="_blank" className="flex items-center justify-center gap-2 py-2 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all">
                                                    <FileSearch size={14}/> Ver Documento
                                                </a>
                                            )}
                                            {user?.role !== 'client' && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => { setSelectedApproval(app); setApprovalStatus('Aprovado'); }}
                                                        className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
                                                    >
                                                        Aprovar
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedApproval(app); setApprovalStatus('Reprovado'); }}
                                                        className="flex-1 py-2 bg-white dark:bg-slate-800 text-red-500 text-[10px] font-bold rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-50 transition-all"
                                                    >
                                                        Revisar
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-8 bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                                        <CheckCircle2 size={24}/>
                                    </div>
                                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight">Tudo em dia!</p>
                                    <p className="text-xs text-slate-500 font-medium">Nenhuma ação pendente no momento.</p>
                                </div>
                                
                                {proj.approvals && proj.approvals.filter((a: any) => a.status !== 'Pendente').length > 0 && (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Últimas Decisões</p>
                                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                            {proj.approvals.filter((a: any) => a.status !== 'Pendente').slice(0, 3).map((a: any) => (
                                                <div key={a.id} className="bg-white dark:bg-[#162032] p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{a.title}</p>
                                                        <p className="text-[9px] text-slate-500 uppercase tracking-widest">{new Date(a.resolvedAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${a.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {a.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-[#0B1121] p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center relative overflow-hidden">
                        <div className="w-full flex justify-between items-center mb-6">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-300 text-sm">Avanço da Obra</h3>
                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
                                proj.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 
                                proj.status === 'Distrato' ? 'bg-red-100 text-red-700' : 
                                'bg-blue-100 text-blue-700'
                            }`}>
                                {proj.status}
                            </span>
                        </div>

                        {proj.status === 'Distrato' ? (
                            <div className="relative flex flex-col items-center justify-center w-40 h-40 mb-2">
                                <div className="w-full h-full rounded-full border-8 border-red-100 dark:border-red-900/30 flex items-center justify-center bg-red-50 dark:bg-red-900/10">
                                    <X size={48} className="text-red-500 opacity-50" />
                                </div>
                                <div className="absolute flex flex-col items-center justify-center bg-red-500 text-white px-3 py-1 rounded-full shadow-lg transform -rotate-12">
                                    <span className="text-xs font-black uppercase tracking-widest">Cancelada</span>
                                </div>
                            </div>
                        ) : proj.status === 'Concluído' ? (
                            <div className="relative flex items-center justify-center w-40 h-40 mb-2">
                                <svg className="transform -rotate-90 w-full h-full absolute inset-0">
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={0} className="text-emerald-500" strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center gap-1">
                                    <Check size={24} className="text-emerald-500" />
                                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">100%</span>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex items-center justify-center w-40 h-40">
                                <svg className="transform -rotate-90 w-full h-full">
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={2 * Math.PI * 70} strokeDashoffset={(2 * Math.PI * 70) - (stats.progFisico / 100) * (2 * Math.PI * 70)} className="text-emerald-600 transition-all duration-1000 ease-in-out" strokeLinecap="round" />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-slate-800 dark:text-white">{stats.progFisico}%</span>
                                </div>
                            </div>
                        )}

                        <div className="w-full mt-8 space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Execução Física</span>
                                    <span className="text-slate-800 dark:text-slate-200">{stats.progFisico}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-slate-800 dark:bg-slate-400 h-full rounded-full transition-all duration-1000" style={{width: `${stats.progFisico}%`}}></div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs font-semibold">
                                    <span className="text-slate-600 dark:text-slate-400">Aporte Financeiro</span>
                                    <span className="text-emerald-600">{stats.progFinanceiro}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-emerald-600 h-full rounded-full transition-all duration-1000" style={{width: `${stats.progFinanceiro}%`}}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                        {clima.icon}
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1 opacity-70">Agora no Canteiro</p>
                            <div className="flex items-center gap-3">
                                <h4 className="text-4xl font-black italic">{clima.temp}</h4>
                                <span className="text-xs font-bold text-blue-100 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">{clima.cond}</span>
                            </div>
                            <p className="text-[10px] font-bold text-blue-200 mt-4 flex items-center gap-2 uppercase tracking-widest">
                                <MapPin size={12}/> {proj.location || "Local não definido"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <Modal title="Novo Registro" onClose={() => setIsModalOpen(false)}>
                    <form onSubmit={handleCreatePost} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Local</label>
                                <input type="text" required placeholder="Ex: Torre A" value={newPost.location} onChange={e => setNewPost({...newPost, location: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-blue-500"/>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto</label>
                                <div className="relative group">
                                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                    <div className={`w-full p-4 bg-slate-50 dark:bg-[#0B1121] border-2 border-dashed ${newPost.image ? 'border-emerald-500' : 'border-slate-200'} rounded-2xl text-[10px] font-black text-slate-400 flex items-center justify-center gap-2`}>
                                        {uploading ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : newPost.image ? <CheckCircle2 size={16} className="text-emerald-500"/> : <Plus size={16}/>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                            <textarea required placeholder="Relato técnico..." value={newPost.description} onChange={e => setNewPost({...newPost, description: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:border-blue-500 outline-none min-h-[120px] resize-none"></textarea>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
                            <button type="submit" disabled={uploading || !newPost.image} className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50">Publicar</button>
                        </div>
                    </form>
                </Modal>
            )}

            {isDeleteModalOpen && (
                <Modal title="Justificativa de Exclusão" onClose={() => setIsDeleteModalOpen(false)}>
                    <div className="space-y-6">
                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-800/50">
                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-tighter italic">Esta ação é registrada no histórico de auditoria. O motivo da exclusão é obrigatório.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo</label>
                            <textarea required placeholder="Por que excluir?" value={deletionReason} onChange={e => setDeletionReason(e.target.value)} className="w-full p-5 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:border-red-500 outline-none min-h-[150px] resize-none"></textarea>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Voltar</button>
                            <button type="button" disabled={!deletionReason} onClick={confirmDelete} className="flex-[2] bg-red-500 hover:bg-red-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all disabled:opacity-50">Excluir Permanente</button>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedRDO && (
                <Modal title={`Relatório Diário - ${selectedRDO.time}`} onClose={() => setSelectedRDO(null)}>
                    <div className="space-y-8 p-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-[#0B1121] p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest text-center">Clima Previsto</p>
                                <div className="flex justify-around items-center">
                                    <div className="text-center"><p className="text-[9px] uppercase font-bold text-slate-500">Manhã</p><p className="text-sm font-black capitalize text-blue-500">{selectedRDO.clima?.manha}</p></div>
                                    <div className="text-center"><p className="text-[9px] uppercase font-bold text-slate-500">Tarde</p><p className="text-sm font-black capitalize text-orange-500">{selectedRDO.clima?.tarde}</p></div>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#0B1121] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Efetivo Direto</p>
                                <p className="text-3xl font-black italic">{selectedRDO.mo_direta?.length || 0}</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Colaboradores em Campo</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                <TrendingUp size={14}/> Atividades Realizadas
                            </h4>
                            <div className="space-y-2">
                                {selectedRDO.activities?.length > 0 ? selectedRDO.activities.map((act: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <p className="text-sm text-slate-700 dark:text-slate-300">{act.desc || act}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-slate-400 italic">Nenhuma atividade listada.</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Observações da Engenharia</h4>
                            <div className="bg-slate-50 dark:bg-[#0B1121] p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">"{selectedRDO.obs || 'Tudo conforme planejado.'}"</p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {selectedApproval && (
                <Modal title={approvalStatus === 'Aprovado' ? "Confirmar Aprovação" : "Solicitar Revisão"} onClose={() => { setSelectedApproval(null); setApprovalStatus(null); }}>
                    <div className="space-y-6 p-2">
                        <div className={`p-4 rounded-2xl border ${approvalStatus === 'Aprovado' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                            <p className="text-[10px] font-black uppercase mb-1 opacity-60">Item selecionado:</p>
                            <p className="font-bold">{selectedApproval.title}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observações {approvalStatus === 'Reprovado' ? '(Obrigatório)' : '(Opcional)'}</label>
                            <textarea 
                                value={approvalForm.observations}
                                onChange={e => setApprovalForm({...approvalForm, observations: e.target.value})}
                                placeholder={approvalStatus === 'Reprovado' ? "Descreva o que precisa ser ajustado..." : "Alguma consideração extra?"}
                                className="w-full p-4 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:border-blue-500 outline-none min-h-[120px] resize-none"
                            />
                        </div>

                        <button 
                            onClick={handleRespondApproval}
                            className={`w-full py-4 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 ${approvalStatus === 'Aprovado' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'}`}
                        >
                            Confirmar {approvalStatus}
                        </button>
                    </div>
                </Modal>
            )}

            <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 0px; }`}} />
        </div>
    );
}

"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../components/AuthContext';
import { canAccessModule, getDefaultTab, canUploadGED } from '../../../lib/permissions';
import { LayoutDashboard, HardHat, DollarSign, CalendarClock, BrainCircuit, ArrowLeft, Settings, Bell, Package, Scale, ShieldCheck, Folder, LogOut, UserCircle, Columns, Users, Send, Target } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BotaoMenu } from '../../../components/Shared';
import NotificationCenter from '../../../components/NotificationCenter';
import { getProjectById } from '../../actions/project';
import { approveMeasurement } from '../../actions/measurements';
import NotificationBell from '../../../components/NotificationBell';

// Módulos
import VisaoGeral from '../../../components/modules/VisaoGeral';
import Financeiro from '../../../components/modules/Financeiro';
import Cronograma from '../../../components/modules/Cronograma';
import RDO from '../../../components/modules/RDO';
import IACenter from '../../../components/modules/IACenter';
import Suprimentos from '../../../components/modules/Suprimentos';
import Medicoes from '../../../components/modules/Medicoes';
const Qualidade = dynamic(() => import('../../../components/modules/quality/QualityModule'), { ssr: false });
import GED from '../../../components/modules/GED';
import SettingsModule from '../../../components/modules/Settings';
import GestaoTarefas from '../../../components/modules/GestaoTarefas';
import PortalCliente from '../../../components/modules/PortalCliente';
import ApprovalsInternal from '../../../components/modules/ApprovalsInternal';

const initialConfig = {
    empresa: "Way Service Engenharia", cnpj: "00.000.000/0001-00", logo: "", obraNome: "Residencial Aurora",
    usuarios: [
        { id: 1, nome: "Bruno Amorim", cargo: "Diretor", email: "bruno@way.com", status: "Ativo" }
    ]
};

export default function ProjectPage() {
  const params = useParams();
  const id = params?.id as string; 
  const [proj, setProj] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [config, setConfig] = useState(initialConfig);
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [feed, setFeed] = useState<any[]>([]);
  const [localPosts, setLocalPosts] = useState<any[]>([]); // Estado compartilhado para os posts do diário
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);

  // --- SISTEMA DE LOGIN ---
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const refreshData = useCallback(() => {
    if (id) {
        getProjectById(id).then(data => {
            if (data) {
                setProj(data);
                setConfig({...initialConfig, obraNome: data.nome});
                
                let formattedFeed: any[] = [];
                if (data.feedPosts) {
                    formattedFeed = data.feedPosts.map((p: any) => ({
                        id: `feed-${p.id}`,
                        author: p.author,
                        role: p.role,
                        time: new Date(p.createdAt).toLocaleDateString('pt-BR'),
                        location: p.location,
                        desc: p.description,
                        image: p.image ? p.image.replace('/uploads/', '/api/images/') : '',
                        tags: p.tags ? p.tags.split(',') : [],
                        likes: p.likes,
                        comments: p.comments,
                        createdAt: p.createdAt
                    }));
                }
                
                const rdoPhotos: any[] = [];
                if (data.rdos && Array.isArray(data.rdos)) {
                    data.rdos.forEach((rdo: any) => {
                        if (rdo.activities && Array.isArray(rdo.activities)) {
                            rdo.activities.forEach((act: any) => {
                                if (act.photos && Array.isArray(act.photos)) {
                                    act.photos.forEach((photo: any) => {
                                        rdoPhotos.push({
                                            id: `rdo-${photo.id || Math.random()}`,
                                            author: "RDO Digital",
                                            role: "Sistema",
                                            time: rdo.data || new Date().toLocaleDateString('pt-BR'),
                                            location: data.nome,
                                            desc: photo.caption || act.observations || `Foto do RDO #${rdo.id}`,
                                            image: photo.url,
                                            tags: ["RDO"],
                                            likes: 0,
                                            comments: 0,
                                            createdAt: rdo.data ? new Date(rdo.data.split('/').reverse().join('-')).toISOString() : new Date().toISOString()
                                        });
                                    });
                                }
                            });
                        }
                    });
                }
                
                const allPosts = [...formattedFeed, ...rdoPhotos].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setLocalPosts(allPosts);
            } else {
                alert("Obra não encontrada.");
                router.push('/');
            }
            setIsDataLoading(false);
        }).catch(err => {
            console.error(err);
            setIsDataLoading(false);
        });
    }
  }, [id, router]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (user && activeTab === 'visao-geral' && !canAccess('visao-geral')) {
        setActiveTab(getDefaultTab(user.role));
    }
  }, [user, activeTab]);

  // --- MATRIZ DE PERMISSÕES (centralizada em lib/permissions.ts) ---
  const canAccess = (tab: string) => {
      const role = user?.role || '';
      return canAccessModule(role, tab);
  };

  useEffect(() => {
    if(!proj) return;
    setFeed([]);
    let count = 0;
    const dadosDoFeed = proj.feed_live || [];
    const interval = setInterval(() => {
      if (count < dadosDoFeed.length) { setFeed((prev) => [dadosDoFeed[count], ...prev]); count++; } else { clearInterval(interval); }
    }, 3000);
    return () => clearInterval(interval);
  }, [proj]);

  const handleShowToast = (title: string, msg: string, type: 'success' | 'alert' | 'info' = 'success') => {
      setNotifications(prev => [{ id: Date.now(), title, msg, type, time: "Agora" }, ...prev]);
      setShowNotif(true);
      setTimeout(() => setShowNotif(false), 3000);
  };

  const handleApproveMedicao = async (medicaoId: number) => {
      const res = await approveMeasurement(medicaoId);
      if (res.success) {
          refreshData();
          window.dispatchEvent(new Event('refresh_notifications'));
          handleShowToast("Sucesso", "BM aprovado com sucesso!", "success");
      } else {
          alert("Erro ao aprovar BM: " + res.error);
      }
  };

  if (isLoading || !user || isDataLoading || !proj) {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col items-center justify-center p-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-bold">Carregando dados da obra...</p>
          </div>
      );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans overflow-hidden transition-colors duration-300 relative">
      <NotificationCenter isOpen={showNotif} notifications={notifications} onClose={() => setShowNotif(false)} onClear={() => setNotifications([])} />
      
      <aside className="w-64 bg-slate-900 dark:bg-[#060b16] text-white flex flex-col shadow-2xl hidden md:flex border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = '/'}><div className="bg-gradient-to-br from-emerald-400 to-blue-600 p-2 rounded-lg"><HardHat size={24}/></div><div><h1 className="text-xl font-bold">ObraSys</h1><p className="text-[10px] text-emerald-400 font-bold uppercase">Way Tech</p></div></div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link href="/"><BotaoMenu icone={<ArrowLeft size={18}/>} texto="Voltar para Obras" /></Link>
          
          <p className="text-xs font-bold text-slate-500 uppercase px-3 mt-6 mb-2">Gestão</p>
          {canAccess('visao-geral') && <div onClick={()=>setActiveTab('visao-geral')}><BotaoMenu icone={<LayoutDashboard size={18}/>} texto="Visão Geral" ativo={activeTab==='visao-geral'} /></div>}
          {canAccess('portal-cliente') && <div onClick={()=>setActiveTab('portal-cliente')}><BotaoMenu icone={<Users size={18}/>} texto="Portal do Cliente" ativo={activeTab==='portal-cliente'} /></div>}
          {canAccess('financeiro') && <div onClick={()=>setActiveTab('financeiro')}><BotaoMenu icone={<DollarSign size={18}/>} texto="Financeiro" ativo={activeTab==='financeiro'} /></div>}
          {canAccess('medicoes') && <div onClick={()=>setActiveTab('medicoes')}><BotaoMenu icone={<Scale size={18}/>} texto="Contratos & BM" ativo={activeTab==='medicoes'} /></div>}
          {canAccess('cronograma') && <div onClick={()=>setActiveTab('cronograma')}><BotaoMenu icone={<CalendarClock size={18}/>} texto="Cronograma Master" ativo={activeTab==='cronograma'} /></div>}
          {canAccess('tarefas') && <div onClick={()=>setActiveTab('tarefas')}><BotaoMenu icone={<Columns size={18}/>} texto="Kanban de Tarefas" ativo={activeTab==='tarefas'} /></div>}
          {canAccess('suprimentos') && <div onClick={()=>setActiveTab('suprimentos')}><BotaoMenu icone={<Package size={18}/>} texto="Suprimentos" ativo={activeTab==='suprimentos'} /></div>}
          {canAccess('ged') && <div onClick={()=>setActiveTab('ged')}><BotaoMenu icone={<Folder size={18}/>} texto="Projetos & GED" ativo={activeTab==='ged'} /></div>}
          {canAccess('solicitacoes') && <div onClick={()=>setActiveTab('solicitacoes')}><BotaoMenu icone={<Send size={18}/>} texto="Aprovações Cliente" ativo={activeTab==='solicitacoes'} /></div>}
          
          <p className="text-xs font-bold text-slate-500 uppercase px-3 mt-6 mb-2">Campo</p>
          {canAccess('rdo') && <div onClick={()=>setActiveTab('rdo')}><BotaoMenu icone={<HardHat size={18}/>} texto="RDO Digital" ativo={activeTab==='rdo'} /></div>}
          {canAccess('qualidade') && <div onClick={()=>setActiveTab('qualidade')}><BotaoMenu icone={<ShieldCheck size={18}/>} texto="Qualidade e Segurança" ativo={activeTab==='qualidade'} /></div>}
          
          {(user?.role === 'Diretor' || user?.role === 'TI' || user?.role === 'RH / DP') && (
              <>
                <p className="text-xs font-bold text-slate-500 uppercase px-3 mt-6 mb-2">Admin</p>
                {canAccess('ia-center') && <div onClick={()=>setActiveTab('ia-center')}><BotaoMenu icone={<BrainCircuit size={18}/>} texto="Way IA Center" ativo={activeTab==='ia-center'} /></div>}
                <div onClick={()=>setActiveTab('config')}><BotaoMenu icone={<Settings size={18}/>} texto="Configurações" ativo={activeTab==='config'} /></div>
              </>
          )}
        </nav>
        
        <div className="p-4 bg-slate-950 dark:bg-[#020617] border-t border-slate-800">
             <Link href="/perfil" className="flex items-center gap-3 px-2 mb-2 hover:bg-slate-800 py-2 rounded-lg transition-colors cursor-pointer group">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs shadow-md group-hover:scale-105 transition-transform">{user?.name.charAt(0)}</div>
                <div className="overflow-hidden"><p className="text-xs font-bold truncate group-hover:text-blue-400 transition-colors">{user?.name}</p><p className="text-[10px] text-slate-400 truncate">{user?.role}</p></div>
             </Link>
             <button onClick={() => logout()} className="w-full py-1 bg-slate-800 hover:text-red-400 text-slate-400 text-xs rounded flex items-center justify-center gap-1"><LogOut size={12}/> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6"><div className="flex items-center gap-4"><h2 className="text-lg font-bold">{proj.nome}</h2><span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full font-bold border border-emerald-200 dark:border-emerald-800">{proj.status}</span></div><NotificationBell /></header>
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-[#0B1121]">
            {activeTab === 'visao-geral' && canAccess('visao-geral') && <VisaoGeral proj={proj} feed={feed} localPosts={localPosts} setActiveTab={setActiveTab}/>}
            {activeTab === 'portal-cliente' && canAccess('portal-cliente') && <PortalCliente proj={proj} localPosts={localPosts} setLocalPosts={setLocalPosts} setActiveTab={setActiveTab}/>}
            {activeTab === 'financeiro' && canAccess('financeiro') && <Financeiro proj={proj}/>}
            {activeTab === 'medicoes' && canAccess('medicoes') && <Medicoes proj={proj} onRefresh={refreshData} onApprove={handleApproveMedicao} showToast={handleShowToast}/>}
            {activeTab === 'cronograma' && canAccess('cronograma') && <Cronograma proj={proj} onRefresh={refreshData}/>}
            {activeTab === 'tarefas' && canAccess('tarefas') && <GestaoTarefas proj={proj} onRefresh={refreshData}/>}
            {activeTab === 'suprimentos' && canAccess('suprimentos') && <Suprimentos proj={proj}/>}
            {activeTab === 'qualidade' && canAccess('qualidade') && <Qualidade proj={proj}/>}
            {activeTab === 'ged' && canAccess('ged') && <GED proj={proj}/>}
            {activeTab === 'solicitacoes' && canAccess('solicitacoes') && <ApprovalsInternal proj={proj}/>}
            {activeTab === 'rdo' && canAccess('rdo') && <RDO proj={proj} feed={feed} config={config}/>}
            {activeTab === 'ia-center' && canAccess('ia-center') && <IACenter proj={proj}/>}
            {activeTab === 'config' && canAccess('config') && <SettingsModule />}
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Moon, Sun, ArrowLeft, Save, ShieldCheck, Building2, X, Headset, Plus, HardHat, FileText, Bell, Key, Smartphone, Monitor, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createItTicket } from '../actions/ti';
import { getMyProfileData } from '../actions/profile';
import { useAuth } from '../../components/AuthContext';

export default function PerfilUsuario() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'Baixa' });
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [emailNotif, setEmailNotif] = useState(true);
  const [whatsappNotif, setWhatsappNotif] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    // Carregar dados completos do perfil
    getMyProfileData().then(data => {
      if(data.success) {
         setMyTickets(data.tickets || []);
         setAssets(data.assets || []);
         setDocuments(data.employee?.documents || []);
      }
    });
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.remove('dark');
      setIsDarkMode(false);
    } else {
      html.classList.add('dark');
      setIsDarkMode(true);
    }
  };

  const handleSave = () => {
    setIsLoading(true);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    setTimeout(() => {
      setIsLoading(false);
      router.push('/'); 
    }, 500);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createItTicket({
      ...newTicket,
      userId: 0 // Server will fetch from cookie
    });
    if (res.success) {
      alert("Chamado aberto com sucesso! A equipe de T.I. já foi notificada.");
      setIsNewTicketModalOpen(false);
      setNewTicket({ title: '', description: '', priority: 'Baixa' });
      // Atualizar lista
      getMyProfileData().then(data => {
         if(data.success) setMyTickets(data.tickets || []);
      });
    } else {
      alert("Erro ao abrir chamado: " + res.error);
    }
  };

  const handleCancel = () => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    router.back();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-white transition-colors duration-300 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl bg-white dark:bg-[#162032] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-[#0B1121] p-8 flex flex-col md:flex-row items-center gap-6 relative border-b border-slate-700">
          <button onClick={handleCancel} className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={18} /> Voltar
          </button>
          <button onClick={() => { logout(); router.push('/login'); }} className="absolute top-6 right-6 text-rose-500/70 hover:text-rose-500 transition-colors flex items-center gap-2 text-sm font-bold">
            <LogOut size={18} /> Sair
          </button>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-[#162032] shadow-xl z-10">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold text-white">{user?.name || 'Carregando...'}</h1>
            <p className="text-emerald-400 text-sm font-medium">{user?.role ? `Way Service - ${user.role}` : 'Way Service'}</p>
          </div>
        </div>
        <div className="p-8 space-y-8">
          <div className="bg-slate-100 dark:bg-[#0B1121]/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
             <div className="flex gap-4 items-center">
                <div className={`p-3 rounded-full ${isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-100 text-orange-500'}`}>
                    {isDarkMode ? <Moon size={24}/> : <Sun size={24}/>}
                </div>
                <div>
                    <h3 className="font-bold">Aparência</h3>
                    <p className="text-sm opacity-70">{isDarkMode ? 'Modo Escuro' : 'Modo Claro'}</p>
                </div>
             </div>
             <button onClick={toggleTheme} className={`w-16 h-9 rounded-full flex items-center px-1 transition-colors ${isDarkMode ? 'bg-[#0B1121] border border-emerald-500' : 'bg-slate-300'}`}>
                <div className={`w-7 h-7 rounded-full shadow-md transform transition-transform ${isDarkMode ? 'translate-x-7 bg-emerald-500' : 'bg-white'}`}></div>
             </button>
          </div>
          
          {user?.role !== 'Cliente / Investidor' && (
          <div className="bg-slate-100 dark:bg-[#0B1121]/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
             <div className="flex gap-4 items-center">
                <div className="p-3 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400">
                    <Headset size={24}/>
                </div>
                <div>
                    <h3 className="font-bold">Suporte e T.I.</h3>
                    <p className="text-sm opacity-70">Precisa de ajuda com equipamentos ou sistemas?</p>
                </div>
             </div>
             <button onClick={() => setIsNewTicketModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white dark:bg-violet-600 font-bold uppercase text-xs rounded-xl hover:opacity-90 transition-opacity">
                <Plus size={16}/> Abrir Chamado
             </button>
          </div>
          )}

          {user?.role !== 'Cliente / Investidor' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Meus Equipamentos */}
              <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Monitor className="text-blue-500" size={20}/> Meus Equipamentos</h3>
                  {assets.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum equipamento vinculado a você.</p>
                  ) : (
                      <div className="space-y-3">
                         {assets.map((asset: any) => (
                             <div key={asset.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0B1121] rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-sm font-bold">{asset.category} {asset.brand}</p>
                                    <p className="text-xs text-slate-500">Tag: {asset.tag}</p>
                                </div>
                                <ShieldCheck className="text-emerald-500" size={16}/>
                             </div>
                         ))}
                      </div>
                  )}
              </div>

              {/* Meus Documentos */}
              <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><FileText className="text-amber-500" size={20}/> Meus Documentos de RH</h3>
                  {documents.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum documento encontrado.</p>
                  ) : (
                      <div className="space-y-3">
                         {documents.map((doc: any) => (
                             <div key={doc.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0B1121] rounded-lg border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="text-sm font-bold">{doc.type}</p>
                                    <p className="text-xs text-slate-500">Vencimento: {new Date(doc.expirationDate).toLocaleDateString()}</p>
                                </div>
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${doc.status === 'Válido' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                    {doc.status}
                                </span>
                             </div>
                         ))}
                      </div>
                  )}
              </div>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Segurança e PIN */}
              <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Lock className="text-rose-500" size={20}/> Segurança e Assinatura</h3>
                  
                  <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                         <div>
                             <p className="text-sm font-bold">Senha de Acesso</p>
                             <p className="text-xs text-slate-500">Última alteração: há 3 meses</p>
                         </div>
                         <button className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-3 py-1.5 rounded-lg">Alterar</button>
                      </div>

                      <div>
                         <p className="text-sm font-bold">Assinatura Digital (PIN)</p>
                         <p className="text-xs text-slate-500 mb-2">PIN de 4 dígitos para assinar RDOs e Medições</p>
                         <div className="flex gap-2">
                             <input type="password" maxLength={4} value={pin} onChange={(e)=>setPin(e.target.value.replace(/\D/g, ''))} className="w-24 text-center tracking-widest font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="****" />
                             <button className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 rounded-lg">Definir PIN</button>
                         </div>
                      </div>
                  </div>
              </div>

              {/* Notificações */}
              <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Bell className="text-indigo-500" size={20}/> Notificações</h3>
                  
                  <div className="space-y-4 mt-4">
                     <div className="flex justify-between items-center cursor-pointer" onClick={() => setEmailNotif(!emailNotif)}>
                         <div className="flex items-center gap-3">
                             <Mail size={18} className="text-slate-400" />
                             <div>
                                 <p className="text-sm font-bold">Alertas por E-mail</p>
                                 <p className="text-xs text-slate-500">Receber comunicados via e-mail corporativo</p>
                             </div>
                         </div>
                         <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${emailNotif ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${emailNotif ? 'translate-x-4' : 'translate-x-0'}`}></div>
                         </div>
                     </div>

                     <div className="flex justify-between items-center cursor-pointer" onClick={() => setWhatsappNotif(!whatsappNotif)}>
                         <div className="flex items-center gap-3">
                             <Smartphone size={18} className="text-slate-400" />
                             <div>
                                 <p className="text-sm font-bold">Alertas por WhatsApp</p>
                                 <p className="text-xs text-slate-500">Receber notificações urgentes pelo WhatsApp</p>
                             </div>
                         </div>
                         <div className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${whatsappNotif ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${whatsappNotif ? 'translate-x-4' : 'translate-x-0'}`}></div>
                         </div>
                     </div>
                  </div>
              </div>
          </div>

          {/* Histórico de Chamados */}
          {user?.role !== 'Cliente / Investidor' && myTickets.length > 0 && (
             <div className="bg-slate-100 dark:bg-[#0B1121]/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold mb-4">Meus Chamados Abertos</h3>
                <div className="space-y-3">
                   {myTickets.map(ticket => (
                      <div key={ticket.id} className="flex justify-between items-center p-3 bg-white dark:bg-[#162032] rounded-lg border border-slate-200 dark:border-slate-700">
                         <div>
                            <p className="text-sm font-bold">{ticket.title}</p>
                            <p className="text-xs text-slate-500">{new Date(ticket.createdAt).toLocaleDateString()} - Prioridade: {ticket.priority}</p>
                         </div>
                         <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ticket.status === 'Resolvido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {ticket.status}
                         </span>
                      </div>
                   ))}
                </div>
             </div>
          )}

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button onClick={handleCancel} className="px-6 py-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold">Cancelar</button>
            <button onClick={handleSave} disabled={isLoading} className="px-8 py-2 rounded-lg bg-slate-900 text-white dark:bg-emerald-600 hover:opacity-90 font-bold shadow-lg">
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-lg font-bold">Abrir Novo Chamado</h2>
              <button onClick={() => setIsNewTicketModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="ticketForm" onSubmit={handleCreateTicket} className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Assunto</label>
                   <input required value={newTicket.title} onChange={e=>setNewTicket({...newTicket,title:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500" placeholder="Ex: Computador não liga" />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Descrição do Problema</label>
                   <textarea required rows={4} value={newTicket.description} onChange={e=>setNewTicket({...newTicket,description:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500" placeholder="Detalhe o que está acontecendo..."></textarea>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prioridade</label>
                    <select value={newTicket.priority} onChange={e=>setNewTicket({...newTicket,priority:e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-violet-500">
                       <option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option>
                    </select>
                 </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
               <button form="ticketForm" type="submit" className="w-full py-3 bg-violet-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-violet-500/30">Enviar Chamado</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

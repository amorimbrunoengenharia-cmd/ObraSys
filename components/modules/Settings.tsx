"use client";
import React, { useState, useEffect } from 'react';
import { Users, Save, Trash2, Shield, UserPlus, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { Modal } from '../Shared';
import { getUsers, createUser, updateUserRoleAndStatus, deleteUser } from '../../app/actions/user';

export default function SettingsModule() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isUserModal, setIsUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Engenheiro' });

  // ROLES OFICIAIS DO SISTEMA (16 cargos)
  const ROLES = [
      "Diretor", 
      "Gerente de Obras", 
      "Coordenador de Obras", 
      "Engenheiro Residente",
      "Engenheiro", 
      "Projetista / Eng. de Projetos",
      "Orçamentista",
      "Mestre de Obras", 
      "Téc. Segurança",
      "Gerente Financeiro", 
      "Auxiliar Financeiro",
      "RH / DP",
      "TI",
      "Administrativo de Obra",
      "Almoxarife", 
      "Cliente / Investidor"
  ];

  const loadUsers = async () => {
      setIsLoading(true);
      const res = await getUsers();
      if (res.success) {
          setUsers(res.users || []);
      } else {
          alert("Erro ao carregar usuários: " + res.error);
      }
      setIsLoading(false);
  };

  useEffect(() => {
      loadUsers();
  }, []);

  const handleAddUser = async () => {
      if (!newUser.name || !newUser.email) {
          alert("Preencha nome e e-mail.");
          return;
      }
      setIsSaving(true);
      const res = await createUser(newUser);
      if (res.success) {
          setIsUserModal(false);
          setNewUser({ name: '', email: '', role: 'Engenheiro' });
          await loadUsers();
      } else {
          alert("Erro: " + res.error);
      }
      setIsSaving(false);
  };

  const handleUpdateRole = async (id: number, newRole: string) => {
      const user = users.find(u => u.id === id);
      if (!user) return;
      
      // Update otimista na UI
      setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
      
      const res = await updateUserRoleAndStatus(id, newRole, user.isActive);
      if (!res.success) {
          alert("Erro ao atualizar cargo: " + res.error);
          await loadUsers(); // Reverte em caso de erro
      }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
      const user = users.find(u => u.id === id);
      if (!user) return;
      
      // Update otimista na UI
      setUsers(users.map(u => u.id === id ? { ...u, isActive: !currentStatus } : u));
      
      const res = await updateUserRoleAndStatus(id, user.role, !currentStatus);
      if (!res.success) {
          alert("Erro ao atualizar status: " + res.error);
          await loadUsers(); // Reverte em caso de erro
      }
  };

  const handleRemoveUser = async (id: number) => {
      if (!confirm("Tem certeza que deseja remover este usuário? Se ele tiver registros (ex: RDOs), a exclusão falhará. Neste caso, prefira Inativar a conta.")) return;
      
      const res = await deleteUser(id);
      if (res.success) {
          await loadUsers();
      } else {
          alert("Aviso: " + res.error);
      }
  };

  return (
    <div className="p-6 h-full overflow-y-auto animate-in fade-in bg-slate-50 dark:bg-[#0B1121]">
        {isUserModal && (
            <Modal title="Novo Usuário" onClose={() => setIsUserModal(false)}>
                <div className="space-y-4">
                    <input 
                        placeholder="Nome Completo" 
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-[#162032] outline-none focus:border-blue-500" 
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                    <input 
                        placeholder="E-mail de Acesso" 
                        type="email"
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-[#162032] outline-none focus:border-blue-500" 
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                    <select 
                        className="w-full p-3 border border-slate-200 dark:border-slate-700 rounded-lg dark:bg-[#162032] outline-none focus:border-blue-500" 
                        value={newUser.role} 
                        onChange={e => setNewUser({...newUser, role: e.target.value})}
                    >
                        {ROLES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400 text-xs mt-2 flex items-start gap-2">
                        <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                        <p>Uma senha provisória será definida automaticamente para este usuário. No primeiro acesso, ele deverá solicitar a redefinição de senha.</p>
                    </div>

                    <button 
                        onClick={handleAddUser} 
                        disabled={isSaving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <UserPlus size={18} />}
                        {isSaving ? 'Criando...' : 'Adicionar Usuário'}
                    </button>
                </div>
            </Modal>
        )}

        <div className="flex justify-between items-end mb-8">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <Users className="text-emerald-500"/> Painel de Controle de Acessos
                </h2>
                <p className="text-sm text-slate-500 mt-1">Gerencie os usuários, cargos e permissões do sistema ObraSys.</p>
            </div>
            <button 
                onClick={loadUsers} 
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50"
            >
                <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Atualizar
            </button>
        </div>

        <div className="bg-white dark:bg-[#162032] rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-700 dark:text-slate-300">Usuários do Sistema</h3>
                <button 
                    onClick={() => setIsUserModal(true)} 
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                    <UserPlus size={14}/> Adicionar Usuário
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-xs text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="p-4 font-bold">Usuário / E-mail</th>
                            <th className="p-4 font-bold">Cargo (Role)</th>
                            <th className="p-4 font-bold">Status da Conta</th>
                            <th className="p-4 text-right font-bold">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {isLoading && users.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Carregando usuários...</td></tr>
                        )}
                        {!isLoading && users.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>
                        )}
                        {users.map((u: any) => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800 dark:text-slate-200">{u.name}</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">{u.email}</div>
                                </td>
                                <td className="p-4">
                                    <select 
                                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500"
                                        value={u.role}
                                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                                    >
                                        {ROLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </td>
                                <td className="p-4">
                                    <button 
                                        onClick={() => handleToggleStatus(u.id, u.isActive)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 w-fit transition-colors ${u.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-400'}`}
                                        title="Clique para alterar o status"
                                    >
                                        {u.isActive ? <CheckCircle2 size={14}/> : <Shield size={14}/>}
                                        {u.isActive ? 'CONTA ATIVA' : 'INATIVO'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button 
                                        onClick={() => handleRemoveUser(u.id)} 
                                        title="Excluir Permanentemente" 
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

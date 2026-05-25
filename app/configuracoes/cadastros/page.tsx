"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Briefcase, Building2, Tractor, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../../components/AuthContext';
import { useRouter } from 'next/navigation';
import { canAccessPage } from '../../../lib/permissions';
import { 
    getJobRoles, saveJobRole, deleteJobRole,
    getCompanies, saveCompany, deleteCompany,
    getEquipmentTypes, saveEquipmentType, deleteEquipmentType 
} from '../../actions/registrations';

export default function CadastrosBase() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [roles, setRoles] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);
    const [equips, setEquips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [newItem, setNewItem] = useState({ name: '', type: 'role' });

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && !canAccessPage(user.role, 'configuracoes')) {
            router.push('/');
            return;
        }
        if (user) loadData();
    }, [user, isAuthLoading, router]);

    async function loadData() {
        setLoading(true);
        const [r, c, e] = await Promise.all([
            getJobRoles(),
            getCompanies(),
            getEquipmentTypes()
        ]);
        setRoles(r);
        setCompanies(c);
        setEquips(e);
        setLoading(false);
    }

    async function handleAdd() {
        if (!newItem.name) return;
        
        if (newItem.type === 'role') await saveJobRole(newItem.name);
        else if (newItem.type === 'company') await saveCompany(newItem.name);
        else if (newItem.type === 'equip') await saveEquipmentType(newItem.name);
        
        setNewItem({ ...newItem, name: '' });
        loadData();
    }

    async function handleDelete(id: number, type: string) {
        if (!confirm('Tem certeza?')) return;
        
        if (type === 'role') await deleteJobRole(id);
        else if (type === 'company') await deleteCompany(id);
        else if (type === 'equip') await deleteEquipmentType(id);
        
        loadData();
    }

    const Section = ({ title, icon: Icon, items, type }: any) => (
        <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Icon size={18} className="text-blue-500"/>
                </div>
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-slate-500">{title}</h3>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {items.length === 0 && <p className="text-xs text-slate-400 italic">Nenhum cadastro encontrado.</p>}
                {items.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0B1121] rounded-xl border border-slate-100 dark:border-slate-800 group">
                        <span className="text-sm font-bold">{item.name}</span>
                        <button 
                            onClick={() => handleDelete(item.id, type)}
                            className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={16}/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ChevronLeft/>
                    </Link>
                    <div>
                        <h2 className="text-2xl font-black flex items-center gap-3">
                            <Settings className="text-blue-500" size={24}/>
                            Cadastros de Base
                        </h2>
                        <p className="text-sm text-slate-500">Padronização de funções, empresas e equipamentos para o RDO.</p>
                    </div>
                </div>
            </div>

            <div className="bg-blue-600 p-6 rounded-3xl shadow-xl shadow-blue-500/20 text-white space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest">Novo Cadastro Rápido</h3>
                <div className="flex flex-wrap gap-4">
                    <select 
                        className="flex-1 min-w-[200px] p-3 bg-blue-700 border border-blue-500 rounded-xl font-bold outline-none"
                        value={newItem.type}
                        onChange={e => setNewItem({...newItem, type: e.target.value})}
                    >
                        <option value="role">Função / Cargo</option>
                        <option value="company">Empresa Terceirizada</option>
                        <option value="equip">Tipo de Equipamento</option>
                    </select>
                    <input 
                        type="text" 
                        placeholder="Nome do item..."
                        className="flex-[2] min-w-[300px] p-3 bg-white text-slate-900 rounded-xl font-bold outline-none"
                        value={newItem.name}
                        onChange={e => setNewItem({...newItem, name: e.target.value})}
                    />
                    <button 
                        onClick={handleAdd}
                        className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 flex items-center gap-2"
                    >
                        <Plus size={20}/>
                        Adicionar
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <Section title="Funções de Mão de Obra" icon={Briefcase} items={roles} type="role" />
                    <Section title="Empresas Terceirizadas" icon={Building2} items={companies} type="company" />
                    <Section title="Tipos de Equipamento" icon={Tractor} items={equips} type="equip" />
                </div>
            )}
        </div>
    );
}

"use client";
import React, { useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Users, User, LogOut, UserPlus, HardHat, ShieldAlert, Clock, FileText, 
  AlertTriangle, Search, Filter, Plus, ChevronRight, X, Calendar, Edit, Building2, CheckCircle, ArrowLeft, Trash2, TrendingUp, TrendingDown, Activity, Upload, MoreVertical, AlertCircle, FileSignature, Wallet, ChevronDown, CheckCircle2, Shield, MapPin, Camera, UserSquare2
} from 'lucide-react';
import { ROLES } from '../../lib/permissions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  createEmployee, updateEmployee, addEmployeeDocument, 
  addEmployeeEpi, returnEpi, addEmployeeAttendance, addEmployeeOccurrence, deleteEmployee, createCandidate, updateCandidateStatus
} from '../../app/actions/rh';
import NotificationBell from '../NotificationBell';
import { useAuth } from '../AuthContext';

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RHClient({ initialEmployees, stats, projects, jobRoles, companies, userRole, turnoverGoal, candidates: initialCandidates }: any) {

  const router = useRouter();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'efetivo' | 'ponto' | 'recrutamento'>('dashboard');
  const [candidates, setCandidates] = useState<any[]>(initialCandidates || []);

  const [employees, setEmployees] = useState<any[]>(initialEmployees);

  const totalPayroll = employees
    .filter(emp => emp.status === 'Ativo' || emp.status === 'Férias' || emp.status === 'Aviso Prévio')
    .reduce((acc, emp) => {
      const salary = emp.baseSalary || 0;
      if (emp.regime === 'PJ') return acc + salary;
      const encargos = emp.encargos || 68;
      return acc + (salary * (1 + encargos / 100));
    }, 0);
  const [searchQuery, setSearchQuery] = useState('');
  
  const canDelete = userRole === 'Diretor' || userRole === 'Director' || userRole === 'RH / DP' || userRole === 'Admin';

  // Modals
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false);
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);

  // New Employee Form
  const [newEmpForm, setNewEmpForm] = useState<{
    name: string, cpf: string, rg: string, matricula: string, birthDate: string, 
    jobRoleId: string, companyId: string, projectIds: string[], baseSalary: string, status: string, regime: string, encargos: string,
    email?: string, password?: string
  }>({
    name: '', cpf: '', rg: '', matricula: '', birthDate: '', 
    jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo', regime: 'CLT', encargos: '68.0',
    email: '', password: ''
  });

  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleAccess, setNewRoleAccess] = useState('Sem Acesso');
  const [isSavingRole, setIsSavingRole] = useState(false);

  const handleSalaryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setNewEmpForm({ ...newEmpForm, baseSalary: '' });
      return;
    }
    const numValue = (parseInt(value, 10) / 100).toFixed(2);
    setNewEmpForm({ ...newEmpForm, baseSalary: numValue });
  };

  const formatBRL = (value: string) => {
    if (!value) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(value));
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdmitting(true);
    
    const parsedBaseSalary = parseFloat(newEmpForm.baseSalary);
    const parsedEncargos = parseFloat(newEmpForm.encargos);
    const parsedJobRoleId = parseInt(newEmpForm.jobRoleId);
    const parsedCompanyId = parseInt(newEmpForm.companyId);

    const data = {
      name: newEmpForm.name,
      cpf: newEmpForm.cpf,
      rg: newEmpForm.rg,
      matricula: newEmpForm.matricula,
      birthDate: newEmpForm.birthDate ? new Date(newEmpForm.birthDate + 'T12:00:00') : undefined,
      baseSalary: !isNaN(parsedBaseSalary) ? parsedBaseSalary : undefined,
        status: newEmpForm.status,
        regime: newEmpForm.regime,
        encargos: !isNaN(parsedEncargos) ? parsedEncargos : undefined,
      jobRoleId: !isNaN(parsedJobRoleId) ? parsedJobRoleId : undefined,
      companyId: !isNaN(parsedCompanyId) ? parsedCompanyId : undefined,
      projectIds: newEmpForm.projectIds.map(id => parseInt(id)).filter(id => !isNaN(id)),
      email: newEmpForm.email || undefined,
      password: newEmpForm.password || undefined
    };

    if (editingEmployeeId) {
      const res = await updateEmployee(editingEmployeeId, data);
      setIsAdmitting(false);
      if (res.success) {
        alert("Colaborador Atualizado!");
        setIsNewEmpModalOpen(false);
        setEditingEmployeeId(null);
        window.location.reload();
      } else {
        alert("Erro: " + res.error);
      }
      return;
    }

    e.preventDefault();
    setIsAdmitting(true);
    
    const res = await createEmployee(data);
    
    setIsAdmitting(false);
    if (res.success) {
      alert("Colaborador Cadastrado!");
      setIsNewEmpModalOpen(false);
      window.location.reload();
      router.refresh();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.cpf.includes(searchQuery)
  );

  const handleDeleteEmployee = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("ATENÇÃO: Deseja realmente excluir este colaborador permanentemente?")) return;
    const res = await deleteEmployee(id);
    if (res.success) router.refresh();
    else alert("Erro: " + res.error);
  };

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [turnoverInput, setTurnoverInput] = useState(turnoverGoal?.toString() || '');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const { updateSetting } = await import('../../app/actions/settings');
    const res = await updateSetting('rh_turnover_goal', turnoverInput);
    if (res.success) {
      alert("Metas atualizadas com sucesso!");
      setIsSettingsModalOpen(false);
      router.refresh();
    } else {
      alert("Erro ao salvar metas.");
    }
  };

  // Turnover calculation
  const totalEfetivo = stats?.total || 1; // avoid division by zero
  const admissoes = stats?.admissoesTrimestre || 0;
  const demissoes = stats?.demissoesTrimestre || 0;
  
  const turnoverReal = ((admissoes + demissoes) / 2) / totalEfetivo * 100;
  const isTurnoverOk = turnoverGoal ? turnoverReal <= turnoverGoal : true;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col font-sans transition-colors duration-300 text-slate-800 dark:text-slate-200">
      
      {/* HEADER */}
      <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          {!userRole?.includes('RH') && (
              <Link href="/" className="mr-4 text-slate-400 hover:text-rose-500 transition-colors"><ArrowLeft size={24} /></Link>
            )}
          <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">RH</div>
          <div>
            <h1 className="text-lg font-bold leading-none">Gente e Gestão</h1>
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Recursos Humanos & DP</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Dashboard</button>
            <button onClick={() => setActiveTab('efetivo')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'efetivo' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Efetivo</button>
            <button onClick={() => setActiveTab('ponto')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'ponto' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Ponto & Faltas</button>
            <button onClick={() => setActiveTab('recrutamento')} className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'recrutamento' ? 'bg-white dark:bg-slate-700 shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>Recrutamento</button>
          </div>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            {userRole?.includes('RH') && (
              <div className="flex items-center gap-2 ml-2">
                <button onClick={() => router.push('/perfil')} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 hover:bg-slate-200" title="Perfil">
                  <User size={16} />
                </button>
                <button onClick={logout} className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40" title="Sair">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-6 fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/30 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <div><p className="text-xs font-bold text-emerald-600 uppercase">Custo Folha (Ativos)</p><h3 className="text-2xl font-black text-emerald-600">R$ {totalPayroll.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3></div>
              </div>

              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><Users size={24}/></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">Efetivo Total</p><h3 className="text-2xl font-black">{stats?.total || 0}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600"><CheckCircle size={24}/></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">Ativos na Obra</p><h3 className="text-2xl font-black">{stats?.ativos || 0}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-rose-200 dark:border-rose-900/30 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center text-rose-600"><ShieldAlert size={24}/></div>
                <div><p className="text-xs font-bold text-rose-600 uppercase">ASO / NR Vencidos</p><h3 className="text-2xl font-black text-rose-600">{stats?.docsVencidos || 0}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-orange-200 dark:border-orange-900/30 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-orange-500"></div>
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600"><HardHat size={24}/></div>
                <div><p className="text-xs font-bold text-orange-600 uppercase">EPIs p/ Troca</p><h3 className="text-2xl font-black text-orange-600">{stats?.episVencidos || 0}</h3></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between relative group">
                {userRole !== 'Téc. Segurança' && (
                  <button onClick={() => setIsSettingsModalOpen(true)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all opacity-0 group-hover:opacity-100" title="Configurar Metas">
                    <Edit size={18} />
                  </button>
                )}
                <div>
                   <h3 className="text-lg font-bold flex items-center gap-2">
                     {isTurnoverOk ? <TrendingUp className="text-emerald-500"/> : <TrendingDown className="text-red-500"/>} 
                     Retenção e Turnover
                   </h3>
                   <p className="text-slate-500 text-sm mt-2">
                     Atualmente a empresa conta com <strong>{stats?.ativos || 0}</strong> colaboradores ativos. 
                     O índice de turnover no trimestre é de <strong>{turnoverReal.toFixed(1)}%</strong>
                     {turnoverGoal ? (
                       isTurnoverOk 
                        ? `, dentro da meta de ${turnoverGoal}%.` 
                        : `, que está ACIMA da meta de ${turnoverGoal}%.`
                     ) : (
                       `. Defina uma meta para acompanhamento.`
                     )}
                   </p>
                </div>
                <div className="mt-6 flex items-center gap-4">
                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase">Férias</p>
                      <h4 className="text-xl font-black mt-1 text-blue-600">{stats?.ferias || 0}</h4>
                   </div>
                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase">Afastados</p>
                      <h4 className="text-xl font-black mt-1 text-orange-600">{stats?.afastados || 0}</h4>
                   </div>
                   <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                      <p className="text-xs font-bold text-slate-500 uppercase">Demitidos</p>
                      <h4 className="text-xl font-black mt-1 text-red-600">{stats?.demitidos || 0}</h4>
                   </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2"><Activity className="text-rose-500"/> Alertas Prioritários</h3>
                <div className="mt-4 space-y-4">
                   {stats?.docsVencidos > 0 && (
                     <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <ShieldAlert className="text-rose-600" size={20} />
                           <p className="text-sm font-bold text-rose-800 dark:text-rose-400">Existem {stats.docsVencidos} ASOs ou NRs Vencidos</p>
                        </div>
                        <button onClick={()=>setActiveTab('efetivo')} className="text-xs font-bold px-3 py-1 bg-rose-600 text-white rounded-lg">Resolver</button>
                     </div>
                   )}
                   {stats?.episVencidos > 0 && (
                     <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 rounded-2xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <HardHat className="text-orange-600" size={20} />
                           <p className="text-sm font-bold text-orange-800 dark:text-orange-400">Existem {stats.episVencidos} EPIs pendentes de troca</p>
                        </div>
                        <button onClick={()=>setActiveTab('efetivo')} className="text-xs font-bold px-3 py-1 bg-orange-600 text-white rounded-lg">Resolver</button>
                     </div>
                   )}
                   {stats?.docsVencidos === 0 && stats?.episVencidos === 0 && (
                     <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <CheckCircle className="text-emerald-500 mx-auto mb-2" size={32} />
                        <p className="text-sm font-bold text-slate-500">Tudo em dia! Sem alertas pendentes.</p>
                     </div>
                   )}
                </div>
              </div>
            </div>
            {/* GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 flex flex-col">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Distribuição por Cargo</h3>
                 <div className="flex-1">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie
                         data={Object.entries(employees.reduce((acc, emp) => {
                           const role = emp.jobRole?.name || 'Sem Cargo';
                           acc[role] = (acc[role] || 0) + 1;
                           return acc;
                         }, {} as any)).map(([name, value]) => ({name, value}))}
                         cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                       >
                         {Object.entries(employees.reduce((acc, emp) => {
                           const role = emp.jobRole?.name || 'Sem Cargo';
                           acc[role] = (acc[role] || 0) + 1;
                           return acc;
                         }, {} as any)).map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={['#f43f5e', '#f97316', '#3b82f6', '#10b981', '#8b5cf6'][index % 5]} />
                         ))}
                       </Pie>
                       <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>

              <div className="bg-white dark:bg-[#162032] p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm h-80 flex flex-col">
                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Aniversariantes do Mês</h3>
                 <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                   
                   {employees.filter(emp => emp.birthDate && new Date(emp.birthDate).getUTCMonth() === new Date().getMonth()).sort((a,b) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate()).length > 0 ? employees.filter(emp => emp.birthDate && new Date(emp.birthDate).getUTCMonth() === new Date().getMonth()).sort((a,b) => new Date(a.birthDate).getUTCDate() - new Date(b.birthDate).getUTCDate()).slice(0, 5).map(emp => (
                     <div key={emp.id} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center text-white font-bold">{emp.name.charAt(0)}</div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{emp.name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase">Parabéns! (Dia {new Date(emp.birthDate).getUTCDate()})</p>
                        </div>
                     </div>
                   )) : (
                     <p className="text-slate-500 text-sm">Nenhum aniversariante neste mês.</p>
                   )}

                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'efetivo' && (
          <div className="space-y-6 fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <button className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"><Filter size={18}/></button>
              </div>
              <button 
                onClick={() => {
                  setEditingEmployeeId(null);
                  setNewEmpForm({
                    name: '', cpf: '', rg: '', matricula: '', birthDate: '',
                    jobRoleId: '', companyId: '', projectIds: [], baseSalary: '', status: 'Ativo', regime: 'CLT', encargos: '68.0', email: '', password: ''
                  });
                  setIsNewEmpModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/30 transition-all active:scale-95"
              >
                <UserPlus size={16} /> Admitir Colaborador
              </button>
            </div>

            <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Cargo / Função</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Obra Alocada</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map(emp => (
                    <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors">{emp.name}</p>
                            <p className="text-[10px] text-slate-500">{emp.cpf}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600 dark:text-slate-400">{emp.jobRole?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {emp.projects?.length > 0 ? (
                            emp.projects.map((p:any) => (
                              <span key={p.id} className="text-[9px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100 max-w-[120px] truncate" title={p.name}>
                                {p.name.includes('SEDE') ? 'SEDE' : p.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded border border-slate-200">Sem Obra</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : emp.status === 'Demitido' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {emp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        
                        <button onClick={(e) => {
                          e.stopPropagation();
                          setEditingEmployeeId(emp.id);
                          setNewEmpForm({
                            name: emp.name || '',
                            cpf: emp.cpf || '',
                            rg: emp.rg || '',
                            matricula: emp.matricula || '',
                            birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : '',
                            jobRoleId: emp.jobRoleId?.toString() || '',
                            companyId: emp.companyId?.toString() || '',
                            projectIds: emp.projects?.map((p:any) => p.id.toString()) || [],
                            baseSalary: emp.baseSalary?.toString() || '',
                            status: emp.status || 'Ativo',
                            regime: emp.regime || 'CLT',
                            encargos: emp.encargos?.toString() || '68.0',
                            email: emp.user?.email || '',
                            password: '' // Keep password empty unless changing
                          });
                          setIsNewEmpModalOpen(true);
                        }} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar">
                          <Edit size={18}/>
                        </button>

                        {canDelete && (
                          <button onClick={(e) => handleDeleteEmployee(e, emp.id)} className="text-slate-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 size={18}/>
                          </button>
                        )}
                        <button className="text-slate-400 hover:text-rose-600 p-2"><ChevronRight size={20}/></button>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum colaborador encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ponto' && (() => {
          // Agregar todos os lançamentos de ponto de todos os colaboradores
          const allAttendances = filteredEmployees.flatMap(emp => 
            (emp.attendances || []).map((att: any) => ({ ...att, empName: emp.name, empRole: emp.jobRole?.name || '-', empProject: emp.projects?.length > 0 ? emp.projects[0].name : 'Sede' }))
          ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const allOccurrences = employees.flatMap((emp: any) => 
            (emp.occurrences || []).map((occ: any) => ({ ...occ, empName: emp.name }))
          ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const today = new Date();
          today.setHours(0,0,0,0);
          const todayStr = today.toLocaleDateString();

          const totalFaltas = allAttendances.filter((a: any) => a.status.includes('Falta')).length;
          const totalAtestados = allAttendances.filter((a: any) => a.status.includes('Atestado')).length;
          const totalPresentes = allAttendances.filter((a: any) => a.status === 'Presente').length;
          const totalHE = allAttendances.reduce((acc: number, a: any) => acc + (a.overtimeHours || 0), 0);

          return (
          <div className="space-y-6 fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600"><CheckCircle size={24}/></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">Presenças</p><h3 className="text-2xl font-black">{totalPresentes}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-600"><AlertTriangle size={24}/></div>
                <div><p className="text-xs font-bold text-red-600 uppercase">Faltas</p><h3 className="text-2xl font-black text-red-600">{totalFaltas}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-blue-200 dark:border-blue-900/30 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600"><FileText size={24}/></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">Atestados</p><h3 className="text-2xl font-black">{totalAtestados}</h3></div>
              </div>
              <div className="bg-white dark:bg-[#162032] p-5 rounded-2xl border border-orange-200 dark:border-orange-900/30 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600"><Clock size={24}/></div>
                <div><p className="text-xs font-bold text-slate-500 uppercase">Horas Extras</p><h3 className="text-2xl font-black">{totalHE}h</h3></div>
              </div>
            </div>

            {/* Tabela de Lançamentos */}
            <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Calendar size={18} className="text-rose-500"/> Histórico de Ponto & Faltas</h3>
                <span className="text-xs font-bold text-slate-400 mr-4">{allAttendances.length} registro(s)</span>

              <div className="flex gap-2">
                <button onClick={() => {
                  const header = "Data,Colaborador,Obra,Status,Horas,HE,Obs\n";
                  const csv = allAttendances.map((a:any) => `${new Date(a.date).toLocaleDateString('pt-BR')},${a.empName},${a.empProject},${a.status},${a.hoursWorked},${a.overtimeHours},${a.observations||''}`).join('\n');
                  const blob = new Blob([header + csv], { type: 'text/csv;charset=utf-8;' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = 'folha_pagamento.csv';
                  link.click();
                }} className="text-xs font-bold px-3 py-1 bg-emerald-600 text-white rounded-lg flex items-center gap-1 hover:bg-emerald-700 transition-colors">
                  <FileText size={14}/> CSV (Contabilidade)
                </button>
                <button onClick={() => window.print()} className="text-xs font-bold px-3 py-1 bg-slate-600 text-white rounded-lg flex items-center gap-1 hover:bg-slate-700 transition-colors">
                  <Upload size={14}/> Imprimir (PDF)
                </button>
              </div>

              </div>
              {allAttendances.length === 0 ? (
                <div className="p-12 text-center">
                  <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Nenhum lançamento de ponto registrado ainda.</p>
                  <p className="text-slate-400 text-sm mt-1">Vá na aba Efetivo, clique no colaborador e acesse o Dossiê para lançar.</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Colaborador</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Obra</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Horas</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">HE</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {allAttendances.map((att: any) => (
                      <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-sm">{new Date(att.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-sm">{att.empName}</p>
                          <p className="text-[10px] text-slate-500">{att.empRole}</p>
                        </td>
                        <td className="px-6 py-4"><span className="text-[10px] font-black px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-100">{att.empProject}</span></td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                            att.status === 'Presente' ? 'bg-emerald-100 text-emerald-700' :
                            att.status.includes('Falta') ? 'bg-red-100 text-red-700' :
                            att.status.includes('Atestado') ? 'bg-blue-100 text-blue-700' :
                            att.status === 'Férias' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>{att.status}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-sm">{att.hoursWorked}h</td>
                        <td className="px-6 py-4 text-center font-bold text-sm text-orange-600">{att.overtimeHours > 0 ? `+${att.overtimeHours}h` : '-'}</td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{att.observations || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Ocorrências Recentes */}
            {allOccurrences.length > 0 && (
              <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Ocorrências Disciplinares Recentes</h3>
                  <span className="text-xs font-bold text-slate-400">{allOccurrences.length} registro(s)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {allOccurrences.slice(0, 10).map((occ: any) => (
                    <div key={occ.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500"><AlertTriangle size={18}/></div>
                        <div>
                          <p className="font-bold text-sm">{occ.empName} — <span className="text-red-600">{occ.type}</span></p>
                          <p className="text-xs text-slate-500 mt-0.5">{occ.description}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{new Date(occ.date).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          );
        })()}
      
        {activeTab === 'recrutamento' && (
          <div className="space-y-6 fade-in h-full flex flex-col">
            <div className="flex justify-between items-center bg-white dark:bg-[#162032] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <h2 className="font-bold text-lg">Quadro de Recrutamento</h2>
              <button onClick={() => {
                const name = prompt("Nome do Candidato:");
                const position = prompt("Vaga (Ex: Engenheiro):");
                if (name && position) {
                  createCandidate({ name, position }).then(res => {
                     if(res.success) window.location.reload();
                  });
                }
              }} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/30 transition-all">
                <Plus size={16}/> Novo Candidato
              </button>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
               {['Triagem', 'Entrevista', 'Proposta', 'Contratado'].map(col => (
                 <div key={col} className="w-80 flex-shrink-0 bg-slate-100 dark:bg-[#1A2333] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 min-h-[400px]">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-600 dark:text-slate-400 uppercase text-xs tracking-widest">{col}</h3>
                      <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{candidates.filter(c => c.status === col).length}</span>
                    </div>
                    {candidates.filter(c => c.status === col).map(c => (
                      <div key={c.id} className="bg-white dark:bg-[#0B1121] p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group">
                         <div className="flex justify-between items-start mb-2">
                           <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{c.name}</p>
                           <button onClick={async () => {
                              const newStatus = prompt("Mover para (Triagem, Entrevista, Proposta, Contratado, Reprovado):", c.status);
                              if (newStatus && newStatus !== c.status) {
                                const res = await updateCandidateStatus(c.id, newStatus);
                                if(res.success) window.location.reload();
                              }
                           }} className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><MoreVertical size={16}/></button>
                         </div>
                         <p className="text-xs text-slate-500 font-medium mb-3">{c.position}</p>
                         {col === 'Contratado' && (
                           <button onClick={() => {
                             setNewEmpForm(prev => ({...prev, name: c.name}));
                             setIsNewEmpModalOpen(true);
                           }} className="w-full py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-lg hover:bg-emerald-200 transition-colors">
                             Admitir
                           </button>
                         )}
                      </div>
                    ))}
                 </div>
               ))}
            </div>
          </div>
        )}

      </main>

      {/* ADMISSÃO MODAL */}
      {isNewEmpModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md h-full rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">{editingEmployeeId ? "Editar Colaborador" : "Admitir Colaborador"}</h2>
              <button onClick={() => setIsNewEmpModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="newEmpForm" onSubmit={handleCreateEmployee} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
                  <input required value={newEmpForm.name} onChange={e => setNewEmpForm({...newEmpForm, name: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">CPF</label>
                    <input required value={newEmpForm.cpf} onChange={e => setNewEmpForm({...newEmpForm, cpf: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Matrícula</label>
                    <input value={newEmpForm.matricula} onChange={e => setNewEmpForm({...newEmpForm, matricula: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Data de Nascimento</label>
                    <input type="date" value={newEmpForm.birthDate} onChange={e => setNewEmpForm({...newEmpForm, birthDate: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Status do Colaborador</label>
                    <select value={newEmpForm.status} onChange={e => setNewEmpForm({...newEmpForm, status: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 appearance-none font-semibold">
                      <option value="Ativo">🟢 Ativo</option>
                      <option value="Férias">🟡 Férias</option>
                      <option value="Aviso Prévio">🟠 Aviso Prévio</option>
                      <option value="Afastado INSS">🟣 Afastado INSS</option>
                      <option value="Licença Maternidade">🟣 Licença Maternidade</option>
                      <option value="Demitido">🔴 Demitido</option>
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cargo / Função</label>
                    {!isCreatingRole && (
                      <button type="button" onClick={() => setIsCreatingRole(true)} className="text-[10px] font-bold text-rose-500 hover:text-rose-400 uppercase tracking-widest flex items-center gap-1">
                        <Plus size={12} /> Nova Função
                      </button>
                    )}
                  </div>
                  
                  {isCreatingRole ? (
                    <div className="p-4 bg-slate-100 dark:bg-[#1A2333] border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 relative">
                      <button type="button" onClick={() => setIsCreatingRole(false)} className="absolute top-3 right-3 text-slate-400 hover:text-rose-500">
                        <X size={16} />
                      </button>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Função</label>
                        <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Ex: Analista de Projetos" className="w-full mt-1 p-2 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded outline-none text-sm" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nível de Acesso (Sistema)</label>
                        <select value={newRoleAccess} onChange={e => setNewRoleAccess(e.target.value)} className="w-full mt-1 p-2 bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-700 rounded outline-none text-sm">
                          <option value="Sem Acesso">Sem Acesso</option>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <button type="button" disabled={isSavingRole || !newRoleName} onClick={async () => {
                        setIsSavingRole(true);
                        const { createJobRole } = await import('../../app/actions/rh');
                        const res = await createJobRole(newRoleName, newRoleAccess);
                        if (res.success) {
                          setNewEmpForm({...newEmpForm, jobRoleId: res.id?.toString() || ''});
                          setIsCreatingRole(false);
                          setNewRoleName('');
                          setNewRoleAccess('Sem Acesso');
                          // Força reload pra atualizar lista ou a gente assume reload no final
                          window.location.reload(); 
                        } else {
                          alert(res.error);
                        }
                        setIsSavingRole(false);
                      }} className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs uppercase rounded flex items-center justify-center">
                        {isSavingRole ? 'Salvando...' : 'Salvar Função'}
                      </button>
                    </div>
                  ) : (
                    <select required value={newEmpForm.jobRoleId} onChange={e => setNewEmpForm({...newEmpForm, jobRoleId: e.target.value})} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500">
                      <option value="">Selecione...</option>
                      {jobRoles.map((r:any) => <option key={r.id} value={r.id}>{r.name} {r.accessLevel && r.accessLevel !== 'Sem Acesso' ? `(${r.accessLevel})` : ''}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Local de Trabalho ou Projetos Relacionados (Segure Ctrl para selecionar várias)</label>
                  <select multiple required value={newEmpForm.projectIds} onChange={e => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setNewEmpForm({...newEmpForm, projectIds: values});
                  }} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 custom-scrollbar" size={5}>
                    
                    {projects.map((p:any) => <option key={p.id} value={p.id.toString()}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Salário Base (R$)</label>
                  <input type="text" placeholder="R$ 0,00" value={formatBRL(newEmpForm.baseSalary)} onChange={handleSalaryChange} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Regime</label>
                    <select value={newEmpForm.regime} onChange={e => setNewEmpForm({...newEmpForm, regime: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500 font-semibold appearance-none">
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                    </select>
                  </div>
                  {newEmpForm.regime === 'CLT' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Encargos (%)</label>
                      <input type="number" step="0.1" value={newEmpForm.encargos} onChange={e => setNewEmpForm({...newEmpForm, encargos: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" />
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Acesso ao Sistema (Opcional)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                      <input type="email" value={newEmpForm.email} onChange={e => setNewEmpForm({...newEmpForm, email: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" placeholder="Ex: nome@way.com" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Senha</label>
                      <input type="password" value={newEmpForm.password} onChange={e => setNewEmpForm({...newEmpForm, password: e.target.value})} className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" placeholder="••••••••" />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <button form="newEmpForm" type="submit" className="w-full py-3 bg-rose-600 text-white rounded-xl font-black text-sm uppercase shadow-lg shadow-rose-500/30 active:scale-95 transition-transform">{editingEmployeeId ? "Salvar Alterações" : "Admitir Colaborador"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIGURAÇÕES MODAL */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">Configurar Metas de RH</h2>
              <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="settingsForm" onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Meta de Turnover Trimestral (%)</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    required 
                    value={turnoverInput} 
                    onChange={e => setTurnoverInput(e.target.value)} 
                    placeholder="Ex: 5.0"
                    className="w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-rose-500" 
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Defina o limite máximo tolerável para o índice de rotatividade no trimestre.</p>
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setIsSettingsModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl">Cancelar</button>
              <button form="settingsForm" type="submit" className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-rose-500/30">Salvar Metas</button>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIÊ MODAL (Drawer) */}
      {selectedEmployee && (
        <EmployeeDossier 
          emp={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)} 
        />
      )}
    </div>
  );
}

// ============================================================================
// COMPONENTE DOSSIÊ DO COLABORADOR
// ============================================================================
function EmployeeDossier({ emp, onClose }: { emp: any, onClose: () => void }) {
  const [tab, setTab] = useState<'cadastro'|'sst'|'epi'|'ponto'|'ocorrencias'|'desempenho'>('cadastro');
  
  // Modal states
  const [showDocModal, setShowDocModal] = useState(false);
  const [showEpiModal, setShowEpiModal] = useState(false);
  const [showPontoModal, setShowPontoModal] = useState(false);
  const [showOccModal, setShowOccModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [docForm, setDocForm] = useState({ type: 'ASO Admissional', expirationDate: '' });
  const [epiForm, setEpiForm] = useState({ equipmentName: '', caNumber: '', replacementDate: '' });
  const [pontoForm, setPontoForm] = useState({ date: '', status: 'Falta Injustificada', hoursWorked: '0', overtimeHours: '0', observations: '' });
  const [occForm, setOccForm] = useState({ type: 'Advertência Verbal', date: '', description: '' });

  // File states
  const [docFile, setDocFile] = useState<File | null>(null);
  const [epiFile, setEpiFile] = useState<File | null>(null);
  const [pontoFile, setPontoFile] = useState<File | null>(null);
  const [occFile, setOccFile] = useState<File | null>(null);

  const uploadFile = async (file: File | null) => {
    if (!file) return undefined;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/ged', { method: 'POST', body: fd });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return undefined;
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const fileUrl = await uploadFile(docFile);
    const res = await addEmployeeDocument({
      employeeId: emp.id,
      type: docForm.type,
      issueDate: new Date(),
      expirationDate: docForm.expirationDate ? new Date(docForm.expirationDate + 'T12:00:00') : undefined,
      fileUrl
    });
    setSaving(false);
    if (res.success) {
      setShowDocModal(false);
      setDocForm({ type: 'ASO Admissional', expirationDate: '' });
      setDocFile(null);
      window.location.reload();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const handleAddEpi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await addEmployeeEpi({
      employeeId: emp.id,
      equipmentName: epiForm.equipmentName,
      caNumber: epiForm.caNumber || undefined,
      replacementDate: epiForm.replacementDate ? new Date(epiForm.replacementDate + 'T12:00:00') : undefined
    });
    setSaving(false);
    if (res.success) {
      setShowEpiModal(false);
      setEpiForm({ equipmentName: '', caNumber: '', replacementDate: '' });
      setEpiFile(null);
      window.location.reload();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const handleAddPonto = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const certificateUrl = await uploadFile(pontoFile);
    const res = await addEmployeeAttendance({
      employeeId: emp.id,
      date: new Date(pontoForm.date + 'T12:00:00'),
      status: pontoForm.status,
      hoursWorked: parseFloat(pontoForm.hoursWorked) || 0,
      overtimeHours: parseFloat(pontoForm.overtimeHours) || 0,
      observations: pontoForm.observations || undefined,
      certificateUrl
    });
    setSaving(false);
    if (res.success) {
      setShowPontoModal(false);
      setPontoForm({ date: '', status: 'Falta Injustificada', hoursWorked: '0', overtimeHours: '0', observations: '' });
      setPontoFile(null);
      window.location.reload();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const handleAddOcc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const documentUrl = await uploadFile(occFile);
    const res = await addEmployeeOccurrence({
      employeeId: emp.id,
      type: occForm.type,
      date: new Date(occForm.date + 'T12:00:00'),
      description: occForm.description,
      documentUrl
    });
    setSaving(false);
    if (res.success) {
      setShowOccModal(false);
      setOccForm({ type: 'Advertência Verbal', date: '', description: '' });
      setOccFile(null);
      window.location.reload();
    } else {
      alert("Erro: " + res.error);
    }
  };

  const handleUploadFichaEpi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const fileUrl = await uploadFile(file);
    const res = await addEmployeeDocument({
      employeeId: emp.id,
      type: 'Ficha de EPI',
      issueDate: new Date(),
      fileUrl
    });
    setSaving(false);
    if (res.success) {
      window.location.reload();
    } else {
      alert("Erro ao anexar ficha: " + res.error);
    }
  };

  const inputClass = "w-full mt-1 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-rose-500 transition-colors";
  const labelClass = "text-xs font-bold text-slate-500 uppercase";
  
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#162032] w-full max-w-4xl h-full rounded-3xl shadow-2xl flex flex-col animate-in slide-in-from-right overflow-hidden">
        
        {/* Header do Dossiê */}
        <div className="p-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-700 rounded-full shadow-sm hover:bg-slate-100 transition-colors"><X size={20}/></button>
          <div className="flex gap-6 items-center">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-3xl font-black text-slate-500 shadow-inner">
              {emp.name.charAt(0)}
            </div>
            <div>
              <div className="flex gap-2 items-center mb-1">
                <h2 className="text-3xl font-bold">{emp.name}</h2>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {emp.status}
                </span>
              </div>
              <p className="text-slate-500 font-medium">{emp.jobRole?.name || 'Sem cargo definido'} • CPF: {emp.cpf}</p>
            </div>
          </div>
          
          <div className="flex gap-2 mt-8 overflow-x-auto no-scrollbar">
            {['cadastro', 'sst', 'epi', 'ponto', 'ocorrencias'].map(t => (
              <button 
                key={t}
                onClick={() => setTab(t as any)}
                className={`px-4 py-2 text-xs font-black uppercase rounded-lg transition-all ${tab === t ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 border border-rose-200 dark:border-rose-800/50' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                {t === 'sst' ? 'Treinamentos/ASO' : t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-900/20">
          
          {tab === 'cadastro' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-slate-400">Dados Contratuais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Obra Atual</p><p className="font-bold text-blue-600">{emp.projects?.length > 0 ? emp.projects.map((p:any) => p.name).join(', ') : 'Sede'}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Empresa / Empregador</p><p className="font-bold">{emp.company?.name || 'Própria'}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Salário Base</p><p className="font-bold text-emerald-600">{formatter.format(emp.baseSalary || 0)}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase">Admissão</p><p className="font-bold">{emp.admissionDate ? new Date(emp.admissionDate).toLocaleDateString() : '-'}</p></div>
                </div>
              </div>
            </div>
          )}

          {tab === 'sst' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Controle de Validades (ASO / NRs)</h3>
                <button onClick={() => setShowDocModal(true)} className="text-xs font-black bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:text-rose-600 hover:border-rose-300 transition-colors"><Plus size={14}/> Novo ASO/NR</button>
              </div>
              {emp.documents?.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700"><FileText className="mx-auto text-slate-300 mb-2"/>Nenhum documento cadastrado.</div>
              ) : (
                <div className="grid gap-3">
                  {emp.documents?.map((doc:any) => (
                    <div key={doc.id} className="bg-white dark:bg-[#162032] p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <p className="font-bold flex items-center gap-2">{doc.type} <span className={`text-[8px] uppercase px-1.5 py-0.5 rounded ${doc.status==='Válido'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700'}`}>{doc.status}</span></p>
                        <p className="text-[10px] text-slate-500 mt-1">Vence em: {new Date(doc.expirationDate).toLocaleDateString()}</p>
                      </div>
                      {doc.fileUrl ? (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 text-xs font-bold underline hover:text-blue-600 transition-colors">Ver PDF / Anexo</a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Sem anexo</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'epi' && (
             <div className="space-y-6">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Ficha de EPI Eletrônica</h3>
                 <div className="flex gap-2">
                   <label className={`text-xs font-black bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-900 cursor-pointer'}`}>
                     {saving ? 'Enviando...' : <><FileText size={14}/> Anexar Ficha Geral</>}
                     <input type="file" className="hidden" onChange={handleUploadFichaEpi} disabled={saving} />
                   </label>
                   <button onClick={() => setShowEpiModal(true)} className="text-xs font-black bg-rose-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-rose-700 transition-colors"><Plus size={14}/> Entregar EPI</button>
                 </div>
               </div>
               <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                     <tr>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Equipamento</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">C.A.</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400">Data Entrega</th>
                       <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center">Devolvido?</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                     {emp.epis?.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-500">Nenhum EPI registrado.</td></tr> : emp.epis?.map((epi:any) => (
                       <tr key={epi.id}>
                         <td className="p-4 font-bold">{epi.equipmentName}</td>
                         <td className="p-4 text-slate-500">{epi.caNumber || '-'}</td>
                         <td className="p-4">{new Date(epi.deliveryDate).toLocaleDateString()}</td>
                         <td className="p-4 text-center">{epi.returned ? '✅' : 'Pendente'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {/* Fichas Gerais de EPI Anexadas */}
               <div className="mt-6">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                   <FileText size={14} className="text-slate-400"/> Fichas Assinadas (Repositório)
                 </h4>
                 {emp.documents?.filter((d:any) => d.type === 'Ficha de EPI').length === 0 ? (
                   <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">Nenhuma ficha geral anexada.</div>
                 ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                     {emp.documents?.filter((d:any) => d.type === 'Ficha de EPI').map((doc:any) => (
                       <div key={doc.id} className="bg-white dark:bg-[#162032] p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                         <div>
                           <p className="font-bold text-xs">Ficha Geral de EPI</p>
                           <p className="text-[10px] text-slate-500">Adicionado em: {new Date(doc.createdAt).toLocaleDateString()}</p>
                         </div>
                         {doc.fileUrl && (
                           <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                             <FileText size={14}/>
                           </a>
                         )}
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
          )}

          {tab === 'ponto' && (
             <div className="space-y-6">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Histórico de Presença</h3>
                 <button onClick={() => setShowPontoModal(true)} className="text-xs font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700 transition-colors"><Plus size={14}/> Lançar Falta/Atestado</button>
               </div>
               {emp.attendances?.length === 0 ? <p className="text-sm text-slate-500">Nenhum lançamento no histórico.</p> : (
                 <div className="space-y-3">
                   {emp.attendances?.map((att:any) => (
                     <div key={att.id} className="bg-white dark:bg-[#162032] p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                       <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${att.status.includes('Falta') ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}><Calendar size={18}/></div>
                         <div>
                           <p className="font-bold">{new Date(att.date).toLocaleDateString()} — {att.status}</p>
                           {att.observations && <p className="text-[10px] text-slate-500">{att.observations}</p>}
                           {att.certificateUrl && <a href={att.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1"><FileText size={10}/> Ver Comprovante</a>}
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black uppercase text-slate-400">Horas Extras</p>
                         <p className="font-bold">{att.overtimeHours}h</p>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}

          {tab === 'ocorrencias' && (
             <div className="space-y-6">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Gestão Disciplinar</h3>
                 <button onClick={() => setShowOccModal(true)} className="text-xs font-black bg-slate-800 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-900 transition-colors"><AlertTriangle size={14}/> Nova Ocorrência</button>
               </div>
               {emp.occurrences?.length === 0 ? <p className="text-sm text-slate-500">Nenhuma ocorrência disciplinar.</p> : (
                 <div className="space-y-3">
                   {emp.occurrences?.map((occ:any) => (
                     <div key={occ.id} className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-200 dark:border-red-900/30">
                       <p className="text-[10px] font-black text-red-600 uppercase mb-1">{occ.type} • {new Date(occ.date).toLocaleDateString()}</p>
                       <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{occ.description}</p>
                       {occ.documentUrl && (
                         <div className="mt-2">
                           <a href={occ.documentUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-red-500 font-bold hover:underline flex items-center gap-1 w-fit"><FileText size={12}/> Documento Assinado</a>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}

        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Novo ASO/NR                                           */}
      {/* ============================================================ */}
      {showDocModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">Novo ASO / NR</h2>
              <button onClick={() => setShowDocModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="docForm" onSubmit={handleAddDoc} className="space-y-4">
                <div>
                  <label className={labelClass}>Tipo de Documento</label>
                  <select required value={docForm.type} onChange={e => setDocForm({...docForm, type: e.target.value})} className={inputClass}>
                    <option>ASO Admissional</option>
                    <option>ASO Periódico</option>
                    <option>ASO Demissional</option>
                    <option>ASO Retorno ao Trabalho</option>
                    <option>NR-6 (EPI)</option>
                    <option>NR-10 (Eletricidade)</option>
                    <option>NR-12 (Máquinas)</option>
                    <option>NR-18 (Construção)</option>
                    <option>NR-33 (Espaço Confinado)</option>
                    <option>NR-35 (Altura)</option>
                    <option>CIPA</option>
                    <option>Integração de Segurança</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Data de Validade</label>
                  <input type="date" required value={docForm.expirationDate} onChange={e => setDocForm({...docForm, expirationDate: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Arquivo (Opcional)</label>
                  <input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} className={inputClass} />
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowDocModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl">Cancelar</button>
              <button form="docForm" type="submit" disabled={saving} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-rose-500/30 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar Documento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Entregar EPI                                          */}
      {/* ============================================================ */}
      {showEpiModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">Entregar EPI</h2>
              <button onClick={() => setShowEpiModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="epiForm" onSubmit={handleAddEpi} className="space-y-4">
                <div>
                  <label className={labelClass}>Nome do Equipamento</label>
                  <input required placeholder="Ex: Capacete, Luva, Bota..." value={epiForm.equipmentName} onChange={e => setEpiForm({...epiForm, equipmentName: e.target.value})} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nº do C.A.</label>
                    <input placeholder="CA-12345" value={epiForm.caNumber} onChange={e => setEpiForm({...epiForm, caNumber: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Próxima Troca</label>
                    <input type="date" value={epiForm.replacementDate} onChange={e => setEpiForm({...epiForm, replacementDate: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowEpiModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl">Cancelar</button>
              <button form="epiForm" type="submit" disabled={saving} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-rose-500/30 disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar Entrega'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Lançar Falta / Atestado                               */}
      {/* ============================================================ */}
      {showPontoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">Lançar Falta / Atestado</h2>
              <button onClick={() => setShowPontoModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="pontoForm" onSubmit={handleAddPonto} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" required value={pontoForm.date} onChange={e => setPontoForm({...pontoForm, date: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tipo</label>
                    <select required value={pontoForm.status} onChange={e => setPontoForm({...pontoForm, status: e.target.value})} className={inputClass}>
                      <option>Presente</option>
                      <option>Falta Injustificada</option>
                      <option>Falta Justificada</option>
                      <option>Atestado Médico</option>
                      <option>Férias</option>
                      <option>Folga</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Horas Trabalhadas</label>
                    <input type="number" step="0.5" min="0" max="24" value={pontoForm.hoursWorked} onChange={e => setPontoForm({...pontoForm, hoursWorked: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Horas Extras</label>
                    <input type="number" step="0.5" min="0" max="12" value={pontoForm.overtimeHours} onChange={e => setPontoForm({...pontoForm, overtimeHours: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Observações</label>
                  <textarea placeholder="Motivo da falta, nº do atestado..." value={pontoForm.observations} onChange={e => setPontoForm({...pontoForm, observations: e.target.value})} className={inputClass + " min-h-[80px] resize-none"} />
                </div>
                <div>
                  <label className={labelClass}>Atestado / Comprovante (Opcional)</label>
                  <input type="file" onChange={e => setPontoFile(e.target.files?.[0] || null)} className={inputClass} />
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowPontoModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl">Cancelar</button>
              <button form="pontoForm" type="submit" disabled={saving} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase shadow-lg shadow-blue-500/30 disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar Lançamento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: Nova Ocorrência                                       */}
      {/* ============================================================ */}
      {showOccModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#162032] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
              <h2 className="text-lg font-bold">Nova Ocorrência Disciplinar</h2>
              <button onClick={() => setShowOccModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><X size={18}/></button>
            </div>
            <div className="p-6">
              <form id="occForm" onSubmit={handleAddOcc} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Tipo</label>
                    <select required value={occForm.type} onChange={e => setOccForm({...occForm, type: e.target.value})} className={inputClass}>
                      <option>Advertência Verbal</option>
                      <option>Advertência Escrita</option>
                      <option>Suspensão (1 dia)</option>
                      <option>Suspensão (3 dias)</option>
                      <option>Suspensão (5 dias)</option>
                      <option>Elogio</option>
                      <option>Acidente de Trabalho</option>
                      <option>Incidente</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Data</label>
                    <input type="date" required value={occForm.date} onChange={e => setOccForm({...occForm, date: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Descrição / Motivo</label>
                  <textarea required placeholder="Descreva o ocorrido em detalhes..." value={occForm.description} onChange={e => setOccForm({...occForm, description: e.target.value})} className={inputClass + " min-h-[100px] resize-none"} />
                </div>
                <div>
                  <label className={labelClass}>Documento Assinado (Opcional)</label>
                  <input type="file" onChange={e => setOccFile(e.target.files?.[0] || null)} className={inputClass} />
                </div>
              </form>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowOccModal(false)} className="flex-1 py-3 text-slate-500 font-bold bg-slate-200 dark:bg-slate-700 rounded-xl">Cancelar</button>
              <button form="occForm" type="submit" disabled={saving} className="flex-1 py-3 bg-slate-800 text-white rounded-xl font-bold uppercase shadow-lg disabled:opacity-50">{saving ? 'Salvando...' : 'Registrar Ocorrência'}</button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

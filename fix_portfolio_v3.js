// 1. CONTEÚDO DO COMPONENTE: DASHBOARD GLOBAL
const globalDashboardContent = `"use client";
import React from 'react';
import { Building2, Users, TrendingUp, AlertTriangle, MapPin, ArrowRight, DollarSign, Activity, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';

export default function GlobalDashboard() {
  // DADOS MOCKADOS DA EMPRESA
  const kpis = {
      obras_ativas: 3,
      faturamento_total: "R$ 15.2M",
      efetivo_total: 145,
      alertas_criticos: 2
  };

  const obras = [
      { 
        id: 1, 
        nome: "Residencial Aurora", 
        local: "Zona Sul, SP", 
        tipo: "Residencial", 
        status: "Em Andamento", 
        progresso: 42, 
        orcamento: "R$ 1.2M", 
        gasto: "R$ 452k", 
        prazo: "Nov/25", 
        saude: "bom", 
        cor: "bg-emerald-500", 
        img_gradient: "from-emerald-600 to-teal-500" 
      },
      { 
        id: 2, 
        nome: "Galpão Logístico Way", 
        local: "Barueri, SP", 
        tipo: "Industrial", 
        status: "Fundação", 
        progresso: 15, 
        orcamento: "R$ 850k", 
        gasto: "R$ 120k", 
        prazo: "Ago/25", 
        saude: "atencao", 
        cor: "bg-yellow-500", 
        img_gradient: "from-blue-600 to-indigo-600" 
      },
      { 
        id: 3, 
        nome: "Reforma Hospital Central", 
        local: "Centro, SP", 
        tipo: "Hospitalar", 
        status: "Acabamento", 
        progresso: 88, 
        orcamento: "R$ 3.5M", 
        gasto: "R$ 3.1M", 
        prazo: "Dez/24", 
        saude: "critico", 
        cor: "bg-red-500", 
        img_gradient: "from-slate-700 to-slate-900" 
      }
  ];

  const financeiro_global = [
      { mes: 'Jul', receita: 300, despesa: 250 },
      { mes: 'Ago', receita: 400, despesa: 320 },
      { mes: 'Set', receita: 450, despesa: 380 },
      { mes: 'Out', receita: 500, despesa: 420 },
      { mes: 'Nov', receita: 480, despesa: 200 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
        
        {/* HEADER CORPORATIVO */}
        <header className="h-20 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">W</div>
                <div>
                    <h1 className="text-xl font-bold leading-none tracking-tight">ObraSys <span className="text-emerald-500">Enterprise</span></h1>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">Painel Corporativo</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
                <div className="hidden md:flex gap-4 text-sm font-medium text-slate-500">
                    <span className="hover:text-emerald-500 cursor-pointer">Financeiro Global</span>
                    <span className="hover:text-emerald-500 cursor-pointer">Suprimentos</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold leading-none">Bruno Amorim</p>
                        <p className="text-[10px] text-slate-500 uppercase">Diretor</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-600 shadow-sm">BA</div>
                </div>
            </div>
        </header>

        <div className="max-w-[1600px] mx-auto p-8">
            
            {/* KPIS GLOBAIS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:border-blue-500 transition-all">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform"><Building2 size={28}/></div>
                    <div><h3 className="text-3xl font-bold tracking-tight">{kpis.obras_ativas}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Obras Ativas</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:border-emerald-500 transition-all">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform"><DollarSign size={28}/></div>
                    <div><h3 className="text-3xl font-bold tracking-tight">{kpis.faturamento_total}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Carteira Total</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:border-purple-500 transition-all">
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-600 group-hover:scale-110 transition-transform"><Users size={28}/></div>
                    <div><h3 className="text-3xl font-bold tracking-tight">{kpis.efetivo_total}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Colaboradores</p></div>
                </div>
                <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4 group hover:border-red-500 transition-all">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 group-hover:scale-110 transition-transform"><AlertTriangle size={28}/></div>
                    <div><h3 className="text-3xl font-bold tracking-tight">{kpis.alertas_criticos}</h3><p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Alertas Críticos</p></div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8">
                
                {/* COLUNA 1: LISTA DE OBRAS (PORTFÓLIO) */}
                <div className="flex-1">
                    <div className="flex justify-between items-end mb-6">
                        <h2 className="text-2xl font-bold flex items-center gap-3"><LayoutGrid className="text-slate-400"/> Portfólio de Projetos</h2>
                        <button className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">Ver Mapa <ArrowRight size={14}/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-5">
                        {obras.map((obra) => (
                            <Link href={\`/projeto/\${obra.id}\`} key={obra.id} className="block group relative">
                                <div className="bg-white dark:bg-[#162032] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-400 transition-all overflow-hidden flex flex-col md:flex-row">
                                    
                                    {/* Imagem/Capa da Obra */}
                                    <div className={\`h-32 md:h-auto md:w-48 bg-gradient-to-br \${obra.img_gradient} flex flex-col items-center justify-center text-white p-4 relative\`}>
                                        <Building2 size={40} className="mb-2 opacity-80"/>
                                        <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded uppercase tracking-wider backdrop-blur-sm">{obra.tipo}</span>
                                        {/* Badge de Saúde */}
                                        <div className={\`absolute top-3 left-3 w-3 h-3 rounded-full \${obra.saude === 'bom' ? 'bg-green-400' : obra.saude === 'atencao' ? 'bg-yellow-400' : 'bg-red-500'} ring-2 ring-white/50\`}></div>
                                    </div>
                                    
                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-bold text-xl text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors mb-1">{obra.nome}</h3>
                                                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={14}/> {obra.local}</p>
                                            </div>
                                            <span className={\`px-3 py-1 rounded-full text-xs font-bold uppercase \${obra.saude === 'critico' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}\`}>
                                                {obra.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 mb-4 text-sm">
                                            <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Orçamento</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.orcamento}</p></div>
                                            <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Gasto Real</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.gasto}</p></div>
                                            <div><p className="text-xs text-slate-400 uppercase font-bold mb-1">Entrega</p><p className="font-bold text-slate-700 dark:text-slate-300">{obra.prazo}</p></div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-xs mb-1 font-bold text-slate-500"><span>Físico</span><span>{obra.progresso}%</span></div>
                                                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div className={\`h-full rounded-full \${obra.cor}\`} style={{width: \`\${obra.progresso}%\`}}></div>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                <ArrowRight size={20}/>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* COLUNA 2: GRÁFICOS GLOBAIS */}
                <div className="w-full xl:w-[400px] space-y-8">
                    <div className="bg-white dark:bg-[#162032] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-sm uppercase text-slate-500 mb-6 flex items-center gap-2"><Activity size={16}/> Fluxo de Caixa (Consolidado)</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financeiro_global}>
                                    <defs>
                                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155"/>
                                    <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false}/>
                                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff'}} itemStyle={{fontSize: '12px'}}/>
                                    <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                                    <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={3} fill="transparent" strokeDasharray="5 5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
\`;

// 3. CONFIGURAÇÃO DE ROTA (PAGE.TSX DA RAIZ)
const rootPageContent = \`import GlobalDashboard from '../components/modules/GlobalDashboard';

export default function Home() {
  return <GlobalDashboard />;
}
\`;

try {
    // Garantir diretórios
    const moduleDir = path.join('components', 'modules');
    if (!fs.existsSync(moduleDir)) fs.mkdirSync(moduleDir, { recursive: true });

    // Salvar componente
    fs.writeFileSync(path.join('components', 'modules', 'GlobalDashboard.tsx'), globalDashboardContent);
    
    // Atualizar rota raiz
    fs.writeFileSync(path.join('app', 'page.tsx'), rootPageContent);

    console.log("✅ Dashboard Global Instalado sem erros!");
} catch (err) {
    console.error("❌ Erro ao escrever arquivos:", err);
}`;

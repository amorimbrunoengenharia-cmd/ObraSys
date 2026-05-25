"use client";
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Tag, DollarSign, Download, Printer, FileText, Truck } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function SuppliesAnalytics({ requests, suppliers, project }: any) {
    const handlePrint = () => {
        window.print();
    };
    // 1. Processamento de dados por Categoria
    const dataByCategory = useMemo(() => {
        const categories: Record<string, number> = {};
        requests.forEach((req: any) => {
            if (req.status === 'APROVADO' || req.status === 'ENTREGUE') {
                const cat = req.dreCategory || 'Outros';
                categories[cat] = (categories[cat] || 0) + (req.estimatedCost || 0);
            }
        });
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [requests]);

    // 2. Top 5 Fornecedores
    const dataBySupplier = useMemo(() => {
        const sups: Record<string, number> = {};
        requests.forEach((req: any) => {
            if (req.status === 'APROVADO' || req.status === 'ENTREGUE') {
                const sName = req.supplier?.name || req.quotations?.find((q: any) => q.isWinner)?.supplierName || 'Diversos';
                sups[sName] = (sups[sName] || 0) + (req.estimatedCost || 0);
            }
        });
        return Object.entries(sups)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    }, [requests]);

    const totalSpent = dataByCategory.reduce((acc, curr) => acc + curr.value, 0);
    const totalAberto = requests.filter((r: any) => r.status === 'PENDENTE' || r.status === 'EM_COTACAO').reduce((acc: any, curr: any) => acc + (curr.estimatedCost || 0), 0);
    const economia = requests.reduce((acc: any, req: any) => {
        if ((req.status === 'APROVADO' || req.status === 'ENTREGUE') && req.quotations?.length > 1) {
            const prices = req.quotations.map((q: any) => q.totalPrice);
            const maxPrice = Math.max(...prices);
            const winPrice = req.quotations.find((q: any) => q.isWinner)?.totalPrice || req.estimatedCost;
            return acc + (maxPrice - winPrice);
        }
        return acc;
    }, 0);

    const pendingDelivery = requests.filter((r: any) => r.status === 'APROVADO');

    return (
        <div className="space-y-6">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .printable-area, .printable-area * { visibility: visible; }
                    .printable-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        padding: 40px;
                        background: white !important;
                        color: black !important;
                    }
                    .no-print { display: none !important; }
                    .page-break { page-break-before: always; }
                }
            `}</style>

            <div className="flex justify-end no-print">
                <button 
                    onClick={handlePrint}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Printer size={16}/> Gerar Relatório Executivo (PDF)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-500 printable-area">
                
                {/* CABEÇALHO DE IMPRESSÃO (Visível apenas no print) */}
                <div className="lg:col-span-2 hidden print:flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Relatório Executivo de Suprimentos</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Obra: {project?.name || 'Projeto ObraSys'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Data de Emissão</p>
                        <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    </div>
                </div>

                {/* RESUMO EXECUTIVO (Apenas no Print) */}
                <div className="lg:col-span-2 hidden print:grid grid-cols-3 gap-6 mb-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Comprado</p>
                        <p className="text-2xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total em Aberto</p>
                        <p className="text-2xl font-black text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAberto)}</p>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-200">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Economia Gerada</p>
                        <p className="text-2xl font-black text-emerald-700">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(economia)}</p>
                    </div>
                </div>
            {/* GRÁFICO DE CATEGORIAS */}
            <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                        <Tag size={20}/>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Distribuição por Categoria</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Investimento acumulado por classe de insumo</p>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={dataByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {dataByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TOP FORNECEDORES */}
            <div className="bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                        <Users size={20}/>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Top 5 Fornecedores</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Maiores volumes financeiros contratados</p>
                    </div>
                </div>

                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataBySupplier} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#33415520" />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }}
                                width={100}
                            />
                            <Tooltip 
                                formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                cursor={{ fill: '#33415510' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* TABELA DE DETALHAMENTO */}
            <div className="lg:col-span-2 bg-white dark:bg-[#162032] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-lg">
                            <TrendingUp size={20}/>
                        </div>
                        <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest">Detalhamento Financeiro</h3>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Total Geral</p>
                        <p className="text-lg font-black text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {dataByCategory.map((cat, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <p className="text-[9px] font-black text-slate-400 uppercase truncate mb-1">{cat.name}</p>
                            <p className="text-sm font-black text-slate-700 dark:text-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.value)}</p>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden no-print">
                                <div 
                                    className="h-full bg-emerald-500" 
                                    style={{ width: `${(cat.value / totalSpent) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* LISTA DE PENDENTES (Apenas no Print) */}
            <div className="lg:col-span-2 hidden print:block mt-8 page-break">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <Truck size={20}/>
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Aguardando Entrega</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Materiais comprados com entrega pendente</p>
                    </div>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <th className="p-4 text-left border border-slate-200">Código</th>
                            <th className="p-4 text-left border border-slate-200">Material</th>
                            <th className="p-4 text-left border border-slate-200">Fornecedor</th>
                            <th className="p-4 text-right border border-slate-200">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingDelivery.map((p: any) => (
                            <tr key={p.id} className="text-xs font-bold text-slate-700">
                                <td className="p-4 border border-slate-200">{p.requestCode}</td>
                                <td className="p-4 border border-slate-200">{p.material?.name}</td>
                                <td className="p-4 border border-slate-200">{p.supplierName || 'Diversos'}</td>
                                <td className="p-4 text-right border border-slate-200">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.estimatedCost)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
        </div>
    );
}

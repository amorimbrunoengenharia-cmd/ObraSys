"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useRouter } from 'next/navigation';
import { canAccessPage } from '../../lib/permissions';
import { getFinancialRecords, getProjectsList } from '../actions/finance';
import { getExcelDump } from '../actions/excel';
import { wipeAndResetFinance, cleanupResidualData } from '../actions/cleanup';
import { importFromBaseFinanceira } from '../actions/financials';
import { debugFileAccess } from '../actions/debug';

export default function AnalisePage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [message, setMessage] = useState('');
    const [debug, setDebug] = useState<any>(null);

    async function runAnalysis() {
        setLoading(true);
        try {
            const records = await getFinancialRecords();
            const projects = await getProjectsList();
            
            const duplicates: any = {};
            records.forEach((r: any) => {
                const key = `${r.descricao}-${r.valorBruto}-${r.dataVencimento}`;
                if (!duplicates[key]) duplicates[key] = [];
                duplicates[key].push(r);
            });

            const topDuplicated = Object.entries(duplicates)
                .filter(([_, list]: any) => list.length > 1)
                .sort((a: any, b: any) => b[1].length - a[1].length)
                .slice(0, 10);

            const totalBruto = records.reduce((acc: number, r: any) => acc + (Number(r.valorBruto) || 0), 0);
            const totalBudget = projects.reduce((acc: number, p: any) => acc + (Number(p.budget) || 0), 0);
            const totalSpent = projects.reduce((acc: number, p: any) => acc + (Number(p.spent) || 0), 0);
            
            const topRecords = [...records].sort((a: any, b: any) => (Number(b.valorBruto) || 0) - (Number(a.valorBruto) || 0)).slice(0, 10);
            const excelDump = await getExcelDump();

            // Serialização forçada para evitar erro de hidratação (Next.js Server Actions)
            const rawReport = {
                totalRecords: records.length,
                totalBruto,
                totalBudget,
                totalSpent,
                topDuplicated,
                topRecords,
                projectsCount: projects.length,
                projects,
                excelDump: excelDump.data || []
            };

            setReport(JSON.parse(JSON.stringify(rawReport)));
            
            const debugInfo = await debugFileAccess();
            setDebug(JSON.parse(JSON.stringify(debugInfo)));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login');
            return;
        }
        if (user && !canAccessPage(user.role, 'analise')) {
            router.push('/');
            return;
        }
        if (user) runAnalysis();
    }, [user, isAuthLoading, router]);

    const handleResetAndImport = async () => {
        if (!confirm("Isso apagará TODOS os lançamentos atuais e reimportará da planilha. Continuar?")) return;
        setExecuting(true);
        setMessage('Limpando base...');
        
        try {
            const resClean = await wipeAndResetFinance();
            if (!resClean.success) {
                alert("Erro na limpeza: " + resClean.error);
                setExecuting(false);
                return;
            }

            setMessage('Importando aba BASE FINANCEIRA...');
            const resImport = await importFromBaseFinanceira();
            
            if (resImport.success) {
                setMessage(`Sucesso! ${resImport.imported} registros importados.`);
                await runAnalysis();
            } else {
                alert("Erro na importação: " + resImport.error);
            }
        } catch (e: any) {
            alert("Erro inesperado: " + e.message);
        }
        
        setExecuting(false);
    };

    const handleResidualCleanup = async () => {
        if (!confirm("Isso removerá linhas de totais e registros inválidos. Continuar?")) return;
        setExecuting(true);
        const res = await cleanupResidualData();
        if (res.success) {
            alert(`Sucesso! ${res.deleted} registros removidos.`);
            await runAnalysis();
        } else {
            alert("Erro: " + res.error);
        }
        setExecuting(false);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Analisando base de dados...</p>
            </div>
        </div>
    );

    return (
        <div className="p-10 font-sans bg-slate-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Relatório de Análise Financeira</h1>
                    <p className="text-slate-500 text-sm">Controle de integridade e importação de dados</p>
                </div>
                <button 
                    onClick={handleResetAndImport}
                    disabled={executing}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {executing ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Processando...
                        </>
                    ) : (
                        '🔥 Limpar Base e Reimportar Planilha'
                    )}
                </button>
                <button 
                    onClick={handleResidualCleanup}
                    disabled={executing}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                >
                    🧹 Limpeza de Resíduos
                </button>
            </div>
            
            {message && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-bold animate-pulse shadow-sm">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Total de Registros</p>
                    <p className="text-3xl font-bold text-slate-800">{report?.totalRecords || 0}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Soma Valor Bruto</p>
                    <p className="text-3xl font-bold text-slate-800">R$ {report?.totalBruto?.toLocaleString('pt-BR') || 0}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-blue-500">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1 text-blue-600">Soma Orçamentos</p>
                    <p className="text-3xl font-bold text-blue-800">R$ {report?.totalBudget?.toLocaleString('pt-BR') || 0}</p>
                </div>
                <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
                    <p className="text-xs text-slate-400 uppercase font-bold mb-1 text-orange-600">Soma Gastos</p>
                    <p className="text-3xl font-bold text-orange-800">R$ {report?.totalSpent?.toLocaleString('pt-BR') || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Maiores Lançamentos</h2>
                    <div className="space-y-2">
                        {report?.topRecords?.map((r: any, i: number) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center border border-slate-100 hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-medium text-slate-700">{r.descricao}</span>
                                <span className="font-bold text-slate-900">R$ {r.valorBruto.toLocaleString('pt-BR')}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-4 text-slate-800">Possíveis Duplicatas</h2>
                    <div className="space-y-2">
                        {report?.topDuplicated?.length > 0 ? report.topDuplicated.map(([key, list]: any, i: number) => (
                            <div key={i} className="p-3 bg-red-50 rounded-lg border border-red-100 flex justify-between items-center">
                                <span className="text-sm font-medium text-red-700">{key.split('-')[0]}</span>
                                <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-1 rounded">{list.length}x</span>
                            </div>
                        )) : (
                            <p className="text-slate-400 italic text-sm">Nenhuma duplicata encontrada.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-10">
                <h2 className="text-xl font-bold mb-4 text-slate-800">Detalhes por Projeto</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {report?.projects?.map((p: any, i: number) => (
                        <div key={i} className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:shadow-md transition-shadow">
                            <p className="font-bold text-lg text-slate-800">{p.name}</p>
                            <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Orçamento</p>
                                    <p className="font-bold text-blue-600">R$ {p.budget.toLocaleString('pt-BR')}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 font-bold uppercase text-[10px]">Gasto Real</p>
                                    <p className="font-bold text-orange-600">R$ {p.spent.toLocaleString('pt-BR')}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {debug && (
                <div className="mb-10 p-6 bg-slate-900 text-slate-300 rounded-2xl font-mono text-xs shadow-xl">
                    <p className="font-bold text-emerald-400 mb-2 border-b border-slate-700 pb-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        DEBUG_FILE_SYSTEM
                    </p>
                    <pre className="overflow-x-auto">{JSON.stringify(debug, null, 2)}</pre>
                </div>
            )}

            <h2 className="text-xl font-bold mb-4 text-slate-800">Dados Brutos da Planilha (Amostra)</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200">
                            <tr>
                                {report?.excelDump?.[0] && Object.keys(report.excelDump[0]).map(k => (
                                    <th key={k} className="p-3 border-r border-slate-200 font-bold text-slate-600 uppercase tracking-wider">{k}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {report?.excelDump?.slice(0, 50).map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    {Object.values(row).map((v: any, j: number) => (
                                        <td key={j} className="p-3 border-r border-slate-100 truncate max-w-[200px] text-slate-600">{JSON.stringify(v)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

"use client";
import React from 'react';
import { FileText, Building2, UserCheck, Scale, MapPin, Calendar, Clock } from 'lucide-react';

interface MeasurementPDFProps {
    project: any;
    contract: any;
    measurement: any;
}

export default function MeasurementPDF({ project, contract, measurement }: MeasurementPDFProps) {
    if (!measurement || !contract) return null;

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

    // Cálculo de percentuais
    const getProgressInfo = (item: any) => {
        const total = item.total || 0;
        const medidoAnterior = (item.medido || 0) - (measurement.bruto_item_relativo || 0); // Aproximação se não tivermos histórico detalhado por item no objeto
        const medidoAtual = measurement.bruto_item_relativo || 0; // Idealmente o BM teria o detalhamento por item
        
        return {
            anteriorPct: ((medidoAnterior / total) * 100).toFixed(1),
            atualPct: ((medidoAtual / total) * 100).toFixed(1),
            totalPct: (((medidoAnterior + medidoAtual) / total) * 100).toFixed(1)
        };
    };

    return (
        <div id="printable-area" className="hidden print:block bg-white text-slate-900 w-[210mm] min-h-[297mm] p-12 mx-auto font-sans" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
            
            {/* CABEÇALHO */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 p-3 rounded-lg">
                        <Building2 className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter">ObraSys</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tecnologia & Gestão de Engenharia</p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-black text-slate-800">Boletim de Medição</h2>
                    <p className="text-sm font-bold text-blue-600">Nº {measurement.ref}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Data de Emissão: {measurement.data}</p>
                </div>
            </div>

            {/* INFO GERAL */}
            <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="space-y-4">
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Projeto / Obra</span>
                        <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-slate-400"/>
                            <p className="text-sm font-bold text-slate-800">{project.nome}</p>
                        </div>
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contratante</span>
                        <p className="text-sm font-bold text-slate-800">Way Service Engenharia Ltda</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contratada (Fornecedor)</span>
                        <div className="flex items-center gap-2">
                            <UserCheck size={14} className="text-slate-400"/>
                            <p className="text-sm font-bold text-slate-800">{contract.empresa}</p>
                        </div>
                    </div>
                    <div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Objeto do Contrato</span>
                        <p className="text-sm font-bold text-slate-800">{contract.servico} (Ref: {contract.id})</p>
                    </div>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-blue-500"/>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Período de Medição</p>
                        <p className="text-sm font-black text-slate-800">{measurement.periodo}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Status do Documento</p>
                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">{measurement.status}</span>
                </div>
            </div>

            {/* TABELA DE ITENS */}
            <div className="mb-10">
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="p-3 font-black uppercase">Item / Descrição</th>
                            <th className="p-3 text-center font-black uppercase">Unid.</th>
                            <th className="p-3 text-right font-black uppercase">Qtd Total</th>
                            <th className="p-3 text-right font-black uppercase">P. Unitário</th>
                            <th className="p-3 text-right font-black uppercase">% Período</th>
                            <th className="p-3 text-right font-black uppercase">Vlr. Período</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {(contract.items || []).map((it: any) => (
                            <tr key={it.id} className="hover:bg-slate-50">
                                <td className="p-3">
                                    <p className="font-bold text-slate-800">{it.desc}</p>
                                    <p className="text-[9px] text-slate-400 mt-0.5">WBS: {it.task?.wbs || '---'}</p>
                                </td>
                                <td className="p-3 text-center uppercase font-bold text-slate-500">{it.unidade}</td>
                                <td className="p-3 text-right font-bold text-slate-800">{it.qtd}</td>
                                <td className="p-3 text-right text-slate-600">{formatter.format(it.unitario)}</td>
                                <td className="p-3 text-right font-bold text-slate-500">
                                    {((measurement.bruto / (contract.items?.length || 1)) / (it.total || 1) * 100).toFixed(1)}%
                                </td>
                                <td className="p-3 text-right font-black text-slate-900">
                                    {formatter.format(measurement.bruto / (contract.items?.length || 1))} 
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* RESUMO FINANCEIRO */}
            <div className="flex justify-end mb-12">
                <div className="w-80 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-500">Valor Bruto Medido</span>
                        <span className="font-black text-slate-800">{formatter.format(measurement.bruto)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-red-500">
                        <span className="font-bold">Caução Retida ({contract.retencao}%)</span>
                        <span className="font-black">-{formatter.format(measurement.retencao)}</span>
                    </div>
                    {measurement.iss > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-500 border-t border-dashed pt-2">
                            <span>ISS ({measurement.iss}%)</span>
                            <span>-{formatter.format(measurement.bruto * (measurement.iss/100))}</span>
                        </div>
                    )}
                    {measurement.inss > 0 && (
                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>INSS ({measurement.inss}%)</span>
                            <span>-{formatter.format(measurement.bruto * (measurement.inss/100))}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl mt-4">
                        <span className="text-xs font-black uppercase tracking-widest">Valor Líquido</span>
                        <span className="text-xl font-black">{formatter.format(measurement.liquido)}</span>
                    </div>
                </div>
            </div>

            {/* ASSINATURAS */}
            <div className="grid grid-cols-2 gap-16 mt-20 pt-10 border-t border-slate-100">
                <div className="text-center space-y-2">
                    <div className="h-px bg-slate-300 w-full mb-4"></div>
                    <p className="text-xs font-black text-slate-800 uppercase">Engenheiro Responsável</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Way Service Engenharia</p>
                </div>
                <div className="text-center space-y-2">
                    <div className="h-px bg-slate-300 w-full mb-4"></div>
                    <p className="text-xs font-black text-slate-800 uppercase">Aprovação do Cliente</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{contract.empresa}</p>
                </div>
            </div>

            {/* RELATÓRIO FOTOGRÁFICO PLACEHOLDER */}
            <div className="mt-32 page-break-before">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 border-b pb-2">Anexo: Relatório Fotográfico do Período</h3>
                <div className="grid grid-cols-2 gap-4 h-96">
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                        <p className="text-[10px] font-black uppercase">Fotos do RDO serão anexadas aqui</p>
                    </div>
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300">
                        <p className="text-[10px] font-black uppercase">Fotos do RDO serão anexadas aqui</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .page-break-before {
                        page-break-before: always;
                    }
                }
            `}</style>

        </div>
    );
}

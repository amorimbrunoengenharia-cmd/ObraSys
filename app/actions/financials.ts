"use server";
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import * as xlsx from 'xlsx';
import { triggerObsidianSync } from './obsidian';
import path from 'path';
import fs from 'fs';

// --- FUNÇÕES DE TRATAMENTO RIGOROSO (REQUISITOS DO USUÁRIO) ---

function parseCurrencyPtBR(value: any): number {
    if (value === undefined || value === null || value === "") return 0;
    if (typeof value === 'number') return value;

    let str = String(value).trim();
    str = str.replace(/R\$\s?/g, "");
    str = str.replace(/\./g, "");
    str = str.replace(/,/g, ".");
    
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

function parseDateRobust(value: any): Date | null {
    if (!value) return null;
    
    if (typeof value === 'number') {
        // Excel serial date (dias desde 30/12/1899)
        const date = new Date((value - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    
    if (typeof value === 'string') {
        if (value.includes('/')) {
            const parts = value.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }
        }
    }
    
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// --- IMPORTAÇÃO PRINCIPAL ---

export async function importFromBaseFinanceira() {
    try {
        const filePath = path.join(process.cwd(), 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
        
        if (!fs.existsSync(filePath)) {
            return { success: false, error: "Arquivo não encontrado em: " + filePath };
        }

        const buffer = fs.readFileSync(filePath);
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(n => n.trim().toUpperCase() === 'BASE FINANCEIRA');
        
        if (!sheetName) {
            return { success: false, error: "Aba 'BASE FINANCEIRA' não encontrada." };
        }

        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(sheet);
        
        let imported = 0;
        let skipped = 0;

        for (const row of rows) {
            // --- MAPEAMENTO EXATO BASEADO NA ANÁLISE ---
            const rawDesc = row["DESCRIÇÃO"] || "";
            const rawValorLiquido = row["VALOR LÍQUIDO RECEBIDO (R$)"] || 0;
            const rawValorBruto = row["VALOR BRUTO (R$)"] || 0;
            const rawCaucao = row["CAUÇÃO RETIDA (R$)"] || 0;
            const rawIss = row["ISS"] || 0;
            const rawInss = row["INSS"] || 0;
            const rawImpostos = row["IMPOSTOS RETIDOS NA FONTE (R$)"] || 0;
            
            const valorLiquido = parseCurrencyPtBR(rawValorLiquido);
            const valorBruto = parseCurrencyPtBR(rawValorBruto);
            const caucaoRetida = parseCurrencyPtBR(rawCaucao);
            const iss = parseCurrencyPtBR(rawIss);
            const inss = parseCurrencyPtBR(rawInss);
            const impostosRetidos = parseCurrencyPtBR(rawImpostos);
            
            // Validação de segurança
            if (valorLiquido > 100000000) {
                skipped++;
                continue;
            }

            const dataCompetencia = parseDateRobust(row["DATA DE COMPETÊNCIA"]);
            const dataVencimento = parseDateRobust(row["DATA DE VENCIMENTO"]);
            const dataPagamento = parseDateRobust(row["DATA DE EFETIVAÇÃO"]);
            const tipo = String(row["TIPO"] || "SAÍDA").toUpperCase().includes("ENTRADA") ? "ENTRADA" : "SAÍDA";
            const status = row["STATUS"] || "A Vencer";
            const centroCusto = row["CENTRO DE CUSTO / OBRA"] || "";
            const clienteForn = row["CLIENTE / FORNECEDOR"] || "";
            const dre = row["CLASSIFICAÇÃO DRE"] || "Outros";
            const cidade = row["CIDADE"] || "";
            const estado = row["ESTADO"] || "";
            const setor = row["SETOR"] || "";

            // Pular linhas vazias ou malformadas (Totais de Planilha)
            const isTotalizer = rawDesc && (
                rawDesc.includes("Total") || 
                rawDesc.includes("TOTAL") || 
                rawDesc === "1" ||
                rawDesc.length < 2
            );

            if (!rawDesc || valorLiquido === 0 || isTotalizer) {
                skipped++;
                continue;
            }

            // Tenta vincular ao projeto
            let projectId: number | null = null;
            if (centroCusto) {
                const project = await prisma.project.findFirst({
                    where: { name: { contains: centroCusto.trim() } }
                });
                if (project) projectId = project.id;
            }

            // Inserção no Banco
            await prisma.financialRecord.create({
                data: {
                    dataCompetencia,
                    dataVencimento,
                    dataEfetivacao: dataPagamento,
                    tipo,
                    status,
                    centroCusto: centroCusto.trim(),
                    cidade: String(cidade).trim(),
                    estado: String(estado).trim(),
                    setor: String(setor).trim(),
                    clienteFornecedor: clienteForn.trim(),
                    descricao: String(rawDesc).trim(),
                    classificacaoDRE: String(dre).trim(),
                    valorBruto,
                    valorLiquido,
                    caucaoRetida,
                    iss,
                    inss,
                    impostosRetidos,
                    projectId
                }
            });

            // Atualiza o spent do projeto se for SAÍDA
            if (tipo === 'SAÍDA' && projectId) {
                await prisma.project.update({
                    where: { id: projectId },
                    data: {
                        spent: { increment: valorLiquido }
                    }
                });
            }

            imported++;
        }

        revalidatePath('/');
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, imported, skipped };

    } catch (error: any) {
        console.error("Erro na importação:", error);
        return { success: false, error: error.message };
    }
}

export async function importFinancialsFromExcel(data: any[]) {
    // Versão legada para compatibilidade com o botão manual
    // Simplesmente redireciona ou implementa lógica similar se necessário
    return { success: true, imported: 0, message: "Use o botão de reimportação automática na página de análise." };
}

/**
 * SCRIPT DE IMPORTAÇÃO DIRETA — BASE FINANCEIRA WayService
 * 
 * Como usar:
 *   1. Coloque a planilha na pasta do projeto (mesma pasta deste script)
 *   2. No terminal: node scripts/import-financials.mjs "NOME_DO_ARQUIVO.xlsx"
 *
 * Exemplo:
 *   node scripts/import-financials.mjs "Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx"
 */

import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const prisma = new PrismaClient();

function parseExcelDate(value) {
    if (!value) return null;
    if (typeof value === 'number') {
        const epoch = new Date(1899, 11, 30);
        return new Date(epoch.getTime() + value * 86400000);
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

function parseCurrency(value) {
    if (!value && value !== 0) return 0;
    const str = String(value).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const num  = parseFloat(str);
    return isNaN(num) ? 0 : num;
}

async function main() {
    const fileName = process.argv[2];
    if (!fileName) {
        console.error('❌ Informe o nome do arquivo Excel. Ex: node scripts/import-financials.mjs "planilha.xlsx"');
        process.exit(1);
    }

    // Busca o arquivo na pasta do projeto
    const projectRoot = path.resolve(__dirname, '..');
    const candidates  = [
        path.join(projectRoot, fileName),
        path.join(projectRoot, 'scripts', fileName),
        path.resolve(fileName)
    ];

    let filePath = null;
    for (const c of candidates) {
        if (fs.existsSync(c)) { filePath = c; break; }
    }

    if (!filePath) {
        console.error(`❌ Arquivo não encontrado. Coloque o .xlsx na pasta do projeto e rode novamente.`);
        console.error(`   Locais tentados:\n${candidates.map(c => '   - ' + c).join('\n')}`);
        process.exit(1);
    }

    console.log(`📂 Lendo: ${filePath}`);
    const wb = XLSX.readFile(filePath);

    // Tenta a aba "BASE FINANCEIRA" primeiro, senão usa a primeira
    const wsName = wb.SheetNames.find(n => n.includes('BASE FINANCEIRA') || n.includes('BASE')) 
                   || wb.SheetNames[0];
    console.log(`📋 Aba selecionada: "${wsName}"`);

    const ws   = wb.Sheets[wsName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });

    console.log(`📊 Total de linhas: ${rows.length}`);
    if (rows.length > 0) {
        console.log('🔑 Colunas detectadas:', Object.keys(rows[0]).join(' | '));
    }

    let imported = 0, updated = 0, skipped = 0, errors = 0;

    for (const row of rows) {
        try {
            const dataCompetencia  = parseExcelDate(row['DATA DE COMPETÊNCIA']  ?? row['DATA COMPETENCIA']);
            const dataVencimento   = parseExcelDate(row['DATA DE VENCIMENTO']   ?? row['VENCIMENTO']);
            const dataEfetivacao   = parseExcelDate(row['DATA DE EFETIVAÇÃO']   ?? row['DATA EFETIVACAO']);
            const tipoRaw          = String(row['TIPO'] ?? 'SAÍDA').trim().toUpperCase();
            const tipo             = tipoRaw.includes('ENTRADA') ? 'ENTRADA' : 'SAÍDA';
            const classificacaoDRE = String(row['CLASSIFICAÇÃO DRE'] ?? row['DRE'] ?? 'Outros').trim();
            const centroCusto      = String(row['CENTRO DE CUSTO / OBRA'] ?? row['OBRA'] ?? '').trim();
            const cidade           = String(row['CIDADE']   ?? '').trim() || null;
            const estado           = String(row['ESTADO']   ?? '').trim() || null;
            const setor            = String(row['SETOR']    ?? '').trim() || null;
            const clienteForn      = String(row['CLIENTE / FORNECEDOR'] ?? row['FORNECEDOR'] ?? '').trim() || null;
            const descricao        = String(row['DESCRIÇÃO'] ?? row['DESCRICAO'] ?? '').trim() || null;
            const valorBruto       = parseCurrency(row['VALOR BRUTO (R$)']);
            const caucaoRetida     = parseCurrency(row['CAUÇÃO RETIDA (R$)'] ?? row['CAUCAO RETIDA']);
            const iss              = parseCurrency(row['ISS']);
            const inss             = parseCurrency(row['INSS']);
            const impostosRetidos  = parseCurrency(row['IMPOSTOS RETIDOS NA FONTE (R$)'] ?? row['IMPOSTOS RETIDOS']);
            const valorLiquidoPlan = parseCurrency(row['VALOR LÍQUIDO RECEBIDO (R$)'] ?? row['VALOR LIQUIDO']);
            const status           = String(row['STATUS'] ?? 'A Vencer').trim() || 'A Vencer';

            const valorLiquido = valorLiquidoPlan > 0
                ? valorLiquidoPlan
                : valorBruto - caucaoRetida - iss - inss - impostosRetidos;

            // Linha vazia — pular
            if (!descricao && valorBruto === 0) { skipped++; continue; }

            // Tentar vincular ao projeto
            let projectId = null;
            if (centroCusto) {
                const proj = await prisma.project.findFirst({
                    where: { name: { contains: centroCusto } }
                });
                if (proj) projectId = proj.id;
            }

            // Deduplicação por (descricao + valorBruto + dataVencimento)
            const existing = await prisma.financialRecord.findFirst({
                where: {
                    descricao: descricao || null,
                    valorBruto,
                    ...(dataVencimento ? { dataVencimento } : {})
                }
            });

            if (existing) {
                if (existing.status !== status) {
                    await prisma.financialRecord.update({
                        where: { id: existing.id },
                        data: { status }
                    });
                    updated++;
                } else {
                    skipped++;
                }
            } else {
                await prisma.financialRecord.create({
                    data: {
                        dataCompetencia,
                        dataVencimento,
                        dataEfetivacao,
                        tipo,
                        classificacaoDRE,
                        centroCusto: centroCusto || null,
                        cidade,
                        estado,
                        setor,
                        clienteFornecedor: clienteForn,
                        descricao,
                        valorBruto,
                        caucaoRetida,
                        iss,
                        inss,
                        impostosRetidos,
                        valorLiquido,
                        status,
                        projectId
                    }
                });
                imported++;
            }
        } catch (e) {
            console.error('  ⚠️  Erro na linha:', e.message);
            errors++;
        }
    }

    console.log('\n✅ IMPORTAÇÃO CONCLUÍDA!');
    console.log(`   📥 Importados : ${imported}`);
    console.log(`   🔄 Atualizados: ${updated}`);
    console.log(`   ⏭  Ignorados  : ${skipped}`);
    console.log(`   ❌ Erros      : ${errors}`);
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

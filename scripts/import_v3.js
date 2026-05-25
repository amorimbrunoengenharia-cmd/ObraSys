const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

async function main() {
    console.log("🚀 Iniciando a importação MESTRE (V3) do Excel...");

    const filePath = path.join(process.cwd(), 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
    const workbook = xlsx.readFile(filePath, { cellDates: true });

    console.log("Abas encontradas:", workbook.SheetNames);

    // --- 1. Extrair Projetos e Datas ---
    const orcadosSheet = workbook.Sheets['VALOR ORÇADO'];
    const orcadosData = xlsx.utils.sheet_to_json(orcadosSheet);
    
    const projetosMap = new Map();
    orcadosData.forEach(row => {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        if (!obraName) return;
        
        const valorOrcado = Number(row['VALOR ORÇADO (R$)']) || 0;
        // Tenta pegar localização e datas se existirem nessas colunas
        const location = row['CIDADE'] || row['LOCALIZAÇÃO'] || 'São Paulo, SP';
        const start = parseDate(row['DATA INÍCIO']) || new Date('2026-01-01');
        const end = parseDate(row['DATA FIM'] || row['PREVISÃO ENTREGA']) || new Date('2026-12-31');

        if (!projetosMap.has(obraName)) {
            projetosMap.set(obraName, { 
                name: obraName, 
                budget: valorOrcado, 
                spent: 0,
                location: location,
                startDate: start,
                endDate: end
            });
        } else {
            const proj = projetosMap.get(obraName);
            proj.budget += valorOrcado;
        }
    });

    // --- 2. Extrair Realizado e LOCALIZAÇÃO ---
    const financeiroSheet = workbook.Sheets['BASE FINANCEIRA'];
    if (financeiroSheet) {
        const financeiroData = xlsx.utils.sheet_to_json(financeiroSheet);
        financeiroData.forEach(row => {
            const obraName = row['CENTRO DE CUSTO / OBRA'];
            const tipo = row['TIPO'];
            const valorLiquido = Number(row['VALOR LÍQUIDO RECEBIDO (R$)']) || Number(row['VALOR BRUTO (R$)']) || 0;

            if (obraName && projetosMap.has(obraName)) {
                const proj = projetosMap.get(obraName);
                
                // Se o projeto ainda não tem localização, pega da primeira linha financeira que encontrar
                if (proj.location === 'São Paulo, SP' && row['CIDADE']) {
                    proj.location = `${row['CIDADE']}, ${row['ESTADO'] || ''}`;
                }

                if (tipo === 'SAÍDA') {
                    proj.spent += valorLiquido;
                }
            }
        });
    }

    // --- LIMPAR E INSERIR ---
    await prisma.financialRecord.deleteMany();
    await prisma.budgetItem.deleteMany();
    await prisma.task.deleteMany();
    await prisma.project.deleteMany();

    const projectIdMap = new Map();
    for (const proj of projetosMap.values()) {
        const createdProj = await prisma.project.create({
            data: {
                name: proj.name,
                status: 'Em Andamento',
                budget: proj.budget,
                spent: proj.spent,
                location: proj.location,
                startDate: proj.startDate,
                endDate: proj.endDate,
                idp: 1.0,
                idc: 1.0
            }
        });
        projectIdMap.set(proj.name, createdProj.id);
        console.log(`✅ Projeto inserido: ${proj.name}`);
    }

    // --- 3. Inserir BudgetItem ---
    for (const row of orcadosData) {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        if (!obraName || !projectIdMap.has(obraName)) continue;
        await prisma.budgetItem.create({
            data: {
                projectId: projectIdMap.get(obraName),
                classificacaoDRE: String(row['CLASSIFICAÇÃO DRE'] || 'N/A'),
                subItem: row['SUB-ITEM (Opcional)'] ? String(row['SUB-ITEM (Opcional)']) : null,
                valorOrcado: Number(row['VALOR ORÇADO (R$)']) || 0,
                valorVenda: Number(row['VALOR DE VENDA (BDI)']) || 0,
            }
        });
    }

    // --- 4. Tentar importar Cronograma ---
    const cronoSheet = workbook.Sheets['BASE FÍSICA (Avanço de Obra)'] || workbook.Sheets['CRONOGRAMA'] || workbook.Sheets['PLANEJAMENTO'] || workbook.Sheets['TAREFAS'];
    if (cronoSheet) {
        console.log("Importando Cronograma Real da aba BASE FÍSICA...");
        const cronoData = xlsx.utils.sheet_to_json(cronoSheet);
        for (const row of cronoData) {
            const obraName = row['CENTRO DE CUSTO / OBRA'] || Array.from(projectIdMap.keys())[0];
            if (!projectIdMap.has(obraName)) continue;
            
            await prisma.task.create({
                data: {
                    projectId: projectIdMap.get(obraName),
                    wbs: String(row['WBS'] || '1'),
                    name: String(row['ITEM'] || row['DESCRIÇÃO'] || row['SERVIÇO'] || 'Tarefa'),
                    status: row['STATUS'] || (Number(row['% CONCLUÍDO']) >= 100 ? 'Concluído' : 'Em Andamento'),
                    progress: Math.round((Number(row['% CONCLUÍDO']) || Number(row['PROGRESSO']) || 0) * 100) / 100, // Lida com decimais
                    startDate: parseDate(row['INÍCIO']) || new Date(),
                    endDate: parseDate(row['FIM'] || row['TÉRMINO']) || new Date(),
                }
            });
        }
        console.log('🎉 Importação concluída com sucesso!');
        
        // Auto-sincronizar Obsidian após importar dados reais
        console.log('🔗 Disparando sincronização com Obsidian...');
        const { execSync } = require('child_process');
        try {
            execSync('node sync_obsidian_now.js', { stdio: 'inherit' });
        } catch (e) {
            console.error('⚠️ Falha ao auto-sincronizar Obsidian:', e.message);
        }
    }

    console.log("✅ Importação V3 finalizada!");
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });

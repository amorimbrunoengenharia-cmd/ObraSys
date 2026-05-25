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
    console.log("🚀 Iniciando a importação DETALHADA do Excel para o Banco de Dados...");

    // Lendo o arquivo Excel (cellDates converte automaticamente as datas do Excel para Date do JS)
    const filePath = path.join(__dirname, 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
    const workbook = xlsx.readFile(filePath, { cellDates: true });

    // --- 1. Extrair os Projetos primeiro para ter os IDs ---
    const orcadosSheet = workbook.Sheets['VALOR ORÇADO'];
    const orcadosData = xlsx.utils.sheet_to_json(orcadosSheet);
    
    // Agrupar orçamentos por obra
    const projetosMap = new Map();
    orcadosData.forEach(row => {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        if (!obraName) return;
        
        const valorOrcado = Number(row['VALOR ORÇADO (R$)']) || 0;
        
        if (!projetosMap.has(obraName)) {
            projetosMap.set(obraName, { name: obraName, budget: valorOrcado, spent: 0 });
        } else {
            const proj = projetosMap.get(obraName);
            proj.budget += valorOrcado;
        }
    });

    const financeiroSheet = workbook.Sheets['BASE FINANCEIRA'];
    const financeiroData = xlsx.utils.sheet_to_json(financeiroSheet);

    financeiroData.forEach(row => {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        const tipo = row['TIPO'];
        const valorLiquido = Number(row['VALOR LÍQUIDO RECEBIDO (R$)']) || Number(row['VALOR BRUTO (R$)']) || 0;

        if (obraName && tipo === 'SAÍDA' && projetosMap.has(obraName)) {
            const proj = projetosMap.get(obraName);
            proj.spent += valorLiquido;
        }
    });

    // Limpar banco
    await prisma.financialRecord.deleteMany();
    await prisma.budgetItem.deleteMany();
    await prisma.project.deleteMany();

    // Inserir Projetos e guardar os IDs
    const projectIdMap = new Map();
    for (const proj of projetosMap.values()) {
        const createdProj = await prisma.project.create({
            data: {
                name: proj.name,
                status: 'Em Andamento',
                budget: proj.budget,
                spent: proj.spent,
                idp: 1.0,
                idc: 1.0
            }
        });
        projectIdMap.set(proj.name, createdProj.id);
        console.log(`✅ Projeto inserido: ${proj.name}`);
    }

    // --- 2. Inserir ITENS DE ORÇAMENTO (BudgetItem) ---
    console.log("Inserindo Itens de Orçamento detalhados...");
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

    // --- 3. Inserir REGISTROS FINANCEIROS DETALHADOS (FinancialRecord) ---
    console.log("Inserindo Transações Financeiras detalhadas...");
    for (const row of financeiroData) {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        const projectId = obraName && projectIdMap.has(obraName) ? projectIdMap.get(obraName) : null;

        await prisma.financialRecord.create({
            data: {
                projectId: projectId,
                dataCompetencia: parseDate(row['DATA DE COMPETÊNCIA']),
                dataVencimento: parseDate(row['DATA DE VENCIMENTO']),
                dataEfetivacao: parseDate(row['DATA DE EFETIVAÇÃO']),
                tipo: String(row['TIPO'] || 'N/A'),
                classificacaoDRE: String(row['CLASSIFICAÇÃO DRE'] || 'N/A'),
                cidade: row['CIDADE'] ? String(row['CIDADE']) : null,
                estado: row['ESTADO'] ? String(row['ESTADO']) : null,
                setor: row['SETOR'] ? String(row['SETOR']) : null,
                clienteFornecedor: row['CLIENTE / FORNECEDOR'] ? String(row['CLIENTE / FORNECEDOR']) : null,
                descricao: row['DESCRIÇÃO'] ? String(row['DESCRIÇÃO']) : null,
                valorBruto: Number(row['VALOR BRUTO (R$)']) || 0,
                impostosRetidos: Number(row['IMPOSTOS RETIDOS NA FONTE (R$)']) || 0,
                valorLiquido: Number(row['VALOR LÍQUIDO RECEBIDO (R$)']) || Number(row['VALOR BRUTO (R$)']) || 0,
                status: String(row['STATUS'] || 'Pendente')
            }
        });
    }

    console.log("✅ Importação detalhada finalizada com sucesso!");
    console.log(`- ${orcadosData.length} itens de orçamento inseridos.`);
    console.log(`- ${financeiroData.length} transações financeiras inseridas.`);
}

main()
  .catch(e => {
    console.error("Erro na importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

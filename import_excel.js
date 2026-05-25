const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando a importação do Excel para o Banco de Dados...");

    // Lendo o arquivo Excel
    const filePath = path.join(__dirname, 'Dashboard Executivo FP&A - WayService - 2026_V1.0 (4).xlsx');
    const workbook = xlsx.readFile(filePath);

    // 1. Extrair os Projetos (Centros de Custo) da planilha 'VALOR ORÇADO'
    const orcadosSheet = workbook.Sheets['VALOR ORÇADO'];
    const orcadosData = xlsx.utils.sheet_to_json(orcadosSheet);
    
    // Agrupar orçamentos por obra
    const projetosMap = new Map();
    orcadosData.forEach(row => {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        if (!obraName) return;
        
        const valorOrcado = row['VALOR ORÇADO (R$)'] || 0;
        
        if (!projetosMap.has(obraName)) {
            projetosMap.set(obraName, {
                name: obraName,
                budget: valorOrcado,
                spent: 0
            });
        } else {
            const proj = projetosMap.get(obraName);
            proj.budget += valorOrcado;
        }
    });

    // 2. Extrair Gastos da planilha 'BASE FINANCEIRA'
    const financeiroSheet = workbook.Sheets['BASE FINANCEIRA'];
    const financeiroData = xlsx.utils.sheet_to_json(financeiroSheet);

    financeiroData.forEach(row => {
        const obraName = row['CENTRO DE CUSTO / OBRA'];
        const tipo = row['TIPO'];
        const valorLiquido = row['VALOR LÍQUIDO RECEBIDO (R$)'] || row['VALOR BRUTO (R$)'] || 0;

        if (obraName && tipo === 'SAÍDA' && projetosMap.has(obraName)) {
            const proj = projetosMap.get(obraName);
            proj.spent += Number(valorLiquido);
        }
    });

    // 3. Inserir no Banco de Dados
    console.log(`Encontrados ${projetosMap.size} projetos. Inserindo no banco...`);
    
    // Limpar projetos antigos
    await prisma.project.deleteMany();

    for (const proj of projetosMap.values()) {
        await prisma.project.create({
            data: {
                name: proj.name,
                status: 'Em Andamento',
                budget: proj.budget,
                spent: proj.spent,
                idp: 1.0, // Indicadores base para começar
                idc: 1.0
            }
        });
        console.log(`✅ Projeto inserido: ${proj.name} (Orçamento: R$ ${proj.budget.toFixed(2)})`);
    }

    // 4. Inserir Usuários Base
    await prisma.user.deleteMany();
    const users = [
        { email: 'diretor@way.com', name: 'Bruno (Diretor)', password: '123', role: 'Diretor' },
        { email: 'gerente@way.com', name: 'Carlos (Gerente)', password: '123', role: 'Gerente de Obras' },
        { email: 'eng@way.com', name: 'Eng. Roberto', password: '123', role: 'Engenheiro Residente' },
        { email: 'mestre@way.com', name: 'Mestre João', password: '123', role: 'Mestre de Obras' },
        { email: 'financeiro@way.com', name: 'Ana (Financeiro)', password: '123', role: 'Gerente Financeiro' },
        { email: 'cliente@way.com', name: 'Sr. Marcos', password: '123', role: 'Cliente / Investidor' }
    ];

    for (const u of users) {
        await prisma.user.create({ data: u });
    }
    console.log("✅ Usuários iniciais inseridos com sucesso.");

    console.log("--- Importação Finalizada ---");
}

main()
  .catch(e => {
    console.error("Erro na importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

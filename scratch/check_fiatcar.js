const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProject() {
    const project = await prisma.project.findFirst({
        where: { name: { contains: 'FIATCAR' } },
        include: { financials: true }
    });

    if (!project) {
        console.log("Obra FIATCAR não encontrada.");
        return;
    }

    const totalEntradas = project.financials
        .filter(f => f.tipo === 'ENTRADA')
        .reduce((sum, f) => sum + f.valorLiquido, 0);

    const totalSaidas = project.financials
        .filter(f => f.tipo === 'SAÍDA')
        .reduce((sum, f) => sum + f.valorLiquido, 0);

    console.log("--- DADOS BRUTOS: FIATCAR ---");
    console.log("ID da Obra:", project.id);
    console.log("Orçamento Cadastrado (Budget):", project.budget);
    console.log("Gasto Registrado (Spent):", project.spent);
    console.log("Saldo Calculado (Budget - Spent):", project.budget - project.spent);
    console.log("--- CONFERÊNCIA FINANCEIRA ---");
    console.log("Total de Entradas Lançadas:", totalEntradas);
    console.log("Total de Saídas Lançadas:", totalSaidas);
    console.log("Saldo de Caixa (Entradas - Saídas):", totalEntradas - totalSaidas);
}

checkProject().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncFiatCar() {
    const project = await prisma.project.findFirst({
        where: { name: { contains: 'FIATCAR' } }
    });

    if (!project) {
        console.log("Obra FIATCAR não encontrada.");
        return;
    }

    // VALORES REAIS DO PRINT DO USUÁRIO
    const gastoReal = 1611.46;
    const orcamentoTotal = 1611.46; // Se não há nada a receber, o orçamento é o próprio custo realizado.

    await prisma.project.update({
        where: { id: project.id },
        data: {
            spent: gastoReal,
            budget: orcamentoTotal,
            idp: 1.0,
            idc: 1.0
        }
    });

    // Criar os lançamentos financeiros detalhados (exemplo de alguns do print)
    const lancamentos = [
        { desc: 'ALIMENTAÇÃO OPERACIONAL (FIATCAR)', valor: 75.00, status: 'Pago', tipo: 'SAÍDA', dre: 'Custos Operacionais' },
        { desc: 'CUSTOS DE OBRA - MÃO DE OBRA', valor: 199.90, status: 'Pago', tipo: 'SAÍDA', dre: 'Mão de Obra' },
        { desc: 'ART FIATCAR', valor: 285.59, status: 'Pago', tipo: 'SAÍDA', dre: 'Impostos/Taxas' },
        { desc: 'PAGAMENTO PEDREIRO - ADRIANO', valor: 250.00, status: 'Pago', tipo: 'SAÍDA', dre: 'Mão de Obra' }
    ];

    for (const l of lancamentos) {
        await prisma.financialRecord.create({
            data: {
                descricao: l.desc,
                valorBruto: l.valor,
                valorLiquido: l.valor,
                impostosRetidos: 0,
                tipo: l.tipo,
                status: l.status,
                classificacaoDRE: l.dre,
                projectId: project.id,
                dataEfetivacao: new Date()
            }
        });
    }

    console.log(`✅ Sincronismo concluído: FIATCAR atualizada com R$ ${gastoReal}`);
}

syncFiatCar().finally(() => prisma.$disconnect());

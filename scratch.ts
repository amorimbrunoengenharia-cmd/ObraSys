import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const records = await prisma.financialRecord.findMany({
        where: {
            status: { in: ['Pago', 'Recebido'] }
        },
        include: { project: true }
    });

    let totalProjects = 0;
    let totalNoProject = 0;
    let totalLiquido = 0;

    for (const r of records) {
        if (r.tipo === 'SAÍDA') {
            totalLiquido += r.valorLiquido || 0;
            if (r.projectId) {
                totalProjects += r.valorLiquido || 0;
            } else {
                totalNoProject += r.valorLiquido || 0;
                console.log(`NO PROJECT SAÍDA: ${r.descricao} | R$ ${r.valorLiquido}`);
            }
        }
    }
    console.log(`TOTAL SAÍDA PAGA (Liquido): R$ ${totalLiquido}`);
    console.log(`TOTAL SAÍDA IN PROJECTS: R$ ${totalProjects}`);
    console.log(`TOTAL SAÍDA NO PROJECTS: R$ ${totalNoProject}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());

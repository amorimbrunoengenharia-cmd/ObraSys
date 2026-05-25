import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const records = await prisma.financialRecord.findMany({
        where: { status: { in: ['Pago', 'Recebido'] } }
    });
    const misclassified = records.filter(r => 
        (r.tipo === 'ENTRADA' && r.classificacaoDRE && !r.classificacaoDRE.includes('RECEITA')) ||
        (r.tipo === 'SAÍDA' && r.classificacaoDRE && r.classificacaoDRE.includes('RECEITA'))
    );
    console.log('Misclassified count:', misclassified.length);
    let totalMis = 0;
    misclassified.forEach(m => {
        console.log(m.tipo, m.classificacaoDRE, m.valorLiquido);
        totalMis += m.valorLiquido || 0;
    });
    console.log("Total misclassified value:", totalMis);
}
check().finally(() => prisma.$disconnect());

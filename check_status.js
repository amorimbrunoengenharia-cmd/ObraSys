const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const count = await prisma.financialRecord.count();
    const sum = await prisma.financialRecord.aggregate({
        _sum: { valorBruto: true }
    });
    console.log('--- STATUS ATUAL ---');
    console.log('Total de Registros:', count);
    console.log('Soma Total Bruto:', sum._sum.valorBruto);
    await prisma.$disconnect();
}

check();

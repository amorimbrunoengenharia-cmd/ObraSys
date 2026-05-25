
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const total = await prisma.financialRecord.count();
    const linked = await prisma.financialRecord.count({ where: { NOT: { projectId: null } } });
    const unlinked = await prisma.financialRecord.count({ where: { projectId: null } });
    
    console.log(`Total de Lançamentos: ${total}`);
    console.log(`Lançamentos Vinculados: ${linked}`);
    console.log(`Lançamentos Órfãos (sem projeto): ${unlinked}`);

    const sample = await prisma.financialRecord.findMany({
        take: 5,
        include: { project: { select: { name: true } } }
    });
    console.log("Amostra de Lançamentos:", JSON.stringify(sample, null, 2));

    const projects = await prisma.project.findMany({ select: { id: true, name: true } });
    console.log("Projetos no Banco:", JSON.stringify(projects, null, 2));
}

check().catch(console.error);

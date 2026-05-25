const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const summary = await prisma.task.groupBy({
    by: ['projectId'],
    _count: {
      id: true
    }
  });
  
  console.log('--- RESUMO DE TAREFAS POR OBRA ---');
  console.table(summary.map(s => ({ 'ID Obra': s.projectId, 'Total Tarefas': s._count.id })));
  
  const sample = await prisma.task.findFirst({
     where: { projectId: { gt: 8 } }
  });
  console.log('--- AMOSTRA DE TAREFA REAL ---');
  console.log(sample);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

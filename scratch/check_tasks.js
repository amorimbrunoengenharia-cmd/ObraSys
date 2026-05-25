const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tasks = await prisma.task.findMany({
    take: 10,
    select: { id: true, name: true, wbs: true, projectId: true }
  });
  console.log('--- AMOSTRA DE TAREFAS NO BANCO ---');
  console.table(tasks);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

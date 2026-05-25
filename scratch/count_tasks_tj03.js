const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const tasks = await prisma.task.findMany({ where: { projectId: 13 } });
  const project = await prisma.project.findUnique({ where: { id: 13 } });
  console.log(`Project: ${project.name}, Status: ${project.status}`);
  console.log(`Total Tasks: ${tasks.length}`);
  console.log(`Completed Tasks: ${tasks.filter(t => t.status === 'Concluído' || t.columnId === 'done').length}`);
}

check();

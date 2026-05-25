const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const projects = await prisma.project.findMany();
  console.log('--- OBRAS NO BANCO DE DADOS ---');
  console.table(projects.map(p => ({ ID: p.id, Nome: p.name, Status: p.status })));
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

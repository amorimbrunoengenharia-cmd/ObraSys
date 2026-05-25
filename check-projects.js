const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.project.count();
  const active = await prisma.project.count({ where: { status: { notIn: ['Concluído', 'Paralisado'] } }});
  
  const antonio = await prisma.user.findUnique({ where: { email: 'antonio@way.com' } });
  
  if (antonio) {
    const assigned = await prisma.project.findMany({
      where: { employees: { some: { userId: antonio.id } } },
      select: { id: true, name: true, status: true }
    });
    console.log(`Total projects: ${total}, Active: ${active}`);
    console.log(`Antonio is assigned to ${assigned.length} projects:`, assigned);
  } else {
    console.log("Antonio not found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

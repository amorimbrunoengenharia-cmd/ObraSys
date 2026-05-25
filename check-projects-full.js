const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const antonio = await prisma.user.findUnique({ where: { email: 'antonio@way.com' } });
  
  if (antonio) {
    const assigned = await prisma.project.findMany({
      where: {
        OR: [
            { employees: { some: { userId: antonio.id } } },
            { engineerId: antonio.id },
            { tasks: { some: { assignees: { some: { id: antonio.id } } } } }
        ]
      },
      select: { id: true, name: true, status: true, engineerId: true }
    });
    console.log(`Antonio has access to ${assigned.length} projects with the full OR clause:`, assigned);
  } else {
    console.log("Antonio not found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

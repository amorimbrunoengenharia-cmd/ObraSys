const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const p = await prisma.project.findUnique({
    where: { id: 13 },
    include: { tasks: true, rdos: { include: { activities: true } } }
  });
  console.log(JSON.stringify(p, null, 2));
}

check();

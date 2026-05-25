const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const users = [
  { email: 'diretor@way.com', password: '123', role: 'Diretor', name: 'Bruno (Diretor)' },
  { email: 'gerente@way.com', password: '123', role: 'Gerente de Obras', name: 'Carlos (Gerente)' },
  { email: 'eng@way.com', password: '123', role: 'Engenheiro Residente', name: 'Eng. Roberto' },
  { email: 'mestre@way.com', password: '123', role: 'Mestre de Obras', name: 'Mestre João' },
  { email: 'financeiro@way.com', password: '123', role: 'Gerente Financeiro', name: 'Ana (Financeiro)' },
  { email: 'cliente@way.com', password: '123', role: 'Cliente / Investidor', name: 'Sr. Marcos' }
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: user.password, role: user.role, name: user.name },
      create: { email: user.email, password: user.password, role: user.role, name: user.name }
    });
  }
  console.log("Demo users seeded successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

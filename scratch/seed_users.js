const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'diretor@way.com',    password: '123', role: 'Diretor',              name: 'Bruno (Diretor)' },
    { email: 'gerente@way.com',    password: '123', role: 'Gerente de Obras',     name: 'Carlos (Gerente)' },
    { email: 'eng@way.com',        password: '123', role: 'Engenheiro Residente', name: 'Eng. Roberto' },
    { email: 'mestre@way.com',     password: '123', role: 'Mestre de Obras',      name: 'Mestre João' },
    { email: 'financeiro@way.com', password: '123', role: 'Gerente Financeiro',   name: 'Ana (Financeiro)' },
    { email: 'cliente@way.com',    password: '123', role: 'Cliente / Investidor', name: 'Sr. Marcos' }
  ];

  console.log('Semeando usuários...');

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: u,
    });
  }

  console.log('✅ Usuários criados com sucesso!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

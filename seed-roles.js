const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const roles = [
  { name: "Almoxarife", accessLevel: "Almoxarife" },
  { name: "Engenheiro", accessLevel: "Engenheiro" },
  { name: "Engenheiro Residente", accessLevel: "Engenheiro Residente" },
  { name: "Mestre de Obras", accessLevel: "Mestre de Obras" },
  { name: "Pedreiro", accessLevel: "Sem Acesso" },
  { name: "Servente", accessLevel: "Sem Acesso" },
  { name: "Téc. Segurança", accessLevel: "Téc. Segurança" },
  { name: "Gerente de Obras", accessLevel: "Gerente de Obras" },
  { name: "Coordenador de Obras", accessLevel: "Coordenador de Obras" },
  { name: "Diretor", accessLevel: "Diretor" },
];

async function main() {
  for (const role of roles) {
    await prisma.jobRole.upsert({
      where: { name: role.name },
      update: { accessLevel: role.accessLevel },
      create: { name: role.name, accessLevel: role.accessLevel },
    });
  }
  console.log("JobRoles seeded successfully!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Limpando dados de teste e preparando obras reais...');

  // 1. Remover obras fake
  await prisma.project.deleteMany({ where: { id: { in: [1, 2] } } });

  // 2. Criar um RDO de exemplo para uma obra REAL (ex: FIATCAR - ID 9)
  // Nota: Verificamos se o projeto ID 9 existe antes
  const fiatcar = await prisma.project.findUnique({ where: { id: 9 } });
  
  if (fiatcar) {
    await prisma.rDO.create({
      data: {
        date: '14/05',
        status: 'Finalizado',
        projectId: 9,
        authorId: 1,
        activities: {
          create: [{
            progress: 100,
            observations: 'Início da revisão da cabine primária na Fiatcar.',
            photos: {
              create: [{ url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80', caption: 'Revisão Elétrica' }]
            }
          }]
        }
      }
    });
    console.log('✅ RDO vinculado à obra FIATCAR!');
  }

  console.log('✅ Pronto! Agora o app mostrará apenas suas obras reais.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando Super Seed para Paridade Total...');

  // 1. Criar Obras
  const project = await prisma.project.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Edifício Horizonte (Matriz)',
      clientName: 'Way Service Inc',
      status: 'Em Execução',
      budget: 15000000,
      physicalProgress: 75,
      location: 'São Paulo, SP',
      city: 'São Paulo',
      state: 'SP',
    }
  });

  // 2. Criar RDOs com Atividades e Fotos
  const rdo = await prisma.rDO.create({
    data: {
      date: '14/05',
      status: 'Finalizado',
      weather: JSON.stringify({ manha: 'Ensolarado', tarde: 'Nublado', noite: 'Chuvoso' }),
      manpower: JSON.stringify({ direta: 12, indireta: 3 }),
      equipment: JSON.stringify({ equipamentos: ['Escavadeira', 'Betoneira'], veiculos: ['Caminhão'] }),
      projectId: 1,
      authorId: 1,
      activities: {
        create: [
          {
            progress: 100,
            observations: 'Conclusão da concretagem da laje do 4º pavimento.',
            photos: {
              create: [
                { url: 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?w=800&q=80', caption: 'Concretagem Laje L04' }
              ]
            }
          }
        ]
      }
    }
  });

  // 3. Criar Documentos para o Portal do Cliente
  await prisma.document.createMany({
    data: [
      { nome: 'Projeto Estrutural - R01.pdf', tipo: 'Planta', url: '/docs/projeto.pdf', data: '10/05/2026', projectId: 1, visibleToClient: true },
      { nome: 'Contrato Social ObraSys.pdf', tipo: 'Contrato', url: '/docs/contrato.pdf', data: '01/01/2026', projectId: 1, visibleToClient: true },
      { nome: 'Cronograma Master V4.xlsx', tipo: 'Outros', url: '/docs/cronograma.xlsx', data: '12/05/2026', projectId: 1, visibleToClient: true }
    ]
  });

  console.log('✅ Super Seed Concluído! Obras, RDOs e Documentos liberados.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDb() {
  const item = await prisma.referenceComposition.findFirst({
    where: { 
      code: '45333',
      database: 'SINAPI'
    },
    include: { resources: true }
  });

  if (item) {
    console.log('Item 45333 encontrado:');
    console.log(`Descrição: ${item.description}`);
    console.log(`Estado: ${item.state}`);
    console.log(`Data: ${item.referenceDate}`);
    console.log(`Preço Unitário: ${item.unitPrice}`);
    console.log(`Recursos: ${item.resources.length}`);
    item.resources.forEach(r => {
      console.log(`  - ${r.description}: Coef ${r.coefficient}, Preço ${r.defaultPrice}`);
    });
  } else {
    console.log('Item 45333 não encontrado no banco.');
  }

  const count = await prisma.referenceComposition.count();
  console.log(`Total de itens no banco: ${count}`);
}

checkDb();

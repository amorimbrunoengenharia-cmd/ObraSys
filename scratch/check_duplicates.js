const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  const items = await prisma.referenceComposition.findMany({
    where: { 
      code: '45333'
    }
  });

  console.log(`Encontrados ${items.length} itens para o código 45333:`);
  items.forEach(item => {
    console.log(`ID: ${item.id}, DB: ${item.database}, Estado: ${item.state}, Data: ${item.referenceDate}, Preço: ${item.unitPrice}`);
  });
}

checkDuplicates();

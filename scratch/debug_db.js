const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  try {
    const totalRefs = await prisma.referenceComposition.count();
    const samples = await prisma.referenceComposition.findMany({
      take: 5,
      select: { code: true, description: true, unitPrice: true, database: true }
    });

    console.log('\n=== DIAGNÓSTICO DE PREÇOS ===');
    console.log(`Total de Itens no Banco: ${totalRefs}`);
    console.log('\nExemplos de Itens Encontrados:');
    samples.forEach(s => {
      console.log(`[${s.code}] ${s.description.substring(0, 50)}... | Preço: R$ ${s.unitPrice}`);
    });
    console.log('=============================\n');

    const withPrice = await prisma.referenceComposition.count({ where: { unitPrice: { gt: 0 } } });
    console.log(`Itens com Preço > 0: ${withPrice}`);

  } catch (err) {
    console.error('Erro no diagnóstico:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

debug();

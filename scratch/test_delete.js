const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function tryDelete() {
  try {
    const item = await prisma.estimateItem.findFirst({
      where: { code: '45333' }
    });
    if (item) {
      console.log('Tentando excluir item:', item.id);
      await prisma.estimateItem.delete({ where: { id: item.id } });
      console.log('Item excluído com sucesso do banco.');
    } else {
      console.log('Item 45333 não encontrado no banco.');
    }
  } catch (err) {
    console.error('Erro ao excluir no banco:', err);
  } finally {
    await prisma.$disconnect();
  }
}

tryDelete();

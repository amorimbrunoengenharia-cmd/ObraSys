const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  try {
    const res = await prisma.referenceComposition.deleteMany({
      where: {
        OR: [
          { database: 'SINAPI-INS' },
          { database: 'SINAPI-COMP' }
        ]
      }
    });
    console.log(`Cleaned up: ${res.count} items with legacy database names.`);
  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();

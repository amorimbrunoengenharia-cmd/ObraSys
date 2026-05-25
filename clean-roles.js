const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Unlink employees from their job roles
  await prisma.employee.updateMany({
    data: { jobRoleId: null }
  });
  
  // Delete all job roles
  await prisma.jobRole.deleteMany();
  
  console.log("JobRoles cleaned.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

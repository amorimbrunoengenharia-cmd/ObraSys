const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const roles = await prisma.jobRole.findMany();
    console.log("Job Roles:", roles);

    // Update Fernanda
    const user = await prisma.user.findFirst({ where: { name: { contains: 'Fernanda' } } });
    if (user) {
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'Analista de RH' }
        });
        console.log("Updated Fernanda's role to 'Analista de RH'");
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());

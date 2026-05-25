const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Fernanda' } }
    });
    console.log("User:", user);

    if (user) {
        const employee = await prisma.employee.findFirst({
            where: { userId: user.id },
            include: { jobRole: true }
        });
        console.log("Employee:", employee);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());

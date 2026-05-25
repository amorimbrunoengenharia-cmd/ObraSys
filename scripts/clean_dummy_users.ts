import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Iniciando limpeza de contas dummy do banco de dados...");

    // Emails das contas dummy conhecidas que o usuário quer remover
    const dummyEmails = [
        "engenharia@obrasys.com",
        "projetos@obrasys.com",
        "almoxarifado@obrasys.com",
        "suprimentos@obrasys.com",
        "financeiro@obrasys.com"
    ];

    try {
        const deleted = await prisma.user.deleteMany({
            where: {
                email: {
                    in: dummyEmails
                }
            }
        });

        console.log(`✅ Sucesso: ${deleted.count} contas dummy foram removidas da base de dados.`);
        
        // Listar as contas restantes para auditoria
        const remainingUsers = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true }
        });

        console.log("\nUsuários restantes na base Enterprise:");
        console.table(remainingUsers);

    } catch (error) {
        console.error("❌ Erro ao limpar o banco:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

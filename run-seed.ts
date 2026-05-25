import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const dres = ["1. RECEITA OPERACIONAL", "3. CUSTO DIRETO - MÃO DE OBRA", "5. DESPESA ADMINISTRATIVA", "4. CUSTO DIRETO - EQUIPAMENTOS/LOGÍSTICA", "7. IMPOSTOS SOBRE SERVIÇO", "6. DESPESA COMERCIAL", "2. CUSTO DIRETO - MATERIAIS", "8. INVESTIMENTOS / CAPEX", "9. CUSTO FINANCEIRO", "10. PROVISÕES", "11. CONTINGÊNCIAS"];

    for (const name of dres) {
        const nature = name.includes("1. RECEITA OPERACIONAL") ? "RECEITA" : "DESPESA";
        const code = name.split(".")[0];
        try {
            await prisma.financialCategory.upsert({
                where: { name },
                update: { nature, code },
                create: { name, nature, code }
            });
            console.log(`Created/Updated ${name}`);
        } catch(e) {
            console.error(`Error with ${name}:`, e);
        }
    }
    console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());

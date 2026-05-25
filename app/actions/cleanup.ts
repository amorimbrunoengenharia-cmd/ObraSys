"use server";
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';


export async function wipeAndResetFinance() {
    try {
        await prisma.financialRecord.deleteMany({});
        await prisma.project.updateMany({ data: { spent: 0 } });
        revalidatePath('/');
        revalidatePath('/financeiro');
        revalidatePath('/analise');
        return { success: true, message: "Base financeira limpa e projetos resetados." };
    } catch (error: any) {
        console.error("Erro ao limpar base:", error);
        return { success: false, error: error.message };
    }
}

export async function cleanupResidualData() {
    try {
        let totalDeleted = 0;

        // 1. Linhas de totalização por valores específicos (Legado)
        const res1 = await prisma.financialRecord.deleteMany({
            where: {
                valorLiquido: {
                    in: [76452.80, 105960.78, 29507.98]
                }
            }
        });
        totalDeleted += res1.count;

        // 2. Registros sem fornecedor ou tipo (lixo de importação)
        const res2 = await prisma.financialRecord.deleteMany({
            where: {
                OR: [
                    { clienteFornecedor: "" },
                    { clienteFornecedor: null },
                    { tipo: "" },
                    { valorBruto: 0 } // Malformados costumam vir com valor zero
                ]
            }
        });
        totalDeleted += res2.count;

        // 3. Registros onde a descrição contém o nome de uma obra (padrão de erro identificado)
        // Isso remove aquelas linhas onde o nome da obra "pulou" para a descrição
        const projects = await prisma.project.findMany({ select: { name: true } });
        for (const p of projects) {
            const res3 = await prisma.financialRecord.deleteMany({
                where: {
                    descricao: { contains: p.name }
                }
            });
            totalDeleted += res3.count;
        }

        // 4. Correção específica de duplicata CREA SP (manter apenas um)
        const creaRecords = await prisma.financialRecord.findMany({
            where: {
                clienteFornecedor: "CREA SP",
                descricao: { contains: "EMISSÃO DE ART SP" }
            },
            take: 10
        });
        if (creaRecords.length > 1) {
            // Deleta todos menos o primeiro
            const idsToDelete = creaRecords.slice(1).map(r => r.id);
            const res4 = await prisma.financialRecord.deleteMany({
                where: { id: { in: idsToDelete } }
            });
            totalDeleted += res4.count;
        }
        
        revalidatePath('/');
        revalidatePath('/financeiro');
        revalidatePath('/analise');
        return { success: true, deleted: totalDeleted };
    } catch (error: any) {
        console.error("Erro na limpeza de resíduos:", error);
        return { success: false, error: error.message };
    }
}

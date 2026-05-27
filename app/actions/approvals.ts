"use server";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerObsidianSync } from "./obsidian";
export async function createApproval(projectId: number, data: any) {
    try {
        const approval = await prisma.clientApproval.create({
            data: {
                projectId,
                title: data.title,
                type: data.type || "BM",
                amount: data.amount,
                documentUrl: data.documentUrl,
                status: "Pendente"
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, approval };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function respondToApproval(projectId: number, approvalId: number, status: string, clientName: string, observations?: string) {
    try {
        const updatedApproval = await prisma.clientApproval.update({
            where: { id: approvalId },
            data: {
                status,
                clientName,
                observations,
                resolvedAt: new Date(),
            },
            include: { project: true }
        });

        // Generate financial record if approved and has an amount
        if (status === 'Aprovado' && updatedApproval.amount && updatedApproval.amount > 0 && 
            (updatedApproval.type.includes('Medição') || updatedApproval.type.includes('BM'))) {
            
            const existingFinance = await prisma.financialRecord.findFirst({
                where: { 
                    descricao: `Faturamento: ${updatedApproval.title}`,
                    projectId: projectId
                }
            });

            if (!existingFinance) {
                const project = updatedApproval.project;
                const vBruto = updatedApproval.amount;
                const vRetencao = (vBruto * (project.retentionPercent || 0)) / 100;
                const vImpostos = (vBruto * (project.taxPercent || 0)) / 100;
                const vLiquido = vBruto - vRetencao - vImpostos;

                await prisma.financialRecord.create({
                    data: {
                        projectId: projectId,
                        descricao: `Faturamento: ${updatedApproval.title}`,
                        tipo: "ENTRADA",
                        classificacaoDRE: "1. Receita Operacional",
                        centroCusto: project.name,
                        clienteFornecedor: project.clientName || clientName || "CLIENTE",
                        valorBruto: vBruto,
                        caucaoRetida: vRetencao,
                        impostosRetidos: vImpostos,
                        valorLiquido: vLiquido,
                        status: "A VENCER",
                        dataCompetencia: new Date(),
                        dataVencimento: new Date(new Date().setDate(new Date().getDate() + 15)), // Vencimento em 15 dias
                        clientApprovalId: approvalId,
                    }
                });
            }
        }

        // Notificar equipe de engenharia e admin
        const targetUsers = await prisma.user.findMany({
            where: {
                role: { in: ['Admin', 'Diretoria', 'Engenheiro', 'Engenheiro Residente', 'Financeiro'] }
            }
        });

        if (targetUsers.length > 0) {
            await prisma.notification.createMany({
                data: targetUsers.map(u => ({
                    userId: u.id,
                    title: `Decisão do Cliente: ${updatedApproval.title}`,
                    message: `A aprovação no projeto ${updatedApproval.project.name} foi marcada como ${status} por ${clientName}.`,
                    type: status === 'Aprovado' ? 'SUCCESS' : 'WARNING',
                    link: `/projeto/${projectId}`
                }))
            });
        }

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getPendingApprovals(projectId: number) {
    try {
        const approvals = await prisma.clientApproval.findMany({
            where: { 
                projectId: Number(projectId),
                status: "Pendente"
            },
            orderBy: { requestedAt: 'desc' }
        });
        return { success: true, approvals };
    } catch (e: any) {
        console.error("Error fetching pending approvals:", e);
        return { success: false, error: e.message };
    }
}

export async function getAllApprovals(projectId: number) {
    try {
        const approvals = await prisma.clientApproval.findMany({
            where: { projectId: Number(projectId) },
            orderBy: { requestedAt: 'desc' }
        });
        return { success: true, approvals };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

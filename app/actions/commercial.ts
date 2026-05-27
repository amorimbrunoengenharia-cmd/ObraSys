"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../../lib/permissions';

export async function getProjectsWithBudget() {
    const cookieStore = await cookies();
    const rawUserRole = cookieStore.get('userRole')?.value || '';
    const rawUserEmail = cookieStore.get('userEmail')?.value || '';
    const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
    const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

    let whereClause: any = {};
    if (shouldFilterProjects(userRole)) {
        const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
        if (userRole === 'Cliente / Investidor') {
            whereClause = { clientName: userObj?.name || '---' };
        } else if (userObj) {
            whereClause = {
                OR: [
                    { employees: { some: { userId: userObj.id } } },
                    { engineerId: userObj.id },
                    { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
                ]
            };
        } else {
            whereClause = { id: -1 };
        }
    }

    return await prisma.project.findMany({
        where: whereClause,
        include: {
            budgetItems: true,
            contractEvents: true,
            estimates: true,
            financials: {
                where: {
                    tipo: 'ENTRADA',
                    OR: [
                        { descricao: { contains: 'BM' } },
                        { classificacaoDRE: '1. Receita Operacional (Resgate de Caução)' }
                    ]
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function getEngineers() {
    return await prisma.user.findMany({
        where: { role: { in: ['Gerente de Obras', 'Engenheiro', 'Diretor'] } },
        orderBy: { name: 'asc' }
    });
}

export async function createProjectWithBudget(data: { 
    name: string, 
    clientName?: string,
    status?: string,
    initialValue?: number,
    retentionPercent?: number,
    taxPercent?: number,
    retentionRule?: string,
    retentionDays?: number,
    signatureDate?: string,
    osDate?: string,
    executionDays?: number,
    estimatedDelivery?: string,
    contractFileUrl?: string,
    address?: string,
    latitude?: number,
    longitude?: number,
    engineerId?: number,
    estimateId?: string,
    budgetItems: any[] 
}) {
    try {
        const totalBudget = data.budgetItems.reduce((acc, item) => acc + Number(item.valorOrcado), 0);

        const project = await prisma.project.create({
            data: {
                name: data.name,
                clientName: data.clientName || null,
                status: data.status || 'Em Orçamento',
                budget: totalBudget, 
                initialValue: data.initialValue || 0,
                retentionPercent: data.retentionPercent || 0,
                taxPercent: data.taxPercent || 0,
                retentionRule: data.retentionRule || 'AT_END',
                retentionDays: data.retentionDays || 0,
                signatureDate: data.signatureDate ? new Date(data.signatureDate) : null,
                osDate: data.osDate ? new Date(data.osDate) : null,
                executionDays: data.executionDays || 0,
                estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
                contractFileUrl: data.contractFileUrl || null,
                address: data.address || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                engineerId: data.engineerId || null,
                spent: 0,
                idp: 1.0,
                idc: 1.0,
                budgetItems: {
                    create: data.budgetItems.map(item => ({
                        classificacaoDRE: item.classificacaoDRE,
                        subItem: item.subItem || null,
                        valorOrcado: Number(item.valorOrcado),
                        valorVenda: Number(item.valorVenda)
                    }))
                }
            }
        });

        if (data.estimateId) {
            await prisma.estimate.update({
                where: { id: data.estimateId },
                data: { projectId: project.id }
            });
        }

        revalidatePath('/');
        revalidatePath('/comercial');
        triggerObsidianSync();
        return { success: true, project };
    } catch (error: any) {
        console.error("Erro ao criar projeto:", error);
        return { success: false, error: error.message };
    }
}

export async function updateProjectWithBudget(id: string, data: { 
    name: string, 
    clientName?: string,
    status?: string,
    initialValue?: number,
    retentionPercent?: number,
    taxPercent?: number,
    retentionRule?: string,
    retentionDays?: number,
    signatureDate?: string,
    osDate?: string,
    executionDays?: number,
    estimatedDelivery?: string,
    contractFileUrl?: string,
    address?: string,
    latitude?: number,
    longitude?: number,
    engineerId?: number,
    estimateId?: string,
    budgetItems: any[] 
}) {
    try {
        const totalBudget = data.budgetItems.reduce((acc, item) => acc + (Number(item.valorOrcado) || 0), 0);

        const project = await prisma.project.update({
            where: { id: Number(id) },
            data: {
                name: data.name,
                clientName: data.clientName || null,
                status: data.status,
                budget: totalBudget,
                initialValue: data.initialValue || 0,
                retentionPercent: data.retentionPercent || 0,
                taxPercent: data.taxPercent || 0,
                retentionRule: data.retentionRule || 'AT_END',
                retentionDays: data.retentionDays || 0,
                signatureDate: data.signatureDate ? new Date(data.signatureDate) : null,
                osDate: data.osDate ? new Date(data.osDate) : null,
                executionDays: data.executionDays || 0,
                estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : null,
                contractFileUrl: data.contractFileUrl || null,
                address: data.address || null,
                latitude: data.latitude || null,
                longitude: data.longitude || null,
                engineerId: data.engineerId || null,
                budgetItems: {
                    deleteMany: {},
                    create: data.budgetItems.map(item => ({
                        classificacaoDRE: item.classificacaoDRE,
                        subItem: item.subItem || null,
                        valorOrcado: Number(item.valorOrcado || item.valorVenda || 0),
                        valorVenda: Number(item.valorVenda || 0)
                    }))
                }
            }
        });

        // Detach previous estimate if changed or clear it
        if (data.estimateId !== undefined) {
            // First detach any estimate currently linked to this project
            await prisma.estimate.updateMany({
                where: { projectId: project.id },
                data: { projectId: null }
            });
            // Link new estimate if provided
            if (data.estimateId) {
                await prisma.estimate.update({
                    where: { id: data.estimateId },
                    data: { projectId: project.id }
                });
            }
        }

        revalidatePath('/');
        revalidatePath('/comercial');
        triggerObsidianSync();
        return { success: true, project };
    } catch (error: any) {
        console.error("Erro ao atualizar projeto:", error);
        return { success: false, error: error.message };
    }
}

export async function getContractHistory(projectId: string) {
    try {
        const project = await prisma.project.findUnique({
            where: { id: Number(projectId) },
            include: {
                budgetItems: true,
                contractEvents: {
                    orderBy: { data: 'desc' }
                },
                financials: {
                    where: {
                        tipo: 'ENTRADA',
                        classificacaoDRE: { in: ['1. Receita Operacional', '1. Receita Operacional (Resgate de Caução)', '1. RECEITA OPERACIONAL', '1. RECEITA OPERACIONAL (RESGATE DE CAUÇÃO)'] },
                        descricao: { contains: 'BM', mode: 'insensitive' }
                    },
                    orderBy: { dataVencimento: 'desc' }
                }
            }
        });
        return { success: true, project };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createContractEvent(data: { 
    projectId: number, 
    tipo: string, 
    descricao: string, 
    valorAdicional: number, 
    diasAdicionais: number, 
    status: string, 
    data?: string 
}) {
    try {
        const event = await prisma.contractEvent.create({
            data: {
                projectId: data.projectId,
                tipo: data.tipo,
                descricao: data.descricao,
                valorAdicional: data.valorAdicional,
                diasAdicionais: data.diasAdicionais,
                status: data.status,
                data: data.data ? new Date(data.data) : new Date()
            }
        });
        revalidatePath('/comercial');
        revalidatePath(`/comercial/${data.projectId}`);
        return { success: true, event };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteContractEvent(eventId: number, projectId: number) {
    try {
        await prisma.contractEvent.delete({
            where: { id: eventId }
        });
        revalidatePath('/comercial');
        revalidatePath(`/comercial/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
export async function createContractMeasurement(data: {
    projectId: number,
    numeroMedicao: string,
    dataMedicao: string,
    valorBruto: number,
    valorRetencao: number,
    valorImpostos: number,
    valorLiquido: number,
    status: string,
    expectedDate?: string
}) {
    try {
        const project = await prisma.project.findUnique({ where: { id: data.projectId } });
        if (!project) throw new Error("Projeto não encontrado");

        // Cria DIRETAMENTE no Financeiro (ENTRADA)
        const record = await prisma.financialRecord.create({
            data: {
                projectId: data.projectId,
                tipo: 'ENTRADA',
                classificacaoDRE: '1. Receita Operacional',
                centroCusto: project.name,
                clienteFornecedor: project.clientName || 'Cliente Obra',
                descricao: `BM${data.numeroMedicao.toString().padStart(2, '0')}`,
                valorBruto: Number(data.valorBruto),
                caucaoRetida: Number(data.valorRetencao),
                impostosRetidos: Number(data.valorImpostos),
                valorLiquido: Number(data.valorLiquido),
                status: data.status, // 'Recebido' ou 'A Receber'
                dataCompetencia: new Date(data.dataMedicao + 'T12:00:00'),
                dataVencimento: new Date(new Date(data.dataMedicao + 'T12:00:00').getTime() + 30 * 24 * 60 * 60 * 1000)
            }
        });

        revalidatePath(`/comercial/${data.projectId}`);
        revalidatePath(`/financeiro`);
        triggerObsidianSync();
        return { success: true, record };
    } catch (error: any) {
        console.error("Erro ao registrar medição no financeiro:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteContractMeasurement(id: number, projectId: number) {
    try {
        await prisma.financialRecord.delete({
            where: { id }
        });
        revalidatePath(`/comercial/${projectId}`);
        revalidatePath(`/financeiro`);
        triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function releaseRetention(data: { projectId: number, bmNumber: string, amount: number, date: string }) {
    try {
        const project = await prisma.project.findUnique({ where: { id: data.projectId } });
        if (!project) return { success: false, error: 'Projeto não encontrado' };

        await prisma.financialRecord.create({
            data: {
                projectId: data.projectId,
                tipo: 'ENTRADA',
                classificacaoDRE: '1. Receita Operacional (Resgate de Caução)',
                descricao: `Resgate de Retenção - BM ${data.bmNumber} - ${project.name}`,
                valorBruto: data.amount,
                caucaoRetida: 0,
                impostosRetidos: 0,
                valorLiquido: data.amount,
                status: 'A Receber',
                dataVencimento: new Date(data.date + 'T12:00:00'),
                dataCompetencia: new Date(data.date + 'T12:00:00')
            }
        });

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteProject(id: number) {
    try {
        await prisma.project.delete({
            where: { id }
        });
        revalidatePath('/');
        revalidatePath('/comercial');
        triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao deletar projeto:", error);
        return { success: false, error: error.message };
    }
}

export async function updateProjectStatus(id: number, newStatus: string) {
    try {
        await prisma.project.update({
            where: { id },
            data: { status: newStatus }
        });
        revalidatePath('/');
        revalidatePath('/comercial');
        triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        console.error("Erro ao atualizar status do projeto:", error);
        return { success: false, error: error.message };
    }
}

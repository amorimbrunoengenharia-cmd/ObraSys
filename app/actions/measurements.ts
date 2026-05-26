"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

export async function createContract(data: any, projectId: number) {
    console.log("Dados recebidos para createContract:", { data, projectId });
    try {
        await prisma.contract.create({
            data: {
                empresa: data.empresa,
                servico: data.servico,
                valorInicial: Number(data.valor),
                retencao: Number(data.retencao),
                status: 'Ativo',
                projectId: Number(projectId)
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao criar contrato:", e);
        return { success: false, error: e.message };
    }
}

export async function addContractItem(contractId: number, data: any) {
    console.log("Dados recebidos para addContractItem:", { contractId, data });
    try {
        const item = await prisma.contractItem.create({
            data: {
                desc: data.desc,
                unidade: data.unidade,
                qtd: Number(data.qtd),
                unitario: Number(data.unitario),
                total: Number(data.qtd) * Number(data.unitario),
                taskId: data.taskId ? Number(data.taskId) : null,
                contractId: Number(contractId)
            },
            include: { contract: true }
        });
        
        if (item.contract?.projectId) {
            revalidatePath(`/projeto/${item.contract.projectId}`);
        }
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao adicionar item ao contrato:", e);
        return { success: false, error: "Falha de persistência no Prisma: " + e.message };
    }
}

export async function createMeasurement(contractId: number, data: any) {
    console.log("Dados recebidos para createMeasurement:", { contractId, data });
    try {
        const measurement = await prisma.measurement.create({
            data: {
                ref: data.ref,
                periodo: data.periodo || 'Atual',
                data: new Date().toLocaleDateString('pt-BR'),
                bruto: Number(data.bruto),
                retencao: Number(data.retencao),
                iss: Number(data.iss || 0),
                inss: Number(data.inss || 0),
                liquido: Number(data.liquido),
                status: 'Em Análise',
                step: 1,
                breakdown: data.breakdown || null,
                contractId: Number(contractId)
            },
            include: { contract: { include: { project: true } } }
        });
        
        // Notificar Gerentes e Diretores sobre nova medição
        const managers = await prisma.user.findMany({
            where: { role: { in: ['Gerente de Obras', 'Diretor'] } }
        });
        if (managers.length > 0) {
            await prisma.notification.createMany({
                data: managers.map(u => ({
                    userId: u.id,
                    title: "Nova Medição Pendente",
                    message: `A Medição ${measurement.ref} do contrato de ${measurement.contract.empresa} está aguardando análise.`,
                    type: "MEASUREMENT",
                    isRead: false,
                    link: `/projeto/${measurement.contract.projectId}/financeiro`
                }))
            });
        }

        if (measurement.contract?.projectId) {
            revalidatePath(`/projeto/${measurement.contract.projectId}`);
        }
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao criar medição:", e);
        return { success: false, error: e.message };
    }
}

export async function addAdditive(contractId: number, data: any) {
    console.log("Dados recebidos para addAdditive:", { contractId, data });
    try {
        const additive = await prisma.contractAdditive.create({
            data: {
                valor: Number(data.valor),
                motivo: data.motivo,
                data: new Date().toLocaleDateString('pt-BR'),
                contractId: Number(contractId)
            },
            include: { contract: true }
        });
        
        if (additive.contract?.projectId) {
            revalidatePath(`/projeto/${additive.contract.projectId}`);
        }
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao adicionar aditivo:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteContract(contractId: number) {
    console.log("Dados recebidos para deleteContract:", { contractId });
    try {
        const contract = await prisma.contract.delete({ 
            where: { id: contractId } 
        });
        revalidatePath(`/projeto/${contract.projectId}`);
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao excluir contrato:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteContractItem(itemId: number) {
    console.log("Dados recebidos para deleteContractItem:", { itemId });
    try {
        const item = await prisma.contractItem.delete({ 
            where: { id: itemId },
            include: { contract: true }
        });
        if (item.contract?.projectId) {
            revalidatePath(`/projeto/${item.contract.projectId}`);
        }
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao excluir item do contrato:", e);
        return { success: false, error: e.message };
    }
}
export async function updateContractItem(itemId: number, data: any) {
    console.log("Dados recebidos para updateContractItem:", { itemId, data });
    try {
        const item = await prisma.contractItem.update({
            where: { id: Number(itemId) },
            data: {
                desc: data.desc,
                unidade: data.unidade,
                qtd: Number(data.qtd),
                unitario: Number(data.unitario),
                total: Number(data.qtd) * Number(data.unitario),
                taskId: data.taskId ? Number(data.taskId) : null
            },
            include: { contract: true }
        });
        
        if (item.contract?.projectId) {
            revalidatePath(`/projeto/${item.contract.projectId}`);
        }
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao atualizar item do contrato:", e);
        return { success: false, error: e.message };
    }
}
export async function approveMeasurement(measurementId: number) {
    console.log("Dados recebidos para approveMeasurement:", { measurementId });
    try {
        const measurement = await prisma.measurement.update({
            where: { id: Number(measurementId) },
            data: { status: 'Aprovado' },
            include: { contract: { include: { project: true } } }
        });

        const project = measurement.contract.project;
        
        // Detecta se é um contrato de Receita (Cliente) ou Despesa (Fornecedor)
        const empresaNome = (measurement.contract.empresa || "").toLowerCase();
        const clientProjectName = (project.clientName || "").toLowerCase();
        
        const isClient = empresaNome.includes('cliente') || 
                         (clientProjectName && empresaNome === clientProjectName);
        
        const tipo = isClient ? 'ENTRADA' : 'SAÍDA';
        const classificacao = isClient ? '1. RECEITA OPERACIONAL' : '3. CUSTO DIRETO - MÃO DE OBRA';

        // Cria registro financeiro (DRE) automático COM rastreabilidade
        if (project.id) {
            // Verifica se já existe um FinancialRecord vinculado a esta medição (evita duplicatas)
            const existing = await prisma.financialRecord.findFirst({
                where: { measurementId: Number(measurementId) }
            });

            if (!existing) {
                await prisma.$transaction(async (tx) => {
                    await tx.financialRecord.create({
                        data: {
                            tipo: tipo,
                            classificacaoDRE: classificacao,
                            descricao: `BM ${measurement.ref} - ${measurement.contract.empresa}`,
                            clienteFornecedor: measurement.contract.empresa,
                            valorBruto: measurement.bruto,
                            caucaoRetida: measurement.retencao,
                            iss: measurement.iss || 0,
                            inss: measurement.inss || 0,
                            impostosRetidos: (measurement.iss || 0) + (measurement.inss || 0),
                            valorLiquido: measurement.liquido,
                            status: isClient ? 'A RECEBER' : 'A PAGAR',
                            dataCompetencia: new Date(),
                            dataVencimento: new Date(new Date().getTime() + 15 * 86400000),
                            centroCusto: project.name,
                            cidade: project.city || '',
                            estado: project.state || '',
                            projectId: project.id,
                            measurementId: Number(measurementId) // RASTREABILIDADE
                        }
                    });

                    // Incrementa o custo acumulado (spent) se for uma despesa (SAÍDA)
                    if (tipo === 'SAÍDA') {
                        await tx.project.update({
                            where: { id: project.id },
                            data: { spent: { increment: measurement.bruto } }
                        });
                    }
                });
            }

            // Notificar Financeiro e Engenheiro
            const financeUsers = await prisma.user.findMany({
                where: { role: { in: ['Gerente Financeiro', 'Diretor'] } }
            });
            const notifyList = new Set(financeUsers.map(u => u.id));
            if (project.engineerId) notifyList.add(project.engineerId);

            if (notifyList.size > 0) {
                await prisma.notification.createMany({
                    data: Array.from(notifyList).map(userId => ({
                        userId,
                        title: "Medição Aprovada",
                        message: `A Medição ${measurement.ref} de ${measurement.contract.empresa} foi aprovada e integrada ao financeiro.`,
                        type: "FINANCIAL",
                        isRead: false,
                        link: `/projeto/${project.id}/financeiro`
                    }))
                });
            }
            
            revalidatePath(`/projeto/${project.id}`);
        }
        
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao aprovar medição:", e);
        return { success: false, error: "Erro na integração financeira: " + e.message };
    }
}

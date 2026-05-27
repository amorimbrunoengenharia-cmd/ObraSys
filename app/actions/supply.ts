"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../../lib/permissions';

async function checkBudgetLimit(projectId: number, dreCategory: string, requestedAmount: number) {
    if (!dreCategory) return { isOver: false, budget: 0, currentSpent: 0 };
    
    const budgetItem = await prisma.budgetItem.findFirst({
        where: {
            projectId: projectId,
            classificacaoDRE: { contains: dreCategory }
        }
    });
    
    if (!budgetItem) return { isOver: false, budget: 0, currentSpent: 0 };
    
    const financials = await prisma.financialRecord.findMany({
        where: {
            projectId: projectId,
            classificacaoDRE: budgetItem.classificacaoDRE,
            tipo: 'SAÍDA',
            status: { not: 'CANCELADO' }
        },
        select: { valorBruto: true }
    });
    
    const currentSpent = financials.reduce((sum, r) => sum + r.valorBruto, 0);
    const limit = budgetItem.valorOrcado;
    
    return {
        isOver: (currentSpent + requestedAmount) > limit,
        budget: limit,
        currentSpent
    };
}

export async function getSupplyData() {
    try {
        const cookieStore = await cookies();
        const rawUserRole = cookieStore.get('userRole')?.value || '';
        const rawUserEmail = cookieStore.get('userEmail')?.value || '';
        const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
        const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

        let projectFilter: any = {};
        if (shouldFilterProjects(userRole)) {
            const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
            if (userRole === 'Cliente / Investidor') {
                projectFilter = { clientName: userObj?.name || '---' };
            } else if (userObj) {
                projectFilter = {
                    OR: [
                        { employees: { some: { userId: userObj.id } } },
                        { engineerId: userObj.id },
                        { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
                    ]
                };
            } else {
                projectFilter = { id: -1 };
            }
        }

        const projectIds = projectFilter.id === -1 ? [-1] : Object.keys(projectFilter).length > 0 ? (await prisma.project.findMany({ where: projectFilter, select: { id: true } })).map(p => p.id) : null;
        
        const relationFilter = projectIds ? { projectId: { in: projectIds } } : {};

        const orders = await prisma.purchaseOrder.findMany({
            where: relationFilter,
            include: {
                project: true,
                supplier: true,
                purchaseRequest: { include: { items: { include: { material: true } } } },
                items: { include: { material: true, invoiceItems: true } },
                invoices: { include: { items: { include: { purchaseOrderItem: { include: { material: true } } } } }, orderBy: { receivedAt: 'desc' } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const requests = await prisma.purchaseRequest.findMany({
            where: relationFilter,
            include: { items: { include: { material: true } }, project: true, supplier: true, quotations: { include: { supplier: true } } },
            orderBy: { createdAt: 'desc' }
        });

        const inventory = await prisma.inventoryItem.findMany({
            where: relationFilter,
            include: { project: true, linkedMaterial: true },
            orderBy: { materialName: 'asc' }
        });

        const projects = await prisma.project.findMany({ 
            where: projectFilter,
            select: { id: true, name: true, city: true, state: true, address: true },
            orderBy: { name: 'asc' }
        });
        const materials = await prisma.material.findMany({ orderBy: { code: 'asc' }});
        const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' }});
        
        // (Contact was removed, we use Supplier instead, returning empty to not break UI)
        const contacts: any[] = [];

        const sectors = await prisma.sector.findMany({ orderBy: { name: 'asc' }});
        const dreCategories = await prisma.financialCategory.findMany({ orderBy: { name: 'asc' }});

        const setting = await prisma.systemSetting.findUnique({ where: { key: 'PURCHASE_APPROVAL_RULES' } });
        const approvalRules = setting ? JSON.parse(setting.value) : null;

        return { 
            orders, 
            requests, 
            inventory, 
            projects, 
            materials, 
            suppliers, 
            contacts, // Retornando contatos também
            sectors, 
            dreCategories,
            approvalRules
        };
    } catch (e: any) {
        console.error("Erro ao buscar dados de suprimentos:", e);
        throw new Error("Falha ao carregar dados.");
    }
}

export async function createSupplier(data: { 
    name: string, 
    type?: string,
    cnpj?: string, 
    email?: string,
    phone?: string,
    address?: string,
    defaultDreCategory?: string 
}) {
    try {
        const supplier = await prisma.supplier.create({
            data: {
                name: data.name,
                type: data.type || "FORNECEDOR",
                cnpj: data.cnpj || null,
                email: data.email || null,
                phone: data.phone || null,
                address: data.address || null,
                defaultDreCategory: data.defaultDreCategory || null
            }
        });
        revalidatePath('/suprimentos');
        revalidatePath('/financeiro');
        return { success: true, supplier };
    } catch (e: any) {
        if (e.code === 'P2002') return { success: false, error: "Já existe uma empresa com este nome ou CNPJ." };
        return { success: false, error: e.message };
    }
}

export async function receivePurchaseRequest(requestId: string, numInstallments: number = 1, intervalDays: number = 30, invoicePhotoUrl?: string) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Busca os detalhes da solicitação
            const request = await tx.purchaseRequest.findUnique({
                where: { id: requestId },
                include: { 
                    items: { include: { material: true } }, 
                    project: true,
                    supplier: true
                }
            });

            if (!request) {
                return { error: "Pedido não localizado no banco" };
            }
            
            if (request.status === 'ENTREGUE') {
                return { error: "Esta solicitação já foi entregue" };
            }

            // 2. Atualiza status da solicitação
            await tx.purchaseRequest.update({
                where: { id: requestId },
                data: { 
                    status: 'ENTREGUE',
                    invoicePhotoUrl: invoicePhotoUrl || null
                }
            });

            // Notificar o Engenheiro responsável
            if (request.project?.engineerId) {
                await tx.notification.create({
                    data: {
                        userId: request.project.engineerId,
                        title: "Material Entregue na Obra",
                        message: `O pedido ${request.requestCode} de ${request.items.map(i => i.material.name).join(', ')} acabou de chegar.`,
                        type: "SUCCESS",
                        link: `/projeto/${request.projectId}?tab=suprimentos`
                    }
                });
            }

            // 3. Atualiza ou cria item no estoque e gera logs de entrada
            for (const item of request.items) {
                const existingItem = await tx.inventoryItem.findFirst({
                    where: {
                        projectId: request.projectId,
                        materialId: item.materialId
                    }
                });

                if (existingItem) {
                    await tx.inventoryItem.update({
                        where: { id: existingItem.id },
                        data: { quantidadeAtual: { increment: item.quantity } }
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: {
                            projectId: Number(request.projectId),
                            materialId: item.materialId,
                            materialName: item.material?.name || 'Item do Catálogo',
                            quantidadeAtual: item.quantity,
                            unidade: item.material?.unit || 'UN',
                            estoqueMinimo: 0 
                        }
                    });
                }

                // REGISTRAR LOG DE ENTRADA
                await tx.inventoryLog.create({
                    data: {
                        tipo: 'ENTRADA',
                        item: item.material?.name || 'Item do Catálogo',
                        quantidade: `${item.quantity} ${item.material?.unit || 'UN'}`,
                        responsavel: request.requesterName || 'Almoxarife',
                        data: new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                        projectId: request.projectId
                    }
                });
            }

            // 4. Cria registros no Financeiro (Task 7.2) - Apenas se não existirem
            const existingFinance = await tx.financialRecord.findFirst({
                where: { purchaseRequestId: request.id }
            });

            if (!existingFinance) {
                const totalValue = request.items.reduce((sum, i) => sum + (i.estimatedCost || 0), 0);
                const installmentValue = totalValue / numInstallments;
                
                for (let i = 0; i < numInstallments; i++) {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + (i * intervalDays));

                    await tx.financialRecord.create({
                        data: {
                            tipo: 'SAÍDA',
                            descricao: numInstallments > 1 
                                ? `Pagamento ${i + 1}/${numInstallments} - Pedido ${request.requestCode} - ${request.items.map(it => it.material.name).join(', ')}`
                                : `Pagamento - Pedido ${request.requestCode} - ${request.items.map(it => it.material.name).join(', ')}`,
                            valorBruto: installmentValue,
                            impostosRetidos: 0,
                            valorLiquido: installmentValue,
                            status: 'A Vencer',
                            classificacaoDRE: request.dreCategory || '2. Custo Direto - Materiais',
                            clienteFornecedor: request.supplier?.name || 'Fornecedor de Insumos',
                            setor: request.sector || 'Obras',
                            cidade: request.project.city || null,
                            estado: request.project.state || null,
                            projectId: request.projectId,
                            dataCompetencia: new Date(),
                            dataVencimento: dueDate,
                            purchaseRequestId: request.id
                        }
                    });
                }

                // Atualizar o spent da obra com o valor da compra
                await tx.project.update({
                    where: { id: request.projectId },
                    data: { spent: { increment: totalValue } }
                });
            }

            return { success: true };
        });

        revalidatePath('/suprimentos');
        return result;
    } catch (e: any) {
        console.error("ERRO NO BANCO (receivePurchaseRequest):", e);
        return { error: "ERRO NO BANCO: " + e.message };
    }
}

export async function createPurchaseOrder(data: any, userName: string) {
    return { success: false, error: "Deprecated" };
}

export async function getMaterials() {
    return await prisma.material.findMany({
        orderBy: { code: 'asc' }
    });
}

export async function getPurchaseRequests() {
    return await prisma.purchaseRequest.findMany({
        include: { 
            items: { include: { material: true } }, 
            project: true 
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function approvePurchaseRequest(purchaseRequestId: string, userName?: string) {
    try {
        const pr = await prisma.purchaseRequest.update({
            where: { id: purchaseRequestId },
            data: { 
                status: 'APROVADO',
                scApprovedBy: userName || 'Sistema',
                scApprovedAt: new Date()
            }
        });
        revalidatePath('/suprimentos');
        return { success: true, pr };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createPurchaseRequest(data: any) {
    try {
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0 || !data.projectId) {
            throw new Error("Itens e Obra são campos obrigatórios.");
        }

        const cookieStore = await cookies();
        const userEmail = decodeURIComponent(cookieStore.get('userEmail')?.value || '');
        const user = await prisma.user.findUnique({ where: { email: userEmail }});
        
        let initialStatus = 'PENDENTE';
        if (user && user.role === 'Engenheiro Residente') {
            const project = await prisma.project.findUnique({ where: { id: Number(data.projectId) }});
            // Approve automatically only if the user is the engineer of this project
            if (project && project.engineerId === user.id) {
                initialStatus = 'APROVADO';
            }
        }

        // Validação de limite orçamentário
        const totalEstimated = data.items.reduce((sum: number, it: any) => sum + (parseFloat(it.quantidade) * (parseFloat(it.valorEstimado) || 0)), 0);
        if (data.dreCategory) {
            const budgetCheck = await checkBudgetLimit(Number(data.projectId), data.dreCategory, totalEstimated);
            if (budgetCheck.isOver) {
                initialStatus = 'PENDENTE_ESTOURO_ORCAMENTO';
            }
        }

        // Gera código SC-2026-XXX
        const count = await prisma.purchaseRequest.count();
        const year = new Date().getFullYear();
        const code = `SC-${year}-${(count + 1).toString().padStart(3, '0')}`;

        const request = await prisma.purchaseRequest.create({
            data: {
                requestCode: code,
                projectId: Number(data.projectId),
                requesterName: data.requesterName || 'Sistema',
                status: initialStatus,
                supplierId: data.supplierId || null,
                sector: data.sector || null,
                dreCategory: data.dreCategory || null,
                items: {
                    create: data.items.map((item: any) => ({
                        materialId: item.materialId,
                        quantity: parseFloat(item.quantidade),
                        estimatedCost: parseFloat(item.valorEstimado) || 0,
                        urgency: item.urgencia || "BAIXA"
                    }))
                }
            },
            include: { project: true, items: { include: { material: true } } }
        });

        // Notificar Suprimentos e Diretoria
        try {
            const notifyUsers = await prisma.user.findMany({
                where: { role: { in: ['Suprimentos', 'Diretor'] } }
            });
            if (notifyUsers.length > 0) {
                await prisma.notification.createMany({
                    data: notifyUsers.map(u => ({
                        userId: u.id,
                        title: initialStatus === 'PENDENTE_ESTOURO_ORCAMENTO' ? "⚠️ Estouro de Orçamento" : "Nova Solicitação de Compra",
                        message: initialStatus === 'PENDENTE_ESTOURO_ORCAMENTO'
                            ? `A obra ${request.project?.name} solicitou itens no valor de R$ ${totalEstimated.toFixed(2)} na linha ${data.dreCategory}, estourando o limite orçado! (Req: ${code})`
                            : `A obra ${request.project?.name} solicitou ${request.items.length} item(ns). (Req: ${code})`,
                        type: initialStatus === 'PENDENTE_ESTOURO_ORCAMENTO' ? "ERROR" : "INFO",
                        link: "/suprimentos"
                    }))
                });
            }
        } catch(err) { console.error("Erro na notificação", err); }

        revalidatePath('/suprimentos');
        return { success: true, request };
    } catch (e: any) {
        console.error("Erro ao criar solicitação:", e);
        return { success: false, error: e.message };
    }
}

export async function createMaterial(data: any) {
    try {
        const material = await prisma.material.create({
            data: {
                code: data.code,
                name: data.name,
                unit: data.unit,
                category: data.category
            }
        });
        revalidatePath('/suprimentos');
        return { success: true, material };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function receivePurchaseOrder(orderId: number) {
    return { success: false, error: "Deprecated" };
}

export async function updatePurchaseRequestStatus(requestId: string, newStatus: string, userRole?: string) {
    try {
        const req = await prisma.purchaseRequest.findUnique({
            where: { id: requestId },
            include: { items: true }
        });

        if ((newStatus.toUpperCase() === 'APROVADA' || newStatus.toUpperCase() === 'APROVADO') && req) {
            // Se estava com estouro de orçamento, exige cargo de Diretor
            if (req.status === 'PENDENTE_ESTOURO_ORCAMENTO') {
                if (userRole?.toUpperCase() !== 'DIRETOR') {
                    return { success: false, error: `Esta compra estourou o orçamento do projeto. Apenas o cargo de Diretor pode autorizar esta liberação.` };
                }
            }

            const totalValue = req.items.reduce((acc: number, it: any) => acc + (it.quantity * (it.estimatedCost || 0)), 0) || 0;
            
            const setting = await prisma.systemSetting.findUnique({ where: { key: 'PURCHASE_APPROVAL_RULES' } });
            if (setting && setting.value) {
                const rules = JSON.parse(setting.value);
                if (rules.enabled && Array.isArray(rules.levels)) {
                    const sortedRules = rules.levels.sort((a: any, b: any) => b.limit - a.limit);
                    const applicableRule = sortedRules.find((r: any) => totalValue >= r.limit);
                    
                    if (applicableRule) {
                        const approvers = applicableRule.roles.map((r: string) => r.trim().toUpperCase());
                        const currentRole = (userRole || '').trim().toUpperCase();
                        if (!approvers.includes(currentRole) && currentRole !== 'DIRETOR' && currentRole !== 'DIRECTOR') {
                            return { success: false, error: `Seu cargo (${userRole}) não tem alçada para aprovar compras de R$ ${totalValue.toFixed(2)}. Cargos permitidos: ${applicableRule.roles.join(', ')}` };
                        }
                    }
                }
            }
        }

        await prisma.purchaseRequest.update({
            where: { id: requestId },
            data: { status: newStatus }
        });
        revalidatePath('/suprimentos');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function registerMaterialConsumption(data: {
    inventoryItemId: number;
    quantity: number;
    appliedAt?: string;
    responsible?: string;
}) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.inventoryItem.findUnique({
                where: { id: data.inventoryItemId }
            });

            if (!item) return { error: "Item de estoque não encontrado" };
            if (item.quantidadeAtual < data.quantity) {
                return { error: `Saldo insuficiente. Disponível: ${item.quantidadeAtual} ${item.unidade}` };
            }

            // Baixa no estoque
            await tx.inventoryItem.update({
                where: { id: item.id },
                data: { quantidadeAtual: { decrement: data.quantity } }
            });

            // Registro de consumo
            await tx.materialConsumption.create({
                data: {
                    inventoryItemId: item.id,
                    projectId: item.projectId,
                    quantityUsed: data.quantity,
                    appliedAt: data.appliedAt,
                    responsible: data.responsible
                }
            });

            return { success: true };
        });

        revalidatePath('/suprimentos');
        return result;
    } catch (e: any) {
        console.error("Erro ao registrar consumo:", e);
        return { error: "Erro interno: " + e.message };
    }
}

export async function registerConsumption(formData: FormData) {
    const inventoryItemId = parseInt(formData.get("inventoryItemId") as string);
    const quantity = parseFloat(formData.get("quantity") as string);
    const appliedAt = formData.get("appliedAt") as string;
    const responsible = formData.get("responsible") as string;
    const projectId = parseInt(formData.get("projectId") as string);

    if (isNaN(inventoryItemId) || isNaN(quantity) || quantity <= 0) {
        return { error: "Dados inválidos." };
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            const item = await tx.inventoryItem.findUnique({
                where: { id: inventoryItemId }
            });

            if (!item) return { error: "Item não encontrado no estoque." };
            if (item.quantidadeAtual < quantity) {
                return { error: `Saldo insuficiente. Disponível: ${item.quantidadeAtual} ${item.unidade}` };
            }

            // Baixa no estoque
            await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: { quantidadeAtual: { decrement: quantity } }
            });

            // Registro na tabela MaterialConsumption
            await tx.materialConsumption.create({
                data: {
                    inventoryItemId,
                    projectId: item.projectId,
                    quantityUsed: quantity,
                    appliedAt,
                    responsible
                }
            });

            // Criar log no InventoryLog (legado) para manter os componentes atuais funcionando
            await tx.inventoryLog.create({
                data: {
                    tipo: 'SAÍDA',
                            classificacaoDRE: 'Despesas com Materiais',
                    item: item.materialName,
                    quantidade: `${quantity} ${item.unidade}`,
                    responsavel: responsible || 'Almoxarifado',
                    data: new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                    projectId: item.projectId
                }
            });

            return { success: true };
        });

        revalidatePath(`/projeto/${projectId}`);
        revalidatePath('/suprimentos');
        return result;
    } catch (e: any) {
        console.error("Erro ao registrar consumo:", e);
        return { error: "Erro interno: " + e.message };
    }
}


export async function reviewPurchaseRequest(id: string, decision: 'APROVAR' | 'RECUSAR') {
    try {
        const status = decision === 'APROVAR' ? 'APROVADO' : 'RECUSADO';
        const financialStatus = decision === 'APROVAR' ? 'A PAGAR' : 'CANCELADO';

        const cookieStore = await cookies();
        const rawUserRole = cookieStore.get('userRole')?.value || '';
        const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';

        await prisma.$transaction(async (tx) => {
            // 1. Busca detalhes da solicitação
            const request = await tx.purchaseRequest.findUnique({
                where: { id },
                include: { items: { include: { material: true } }, project: true, supplier: true }
            });

            if (!request) throw new Error("Solicitação não encontrada.");

            // Se for aprovação e tiver estouro de orçamento, somente Diretor pode aprovar
            if (decision === 'APROVAR' && request.status === 'PENDENTE_ESTOURO_ORCAMENTO') {
                if (userRole.toUpperCase() !== 'DIRETOR' && userRole.toUpperCase() !== 'DIRECTOR') {
                    throw new Error("Esta solicitação estourou o orçamento da obra. Apenas um Diretor pode aprová-la.");
                }
            }

            // Hierarquia de Aprovações (Regras de Negócio)
            if (decision === 'APROVAR') {
                const totalValue = request.items.reduce((acc: number, it: any) => acc + (it.quantity * (it.estimatedCost || 0)), 0) || 0;
                const setting = await tx.systemSetting.findUnique({ where: { key: 'PURCHASE_APPROVAL_RULES' } });
                
                if (setting && setting.value) {
                    const rules = JSON.parse(setting.value);
                    if (rules.enabled && Array.isArray(rules.levels)) {
                        const sortedRules = rules.levels.sort((a: any, b: any) => b.limit - a.limit);
                        const applicableRule = sortedRules.find((r: any) => totalValue >= r.limit);
                        
                        if (applicableRule) {
                            const approvers = applicableRule.roles.map((r: string) => r.trim().toUpperCase());
                            const currentRole = userRole.trim().toUpperCase();
                            if (!approvers.includes(currentRole) && currentRole !== 'DIRETOR' && currentRole !== 'DIRECTOR') {
                                throw new Error(`Seu cargo (${userRole}) não tem alçada para aprovar compras de R$ ${totalValue.toFixed(2)}. Cargos permitidos: ${applicableRule.roles.join(', ')}`);
                            }
                        }
                    }
                }
            }

            // 2. Atualiza a solicitação
            await tx.purchaseRequest.update({
                where: { id },
                data: { status }
            });

            // Notificar Engenheiro da Obra e Diretoria
            const notifyUsers = new Set<number>();
            if (request.project?.engineerId) notifyUsers.add(request.project.engineerId);
            const diretores = await tx.user.findMany({ where: { role: 'Diretor' } });
            diretores.forEach(d => notifyUsers.add(d.id));

            if (notifyUsers.size > 0) {
                await tx.notification.createMany({
                    data: Array.from(notifyUsers).map(userId => ({
                        userId,
                        title: `Solicitação ${decision === 'APROVAR' ? 'Aprovada' : 'Recusada'}`,
                        message: `O pedido ${request.requestCode} de ${request.items.map(i => i.material.name).join(', ')} foi ${decision === 'APROVAR' ? 'aprovado' : 'recusado'} pelo setor de Suprimentos.`,
                        type: decision === 'APROVAR' ? "SUCCESS" : "ERROR",
                        link: `/projeto/${request.projectId}?tab=suprimentos`
                    }))
                });
            }

            // 3. Verifica se já existem registros financeiros
            const existingRecords = await tx.financialRecord.findMany({
                where: { purchaseRequestId: id }
            });

            const totalVal = request.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0);

            if (existingRecords.length > 0) {
                // Atualiza existentes
                await tx.financialRecord.updateMany({
                    where: { purchaseRequestId: id },
                    data: { status: financialStatus }
                });
                
                // Se o status anterior era diferente de A PAGAR e agora mudou para A PAGAR, incrementa spent
                const wasNotPaid = existingRecords.some(r => r.status !== 'A PAGAR' && r.status !== 'Pago');
                if (decision === 'APROVAR' && wasNotPaid) {
                    await tx.project.update({
                        where: { id: request.projectId },
                        data: { spent: { increment: totalVal } }
                    });
                } else if (decision === 'RECUSAR') {
                    // Se cancelou, decrementa
                    await tx.project.update({
                        where: { id: request.projectId },
                        data: { spent: { decrement: totalVal } }
                    });
                }
            } else if (decision === 'APROVAR') {
                // Cria novo registro financeiro se for aprovado e não existir
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // Prazo padrão de 30 dias

                await tx.financialRecord.create({
                    data: {
                        purchaseRequestId: id,
                        tipo: 'SAÍDA',
                        descricao: `Pagamento - Pedido ${request.requestCode} - ${request.items.map(i => i.material.name).join(', ')}`,
                        valorBruto: totalVal,
                        impostosRetidos: 0,
                        valorLiquido: totalVal,
                        status: financialStatus,
                        classificacaoDRE: request.dreCategory || '2. Custo Direto - Materiais',
                        clienteFornecedor: request.supplier?.name || 'Fornecedor de Insumos',
                        setor: request.sector || 'Obras',
                        cidade: request.project.city || null,
                        state: request.project.state || null,
                        projectId: request.projectId,
                        dataVencimento: dueDate
                    }
                });

                // Atualizar o spent do projeto
                await tx.project.update({
                    where: { id: request.projectId },
                    data: { spent: { increment: totalVal } }
                });
            }
        });

        revalidatePath('/');
        revalidatePath('/suprimentos');
        revalidatePath('/financeiro');
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao revisar solicitação:", e);
        return { success: false, error: e.message };
    }
}
export async function saveQuotations(requestId: string, quotes: any[]) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Remove cotações antigas deste pedido (limpeza para re-cotação)
            await tx.quotation.deleteMany({
                where: { purchaseRequestId: requestId }
            });

            // 2. Cria as novas cotações
            for (const q of quotes) {
                await tx.quotation.create({
                    data: {
                        purchaseRequestId: requestId,
                        supplierName: q.supplierName,
                        supplierId: q.supplierId || null,
                        unitPrice: Number(q.unitPrice),
                        totalPrice: Number(q.totalPrice),
                        deliveryDays: Number(q.deliveryDays),
                        paymentTerms: q.paymentTerms || "30 dias",
                        attachmentUrl: q.attachmentUrl || null,
                        createdBy: q.userName || "Sistema",
                        isWinner: false
                    }
                });
            }

            // 3. Atualiza status do pedido
            await tx.purchaseRequest.update({
                where: { id: requestId },
                data: { status: 'EM_COTACAO' }
            });
        });

        revalidatePath('/suprimentos');
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao salvar cotações:", e);
        return { success: false, error: e.message };
    }
}

export async function selectWinningQuote(quoteId: string, userName?: string) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Busca a cotação vencedora
            const winner = await tx.quotation.findUnique({
                where: { id: quoteId },
                include: { 
                    purchaseRequest: {
                        include: { project: true, items: { include: { material: true } }, supplier: true }
                    } 
                }
            });

            if (!winner) throw new Error("Cotação não localizada.");

            // 2. Desmarca qualquer outro vencedor deste pedido
            await tx.quotation.updateMany({
                where: { purchaseRequestId: winner.purchaseRequestId },
                data: { isWinner: false }
            });

            // 3. Marca esta como vencedora
            await tx.quotation.update({
                where: { id: quoteId },
                data: { 
                    isWinner: true,
                    updatedBy: userName || "Sistema"
                }
            });

            // 4. Atualiza o pedido original para aguardar aprovação financeira
            await tx.purchaseRequest.update({
                where: { id: winner.purchaseRequestId },
                data: { 
                    status: 'AGUARDANDO_APROVACAO_FINANCEIRA',
                    supplierId: winner.supplierId
                }
            });

            // 5. Notificar os aprovadores baseados no limite de TI
            const setting = await tx.systemSetting.findUnique({
                where: { key: 'PURCHASE_APPROVAL_RULES' }
            });
            
            if (setting) {
                const rules = JSON.parse(setting.value);
                if (rules.enabled) {
                    let targetRoles: string[] = [];
                    for (const level of rules.levels) {
                        if (winner.totalPrice > level.limit) {
                            targetRoles = level.roles;
                        } else if (winner.totalPrice <= level.limit && targetRoles.length === 0) {
                            targetRoles = level.roles;
                        }
                    }

                    if (targetRoles.length > 0) {
                        const approvers = await tx.user.findMany({
                            where: { 
                                role: { in: targetRoles },
                                OR: [
                                    { role: { in: ['Diretor', 'Director'] } }, // Diretores vêem tudo
                                    { id: winner.purchaseRequest.project.engineerId || -1 }, // O próprio engenheiro se for o caso
                                    { employee: { projects: { some: { id: winner.purchaseRequest.projectId } } } } // Alocado na obra (Gerente, etc)
                                ]
                            }
                        });
                        if (approvers.length > 0) {
                            await tx.notification.createMany({
                                data: approvers.map(u => ({
                                    userId: u.id,
                                    title: "Aprovação Financeira Pendente",
                                    message: `A Cotação da SC ${winner.purchaseRequest.requestCode} (R$ ${winner.totalPrice.toFixed(2)}) aguarda sua aprovação.`,
                                    type: "WARNING",
                                    link: "/suprimentos"
                                }))
                            });
                        }
                    }
                }
            }

            return { success: true };
        });

        revalidatePath('/suprimentos');
        revalidatePath('/financeiro');
        return result;
    } catch (e: any) {
        console.error("Erro ao selecionar vencedor:", e);
        return { success: false, error: e.message };
    }
}

export async function approveFinancialQuotation(purchaseRequestId: string, userName?: string) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const pr = await tx.purchaseRequest.update({
                where: { id: purchaseRequestId },
                data: { 
                    status: 'COTADA',
                    financialApprovedBy: userName || 'Sistema',
                    financialApprovedAt: new Date()
                },
                include: { items: { include: { material: true } }, project: true, quotations: { where: { isWinner: true } } }
            });

            const winner = pr.quotations[0];
            if (!winner) throw new Error("Cotação vencedora não encontrada.");

            const buyers = await tx.user.findMany({ where: { role: 'Comprador' } });
            if (buyers.length > 0) {
                await tx.notification.createMany({
                    data: buyers.map(u => ({
                        userId: u.id,
                        title: "Cotação Aprovada",
                        message: `A Cotação do Pedido ${pr.requestCode} foi aprovada. Ordem de compra liberada.`,
                        type: "INFO",
                        link: "/suprimentos"
                    }))
                });
            }

            return pr;
        });

        revalidatePath('/suprimentos');
        return { success: true, result };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function emitPurchaseOrder(purchaseRequestId: string, userName: string) {
    try {
        const pr = await prisma.purchaseRequest.findUnique({
            where: { id: purchaseRequestId },
            include: { items: { include: { material: true } }, project: true, quotations: { where: { isWinner: true } } }
        });

        if (!pr) throw new Error("Solicitação de Compra não encontrada.");
        if (pr.status !== 'COTADA') throw new Error("A Solicitação precisa estar COTADA (Financeiro Aprovado) para emitir Ordem de Compra.");
        
        const winnerQuote = pr.quotations[0];
        if (!winnerQuote) throw new Error("Nenhuma cotação vencedora encontrada.");

        const orderCode = `OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;

        const po = await prisma.purchaseOrder.create({
            data: {
                orderCode,
                purchaseRequestId: pr.id,
                projectId: pr.projectId,
                supplierId: winnerQuote.supplierId,
                totalCost: winnerQuote.totalPrice,
                paymentTerms: winnerQuote.paymentTerms,
                status: 'COMPRADO',
                items: {
                    create: pr.items.map(item => ({
                        materialId: item.materialId,
                        quantityPurchased: item.quantity,
                        unitPrice: item.estimatedCost / (item.quantity || 1),
                        quantityReceived: 0,
                        requestItemId: item.id
                    }))
                }
            }
        });

        // Gera o Contas a Pagar (FinancialRecord)
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        let parsedCity = pr.project.city || null;
        let parsedState = pr.project.state || null;
        if (!parsedCity && !parsedState && pr.project.address) {
            try {
                const addr = JSON.parse(pr.project.address);
                parsedCity = addr.city || null;
                parsedState = addr.state || null;
            } catch(e){}
        }

        await prisma.financialRecord.create({
            data: {
                purchaseRequestId: pr.id,
                tipo: 'SAÍDA',
                descricao: `Compra Aprovada - Pedido ${pr.requestCode} - ${pr.items.map((i: any) => i.material.name).join(', ')}`,
                valorBruto: winnerQuote.totalPrice,
                impostosRetidos: 0,
                valorLiquido: winnerQuote.totalPrice,
                status: 'PREVISTO',
                classificacaoDRE: pr.dreCategory || '2. Custo Direto - Materiais',
                clienteFornecedor: winnerQuote.supplierName || 'Fornecedor',
                setor: pr.sector || 'Obras',
                cidade: parsedCity,
                estado: parsedState,
                projectId: pr.projectId,
                dataVencimento: dueDate,
                dataCompetencia: new Date()
            }
        });

        // Notifica Financeiro
        const financeUsers = await prisma.user.findMany({
            where: { role: { in: ['Financeiro', 'Diretor'] } }
        });
        if (financeUsers.length > 0) {
            await prisma.notification.createMany({
                data: financeUsers.map(u => ({
                    userId: u.id,
                    title: "Nova Compra Emitida",
                    message: `A OC ${orderCode} (Pedido ${pr.requestCode}) gerou um Contas a Pagar de R$ ${winnerQuote.totalPrice.toFixed(2)}.`,
                    type: "INFO",
                    link: "/financeiro"
                }))
            });
        }

        await prisma.purchaseRequest.update({
            where: { id: pr.id },
            data: { status: 'ORDEM_EMITIDA' }
        });

        revalidatePath('/suprimentos');
        return { success: true, order: po };
    } catch(e: any) {
        console.error("Erro ao emitir Ordem de Compra:", e);
        return { success: false, error: e.message };
    }
}

export async function receiveInvoice(data: {
    purchaseOrderId: string;
    invoiceNumber: string;
    accessKey?: string;
    receiverName: string;
    invoicePhotoUrl?: string;
    items: { purchaseOrderItemId: string; quantityReceived: number }[];
    numInstallments: number;
    intervalDays: number;
}) {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const order = await tx.purchaseOrder.findUnique({
                where: { id: data.purchaseOrderId },
                include: { items: { include: { material: true } }, project: true, purchaseRequest: true }
            });

            if (!order) throw new Error("Ordem de Compra não encontrada");

            // 1. Criar Nota Fiscal (Invoice)
            const invoice = await tx.invoice.create({
                data: {
                    purchaseOrderId: order.id,
                    invoiceNumber: data.invoiceNumber,
                    accessKey: data.accessKey,
                    receiverName: data.receiverName,
                    invoicePhotoUrl: data.invoicePhotoUrl,
                    items: {
                        create: data.items.map(i => ({
                            purchaseOrderItemId: i.purchaseOrderItemId,
                            quantityReceived: i.quantityReceived
                        }))
                    }
                }
            });

            let partialTotal = 0;
            let fullyReceived = true;

            // 2. Atualizar Quantidades Recebidas, Estoque e Gerar Logs
            for (const item of data.items) {
                const orderItem = order.items.find(oi => oi.id === item.purchaseOrderItemId);
                if (!orderItem) continue;

                // Atualiza Item da OC
                await tx.purchaseOrderItem.update({
                    where: { id: item.purchaseOrderItemId },
                    data: { quantityReceived: orderItem.quantityReceived + item.quantityReceived }
                });

                if (orderItem.quantityReceived + item.quantityReceived < orderItem.quantityPurchased) {
                    fullyReceived = false;
                }

                partialTotal += item.quantityReceived * orderItem.unitPrice;

                // Atualiza Estoque
                const existingItem = await tx.inventoryItem.findFirst({
                    where: { projectId: order.projectId, materialId: orderItem.materialId }
                });

                if (existingItem) {
                    await tx.inventoryItem.update({
                        where: { id: existingItem.id },
                        data: { quantidadeAtual: existingItem.quantidadeAtual + item.quantityReceived }
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: {
                            projectId: order.projectId,
                            materialId: orderItem.materialId,
                            materialName: orderItem.material.name,
                            quantidadeAtual: item.quantityReceived,
                            unidade: orderItem.material.unit,
                            estoqueMinimo: 0
                        }
                    });
                }

                // REGISTRAR LOG DE ENTRADA
                if (item.quantityReceived > 0) {
                    await tx.inventoryLog.create({
                        data: {
                            tipo: 'ENTRADA',
                            item: orderItem.material.name,
                            quantidade: `${item.quantityReceived} ${orderItem.material.unit}`,
                            responsavel: data.receiverName || 'Almoxarife',
                            data: new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                            projectId: order.projectId
                        }
                    });
                }
            }

            // 3. Atualizar Status da OC
            await tx.purchaseOrder.update({
                where: { id: order.id },
                data: { status: fullyReceived ? 'ENTREGUE_TOTAL' : 'ENTREGUE_PARCIAL' }
            });

            // 4. Abater do provisionamento original
            const prevRecord = await tx.financialRecord.findFirst({
                where: {
                    purchaseRequestId: order.purchaseRequestId,
                    status: 'PREVISTO',
                    tipo: 'SAÍDA'
                }
            });

            if (prevRecord) {
                const novoValor = Math.max(0, prevRecord.valorBruto - partialTotal);
                if (novoValor <= 0) {
                    // Previsão foi totalmente consumida, remove do financeiro
                    await tx.financialRecord.delete({
                        where: { id: prevRecord.id }
                    });
                } else {
                    // Atualiza a previsão com o saldo restante
                    await tx.financialRecord.update({
                        where: { id: prevRecord.id },
                        data: {
                            valorBruto: novoValor,
                            valorLiquido: novoValor
                        }
                    });
                }
            }

            // 5. Gerar Financeiro Proporcional e Atualizar spent
            if (partialTotal > 0) {
                const valorParcela = partialTotal / data.numInstallments;
                for (let i = 0; i < data.numInstallments; i++) {
                    const dataVenc = new Date();
                    dataVenc.setDate(dataVenc.getDate() + (data.intervalDays * (i + 1)));

                    await tx.financialRecord.create({
                        data: {
                            tipo: 'SAÍDA',
                            classificacaoDRE: order.purchaseRequest.dreCategory || '2. Custo Direto - Materiais',
                            descricao: `Recebimento Parcial NF ${data.invoiceNumber} - Parcela ${i+1}/${data.numInstallments}`,
                            valorBruto: valorParcela,
                            valorLiquido: valorParcela,
                            impostosRetidos: 0,
                            status: 'A Pagar',
                            dataVencimento: dataVenc,
                            projectId: order.projectId,
                            purchaseRequestId: order.purchaseRequestId
                        }
                    });
                }

                // Atualizar o spent da obra com o valor da Nota Fiscal recebida
                await tx.project.update({
                    where: { id: order.projectId },
                    data: { spent: { increment: partialTotal } }
                });
            }

            // Notificar o Engenheiro
            if (order.project?.engineerId) {
                await tx.notification.create({
                    data: {
                        userId: order.project.engineerId,
                        title: "Material Entregue (NF)",
                        message: `NF ${data.invoiceNumber} recebida por ${data.receiverName}. Status: ${fullyReceived ? "TOTAL" : "PARCIAL"}`,
                        type: "SUCCESS",
                        link: `/projeto/${order.projectId}`
                    }
                });
            }

            return { success: true, invoice };
        });

        revalidatePath('/suprimentos');
        revalidatePath('/financeiro');
        return result;
    } catch(e: any) {
        console.error("Erro ao receber Nota Fiscal:", e);
        return { success: false, error: e.message };
    }
}

export async function updateInventoryItem(data: { id: number; materialName?: string; estoqueMinimo: number }) {
    try {
        const updateData: any = { estoqueMinimo: data.estoqueMinimo };
        if (data.materialName) {
            updateData.materialName = data.materialName;
        }
        const item = await prisma.inventoryItem.update({
            where: { id: data.id },
            data: updateData
        });
        revalidatePath('/suprimentos');
        return { success: true, item };
    } catch (error: any) {
        console.error("Erro ao atualizar item do estoque:", error);
        return { success: false, error: error.message };
    }
}

export async function cancelPurchaseRequest(reqId: string, userName: string) {
    try {
        await prisma.$transaction(async (tx) => {
            const req = await tx.purchaseRequest.findUnique({
                where: { id: reqId },
                include: { financialRecords: true }
            });

            if (!req) throw new Error("Pedido não encontrado.");
            
            // Reverter spent se houver saídas nas records deletadas
            if (req.financialRecords && req.financialRecords.length > 0) {
                for (const record of req.financialRecords) {
                    if (record.tipo === 'SAÍDA' && record.projectId) {
                        await tx.project.update({
                            where: { id: record.projectId },
                            data: { spent: { decrement: record.valorBruto - (record.impostosRetidos || 0) } }
                        });
                    }
                }

                await tx.financialRecord.deleteMany({
                    where: { purchaseRequestId: reqId }
                });
            }

            // Marcar como cancelado
            await tx.purchaseRequest.update({
                where: { id: reqId },
                data: { status: 'CANCELADO' }
            });
        });

        revalidatePath('/suprimentos');
        revalidatePath('/financeiro');
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function updatePurchaseRequest(id: string, data: any) {
    try {
        if (!data.items || !Array.isArray(data.items) || data.items.length === 0 || !data.projectId) {
            throw new Error("Itens e Obra são campos obrigatórios.");
        }

        const existingReq = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: { items: true }
        });

        if (!existingReq || existingReq.status !== 'PENDENTE') {
            throw new Error("Apenas solicitações pendentes podem ser editadas.");
        }

        const updatedRequest = await prisma.$transaction(async (tx) => {
            await tx.purchaseRequestItem.deleteMany({
                where: { purchaseRequestId: id }
            });

            return await tx.purchaseRequest.update({
                where: { id },
                data: {
                    projectId: Number(data.projectId),
                    requesterName: data.requesterName || 'Sistema',
                    supplierId: data.supplierId || null,
                    sector: data.sector || null,
                    dreCategory: data.dreCategory || null,
                    items: {
                        create: data.items.map((item: any) => ({
                            materialId: item.materialId,
                            quantity: parseFloat(item.quantidade),
                            estimatedCost: parseFloat(item.valorEstimado) || 0,
                            urgency: item.urgencia || "BAIXA"
                        }))
                    }
                },
                include: { project: true, items: { include: { material: true } } }
            });
        });

        revalidatePath('/suprimentos');
        return { success: true, request: updatedRequest };
    } catch (error: any) {
        console.error("Erro ao atualizar requisição:", error);
        return { success: false, error: error.message };
    }
}

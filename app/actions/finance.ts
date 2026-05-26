"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../../lib/permissions';

export async function getFinancialRecords() {
    const cookieStore = await cookies();
    const rawUserRole = cookieStore.get('userRole')?.value || '';
    const rawUserEmail = cookieStore.get('userEmail')?.value || '';
    const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
    const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

    let whereClause: any = {};
    if (shouldFilterProjects(userRole)) {
        const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
        if (userRole === 'Cliente / Investidor') {
            whereClause = { clienteFornecedor: userObj?.name || '---' };
        } else if (userObj) {
            whereClause = {
                projectId: {
                    in: (await prisma.project.findMany({
                        where: {
                            OR: [
                                { employees: { some: { userId: userObj.id } } },
                                { engineerId: userObj.id },
                                { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
                            ]
                        },
                        select: { id: true }
                    })).map(p => p.id)
                }
            };
        } else {
            whereClause = { id: -1 };
        }
    }

    const records = await prisma.financialRecord.findMany({
        where: whereClause,
        include: {
            project: true
        },
        orderBy: {
            dataCompetencia: 'desc'
        }
    });
    return JSON.parse(JSON.stringify(records));
}

export async function createFinancialRecord(data: any) {
    try {
        const record = await prisma.financialRecord.create({
            data: {
                tipo: data.tipo,
                dataCompetencia: data.dataCompetencia ? new Date(data.dataCompetencia) : null,
                dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
                dataEfetivacao: data.dataEfetivacao ? new Date(data.dataEfetivacao) : null,
                classificacaoDRE: data.classificacaoDRE,
                centroCusto: data.centroCusto || null,
                cidade: data.cidade || null,
                estado: data.estado || null,
                setor: data.setor || null,
                clienteFornecedor: data.clienteFornecedor || null,
                descricao: data.descricao || null,
                valorBruto: Number(data.valorBruto),
                impostosRetidos: Number(data.impostosRetidos || 0),
                caucaoRetida: Number(data.caucaoRetida || 0),
                iss: Number(data.iss || 0),
                inss: Number(data.inss || 0),
                valorLiquido: Number(data.valorBruto) 
                    - Number(data.impostosRetidos || 0) 
                    - (Number(data.valorBruto) * (Number(data.caucaoRetida || 0) / 100))
                    - (Number(data.valorBruto) * (Number(data.iss || 0) / 100))
                    - (Number(data.valorBruto) * (Number(data.inss || 0) / 100)),
                status: data.status,
                projectId: data.projectId ? Number(data.projectId) : null
            }
        });
        
        // Se for saída efetivada, atualizar o gasto do projeto
        if (data.tipo === 'SAÍDA' && data.projectId) {
            await prisma.project.update({
                where: { id: Number(data.projectId) },
                data: {
                    spent: {
                        increment: Number(data.valorBruto) - Number(data.impostosRetidos || 0)
                    }
                }
            });
        }

        revalidatePath('/');
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getProjectsList() {
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

    const projects = await prisma.project.findMany({
        where: whereClause,
        select: {
            id: true,
            name: true,
            budget: true,
            spent: true
        }
    });
    return JSON.parse(JSON.stringify(projects));
}

export async function updateFinancialRecord(id: number, data: any) {
    try {
        const oldRecord = await prisma.financialRecord.findUnique({ where: { id } });
        
        const record = await prisma.financialRecord.update({
            where: { id },
            data: {
                tipo: data.tipo,
                dataCompetencia: data.dataCompetencia ? new Date(data.dataCompetencia) : null,
                dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : null,
                dataEfetivacao: data.dataEfetivacao ? new Date(data.dataEfetivacao) : null,
                classificacaoDRE: data.classificacaoDRE,
                centroCusto: data.centroCusto || null,
                cidade: data.cidade || null,
                estado: data.estado || null,
                setor: data.setor || null,
                clienteFornecedor: data.clienteFornecedor || null,
                descricao: data.descricao || null,
                valorBruto: Number(data.valorBruto),
                impostosRetidos: Number(data.impostosRetidos || 0),
                caucaoRetida: Number(data.caucaoRetida || 0),
                iss: Number(data.iss || 0),
                inss: Number(data.inss || 0),
                valorLiquido: Number(data.valorBruto) 
                    - Number(data.impostosRetidos || 0) 
                    - (Number(data.valorBruto) * (Number(data.caucaoRetida || 0) / 100))
                    - (Number(data.valorBruto) * (Number(data.iss || 0) / 100))
                    - (Number(data.valorBruto) * (Number(data.inss || 0) / 100)),
                status: data.status,
                projectId: data.projectId ? Number(data.projectId) : null
            }
        });

        // Lógica de ajuste de gastos no projeto (se mudar valor ou tipo)
        if (oldRecord && oldRecord.projectId && oldRecord.tipo === 'SAÍDA') {
             // Reverte gasto antigo
             await prisma.project.update({
                 where: { id: oldRecord.projectId },
                 data: { spent: { decrement: oldRecord.valorBruto - (oldRecord.impostosRetidos || 0) } }
             });
        }
        if (record.projectId && record.tipo === 'SAÍDA') {
             // Aplica novo gasto
             await prisma.project.update({
                 where: { id: record.projectId },
                 data: { spent: { increment: record.valorBruto - (record.impostosRetidos || 0) } }
             });
        }

        revalidatePath('/');
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateFinancialStatus(id: number, status: string) {
    try {
        const record = await prisma.financialRecord.update({
            where: { id },
            data: { status }
        });
        revalidatePath('/');
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, record };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteFinancialRecord(id: number) {
    try {
        // Buscar antes para saber se era uma saída e subtrair do spent do projeto
        const record = await prisma.financialRecord.findUnique({
            where: { id }
        });

        if (record && record.tipo === 'SAÍDA' && record.projectId) {
            await prisma.project.update({
                where: { id: record.projectId },
                data: {
                    spent: {
                        decrement: record.valorBruto - (record.impostosRetidos || 0)
                    }
                }
            });
        }

        await prisma.financialRecord.delete({
            where: { id }
        });
        revalidatePath('/');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createBudgetItem(data: any) {
    try {
        const item = await prisma.budgetItem.create({
            data: {
                classificacaoDRE: data.classificacaoDRE,
                valorOrcado: Number(data.valorOrcado),
                valorVenda: Number(data.valorVenda || 0),
                projectId: Number(data.projectId)
            }
        });
        revalidatePath('/');
        await triggerObsidianSync();
        return { success: true, item };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateBudgetItem(id: number, data: any) {
    try {
        const item = await prisma.budgetItem.update({
            where: { id },
            data: {
                classificacaoDRE: data.classificacaoDRE,
                valorOrcado: Number(data.valorOrcado),
                valorVenda: Number(data.valorVenda || 0)
            }
        });
        revalidatePath('/');
        await triggerObsidianSync();
        return { success: true, item };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteBudgetItem(id: number) {
    try {
        await prisma.budgetItem.delete({
            where: { id }
        });
        revalidatePath('/');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ---- NOVOS CADASTROS BASE ----

// Contatos (Clientes / Fornecedores) - UNIFICADO: tudo via Supplier
export async function getContacts() {
    // Redirecionado para Supplier (fonte única de verdade)
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    // Retorna no formato compatível com o antigo Contact para não quebrar a UI
    return suppliers.map(s => ({ id: s.id, name: s.name, type: s.type }));
}

export async function getSuppliers() {
    return await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
}

export async function deleteSupplier(id: string) {
    try {
        await prisma.supplier.delete({ where: { id } });
        revalidatePath('/financeiro');
        revalidatePath('/suprimentos');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function createContact(data: { name: string, type: string }) {
    try {
        // Cria em Supplier (fonte única) com upsert para evitar duplicatas
        const supplier = await prisma.supplier.upsert({
            where: { name: data.name },
            update: { type: data.type === 'Ambos' ? 'AMBOS' : data.type === 'Cliente' ? 'CLIENTE' : 'FORNECEDOR' },
            create: { name: data.name, type: data.type === 'Ambos' ? 'AMBOS' : data.type === 'Cliente' ? 'CLIENTE' : 'FORNECEDOR' }
        });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, contact: supplier };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteContact(id: number | string) {
    try {
        // Deleta de Supplier (fonte única)
        await prisma.supplier.delete({ where: { id: String(id) } });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Setores
export async function getSectors() {
    return await prisma.sector.findMany({ orderBy: { name: 'asc' } });
}

export async function createSector(data: { name: string, code?: string, manager?: string }) {
    try {
        const sector = await prisma.sector.create({ data });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, sector };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSector(id: number) {
    try {
        await prisma.sector.delete({ where: { id } });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Classificação DRE
export async function getFinancialCategories() {
    return await prisma.financialCategory.findMany({ orderBy: { name: 'asc' } });
}

export async function createFinancialCategory(data: { code?: string, name: string, nature?: string }) {
    try {
        const cat = await prisma.financialCategory.create({ 
            data: { 
                code: data.code || null,
                name: data.name, 
                nature: data.nature || "DESPESA" 
            } 
        });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, category: cat };
    } catch (error: any) {
        if (error.code === 'P2002') return { success: false, error: "Esta classificação DRE já existe." };
        return { success: false, error: error.message };
    }
}

export async function deleteFinancialCategory(id: number) {
    try {
        await prisma.financialCategory.delete({ where: { id } });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
export async function updateContact(id: number | string, data: { name: string, type: string }) {
    try {
        // Atualiza em Supplier (fonte única)
        const supplier = await prisma.supplier.update({
            where: { id: String(id) },
            data: { name: data.name, type: data.type === 'Ambos' ? 'AMBOS' : data.type === 'Cliente' ? 'CLIENTE' : 'FORNECEDOR' }
        });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, contact: supplier };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSector(id: number, name: string) {
    try {
        const sector = await prisma.sector.update({ where: { id }, data: { name } });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, sector };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateFinancialCategory(id: number, name: string) {
    try {
        const cat = await prisma.financialCategory.update({ where: { id }, data: { name } });
        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true, category: cat };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function seedLegacyData() {
    try {
        const clientes = ["FIATCAR", "TARRAF", "INVESTIMENTO"];
        const fornecedores = ["TW TERRAPLANAGEM E CONCRETO LISO LTDA", "ATEC - PLANEJAMENTO CONTABIL LTDA", "SEG WORK'S ENGENHARIA", "CREA SP", "BRUNO AMORIM", "ONLINE VEICULOS LTDA", "VIARONDON CONCESSIONARIA DE RODOVIA S/A", "ENTREVIAS", "POSTO MONACO BONFIN", "SUPER VAREJAO RIBEIRAO LTDA", "VVR - IBIS RIBEIRAO SHOPPING", "ECOVIAS NOROESTE PAULISTA", "ANTONIO PAULO POURA", "POSTO MANHATTAN", "HOTELARIA ACCOR BRASIL S/A IBIS RIBEIRAO PRETO", "JOSÉ SERGIO", "DEZAINY", "BANCO SICRED", "ADRIANO MARCELINO DA SILVA", "GOOGLE", "ORIGINAL COMUNICAÇÃO", "GOVERNO FEDERAL BRAZILEIRO", "MATEUS", "LUCIANA ARAUJO", "EPI.COM", "CASA DOS PARAFUSOS", "DELVIO DE FREITAS PAGAN", "CASA DA SOGRA", "ALUGUE MAQUINAS", "SABOR DA ROÇA", "PRAÇA OLIMPICA", "GOLDEN SEGURANÇA SOLUÇÃO OCUPACIONAL", "MUFFATO", "MINAS DE OURO", "AUTO POSTO ECOS LTDA", "MARTI FOODS LTDA", "POSTO RODO MASTER", "AUTO POSTO COLINA", "MOVIDA", "MANOEL MESSIAS RIBEIRO DE ASSIS", "MARCIO BENITEZ", "TW TERRAPLANAGEM E CONCRETO LTDA", "ATEC", "WILLIAM PEREIRA COSTA BRITO", "CEF MATRIZ", "SEFA PR GRP", "PORTO SEGURO", "CONLICITAÇÕES", "MARIA LÚCIA ANDRADE", "DANILO MACLAUDE SANTOS"];
        const dres = ["1. RECEITA OPERACIONAL", "3. CUSTO DIRETO - MÃO DE OBRA", "5. DESPESA ADMINISTRATIVA", "4. CUSTO DIRETO - EQUIPAMENTOS/LOGÍSTICA", "7. IMPOSTOS SOBRE SERVIÇO", "6. DESPESA COMERCIAL", "2. CUSTO DIRETO - MATERIAIS", "8. INVESTIMENTOS / CAPEX", "9. CUSTO FINANCEIRO", "10. PROVISÕES", "11. CONTINGÊNCIAS"];
        const setores = ["COMERCIAL/VAREJO", "INCORPORAÇÃO", "ADMINISTRAÇÃO"];

        // 1. Injetar Clientes
        for (const name of clientes) {
            await prisma.supplier.upsert({
                where: { name },
                update: { type: 'CLIENTE' },
                create: { name, type: 'CLIENTE' }
            });
        }

        // 2. Injetar Fornecedores
        for (const name of fornecedores) {
            await prisma.supplier.upsert({
                where: { name },
                update: { type: 'FORNECEDOR' },
                create: { name, type: 'FORNECEDOR' }
            });
        }

        // 3. Injetar DREs
        for (const name of dres) {
            const nature = name.includes("1. RECEITA OPERACIONAL") ? "RECEITA" : "DESPESA";
            const code = name.split(".")[0];
            await prisma.financialCategory.upsert({
                where: { name },
                update: { nature, code },
                create: { name, nature, code }
            });
        }

        // 4. Injetar Setores
        for (const name of setores) {
            await prisma.sector.upsert({
                where: { name },
                update: {},
                create: { name }
            });
        }

        revalidatePath('/financeiro');
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro no Seed:", e);
        return { success: false, error: e.message };
    }
}
export async function getDREReport(projectId?: number | number[]) {
    // Se projectId for informado (numero ou array), DRE filtrado. Senão, DRE global.
    const where = projectId 
        ? (Array.isArray(projectId) ? { projectId: { in: projectId } } : { projectId }) 
        : {};

    const categories = await prisma.financialCategory.findMany({ orderBy: { name: 'asc' } });
    const budgetItems = await prisma.budgetItem.findMany({ where });
    
    // FONTE ÚNICA: Todo o "realizado" (receitas e despesas) vem de FinancialRecord.
    // As medições aprovadas já criam FinancialRecords automaticamente via approveMeasurement(),
    // então não precisamos consultar a tabela Measurement separadamente.
    const financials = await prisma.financialRecord.findMany({ where });

    const report = categories.map(cat => {
        let orcado = 0;
        if (cat.nature === 'RECEITA') {
            orcado = budgetItems.filter(b => b.classificacaoDRE.toUpperCase() === cat.name.toUpperCase()).reduce((acc, curr) => acc + (curr.valorVenda || 0), 0);
        } else {
            orcado = budgetItems.filter(b => b.classificacaoDRE.toUpperCase() === cat.name.toUpperCase()).reduce((acc, curr) => acc + (curr.valorOrcado || 0), 0);
        }

        const realizado = financials
            .filter(f => f.classificacaoDRE && f.classificacaoDRE.toUpperCase() === cat.name.toUpperCase())
            .filter(f => f.status === 'Pago' || f.status === 'Recebido')
            .reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);

        const projetado = financials
            .filter(f => f.classificacaoDRE && f.classificacaoDRE.toUpperCase() === cat.name.toUpperCase())
            .filter(f => f.status !== 'Pago' && f.status !== 'Recebido' && f.status !== 'Cancelado')
            .reduce((acc, curr) => acc + (curr.valorLiquido || 0), 0);

        const desvioReal = realizado - orcado;
        const desvioPerc = orcado > 0 ? (desvioReal / orcado) * 100 : 0;

        return {
            categoria: cat.name,
            natureza: cat.nature, // RECEITA / DESPESA
            orcado,
            realizado,
            projetado,
            desvioReal,
            desvioPerc
        };
    });

    return { success: true, data: report };
}

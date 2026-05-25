"use server";
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

export async function getQualityData(projectId: number) {
    try {
        const fvss = await prisma.qualityFVS.findMany({
            where: { projectId: Number(projectId) },
            include: { items: true },
            orderBy: { date: 'desc' }
        });

        const ddss = await prisma.safetyDDS.findMany({
            where: { projectId: Number(projectId) },
            orderBy: { date: 'desc' }
        });

        const rncs = await prisma.qualityRNC.findMany({
            where: { projectId: Number(projectId) },
            orderBy: { createdAt: 'desc' }
        });

        const employees = await prisma.employee.findMany({
            where: { projects: { some: { id: Number(projectId) } }, status: "Ativo" },
            include: { documents: true, epis: true, jobRole: true }
        });

        const now = new Date();
        const nrs: any[] = [];
        const epis: any[] = [];

        const safeties = employees.map((emp: any) => {
            const asoDoc = emp.documents.find((d: any) => d.type === 'ASO');
            const nr35Doc = emp.documents.find((d: any) => d.type === 'NR-35');
            
            const aso = asoDoc ? (asoDoc.expirationDate && asoDoc.expirationDate < now ? 'Vencido' : 'Vigente') : (asoDoc && asoDoc.status === 'Vencido' ? 'Vencido' : 'Vigente');
            const nr35 = nr35Doc ? (nr35Doc.expirationDate && nr35Doc.expirationDate < now ? 'Vencido' : 'Vigente') : (nr35Doc && nr35Doc.status === 'Vencido' ? 'Vencido' : (nr35Doc ? 'Vigente' : 'N/A'));
            
            const epi_pendente = emp.epis.some((epi: any) => !epi.returned && epi.replacementDate && epi.replacementDate < now);

            emp.documents.forEach((doc: any) => {
                if(doc.type !== 'ASO' && !doc.type.startsWith('NR')) return;
                nrs.push({
                    id: doc.id,
                    employeeId: emp.id,
                    employee: emp.name,
                    role: emp.jobRole ? emp.jobRole.name : 'Colaborador',
                    nr: doc.type,
                    date: doc.issueDate || doc.createdAt,
                    validUntil: doc.expirationDate || new Date(new Date(doc.createdAt).setFullYear(new Date(doc.createdAt).getFullYear() + 1)),
                    status: doc.status,
                    fileUrl: doc.fileUrl
                });
            });

            emp.epis.forEach((epi: any) => {
                epis.push({
                    id: epi.id,
                    employeeId: emp.id,
                    employee: emp.name,
                    role: emp.jobRole ? emp.jobRole.name : 'Colaborador',
                    epi: epi.equipmentName,
                    ca: epi.caNumber,
                    deliveryDate: epi.deliveryDate,
                    signature: !!epi.signatureUrl
                });
            });

            return {
                id: emp.id,
                nome: emp.name,
                cargo: emp.jobRole ? emp.jobRole.name : 'Colaborador',
                aso,
                nr35,
                epi_pendente
            };
        });

        return { success: true, fvss, ddss, rncs, safeties, employees, epis, nrs };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createRNC(projectId: number, data: any) {
    try {
        const descriptionText = data.description || (data.titulo ? `${data.titulo} (Local: ${data.local || '-'}, Gravidade: ${data.gravidade || '-'}, Custo: R$ ${data.custo || 0})` : "Não Conformidade");
        const rnc = await prisma.qualityRNC.create({
            data: {
                projectId: Number(projectId),
                description: descriptionText,
                responsible: data.responsible || "Mestre de Obras",
                deadline: data.deadline ? new Date(data.deadline) : null,
                rootCause: data.rootCause || data.causa || null,
                correctiveAction: data.correctiveAction || data.acao || null,
                status: "Aberta"
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, rnc };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRNCStatus(projectId: number, rncId: number, status: string, data?: any) {
    try {
        await prisma.qualityRNC.update({
            where: { id: Number(rncId) },
            data: {
                status,
                ...(data && {
                    rootCause: data.rootCause,
                    correctiveAction: data.correctiveAction,
                    resolvedAt: new Date()
                })
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createFVS(projectId: number, data: any) {
    try {
        const fvs = await prisma.qualityFVS.create({
            data: {
                projectId: Number(projectId),
                title: data.title,
                inspector: data.inspector,
                status: data.status || "Pendente",
                observations: data.observations,
                items: {
                    create: data.items.map((item: any) => ({
                        description: item.description,
                        isConform: item.isConform
                    }))
                }
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, fvs };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createDDS(projectId: number, data: any) {
    try {
        const dds = await prisma.safetyDDS.create({
            data: {
                projectId: Number(projectId),
                topic: data.topic,
                supervisor: data.supervisor,
                participantsCount: Number(data.participantsCount),
                date: new Date()
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, dds };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateFVSStatus(projectId: number, fvsId: number, status: string) {
    try {
        await prisma.qualityFVS.update({
            where: { id: Number(fvsId) },
            data: { status }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createSafety(projectId: number, data: any) {
    try {
        const cpfDummy = `DUMMY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        let jobRole = await prisma.jobRole.findFirst({ where: { name: data.cargo } });
        if (!jobRole) {
            jobRole = await prisma.jobRole.create({ data: { name: data.cargo || 'Não especificado' } });
        }

        const employee = await prisma.employee.create({
            data: {
                name: data.nome,
                cpf: cpfDummy,
                status: "Ativo",
                projects: { connect: [{ id: Number(projectId) }] },
                jobRoleId: jobRole.id,
                documents: {
                    create: [
                        { type: 'ASO', status: data.aso === 'Vencido' ? 'Vencido' : 'Válido' },
                        { type: 'NR-35', status: data.nr35 === 'Vencido' ? 'Vencido' : 'Válido' }
                    ]
                }
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, employee };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteSafety(projectId: number, employeeId: string) {
    try {
        await prisma.employee.update({
            where: { id: employeeId },
            data: { projects: { disconnect: [{ id: Number(projectId) }] } }
        });
        
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createEpiRecord(projectId: number, data: { employeeId: string, equipmentName: string, caNumber: string }) {
    try {
        await prisma.employeeEpi.create({
            data: {
                employeeId: data.employeeId,
                equipmentName: data.equipmentName,
                caNumber: data.caNumber,
                deliveryDate: new Date(),
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createNrRecord(projectId: number, data: { employeeId: string, type: string, issueDate: Date, expirationDate: Date, fileUrl?: string }) {
    try {
        await prisma.employeeDocument.create({
            data: {
                employeeId: data.employeeId,
                type: data.type,
                issueDate: data.issueDate,
                expirationDate: data.expirationDate,
                fileUrl: data.fileUrl,
                status: "Válido"
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getRiskDocuments(projectId: number) {
    try {
        const documents = await prisma.document.findMany({
            where: { 
                projectId: Number(projectId),
                isObsolete: false,
                // Assumimos que Plantas ou imagens sejam enviadas
            },
            include: { pins: true },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, documents };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createRiskPin(projectId: number, data: { documentId: number, x: number, y: number, type: string, title: string, desc: string, authorId: number }) {
    try {
        const pin = await prisma.pin.create({
            data: {
                projectId: Number(projectId),
                documentId: Number(data.documentId),
                x: data.x,
                y: data.y,
                type: data.type,
                title: data.title,
                desc: data.desc,
                status: 'aberto',
                authorId: Number(data.authorId)
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, pin };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteRiskPin(projectId: number, pinId: number) {
    try {
        await prisma.pin.delete({
            where: { id: Number(pinId) }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

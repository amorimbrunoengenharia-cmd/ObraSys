"use server";

import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerObsidianSync } from "./obsidian";

export async function getMaterialLists(projectId: number) {
    try {
        const lists = await prisma.materialList.findMany({
            where: { projectId: Number(projectId) },
            include: { itens: true },
            orderBy: { createdAt: 'desc' }
        });
        return { success: true, lists };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createMaterialList(projectId: number, data: any) {
    try {
        const count = await prisma.materialList.count({ where: { projectId: Number(projectId) } });
        const codigo = `LM-${(count + 1).toString().padStart(3, '0')}`;

        const list = await prisma.materialList.create({
            data: {
                projectId: Number(projectId),
                codigo,
                titulo: data.titulo,
                disciplina: data.disciplina,
                status: "Em Edição"
            }
        });
        
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, list };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMaterialList(projectId: number, listId: number, data: any) {
    try {
        const list = await prisma.materialList.update({
            where: { id: listId },
            data: {
                titulo: data.titulo,
                disciplina: data.disciplina,
                status: data.status
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, list };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMaterialList(projectId: number, listId: number) {
    try {
        await prisma.materialList.delete({
            where: { id: listId }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addMaterialListItem(projectId: number, listId: number, data: any) {
    try {
        const item = await prisma.materialListItem.create({
            data: {
                listId: listId,
                item: data.item,
                qtd: Number(data.qtd),
                unid: data.unid,
                orcamento: Number(data.orcamento)
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, item };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMaterialListItem(projectId: number, itemId: number, data: any) {
    try {
        const item = await prisma.materialListItem.update({
            where: { id: itemId },
            data: {
                item: data.item,
                qtd: Number(data.qtd),
                unid: data.unid,
                orcamento: Number(data.orcamento)
            }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, item };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMaterialListItem(projectId: number, itemId: number) {
    try {
        await prisma.materialListItem.delete({
            where: { id: itemId }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

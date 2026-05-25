"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function getFolders(projectId: number) {
    const folders = await prisma.documentFolder.findMany({
        where: { projectId: Number(projectId) },
        include: { 
            documents: {
                where: { isObsolete: false }
            }, 
            subFolders: true 
        },
        orderBy: { name: 'asc' }
    });
    
    const rootDocuments = await prisma.document.findMany({
        where: { 
            projectId: Number(projectId),
            folderId: null,
            isObsolete: false
        }
    });

    return {
        folders: JSON.parse(JSON.stringify(folders)),
        rootDocuments: JSON.parse(JSON.stringify(rootDocuments))
    };
}

export async function getClientProjectFolders(projectId: number) {
    const folders = await prisma.documentFolder.findMany({
        where: { 
            projectId: Number(projectId),
            visibleToClient: true
        },
        include: { 
            documents: {
                where: { 
                    isObsolete: false,
                    visibleToClient: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });
    
    const rootDocuments = await prisma.document.findMany({
        where: { 
            projectId: Number(projectId),
            folderId: null,
            isObsolete: false,
            visibleToClient: true
        }
    });

    return {
        folders: JSON.parse(JSON.stringify(folders)),
        rootDocuments: JSON.parse(JSON.stringify(rootDocuments))
    };
}

export async function createFolder(projectId: number, name: string, parentId?: number) {
    try {
        const folder = await prisma.documentFolder.create({
            data: {
                name,
                projectId: Number(projectId),
                parentId: parentId ? Number(parentId) : null
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, folder };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function renameFolder(folderId: number, projectId: number, newName: string) {
    try {
        await prisma.documentFolder.update({
            where: { id: Number(folderId) },
            data: { name: newName }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleFolderVisibility(folderId: number, visible: boolean, projectId: number) {
    try {
        await prisma.documentFolder.update({
            where: { id: Number(folderId) },
            data: { visibleToClient: visible }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteFolder(folderId: number, projectId: number) {
    try {
        // 1. Verificação de trava: se tiver documentos, bloqueia.
        const docCount = await prisma.document.count({
            where: { folderId: Number(folderId) }
        });

        if (docCount > 0) {
            return { success: false, error: "Não é possível excluir uma pasta que contém documentos. Mova ou exclua os arquivos primeiro." };
        }

        await prisma.documentFolder.delete({
            where: { id: Number(folderId) }
        });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function addDocument(projectId: number, data: any) {
    try {
        await prisma.document.create({
            data: {
                nome: data.nome,
                tipo: data.tipo,
                url: data.url,
                size: data.size ? Number(data.size) : null,
                version: data.version || "R00",
                uploadedBy: data.uploadedBy || "Sistema",
                folderId: data.folderId ? Number(data.folderId) : null,
                visibleToClient: data.visibleToClient || false,
                data: new Date().toLocaleDateString('pt-BR'),
                projectId: Number(projectId)
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function toggleDocumentVisibility(docId: number, visible: boolean, projectId: number) {
    try {
        await prisma.document.update({
            where: { id: Number(docId) },
            data: { visibleToClient: visible }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteDocument(docId: number, projectId: number) {
    try {
        const doc = await prisma.document.findUnique({ where: { id: Number(docId) } });
        if (!doc) throw new Error("Documento não encontrado");

        if (doc.url && doc.url.startsWith('/uploads/')) {
            const filePath = join(process.cwd(), 'public', doc.url);
            if (existsSync(filePath)) {
                await unlink(filePath);
            }
        }

        await prisma.document.delete({ where: { id: Number(docId) } });

        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao deletar documento:", e);
        return { success: false, error: e.message };
    }
}

export async function uploadRevision(oldDocumentId: number, data: any) {
    try {
        const oldDoc = await prisma.document.findUnique({
            where: { id: Number(oldDocumentId) }
        });

        if (!oldDoc) throw new Error("Documento original não encontrado");

        // 1. Marcar antigo como obsoleto
        await prisma.document.update({
            where: { id: oldDoc.id },
            data: { isObsolete: true }
        });

        // 2. Calcular nova versão (ex: R00 -> R01)
        const currentVersion = oldDoc.version || "R00";
        const verNumber = parseInt(currentVersion.replace('R', '')) || 0;
        const nextVersion = `R${(verNumber + 1).toString().padStart(2, '0')}`;

        // 3. Criar novo documento
        const newDoc = await prisma.document.create({
            data: {
                nome: data.nome,
                tipo: data.tipo || oldDoc.tipo,
                url: data.url,
                size: data.size ? Number(data.size) : null,
                version: nextVersion,
                uploadedBy: data.uploadedBy || "Sistema",
                folderId: oldDoc.folderId,
                originalId: oldDoc.originalId || oldDoc.id,
                isObsolete: false,
                data: new Date().toLocaleDateString('pt-BR'),
                projectId: oldDoc.projectId
            }
        });

        revalidatePath(`/projeto/${oldDoc.projectId}`);
        await triggerObsidianSync();
        return { success: true, version: nextVersion };
    } catch (e: any) {
        console.error("Erro ao subir revisão:", e);
        return { success: false, error: e.message };
    }
}

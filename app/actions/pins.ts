"use server";

import { prisma } from "../../lib/prisma";
import { triggerObsidianSync } from "./obsidian";

export async function getDocumentPins(documentId: number) {
    try {
        if (!documentId) return { success: true, pins: [] };
        
        const pins = await prisma.pin.findMany({
            where: { documentId: Number(documentId) },
            include: { 
                author: { select: { name: true, role: true } },
                comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'asc' } }
            },
            orderBy: { createdAt: 'asc' }
        });
        
        return { success: true, pins: pins.map(p => ({
            ...p,
            authorName: p.author?.name || 'Sistema',
            authorRole: p.author?.role || ''
        })) };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createPin(projectId: number, documentId: number, data: any) {
    try {
        // Fallback para usuário Admin caso não tenhamos sessão configurada no momento
        const firstUser = await prisma.user.findFirst();
        if (!firstUser) throw new Error("Nenhum usuário encontrado no sistema.");

        const pin = await prisma.pin.create({
            data: {
                projectId: Number(projectId),
                documentId: documentId ? Number(documentId) : null,
                authorId: firstUser.id,
                x: data.x,
                y: data.y,
                type: data.type,
                status: data.status,
                title: data.title,
                desc: data.desc
            }
        });

        await triggerObsidianSync();
        return { success: true, pin };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updatePinStatus(pinId: number, status: string) {
    try {
        const pin = await prisma.pin.update({
            where: { id: pinId },
            data: { status }
        });
        await triggerObsidianSync();
        return { success: true, pin };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deletePin(pinId: number) {
    try {
        await prisma.pin.delete({ where: { id: pinId } });
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

import { cookies } from 'next/headers';

export async function addPinComment(pinId: number, text: string) {
    try {
        const cookieStore = await cookies();
        const rawUserEmail = cookieStore.get('userEmail')?.value;
        const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : null;
        let authorId = 1;

        if (userEmail) {
            const user = await prisma.user.findUnique({ where: { email: userEmail } });
            if (user) authorId = user.id;
        } else {
            const firstUser = await prisma.user.findFirst();
            if (firstUser) authorId = firstUser.id;
        }

        const comment = await prisma.pinComment.create({
            data: {
                text,
                pinId: Number(pinId),
                authorId
            },
            include: {
                author: { select: { name: true } }
            }
        });
        
        await triggerObsidianSync();
        return { success: true, comment };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

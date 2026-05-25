"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

// --- MOVIMENTAÇÃO DE MATERIAIS ---
export async function moveInventoryItem(itemId: number, qtd: number, type: 'entrada' | 'saida', resp: string, projectId: number) {
    try {
        const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
        if (!item) throw new Error("Item não encontrado");

        const novaQtd = type === 'entrada' ? item.quantidadeAtual + qtd : item.quantidadeAtual - qtd;
        
        await prisma.$transaction([
            prisma.inventoryItem.update({
                where: { id: itemId },
                data: { quantidadeAtual: novaQtd }
            }),
            prisma.inventoryLog.create({
                data: {
                    tipo: type,
                    item: item.materialName,
                    quantidade: `${qtd} ${item.unidade}`,
                    responsavel: resp,
                    data: new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
                    projectId: Number(projectId)
                }
            })
        ]);

        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

// --- CAUTELA DE FERRAMENTAS ---
export async function toolCaution(toolId: number, resp: string, action: 'emprestimo' | 'devolucao', projectId: number) {
    try {
        const tool = await prisma.inventoryTool.findUnique({ where: { id: toolId } });
        if (!tool) throw new Error("Ferramenta não encontrada");

        const status = action === 'emprestimo' ? 'Em uso' : 'Disponível';
        const responsavel = action === 'emprestimo' ? resp : '-';
        const dataMov = new Date().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });

        await prisma.$transaction([
            prisma.inventoryTool.update({
                where: { id: toolId },
                data: { status, responsavel, dataMov }
            }),
            prisma.inventoryLog.create({
                data: {
                    tipo: action,
                    item: tool.nome,
                    quantidade: '1 un',
                    responsavel: action === 'emprestimo' ? resp : 'Almoxarifado',
                    data: dataMov,
                    projectId: Number(projectId)
                }
            })
        ]);

        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

// --- CRIAÇÃO DE NOVOS ITENS/FERRAMENTAS ---
export async function createInventoryItem(data: any, projectId: number) {
    try {
        await prisma.inventoryItem.create({
            data: {
                materialName: data.material,
                quantidadeAtual: Number(data.quantidadeAtual),
                unidade: data.unidade,
                estoqueMinimo: Number(data.estoqueMinimo),
                projectId: Number(projectId)
            }
        });
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createInventoryTool(data: any, projectId: number) {
    try {
        await prisma.inventoryTool.create({
            data: {
                nome: data.nome,
                marca: data.marca,
                patrimonio: data.patrimonio,
                status: 'Disponível',
                projectId: Number(projectId)
            }
        });
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

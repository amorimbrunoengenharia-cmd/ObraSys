"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

// Busca todos os usuários
export async function getUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
            },
            orderBy: { name: 'asc' }
        });
        return { success: true, users };
    } catch (e: any) {
        console.error("Erro ao buscar usuários:", e);
        return { success: false, error: e.message };
    }
}

// Cria um novo usuário
export async function createUser(data: { name: string; email: string; role: string }) {
    try {
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        });

        if (existingUser) {
            return { success: false, error: 'E-mail já está em uso.' };
        }

        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                role: data.role,
                password: 'senha_provisoria_123', // Em um sistema real, enviar e-mail com token/gerar senha forte
                isActive: true
            }
        });

        revalidatePath('/(admin)/configuracoes', 'layout');
        await triggerObsidianSync();
        return { success: true, user };
    } catch (e: any) {
        console.error("Erro ao criar usuário:", e);
        return { success: false, error: e.message };
    }
}

// Atualiza a Role e o Status
export async function updateUserRoleAndStatus(id: number, role: string, isActive: boolean) {
    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                role,
                isActive
            }
        });

        revalidatePath('/(admin)/configuracoes', 'layout');
        await triggerObsidianSync();
        return { success: true, user };
    } catch (e: any) {
        console.error("Erro ao atualizar usuário:", e);
        return { success: false, error: e.message };
    }
}

// Deleta um usuário
export async function deleteUser(id: number) {
    try {
        // CUIDADO: Em um sistema real, a exclusão física pode quebrar referências (ex: RDOAuthor).
        // Pode ser melhor apenas inativar (`isActive = false`).
        // Neste momento, manteremos a exclusão física caso ele não tenha referências,
        // mas idealmente uma inativação (soft delete) é preferível.
        
        await prisma.user.delete({
            where: { id }
        });

        revalidatePath('/(admin)/configuracoes', 'layout');
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error("Erro ao deletar usuário:", e);
        return { success: false, error: 'Não é possível excluir um usuário que possui registros vinculados (RDOs, Tarefas, etc). Desative a conta em vez disso.' };
    }
}

// Legado mantido para compatibilidade, caso outros módulos ainda chamem getStaff
export async function getStaff() {
    try {
        return await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true
            },
            where: { isActive: true }, // Retorna apenas ativos para listas de atribuição
            orderBy: { name: 'asc' }
        });
    } catch (e) {
        console.error(e);
        return [];
    }
}

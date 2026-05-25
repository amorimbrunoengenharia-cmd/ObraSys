"use server";

import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

// =====================================================================
// MOTOR DE SINCRONIZAÇÃO BIDIRECIONAL (PULL) — OBSIDIAN TO SQLITE
// =====================================================================

const VAULT_BASE = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\ObraSys';

function slug(n: string) {
    return (n || 'sem-nome').replace(/[/\\?%*:|"<>]/g, '-').trim();
}

/**
 * Puxa atualizações feitas manualmente pelo usuário no vault do Obsidian
 * e as sincroniza de volta na base de dados SQLite do ObraSys V2.
 */
export async function pullKanbanUpdatesFromObsidian() {
    try {
        const tarefasDir = path.join(VAULT_BASE, 'Tarefas');
        if (!fs.existsSync(tarefasDir)) {
            console.log("📓 Pasta 'Tarefas' no Obsidian não encontrada. Ignorando pull.");
            return { success: true, updatedCount: 0, message: "Pasta de tarefas do Obsidian não encontrada." };
        }

        console.log("📓 Sincronizando modificações de Kanban do Obsidian → SQLite...");
        const projects = await prisma.project.findMany({
            include: { tasks: true }
        });

        let updatedCount = 0;
        const details: string[] = [];

        for (const project of projects) {
            const fileSlug = slug(project.name);
            const filePath = path.join(tarefasDir, `Kanban - ${fileSlug}.md`);

            if (!fs.existsSync(filePath)) {
                continue; // Nenhuma nota de Kanban correspondente a este projeto
            }

            const markdown = fs.readFileSync(filePath, 'utf-8');
            const lines = markdown.split(/\r?\n/);

            let currentStatus = 'A Fazer';
            let currentColumnId = 'todo';

            for (const line of lines) {
                const trimmed = line.trim();

                // 1. Identificar colunas do Kanban
                if (trimmed.startsWith('## A Fazer')) {
                    currentStatus = 'A Fazer';
                    currentColumnId = 'todo';
                    continue;
                } else if (trimmed.startsWith('## Em Andamento')) {
                    currentStatus = 'Em Andamento';
                    currentColumnId = 'in_progress';
                    continue;
                } else if (trimmed.startsWith('## Impedimento')) {
                    currentStatus = 'Impedimento';
                    currentColumnId = 'blocked';
                    continue;
                } else if (trimmed.startsWith('## Concluído')) {
                    currentStatus = 'Concluído';
                    currentColumnId = 'done';
                    continue;
                }

                // 2. Identificar tarefas listadas
                // Padrão: - [ ] Nome da Tarefa  ou  - [x] Nome da Tarefa
                const taskMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/);
                if (taskMatch) {
                    const isChecked = taskMatch[1].toLowerCase() === 'x';
                    const taskName = taskMatch[2].trim();

                    // Mapeamento na lista de tarefas do banco
                    const matchedTask = project.tasks.find(t => 
                        t.name.trim().toLowerCase() === taskName.toLowerCase() ||
                        (t.title && t.title.trim().toLowerCase() === taskName.toLowerCase())
                    );

                    if (matchedTask) {
                        let targetStatus = currentStatus;
                        let targetColumnId = currentColumnId;
                        let targetProgress = matchedTask.progress;

                        // Se marcado como concluído [x] mas a coluna diz outra coisa, priorizar a coluna Concluído
                        if (isChecked) {
                            targetStatus = 'Concluído';
                            targetColumnId = 'done';
                            targetProgress = 100;
                        } else {
                            // Se desmarcado [ ] mas estava na coluna Concluído, mover para A Fazer
                            if (targetStatus === 'Concluído') {
                                targetStatus = 'A Fazer';
                                targetColumnId = 'todo';
                                targetProgress = 0;
                            } else {
                                if (targetColumnId === 'in_progress') targetProgress = 50;
                                else if (targetColumnId === 'todo') targetProgress = 0;
                            }
                        }

                        // Se mudou de status ou coluna ou progresso, persistir no SQLite!
                        if (matchedTask.status !== targetStatus || matchedTask.columnId !== targetColumnId || matchedTask.progress !== targetProgress) {
                            await prisma.task.update({
                                where: { id: matchedTask.id },
                                data: {
                                    status: targetStatus,
                                    columnId: targetColumnId,
                                    progress: targetProgress,
                                    actualFinish: targetColumnId === 'done' ? new Date() : matchedTask.actualFinish,
                                    actualStart: targetColumnId === 'in_progress' && !matchedTask.actualStart ? new Date() : matchedTask.actualStart
                                }
                            });
                            updatedCount++;
                            details.push(`[${project.name}] "${matchedTask.name}" movida para "${targetStatus}"`);
                        }
                    }
                }
            }
        }

        if (updatedCount > 0) {
            revalidatePath('/tarefas');
            revalidatePath('/orcamentos');
            revalidatePath('/cronograma');
        }

        console.log(`✅ Sincronização Obsidian finalizada. ${updatedCount} tarefas sincronizadas de volta no SQLite.`);
        return {
            success: true,
            updatedCount,
            message: `Sincronizados ${updatedCount} status de tarefas de volta do Obsidian!`,
            details
        };

    } catch (error: any) {
        console.error("❌ Erro ao puxar atualizações do Obsidian:", error);
        return { success: false, updatedCount: 0, error: error.message, message: `Erro: ${error.message}` };
    }
}

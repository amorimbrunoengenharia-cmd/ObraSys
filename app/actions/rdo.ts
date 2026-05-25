"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

/**
 * saveRDO — Salva/atualiza um RDO e sincroniza bidirecionalmente com o Kanban.
 * 
 * Task 27.1: Migrado de $executeRaw para Prisma Client tipado.
 * Regra de negócio: Se RdoActivity.progress >= 100, a Task associada
 * tem seu columnId→'done' e status→'Concluído' automaticamente.
 */
export async function saveRDO(data: any, projectId: number) {
    try {
        const weather = JSON.stringify(data.clima);
        const manpower = JSON.stringify({
            indireta: data.mo_indireta,
            direta: data.mo_direta
        });
        const equipment = JSON.stringify({
            equipamentos: data.equipamentos,
            veiculos: data.veiculos
        });
        const issuesJson = JSON.stringify({
            obs: data.obs || "",
            activities: data.activities || []
        });

        let rdoId: number;

        if (data.isNew) {
            // CREATE via Prisma Client
            const created = await prisma.rDO.create({
                data: {
                    weather,
                    manpower,
                    equipment,
                    issues: issuesJson,
                    status: 'Finalizado',
                    date: data.data || new Date().toISOString().split('T')[0],
                    projectId: Number(projectId)
                }
            });
            rdoId = created.id;
        } else {
            // UPDATE via Prisma Client
            rdoId = Number(data.id);
            await prisma.rDO.update({
                where: { id: rdoId },
                data: {
                    weather,
                    manpower,
                    equipment,
                    issues: issuesJson,
                    status: 'Finalizado'
                }
            });
        }

        // Sincronização de Atividades (RdoActivity) + Progresso de Tarefas + Kanban
        if (data.activities && Array.isArray(data.activities)) {
            // Se não for novo, limpar atividades anteriores para sobrescrever
            if (!data.isNew) {
                // Deletar fotos das atividades antigas
                const oldActivities = await prisma.rdoActivity.findMany({
                    where: { rdoId },
                    select: { id: true }
                });
                if (oldActivities.length > 0) {
                    await prisma.rdoPhoto.deleteMany({
                        where: { activityId: { in: oldActivities.map(a => a.id) } }
                    });
                    await prisma.rdoActivity.deleteMany({
                        where: { rdoId }
                    });
                }
            }

            for (const act of data.activities) {
                const taskId = act.taskId ? Number(act.taskId) : null;
                const progress = Math.min(100, Math.max(0, Number(act.progress) || 0));

                // Criar RdoActivity via Prisma Client
                const createdActivity = await prisma.rdoActivity.create({
                    data: {
                        taskId,
                        progress,
                        observations: act.observations || '',
                        rdoId
                    }
                });

                // Salvar Fotos Associadas
                if (act.photos && Array.isArray(act.photos)) {
                    for (const photo of act.photos) {
                        await prisma.rdoPhoto.create({
                            data: {
                                url: photo.url,
                                caption: photo.caption || '',
                                activityId: createdActivity.id
                            }
                        });
                    }
                }

                // TASK 27.1 — RDO → KANBAN: Atualizar progresso E estado da Task
                if (taskId) {
                    const updateData: any = { progress };

                    // Regra de negócio: progress >= 100 → mover para "done/Concluído"
                    if (progress >= 100) {
                        updateData.columnId = 'done';
                        updateData.status = 'Concluído';
                        updateData.actualFinish = new Date();
                    } else if (progress > 0) {
                        // Se progresso > 0 mas < 100, garantir que está "em andamento"
                        const currentTask = await prisma.task.findUnique({ 
                            where: { id: taskId }, 
                            select: { columnId: true, actualStart: true } 
                        });
                        if (currentTask?.columnId === 'todo') {
                            updateData.columnId = 'in_progress';
                            updateData.status = 'Em Andamento';
                        }
                        if (!currentTask?.actualStart) {
                            updateData.actualStart = new Date();
                        }
                    }

                    await prisma.task.update({
                        where: { id: taskId },
                        data: updateData
                    });
                }
            }
        }

        // Notificar Engenheiro, Gerentes e Diretores sobre RDO
        if (data.isNew) {
            const rdoDate = data.data || new Date().toISOString().split('T')[0];
            const managers = await prisma.user.findMany({
                where: { role: { in: ['Gerente de Obras', 'Diretor'] } }
            });
            
            const project = await prisma.project.findUnique({
                where: { id: Number(projectId) },
                select: { name: true, engineerId: true }
            });

            const notifyList = new Set(managers.map(u => u.id));
            if (project?.engineerId) notifyList.add(project.engineerId);

            if (notifyList.size > 0) {
                await prisma.notification.createMany({
                    data: Array.from(notifyList).map(userId => ({
                        userId,
                        title: "Novo RDO Emitido",
                        message: `O RDO do dia ${rdoDate.split('-').reverse().join('/')} para a obra ${project?.name || ''} foi registrado.`,
                        type: "SYSTEM",
                        read: false,
                        link: `/projeto/${projectId}`
                    }))
                });
            }
        }

        // Revalidar todas as rotas que mostram dados de tasks/RDOs
        revalidatePath(`/projeto/${projectId}`);
        revalidatePath(`/projeto/${projectId}/gantt`);
        revalidatePath(`/projeto/${projectId}/cronograma`);
        revalidatePath('/'); // Dashboard global
        triggerObsidianSync();
        return { success: true, rdoId };
    } catch (e: any) {
        console.error("saveRDO error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * TASK 27.1 — KANBAN → RDO: Gerar RDO automaticamente a partir das tasks concluídas.
 * 
 * Procura tasks com columnId='done' no projeto e gera/anexa a um RDO do dia,
 * criando RdoActivity com 100% de progresso para cada task concluída.
 */
export async function generateRdoFromKanban(projectId: number, date?: string) {
    try {
        const targetDate = date || new Date().toISOString().split('T')[0];

        // Buscar todas as tasks concluídas do projeto
        const doneTasks = await prisma.task.findMany({
            where: {
                projectId: Number(projectId),
                columnId: 'done'
            },
            select: { id: true, name: true, title: true, progress: true }
        });

        if (doneTasks.length === 0) {
            return { success: false, error: 'Nenhuma tarefa concluída encontrada no Kanban.' };
        }

        // Verificar se já existe um RDO para este dia (rascunho ou outro)
        let rdo = await prisma.rDO.findFirst({
            where: {
                projectId: Number(projectId),
                date: targetDate
            },
            include: { activities: true }
        });

        if (!rdo) {
            // Criar novo RDO do dia
            rdo = await prisma.rDO.create({
                data: {
                    date: targetDate,
                    status: 'Rascunho',
                    weather: JSON.stringify({ manha: 'sol', tarde: 'sol', noite: 'nublado' }),
                    manpower: JSON.stringify({ indireta: [], direta: [] }),
                    equipment: JSON.stringify({ equipamentos: [], veiculos: [] }),
                    issues: JSON.stringify({ obs: 'RDO gerado automaticamente via Kanban.', activities: [] }),
                    projectId: Number(projectId)
                },
                include: { activities: true }
            });
        }

        // Obter IDs de tasks que já foram registradas neste RDO para evitar duplicatas
        const existingTaskIds = new Set(
            rdo.activities
                .filter((a: any) => a.taskId !== null)
                .map((a: any) => a.taskId)
        );

        let addedCount = 0;

        for (const task of doneTasks) {
            // Pular se já existe uma atividade para esta task neste RDO
            if (existingTaskIds.has(task.id)) continue;

            await prisma.rdoActivity.create({
                data: {
                    taskId: task.id,
                    progress: 100,
                    observations: `Tarefa "${task.name || task.title}" concluída e registrada via Kanban.`,
                    rdoId: rdo.id
                }
            });
            addedCount++;
        }

        // Revalidar rotas
        revalidatePath(`/projeto/${projectId}`);
        revalidatePath(`/projeto/${projectId}/rdo`);
        revalidatePath('/');
        triggerObsidianSync();

        return { 
            success: true, 
            rdoId: rdo.id,
            addedCount,
            totalDone: doneTasks.length,
            message: addedCount > 0 
                ? `✅ ${addedCount} atividade(s) adicionada(s) ao RDO #${rdo.id} (${targetDate}).`
                : `ℹ️ Todas as ${doneTasks.length} tarefas concluídas já estavam registradas no RDO do dia.`
        };
    } catch (e: any) {
        console.error("generateRdoFromKanban error:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteRdo(id: number, projectId: number) {
    try {
        await prisma.rDO.delete({
            where: { id: Number(id) }
        });
        
        revalidatePath(`/projeto/${projectId}`);
        revalidatePath(`/projeto/${projectId}/rdo`);
        revalidatePath('/');
        triggerObsidianSync();
        
        return { success: true };
    } catch (e: any) {
        console.error("deleteRdo error:", e);
        return { success: false, error: e.message };
    }
}

export async function getProjectAttendanceForDate(projectId: number, dateString: string) {
    try {
        const targetDate = new Date(dateString);
        // Garantir que consideramos o dia completo
        const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
        const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        
        const employees = await prisma.employee.findMany({
            where: {
                projects: {
                    some: { id: Number(projectId) }
                },
                status: { not: "Demitido" }
            },
            include: {
                attendances: {
                    where: {
                        date: {
                            gte: startOfDay,
                            lte: endOfDay
                        }
                    }
                },
                jobRole: true
            }
        });
        
        return employees.map(emp => {
            const att = emp.attendances[0];
            return {
                id: emp.id,
                name: emp.name,
                role: emp.jobRole?.name || "Funcionário",
                status: att ? att.status : "Sem Registro",
                hoursWorked: att ? att.hoursWorked : 0
            };
        });
    } catch (error: any) {
        console.error("Erro ao buscar presenças do projeto:", error);
        return [];
    }
}

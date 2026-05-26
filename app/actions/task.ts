"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

export async function updateTaskColumn(taskId: string, newColumnId: string) {
    try {
        await prisma.task.update({
            where: { id: Number(taskId) },
            data: { 
                columnId: newColumnId,
                status: newColumnId === 'done' ? 'Concluído' : 
                        newColumnId === 'blocked' ? 'Impedimento' : 
                        newColumnId === 'in_progress' ? 'Em Andamento' : 'A Fazer'
            }
        });
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function createKanbanTask(data: any) {
    try {
        const task = await prisma.task.create({
            data: {
                wbs: data.wbs || '1.1',
                title: data.title,
                name: data.title, // Sync title and name for Gantt
                description: data.description || '',
                status: 'A Fazer',
                columnId: 'todo',
                priority: data.priority || 'media',
                tags: data.tags?.join(',') || '',
                startDate: new Date(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
                progress: 0,
                projectId: Number(data.projectId)
            }
        });
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true, data: task };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function updateTaskDetails(taskId: number, data: any) {
    try {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                name: data.name,
                wbs: data.wbs,
                title: data.name,
                start: Number(data.start),
                duration: Number(data.duration),
                progress: Number(data.progress),
                status: data.status,
                critico: data.critico,
                predecessors: data.predecessors,
                level: Number(data.level || 0),
                isSummary: Boolean(data.isSummary),
                isMilestone: Boolean(data.isMilestone),
                order: Number(data.order || 0),
                actualStart: data.actualStart ? new Date(data.actualStart) : undefined,
                actualFinish: data.actualFinish ? new Date(data.actualFinish) : undefined,
                assignees: data.assigneeIds ? {
                    set: data.assigneeIds.map((id: any) => ({ id: Number(id) }))
                } : undefined
            }
        });
        
        // Disparar o motor de agendamento automático
        await autoSchedule(taskId);

        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

export async function autoSchedule(triggerTaskId: number, visited = new Set<number>()) {
    if (visited.has(triggerTaskId)) throw new Error("Circular dependency detected!");
    visited.add(triggerTaskId);

    const triggerTask = await prisma.task.findUnique({ where: { id: triggerTaskId } });
    if (!triggerTask) return;

    // Encontrar todas as tarefas que dependem desta
    const successors = await prisma.task.findMany({
        where: { 
            projectId: triggerTask.projectId,
            predecessors: { contains: triggerTaskId.toString() } 
        }
    });

    for (const succ of successors) {
        const deps = succ.predecessors?.split(/[,;]/).map(d => d.trim()) || [];
        let earliestStart = succ.start;

        for (const depStr of deps) {
            const parsed = parseDependency(depStr);
            if (parsed.id === triggerTaskId) {
                const triggerEnd = triggerTask.start + triggerTask.duration;
                
                switch (parsed.type) {
                    case 'FS': earliestStart = triggerEnd + parsed.lag; break;
                    case 'SS': earliestStart = triggerTask.start + parsed.lag; break;
                    case 'FF': earliestStart = (triggerEnd + parsed.lag) - succ.duration; break;
                    case 'SF': earliestStart = (triggerTask.start + parsed.lag) - succ.duration; break;
                }
            }
        }

        if (earliestStart !== succ.start) {
            await prisma.task.update({
                where: { id: succ.id },
                data: { start: earliestStart }
            });
            await autoSchedule(succ.id, new Set(visited));
        }
    }
}

function parseDependency(dep: string) {
    const match = dep.match(/^(\d+)(FS|SS|FF|SF)?([+-]\d+d)?$/i);
    if (!match) return { id: parseInt(dep), type: 'FS', lag: 0 };
    return {
        id: parseInt(match[1]),
        type: match[2]?.toUpperCase() || 'FS',
        lag: match[3] ? parseInt(match[3].replace('d', '').replace('+', '')) : 0
    };
}

export async function deleteTask(taskId: number) {
    try {
        await prisma.task.delete({ where: { id: taskId } });
        revalidatePath('/');
        triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function setBaseline(projectId: number) {
    try {
        const tasks = await prisma.task.findMany({ where: { projectId } });
        for (const task of tasks) {
            await prisma.task.update({
                where: { id: task.id },
                data: {
                    baseStart: task.start,
                    baseDur: task.duration
                }
            });
        }
        revalidatePath('/');
        return { success: true };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

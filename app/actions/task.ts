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

export async function autoSchedule(triggerTaskId: number) {
    const triggerTask = await prisma.task.findUnique({ where: { id: triggerTaskId } });
    if (!triggerTask) return;

    const allTasks = await prisma.task.findMany({ where: { projectId: triggerTask.projectId } });
    
    const taskMap = new Map<string, any>();
    allTasks.forEach(t => {
        taskMap.set(t.id.toString(), t);
        if (t.wbs) taskMap.set(t.wbs.toString(), t);
    });

    const inDegree = new Map<number, number>();
    const graph = new Map<number, number[]>(); 
    const adj = new Map<number, any[]>(); 

    allTasks.forEach(t => {
        inDegree.set(t.id, 0);
        graph.set(t.id, []);
        adj.set(t.id, []);
    });

    allTasks.forEach(t => {
        if (!t.predecessors) return;
        const deps = t.predecessors.split(/[,;]/).map(d => d.trim()).filter(Boolean);
        for (const depStr of deps) {
            const parsed = parseDependency(depStr);
            const parent = taskMap.get(parsed.key);
            if (parent) {
                graph.get(parent.id)!.push(t.id);
                inDegree.set(t.id, inDegree.get(t.id)! + 1);
                adj.get(t.id)!.push({ parentId: parent.id, type: parsed.type, lag: parsed.lag });
            }
        }
    });

    const queue: number[] = [];
    allTasks.forEach(t => {
        if (inDegree.get(t.id) === 0) queue.push(t.id);
    });

    const sortedIds: number[] = [];
    while (queue.length > 0) {
        const u = queue.shift()!;
        sortedIds.push(u);
        const children = graph.get(u) || [];
        for (const v of children) {
            inDegree.set(v, inDegree.get(v)! - 1);
            if (inDegree.get(v) === 0) queue.push(v);
        }
    }

    const startUpdates = new Map<number, number>();
    
    for (const id of sortedIds) {
        const task = taskMap.get(id.toString());
        const predecessors = adj.get(id) || [];
        
        if (predecessors.length > 0) {
            let earliestStart = 0;
            for (const p of predecessors) {
                const parentId = p.parentId;
                const parentStart = startUpdates.has(parentId) ? startUpdates.get(parentId)! : taskMap.get(parentId.toString()).start;
                const parentDur = taskMap.get(parentId.toString()).duration;
                const parentEnd = parentStart + parentDur;
                
                let candidateStart = 0;
                switch (p.type) {
                    case 'FS': candidateStart = parentEnd + p.lag; break;
                    case 'SS': candidateStart = parentStart + p.lag; break;
                    case 'FF': candidateStart = (parentEnd + p.lag) - task.duration; break;
                    case 'SF': candidateStart = (parentStart + p.lag) - task.duration; break;
                }
                if (candidateStart > earliestStart) earliestStart = candidateStart;
            }
            if (earliestStart < 0) earliestStart = 0;
            
            if (earliestStart !== task.start) {
                startUpdates.set(id, earliestStart);
            }
        }
    }

    if (startUpdates.size > 0) {
        for (const [id, newStart] of startUpdates.entries()) {
            await prisma.task.update({
                where: { id },
                data: { start: newStart }
            });
        }
    }
}

function parseDependency(dep: string) {
    const match = dep.match(/^([\d\.]+)(FS|SS|FF|SF)?([+-]\d+d)?$/i);
    if (!match) return { key: dep.trim(), type: 'FS', lag: 0 };
    return {
        key: match[1],
        type: match[2]?.toUpperCase() || 'FS',
        lag: match[3] ? parseInt(match[3].toLowerCase().replace('d', '').replace('+', '')) : 0
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

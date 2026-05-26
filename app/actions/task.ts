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
    try {
        const triggerTask = await prisma.task.findUnique({ where: { id: triggerTaskId } });
        if (!triggerTask) return;

        const allTasks = await prisma.task.findMany({ where: { projectId: triggerTask.projectId } });
        
        // Build lookup maps: both by numeric ID and by WBS string
        const taskById = new Map<number, any>();
        const taskByWbs = new Map<string, any>();
        allTasks.forEach(t => {
            taskById.set(t.id, { ...t }); // clone so we can mutate start
            if (t.wbs) taskByWbs.set(t.wbs.trim(), taskById.get(t.id));
        });

        // Determine which tasks are "summary" (parents) based on WBS hierarchy
        // A task with WBS "1" is a summary if there exists "1.1", "1.2", etc.
        const summaryWbsSet = new Set<string>();
        for (const t of allTasks) {
            if (!t.wbs) continue;
            const parts = t.wbs.split('.');
            // Register all ancestor WBS as summaries
            for (let i = 1; i < parts.length; i++) {
                summaryWbsSet.add(parts.slice(0, i).join('.'));
            }
        }

        // Compute effective start/duration for summary tasks from their children
        function computeSummaryDates(wbs: string): { start: number; duration: number } {
            const prefix = wbs + '.';
            const children = allTasks.filter(t => t.wbs && t.wbs.startsWith(prefix));
            if (children.length === 0) {
                const task = taskByWbs.get(wbs);
                return { start: task?.start || 0, duration: task?.duration || 0 };
            }
            
            // Only use non-summary leaf children for calculation
            const leafChildren = children.filter(c => !summaryWbsSet.has(c.wbs));
            const allChildren = leafChildren.length > 0 ? leafChildren : children;
            
            let minStart = Infinity;
            let maxEnd = 0;
            for (const c of allChildren) {
                const cTask = taskById.get(c.id)!;
                const s = cTask.start || 0;
                const d = cTask.duration || 0;
                if (s < minStart) minStart = s;
                if (s + d > maxEnd) maxEnd = s + d;
            }
            if (minStart === Infinity) minStart = 0;
            return { start: minStart, duration: maxEnd - minStart };
        }

        // Resolve a predecessor key (WBS or ID string) to a task object
        function resolveTask(key: string): any | null {
            if (taskByWbs.has(key)) return taskByWbs.get(key);
            const numId = parseInt(key);
            if (!isNaN(numId) && taskById.has(numId)) return taskById.get(numId);
            return null;
        }

        // Get effective start and end for a predecessor task
        // For summary tasks, compute from children; for regular tasks, use stored values
        function getEffectiveDates(task: any): { start: number; end: number } {
            if (task.wbs && summaryWbsSet.has(task.wbs.trim())) {
                const { start, duration } = computeSummaryDates(task.wbs.trim());
                return { start, end: start + duration };
            }
            return { start: task.start || 0, end: (task.start || 0) + (task.duration || 0) };
        }

        // Check if taskWbs is a descendant of predWbs (to avoid circular parent refs)
        function isDescendant(taskWbs: string, predWbs: string): boolean {
            return taskWbs.startsWith(predWbs + '.');
        }

        // Process tasks in WBS order (natural sort) to ensure parents before children
        const sortedTasks = [...allTasks].sort((a, b) => {
            const p1 = (a.wbs || '').split('.').map(Number);
            const p2 = (b.wbs || '').split('.').map(Number);
            for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
                if ((p1[i] || 0) !== (p2[i] || 0)) return (p1[i] || 0) - (p2[i] || 0);
            }
            return 0;
        });

        // Multiple passes to propagate through chains
        const maxPasses = 5;
        for (let pass = 0; pass < maxPasses; pass++) {
            let changed = false;
            
            for (const task of sortedTasks) {
                if (!task.predecessors) continue;
                if (summaryWbsSet.has(task.wbs?.trim())) continue; // Skip summary tasks
                
                const deps = task.predecessors.split(/[,;]/).map((d: string) => d.trim()).filter(Boolean);
                let earliestStart = -1;

                for (const depStr of deps) {
                    const parsed = parseDependency(depStr);
                    const predTask = resolveTask(parsed.key);
                    if (!predTask) continue;
                    
                    // Skip if this task is a child of the predecessor (circular)
                    if (task.wbs && predTask.wbs && isDescendant(task.wbs.trim(), predTask.wbs.trim())) {
                        continue;
                    }

                    const { start: pStart, end: pEnd } = getEffectiveDates(predTask);
                    const taskDur = taskById.get(task.id)!.duration || 0;
                    
                    let candidateStart = 0;
                    switch (parsed.type) {
                        case 'FS': candidateStart = pEnd + parsed.lag; break;
                        case 'SS': candidateStart = pStart + parsed.lag; break;
                        case 'FF': candidateStart = (pEnd + parsed.lag) - taskDur; break;
                        case 'SF': candidateStart = (pStart + parsed.lag) - taskDur; break;
                    }
                    if (candidateStart < 0) candidateStart = 0;
                    if (candidateStart > earliestStart) earliestStart = candidateStart;
                }

                if (earliestStart >= 0) {
                    const currentStart = taskById.get(task.id)!.start;
                    if (earliestStart !== currentStart) {
                        taskById.get(task.id)!.start = earliestStart;
                        changed = true;
                    }
                }
            }
            
            if (!changed) break;
        }

        // Write all changes to DB
        for (const task of allTasks) {
            const updated = taskById.get(task.id)!;
            if (updated.start !== task.start) {
                await prisma.task.update({
                    where: { id: task.id },
                    data: { start: updated.start }
                });
            }
        }
    } catch (e) {
        console.error('autoSchedule error:', e);
    }
}

function parseDependency(dep: string) {
    const match = dep.match(/^([\d\.]+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+\s*d)?$/i);
    if (!match) return { key: dep.replace(/[^0-9.]/g, '').trim(), type: 'FS' as string, lag: 0 };
    return {
        key: match[1],
        type: (match[2]?.toUpperCase() || 'FS') as string,
        lag: match[3] ? parseInt(match[3].replace(/\s/g, '').toLowerCase().replace('d', '')) : 0
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

"use server";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { triggerObsidianSync } from "./obsidian";

export async function getProjectMilestones(projectId: number) {
    try {
        const milestones = await prisma.projectMilestone.findMany({
            where: { projectId: Number(projectId) },
            orderBy: { targetDate: 'asc' }
        });
        return { success: true, milestones };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function createMilestone(projectId: number, data: any) {
    try {
        const milestone = await prisma.projectMilestone.create({
            data: {
                projectId: Number(projectId),
                title: data.title,
                targetDate: new Date(data.targetDate),
                completionPercentage: Number(data.completionPercentage || 0),
                status: data.status || "Planejado"
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, milestone };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateMilestone(projectId: number, milestoneId: number, data: any) {
    try {
        const milestone = await prisma.projectMilestone.update({
            where: { id: milestoneId },
            data: {
                title: data.title,
                targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
                completionPercentage: data.completionPercentage !== undefined ? Number(data.completionPercentage) : undefined,
                status: data.status
            }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true, milestone };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
export async function deleteMilestone(projectId: number, milestoneId: number) {
    try {
        await prisma.projectMilestone.delete({
            where: { id: milestoneId }
        });
        revalidatePath(`/projeto/${projectId}`);
        await triggerObsidianSync();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

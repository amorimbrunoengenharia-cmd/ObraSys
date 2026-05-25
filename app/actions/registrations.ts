"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerObsidianSync } from './obsidian';

export async function getJobRoles() {
    return await prisma.jobRole.findMany({ orderBy: { name: 'asc' } });
}

export async function saveJobRole(name: string) {
    const role = await prisma.jobRole.upsert({
        where: { name },
        update: {},
        create: { name }
    });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
    return role;
}

export async function deleteJobRole(id: number) {
    await prisma.jobRole.delete({ where: { id } });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
}

export async function getCompanies() {
    return await prisma.company.findMany({ orderBy: { name: 'asc' } });
}

export async function saveCompany(name: string) {
    const company = await prisma.company.upsert({
        where: { name },
        update: {},
        create: { name }
    });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
    return company;
}

export async function deleteCompany(id: number) {
    await prisma.company.delete({ where: { id } });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
}

export async function getEquipmentTypes() {
    return await prisma.equipmentType.findMany({ orderBy: { name: 'asc' } });
}

export async function saveEquipmentType(name: string) {
    const equip = await prisma.equipmentType.upsert({
        where: { name },
        update: {},
        create: { name }
    });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
    return equip;
}

export async function deleteEquipmentType(id: number) {
    await prisma.equipmentType.delete({ where: { id } });
    revalidatePath('/configuracoes/cadastros');
    await triggerObsidianSync();
}

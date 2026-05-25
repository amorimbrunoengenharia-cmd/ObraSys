'use server';

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSetting(key: string) {
    try {
        const setting = await prisma.systemSetting.findUnique({ where: { key } });
        return setting?.value || null;
    } catch (e) {
        console.error('Error fetching setting:', key, e);
        return null;
    }
}

export async function updateSetting(key: string, value: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
        revalidatePath('/rh');
        return { success: true };
    } catch (e) {
        console.error('Error updating setting:', key, e);
        return { success: false, error: 'Failed to update setting' };
    }
}

"use server";
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Verifica vencimentos financeiros e cria notificações para os gestores.
 */
export async function checkFinancialDeadlines() {
    try {
        const today = new Date();
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(today.getDate() + 2);

        // 1. Busca registros pendentes que vencem nos próximos 2 dias
        const upcomingDeadlines = await prisma.financialRecord.findMany({
            where: {
                status: { in: ['Pendente', 'A Vencer', 'Atrasado', 'A PAGAR', 'A RECEBER'] },
                dataVencimento: {
                    lte: twoDaysFromNow,
                    gte: today
                }
            },
            include: { project: true }
        });

        if (upcomingDeadlines.length === 0) return { success: true, count: 0 };

        // 2. Busca todos os usuários com papel de 'Diretor' ou 'Gerente de Obras'
        const managers = await prisma.user.findMany({
            where: {
                role: { in: ['Diretor', 'Gerente de Obras'] }
            }
        });

        let createdCount = 0;

        for (const record of upcomingDeadlines) {
            for (const manager of managers) {
                // Evita criar notificações duplicadas para o mesmo registro e usuário
                const existing = await prisma.notification.findFirst({
                    where: {
                        userId: manager.id,
                        link: `/projeto/${record.projectId}?tab=financeiro`,
                        title: { contains: record.descricao || '' }
                    }
                });

                if (!existing) {
                    await prisma.notification.create({
                        data: {
                            userId: manager.id,
                            title: `⚠️ Vencimento Próximo: ${record.descricao}`,
                            message: `O lançamento de ${record.tipo} no valor de R$ ${record.valorLiquido.toFixed(2)} vence em ${new Date(record.dataVencimento!).toLocaleDateString('pt-BR')}.`,
                            type: 'WARNING',
                            link: `/projeto/${record.projectId}?tab=financeiro`
                        }
                    });
                    createdCount++;
                }
            }
        }

        revalidatePath('/');
        return { success: true, count: createdCount };
    } catch (e: any) {
        console.error("Erro ao verificar prazos financeiros:", e);
        return { success: false, error: e.message };
    }
}

export async function getNotifications(userId: number) {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: Number(userId) },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return notifications;
    } catch (e) {
        return [];
    }
}

export async function markAsRead(notificationId: number) {
    try {
        await prisma.notification.update({
            where: { id: Number(notificationId) },
            data: { isRead: true }
        });
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

export async function markAllAsRead(userId: number) {
    try {
        await prisma.notification.updateMany({
            where: { userId: Number(userId), isRead: false },
            data: { isRead: true }
        });
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

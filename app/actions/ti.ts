"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

// ============================================================================
// ATIVOS (ItAsset)
// ============================================================================

export async function getItAssets() {
  try {
    return await prisma.itAsset.findMany({
      include: { employee: true },
      orderBy: { tag: 'asc' }
    });
  } catch (error) {
    console.error("Erro ao buscar ativos:", error);
    return [];
  }
}

export async function createItAsset(data: {
  tag: string;
  category: string;
  brand?: string;
  model?: string;
  status?: string;
  purchaseDate?: Date;
  warrantyExpiration?: Date;
  employeeId?: string;
}) {
  try {
    const asset = await prisma.itAsset.create({ 
      data: {
        ...data,
        history: {
          create: {
            action: "Criado",
            employeeId: data.employeeId || null,
            notes: "Ativo registrado no sistema"
          }
        }
      }
    });
    revalidatePath('/ti');
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignItAsset(assetId: string, employeeId: string | null) {
  try {
    const asset = await prisma.itAsset.update({
      where: { id: assetId },
      data: {
        employeeId,
        status: employeeId ? "Em Uso" : "Disponível",
        history: {
          create: {
            action: employeeId ? "Atribuído" : "Devolvido ao Estoque",
            employeeId: employeeId || null,
            notes: employeeId ? "Equipamento entregue ao colaborador" : "Equipamento devolvido"
          }
        }
      }
    });
    revalidatePath('/ti');
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}


export async function getItAssetHistory(assetId: string) {
  try {
    return await prisma.itAssetHistory.findMany({
      where: { assetId },
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar historico:", error);
    return [];
  }
}

export async function unassignAssetsFromEmployee(employeeId: string) {
  try {
    await prisma.itAsset.updateMany({
      where: { employeeId },
      data: { employeeId: null, status: "Disponível" }
    });
    revalidatePath('/ti');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteItAsset(id: string) {
  try {
    await prisma.itAsset.delete({ where: { id } });
    revalidatePath('/ti');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// LICENÇAS (ItLicense)
// ============================================================================

export async function getItLicenses() {
  try {
    return await prisma.itLicense.findMany({
      orderBy: { softwareName: 'asc' }
    });
  } catch (error) {
    return [];
  }
}

export async function createItLicense(data: {
  softwareName: string;
  type: string;
  totalSeats: number;
  costPerSeat: number;
  expirationDate?: Date;
}) {
  try {
    const license = await prisma.itLicense.create({ data });
    revalidatePath('/ti');
    return { success: true, license };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateLicenseSeats(id: string, usedSeats: number) {
  try {
    const license = await prisma.itLicense.update({
      where: { id },
      data: { usedSeats }
    });
    revalidatePath('/ti');
    return { success: true, license };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteItLicense(id: string) {
  try {
    await prisma.itLicense.delete({ where: { id } });
    revalidatePath('/ti');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CHAMADOS (ItTicket)
// ============================================================================

export async function getItTickets() {
  try {
    return await prisma.itTicket.findMany({
      include: { user: true, project: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function getMyTickets() {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get('userEmail')?.value || '');
    if (!userEmail) return [];
    
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return [];

    return await prisma.itTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function createItTicket(data: {
  title: string;
  description: string;
  priority: string;
  userId: number;
  projectId?: number;
}) {
  try {
    let finalUserId = data.userId;
    if (finalUserId === 0) {
      const cookieStore = await cookies();
      const userEmail = decodeURIComponent(cookieStore.get('userEmail')?.value || '');
      if (userEmail) {
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) finalUserId = user.id;
      }
    }

    const ticket = await prisma.itTicket.create({
      data: { ...data, userId: finalUserId, status: "Aberto" }
    });
    
    // Notificar TI
    const tiUsers = await prisma.user.findMany({ where: { role: 'TI' } });
    if (tiUsers.length > 0) {
      await prisma.notification.createMany({
        data: tiUsers.map(u => ({
          userId: u.id,
          title: "Novo Chamado T.I.",
          message: `${data.title} (${data.priority})`,
          type: "WARNING",
          link: "/ti"
        }))
      });
    }

    revalidatePath('/ti');
    return { success: true, ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateItTicketStatus(id: string, status: string) {
  try {
    const ticket = await prisma.itTicket.update({
      where: { id },
      data: { status }
    });

    // Notificar usuário que abriu
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        title: "Atualização no seu Chamado",
        message: `O chamado "${ticket.title}" mudou para: ${status}`,
        type: "INFO",
        link: "/"
      }
    });

    revalidatePath('/ti');
    return { success: true, ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// CONFIGURAÇÕES DO SISTEMA (Aprovações)
// ============================================================================

export async function getPurchaseApprovalRules() {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'PURCHASE_APPROVAL_RULES' }
    });
    if (!setting) return null;
    return JSON.parse(setting.value);
  } catch (error) {
    console.error("Erro ao ler regras:", error);
    return null;
  }
}

export async function updatePurchaseApprovalRules(rules: any) {
  try {
    const value = JSON.stringify(rules);
    await prisma.systemSetting.upsert({
      where: { key: 'PURCHASE_APPROVAL_RULES' },
      update: { value },
      create: { key: 'PURCHASE_APPROVAL_RULES', value }
    });
    revalidatePath('/ti');
    revalidatePath('/suprimentos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
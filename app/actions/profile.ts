"use server";
import { prisma } from '../../lib/prisma';
import { cookies } from 'next/headers';

export async function getMyProfileData() {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get('userEmail')?.value || '');
    if (!userEmail) return { success: false };
    
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return { success: false };

    // Fetch Tickets
    const tickets = await prisma.itTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Try to find Employee matching by name (or email if we had it)
    const employee = await prisma.employee.findFirst({
      where: { name: user.name },
      include: {
        documents: true,
        epis: true,
        jobRole: true
      }
    });

    let assets: any[] = [];
    if (employee) {
       assets = await prisma.itAsset.findMany({
         where: { employeeId: employee.id }
       });
    }

    return {
      success: true,
      user,
      employee,
      tickets,
      assets
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProfileAvatar(avatarUrl: string) {
  try {
    const cookieStore = await cookies();
    const userEmail = decodeURIComponent(cookieStore.get('userEmail')?.value || '');
    if (!userEmail) return { success: false, error: "Não autenticado." };
    
    await prisma.user.update({
      where: { email: userEmail },
      data: { avatarUrl }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

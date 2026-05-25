import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const id = searchParams.get('id');

    if (id) {
      const request = await prisma.purchaseRequest.findUnique({
        where: { id: id },
        include: {
          project: true,
          items: { include: { material: true } },
          supplier: true,
          quotations: {
            include: { supplier: true }
          }
        }
      });
      return NextResponse.json(request);
    }

    const requests = await prisma.purchaseRequest.findMany({
      where: projectId ? { projectId: Number(projectId) } : {},
      include: {
        project: true,
        items: { include: { material: true } },
        supplier: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapeia para um formato amigável ao mobile
    const formatted = requests.map(r => ({
      id: r.id,
      material: r.items.map(i => i.material.name).join(', ') || 'Sem itens',
      quantidade: r.items.length,
      unidade: 'itens',
      status: r.status, // PENDENTE, APROVADO, COMPRADO, ENTREGUE
      obra: r.project?.name,
      data: new Date(r.createdAt).toLocaleDateString('pt-BR'),
      urgencia: r.items[0]?.urgency || 'BAIXA'
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erro na API Suprimentos:', error);
    return NextResponse.json({ error: 'Erro ao carregar suprimentos' }, { status: 500 });
  }
}

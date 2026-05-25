import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
    // Unifica os contatos para o mobile
    const unified = [
      ...suppliers.map(s => ({ id: s.id, name: s.name, type: s.type, email: s.email, phone: s.phone, document: s.cnpj }))
    ];

    return NextResponse.json(unified);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar contatos' }, { status: 500 });
  }
}

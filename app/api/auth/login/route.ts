import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca o usuário no banco de dados real
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Verifica se o usuário existe e se a senha bate
    // Nota: Em produção usaríamos bcrypt para comparar senhas enviadas com hashes
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Retorna os dados do usuário para o Mobile (igual ao que o site espera)
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: "mock-jwt-token-" + user.id // Token fictício para manter a compatibilidade
    });

  } catch (error) {
    console.error('Erro no login API:', error);
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}

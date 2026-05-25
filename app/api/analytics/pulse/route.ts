import { NextRequest, NextResponse } from 'next/server';
import { getProjectPulse } from '@/app/actions/ia-center';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'ID do projeto é obrigatório' }, { status: 400 });
  }

  try {
    const result = await getProjectPulse(parseInt(projectId));
    if (result.success) {
      return NextResponse.json(result.data);
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar pulso do projeto' }, { status: 500 });
  }
}

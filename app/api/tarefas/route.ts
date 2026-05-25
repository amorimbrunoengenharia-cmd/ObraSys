import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Lista as tarefas de uma obra
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId: parseInt(projectId) },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar tarefas' }, { status: 500 });
  }
}

// POST: Atualiza o status de uma tarefa (ex: mover no Kanban)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, newStatus, newColumnId } = body;

    if (!taskId || !newStatus) {
      return NextResponse.json({ error: 'taskId e newStatus são obrigatórios' }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: parseInt(taskId) },
      data: { 
        status: newStatus,
        columnId: newColumnId || null
      },
    });

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar tarefa' }, { status: 500 });
  }
}

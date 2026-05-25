import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'ProjectId é obrigatório' }, { status: 400 });
    }

    const parentId = searchParams.get('parentId');
    
    // Filtros base
    const folderFilter: any = { projectId: Number(projectId) };
    if (parentId && parentId !== 'null') {
      folderFilter.parentId = Number(parentId);
    } else {
      folderFilter.parentId = null; // Pastas raiz
    }

    // Busca pastas
    const folders = await prisma.documentFolder.findMany({
      where: folderFilter,
      include: {
        documents: true
      }
    });

    // Busca documentos (arquivos) dentro da pasta atual ou órfãos se for na raiz
    const files = await prisma.document.findMany({
      where: { 
        projectId: Number(projectId), 
        folderId: parentId && parentId !== 'null' ? Number(parentId) : null 
      }
    });

    return NextResponse.json({
      folders,
      files
    });
  } catch (error) {
    console.error('Erro na API GED:', error);
    return NextResponse.json({ error: 'Erro ao carregar documentos' }, { status: 500 });
  }
}

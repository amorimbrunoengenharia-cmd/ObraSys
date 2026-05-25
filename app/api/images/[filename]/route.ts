import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    
    // Identificar o tipo de arquivo (jpg, png, etc)
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error("Erro ao servir imagem:", error);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}

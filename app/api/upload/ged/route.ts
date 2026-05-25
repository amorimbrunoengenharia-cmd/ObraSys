import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as any;

        if (!file) {
            return NextResponse.json({ success: false, error: 'Arquivo não encontrado' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Caminho físico: /public/uploads/ged
        const uploadDir = join(process.cwd(), 'public', 'uploads', 'ged');
        
        // Garante que o diretório existe
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Nome único para evitar colisão
        const uniqueName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
        const filePath = join(uploadDir, uniqueName);

        // Salva o arquivo no disco
        await writeFile(filePath, buffer);

        // Retorna o caminho relativo para salvar no banco
        const relativeUrl = `/uploads/ged/${uniqueName}`;

        return NextResponse.json({ 
            success: true, 
            url: relativeUrl,
            name: file.name,
            size: file.size,
            type: file.type
        });

    } catch (error: any) {
        console.error("Erro no Upload GED:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

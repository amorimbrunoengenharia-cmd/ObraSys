import { NextResponse } from 'next/server';
import { triggerObsidianSync } from '../../../actions/obsidian';

/**
 * POST /api/obsidian/sync
 * 
 * Endpoint chamado pelo botão "Sync Obsidian" do GlobalDashboard.
 * Aciona a sincronização completa de todos os módulos para o vault local.
 * Retorna relatório detalhado com contagem de notas exportadas.
 */
export async function POST(request: Request) {
    try {
        // Extrair projectId opcional do body (para sync granular)
        let projectId: number | undefined;
        try {
            const body = await request.json();
            if (body?.projectId) projectId = Number(body.projectId);
        } catch {
            // Body vazio = sync global (todos os projetos)
        }

        const result = await triggerObsidianSync(projectId);
        
        return NextResponse.json(result, { 
            status: result.success ? 200 : 500 
        });
    } catch (error: any) {
        console.error("API /obsidian/sync error:", error);
        return NextResponse.json(
            { success: false, message: `Erro interno: ${error.message}` }, 
            { status: 500 }
        );
    }
}

/**
 * GET /api/obsidian/sync
 * 
 * Retorna status da configuração Obsidian (útil para diagnóstico).
 */
export async function GET() {
    const path = await import('path');
    const fs = await import('fs');
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH || (process.env.VERCEL ? '/tmp/obrasys_vault' : path.join(process.cwd(), 'obsidian_vault'));
    const exists = fs.existsSync(vaultPath);

    let noteCount = 0;
    if (exists) {
        const countFiles = (dir: string): number => {
            let count = 0;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    count += countFiles(path.join(dir, entry.name));
                } else if (entry.name.endsWith('.md')) {
                    count++;
                }
            }
            return count;
        };
        noteCount = countFiles(vaultPath);
    }

    return NextResponse.json({
        success: true,
        configured: true,
        vaultPath,
        vaultExists: exists,
        totalNotes: noteCount,
        message: exists 
            ? `✅ Vault ativo com ${noteCount} notas.` 
            : '⚠️ Vault não inicializado. Execute um sync para criar.'
    });
}

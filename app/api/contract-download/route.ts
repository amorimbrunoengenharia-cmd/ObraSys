import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configurar o Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // ── CASO 1: URL do Cloudinary ──────────────────────────────────────
    if (urlParam.includes('res.cloudinary.com')) {

      // Extrair o public_id da URL. Ex: obrasys_rdos/yiabjkil3gr1kostfwa2.pdf
      const match = urlParam.match(/(obrasys_rdos\/[^\?]+)/);
      if (!match) {
        return errorResponse('Não foi possível extrair o public_id da URL do Cloudinary.');
      }

      const publicIdWithExt = match[1].replace('fl_attachment/', '');
      
      // O Cloudinary bloqueia PDFs servidos como resource_type=image por segurança (401).
      // Precisamos usar a Cloudinary Admin/Download API para gerar uma URL autenticada.
      // 
      // ESTRATÉGIA: Tentamos múltiplas abordagens em cascata até uma funcionar:
      //   1. cloudinary.utils.private_download_url (URL de download autenticada - ideal)
      //   2. cloudinary.url com sign_url + resource_type raw (caso tenha sido enviado como raw)
      //   3. cloudinary.url com sign_url + resource_type image (URL original assinada)
      //   4. Acesso direto à URL original sem assinatura (fallback final)

      const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
      const api_key = process.env.CLOUDINARY_API_KEY;
      const api_secret = process.env.CLOUDINARY_API_SECRET;

      if (!cloud_name || !api_key || !api_secret) {
        console.error('[contract-download] Cloudinary env vars missing. CLOUD_NAME:', !!cloud_name, 'API_KEY:', !!api_key, 'API_SECRET:', !!api_secret);
        return errorResponse('Configuração do servidor incompleta. Variáveis do Cloudinary não encontradas.');
      }

      // Separar nome do arquivo sem extensão (Cloudinary public_id não inclui extensão no private_download_url)
      const lastDotIdx = publicIdWithExt.lastIndexOf('.');
      const publicId = lastDotIdx > 0 ? publicIdWithExt.substring(0, lastDotIdx) : publicIdWithExt;
      const extension = lastDotIdx > 0 ? publicIdWithExt.substring(lastDotIdx + 1) : 'pdf';

      console.log('[contract-download] Processing:', { publicId, extension, publicIdWithExt });

      // ── Tentativa 1: private_download_url (mais confiável para PDFs) ──
      try {
        const privateUrl = cloudinary.utils.private_download_url(publicId, extension, {
          resource_type: 'image',
          type: 'upload',
        });
        console.log('[contract-download] Attempt 1 - private_download_url (image):', privateUrl.substring(0, 80) + '...');
        
        const res = await fetch(privateUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log('[contract-download] SUCCESS via private_download_url (image). Size:', buffer.byteLength);
            return pdfResponse(buffer, publicIdWithExt);
          }
        }
        console.log('[contract-download] Attempt 1 failed. Status:', res.status);
      } catch (e: any) {
        console.log('[contract-download] Attempt 1 exception:', e.message);
      }

      // ── Tentativa 2: private_download_url com resource_type raw ──
      try {
        const privateUrl = cloudinary.utils.private_download_url(publicId, extension, {
          resource_type: 'raw',
          type: 'upload',
        });
        console.log('[contract-download] Attempt 2 - private_download_url (raw):', privateUrl.substring(0, 80) + '...');
        
        const res = await fetch(privateUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log('[contract-download] SUCCESS via private_download_url (raw). Size:', buffer.byteLength);
            return pdfResponse(buffer, publicIdWithExt);
          }
        }
        console.log('[contract-download] Attempt 2 failed. Status:', res.status);
      } catch (e: any) {
        console.log('[contract-download] Attempt 2 exception:', e.message);
      }

      // ── Tentativa 3: signed URL com resource_type image ──
      try {
        const signedUrl = cloudinary.url(publicIdWithExt, {
          sign_url: true,
          secure: true,
          resource_type: 'image',
        });
        console.log('[contract-download] Attempt 3 - signed URL (image):', signedUrl.substring(0, 80) + '...');
        
        const res = await fetch(signedUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log('[contract-download] SUCCESS via signed URL (image). Size:', buffer.byteLength);
            return pdfResponse(buffer, publicIdWithExt);
          }
        }
        console.log('[contract-download] Attempt 3 failed. Status:', res.status);
      } catch (e: any) {
        console.log('[contract-download] Attempt 3 exception:', e.message);
      }

      // ── Tentativa 4: signed URL com resource_type raw ──
      try {
        const signedUrl = cloudinary.url(publicIdWithExt, {
          sign_url: true,
          secure: true,
          resource_type: 'raw',
        });
        console.log('[contract-download] Attempt 4 - signed URL (raw):', signedUrl.substring(0, 80) + '...');
        
        const res = await fetch(signedUrl);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log('[contract-download] SUCCESS via signed URL (raw). Size:', buffer.byteLength);
            return pdfResponse(buffer, publicIdWithExt);
          }
        }
        console.log('[contract-download] Attempt 4 failed. Status:', res.status);
      } catch (e: any) {
        console.log('[contract-download] Attempt 4 exception:', e.message);
      }

      // ── Tentativa 5: URL original direta (último recurso) ──
      try {
        console.log('[contract-download] Attempt 5 - direct original URL');
        const res = await fetch(urlParam);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer.byteLength > 100) {
            console.log('[contract-download] SUCCESS via direct URL. Size:', buffer.byteLength);
            return pdfResponse(buffer, publicIdWithExt);
          }
        }
        console.log('[contract-download] Attempt 5 failed. Status:', res.status);
      } catch (e: any) {
        console.log('[contract-download] Attempt 5 exception:', e.message);
      }

      // Se NADA funcionou, retorna um erro amigável em vez de redirecionar para uma URL que vai falhar
      console.error('[contract-download] ALL ATTEMPTS FAILED for:', urlParam);
      return errorResponse(
        'Não foi possível acessar o arquivo PDF no servidor de arquivos (Cloudinary). ' +
        'Isso pode ocorrer porque o Cloudinary bloqueia PDFs por segurança. ' +
        'Tente fazer o re-upload do contrato na tela de edição.'
      );
    }

    // ── CASO 2: URL externa (não Cloudinary) ────────────────────────────
    // Proxy direto
    const res = await fetch(urlParam);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return pdfResponse(buffer, 'contrato.pdf');
    }

    return errorResponse('Não foi possível acessar o arquivo: HTTP ' + res.status);

  } catch (error: any) {
    console.error('[contract-download] Unhandled error:', error);
    return errorResponse('Erro interno do servidor: ' + (error.message || 'desconhecido'));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────

function pdfResponse(buffer: ArrayBuffer, filename: string): NextResponse {
  const cleanName = filename.split('/').pop() || 'documento.pdf';
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${cleanName}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}

function errorResponse(message: string): NextResponse {
  // Retorna uma página HTML simples com a mensagem de erro
  // Em vez de redirecionar para uma URL que vai falhar
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>Erro ao carregar contrato</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0B1121; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #162032; padding: 2rem 3rem; border-radius: 1rem; border: 1px solid #334155; max-width: 500px; text-align: center; }
  h1 { color: #ef4444; font-size: 1.2rem; margin-bottom: 1rem; }
  p { color: #94a3b8; font-size: 0.9rem; line-height: 1.6; }
  a { color: #3b82f6; text-decoration: underline; }
</style>
</head>
<body>
  <div class="card">
    <h1>⚠️ Erro ao carregar o contrato</h1>
    <p>${message}</p>
    <p style="margin-top:1rem"><a href="/comercial">← Voltar para Comercial</a></p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 502,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

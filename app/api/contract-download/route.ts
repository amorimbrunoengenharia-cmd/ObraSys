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
    // Se for URL do Cloudinary, precisamos gerar uma URL assinada (signed URL) 
    // porque o Cloudinary bloqueia PDFs por padrão (retornando 401).
    if (urlParam.includes('res.cloudinary.com') && process.env.CLOUDINARY_API_SECRET) {
      
      // Extrair o public_id. Nossos arquivos sempre ficam na pasta obrasys_rdos
      const match = urlParam.match(/(obrasys_rdos\/[^\?]+)/);
      
      if (match) {
        let publicIdWithExt = match[1];
        
        // Remover "fl_attachment" se estiver inserido no meio por acidente da versão anterior
        publicIdWithExt = publicIdWithExt.replace('fl_attachment/', '');
        
        // Identificar o tipo de recurso
        const resourceType = urlParam.includes('/raw/') ? 'raw' : 'image';
        
        // Gerar URL autenticada que permite baixar o PDF bloqueado
        const signedUrl = cloudinary.utils.url(publicIdWithExt, {
          sign_url: true,
          secure: true,
          resource_type: resourceType,
          flags: 'attachment' // Força o download
        });
        
        // Redireciona o navegador para o link seguro do Cloudinary
        return NextResponse.redirect(signedUrl);
      }
    }
    
    // Se não for do Cloudinary, apenas redireciona normalmente
    return NextResponse.redirect(urlParam);
    
  } catch (error) {
    console.error('Error generating secure download URL:', error);
    // Fallback: redireciona para a URL original em caso de erro no parser
    return NextResponse.redirect(urlParam);
  }
}

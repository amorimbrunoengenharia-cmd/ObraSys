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
        
        // Gerar URL autenticada que permite acessar o PDF
        const signedUrl = cloudinary.utils.url(publicIdWithExt, {
          sign_url: true,
          secure: true,
          resource_type: resourceType
        });
        
        // Proxy o download através do nosso servidor para evitar problemas de CDN/Headers do Cloudinary
        const cloudinaryRes = await fetch(signedUrl);
        
        if (!cloudinaryRes.ok) {
           console.error('Cloudinary response not ok:', cloudinaryRes.status);
           return NextResponse.redirect(urlParam); // fallback
        }
        
        const buffer = await cloudinaryRes.arrayBuffer();
        
        return new NextResponse(buffer, {
           headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `attachment; filename="contrato_${publicIdWithExt.split('/').pop() || 'documento.pdf'}"`
           }
        });
      }
    }
    
    // Se não for do Cloudinary, redireciona normalmente
    return NextResponse.redirect(urlParam);
    
  } catch (error) {
    console.error('Error generating secure download URL:', error);
    return NextResponse.redirect(urlParam);
  }
}

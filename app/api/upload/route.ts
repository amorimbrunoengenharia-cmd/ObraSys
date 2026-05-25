import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as any;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      return new Promise<NextResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'obrasys_rdos', resource_type: 'auto' },
          (error, result) => {
            if (error) {
              console.error('Cloudinary Error:', error);
              resolve(NextResponse.json({ error: 'Cloudinary upload failed' }, { status: 500 }));
            } else {
              resolve(NextResponse.json({ url: result?.secure_url }));
            }
          }
        ).end(buffer);
      });
    }

    // Fallback para desenvolvimento local se não tiver nuvem
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'rdos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/uploads/rdos/${fileName}`;
    return NextResponse.json({ url: publicPath });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const eventId = parseInt(id);
        
        await prisma.contractEvent.delete({
            where: { id: eventId }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reset() {
    const sc = await prisma.purchaseRequest.findFirst({
        where: { requestCode: 'SC-2026-006' }
    });
    
    if (sc) {
        await prisma.purchaseRequest.update({
            where: { id: sc.id },
            data: { status: 'EM_COTACAO' }
        });
        
        await prisma.quotation.updateMany({
            where: { purchaseRequestId: sc.id },
            data: { isWinner: false }
        });
        
        console.log("Reset OK!");
    } else {
        console.log("SC not found");
    }
}

reset();

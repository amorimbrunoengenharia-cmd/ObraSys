const fs = require('fs');
const content = fs.readFileSync('app/actions/supply.ts', 'utf8');

const targetStart = '// Notificar Suprimentos e Diretoria';
const targetEnd = 'const result = await prisma.$transaction(async (tx) => {';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

const insertion = `// Notificar Suprimentos e Diretoria
        try {
            const notifyUsers = await prisma.user.findMany({
                where: { role: { in: ['Suprimentos', 'Diretor'] } }
            });
            if (notifyUsers.length > 0) {
                await prisma.notification.createMany({
                    data: notifyUsers.map(u => ({
                        userId: u.id,
                        title: "Nova Solicitação de Compra",
                        message: \`A obra \${request.project?.name} solicitou \${request.items.length} item(ns). (Req: \${code})\`,
                        type: "INFO",
                        link: "/suprimentos"
                    }))
                });
            }
        } catch(err) { console.error("Erro na notificação", err); }

        revalidatePath('/suprimentos');
        return { success: true, request };
    } catch (e: any) {
        console.error("Erro ao criar solicitação:", e);
        return { success: false, error: e.message };
    }
}

export async function createMaterial(data: any) {
    try {
        const material = await prisma.material.create({
            data: {
                code: data.code,
                name: data.name,
                unit: data.unit,
                category: data.category
            }
        });
        revalidatePath('/suprimentos');
        return { success: true, material };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function receivePurchaseOrder(orderId: number) {
    return { success: false, error: "Deprecated" };
}

export async function updatePurchaseRequestStatus(requestId: string, newStatus: string, userRole?: string) {
    try {
        if (newStatus.toUpperCase() === 'APROVADA' && userRole) {
            const req = await prisma.purchaseRequest.findUnique({
                where: { id: requestId },
                include: { items: true }
            });
            const totalValue = req?.items.reduce((acc, it) => acc + (it.quantity * (it.estimatedCost || 0)), 0) || 0;
            
            const setting = await prisma.systemSetting.findUnique({ where: { key: 'PURCHASE_APPROVAL_RULES' } });
            if (setting && setting.value) {
                const rules = JSON.parse(setting.value);
                const sortedRules = rules.sort((a, b) => b.minimumValue - a.minimumValue);
                const applicableRule = sortedRules.find((r) => totalValue >= r.minimumValue);
                
                if (applicableRule) {
                    const approvers = applicableRule.approvers.split(',').map((r) => r.trim().toUpperCase());
                    const currentRole = userRole.trim().toUpperCase();
                    if (!approvers.includes(currentRole) && currentRole !== 'DIRETOR') {
                        return { success: false, error: \`Seu cargo (\${userRole}) não tem alçada para aprovar compras de R$ \${totalValue.toFixed(2)}. Cargos permitidos: \${applicableRule.approvers}\` };
                    }
                }
            }
        }

        await prisma.purchaseRequest.update({
            where: { id: requestId },
            data: { status: newStatus }
        });
        revalidatePath('/suprimentos');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function registerMaterialConsumption(data: {
    inventoryItemId: number;
    quantity: number;
    appliedAt?: string;
    responsible?: string;
}) {
    try {
        `;

const newContent = before + insertion + after;
fs.writeFileSync('app/actions/supply.ts', newContent);
console.log("Fix applied!");

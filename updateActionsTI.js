const fs = require('fs');
const file = 'app/actions/ti.ts';
let content = fs.readFileSync(file, 'utf8');

// Update createItAsset
const oldCreate = `  try {\r\n    const asset = await prisma.itAsset.create({ data });\r\n    revalidatePath('/ti');\r\n    return { success: true, asset };\r\n  } catch (error: any) {\r\n    return { success: false, error: error.message };\r\n  }`;
const oldCreateUnix = oldCreate.replace(/\r/g, '');

const newCreate = `  try {
    const asset = await prisma.itAsset.create({ 
      data: {
        ...data,
        history: {
          create: {
            action: "Criado",
            employeeId: data.employeeId || null,
            notes: "Ativo registrado no sistema"
          }
        }
      }
    });
    revalidatePath('/ti');
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }`;

if (content.includes(oldCreate)) content = content.replace(oldCreate, newCreate);
else if (content.includes(oldCreateUnix)) content = content.replace(oldCreateUnix, newCreate);

// Update assignItAsset
const oldAssign = `  try {\r\n    const asset = await prisma.itAsset.update({\r\n      where: { id: assetId },\r\n      data: {\r\n        employeeId,\r\n        status: employeeId ? "Em Uso" : "Disponível"\r\n      }\r\n    });\r\n    revalidatePath('/ti');\r\n    return { success: true, asset };\r\n  } catch (error: any) {\r\n    return { success: false, error: error.message };\r\n  }`;
const oldAssignUnix = oldAssign.replace(/\r/g, '');
const oldAssignAlternative = `  try {\n    const asset = await prisma.itAsset.update({\n      where: { id: assetId },\n      data: {\n        employeeId,\n        status: employeeId ? "Em Uso" : "Disponvel"\n      }\n    });\n    revalidatePath('/ti');\n    return { success: true, asset };\n  } catch (error: any) {\n    return { success: false, error: error.message };\n  }`;

const newAssign = `  try {
    const asset = await prisma.itAsset.update({
      where: { id: assetId },
      data: {
        employeeId,
        status: employeeId ? "Em Uso" : "Disponível",
        history: {
          create: {
            action: employeeId ? "Atribuído" : "Devolvido ao Estoque",
            employeeId: employeeId || null,
            notes: employeeId ? "Equipamento entregue ao colaborador" : "Equipamento devolvido"
          }
        }
      }
    });
    revalidatePath('/ti');
    return { success: true, asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }`;

if (content.includes(oldAssign)) content = content.replace(oldAssign, newAssign);
else if (content.includes(oldAssignUnix)) content = content.replace(oldAssignUnix, newAssign);
else if (content.includes(oldAssignAlternative)) content = content.replace(oldAssignAlternative, newAssign);
else {
    // Regex replace
    content = content.replace(/try\s*\{\s*const\s*asset\s*=\s*await\s*prisma\.itAsset\.update\([\s\S]*?catch\s*\(error:\s*any\)\s*\{\s*return\s*\{\s*success:\s*false,\s*error:\s*error\.message\s*\};\s*\}/, newAssign);
}

// Add getItAssetHistory if not exists
const newHistoryFunc = `
export async function getItAssetHistory(assetId: string) {
  try {
    return await prisma.itAssetHistory.findMany({
      where: { assetId },
      include: { employee: true },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Erro ao buscar historico:", error);
    return [];
  }
}
`;

if (!content.includes('getItAssetHistory')) {
    content = content.replace('export async function unassignAssetsFromEmployee', newHistoryFunc + '\nexport async function unassignAssetsFromEmployee');
}

fs.writeFileSync(file, content);
console.log('ti.ts actions updated successfully');

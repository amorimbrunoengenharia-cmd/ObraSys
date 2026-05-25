"use server";
import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

// --- ORÇAMENTOS ---

// Aprovar Orçamento e Sincronizar com BudgetItem (DRE)
export async function approveEstimate(estimateId: string) {
  try {
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        stages: {
          include: {
            items: { include: { resources: true } }
          }
        }
      }
    });

    if (!estimate) return { success: false, error: "Orçamento não encontrado" };
    if (!estimate.projectId) return { success: false, error: "Orçamento não vinculado a um projeto" };

    // Atualiza status para Aprovado
    await prisma.estimate.update({
      where: { id: estimateId },
      data: { status: 'Aprovado' }
    });

    // Agrupa itens por tipo de recurso para classificação DRE
    const dreMap: Record<string, { orcado: number, venda: number }> = {};
    
    for (const stage of estimate.stages) {
      for (const item of stage.items) {
        // Tenta classificar os itens por tipo de recurso predominante
        const hasMaoDeObra = item.resources.some(r => r.type === 'MÃO DE OBRA');
        const hasMaterial = item.resources.some(r => r.type === 'MATERIAL');
        const hasEquipamento = item.resources.some(r => r.type === 'EQUIPAMENTO');
        
        // Classificação automática baseada nos recursos
        let dreCategory = '3. CUSTO DIRETO - MÃO DE OBRA'; // default
        if (hasMaterial && !hasMaoDeObra) {
          dreCategory = '2. CUSTO DIRETO - MATERIAIS';
        } else if (hasEquipamento && !hasMaoDeObra && !hasMaterial) {
          dreCategory = '4. CUSTO DIRETO - EQUIPAMENTOS/LOGÍSTICA';
        } else if (hasMaterial && hasMaoDeObra) {
          // Custo misto: dividimos proporcionalmente
          const totalMO = item.resources.filter(r => r.type === 'MÃO DE OBRA').reduce((s, r) => s + r.totalPrice, 0);
          const totalMat = item.resources.filter(r => r.type === 'MATERIAL').reduce((s, r) => s + r.totalPrice, 0);
          dreCategory = totalMat > totalMO ? '2. CUSTO DIRETO - MATERIAIS' : '3. CUSTO DIRETO - MÃO DE OBRA';
        }

        if (!dreMap[dreCategory]) dreMap[dreCategory] = { orcado: 0, venda: 0 };
        dreMap[dreCategory].orcado += item.totalPrice;
        dreMap[dreCategory].venda += item.totalPrice; // Valor de venda = orçado (pode ser ajustado com BDI)
      }
    }

    // Sincroniza com BudgetItem do projeto (upsert por classificação)
    for (const [categoria, valores] of Object.entries(dreMap)) {
      const existing = await prisma.budgetItem.findFirst({
        where: { projectId: estimate.projectId, classificacaoDRE: categoria }
      });

      if (existing) {
        await prisma.budgetItem.update({
          where: { id: existing.id },
          data: {
            valorOrcado: existing.valorOrcado + valores.orcado,
            valorVenda: existing.valorVenda + valores.venda
          }
        });
      } else {
        await prisma.budgetItem.create({
          data: {
            classificacaoDRE: categoria,
            valorOrcado: valores.orcado,
            valorVenda: valores.venda,
            projectId: estimate.projectId
          }
        });
      }
    }

    // Adiciona também uma linha de Receita (valor total do orçamento como potencial de venda)
    const totalOrcamento = estimate.stages.reduce((acc, s) => 
      acc + s.items.reduce((a, i) => a + i.totalPrice, 0), 0);
    
    const existingReceita = await prisma.budgetItem.findFirst({
      where: { projectId: estimate.projectId, classificacaoDRE: '1. RECEITA OPERACIONAL' }
    });

    if (existingReceita) {
      await prisma.budgetItem.update({
        where: { id: existingReceita.id },
        data: { valorVenda: existingReceita.valorVenda + totalOrcamento }
      });
    } else {
      await prisma.budgetItem.create({
        data: {
          classificacaoDRE: '1. RECEITA OPERACIONAL',
          valorOrcado: 0,
          valorVenda: totalOrcamento,
          projectId: estimate.projectId
        }
      });
    }

    revalidatePath('/orcamentos');
    revalidatePath(`/projeto/${estimate.projectId}`);
    return { success: true, message: `Orçamento aprovado e ${Object.keys(dreMap).length} categorias DRE sincronizadas.` };
  } catch (error: any) {
    console.error("Erro ao aprovar orçamento:", error);
    return { success: false, error: error.message };
  }
}

export async function createEstimate(projectId: number | null, name: string) {
  try {
    const estimate = await prisma.estimate.create({
      data: {
        name,
        projectId,
        status: 'Rascunho'
      }
    });
    revalidatePath('/orcamentos');
    return { success: true, estimate };
  } catch (error: any) {
    console.error("Erro no createEstimate:", error);
    return { success: false, error: error.message || "Erro desconhecido" };
  }
}

import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../../lib/permissions';

export async function getEstimates() {
  const cookieStore = await cookies();
  const rawUserRole = cookieStore.get('userRole')?.value || '';
  const rawUserEmail = cookieStore.get('userEmail')?.value || '';
  const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
  const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

  let projectFilter: any = {};
  if (shouldFilterProjects(userRole)) {
      const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
      if (userRole === 'Cliente / Investidor') {
          projectFilter = { clientName: userObj?.name || '---' };
      } else if (userObj) {
          projectFilter = {
              OR: [
                  { employees: { some: { userId: userObj.id } } },
                  { engineerId: userObj.id },
                  { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
              ]
          };
      } else {
          projectFilter = { id: -1 };
      }
  }

  const projectIds = projectFilter.id === -1 ? [-1] : Object.keys(projectFilter).length > 0 ? (await prisma.project.findMany({ where: projectFilter, select: { id: true } })).map(p => p.id) : null;
  const relationFilter = projectIds ? { projectId: { in: projectIds } } : {};

  return await prisma.estimate.findMany({
    where: relationFilter,
    include: { project: true, stages: { include: { items: true } } },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getEstimateDetails(id: string) {
  return await prisma.estimate.findUnique({
    where: { id },
    include: {
      project: true,
      stages: {
        include: {
          items: {
            include: { resources: true }
          }
        },
        orderBy: { order: 'asc' }
      }
    }
  });
}

// --- ETAPAS & ITENS ---

export async function addStage(estimateId: string, name: string) {
  try {
    const lastStage = await prisma.estimateStage.findFirst({
      where: { estimateId },
      orderBy: { order: 'desc' }
    });
    const order = lastStage ? lastStage.order + 1 : 0;

    await prisma.estimateStage.create({
      data: { estimateId, name, order }
    });
    revalidatePath(`/orcamentos/${estimateId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Erro ao adicionar etapa" };
  }
}

export async function addItemToStage(stageId: string, data: {
  description: string,
  unit: string,
  quantity: number,
  unitPrice: number,
  code?: string,
  resources?: any[]
}) {
  try {
    const totalPrice = data.quantity * data.unitPrice;
    const item = await prisma.estimateItem.create({
      data: {
        stageId,
        description: data.description,
        unit: data.unit,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalPrice,
        code: data.code,
        resources: {
          create: data.resources?.map(r => ({
            description: r.description,
            unit: r.unit,
            type: r.type,
            coefficient: r.coefficient,
            unitPrice: r.unitPrice,
            totalPrice: r.coefficient * r.unitPrice
          }))
        }
      }
    });

    // Atualizar total do orçamento
    const stage = await prisma.estimateStage.findUnique({ where: { id: stageId } });
    if (stage) {
      const estimateItems = await prisma.estimateItem.findMany({
        where: { stage: { estimateId: stage.estimateId } }
      });
      const total = estimateItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
      await prisma.estimate.update({
        where: { id: stage.estimateId },
        data: { totalAmount: total }
      });
    }

    revalidatePath('/orcamentos');
    return { success: true, item };
  } catch (error) {
    return { success: false, error: "Erro ao adicionar item" };
  }
}

// --- REFERÊNCIAS (MOCK/SEARCH) ---

export async function searchReferenceCompositions(query: string, database?: string, state?: string, date?: string) {
  const refs = await prisma.referenceComposition.findMany({
    where: {
      AND: [
        database ? { database: database } : {},
        state ? { state } : {},
        date ? { referenceDate: date } : {},
        query ? {
          OR: [
            { description: { contains: query } },
            { code: { contains: query } }
          ]
        } : {}
      ]
    },
    include: {
      resources: {
        include: {
          linkedComposition: {
            include: { resources: true }
          }
        }
      }
    },
    take: 100
  });

  if (refs.length === 0 && query.toLowerCase().includes('concreto')) {
    // MOCK para demonstração se o banco estiver vazio
    return [
      {
        id: 'mock-1',
        database: 'CDHU',
        code: '01.02.030',
        description: 'Concreto fck=25MPa preparado no local',
        unit: 'm3',
        resources: [
          { description: 'Cimento CP-II', unit: 'kg', type: 'MATERIAL', coefficient: 350, defaultPrice: 0.8 },
          { description: 'Areia Média', unit: 'm3', type: 'MATERIAL', coefficient: 0.7, defaultPrice: 120 },
          { description: 'Pedra Brita', unit: 'm3', type: 'MATERIAL', coefficient: 0.8, defaultPrice: 95 },
          { description: 'Pedreiro', unit: 'h', type: 'MÃO DE OBRA', coefficient: 2, defaultPrice: 25 },
          { description: 'Servente', unit: 'h', type: 'MÃO DE OBRA', coefficient: 5, defaultPrice: 18 }
        ]
      }
    ];
  }

  return refs;
}

export async function seedReferenceMock() {
  const count = await prisma.referenceComposition.count();
  if (count > 1) return; // Se já tem mais de um, não faz nada

  // Alvenaria
  await prisma.referenceComposition.upsert({
    where: { 
      code_state_referenceDate_database: {
        code: '11.01.020',
        state: 'SP',
        referenceDate: '02/2024',
        database: 'CDHU'
      }
    },
    update: {},
    create: {
      database: 'CDHU',
      code: '11.01.020',
      description: 'Alvenaria de bloco cerâmico 9x19x19cm',
      unit: 'm2',
      state: 'SP',
      referenceDate: '02/2024',
      resources: {
        create: [
          { description: 'Bloco Cerâmico', unit: 'un', type: 'MATERIAL', coefficient: 25, defaultPrice: 1.2 },
          { description: 'Pedreiro', unit: 'h', type: 'MÃO DE OBRA', coefficient: 1.2, defaultPrice: 22 },
          { description: 'Servente', unit: 'h', type: 'MÃO DE OBRA', coefficient: 1.0, defaultPrice: 16 },
        ]
      }
    }
  });

  // Viga
  await prisma.referenceComposition.upsert({
    where: { 
      code_state_referenceDate_database: {
        code: '05.02.100',
        state: 'SP',
        referenceDate: '02/2024',
        database: 'CDHU'
      }
    },
    update: {},
    create: {
      database: 'CDHU',
      code: '05.02.100',
      description: 'Viga de concreto armado fck=25MPa',
      unit: 'm3',
      state: 'SP',
      referenceDate: '02/2024',
      resources: {
        create: [
          { description: 'Concreto fck=25MPa', unit: 'm3', type: 'MATERIAL', coefficient: 1.05, defaultPrice: 380 },
          { description: 'Aço CA-50', unit: 'kg', type: 'MATERIAL', coefficient: 80, defaultPrice: 7.5 },
          { description: 'Carpinteiro', unit: 'h', type: 'MÃO DE OBRA', coefficient: 8, defaultPrice: 24 },
          { description: 'Armador', unit: 'h', type: 'MÃO DE OBRA', coefficient: 6, defaultPrice: 24 },
        ]
      }
    }
  });
}

export async function deleteEstimateItem(itemId: string) {
  try {
    const item = await prisma.estimateItem.findUnique({ where: { id: itemId }, include: { stage: true } });
    await prisma.estimateItem.delete({ where: { id: itemId } });
    if (item?.stage?.estimateId) {
      revalidatePath(`/orcamentos`);
      revalidatePath(`/orcamentos?id=${item.stage.estimateId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir item:', error);
    return { success: false, error: 'Erro ao excluir item' };
  }
}

export async function deleteEstimateStage(stageId: string) {
  try {
    const stage = await prisma.estimateStage.findUnique({ where: { id: stageId } });
    await prisma.estimateStage.delete({ where: { id: stageId } });
    if (stage?.estimateId) {
      revalidatePath(`/orcamentos`);
      revalidatePath(`/orcamentos?id=${stage.estimateId}`);
    }
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir etapa:', error);
    return { success: false, error: 'Erro ao excluir etapa' };
  }
}



export async function syncLocalSinapiFiles(targetState: string = 'SP') {
  try {
    const sinapiDir = path.join(process.cwd(), 'SINAPI');
    if (!fs.existsSync(sinapiDir)) return { success: false, error: 'Pasta /SINAPI não encontrada' };

    const files = fs.readdirSync(sinapiDir);
    const refFile = files.find(f => f.includes('Referência') && f.endsWith('.xlsx'));
    if (!refFile) return { success: false, error: 'Arquivo de Referência não encontrado na pasta /SINAPI' };

    const filePath = path.join(sinapiDir, refFile);
    const buffer = fs.readFileSync(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // 1. MAPEAMENTO DE PREÇOS E SEED DE ITENS (ISD e CSD)
    const priceMap: Record<string, number> = {};
    const compositions: Record<string, any> = {};
    
    const parseNumber = (val: any) => {
      if (typeof val === 'number') return val;
      const raw = String(val || '0').trim();
      // Se já tem formato de número JS (1234.56), não faz replace de ponto
      if (/^\d+\.\d+$/.test(raw)) return parseFloat(raw);
      
      const cleaned = raw.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const findStateColumn = (data: any[][], state: string) => {
      for (let i = 0; i < 15; i++) {
        if (!data[i]) continue;
        const colIndex = data[i].findIndex(c => 
          String(c || '').toUpperCase() === state.toUpperCase() || 
          String(c || '').toUpperCase().includes(`-${state.toUpperCase()}`)
        );
        if (colIndex !== -1) return colIndex;
      }
      return -1;
    };

    // Função auxiliar para registrar item básico
    const seedItem = (code: string, desc: string, unit: string, price: number) => {
      if (!code || code === '0' || !/\d/.test(code)) return;
      if (price > 0) priceMap[code] = price;
      if (!compositions[code]) {
        compositions[code] = {
          code,
          description: desc,
          unit,
          unitPrice: price,
          resources: []
        };
      } else if (price > 0 && compositions[code].unitPrice === 0) {
        compositions[code].unitPrice = price;
      }
    };

    // Mapear Insumos (ISD)
    const isdSheet = workbook.Sheets['ISD'];
    if (isdSheet) {
      const isdData: any[][] = xlsx.utils.sheet_to_json(isdSheet, { header: 1 });
      const stateCol = findStateColumn(isdData, targetState);
      if (stateCol !== -1) {
        isdData.forEach((row, idx) => {
          if (idx < 9) return;
          seedItem(String(row[1]||''), String(row[2]||''), String(row[3]||''), parseNumber(row[stateCol]));
        });
      }
    }

    // Mapear Composições Sumário (CSD)
    const csdSheet = workbook.Sheets['CSD'];
    if (csdSheet) {
      const csdData: any[][] = xlsx.utils.sheet_to_json(csdSheet, { header: 1 });
      const stateCol = findStateColumn(csdData, targetState);
      if (stateCol !== -1) {
        csdData.forEach((row, idx) => {
          if (idx < 9) return;
          seedItem(String(row[1]||''), String(row[2]||''), String(row[3]||''), parseNumber(row[stateCol]));
        });
      }
    }
    console.log(`[Backend] Itens base mapeados: ${Object.keys(compositions).length}`);

    // 2. MAPEAMENTO ANALÍTICO (Relacionamentos)
    const analyticSheet = workbook.Sheets['Analítico'] || workbook.Sheets['Analitico'];
    if (analyticSheet) {
      const analyticData: any[][] = xlsx.utils.sheet_to_json(analyticSheet, { header: 1 });
      analyticData.forEach((row, idx) => {
        if (idx < 10) return;
        
        const mainCode = String(row[1] || '').trim();
        const type = String(row[2] || '').trim().toUpperCase();
        const resCode = String(row[3] || '').trim();
        const desc = String(row[4] || '').trim();
        const unit = String(row[5] || '').trim();
        const coef = parseNumber(row[6]);

        if (!mainCode || mainCode === '0' || !compositions[mainCode]) return;

        // Se a linha tem um recurso (Tipo não é vazio)
        if (type && type !== 'NULL' && type !== '0' && resCode) {
          compositions[mainCode].resources.push({
            code: resCode,
            description: desc,
            unit: unit,
            type: type.includes('INSUMO') || type.includes('MATERIAL') ? 'MATERIAL' : 'OUTROS',
            coefficient: coef || 0,
            unitPrice: priceMap[resCode] || 0
          });
        }
      });
    }

    // 3. CÁLCULO RECURSIVO (Propagação de Preços)
    for (let pass = 0; pass < 3; pass++) {
      Object.values(compositions).forEach((comp: any) => {
        if (comp.resources.length > 0) {
          const totalCost = comp.resources.reduce((acc: number, res: any) => {
            const p = priceMap[res.code] || compositions[res.code]?.unitPrice || 0;
            res.unitPrice = p;
            return acc + (res.coefficient * p);
          }, 0);
          if (totalCost > 0) comp.unitPrice = totalCost;
        }
      });
    }

    console.log(`[Backend] Estrutura final montada: ${Object.keys(compositions).length} serviços/insumos.`);

    // 3. PERSISTÊNCIA NO BANCO (Sequencial para SQLite para evitar LOCK)
    const items = Object.values(compositions);
    
    console.log(`[Backend] Iniciando persistência de ${items.length} itens...`);
    
    // Limpa TODAS as variações de SINAPI para evitar duplicados e lixo
    await prisma.referenceComposition.deleteMany({
      where: {
        OR: [
          { database: 'SINAPI' },
          { database: 'SINAPI-INS' },
          { database: 'SINAPI-COMP' }
        ],
        state: targetState,
        referenceDate: '04/2026'
      }
    });

    const batchSize = 25; // Reduzido para maior estabilidade no SQLite
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      // Processamento sequencial dentro do lote para evitar lock no SQLite
      for (const item of batch) {
        await prisma.referenceComposition.create({
          data: {
            code: item.code,
            description: item.description,
            unit: item.unit,
            unitPrice: item.unitPrice,
            state: targetState,
            referenceDate: '04/2026',
            database: 'SINAPI',
            resources: {
              create: item.resources.map((r: any) => ({
                description: r.description,
                unit: r.unit,
                type: r.type,
                coefficient: r.coefficient,
                defaultPrice: r.unitPrice
              }))
            }
          }
        });
      }

      if (i % 250 === 0) console.log(`[Backend] Progresso: ${i} / ${items.length} itens salvos...`);
    }

    revalidatePath('/orcamentos');
    return { success: true, count: items.length, date: '04/2026' };
  } catch (error: any) {
    console.error('[Backend Error]:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteEstimate(id: string) {
  try {
    await prisma.estimate.delete({ where: { id } });
    revalidatePath('/orcamentos');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erro ao excluir orçamento' };
  }
}

export async function getReferenceDates() {
  try {
    const dates = await prisma.referenceComposition.findMany({
      select: { referenceDate: true },
      distinct: ['referenceDate'],
      where: { referenceDate: { not: null } }
    });
    return dates.map(d => d.referenceDate).filter(Boolean).sort().reverse();
  } catch (error) {
    return [];
  }
}

export async function importReferenceBatch(database: string, items: {
  code: string;
  description: string;
  unit: string;
  unitPrice: number;
  state: string;
  referenceDate: string;
}[]) {
  try {
    const batchSize = 50;
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      for (const item of chunk) {
        await prisma.referenceComposition.upsert({
          where: {
            code_state_referenceDate_database: {
              code: item.code,
              state: item.state || 'SP',
              referenceDate: item.referenceDate || '04/2026',
              database: database
            }
          },
          update: {
            description: item.description,
            unit: item.unit,
            unitPrice: item.unitPrice
          },
          create: {
            code: item.code,
            description: item.description,
            unit: item.unit,
            unitPrice: item.unitPrice,
            state: item.state || 'SP',
            referenceDate: item.referenceDate || '04/2026',
            database: database
          }
        });
      }
    }
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao importar lote de referência:', error);
    return { success: false, error: error.message };
  }
}

export async function createRevision(estimateId: string, name: string) {
  try {
    const estimate = await prisma.estimate.findUnique({
      where: { id: estimateId },
      include: {
        stages: {
          include: {
            items: {
              include: {
                resources: true
              }
            }
          }
        }
      }
    });

    if (!estimate) return { success: false, error: 'Orçamento não encontrado' };

    const revision = await prisma.estimateRevision.create({
      data: {
        name,
        estimateId,
        data: JSON.parse(JSON.stringify(estimate))
      }
    });

    revalidatePath('/orcamentos');
    return { success: true, revision };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRevisions(estimateId: string) {
  try {
    const revisions = await prisma.estimateRevision.findMany({
      where: { estimateId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true }
    });
    return { success: true, revisions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreRevision(revisionId: string) {
  try {
    const revision = await prisma.estimateRevision.findUnique({ where: { id: revisionId } });
    if (!revision) return { success: false, error: 'Revisão não encontrada' };

    const estimateData: any = revision.data;
    const estimateId = estimateData.id;

    await prisma.estimateStage.deleteMany({ where: { estimateId } });

    for (const stage of estimateData.stages) {
      const newStage = await prisma.estimateStage.create({
        data: {
          name: stage.name,
          order: stage.order,
          estimateId: estimateId
        }
      });

      for (const item of stage.items) {
        const newItem = await prisma.estimateItem.create({
          data: {
            code: item.code,
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            stageId: newStage.id
          }
        });

        for (const res of item.resources) {
          await prisma.estimateResource.create({
            data: {
              description: res.description,
              unit: res.unit,
              type: res.type,
              coefficient: res.coefficient,
              unitPrice: res.unitPrice,
              totalPrice: res.totalPrice || 0,
              itemId: newItem.id
            }
          });
        }
      }
    }

    await prisma.estimate.update({
      where: { id: estimateId },
      data: { totalAmount: estimateData.totalAmount }
    });

    revalidatePath('/orcamentos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteRevision(revisionId: string) {
  try {
    await prisma.estimateRevision.delete({
      where: { id: revisionId }
    });
    revalidatePath('/orcamentos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

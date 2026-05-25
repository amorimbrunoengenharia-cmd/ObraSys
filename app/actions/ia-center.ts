"use server";

import { prisma } from "@/lib/prisma";
import { exportSwotToObsidian } from './obsidian';

export async function getProjectPulse(projectId: number) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next15Days = new Date(today);
    next15Days.setDate(today.getDate() + 15);

    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    // 1. Saúde Financeira
    const financialRecords = await prisma.financialRecord.findMany({
      where: { projectId },
    });

    const saldo = financialRecords.reduce((acc, rec) => {
      if (rec.status === 'Pago' || rec.status === 'Efetivado') {
        return rec.tipo === 'ENTRADA' ? acc + rec.valorLiquido : acc - rec.valorLiquido;
      }
      return acc;
    }, 0);

    const aPagar15Dias = financialRecords.filter(rec => 
      rec.tipo === 'SAÍDA' && 
      rec.status !== 'Pago' && 
      rec.dataVencimento && 
      new Date(rec.dataVencimento) < next15Days
    ).reduce((acc, rec) => acc + rec.valorLiquido, 0);

    const bmsPendentes = await prisma.clientApproval.findMany({
      where: { 
        projectId,
        type: 'BM',
        status: 'Pendente'
      }
    });

    const inadimplencia = bmsPendentes.reduce((acc, bm) => acc + (bm.amount || 0), 0);

    // 2. Suprimentos (Foco em Curva A / Itens Críticos)
    const purchaseRequests = await prisma.purchaseRequest.findMany({
      where: { projectId },
      include: { 
        quotations: {
          where: { isWinner: true }
        },
        items: { include: { material: true } }
      }
    });

    const highImpactKeywords = ['AÇO', 'CONCRETO', 'CIMENTO', 'CABO', 'AREIA', 'BRITA', 'ESTRUTURA', 'TRANSFORMADOR'];
    
    const rmsAtrasadasCriticas = purchaseRequests.filter(req => {
        const isAtrasado = req.status === 'PENDENTE' && new Date(req.createdAt) < threeDaysAgo;
        const totalCost = req.items.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
        const isHighImpact = req.items.some(item => highImpactKeywords.some(kw => item.material.name.toUpperCase().includes(kw))) || totalCost > 10000;
        return isAtrasado && isHighImpact;
    }).map(req => {
        const totalCost = req.items.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
        return {
            code: req.requestCode,
            material: req.items.map(i => i.material.name).join(', '),
            cost: totalCost,
            daysAtraso: Math.floor((today.getTime() - new Date(req.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        }
    });

    const estourouOrcamento = purchaseRequests.filter(req => {
        const winner = req.quotations[0];
        const totalCost = req.items.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
        return winner && winner.totalPrice > totalCost;
    }).map(req => {
        const totalCost = req.items.reduce((acc, item) => acc + (item.estimatedCost || 0), 0);
        return {
            code: req.requestCode,
            material: req.items.map(i => i.material.name).join(', '),
            diff: (req.quotations[0].totalPrice - totalCost)
        }
    });

    // 3. Cronograma (Milestones)
    const milestones = await prisma.task.findMany({
      where: { 
        projectId,
        isMilestone: true
      }
    });

    const milestonesAtrasadas = milestones.filter(m => 
      m.status !== 'Concluído' && 
      new Date(m.endDate) < today
    ).map(m => ({
        name: m.name,
        deadline: m.endDate
    }));

    // 4. Últimos RDOs (Histórico de Campo)
    const rdos = await prisma.rDO.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 7
    });

    const rdoSummary = rdos.map(r => {
        let chuva = false;
        let efetivoBaixo = false;
        try {
            const weather = JSON.parse(r.weather || '{}');
            if (weather.manhã === 'Chuva' || weather.tarde === 'Chuva' || weather.noite === 'Chuva') chuva = true;
            
            const manpower = JSON.parse(r.manpower || '{}');
            const total = (manpower.direta || 0) + (manpower.indireta || 0);
            if (total < 15) efetivoBaixo = true; 
        } catch(e) {}

        return {
            data: r.date,
            chuva,
            efetivoBaixo,
            ocorrencias: r.issues || r.obs || "Nenhuma ocorrência grave registrada."
        };
    });

    return {
      success: true,
      data: {
        finance: {
          saldo,
          aPagar15Dias,
          inadimplencia,
          countBmsPendentes: bmsPendentes.length
        },
        supply: {
          rmsAtrasadasCriticas,
          estourouOrcamento,
          totalRequests: purchaseRequests.length
        },
        schedule: {
          milestonesAtrasadas,
          totalMilestones: milestones.length
        },
        field: {
            rdoSummary,
            countRdos: rdos.length
        },
        generatedAt: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error("Error in getProjectPulse:", error);
    return { success: false, error: "Falha ao extrair dados do projeto." };
  }
}

export async function generateSwotPrompt(projectPulse: any) {
  const { finance, supply, schedule, field } = projectPulse;

  let context = `RELATÓRIO DE STATUS OPERACIONAL E FINANCEIRO:\n\n`;
  
  context += `[FINANCEIRO]\n`;
  context += `- Disponibilidade: R$ ${finance.saldo.toLocaleString('pt-BR')}\n`;
  context += `- Passivo Circulante (15 dias): R$ ${finance.aPagar15Dias.toLocaleString('pt-BR')}\n`;
  context += `- Exposição por Inadimplência: R$ ${finance.inadimplencia.toLocaleString('pt-BR')}\n\n`;

  context += `[SUPRIMENTOS - CURVA A / CRÍTICOS]\n`;
  context += `- RMs Críticas em Atraso: ${supply.rmsAtrasadasCriticas.length}\n`;
  supply.rmsAtrasadasCriticas.forEach((rm: any) => {
      context += `  * ${rm.material} (R$ ${rm.cost.toLocaleString('pt-BR')}): ${rm.daysAtraso} dias de atraso\n`;
  });
  context += `- Desvios de Orçamento: ${supply.estourouOrcamento.length} ocorrências\n\n`;

  context += `[CRONOGRAMA E MARCOS]\n`;
  context += `- Milestones em Atraso: ${schedule.milestonesAtrasadas.length}\n`;
  schedule.milestonesAtrasadas.forEach((m: any) => {
      context += `  * ${m.name}: Prazo expirado em ${new Date(m.deadline).toLocaleDateString('pt-BR')}\n`;
  });

  context += `\n[HISTÓRICO RECENTE DE CAMPO (Últimos 7 dias)]\n`;
  field.rdoSummary.forEach((r: any) => {
      context += `- Data ${r.data}: ${r.chuva ? 'CHUVOSO' : 'LIMPO'} | ${r.efetivoBaixo ? 'EFETIVO REDUZIDO' : 'EFETIVO NORMAL'}\n`;
      context += `  Notas: ${r.ocorrencias}\n`;
  });

  return `
Você é um Consultor Sênior de Engenharia Civil especialista no PMBOK 7. 
Sua função é analisar os dados de obras para um Sócio-Diretor técnico. 
Seu tom deve ser incisivo, analítico, direto e orientado à proteção do fluxo de caixa e do caminho crítico do cronograma.

DADOS DA OBRA PARA ANÁLISE:
${context}

DIRETRIZES DE RESPOSTA:
1. FOCO NO CAMINHO CRÍTICO: Priorize atrasos em marcos que impactam a entrega final.
2. RIGOR FINANCEIRO: Alerte sobre riscos de liquidez se o passivo de 15 dias superar o saldo.
3. AÇÕES EXECUTÁVEIS: Use verbos de ação e prefixos como "AÇÃO IMEDIATA:".
4. ESTRUTURA BULLET-POINTS: O plano de mitigação deve ser curto, direto e priorizado pelo impacto financeiro.

RETORNE ESTRITAMENTE UM JSON com os campos:
- strengths: array de strings
- weaknesses: array de strings
- opportunities: array de strings
- threats: array de strings
- mitigationPlan: array de strings (ações curtas e específicas)
- risco: string (Baixo, Médio, Alto, Crítico)
`;
}

export async function generateSwotAnalysis(projectId: number) {
  try {
    const pulseRes = await getProjectPulse(projectId);
    if (!pulseRes.success) return pulseRes;

    const prompt = await generateSwotPrompt(pulseRes.data);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");

    // TENTATIVA DIRETA VIA FETCH 
    // Usando o Gemini 2.5 Flash, modelo identificado como disponível para esta chave específica via diagnóstico de API
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error?.message || `Erro HTTP ${response.status}`);
    }

    let text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("A IA não retornou texto.");

    // LIMPEZA ROBUSTA: Localiza o primeiro '{' e o último '}' para isolar o JSON puro
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1) {
        throw new Error("A resposta da IA não contém um objeto JSON válido.");
    }
    
    const jsonString = text.substring(firstBrace, lastBrace + 1);
    const swotData = JSON.parse(jsonString);

    // Save SWOT to Database
    const savedSwot = await prisma.swotAnalysis.create({
        data: {
            projectId: projectId,
            riskLevel: swotData.risco || "Desconhecido",
            strengths: JSON.stringify(swotData.strengths || []),
            weaknesses: JSON.stringify(swotData.weaknesses || []),
            opportunities: JSON.stringify(swotData.opportunities || []),
            threats: JSON.stringify(swotData.threats || []),
            mitigationPlan: JSON.stringify(swotData.mitigationPlan || []),
            source: "Gemini 2.5 Flash",
        }
    });

    // TASK 1.3 — Auto-exportar SWOT para o Obsidian
    const project = await prisma.project.findUnique({ 
        where: { id: projectId }, 
        select: { name: true } 
    });
    if (project) {
        exportSwotToObsidian(project.name, projectId, pulseRes.data, swotData)
            .catch(err => console.error('Obsidian SWOT export error:', err));
    }

    return {
      success: true,
      data: {
        pulse: pulseRes.data,
        swot: swotData,
        modelUsed: "gemini-2.5-flash (Direct Fetch v1)"
      }
    };

  } catch (error: any) {
    console.error("Error in generateSwotAnalysis:", error);
    return { success: false, error: `Erro na IA: ${error.message || "Falha ao gerar análise SWOT."}` };
  }
}

export async function getSwotHistory(projectId: number) {
    try {
        const history = await prisma.swotAnalysis.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        
        return {
            success: true,
            history: history.map((h: any) => ({
                id: h.id,
                data: new Date(h.createdAt).toLocaleTimeString('pt-BR') + ' ' + new Date(h.createdAt).toLocaleDateString('pt-BR'),
                fonte: h.source,
                obs: `Análise SWOT gerada com risco: ${h.riskLevel}.`,
                raw: h
            }))
        };
    } catch (e: any) {
        console.error("Error in getSwotHistory:", e);
        return { success: false, error: "Falha ao carregar histórico de SWOT." };
    }
}

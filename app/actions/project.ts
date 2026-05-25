"use server";

import { prisma } from '../../lib/prisma';

export async function getProjectById(id: string) {
    const project = await prisma.project.findUnique({
        where: { id: Number(id) },
        include: {
            financials: true,
            budgetItems: true,
            tasks: {
                include: { assignees: true }
            },
            rdos: true,
            purchaseOrders: true,
            inventoryItems: {
                include: { linkedMaterial: true }
            },
            inventoryTools: true,
            inventoryLogs: true,
            qualityFvs: true,
            qualityRncs: true,
            contracts: {
                include: {
                    items: true,
                    additives: true,
                    measurements: true
                }
            },
            feedPosts: {
                orderBy: { createdAt: 'desc' }
            },
            documents: true,
            documentFolders: true,
            approvals: true,
            milestones: true,
            purchaseRequests: {
                include: { items: { include: { material: true } }, project: true, quotations: { include: { supplier: true } } }
            },
            materialConsumptions: {
                include: { inventoryItem: true },
                orderBy: { createdAt: 'desc' },
                take: 10
            }
        } as any
    }) as any;



    if (!project) return null;

    // Adaptador para o formato legado esperado pelos módulos (até migrarmos 100% módulo a módulo)
    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    
    // FP&A Dynamic Calculation
    const totalEntradas = project.financials.filter((f: any) => f.tipo === 'ENTRADA').reduce((sum: number, f: any) => sum + (f.valorLiquido || 0), 0);
    const totalSaidas = project.financials.filter((f: any) => f.tipo === 'SAÍDA').reduce((sum: number, f: any) => sum + (f.valorLiquido || 0), 0);
    
    const dynamicSpent = totalSaidas;
    const dynamicSaldo = project.budget - dynamicSpent;

    // Filtrar saídas e entradas (Legado para os componentes de lista)
    const saidasList = project.financials.filter((f: any) => f.tipo === 'SAÍDA').map((f: any) => ({
        id: f.id,
        forn: f.clienteFornecedor || '-',
        valor: formatter.format(f.valorBruto),
        venc: f.dataVencimento ? new Date(f.dataVencimento).toLocaleDateString('pt-BR', {day: '2-digit', month: 'short'}) : '-',
        status: f.status
    }));

    const solicitacoes = project.purchaseOrders.map((p: any) => ({
        id: p.id,
        item: p.item,
        status: p.status,
        urgencia: "Normal"
    }));

    const estoque = project.inventoryItems.map((i: any) => ({
        id: i.id,
        nome: i.material,
        unidade: i.unidade,
        qtd: i.quantidadeAtual,
        minimo: i.estoqueMinimo,
        status: i.quantidadeAtual <= i.estoqueMinimo ? 'crítico' : 'bom',
        fase: "Geral"
    }));

    const tasks = project.tasks as any[];
    const cronograma = tasks.map((t: any) => ({
        id: t.id,
        wbs: t.wbs,
        name: t.name || t.title,
        start: t.start || 0,
        duration: t.duration || 0,
        baseStart: t.baseStart || 0,
        baseDur: t.baseDur || 0,
        progress: t.progress || 0,
        resp: t.assignee || '-',
        status: t.status,
        critico: t.critico || false,
        deps: t.deps || "",
        startDate: t.startDate,
        endDate: t.endDate
    }));

    const custos = project.budgetItems.map((b: any) => ({
        id: b.id,
        i: b.classificacaoDRE,
        o: b.valorOrcado,
        r: project.financials.filter((f: any) => f.tipo === 'SAÍDA' && f.classificacaoDRE === b.classificacaoDRE).reduce((acc: any, f: any) => acc + f.valorLiquido, 0),
        s: "ok"
    }));

    const rawRdos = project.rdos as any[];
    const rdos = rawRdos.map((r: any) => {
        let weather = { manha: "sol", tarde: "sol", noite: "nublado" };
        let manpower = { indireta: [], direta: [] };
        let equipment = { equipamentos: [], veiculos: [] };
        try { if(r.weather) weather = JSON.parse(r.weather); } catch(e){}
        try { if(r.manpower) manpower = JSON.parse(r.manpower); } catch(e){}
        try { if(r.equipment) equipment = JSON.parse(r.equipment); } catch(e){}
        
        const issuesRaw = r.issues || "";
        let parsedIssues = { obs: issuesRaw, activities: [] };
        if (issuesRaw.startsWith('{')) {
            try { parsedIssues = JSON.parse(issuesRaw); } catch(e){}
        }

        return {
            id: r.id,
            data: new Date(r.date || new Date()).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'}),
            status: r.status,
            clima: weather,
            mo_indireta: manpower.indireta || [],
            mo_direta: manpower.direta || [],
            equipamentos: equipment.equipamentos || [],
            veiculos: equipment.veiculos || [],
            obs: parsedIssues.obs || "",
            activities: parsedIssues.activities || [],
            isNew: false
        }
    });

    return {
        ...project, // Manter os dados originais disponíveis
        nome: project.name,
        status: project.status,
        orcamento: formatter.format(project.budget),
        gasto: formatter.format(dynamicSpent),
        saldo: formatter.format(dynamicSaldo),
        idp: project.idp,
        idc: project.idc,
        ia_msg: dynamicSpent > project.budget 
            ? `Atenção: O gasto de ${formatter.format(dynamicSpent)} excedeu o orçamento de ${formatter.format(project.budget)}.` 
            : `Obra operando dentro da margem. Saldo atual de ${formatter.format(dynamicSaldo)}.`,
        
        // GERAÇÃO PROFISSIONAL DA CURVA S (CUMULATIVA & PREDITIVA)
        curva_s: (() => {
            const start = project.startDate ? new Date(project.startDate) : new Date();
            const end = project.endDate ? new Date(project.endDate) : new Date(start.getTime() + 365 * 86400000);
            const budget = project.budget || 0;
            const tasks = project.tasks || [];
            
            // Gerar lista de meses entre início e fim
            const timeline: any[] = [];
            let current = new Date(start.getFullYear(), start.getMonth(), 1);
            const last = new Date(end.getFullYear(), end.getMonth(), 1);
            
            while (current <= last) {
                timeline.push({
                    date: new Date(current),
                    m: current.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
                    financeiro_planejado: 0,
                    financeiro_real: 0,
                    financeiro_previsto: 0,
                    fisico_real: 0
                });
                current.setMonth(current.getMonth() + 1);
            }

            // 1. Distribuir Planejado (Linear simplificado para Baseline)
            const totalMonths = timeline.length || 1;
            let accPlanned = 0;
            timeline.forEach((point, idx) => {
                accPlanned += budget / totalMonths;
                point.financeiro_planejado = accPlanned;
            });

            // 2. Acumular Realizado
            let accReal = 0;
            const now = new Date();
            timeline.forEach(point => {
                const mesFinanceiro = project.financials.filter((f: any) => {
                    const fDate = new Date(f.dataCompetencia || f.createdAt);
                    return fDate.getMonth() === point.date.getMonth() && fDate.getFullYear() === point.date.getFullYear();
                }).reduce((sum: number, f: any) => sum + (f.valorLiquido || 0), 0);
                
                accReal += mesFinanceiro;
                if (point.date <= now) {
                    point.financeiro_real = accReal;
                }
            });

            // 3. Projetar Previsto (Baseado no IDC atual)
            const ev = (tasks.reduce((a:any,b:any)=>a+b.progress,0) / (tasks.length || 1) / 100) * budget;
            const idc = accReal > 0 ? ev / accReal : 1;
            const eac = idc > 0 ? budget / idc : budget;
            
            let accPrevisto = accReal;
            const remainingBudget = eac - accReal;
            const remainingMonths = timeline.filter(p => p.date > now).length || 1;

            timeline.forEach(point => {
                if (point.date > now) {
                    accPrevisto += remainingBudget / remainingMonths;
                    point.financeiro_previsto = accPrevisto;
                } else {
                    point.financeiro_previsto = point.financeiro_real;
                }
            });

            // 4. Progresso Físico (Ponto atual)
            const currentMonthIdx = timeline.findIndex(p => p.date.getMonth() === now.getMonth() && p.date.getFullYear() === now.getFullYear());
            if (currentMonthIdx !== -1) {
                timeline[currentMonthIdx].fisico_real = (tasks.reduce((a:any,b:any)=>a+b.progress,0) / (tasks.length || 1));
            }

            return timeline;
        })(),

        fluxo_caixa: [{m:'Mês Atual', e: totalEntradas, s: totalSaidas}],
        custos: custos.length > 0 ? custos : [{id:1,i:"Geral",o:project.budget,r:project.spent,s:"ok"}],
        solicitacoes: solicitacoes.length > 0 ? solicitacoes : [{id:0,item:"-",status:"-",urgencia:"-"}],
        contas_pagar: saidasList.length > 0 ? saidasList : [{id:0,forn:"-",valor:"-",venc:"-",status:"-"}],
        cronograma: cronograma.length > 0 ? cronograma : [{id:1,e:"Mobilização",i:"01/Jan",f:"15/Jan",s:"Atrasado",p:0,r:"-",a:0,c:false}],
        rdos: rdos.length > 0 ? rdos : [],
        feedPosts: project.feedPosts,
        feed_live: [{id:1,autor:"Sistema",cargo:"Automação",msg:"Obra sincronizada com banco de dados."}],
        estoque: project.inventoryItems.map((i: any) => ({
            id: i.id,
            material: i.linkedMaterial ? `[${i.linkedMaterial.code}] ${i.materialName}` : i.materialName,
            unidade: i.unidade,
            quantidadeAtual: i.quantidadeAtual,
            estoqueMinimo: i.estoqueMinimo,
            status: i.quantidadeAtual <= i.estoqueMinimo ? 'Crítico' : 'Estável'
        })),
        ferramentas: project.inventoryTools,
        historico_estoque: project.inventoryLogs,
        consumos: project.materialConsumptions,
        contratos: project.contracts,
        medicoes: project.contracts.flatMap((c:any) => c.measurements.map((m:any) => ({...m, contrato: c.empresa})))
    };
}

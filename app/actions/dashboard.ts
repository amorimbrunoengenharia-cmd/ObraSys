"use server";

import { prisma } from '../../lib/prisma';

export async function getDashboardData() {
    // Buscar todos os projetos
    const projects = await prisma.project.findMany({
        include: {
            financials: { where: { tipo: 'SAÍDA' } },
            budgetItems: true,
            tasks: true
        } as any
    }) as any[];

    // Contagem real de funcionários
    const efetivo_total = await prisma.employee.count({ where: { status: 'Ativo' } });

    // Eficiência global (tarefas concluídas / total)
    const allTasks = await prisma.task.findMany({ select: { status: true, columnId: true } });
    const totalTasksAll = allTasks.length;
    const completedTasksAll = allTasks.filter(t => t.status === 'Concluído' || t.columnId === 'done').length;
    const eficiencia_global = totalTasksAll > 0 ? (completedTasksAll / totalTasksAll) * 100 : 0;

    // Projetos no prazo
    const now = new Date();
    const projetos_no_prazo_count = projects.filter(p => {
        if (p.status === 'Concluído') return true;
        if (!p.estimatedDelivery) return true;
        return new Date(p.estimatedDelivery) >= now;
    }).length;
    const projetos_no_prazo = projects.length > 0 ? (projetos_no_prazo_count / projects.length) * 100 : 100;

    // Calcular KPIs Globais
    const kpis = {
        obras_ativas: projects.length,
        faturamento_total: "0",
        efetivo_total: efetivo_total,
        alertas_criticos: 0,
        margem_lucro: "0%",
        eficiencia_global: Number(eficiencia_global.toFixed(1)),
        projetos_no_prazo: Number(projetos_no_prazo.toFixed(1))
    };

    let faturamentoTotal = 0;
    let gastoTotal = 0;

    // Formatar Projetos para o formato esperado pelo Dashboard
    const obras = projects.map(proj => {
        const spent = proj.financials?.reduce((acc: number, curr: any) => acc + (curr.valorBruto || 0), 0) || 0;
        faturamentoTotal += proj.budget || 0;
        gastoTotal += spent;

        const saldo = (proj.budget || 0) - spent;
        const margem = proj.budget > 0 ? ((saldo / proj.budget) * 100).toFixed(1) : "0";
        
        // Cálculo de Avanço Físico Real
        const totalTasks = proj.tasks?.length || 0;
        const completedTasks = proj.tasks?.filter((t: any) => t.status === 'Concluído' || t.columnId === 'done').length || 0;
        const progresso = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : (proj.physicalProgress || 0);

        let saude = "bom";
        let cor = "bg-emerald-500";
        let img_gradient = "from-emerald-600 to-teal-500";
        
        if (Number(margem) < 0) {
            saude = "critico";
            cor = "bg-red-500";
            img_gradient = "from-red-600 to-rose-500";
            kpis.alertas_criticos++;
        } else if (Number(margem) < 10) {
            saude = "atencao";
            cor = "bg-yellow-500";
            img_gradient = "from-yellow-500 to-orange-500";
        }

        const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

        return {
            id: proj.id,
            nome: proj.name.split(' - ')[1] || proj.name, 
            local: `${proj.city || ''}, ${proj.state || ''}`, 
            tipo: proj.status === 'Concluído' ? 'OBRA ENTREGUE' : 'OBRA EM CURSO',
            status: proj.status,
            progresso,
            orcamento: formatter.format(proj.budget),
            gasto: formatter.format(spent),
            saldo: formatter.format(saldo),
            prazo: proj.estimatedDelivery ? new Date(proj.estimatedDelivery).toLocaleDateString('pt-BR') : "A Definir",
            saude,
            cor,
            img_gradient,
            margem: `${margem}%`,
            desvios: 0
        };
    });

    // Atualiza KPIs consolidados
    const formatterGlobal = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0, notation: "compact" });
    kpis.faturamento_total = formatterGlobal.format(faturamentoTotal);
    kpis.margem_lucro = faturamentoTotal > 0 ? (((faturamentoTotal - gastoTotal) / faturamentoTotal) * 100).toFixed(1) + "%" : "0%";

    return {
        kpis,
        obras
    };
}

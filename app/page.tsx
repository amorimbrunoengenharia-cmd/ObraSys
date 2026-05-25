import { prisma } from '../lib/prisma';
import GlobalDashboard from '../components/modules/GlobalDashboard';
import DashboardClient from '../components/DashboardClient';
import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../lib/permissions';
import { getDREReport } from './actions/finance';
import { redirect } from 'next/navigation';

export default async function Home() {
    const cookieStore = await cookies();
    const rawUserRole = cookieStore.get('userRole')?.value || '';
    const rawUserEmail = cookieStore.get('userEmail')?.value || '';
    const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
    const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

    let whereClause: any = {};

    if (shouldFilterProjects(userRole)) {
        const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
        if (userRole === 'Cliente / Investidor') {
            whereClause = { clientName: userObj?.name || '---' };
        } else if (userObj) {
            whereClause = {
                OR: [
                    { employees: { some: { userId: userObj.id } } }, // Relacionamento principal do RH
                    { engineerId: userObj.id }, // Fallback para vínculo legado
                    { tasks: { some: { assignees: { some: { id: userObj.id } } } } } // Responsável por tarefas
                ]
            };
        } else {
            whereClause = { id: -1 };
        }
    }

    // 1. DADOS DE SUPRIMENTOS (Filtrado pelas obras permitidas)
    const pendingRequests = await prisma.purchaseRequest.findMany({
        where: { 
            status: 'PENDENTE',
            ...(Object.keys(whereClause).length > 0 ? { project: whereClause } : {})
        },
        include: { project: true, supplier: true, items: true }
    });
    
    const pendingCount = pendingRequests.length;
    const pendingTotal = pendingRequests.reduce((acc, curr) => acc + curr.items.reduce((sum, item) => sum + (item.estimatedCost || 0), 0), 0);

    // 2. DADOS FINANCEIROS (A PAGAR 30 DIAS) (Filtrado pelas obras permitidas)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);
    thirtyDaysLater.setHours(23, 59, 59, 999);

    const upcomingTransactions = await prisma.financialRecord.findMany({
        where: {
            tipo: 'SAÍDA',
            status: { in: ['PENDENTE', 'A PAGAR', 'A Vencer', 'AGENDADO'] },
            dataVencimento: { gte: today, lte: thirtyDaysLater },
            ...(Object.keys(whereClause).length > 0 ? { project: whereClause } : {})
        }
    });
    const upcomingTotal = upcomingTransactions.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);

    // 3. PORTFÓLIO DE PROJETOS COM DADOS RICOS

    const projects = await prisma.project.findMany({
        where: whereClause,
        include: { 
            financials: true, 
            contracts: { include: { measurements: true } }, 
            tasks: true,
            rdos: { 
                include: { activities: true },
                orderBy: { createdAt: 'desc' }, 
                take: 5 // Pegamos os últimos 5 para uma média mais estável
            }
        },
        orderBy: { name: 'asc' }
    });

    // Smart Redirect: Se tiver apenas 1 obra, pula o GlobalDashboard e vai direto para a obra.
    if (['Engenheiro', 'Engenheiro Residente', 'Téc. Segurança', 'Mestre de Obras', 'Projetista / Eng. de Projetos'].includes(userRole) && projects.length === 1) {
        redirect(`/projeto/${projects[0].id}`);
    }

    // Redirect Cliente: Sempre redirecionar para a primeira obra associada a ele
    if (userRole === 'Cliente / Investidor' && projects.length > 0) {
        redirect(`/projeto/${projects[0].id}`);
    }

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    let criticalAlertsCount = 0;
    let projetosNoPrazoCount = 0;

    const initialObras = projects.map(p => {
        const spent = p.financials.filter(f => f.tipo === 'SAÍDA' && f.status === 'Pago').reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
        const budget = p.budget || 0;
        
        const isProjectActive = p.status !== 'Concluído' && p.status !== 'Paralisado';
        
        // Margem Inteligente: Se não houve gasto, a margem é 100% do valor orçado (potencial).
        // Se houve gasto, calculamos a rentabilidade real.
        const marginValue = budget > 0 
            ? ((budget - spent) / budget * 100) 
            : 0;
        
        const financialProgress = budget > 0 ? (spent / budget) * 100 : 0;
        
        // Físico Inteligente: Hierarquia de Verdade
        const totalTasks = p.tasks.length;
        const completedTasks = p.tasks.filter(t => t.status === 'Concluído' || t.columnId === 'done').length;
        
        let physicalProgress = 0;
        
        if (totalTasks > 0) {
            // Nível 1: Cronograma (Média ponderada por progresso, se houver, ou apenas contagem)
            const tasksWithProgress = p.tasks.reduce((acc, t) => acc + (t.progress || 0), 0);
            physicalProgress = tasksWithProgress / totalTasks;
        } else if (p.rdos.length > 0) {
            // Nível 2: Média das últimas atividades reportadas no RDO
            const allActivities = p.rdos.flatMap(r => r.activities);
            if (allActivities.length > 0) {
                const avgRdoProgress = allActivities.reduce((acc, curr) => acc + (curr.progress || 0), 0) / allActivities.length;
                physicalProgress = avgRdoProgress;
            } else {
                physicalProgress = 0; 
            }
        } else {
            // Nível 3: Fallback por Status
            physicalProgress = p.status === 'Concluído' ? 100 : 0;
        }

        // Vencidas
        const overdueTasks = p.tasks.filter(t => {
            const isDone = t.status === 'Concluído' || t.columnId === 'done';
            return !isDone && t.endDate && new Date(t.endDate) < today;
        }).length;

        // Projetos no prazo: sem tarefas atrasadas (apenas projetos ativos)
        const isActive = p.status !== 'Concluído' && p.status !== 'Paralisado';
        if (isActive && overdueTasks === 0) projetosNoPrazoCount++;

        // Último RDO — Indicador de reporting para o Diretor
        const lastRdo = p.rdos?.[0];
        let rdoStatus = 'Sem RDO';
        let rdoDays = -1;
        let rdoColor = 'text-slate-400';
        if (lastRdo) {
            const rdoDate = new Date(lastRdo.createdAt);
            const diffMs = today.getTime() - rdoDate.getTime();
            rdoDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            if (rdoDays === 0) { rdoStatus = 'Hoje'; rdoColor = 'text-emerald-500'; }
            else if (rdoDays === 1) { rdoStatus = 'Há 1 dia'; rdoColor = 'text-emerald-500'; }
            else if (rdoDays <= 3) { rdoStatus = `Há ${rdoDays} dias`; rdoColor = 'text-yellow-500'; }
            else { rdoStatus = `Há ${rdoDays} dias`; rdoColor = 'text-red-500'; }
        }

        // --- NOVA LÓGICA DE SAÚDE DA OBRA ---
        const hasBudget = budget > 0;
        
        // Alerta de desvio financeiro moderado (>10% à frente do físico ou gasto >10% sem avanço físico inicial)
        const hasDeviationAlert = hasBudget && (
            (physicalProgress > 0 && financialProgress > physicalProgress + 10) ||
            (physicalProgress === 0 && financialProgress > 10)
        );

        // Crítico se: Paralisada OU tarefas atrasadas OU orçamento estourado (margem negativa) OU desvio grave de gastos (>20% do físico)
        const isCritical = p.status === 'Paralisado' || 
            (overdueTasks > 0) || 
            (hasBudget && marginValue < 0) ||
            (hasBudget && physicalProgress > 0 && financialProgress > physicalProgress + 20);

        // Atenção se: Não for crítica mas tiver margem apertada (<10%) OU desvio financeiro moderado OU sem RDO há mais de 3 dias
        const isWarning = !isCritical && (
            (hasBudget && marginValue < 10) || 
            hasDeviationAlert || 
            (rdoDays > 3)
        );

        const saudeStatus = isCritical ? 'critico' : (isWarning ? 'atencao' : 'bom');
        if (isCritical) criticalAlertsCount++;

        let marginColor = 'text-green-500';
        if (marginValue < 0) marginColor = 'text-red-500';
        else if (marginValue < 10) marginColor = 'text-orange-500';
        
        return {
            id: p.id,
            nome: p.name,
            local: `${p.city || 'Local'}, ${p.state || 'UF'}`,
            tipo: p.status === 'Concluído' ? 'OBRA ENTREGUE' : p.status === 'Distrato' ? 'DISTRATO' : 'OBRA EM CURSO',
            status: p.status,
            orcamento: formatter.format(budget),
            gasto: formatter.format(spent),
            saldo: formatter.format(budget - spent),
            margem: `${marginValue.toFixed(1)}%`,
            marginColor,
            desvios: overdueTasks > 0 ? `${overdueTasks} atrasadas` : "0", 
            progresso: physicalProgress,
            deviationAlert: hasDeviationAlert,
            cor: p.status === 'Distrato' ? 'bg-slate-500' : saudeStatus === 'critico' ? 'bg-red-500' : saudeStatus === 'atencao' ? 'bg-amber-500' : p.status === 'Concluído' ? 'bg-blue-500' : 'bg-emerald-500',
            saude: saudeStatus,
            img_gradient: p.status === 'Distrato' ? 'from-slate-600 to-slate-800' : p.status === 'Concluído' ? 'from-blue-500 to-indigo-600' : saudeStatus === 'critico' ? 'from-red-500 to-rose-600' : saudeStatus === 'atencao' ? 'from-amber-400 to-orange-500' : 'from-emerald-500 to-teal-600',
            rdoStatus,
            rdoDays,
            rdoColor,
        };
    });

    // 4. GRÁFICO DE FLUXO DE CAIXA (Últimos 6 meses)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const chartRecords = await prisma.financialRecord.findMany({
        where: { dataVencimento: { gte: sixMonthsAgo } },
        orderBy: { dataVencimento: 'asc' }
    });

    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const flowData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = monthLabels[d.getMonth()];
        const monthRecords = chartRecords.filter(r => r.dataVencimento && monthLabels[r.dataVencimento.getMonth()] === label);
        
        const receitas = monthRecords.filter(r => r.tipo === 'ENTRADA' && r.status === 'Recebido').reduce((s, r) => s + (r.valorLiquido || r.valorBruto || 0), 0);
        const despesas = monthRecords.filter(r => r.tipo === 'SAÍDA' && r.status === 'Pago').reduce((s, r) => s + (r.valorLiquido || r.valorBruto || 0), 0);
        
        flowData.push({ mes: label, receitas, despesas, saldo: receitas - despesas });
    }

    // 5. EFICIÊNCIA OPERACIONAL REAL (% de tasks concluídas dentro do prazo por mês)
    const allTasks = projects.flatMap(p => p.tasks);
    const eficienciaData = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const label = monthLabels[d.getMonth()];
        
        const dueThisMonth = allTasks.filter(t => {
            if (!t.endDate) return false;
            const end = new Date(t.endDate);
            return end >= monthStart && end <= monthEnd;
        });
        
        if (dueThisMonth.length === 0) {
            eficienciaData.push({ mes: label, eficiencia: 100, tarefas: 0 });
        } else {
            const completedOnTime = dueThisMonth.filter(t => 
                t.status === 'Concluído' || t.columnId === 'done'
            ).length;
            eficienciaData.push({ 
                mes: label, 
                eficiencia: Math.round((completedOnTime / dueThisMonth.length) * 100),
                tarefas: dueThisMonth.length
            });
        }
    }

    // 6. KPIs GLOBAIS
    const globalBudget = projects.reduce((acc, curr) => acc + (curr.budget || 0), 0);
    const globalSpent = projects.reduce((acc, curr) => acc + curr.financials.filter(f => f.status === 'Pago').reduce((sum, f) => sum + (f.valorBruto || 0), 0), 0);
    
    // Faturamento Realizado (Receitas) -> ENTRADA e Recebido na tabela FinancialRecord
    const globalRevenue = projects.reduce((acc, p) => acc + p.financials.filter(f => f.tipo === 'ENTRADA' && f.status === 'Recebido').reduce((sum, f) => sum + (f.valorLiquido || f.valorBruto || 0), 0), 0);
    
    const compactFormatter = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

    const activeProjects = projects.filter(p => p.status !== 'Concluído' && p.status !== 'Distrato' && !(p.name && p.name.toUpperCase().startsWith('SEDE') && !p.name.toUpperCase().includes('REFORMA')));
    const projetosNoPrazoPercent = activeProjects.length > 0 
        ? Math.round((projetosNoPrazoCount / activeProjects.length) * 100) 
        : 100;

    const projectIds = projects.map(p => p.id);
    const dreArg = shouldFilterProjects(userRole) ? (projectIds.length > 0 ? projectIds : [-1]) : undefined;
    const dreReportRes = await getDREReport(dreArg);
    const globalDre = dreReportRes.success ? dreReportRes.data : [];

    return (
        <DashboardClient>
            <GlobalDashboard 
                initialKpis={{ 
                    pendingCount, pendingTotal, upcomingTotal, pendingRequests,
                    alertasCriticos: criticalAlertsCount,
                    carteiraTotal: compactFormatter.format(globalBudget),
                    faturamentoTotal: compactFormatter.format(globalRevenue),
                    margemLucro: globalBudget > 0 ? (((globalBudget - globalSpent) / globalBudget) * 100).toFixed(1) + "%" : "0%",
                    obrasAtivas: activeProjects.length,
                    projetosNoPrazo: projetosNoPrazoPercent
                }} 
                initialObras={initialObras}
                initialChartData={flowData}
                initialEficienciaData={eficienciaData}
                initialDreData={globalDre}
            />
        </DashboardClient>
    );
}

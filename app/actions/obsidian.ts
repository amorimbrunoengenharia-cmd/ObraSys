"use server";

import { prisma } from "@/lib/prisma";
import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

// =====================================================================
// MOTOR DE SINCRONIZAÇÃO OBSIDIAN — ObraSys V2
// =====================================================================
// Exporta dados REAIS do Prisma para ficheiros Markdown (.md) numa
// pasta local que o Obsidian lê automaticamente via filesystem watch.
// =====================================================================

const VAULT_BASE = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\ObraSys';

const githubOwner = process.env.GITHUB_OWNER || '';
const githubRepo = process.env.GITHUB_REPO || 'obrasys-obsidian';
const githubToken = process.env.GITHUB_TOKEN || '';

let octokit: Octokit | null = null;
if (githubToken) {
  octokit = new Octokit({ auth: githubToken });
}

export let githubCommits: { path: string, content: string }[] = [];

export function clearGithubCommits() {
    githubCommits = [];
}

export async function flushGithubCommits(message: string) {
    if (!octokit || !githubOwner || !githubRepo || githubCommits.length === 0) return false;
    try {
        const { data: ref } = await octokit.git.getRef({ owner: githubOwner, repo: githubRepo, ref: 'heads/main' })
            .catch(async () => await octokit!.git.getRef({ owner: githubOwner, repo: githubRepo, ref: 'heads/master' }));
            
        const latestCommitSha = ref.object.sha;
        const { data: latestCommit } = await octokit.git.getCommit({ owner: githubOwner, repo: githubRepo, commit_sha: latestCommitSha });

        const tree = githubCommits.map(f => ({
            path: f.path,
            mode: '100644' as const,
            type: 'blob' as const,
            content: f.content
        }));

        const { data: newTree } = await octokit.git.createTree({ owner: githubOwner, repo: githubRepo, base_tree: latestCommit.tree.sha, tree });
        const { data: newCommit } = await octokit.git.createCommit({ owner: githubOwner, repo: githubRepo, message, tree: newTree.sha, parents: [latestCommitSha] });
        
        await octokit.git.updateRef({ owner: githubOwner, repo: githubRepo, ref: ref.ref.replace('refs/', ''), sha: newCommit.sha });
        console.log(`✅ GitHub Sync: Commit ${newCommit.sha} com ${githubCommits.length} arquivos.`);
        clearGithubCommits();
        return true;
    } catch (e: any) {
        console.error("Erro no GitHub Sync:", e.message);
        return false;
    }
}

/**
 * Garante que um diretório existe, criando-o recursivamente se necessário.
 */
function ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Escreve um ficheiro .md no vault, criando a pasta se não existir.
 */
function writeNote(relativePath: string, content: string) {
    try {
        const safeRelativePath = relativePath.replace(/:/g, '-');
        
        if (octokit) {
            githubCommits.push({ path: safeRelativePath, content });
            return safeRelativePath;
        }

        const fullPath = path.join(VAULT_BASE, safeRelativePath);
        ensureDir(path.dirname(fullPath));
        fs.writeFileSync(fullPath, content, 'utf-8');
        return fullPath;
    } catch (e) {
        console.error(`Erro ao escrever arquivo Obsidian (${relativePath}):`, e);
        throw e;
    }
}

// =====================================================================
// EXPORTADORES POR MÓDULO
// =====================================================================

/**
 * Exporta todos os RDOs de um projeto como notas individuais.
 */
async function exportRDOs(projectId?: number) {
    const where = projectId ? { projectId } : {};
    const rdos = await prisma.rDO.findMany({
        where,
        include: { 
            project: { select: { name: true } },
            activities: { include: { photos: true } },
            author: { select: { name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    let count = 0;
    for (const rdo of rdos) {
        const projName = rdo.project.name.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();
        const folder = `Projetos/${projName}/RDOs`;

        let weather = { manha: '?', tarde: '?', noite: '?' };
        let manpower = { indireta: 0, direta: 0 };
        let equipment = { equipamentos: [], veiculos: [] };
        try { if (rdo.weather) weather = JSON.parse(rdo.weather); } catch {}
        try { if (rdo.manpower) manpower = JSON.parse(rdo.manpower); } catch {}
        try { if (rdo.equipment) equipment = JSON.parse(rdo.equipment); } catch {}

        const activities = rdo.activities.map((a, i) => 
            `${i + 1}. **Progresso:** ${a.progress}% | ${a.observations || 'Sem observações'}${a.photos.length > 0 ? ` | 📷 ${a.photos.length} foto(s)` : ''}`
        ).join('\n');

        const totalDireta = Array.isArray(manpower.direta) ? manpower.direta.reduce((acc: any, w: any) => acc + (Number(w.qtd) || 0), 0) : 0;
        const totalIndireta = Array.isArray(manpower.indireta) ? manpower.indireta.reduce((acc: any, w: any) => acc + (Number(w.qtd) || 0), 0) : 0;
        const listDireta = Array.isArray(manpower.direta) && manpower.direta.length > 0 ? '\n' + manpower.direta.map((w: any) => `  - ${w.cargo}: ${w.qtd}`).join('\n') : '';
        const listIndireta = Array.isArray(manpower.indireta) && manpower.indireta.length > 0 ? '\n' + manpower.indireta.map((w: any) => `  - ${w.cargo}: ${w.qtd}`).join('\n') : '';

        const md = `---
tags: [rdo, campo, ${projName.toLowerCase().replace(/\s+/g, '-')}]
projeto: "${rdo.project.name}"
data: "${rdo.date}"
status: "${rdo.status}"
autor: "${rdo.author?.name || 'N/A'}"
created: ${rdo.createdAt.toISOString()}
---

# 📝 RDO — ${rdo.date}
**Projeto:** ${rdo.project.name}  
**Status:** ${rdo.status}  
**Autor:** ${rdo.author?.name || 'N/A'}

## ☁️ Condições Climáticas
| Período | Condição |
|---------|----------|
| Manhã | ${weather.manha || '?'} |
| Tarde | ${weather.tarde || '?'} |
| Noite | ${weather.noite || '?'} |

## 👷 Mão de Obra
- **Direta:** ${totalDireta} profissionais${listDireta}
- **Indireta:** ${totalIndireta} profissionais${listIndireta}

## 🏗️ Equipamentos
- **Equipamentos:** ${Array.isArray(equipment.equipamentos) ? equipment.equipamentos.length : 0}
- **Veículos:** ${Array.isArray(equipment.veiculos) ? equipment.veiculos.length : 0}

## 📋 Atividades Executadas
${activities || '_Nenhuma atividade registrada._'}

## 📌 Observações
${rdo.obs || '_Sem observações._'}
`;
        writeNote(`${folder}/RDO_${rdo.date.replace(/\//g, '-')}_${rdo.id}.md`, md);
        count++;
    }
    return count;
}

/**
 * Exporta resumo financeiro de cada projeto.
 */
async function exportFinanceiro(projectId?: number) {
    const where = projectId ? { id: projectId } : {};
    const projects = await prisma.project.findMany({
        where,
        include: { 
            financials: true, 
            budgetItems: true,
            contracts: { include: { measurements: true } }
        }
    });

    let count = 0;
    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    for (const proj of projects) {
        const projName = proj.name.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();
        const folder = `Projetos/${projName}`;

        const entradas = proj.financials.filter(f => f.tipo === 'ENTRADA').reduce((s, f) => s + f.valorLiquido, 0);
        const saidas = proj.financials.filter(f => f.tipo === 'SAÍDA').reduce((s, f) => s + f.valorLiquido, 0);
        const saldo = entradas - saidas;
        const pagas = proj.financials.filter(f => f.tipo === 'SAÍDA' && (f.status === 'Pago' || f.status === 'Recebido')).reduce((s, f) => s + f.valorLiquido, 0);

        const topDespesas = proj.financials
            .filter(f => f.tipo === 'SAÍDA')
            .sort((a, b) => b.valorLiquido - a.valorLiquido)
            .slice(0, 10)
            .map((f, i) => `| ${i + 1} | ${f.descricao || 'N/A'} | ${f.clienteFornecedor || '-'} | ${fmt(f.valorLiquido)} | ${f.status} |`)
            .join('\n');

        // Extrair e ordenar medições de contratos
        const todasMedicoes = proj.contracts.flatMap(c => 
            c.measurements.map(m => ({ ...m, contratoEmpresa: c.empresa }))
        ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        const medicoesTable = todasMedicoes.slice(0, 10).map(m => 
            `| ${m.contratoEmpresa} | Período: ${m.periodo || m.data} | ${fmt(m.bruto)} | ${m.status} |`
        ).join('\n');

        const md = `---
tags: [financeiro, fpa, ${projName.toLowerCase().replace(/\s+/g, '-')}]
projeto: "${proj.name}"
updated: ${new Date().toISOString()}
---

# 💰 Painel Financeiro — ${proj.name}

## KPIs Consolidados
| Indicador | Valor |
|-----------|-------|
| Orçamento Base | ${fmt(proj.budget)} |
| Total Recebido | ${fmt(entradas)} |
| Total Despesas | ${fmt(saidas)} |
| Total Pago | ${fmt(pagas)} |
| **Saldo Operacional** | **${fmt(saldo)}** |
| Margem | ${entradas > 0 ? ((saldo / entradas) * 100).toFixed(1) : '0'}% |

## Top 10 Despesas
| # | Descrição | Fornecedor | Valor | Status |
|---|-----------|------------|-------|--------|
${topDespesas || '| - | Nenhuma despesa registrada | - | - | - |'}

## Últimas Medições de Contratos
| Fornecedor | Período | Valor Medido | Status |
|------------|---------|--------------|--------|
${medicoesTable || '| - | Nenhuma medição registrada | - | - |'}

---
_Gerado automaticamente pelo ObraSys em ${new Date().toLocaleString('pt-BR')}_
`;
        writeNote(`${folder}/Financeiro_Resumo.md`, md);
        count++;
    }
    return count;
}

/**
 * Exporta dados de suprimentos (estoque crítico + compras).
 */
async function exportSuprimentos(projectId?: number) {
    const where = projectId ? { projectId } : {};
    const items = await prisma.inventoryItem.findMany({
        where,
        include: { project: { select: { name: true } } }
    });

    const requests = await prisma.purchaseRequest.findMany({
        where,
        include: { 
            items: { include: { material: true } }, 
            project: { select: { name: true } },
            quotations: { include: { supplier: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 30
    });

    const logs = await prisma.inventoryLog.findMany({
        where,
        include: { project: { select: { name: true } } },
        orderBy: { id: 'desc' },
        take: 50
    });

    // Agrupar por projeto
    const byProject: Record<string, { items: any[], requests: any[], logs: any[], projName: string }> = {};
    
    for (const item of items) {
        const key = item.projectId.toString();
        if (!byProject[key]) byProject[key] = { items: [], requests: [], logs: [], projName: item.project.name };
        byProject[key].items.push(item);
    }
    for (const req of requests) {
        const key = req.projectId.toString();
        if (!byProject[key]) byProject[key] = { items: [], requests: [], logs: [], projName: req.project.name };
        byProject[key].requests.push(req);
    }
    for (const log of logs) {
        const key = log.projectId.toString();
        if (!byProject[key]) byProject[key] = { items: [], requests: [], logs: [], projName: log.project.name };
        byProject[key].logs.push(log);
    }

    let count = 0;
    for (const [_, data] of Object.entries(byProject)) {
        const projName = data.projName.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();
        const folder = `Projetos/${projName}`;

        const criticos = data.items.filter(i => i.quantidadeAtual <= i.estoqueMinimo);
        const estoqueTable = data.items.map(i => 
            `| ${i.materialName} | ${i.quantidadeAtual} ${i.unidade} | ${i.estoqueMinimo} | ${i.quantidadeAtual <= i.estoqueMinimo ? '🔴 CRÍTICO' : '🟢 OK'} |`
        ).join('\n');

        const comprasTable = data.requests.map(r =>
            `| ${r.requestCode} | ${r.material?.name || (r.items[0] ? r.items[0].material.name : 'Vários')} | ${r.status} | R$ ${r.estimatedCost.toLocaleString('pt-BR')} |`
        ).join('\n');

        const logsTable = data.logs.slice(0, 20).map(l =>
            `| ${l.data} | ${l.tipo.toUpperCase()} | ${l.item} | ${l.quantidade} | ${l.responsavel} |`
        ).join('\n');

        const md = `---
tags: [suprimentos, estoque, ${projName.toLowerCase().replace(/\s+/g, '-')}]
projeto: "${data.projName}"
updated: ${new Date().toISOString()}
alertas_criticos: ${criticos.length}
---

# 📦 Suprimentos — ${data.projName}

## Estoque Atual
| Material | Qtd Atual | Mínimo | Status |
|----------|-----------|--------|--------|
${estoqueTable || '| - | - | - | - |'}

> ⚠️ **${criticos.length} item(s) em nível crítico**

## Histórico de Movimentações (Últimos 20)
| Data | Tipo | Item | Qtd | Responsável |
|------|------|------|-----|-------------|
${logsTable || '| - | - | - | - | - |'}

## Solicitações de Compra
| Código | Material | Status | Valor Estimado |
|--------|----------|--------|----------------|
${comprasTable || '| - | - | - | - |'}

---
_Gerado automaticamente pelo ObraSys em ${new Date().toLocaleString('pt-BR')}_
`;
        writeNote(`${folder}/Suprimentos_Status.md`, md);
        count++;
    }
    return count;
}

/**
 * Exporta dados de qualidade (FVS, RNC, Segurança).
 */
async function exportQualidade(projectId?: number) {
    const where = projectId ? { projectId } : {};
    
    const fvs = await prisma.qualityFVS.findMany({ where, include: { project: { select: { name: true } } } });
    const rncs = await prisma.qualityRNC.findMany({ where, include: { project: { select: { name: true } } } });

    const byProject: Record<string, { fvs: any[], rncs: any[], projName: string }> = {};
    for (const f of fvs) {
        const key = f.projectId.toString();
        if (!byProject[key]) byProject[key] = { fvs: [], rncs: [], projName: f.project.name };
        byProject[key].fvs.push(f);
    }
    for (const r of rncs) {
        const key = r.projectId.toString();
        if (!byProject[key]) byProject[key] = { fvs: [], rncs: [], projName: r.project.name };
        byProject[key].rncs.push(r);
    }

    let count = 0;
    for (const [_, data] of Object.entries(byProject)) {
        const projName = data.projName.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();

        const fvsTable = data.fvs.map(f => `| ${f.title} | ${f.status} | ${f.inspector} |`).join('\n');
        const rncTable = data.rncs.map(r => `| ${r.description} | ${r.responsible} | ${r.status} |`).join('\n');

        const md = `---
tags: [qualidade, fvs, rnc, ${projName.toLowerCase().replace(/\s+/g, '-')}]
projeto: "${data.projName}"
updated: ${new Date().toISOString()}
---

# 🛡️ Qualidade — ${data.projName}

## FVS (Fichas de Verificação de Serviço)
| Serviço | Status | Inspetor |
|---------|--------|----------|
${fvsTable || '| Nenhuma FVS registrada | - | - |'}

## RNC (Relatórios de Não-Conformidade)
| Problema | Responsável | Status |
|----------|-------------|--------|
${rncTable || '| Nenhuma RNC registrada | - | - |'}

---
_Gerado automaticamente pelo ObraSys em ${new Date().toLocaleString('pt-BR')}_
`;
        writeNote(`Projetos/${projName}/Qualidade_Status.md`, md);
        count++;
    }
    return count;
}

/**
 * Exporta índice geral com todos os projetos.
 */
async function exportIndiceGeral() {
    const projects = await prisma.project.findMany({
        include: {
            _count: { select: { tasks: true, rdos: true, financials: true } }
        }
    });

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    const table = projects.map(p => {
        const projName = p.name.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();
        return `| [[Projetos/${projName}/Financeiro_Resumo\\|${p.name}]] | ${p.status} | ${fmt(p.budget)} | ${p._count.tasks} | ${p._count.rdos} | ${p._count.financials} |`;
    }).join('\n');

    const md = `---
tags: [obrasys, dashboard, indice]
updated: ${new Date().toISOString()}
---

# 🏗️ ObraSys — Índice de Projetos

| Projeto | Status | Orçamento | Tasks | RDOs | Lançamentos |
|---------|--------|-----------|-------|------|-------------|
${table || '| Nenhum projeto cadastrado | - | - | - | - | - |'}

---
_Última sincronização: ${new Date().toLocaleString('pt-BR')}_
`;
    writeNote('ObraSys_Dashboard.md', md);
}

// =====================================================================
// EXPORTADOR SWOT (IA CENTER) — Task 1.3
// =====================================================================

/**
 * Exporta uma análise SWOT como nota Obsidian.
 * Chamado automaticamente pelo IA Center após gerar uma análise.
 */
export async function exportSwotToObsidian(
    projectName: string,
    projectId: number,
    pulseData: any,
    swotData: any
) {
    try {
        const projName = projectName.replace(/[^a-zA-Z0-9À-ú\s]/g, '').trim();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const folder = `Projetos/${projName}/IA_SWOT`;
        const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

        const strengths = (swotData.strengths || []).map((s: string) => `- ✅ ${s}`).join('\n');
        const weaknesses = (swotData.weaknesses || []).map((s: string) => `- ⚠️ ${s}`).join('\n');
        const opportunities = (swotData.opportunities || []).map((s: string) => `- 💡 ${s}`).join('\n');
        const threats = (swotData.threats || []).map((s: string) => `- 🔴 ${s}`).join('\n');
        const mitigation = (swotData.mitigationPlan || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n');

        const md = `---
tags: [ia, swot, gemini, estrategia, ${projName.toLowerCase().replace(/\s+/g, '-')}]
projeto: "${projectName}"
risco: "${swotData.risco || 'N/A'}"
data: "${dateStr}"
hora: "${timeStr}"
modelo: "Gemini 2.5 Flash"
created: ${now.toISOString()}
---

# 🧠 Análise SWOT — ${projectName}
**Data:** ${dateStr} às ${timeStr}  
**Nível de Risco:** ${swotData.risco === 'Alto' || swotData.risco === 'Crítico' ? '🔴' : swotData.risco === 'Médio' ? '🟡' : '🟢'} **${swotData.risco}**  
**Modelo:** Gemini 2.5 Flash (Direct API)

---

## 📊 Dados de Contexto (Pulse)
| Indicador | Valor |
|-----------|-------|
| Saldo Financeiro | ${fmt(pulseData?.finance?.saldo || 0)} |
| Passivo 15 dias | ${fmt(pulseData?.finance?.aPagar15Dias || 0)} |
| Inadimplência | ${fmt(pulseData?.finance?.inadimplencia || 0)} |
| RMs Críticas Atrasadas | ${pulseData?.supply?.rmsAtrasadasCriticas?.length || 0} |
| Milestones Atrasadas | ${pulseData?.schedule?.milestonesAtrasadas?.length || 0} |
| RDOs Analisados | ${pulseData?.field?.countRdos || 0} |

---

## ✅ Forças (Strengths)
${strengths || '_Nenhuma identificada._'}

## ⚠️ Fraquezas (Weaknesses)
${weaknesses || '_Nenhuma identificada._'}

## 💡 Oportunidades (Opportunities)
${opportunities || '_Nenhuma identificada._'}

## 🔴 Ameaças (Threats)
${threats || '_Nenhuma identificada._'}

---

## 🎯 Plano de Mitigação (IA)
${mitigation || '_Nenhuma ação sugerida._'}

---
_Gerado pelo WAY IA Center via Google Gemini em ${now.toLocaleString('pt-BR')}_
`;
        const written = writeNote(`${folder}/${filename}`, md);
        console.log(`📓 SWOT exportada para Obsidian: ${written}`);
        
        if (octokit) {
            await flushGithubCommits(`SWOT Analysis: ${projectName}`);
        }

        return { success: true, path: written };
    } catch (e: any) {
        console.error("Erro ao exportar SWOT para Obsidian:", e);
        return { success: false, error: e.message };
    }
}

// =====================================================================
// ORQUESTRADOR PRINCIPAL — Sincronização Global
// =====================================================================

/**
 * Executa a sincronização completa de todos os módulos.
 * Retorna relatório com contagem de notas geradas.
 */
export async function triggerObsidianSync(projectId?: number) {
    try {
        console.log("📓 Iniciando sincronização Obsidian...");
        ensureDir(VAULT_BASE);

        const [rdoCount, finCount, supCount, qualCount] = await Promise.all([
            exportRDOs(projectId),
            exportFinanceiro(projectId),
            exportSuprimentos(projectId),
            exportQualidade(projectId),
        ]);

        await exportIndiceGeral();

        const summary = {
            success: true,
            timestamp: new Date().toISOString(),
            vaultPath: VAULT_BASE,
            exported: {
                rdos: rdoCount,
                financeiro: finCount,
                suprimentos: supCount,
                qualidade: qualCount,
                indice: 1
            },
            totalNotes: rdoCount + finCount + supCount + qualCount + 1,
            message: `✅ ${rdoCount + finCount + supCount + qualCount + 1} notas sincronizadas com o Obsidian.`
        };

        // Log do resumo no vault
        writeNote('_sync_log.md', `# Último Sync\n- **Data:** ${new Date().toLocaleString('pt-BR')}\n- **RDOs:** ${rdoCount}\n- **Financeiro:** ${finCount}\n- **Suprimentos:** ${supCount}\n- **Qualidade:** ${qualCount}\n- **Total:** ${summary.totalNotes} notas`);

        if (octokit) {
            await flushGithubCommits(`Sync Global: ${new Date().toISOString()}`);
        }

        console.log(`✅ Sincronização Obsidian concluída: ${summary.totalNotes} notas geradas.`);
        return summary;
    } catch (e: any) {
        console.error("❌ Erro na sincronização Obsidian:", e);
        return { success: false, error: e.message, message: `❌ Erro: ${e.message}` };
    }
}

// Aliases para compatibilidade com imports existentes nos módulos
export const syncAllToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportRDOsToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportSuprimentosToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportFinanceiroToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportComercialToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportQualidadeToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);
export const exportDocumentosToObsidian = async (id?: any) => triggerObsidianSync(id ? Number(id) : undefined);

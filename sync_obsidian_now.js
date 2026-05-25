// Script de sincronização inicial do Obsidian
// Executa: node sync_obsidian_now.js

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH || 'C:\\Users\\Usuario\\Desktop\\Projetos ObraSys';
const ROOT = path.join(VAULT_PATH, 'ObraSys');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function write(p, c) { ensureDir(path.dirname(p)); fs.writeFileSync(p, c, 'utf-8'); console.log('  ✅ ' + path.relative(VAULT_PATH, p)); }
function brl(v) { return 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function dt(d) { if (!d) return 'N/A'; try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return 'N/A'; } }
function slug(n) { return (n || 'sem-nome').replace(/[/\\?%*:|"<>]/g, '-').trim(); }
const ts = () => `*Sincronizado pelo ObraSys em ${new Date().toLocaleString('pt-BR')}*`;

async function main() {
    console.log('\n🔗 Iniciando sincronização ObraSys → Obsidian...\n');

    const projects = await prisma.project.findMany({
        include: { financials: true, budgetItems: true, tasks: true, rdos: true, purchaseOrders: true, inventoryItems: true, feedPosts: true, contractEvents: true }
    });

    // ---- DASHBOARD ----
    console.log('📊 Gerando Dashboard...');
    const totalOrc = projects.reduce((s, p) => s + p.budget, 0);
    const totalGasto = projects.reduce((s, p) => s + p.spent, 0);
    const margem = totalOrc > 0 ? (((totalOrc - totalGasto) / totalOrc) * 100).toFixed(1) : '0';

    write(path.join(ROOT, '_Dashboard.md'), `---
tags: [dashboard, executivo]
total_obras: ${projects.length}
orcamento_total: ${totalOrc}
gasto_total: ${totalGasto}
margem_geral: ${margem}%
---
# 🏗️ Dashboard Executivo ObraSys

| Indicador | Valor |
|-----------|-------|
| 🏗️ Obras Ativas | ${projects.length} |
| 💰 Orçamento Total | ${brl(totalOrc)} |
| 💸 Gasto Acumulado | ${brl(totalGasto)} |
| 📈 Margem Projetada | ${margem}% |

## 🚀 Status das Obras
| Obra | Status | Progresso | IDC | Gasto |
|------|--------|-----------|-----|-------|
${projects.map(p => `| [[Obras/${slug(p.name)}\\|${p.name}]] | ${p.status} | ${Math.round(p.idp * 100)}% | ${p.idc.toFixed(2)} | ${brl(p.spent)} |`).join('\n')}

---
${ts()}
`);

    // ---- NOTAS DE OBRAS E DIÁRIO ----
    console.log('🏗️  Gerando notas de Obras e Diários...');
    const obrasDir = path.join(ROOT, 'Obras');
    for (const project of projects) {
        const s = slug(project.name);
        const PROJECT_DIR = path.join(obrasDir, s);
        ensureDir(PROJECT_DIR);

        // Capa da Obra
        write(path.join(obrasDir, `${s}.md`), `---
tags: [obra, status/${project.status.toLowerCase()}]
id: ${project.id}
orcamento: ${project.budget}
gasto: ${project.spent}
---
# 🏗️ ${project.name}

## 📊 Indicadores de Performance
- **IDP (Prazo):** ${project.idp.toFixed(2)}
- **IDC (Custo):** ${project.idc.toFixed(2)}
- **Orçado:** ${brl(project.budget)}
- **Gasto:** ${brl(project.spent)}

## 🔗 Atalhos Rápidos
- [[Obras/${s}/Diario_Obra|📸 Diário de Obra (Feed)]]
- [[Comercial/Contrato - ${s}|📄 Contrato e Orçamento]]
- [[Suprimentos/${s}|📦 Suprimentos e Estoque]]
- [[Tarefas/Kanban - ${s}|📋 Kanban de Tarefas]]
- [[Financeiro/Por Obra/${s}|💰 Extrato Financeiro]]

---
${ts()}
`);

        // DIÁRIO DE OBRA (FEED) COM AUDITORIA
        const feedPosts = project.feedPosts || [];
        const activeFeed = feedPosts.filter(p => !p.isDeleted);
        
        let feedContent = `# 📸 Diário de Obra - ${project.name}\n\n`;
        feedContent += `> [[Obras/${s}|← Voltar para Obra]]\n\n`;
        feedContent += `${ts()}\n\n`;

        if (activeFeed.length === 0) {
            feedContent += `*Nenhuma postagem ativa no momento.*\n`;
        } else {
            activeFeed.forEach(p => {
                feedContent += `### 📸 ${p.location} - ${dt(p.createdAt)}\n`;
                feedContent += `**Autor:** ${p.author} (${p.role})\n`;
                feedContent += `**Descrição:** ${p.description}\n`;
                feedContent += `**Tags:** ${p.tags}\n`;
                feedContent += `**Interações:** ❤️ ${p.likes} | 💬 ${p.comments}\n\n`;
                if (p.image) {
                    const imgName = path.basename(p.image);
                    feedContent += `![[${imgName}|500]]\n\n`;
                }
                feedContent += `---\n\n`;
            });
        }

        const deletedPosts = feedPosts.filter(p => p.isDeleted);
        if (deletedPosts.length > 0) {
            feedContent += `## 🛡️ Histórico de Exclusões (Auditoria)\n\n`;
            deletedPosts.forEach(p => {
                feedContent += `> [!CAUTION] Postagem Excluída\n`;
                feedContent += `> **Original:** ${p.location} - ${dt(p.createdAt)}\n`;
                feedContent += `> **Excluído por:** ${p.deletedBy} em ${dt(p.deletedAt)}\n`;
                feedContent += `> **Motivo:** ${p.deletionReason}\n\n`;
            });
        }
        write(path.join(PROJECT_DIR, 'Diario_Obra.md'), feedContent);
    }

    // ---- DOCUMENTAÇÃO TÉCNICA ----
    console.log('📘 Gerando Manuais Técnicos...');
    const docDir = path.join(ROOT, 'Documentacao');
    write(path.join(docDir, 'Manual Metricas FP&A.md'), `
# 📈 Manual de Métricas FP&A - ObraSys
## 1. IDP (Índice de Desempenho de Prazo)
- **Fórmula:** Progresso Real / Progresso Planejado
- **O que significa:** Se > 1, a obra está adiantada. Se < 1, está atrasada.

## 2. IDC (Índice de Desempenho de Custos)
- **Fórmula:** Valor Agregado / Custo Real
- **O que significa:** Se > 1, a obra está abaixo do orçamento (lucro). Se < 1, está acima do orçamento (prejuízo).

## 3. EAC (Estimativa no Término)
- **Fórmula:** Orçamento Total / IDC
- **O que significa:** Projeção matemática de quanto a obra custará no final.
`);

    // ---- FINANCEIRO ----
    console.log('💰 Gerando notas Financeiras...');
    const records = await prisma.financialRecord.findMany({ include: { project: true }, orderBy: { dataVencimento: 'asc' } });
    const finDir = path.join(ROOT, 'Financeiro');
    const byMonth = {};
    for (const r of records) {
        const d = r.dataVencimento || r.dataCompetencia || r.createdAt;
        const key = new Date(d).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!byMonth[key]) byMonth[key] = [];
        byMonth[key].push(r);
    }
    for (const [month, recs] of Object.entries(byMonth)) {
        const ent = recs.filter(r => r.tipo === 'ENTRADA').reduce((s, r) => s + r.valorLiquido, 0);
        const sai = recs.filter(r => r.tipo === 'SAÍDA').reduce((s, r) => s + r.valorLiquido, 0);
        
        const header = `| Vencimento | Comp. | Tipo | Centro de Custo | Fornecedor/Cliente | Descrição | DRE | Bruto | Retenções | Líquido | Status |`;
        const separator = `|---|---|---|---|---|---|---|---|---|---|---|`;
        const rows = recs.map(r => {
            const retencoes = (r.caucaoRetida || 0) + (r.iss || 0) + (r.inss || 0) + (r.impostosRetidos || 0);
            return `| ${dt(r.dataVencimento)} | ${dt(r.dataCompetencia)} | ${r.tipo === 'ENTRADA' ? '✅' : '❌'} | ${r.centroCusto || (r.project?.name || '-')} | ${r.clienteFornecedor || '-'} | ${r.descricao || '-'} | ${r.classificacaoDRE || '-'} | ${brl(r.valorBruto)} | ${brl(retencoes)} | ${brl(r.valorLiquido)} | ${r.status} |`;
        }).join('\n');

        write(path.join(finDir, `Extrato - ${month.replace(/\s/g, '-')}.md`), `# 💰 Financeiro — ${month}\n\n| Indicador | Valor |\n|---|---|\n| ✅ Entradas | ${brl(ent)} |\n| ❌ Saídas | ${brl(sai)} |\n| 📊 Saldo | ${brl(ent-sai)} |\n\n## Lançamentos Padronizados WayService\n${header}\n${separator}\n${rows}`);
    }

    // ---- COMERCIAL ----
    console.log('📄 Gerando Comercial...');
    const comDir = path.join(ROOT, 'Comercial');
    for (const proj of projects) {
        const s = slug(proj.name);
        const items = proj.budgetItems.map(b => `| ${b.classificacaoDRE} | ${b.subItem || '-'} | ${brl(b.valorOrcado)} | ${brl(b.valorVenda)} |`).join('\n');
        
        const events = (proj.contractEvents || []).map(e => `| ${dt(e.data)} | ${e.tipo} | ${e.descricao} | ${brl(e.valorAdicional)} | ${e.diasAdicionais}d | ${e.status} |`).join('\n');
        
        write(path.join(comDir, `Contrato - ${s}.md`), `# 📄 Contrato — ${proj.name}\n\n| Orçamento | Gasto | IDC |\n|---|---|---|\n| ${brl(proj.budget)} | ${brl(proj.spent)} | ${proj.idc.toFixed(2)} |\n\n## Itens DRE\n| Classe | Sub | Orçado | Venda |\n|---|---|---|---|\n${items}\n\n## 📝 Aditivos e Eventos Contratuais\n| Data | Tipo | Descrição | Valor | Prazo | Status |\n|---|---|---|---|---|---|\n${events || '*Nenhum aditivo registrado.*'}`);
    }

    // ---- SUPRIMENTOS ----
    console.log('📦 Gerando Suprimentos...');
    const orders = await prisma.purchaseOrder.findMany({ include: { project: true } });
    const inventory = await prisma.inventoryItem.findMany({ include: { project: true } });
    const supDir = path.join(ROOT, 'Suprimentos');
    for (const proj of projects) {
        const s = slug(proj.name);
        const po = orders.filter(o => o.projectId === proj.id);
        const inv = inventory.filter(i => i.projectId === proj.id);
        const ordRows = po.map(o => `| ${o.item} | ${o.quantidade} | ${o.unidade} | ${brl(o.valorEstimado)} | ${o.status} |`).join('\n');
        const invRows = inv.map(i => `| ${i.material} | ${i.quantidadeAtual} | ${i.estoqueMinimo} | ${i.quantidadeAtual < i.estoqueMinimo ? '🔴' : '🟢'} |`).join('\n');
        write(path.join(supDir, `${s}.md`), `# 📦 Suprimentos — ${proj.name}\n\n## Ordens de Compra\n${ordRows}\n\n## Estoque\n${invRows}`);
    }

    // ---- KANBAN / TAREFAS ----
    console.log('📋 Gerando Kanban de Tarefas...');
    const tasksDir = path.join(ROOT, 'Tarefas');
    for (const proj of projects) {
        const s = slug(proj.name);
        const tasks = proj.tasks || [];
        const done = tasks.filter(t => t.status === 'Concluído').length;
        const prog = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
        const bar = '█'.repeat(Math.round(prog / 10)) + '░'.repeat(10 - Math.round(prog / 10));
        let sections = '';
        ['A Fazer', 'Em Andamento', 'Impedimento', 'Concluído'].forEach(col => {
            const ct = tasks.filter(t => t.status === col);
            sections += `\n## ${col} (${ct.length})\n` + (ct.length === 0 ? '*Vazio*\n' : ct.map(t => `- [${t.status === 'Concluído' ? 'x' : ' '}] ${t.name || t.title}`).join('\n') + '\n');
        });
        write(path.join(tasksDir, `Kanban - ${s}.md`), `# 📋 Kanban — ${proj.name}\n\n> Progresso: **${prog}%** \`${bar}\`\n${sections}`);
    }

    console.log('\n🎉 Sincronização concluída! Abra o Obsidian e veja a pasta ObraSys/\n');
    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

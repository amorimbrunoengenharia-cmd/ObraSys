import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, efetivo, equipamentos, atividades, ocorrencias, rdoId } = body;

    // Validação básica
    if (!data || !efetivo) {
      return NextResponse.json(
        { error: 'Data e efetivo são obrigatórios' },
        { status: 400 }
      );
    }

    // Caminho do diretório de saída
    const vaultBase = process.env.OBSIDIAN_VAULT_PATH || 'c:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\ObraSys';
    const baseDir = path.join(vaultBase, 'Projetos', 'RDOs');
    
    // Criar diretório se não existir
    try {
      await fs.mkdir(baseDir, { recursive: true });
    } catch (err) {
      console.error('Erro ao criar diretório:', err);
    }

    // Formatar data para o nome do arquivo
    const dataFormatada = data.replace(/\//g, '-'); // Converte 01/01/2024 para 01-01-2024
    const nomeArquivo = `RDO_${dataFormatada}_${rdoId || Date.now()}.md`;
    const caminhoArquivo = path.join(baseDir, nomeArquivo);

    // Template Markdown com Frontmatter
    const conteudoMarkdown = `---
title: "Relatório Diário de Obra - ${data}"
date: ${new Date().toISOString()}
rdo_id: ${rdoId || Date.now()}
data_obra: "${data}"
status: "Finalizado"
tags:
  - RDO
  - Obra
  - Diário
---

# Relatório Diário de Obra

**Data:** ${data}
**RDO Nº:** ${rdoId || Date.now()}
**Data de Geração:** ${new Date().toLocaleDateString('pt-BR')}

---

## 📊 Efetivo

### Mão de Obra Direta
${
  efetivo.mo_direta && efetivo.mo_direta.length > 0
    ? efetivo.mo_direta
        .filter((m: any) => m.qtd > 0)
        .map((m: any) => `- ${m.cargo}: **${m.qtd}**`)
        .join('\n')
    : '- Nenhum registro'
}

### Mão de Obra Indireta
${
  efetivo.mo_indireta && efetivo.mo_indireta.length > 0
    ? efetivo.mo_indireta
        .filter((m: any) => m.qtd > 0)
        .map((m: any) => `- ${m.cargo}: **${m.qtd}**`)
        .join('\n')
    : '- Nenhum registro'
}

---

## 🚜 Equipamentos e Veículos

${
  equipamentos && equipamentos.length > 0
    ? equipamentos
        .filter((e: any) => e.qtd > 0)
        .map((e: any) => `- ${e.nome}: **${e.qtd}**`)
        .join('\n')
    : '- Nenhum registro'
}

---

## 📋 Atividades Realizadas

${
  atividades && atividades.length > 0
    ? atividades.map((a: any, idx: number) => `${idx + 1}. ${a}`).join('\n')
    : '- Nenhuma atividade registrada'
}

---

## ⚠️ Ocorrências e Observações

${
  ocorrencias && ocorrencias.trim()
    ? ocorrencias
    : '- Nenhuma ocorrência registrada'
}

---

## 🌤️ Condições Climáticas

| Período | Condição |
|---------|----------|
| Manhã | ${efetivo.clima?.manha || 'Não informado'} |
| Tarde | ${efetivo.clima?.tarde || 'Não informado'} |
| Noite | ${efetivo.clima?.noite || 'Não informado'} |

---

## 📝 Fase da Obra

**${efetivo.fase || 'Não informada'}**

---

*Documento gerado automaticamente pelo ObraSys*
*Última atualização: ${new Date().toLocaleString('pt-BR')}*
`;

    // Salvar arquivo
    await fs.writeFile(caminhoArquivo, conteudoMarkdown, 'utf-8');

    return NextResponse.json(
      {
        success: true,
        message: 'RDO gerado com sucesso',
        arquivo: nomeArquivo,
        caminho: caminhoArquivo,
        timestamp: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao gerar RDO:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar RDO', details: String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../../lib/prisma';

interface Efetivo {
  cargo: string;
  quantidade: number;
}

interface Equipamento {
  tipo: string;
  quantidade: number;
}

interface Atividade {
  descricao: string;
  percentual?: number;
  taskId?: number;
}

interface Ocorrencia {
  tipo: string;
  descricao: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const data = (formData.get('data') as string) || '';
    const climaRaw = (formData.get('clima') as string) || '';
    const efetivoRaw = (formData.get('efetivo') as string) || '';
    const equipamentosRaw = (formData.get('equipamentos') as string) || '';
    const atividadesRaw = (formData.get('atividades') as string) || '';
    const ocorrenciasRaw = (formData.get('ocorrencias') as string) || '';
    const projectIdRaw = (formData.get('projectId') as string) || '';

    const clima = climaRaw ? JSON.parse(climaRaw) : { manha: 'sol', tarde: 'sol', noite: 'nublado' };
    const efetivo: Efetivo[] = efetivoRaw ? JSON.parse(efetivoRaw) : [];
    const equipamentos: Equipamento[] = equipamentosRaw ? JSON.parse(equipamentosRaw) : [];
    const atividades: Atividade[] = atividadesRaw ? JSON.parse(atividadesRaw) : [];
    const ocorrencias: Ocorrencia[] = ocorrenciasRaw ? JSON.parse(ocorrenciasRaw) : [];

    // Validar dados obrigatórios
    if (!data || !atividades || !Array.isArray(atividades)) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes: data e atividades' },
        { status: 400 }
      );
    }

    // Identificar projeto associado
    let projectId: number;
    const projectIdParsed = projectIdRaw ? Number(projectIdRaw) : NaN;
    if (!isNaN(projectIdParsed)) {
      projectId = projectIdParsed;
    } else {
      const firstProject = await prisma.project.findFirst({ select: { id: true } });
      if (firstProject) {
        projectId = firstProject.id;
      } else {
        return NextResponse.json(
          { error: 'Nenhum projeto cadastrado no sistema para associar o RDO.' },
          { status: 400 }
        );
      }
    }

    // Caminho da vault Obsidian
    const vaultBase = process.env.OBSIDIAN_VAULT_PATH || 'c:\\Users\\Usuario\\Desktop\\Projetos ObraSys\\ObraSys';
    const caminhoVault = path.join(vaultBase, 'Projetos', 'RDOs');
    const caminhoFotos = path.join(caminhoVault, 'Fotos', data);

    // Criar diretórios se não existirem
    if (!fs.existsSync(caminhoVault)) fs.mkdirSync(caminhoVault, { recursive: true });
    if (!fs.existsSync(caminhoFotos)) fs.mkdirSync(caminhoFotos, { recursive: true });

    // Processar e salvar fotos
    const fotosSalvas: string[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('photo_') && value instanceof File) {
        const buffer = Buffer.from(await value.arrayBuffer());
        const nomeFoto = `${Date.now()}-${value.name}`;
        const caminhoFoto = path.join(caminhoFotos, nomeFoto);
        fs.writeFileSync(caminhoFoto, buffer);
        fotosSalvas.push(`Fotos/${data}/${nomeFoto}`);
      }
    }

    // Gerar nome do arquivo com timestamp
    const nomeArquivo = `RDO-${data}.md`;
    const caminhoCompleto = path.join(caminhoVault, nomeArquivo);

    // Formatar dados para o template
    const climaFormatado = `- Manhã: ${clima.manha}\n- Tarde: ${clima.tarde}\n- Noite: ${clima.noite}`;

    const efetivosFormatado = Array.isArray(efetivo) && efetivo.length > 0
      ? efetivo.map((e: Efetivo) => `- ${e.cargo}: ${e.quantidade} pessoas`).join('\n')
      : 'Não informado';

    const equipamentosFormatado = Array.isArray(equipamentos) && equipamentos.length > 0
      ? equipamentos.map((eq: Equipamento) => `- ${eq.tipo}: ${eq.quantidade}x`).join('\n')
      : 'Sem equipamentos';

    const atividadesFormatado = Array.isArray(atividades) && atividades.length > 0
      ? atividades.map((at: Atividade) => `- ${at.descricao} (${at.percentual || 0}% concluído)`).join('\n')
      : 'Sem atividades informadas';

    const ocorrenciasFormatado = Array.isArray(ocorrencias) && ocorrencias.length > 0
      ? ocorrencias.map((oc: Ocorrencia) => `- **${oc.tipo}**: ${oc.descricao}`).join('\n')
      : 'Nenhuma ocorrência registrada';

    const fotosMarkdown = fotosSalvas.length > 0
      ? fotosSalvas.map(f => `![[${f}]]`).join('\n')
      : 'Nenhuma foto anexada.';

    // Template estruturado do RDO
    const conteudoRDO = `---
data: ${data}
tags: [rdo, gestao-obras, acompanhamento]
status: finalizado
---

# Relatório Diário de Obra - ${data}

## 🌦️ Condições Climáticas
${climaFormatado}

## 📊 Efetivo
${efetivosFormatado}

## 🏗️ Equipamentos
${equipamentosFormatado}

## 📋 Atividades Realizadas
${atividadesFormatado}

## ⚠️ Ocorrências e Pontos de Atenção
${ocorrenciasFormatado}

## 📸 Registro Fotográfico
${fotosMarkdown}

---
*Arquivo gerado automaticamente por ObraSys em ${new Date().toLocaleString('pt-BR')}*
`;

    // Escrever arquivo Markdown no Obsidian
    fs.writeFileSync(caminhoCompleto, conteudoRDO, 'utf-8');

    // PERSISTÊNCIA COMPLETA NO BANCO DE DADOS (PRISMA SQLite)
    const issuesJson = JSON.stringify({
      obs: ocorrencias.map((o: Ocorrencia) => `${o.tipo}: ${o.descricao}`).join('\n'),
      activities: atividades
    });

    const createdRdo = await prisma.rDO.create({
      data: {
        date: data,
        weather: JSON.stringify(clima),
        manpower: JSON.stringify({ direta: efetivo, indireta: [] }),
        equipment: JSON.stringify({ equipamentos: equipamentos, veiculos: [] }),
        issues: issuesJson,
        status: 'Finalizado',
        projectId: projectId
      }
    });

    // Salvar atividades e sincronizar com o Kanban
    for (const at of atividades) {
      let taskId: number | null = at.taskId ? Number(at.taskId) : null;
      
      // Tentativa de correspondência inteligente por descrição caso não haja ID
      if (!taskId && at.descricao) {
        const matchedTask = await prisma.task.findFirst({
          where: {
            projectId: projectId,
            name: { contains: at.descricao }
          },
          select: { id: true }
        });
        if (matchedTask) {
          taskId = matchedTask.id;
        }
      }

      const progress = Math.min(100, Math.max(0, Number(at.percentual) || 0));

      const createdActivity = await prisma.rdoActivity.create({
        data: {
          taskId,
          progress,
          observations: at.descricao || '',
          rdoId: createdRdo.id
        }
      });

      // Salvar Fotos associadas
      if (fotosSalvas.length > 0) {
        for (const fotoPath of fotosSalvas) {
          await prisma.rdoPhoto.create({
            data: {
              url: `/${fotoPath.replace(/\\/g, '/')}`,
              caption: 'Registro fotográfico mobile',
              activityId: createdActivity.id
            }
          });
        }
      }

      // KANBAN SYNC: Atualizar progresso e estado da Task no Kanban se houver taskId
      if (taskId) {
        const updateData: any = { progress };
        
        if (progress >= 100) {
          updateData.columnId = 'done';
          updateData.status = 'Concluído';
          updateData.actualFinish = new Date();
        } else if (progress > 0) {
          const currentTask = await prisma.task.findUnique({
            where: { id: taskId },
            select: { columnId: true, actualStart: true }
          });
          if (currentTask?.columnId === 'todo') {
            updateData.columnId = 'in_progress';
            updateData.status = 'Em Andamento';
          }
          if (!currentTask?.actualStart) {
            updateData.actualStart = new Date();
          }
        }

        await prisma.task.update({
          where: { id: taskId },
          data: updateData
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'RDO criado e sincronizado no banco de dados com sucesso',
      rdoId: createdRdo.id,
      arquivo: nomeArquivo,
      caminho: caminhoCompleto
    });
  } catch (error) {
    console.error('Erro ao criar RDO:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar RDO';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

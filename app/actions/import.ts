"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { autoSchedule } from './task';

// Nota: Esta action requer a biblioteca 'xml2js'. 
// Instale com: npm install xml2js @types/xml2js
import { parseStringPromise } from 'xml2js';

export async function importMSProjectXML(projectId: number, xmlContent: string, mode: 'overwrite' | 'update') {
    try {
        const result = await parseStringPromise(xmlContent);
        const projectData = result.Project;
        
        if (!projectData || !projectData.Tasks) {
            throw new Error("Formato de arquivo inválido. Certifique-se de que é um XML do MS Project.");
        }

        const xmlTasks = projectData.Tasks[0].Task;

        if (mode === 'overwrite') {
            await prisma.task.deleteMany({ where: { projectId } });
        }

        const createdTasks: any[] = [];

        for (const xt of xmlTasks) {
            // Ignorar a tarefa raiz do projeto se necessário (geralmente OutlineLevel 0)
            if (xt.IsNull && xt.IsNull[0] === 'true') continue;

            const name = xt.Name ? xt.Name[0] : "Tarefa Sem Nome";
            const level = xt.OutlineLevel ? parseInt(xt.OutlineLevel[0]) : 0;
            const start = 0; // O MS Project usa datas absolutas, vamos converter para relativo ou manter zero para o motor
            const duration = xt.Duration ? parseMSDuration(xt.Duration[0]) : 1;
            const isSummary = xt.Summary ? xt.Summary[0] === '1' : false;
            const order = xt.ID ? parseInt(xt.ID[0]) : 0;
            
            // Predecessoras
            let predecessors = "";
            if (xt.PredecessorLink) {
                predecessors = xt.PredecessorLink.map((pl: any) => {
                    const predId = pl.PredecessorUID[0];
                    const typeCode = pl.Type ? pl.Type[0] : '1'; // 1 = FS
                    const type = typeCode === '0' ? 'FF' : typeCode === '1' ? 'FS' : typeCode === '2' ? 'SS' : 'SF';
                    return `${predId}${type}`;
                }).join('; ');
            }

            const newTask = await prisma.task.create({
                data: {
                    projectId,
                    name,
                    title: name,
                    wbs: xt.OutlineNumber ? xt.OutlineNumber[0] : "1",
                    level,
                    start,
                    duration,
                    isSummary,
                    order,
                    predecessors,
                    status: 'A Fazer',
                    columnId: 'todo'
                }
            });
            createdTasks.push(newTask);
        }

        // Recalcular tudo após a importação massiva
        if (createdTasks.length > 0) {
            // Disparar o auto-schedule para a primeira tarefa ou todas as raízes
            const rootTasks = createdTasks.filter(t => t.level === 1 || t.level === 0);
            for (const root of rootTasks) {
                await autoSchedule(root.id);
            }
        }

        revalidatePath('/');
        return { success: true, count: createdTasks.length };
    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

// O MS Project exporta duração como "PT8H0M0S" (8 horas) ou similar
function parseMSDuration(durationStr: string): number {
    // Exemplo: PT24H0M0S -> 24h -> 3 dias (considerando 8h/dia)
    const match = durationStr.match(/PT(\d+)H/);
    if (match) {
        const hours = parseInt(match[1]);
        return Math.ceil(hours / 8); // Simplificação: 8h = 1 dia
    }
    return 1;
}

"use server";

import { prisma } from '../../lib/prisma';

// WMO Weather interpretation codes (https://open-meteo.com/en/docs)
function getWeatherDescription(code: number) {
    if (code === 0) return { text: "Céu Limpo", icon: "sun" };
    if (code === 1 || code === 2 || code === 3) return { text: "Parcialmente Nublado", icon: "cloud-sun" };
    if (code >= 45 && code <= 48) return { text: "Neblina", icon: "cloud-fog" };
    if (code >= 51 && code <= 67) return { text: "Chuva Leve", icon: "cloud-drizzle" };
    if (code >= 71 && code <= 77) return { text: "Neve", icon: "snowflake" };
    if (code >= 80 && code <= 82) return { text: "Pancadas de Chuva", icon: "cloud-rain" };
    if (code >= 95) return { text: "Tempestade", icon: "cloud-lightning" };
    return { text: "Indefinido", icon: "cloud" };
}

/**
 * Obtém a temperatura e código climático da API pública do Open-Meteo.
 * Default para Araçatuba/SP se coordenadas não fornecidas.
 */
export async function getLiveWeather(lat = -21.2089, lon = -50.4328) {
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`, {
            next: { revalidate: 3600 } // Cache de 1 hora
        });
        
        if (!res.ok) throw new Error("Falha na API de clima");
        
        const data = await res.json();
        const current = data.current;
        const condition = getWeatherDescription(current.weather_code);
        
        return {
            success: true,
            temperature: Math.round(current.temperature_2m),
            condition: condition.text,
            icon: condition.icon
        };
    } catch (e) {
        console.error("Erro ao buscar clima:", e);
        return { success: false, temperature: '--', condition: 'Indisponível', icon: 'cloud-off' };
    }
}

/**
 * Avalia se o canteiro de obras está ativo cruzando RDOs e Tarefas Concluídas nas últimas 48h.
 */
export async function getWorksiteStatus(projectId: number) {
    try {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        // Verifica se há RDO recente
        const recentRDO = await prisma.rDO.findFirst({
            where: {
                projectId,
                createdAt: { gte: fortyEightHoursAgo }
            }
        });

        // Verifica se há alguma tarefa movida para done recentemente
        // Como o Task model só tem updatedAt, usaremos ele assumindo status = 'done' ou progresso > 0 recentemente
        const recentTask = await prisma.task.findFirst({
            where: {
                projectId,
                status: 'done', // ou 'Concluído'
                updatedAt: { gte: fortyEightHoursAgo }
            }
        });

        if (recentRDO || recentTask) {
            return {
                active: true,
                label: "Canteiro Ativo",
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
                reason: recentRDO ? "RDO preenchido recentemente" : "Tarefas concluídas recentemente"
            };
        } else {
            return {
                active: false,
                label: "Sem Atualizações Recentes",
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
                reason: "Sem movimentação no sistema nas últimas 48h"
            };
        }
    } catch (e) {
        console.error("Erro ao verificar status do canteiro:", e);
        return {
            active: false,
            label: "Status Desconhecido",
            color: "text-slate-500",
            bgColor: "bg-slate-500/10",
            reason: "Erro ao consultar banco de dados"
        };
    }
}

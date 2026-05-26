/**
 * S-Curve Calculator Utility
 * Centralizes the logic for calculating cumulative planned vs actual progress.
 */

export type Granularity = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface SCurvePoint {
  name: string;
  planejado: number;
  realizado: number;
}

export function calculateSCurve(tarefas: any[], granularity: Granularity = 'weekly'): SCurvePoint[] {
  if (!tarefas || tarefas.length === 0) return [{ name: 'Início', planejado: 0, realizado: 0 }];

  // Verificar se há linha de base (baseline)
  const hasBaseline = tarefas.some(t => t.baseStart !== null && t.baseStart !== undefined);
  if (!hasBaseline) return [];

  const activities = tarefas.filter(t => !t.isSummary);
  if (activities.length === 0) return [];

  // Encontrar o início e o fim real do projeto (considerando base e atual)
  const minStart = Math.max(0, Math.min(...activities.map(t => Math.min(
      t.baseStart !== undefined ? t.baseStart : t.start, 
      t.start || 0
  ))));
  
  const maxDay = Math.max(...activities.map(t => Math.max(
      (t.baseStart !== undefined ? t.baseStart : t.start) + (t.baseDur !== undefined ? t.baseDur : t.duration), 
      (t.start || 0) + (t.duration || 0)
  )));

  const data: SCurvePoint[] = [];
  
  let step = 7; 
  if (granularity === 'daily') step = 1;
  if (granularity === 'weekly') step = 7;
  if (granularity === 'biweekly') step = 15;
  if (granularity === 'monthly') step = 30;
  if (granularity === 'yearly') step = 365;

  // Peso total agora é baseado na duração planejada (Valor Agregado Real)
  const totalWeight = activities.reduce((acc, t) => acc + (t.baseDur !== undefined ? t.baseDur : (t.duration || 1)), 0) || 1;

  let periodCounter = 0;
  for (let day = minStart; day <= maxDay + step; day += step) {
    let planned = 0;
    let actual = 0;

    activities.forEach(t => {
        const weight = t.baseDur !== undefined ? t.baseDur : (t.duration || 1);

        // Planejado (Baseado na Baseline)
        const bStart = t.baseStart !== undefined ? t.baseStart : t.start;
        const bDur = t.baseDur !== undefined ? t.baseDur : t.duration;
        const bEnd = bStart + bDur;
        
        if (day >= bEnd) {
          planned += weight;
        } else if (day > bStart && bDur > 0) {
          planned += weight * ((day - bStart) / bDur);
        }

        // Realizado (Baseado no progresso atual e datas reais)
        const progressValue = (Number(t.progress) || 0) / 100;
        const tStart = t.start || 0;
        const tDur = t.duration || 1;
        const tEnd = tStart + tDur;
        
        if (day >= tEnd) {
          actual += weight * progressValue;
        } else if (day > tStart) {
          // O avanço real no tempo decorrido, limitado pelo progresso reportado
          const timeProgress = (day - tStart) / tDur;
          actual += weight * Math.min(progressValue, timeProgress);
        }
    });

    let pointName = "";
    if (granularity === 'daily') pointName = `Dia ${periodCounter}`;
    else if (granularity === 'weekly') pointName = `Sem. ${periodCounter}`;
    else if (granularity === 'biweekly') pointName = `Quinz. ${periodCounter}`;
    else if (granularity === 'monthly') pointName = `Mês ${periodCounter}`;
    else pointName = `Ano ${periodCounter}`;

    data.push({
      name: pointName,
      planejado: Math.min(100, Math.round((planned / totalWeight) * 100)),
      realizado: Math.min(100, Math.round((actual / totalWeight) * 100))
    });
    
    periodCounter++;
  }

  return data;
}

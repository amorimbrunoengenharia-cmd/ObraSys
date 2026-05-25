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

  const maxDay = Math.max(...tarefas.map(t => (t.start + t.duration) || 10), 30);
  const data: SCurvePoint[] = [];
  
  let step = 7; 
  if (granularity === 'daily') step = 1;
  if (granularity === 'weekly') step = 7;
  if (granularity === 'biweekly') step = 15;
  if (granularity === 'monthly') step = 30;
  if (granularity === 'yearly') step = 365;

  const activities = tarefas.filter(t => !t.isSummary);
  const totalWeight = activities.length || 1;

  for (let day = 0; day <= maxDay; day += step) {
    let planned = 0;
    let actual = 0;

    activities.forEach(t => {
        // Planejado (Baseado na Baseline)
        const bStart = t.baseStart !== undefined ? t.baseStart : t.start;
        const bDur = t.baseDur !== undefined ? t.baseDur : t.duration;
        const bEnd = bStart + bDur;
        
        if (day >= bEnd) {
          planned += 1;
        } else if (day > bStart && bDur > 0) {
          planned += (day - bStart) / bDur;
        }

        // Realizado (Baseado no progresso atual e datas reais)
        const progressValue = (Number(t.progress) || 0) / 100;
        const tStart = t.start || 0;
        const tDur = t.duration || 1;
        const tEnd = tStart + tDur;
        
        if (day >= tEnd) {
          actual += progressValue;
        } else if (day > tStart) {
          actual += progressValue * ((day - tStart) / tDur);
        }
    });

    let pointName = "";
    if (granularity === 'daily') pointName = `Dia ${day}`;
    else if (granularity === 'weekly') pointName = `Sem. ${Math.floor(day/7)}`;
    else if (granularity === 'biweekly') pointName = `Quinz. ${Math.floor(day/15)}`;
    else if (granularity === 'monthly') pointName = `Mês ${Math.floor(day/30)}`;
    else pointName = `Ano ${Math.floor(day/365)}`;

    data.push({
      name: pointName,
      planejado: Math.min(100, Math.round((planned / totalWeight) * 100)),
      realizado: Math.min(100, Math.round((actual / totalWeight) * 100))
    });
  }

  return data;
}

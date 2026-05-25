import dynamic from "next/dynamic";
import { prisma } from "@/lib/prisma";
import Link from 'next/link';
import { ArrowLeft, Map as MapIcon } from 'lucide-react';
import { cookies } from 'next/headers';
import { shouldFilterProjects } from '@/lib/permissions';

import MapWrapper from '@/components/MapWrapper';

export default async function MapaPage() {
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
                  { employees: { some: { userId: userObj.id } } },
                  { engineerId: userObj.id },
                  { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
              ]
          };
      } else {
          whereClause = { id: -1 };
      }
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      financials: { where: { tipo: 'SAÍDA' } },
      tasks: true,
      engineer: true
    }
  });

  const today = new Date();

  // Mapeia os dados para o formato que o mapa espera (Conforme solicitado)
  const formattedProjects = projects.map(p => {
    // Cálculo de Gasto e Margem Real (Consistente com a Home)
    const spent = p.financials.reduce((acc, curr) => acc + (curr.valorBruto || 0), 0);
    const budget = p.budget || 0;
    const financialProgress = budget > 0 ? (spent / budget) * 100 : 0;
    const marginValue = budget > 0 ? ((budget - spent) / budget * 100) : 0;
    
    // Avanço Físico
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter(t => t.status === 'Concluído' || t.columnId === 'done').length;
    const physicalProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : p.physicalProgress;

    // Lógica de Alerta Crítico
    const overdueTasks = p.tasks.filter(t => {
        const isDone = t.status === 'Concluído' || t.columnId === 'done';
        return !isDone && t.endDate && new Date(t.endDate) < today;
    }).length;
    
    const isCritical = (financialProgress > physicalProgress + 10 && physicalProgress > 0) || (marginValue < 5) || (overdueTasks > 0);

    let displayAddress = p.location || `${p.city || 'Sede'}, ${p.state || 'SP'}`;
    try {
        const parsed = JSON.parse(p.address || '{}');
        if (parsed.street) {
            displayAddress = `${parsed.street}, ${parsed.number} - ${parsed.city}/${parsed.state} - CEP: ${parsed.cep}`;
        }
    } catch(e) {
        if (p.address && !p.address.startsWith('{')) {
            displayAddress = p.address;
        }
    }

    return {
        id: p.id,
        name: p.name,
        address: displayAddress,
        status: p.status,
        lat: p.latitude, 
        lng: p.longitude,
        margin: Number(marginValue.toFixed(1)),
        responsibleEngineer: p.engineer?.name || null,
        progresso: physicalProgress,
        saude: p.status === 'Paralisado' || isCritical ? 'critico' : (budget - spent < 0 ? 'atencao' : 'bom'),
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] p-4 md:p-8 h-screen flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm font-bold mb-2 transition-colors">
            <ArrowLeft size={16}/> Voltar ao Dashboard
          </Link>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
            <MapIcon className="text-blue-600"/> Torre de Controle: Geolocalização
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visão global de todas as frentes de serviço da WayService</p>
        </div>
      </div>
      
      <div className="flex-1 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xl relative">
        <MapWrapper projects={formattedProjects} />
      </div>
    </div>
  );
}

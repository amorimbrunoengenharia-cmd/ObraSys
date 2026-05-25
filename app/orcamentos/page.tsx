import { prisma } from '../../lib/prisma';
import Orcamentos from '../../components/modules/Orcamentos';
import { Suspense } from 'react';

import { cookies } from 'next/headers';
import { shouldFilterProjects } from '../../lib/permissions';

export default async function OrcamentosPage() {
  const cookieStore = await cookies();
  const rawUserRole = cookieStore.get('userRole')?.value || '';
  const rawUserEmail = cookieStore.get('userEmail')?.value || '';
  const userRole = rawUserRole ? decodeURIComponent(rawUserRole) : '';
  const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

  let projectFilter: any = {};
  if (shouldFilterProjects(userRole)) {
      const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
      if (userRole === 'Cliente / Investidor') {
          projectFilter = { clientName: userObj?.name || '---' };
      } else if (userObj) {
          projectFilter = {
              OR: [
                  { employees: { some: { userId: userObj.id } } },
                  { engineerId: userObj.id },
                  { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
              ]
          };
      } else {
          projectFilter = { id: -1 };
      }
  }

  const projectIds = projectFilter.id === -1 ? [-1] : Object.keys(projectFilter).length > 0 ? (await prisma.project.findMany({ where: projectFilter, select: { id: true } })).map(p => p.id) : null;
  const relationFilter = projectIds ? { projectId: { in: projectIds } } : {};

  const estimates = await prisma.estimate.findMany({
    where: relationFilter,
    include: { 
      project: true,
      stages: {
        include: { 
          items: {
            include: { resources: true }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const projects = await prisma.project.findMany({
    where: projectFilter,
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    }>
      <Orcamentos initialEstimates={estimates} projects={projects} userRole={userRole} />
    </Suspense>
  );
}

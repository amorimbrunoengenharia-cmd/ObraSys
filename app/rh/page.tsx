import { prisma } from '../../lib/prisma';
import RHClient from '../../components/modules/RH';
import { getDashboardStats } from '../actions/rh';
import { getSetting } from '../actions/settings';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { canAccessPage, shouldFilterProjects } from '../../lib/permissions';

export default async function RHPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value || '';
  const rawUserEmail = cookieStore.get('userEmail')?.value || '';
  const userEmail = rawUserEmail ? decodeURIComponent(rawUserEmail) : '';

  // Proteger Rota Global
  if (!canAccessPage(userRole, 'rh')) {
     redirect('/');
  }

  let employeeWhere: any = {};
  let candidateWhere: any = {};

  if (shouldFilterProjects(userRole)) {
      const userObj = await prisma.user.findUnique({ where: { email: userEmail } });
      if (userObj && userRole !== 'Cliente / Investidor') {
          const projectCondition = {
              OR: [
                  { employees: { some: { userId: userObj.id } } },
                  { engineerId: userObj.id },
                  { tasks: { some: { assignees: { some: { id: userObj.id } } } } }
              ]
          };
          employeeWhere = { projects: { some: projectCondition } };
          candidateWhere = { project: projectCondition };
      } else {
          employeeWhere = { id: 'blocked' };
          candidateWhere = { id: 'blocked' };
      }
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      jobRole: true,
      company: true,
      projects: true,
      documents: true,
      epis: true,
      attendances: { orderBy: { date: 'desc' }, take: 30 },
      occurrences: { orderBy: { date: 'desc' } }
    },
    orderBy: { name: 'asc' }
  });

  const stats = await getDashboardStats();
  const turnoverGoalStr = await getSetting('rh_turnover_goal');
  const turnoverGoal = turnoverGoalStr ? parseFloat(turnoverGoalStr) : null;

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const jobRoles = await prisma.jobRole.findMany({
    orderBy: { name: 'asc' }
  });

  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' }
  });

  const candidates = await prisma.candidate.findMany({
    where: candidateWhere,
    include: { project: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <RHClient 
      initialEmployees={employees} 
      stats={stats} 
      projects={projects}
      jobRoles={jobRoles}
      companies={companies}
      candidates={candidates}
      userRole={decodeURIComponent(userRole)}
      turnoverGoal={turnoverGoal}
    />
  );
}

import { prisma } from '../../lib/prisma';
import TIClient from '../../components/modules/TI';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { canAccessPage } from '../../lib/permissions';
import { getPurchaseApprovalRules } from '../actions/ti';

export default async function TIPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value || '';

  if (!canAccessPage(userRole, 'configuracoes') && userRole !== 'Diretor' && userRole !== 'TI') {
     if (userRole !== 'Diretor' && userRole !== 'Director' && userRole !== 'TI') {
         redirect('/');
     }
  }

  const assets = await prisma.itAsset.findMany({
    include: { employee: true },
    orderBy: { tag: 'asc' }
  });

  const licenses = await prisma.itLicense.findMany({
    orderBy: { softwareName: 'asc' }
  });

  const tickets = await prisma.itTicket.findMany({
    include: { user: true, project: true },
    orderBy: { createdAt: 'desc' }
  });

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, cpf: true },
    where: { status: 'Ativo' },
    orderBy: { name: 'asc' }
  });

  const currentUser = await prisma.user.findFirst({
    where: { email: cookieStore.get('userEmail')?.value || '' }
  });

  const approvalRules = await getPurchaseApprovalRules();

  return (
    <TIClient 
      initialAssets={assets} 
      initialLicenses={licenses} 
      initialTickets={tickets}
      employees={employees}
      currentUserId={currentUser?.id || 0}
      currentUserRole={userRole}
      initialApprovalRules={approvalRules}
    />
  );
}

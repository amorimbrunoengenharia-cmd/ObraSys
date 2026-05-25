"use server";

import { prisma } from '../../lib/prisma';
import { revalidatePath } from 'next/cache';
import { unassignAssetsFromEmployee } from './ti';

/**
 * Função interna para disparar notificações para os stakeholders do RH/DP e Obra.
 */
async function notifyStakeholders(projectId: number | null, title: string, message: string, type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' = 'INFO', link: string = '/rh') {
  try {
    const globalUsers = await prisma.user.findMany({
      where: { role: { in: ['Diretor', 'Director', 'RH / DP'] } }
    });
    
    const notifyUserIds = new Set(globalUsers.map(u => u.id));

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { engineerId: true }
      });
      if (project?.engineerId) {
        notifyUserIds.add(project.engineerId);
      }
      
      const tstUsers = await prisma.user.findMany({
        where: { role: 'Téc. Segurança' }
      });
      tstUsers.forEach(u => notifyUserIds.add(u.id));
    }

    const notifications = Array.from(notifyUserIds).map(userId => ({
      userId,
      title,
      message,
      type,
      link
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }
  } catch (error) {
    console.error("Erro ao notificar stakeholders:", error);
  }
}

// ============================================================================
// COLABORADORES (EMPLOYEE)
// ============================================================================

export async function getEmployees() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        jobRole: true,
        company: true,
        project: true,
        documents: true,
        epis: true,
        attendances: { orderBy: { date: 'desc' }, take: 10 },
        occurrences: { orderBy: { date: 'desc' } }
      },
      orderBy: { name: 'asc' }
    });
    return employees;
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return [];
  }
}

export async function getDashboardStats() {
  try {
    const total = await prisma.employee.count();
    const ativos = await prisma.employee.count({ where: { status: 'Ativo' } });
    const ferias = await prisma.employee.count({ where: { status: 'Férias' } });
    const demitidos = await prisma.employee.count({ where: { status: 'Demitido' } });
    const afastados = await prisma.employee.count({ where: { status: 'Afastado INSS' } });

    // Turnover do Trimestre (últimos 90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const admissoesTrimestre = await prisma.employee.count({
      where: { admissionDate: { gte: ninetyDaysAgo } }
    });

    const demissoesTrimestre = await prisma.employee.count({
      where: { 
        status: 'Demitido',
        OR: [
          { demissionDate: { gte: ninetyDaysAgo } },
          { updatedAt: { gte: ninetyDaysAgo } } // fallback se não tiver demissionDate
        ]
      }
    });

    // EPIs vencidos ou vencendo
    const today = new Date();
    const episVencidos = await prisma.employeeEpi.count({
      where: {
        returned: false,
        replacementDate: { lt: today }
      }
    });

    // ASOs/NRs vencidos
    const docsVencidos = await prisma.employeeDocument.count({
      where: {
        expirationDate: { lt: today }
      }
    });

    return { 
      total, ativos, ferias, demitidos, afastados, episVencidos, docsVencidos,
      admissoesTrimestre, demissoesTrimestre
    };
  } catch (error) {
    console.error("Erro ao buscar stats:", error);
    return null;
  }
}

export async function createJobRole(name: string, accessLevel: string) {
  try {
    const jobRole = await prisma.jobRole.create({
      data: {
        name,
        accessLevel
      }
    });
    return { success: true, id: jobRole.id };
  } catch (error: any) {
    console.error("Erro ao criar função:", error);
    if (error.code === 'P2002') {
      return { success: false, error: 'Já existe uma função com este nome.' };
    }
    return { success: false, error: 'Erro ao criar função.' };
  }
}

export async function createEmployee(data: {
  name: string;
  cpf: string;
  rg?: string;
  matricula?: string;
  birthDate?: Date;
  admissionDate?: Date;
  baseSalary?: number;
  jobRoleId?: number;
  companyId?: number;
  projectIds?: number[];
  email?: string;
  password?: string;
  regime?: string;
  encargos?: number;
  status?: string;
}) {
  try {
    const { projectIds, email, password, matricula, ...rest } = data;
    
    // Validations
    if (rest.cpf) {
        const cpfExists = await prisma.employee.findUnique({ where: { cpf: rest.cpf } });
        if (cpfExists) return { success: false, error: "Este CPF já está cadastrado no sistema." };
    }

    const cleanMatricula = matricula === '' ? null : matricula;
    if (cleanMatricula) {
        const matExists = await prisma.employee.findUnique({ where: { matricula: cleanMatricula } });
        if (matExists) return { success: false, error: "Esta Matrícula já está em uso por outro colaborador." };
    }

    // Create User if email and password are provided
    let userId: number | undefined;
    let roleName = 'Sem Acesso';
    if (data.jobRoleId) {
        roleName = (await prisma.jobRole.findUnique({ where: { id: data.jobRoleId } }))?.accessLevel || 'Sem Acesso';
    }

    if (email) {
       let user = await prisma.user.findUnique({ where: { email } });
       if (user) {
           const existingEmp = await prisma.employee.findFirst({ where: { userId: user.id } });
           if (existingEmp) {
               return { success: false, error: "Este E-mail já está em uso por outro usuário." };
           }
       }

       if (!user && password) {
           user = await prisma.user.create({
               data: {
                   email,
                   password,
                   name: rest.name,
                   role: roleName
               }
           });
       } else if (user) {
           // User exists (e.g. from a previous failed employee creation), just update the role
           user = await prisma.user.update({
               where: { id: user.id },
               data: { role: roleName }
           });
       }
       userId = user?.id;
    }

    const emp = await prisma.employee.create({
      data: {
        ...rest,
        matricula: cleanMatricula,
        status: rest.status || 'Ativo',
        userId,
        projects: {
            connect: (projectIds || []).map(id => ({ id }))
        }
      }
    });
    
    // Notifica
    const projectId = projectIds && projectIds.length > 0 ? projectIds[0] : null;
    await notifyStakeholders(projectId, 'Novo Colaborador Adicionado', `${rest.name} ingressou como ${roleName}.`, 'SUCCESS');
    
    revalidatePath('/rh');
    return { success: true, employee: emp };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(id: string, data: Partial<any>) {
  try {
    const { projectIds, email, password, matricula, ...rest } = data;
    const oldEmp = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
    
    // Validations for updates
    if (rest.cpf) {
        const cpfExists = await prisma.employee.findFirst({ where: { cpf: rest.cpf, id: { not: id } } });
        if (cpfExists) return { success: false, error: "Este CPF já está cadastrado para outro colaborador." };
    }

    const cleanMatricula = matricula === '' ? null : matricula;
    if (cleanMatricula !== undefined && cleanMatricula !== null) {
        const matExists = await prisma.employee.findFirst({ where: { matricula: cleanMatricula, id: { not: id } } });
        if (matExists) return { success: false, error: "Esta Matrícula já está em uso por outro colaborador." };
    }

    let updateData: any = { ...rest };
    if (matricula !== undefined) {
      updateData.matricula = cleanMatricula;
    }
    if (projectIds !== undefined) {
        updateData.projects = {
            set: projectIds.map((pid: number) => ({ id: pid }))
        };
    }

    const emp = await prisma.employee.update({
      where: { id },
      data: updateData
    });
    
    if (data.status === 'Demitido' && oldEmp?.status !== 'Demitido') {
      await notifyStakeholders(projectIds?.[0] || null, 'Desligamento Registrado', `O colaborador ${emp.name} foi desligado.`, 'WARNING');
      
      // Recolher Ativos de T.I. automaticamente
      await unassignAssetsFromEmployee(emp.id);
      
      // Notificar T.I.
      const tiUsers = await prisma.user.findMany({ where: { role: 'TI' } });
      if (tiUsers.length > 0) {
        await prisma.notification.createMany({
          data: tiUsers.map(u => ({
            userId: u.id,
            title: "Recolhimento de Equipamento",
            message: `O colaborador ${emp.name} foi desligado. Por favor, recolha seus equipamentos (Notebook/Celular).`,
            type: "WARNING",
            link: "/ti"
          }))
        });
      }
    }
    
    revalidatePath('/rh');
    return { success: true, employee: emp };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEmployee(id: string) {
  try {
    if (!id) throw new Error("ID do colaborador não fornecido.");

    // Desvincular de ItAsset para evitar falhas de constraint de chave estrangeira
    await prisma.itAsset.updateMany({ where: { employeeId: id }, data: { employeeId: null } });

    await prisma.employee.delete({ where: { id } });
    
    revalidatePath('/rh');
    return { success: true };
  } catch (error: any) {
    console.error("Erro ao deletar employee:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// DOCUMENTOS / SST
// ============================================================================

export async function addEmployeeDocument(data: {
  employeeId: string;
  type: string;
  fileUrl?: string;
  issueDate?: Date;
  expirationDate?: Date;
}) {
  try {
    const doc = await prisma.employeeDocument.create({
      data: {
        ...data,
        status: 'Válido'
      }
    });
    revalidatePath('/rh');
    return { success: true, document: doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EPIs
// ============================================================================

export async function addEmployeeEpi(data: {
  employeeId: string;
  equipmentName: string;
  caNumber?: string;
  replacementDate?: Date;
  signatureUrl?: string;
}) {
  try {
    const epi = await prisma.employeeEpi.create({
      data: {
        ...data,
        deliveryDate: new Date(),
        returned: false
      }
    });
    
    const emp = await prisma.employee.findUnique({ where: { id: data.employeeId }, include: { projects: true } });
    const empProjectId = emp?.projects?.[0]?.id || null;
    if (emp) {
      // Notifica TST que EPI foi entregue
      await notifyStakeholders(empProjectId, 'Entrega de EPI', `${data.equipmentName} entregue para ${emp.name}.`, 'INFO');
    }
    
    revalidatePath('/rh');
    return { success: true, epi };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function returnEpi(id: string) {
  try {
    const epi = await prisma.employeeEpi.update({
      where: { id },
      data: { returned: true }
    });
    revalidatePath('/rh');
    return { success: true, epi };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PONTO E FALTAS
// ============================================================================

export async function addEmployeeAttendance(data: {
  employeeId: string;
  date: Date;
  status: string; // Presente, Falta Injustificada, Falta Justificada, Férias
  hoursWorked: number;
  overtimeHours: number;
  certificateUrl?: string;
  observations?: string;
}) {
  try {
    const att = await prisma.employeeAttendance.create({
      data
    });
    
    const emp = await prisma.employee.findUnique({ where: { id: data.employeeId }, include: { projects: true } });
    const empProjectId = emp?.projects?.[0]?.id || null;
    
    if (data.status.includes('Falta') && emp) {
      await notifyStakeholders(empProjectId, 
        'Registro de Falta', 
        `Colaborador ${emp.name} registrou: ${data.status}. Observação: ${data.observations || 'Nenhuma'}`, 
        data.status === 'Falta Injustificada' ? 'WARNING' : 'INFO'
      );
    }
    
    revalidatePath('/rh');
    return { success: true, attendance: att };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// OCORRÊNCIAS / ADVERTÊNCIAS
// ============================================================================

export async function addEmployeeOccurrence(data: {
  employeeId: string;
  type: string;
  date: Date;
  description: string;
  documentUrl?: string;
}) {
  try {
    const occ = await prisma.employeeOccurrence.create({
      data
    });
    
    const emp = await prisma.employee.findUnique({ where: { id: data.employeeId }, include: { projects: true } });
    const empProjectId = emp?.projects?.[0]?.id || null;
    if (emp) {
      const severity = data.type.includes('Advertência') || data.type.includes('Suspensão') ? 'ERROR' : 'INFO';
      await notifyStakeholders(empProjectId, 
        `Ocorrência: ${data.type}`, 
        `Registrado para ${emp.name}. Motivo: ${data.description.substring(0, 100)}...`, 
        severity
      );
    }
    
    revalidatePath('/rh');
    return { success: true, occurrence: occ };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// RECRUTAMENTO E SELEÇÃO (CANDIDATES)
// ============================================================================

export async function getCandidates() {
  try {
    const candidates = await prisma.candidate.findMany({
      include: { project: true },
      orderBy: { createdAt: 'desc' }
    });
    return candidates;
  } catch (error) {
    console.error("Erro ao buscar candidatos:", error);
    return [];
  }
}

export async function createCandidate(data: {
  name: string;
  email?: string;
  phone?: string;
  position: string;
  resumeUrl?: string;
  projectId?: number;
}) {
  try {
    const candidate = await prisma.candidate.create({
      data: {
        ...data,
        status: 'Triagem'
      }
    });
    revalidatePath('/rh');
    return { success: true, candidate };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCandidateStatus(id: string, status: string, feedback?: string) {
  try {
    const candidate = await prisma.candidate.update({
      where: { id },
      data: { status, feedback }
    });
    
    // If hired, we might notify someone
    if (status === 'Contratado') {
      await notifyStakeholders(candidate.projectId, 'Candidato Contratado', `O candidato ${candidate.name} para a vaga de ${candidate.position} foi contratado! Inicie o processo de admissão.`, 'SUCCESS');
    }
    
    revalidatePath('/rh');
    return { success: true, candidate };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

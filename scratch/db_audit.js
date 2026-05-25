const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  try {
    const empCount = await p.employee.count();
    const activeEmps = await p.employee.count({ where: { status: 'Ativo' } });
    const assets = await p.itAsset.count();
    const tickets = await p.itTicket.count();
    const licenses = await p.itLicense.count();
    const jobRoles = await p.jobRole.count();
    const companies = await p.company.count();
    const projects = await p.project.count();
    
    // RH Dashboard Stats
    const today = new Date();
    const episVencidos = await p.employeeEpi.count({
      where: { returned: false, replacementDate: { lt: today } }
    });
    const docsVencidos = await p.employeeDocument.count({
      where: { expirationDate: { lt: today } }
    });
    
    // TI Stats
    const assetsDisponivel = await p.itAsset.count({ where: { status: 'Disponível' } });
    const assetsEmUso = await p.itAsset.count({ where: { status: 'Em Uso' } });
    const ticketsAbertos = await p.itTicket.count({ where: { status: 'Aberto' } });
    const ticketsEmAndamento = await p.itTicket.count({ where: { status: 'Em Andamento' } });
    const ticketsFechados = await p.itTicket.count({ where: { status: 'Fechado' } });
    
    // Sample data
    const sampleEmployees = await p.employee.findMany({ take: 5, select: { name: true, status: true, cpf: true }, orderBy: { name: 'asc' } });
    const sampleAssets = await p.itAsset.findMany({ take: 5, include: { employee: { select: { name: true } } }, orderBy: { tag: 'asc' } });
    const sampleTickets = await p.itTicket.findMany({ take: 5, include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    const sampleLicenses = await p.itLicense.findMany({ take: 5, orderBy: { softwareName: 'asc' } });
    
    console.log("=== DATABASE AUDIT REPORT ===");
    console.log("\n--- GENTE E GESTÃO (RH) ---");
    console.log("Colaboradores Total:", empCount);
    console.log("Colaboradores Ativos:", activeEmps);
    console.log("Cargos Cadastrados:", jobRoles);
    console.log("Empresas Cadastradas:", companies);
    console.log("EPIs Vencidos:", episVencidos);
    console.log("Docs Vencidos:", docsVencidos);
    console.log("Projetos (para alocação):", projects);
    console.log("\nAmostra de Colaboradores:", JSON.stringify(sampleEmployees, null, 2));
    
    console.log("\n--- TECNOLOGIA DA INFORMAÇÃO (TI) ---");
    console.log("Ativos Total:", assets);
    console.log("  Disponíveis:", assetsDisponivel);
    console.log("  Em Uso:", assetsEmUso);
    console.log("Licenças:", licenses);
    console.log("Chamados Total:", tickets);
    console.log("  Abertos:", ticketsAbertos);
    console.log("  Em Andamento:", ticketsEmAndamento);
    console.log("  Fechados:", ticketsFechados);
    console.log("\nAmostra de Ativos:", JSON.stringify(sampleAssets, null, 2));
    console.log("\nAmostra de Chamados:", JSON.stringify(sampleTickets, null, 2));
    console.log("\nAmostra de Licenças:", JSON.stringify(sampleLicenses, null, 2));
    
  } catch (e) {
    console.error("ERRO:", e.message);
  } finally {
    await p.$disconnect();
  }
}

main();

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log("=== SEED & TESTE: RH e TI ===\n");
  
  // Buscar projeto existente para associação
  const project = await p.project.findFirst();
  if (!project) {
    console.error("ERRO: Nenhum projeto cadastrado. Cadastre um projeto antes.");
    return;
  }
  console.log("Projeto base:", project.name, "(ID:", project.id, ")");
  
  // Buscar um user para associar chamados
  const user = await p.user.findFirst();
  if (!user) {
    console.error("ERRO: Nenhum usuário cadastrado.");
    return;
  }
  console.log("Usuário base:", user.name, "(ID:", user.id, ")\n");
  
  // ============================================================
  // TESTE 1: RH — Criar Cargo (JobRole) se não existir o suficiente
  // ============================================================
  const existingRoles = await p.jobRole.count();
  if (existingRoles < 5) {
    const roles = ['Pedreiro', 'Mestre de Obras', 'Almoxarife', 'Servente', 'Téc. Segurança'];
    for (const name of roles) {
      const exists = await p.jobRole.findFirst({ where: { name } });
      if (!exists) {
        await p.jobRole.create({ data: { name } });
        console.log("[RH] Cargo criado:", name);
      }
    }
  }
  
  // ============================================================
  // TESTE 2: RH — Criar Empresa (Company)
  // ============================================================
  let company = await p.company.findFirst();
  if (!company) {
    company = await p.company.create({
      data: { name: "Way Service Engenharia" }
    });
    console.log("[RH] Empresa criada:", company.name);
  }
  
  // ============================================================
  // TESTE 3: RH — Criar Colaboradores de Teste
  // ============================================================
  const testEmployees = [
    { name: "Carlos Silva", cpf: "111.222.333-44", matricula: "EMP-002", baseSalary: 2800 },
    { name: "Maria Souza", cpf: "222.333.444-55", matricula: "EMP-003", baseSalary: 3500 },
    { name: "Pedro Oliveira", cpf: "333.444.555-66", matricula: "EMP-004", baseSalary: 2200 },
  ];
  
  const pedreiro = await p.jobRole.findFirst({ where: { name: "Pedreiro" } });
  const mestre = await p.jobRole.findFirst({ where: { name: "Mestre de Obras" } });
  const servente = await p.jobRole.findFirst({ where: { name: "Servente" } });
  const roleIds = [pedreiro?.id, mestre?.id, servente?.id];
  
  const createdEmps = [];
  for (let i = 0; i < testEmployees.length; i++) {
    const emp = testEmployees[i];
    const exists = await p.employee.findFirst({ where: { cpf: emp.cpf } });
    if (!exists) {
      const created = await p.employee.create({
        data: {
          ...emp,
          status: "Ativo",
          admissionDate: new Date(2024, 0, 15 + i * 30),
          jobRoleId: roleIds[i] || undefined,
          companyId: company.id,
          projectId: project.id,
        }
      });
      createdEmps.push(created);
      console.log("[RH] Colaborador criado:", created.name, "->", emp.matricula);
    } else {
      createdEmps.push(exists);
      console.log("[RH] Colaborador já existe:", emp.name);
    }
  }
  
  // ============================================================
  // TESTE 4: RH — Adicionar EPI para um colaborador
  // ============================================================
  const empForEpi = createdEmps[0];
  if (empForEpi) {
    const epiCount = await p.employeeEpi.count({ where: { employeeId: empForEpi.id } });
    if (epiCount === 0) {
      await p.employeeEpi.create({
        data: {
          employeeId: empForEpi.id,
          equipmentName: "Capacete de Segurança",
          caNumber: "CA-12345",
          deliveryDate: new Date(),
          replacementDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 dias
          returned: false
        }
      });
      await p.employeeEpi.create({
        data: {
          employeeId: empForEpi.id,
          equipmentName: "Bota de Segurança",
          caNumber: "CA-67890",
          deliveryDate: new Date(),
          replacementDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          returned: false
        }
      });
      console.log("[RH] EPIs cadastrados para:", empForEpi.name);
    }
  }
  
  // ============================================================
  // TESTE 5: RH — Adicionar Documento ASO
  // ============================================================
  const empForDoc = createdEmps[1];
  if (empForDoc) {
    const docCount = await p.employeeDocument.count({ where: { employeeId: empForDoc.id } });
    if (docCount === 0) {
      await p.employeeDocument.create({
        data: {
          employeeId: empForDoc.id,
          type: "ASO Admissional",
          status: "Válido",
          issueDate: new Date(),
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      await p.employeeDocument.create({
        data: {
          employeeId: empForDoc.id,
          type: "NR-35 (Altura)",
          status: "Válido",
          issueDate: new Date(),
          expirationDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000)
        }
      });
      console.log("[RH] Docs SST cadastrados para:", empForDoc.name);
    }
  }
  
  // ============================================================
  // TESTE 6: RH — Lançar Ponto/Falta
  // ============================================================
  const empForPonto = createdEmps[2];
  if (empForPonto) {
    const attCount = await p.employeeAttendance.count({ where: { employeeId: empForPonto.id } });
    if (attCount === 0) {
      await p.employeeAttendance.create({
        data: {
          employeeId: empForPonto.id,
          date: new Date(),
          status: "Presente",
          hoursWorked: 8,
          overtimeHours: 2,
          observations: "Trabalhou no 2o turno"
        }
      });
      await p.employeeAttendance.create({
        data: {
          employeeId: empForPonto.id,
          date: new Date(Date.now() - 86400000),
          status: "Falta Justificada",
          hoursWorked: 0,
          overtimeHours: 0,
          observations: "Atestado médico apresentado"
        }
      });
      console.log("[RH] Ponto/Faltas cadastrados para:", empForPonto.name);
    }
  }

  console.log("\n✅ MÓDULO RH: SEED COMPLETO\n");

  // ============================================================
  // TESTE 7: TI — Criar Ativos (Equipamentos)
  // ============================================================
  const assetCount = await p.itAsset.count();
  if (assetCount === 0) {
    const assets = [
      { tag: "LAP-001", category: "Notebook", brand: "Dell", model: "Latitude 3420", status: "Disponível" },
      { tag: "LAP-002", category: "Notebook", brand: "Lenovo", model: "ThinkPad E14", status: "Disponível" },
      { tag: "CEL-001", category: "Celular", brand: "Samsung", model: "Galaxy A54", status: "Disponível" },
      { tag: "TAB-001", category: "Tablet", brand: "Apple", model: "iPad 10", status: "Disponível" },
    ];
    for (const a of assets) {
      await p.itAsset.create({ data: a });
      console.log("[TI] Ativo criado:", a.tag, "-", a.brand, a.model);
    }
  }
  
  // ============================================================
  // TESTE 8: TI — Atribuir Ativo a Colaborador
  // ============================================================
  const laptop = await p.itAsset.findFirst({ where: { tag: "LAP-001" } });
  if (laptop && empForEpi && laptop.status === "Disponível") {
    await p.itAsset.update({
      where: { id: laptop.id },
      data: { employeeId: empForEpi.id, status: "Em Uso" }
    });
    console.log("[TI] Ativo LAP-001 atribuído para:", empForEpi.name);
  }
  
  // ============================================================
  // TESTE 9: TI — Criar Licenças de Software
  // ============================================================
  const licCount = await p.itLicense.count();
  if (licCount === 0) {
    const lics = [
      { softwareName: "Microsoft 365 Business", type: "Assinatura Anual", totalSeats: 15, usedSeats: 8, costPerSeat: 89.90 },
      { softwareName: "AutoCAD LT", type: "Licença Perpétua", totalSeats: 5, usedSeats: 3, costPerSeat: 450.00 },
      { softwareName: "ObraSys v2 PRO", type: "SaaS Mensal", totalSeats: 20, usedSeats: 12, costPerSeat: 59.90 },
    ];
    for (const lic of lics) {
      await p.itLicense.create({ data: lic });
      console.log("[TI] Licença criada:", lic.softwareName, `(${lic.usedSeats}/${lic.totalSeats})`);
    }
  }
  
  // ============================================================
  // TESTE 10: TI — Criar Chamados de Suporte
  // ============================================================
  const ticketCount = await p.itTicket.count();
  if (ticketCount === 0) {
    const tickets = [
      { title: "Notebook não liga", description: "O notebook LAP-002 não está ligando desde ontem. Botão power não responde.", priority: "Alta", status: "Aberto", userId: user.id, projectId: project.id },
      { title: "Acesso ao sistema ObraSys", description: "Novo colaborador precisa de login e senha para acessar o ObraSys.", priority: "Média", status: "Em Andamento", userId: user.id, projectId: project.id },
      { title: "Impressora travada", description: "Impressora do canteiro está travada com papel preso.", priority: "Baixa", status: "Fechado", userId: user.id },
    ];
    for (const t of tickets) {
      await p.itTicket.create({ data: t });
      console.log("[TI] Chamado criado:", t.title, `(${t.status})`);
    }
  }
  
  console.log("\n✅ MÓDULO TI: SEED COMPLETO\n");
  
  // ============================================================
  // VALIDAÇÃO FINAL
  // ============================================================
  console.log("=== VALIDAÇÃO FINAL ===");
  
  const finalEmpCount = await p.employee.count();
  const finalEpiCount = await p.employeeEpi.count();
  const finalDocCount = await p.employeeDocument.count();
  const finalAttCount = await p.employeeAttendance.count();
  const finalAssetCount = await p.itAsset.count();
  const finalLicCount = await p.itLicense.count();
  const finalTicketCount = await p.itTicket.count();
  const finalAssetsEmUso = await p.itAsset.count({ where: { status: 'Em Uso' } });
  
  const tests = [
    { name: "RH: Colaboradores cadastrados", expected: ">= 4", actual: finalEmpCount, pass: finalEmpCount >= 4 },
    { name: "RH: EPIs registrados", expected: ">= 2", actual: finalEpiCount, pass: finalEpiCount >= 2 },
    { name: "RH: Documentos SST", expected: ">= 2", actual: finalDocCount, pass: finalDocCount >= 2 },
    { name: "RH: Lançamentos de Ponto", expected: ">= 2", actual: finalAttCount, pass: finalAttCount >= 2 },
    { name: "TI: Ativos cadastrados", expected: ">= 4", actual: finalAssetCount, pass: finalAssetCount >= 4 },
    { name: "TI: Ativos em uso", expected: ">= 1", actual: finalAssetsEmUso, pass: finalAssetsEmUso >= 1 },
    { name: "TI: Licenças cadastradas", expected: ">= 3", actual: finalLicCount, pass: finalLicCount >= 3 },
    { name: "TI: Chamados cadastrados", expected: ">= 3", actual: finalTicketCount, pass: finalTicketCount >= 3 },
  ];
  
  let allPass = true;
  for (const test of tests) {
    const icon = test.pass ? "✅" : "❌";
    console.log(`${icon} ${test.name}: ${test.actual} (esperado: ${test.expected})`);
    if (!test.pass) allPass = false;
  }
  
  console.log("\n" + (allPass ? "🎉 TODOS OS TESTES PASSARAM!" : "⚠️ ALGUNS TESTES FALHARAM"));
}

main().catch(console.error).finally(() => p.$disconnect());

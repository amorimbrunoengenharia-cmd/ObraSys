
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  const sectors = ['Administração', 'Comercial/Varejo', 'Incorporação'];

  const dreCategories = [
    '1. Receita Operacional', 
    '2. Custo Direto - Materiais', 
    '3. Custo Direto - Mão de Obra', 
    '4. Custo Direto - Equipamentos/Logística', 
    '5. Despesa Administrativa', 
    '6. Despesa Comercial', 
    '7. Impostos sobre Serviço', 
    '8. Investimentos / CAPEX'
  ];

  const contacts = [
    'ADRIANO MARCELINO DA SILVA', 'ALUGUE MAQUINAS', 'ANTONIO PAULO POURA', 'ATEC', 
    'ATEC - PLANEJAMENTO CONTABIL LTDA', 'AUTO POSTO COLINA', 'AUTO POSTO ECOS LTDA', 
    'BANCO SICRED', 'BRUNO AMORIM', 'CASA DA SOGRA', 'CASA DOS PARAFUSOS', 'CEF MATRIZ', 
    'CONLICITAÇÕES', 'CREA SP', 'DANILO MACLAUDE SANTOS', 'DELVIO DE FREITAS PAGAN', 
    'DEZAINY', 'ECOVIAS NOROESTE PAULISTA', 'ENTREVIAS', 'EPI.COM', 'FIATCAR', 
    'GOLDEN SEGURANÇA SOLUÇÃO OCUPACIONAL', 'GOOGLE', 'GOVERNO FEDERAL BRAZILEIRO', 
    'Hotelaria Accor Brasil S/A Ibis Ribeirao Preto', 'INVESTIMENTO', 'JOSÉ SERGIO', 
    'LUCIANA ARAUJO', 'MANOEL MESSIAS RIBEIRO DE ASSIS', 'MARCIO BENITEZ', 
    'MARIA LÚCIA ANDRADE', 'MARTI FOODS LTDA', 'MATEUS', 'MINAS DE OURO', 'MOVIDA', 
    'MUFFATO', 'ONLINE VEICULOS LTDA', 'ORIGINAL COMUNICAÇÃO', 'PORTO SEGURO', 
    'POSTO MANHATTAN', 'POSTO MONACO BONFIN', 'POSTO RODO MASTER', 'PRAÇA OLIMPICA', 
    'SABOR DA ROÇA', 'SEFA PR GRP', 'SEG WORK\'S ENGENHARIA', 'SUPER VAREJAO RIBEIRAO LTDA', 
    'TARRAF', 'TW TERRAPLANAGEM E CONCRETO LISO LTDA', 'TW TERRAPLANAGEM E CONCRETO LTDA', 
    'VIARONDON CONCESSIONARIA DE RODOVIA S/A', 'VVR - IBIS RIBEIRAO SHOPPING', 
    'WILLIAM PEREIRA COSTA BRITO'
  ];

  console.log("Seeding Sectors...");
  for (const name of sectors) {
    await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding DRE Categories...");
  for (const name of dreCategories) {
    await prisma.financialCategory.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  console.log("Seeding Contacts...");
  for (const name of contacts) {
    await prisma.contact.upsert({
      where: { name },
      update: {},
      create: { name, type: 'Fornecedor' }
    });
  }

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});

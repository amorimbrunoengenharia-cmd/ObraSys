
export const MOCK_FILES = [
  { id: 1, name: "ARQ-EXE-01 - Planta Térreo.pdf", folder: "Arquitetura", rev: "R03", data: "20/11", type: "pdf", status: "Execução", autor: "Arq. Ana", size: "2.4 MB" },
  { id: 2, name: "EST-FOR-02 - Armação Vigas.dwg", folder: "Estrutural", rev: "R01", data: "15/11", type: "cad", status: "Execução", autor: "Eng. Civil", size: "5.0 MB" },
  { id: 3, name: "HID-3D-01 - Casa de Bombas.rvt", folder: "Hidráulica", rev: "R00", data: "18/11", type: "bim", status: "Em Análise", autor: "Proj. Hidro", size: "45 MB" },
  { id: 4, name: "ELE-FIA-05 - Diagrama Unifilar.pdf", folder: "Elétrica", rev: "R02", data: "10/11", type: "pdf", status: "Liberado", autor: "Eng. Elétrica", size: "0.9 MB" }
];

export const MOCK_LMS = [
  { 
      id: 101, codigo: "LM-HID-01", disciplina: "Hidráulica", titulo: "Tubulação Água Fria Térreo", data: "21/11/2025", status: "Em Edição", 
      itens: [
          { item: "Tubo PVC Soldável 25mm", qtd: 30, unid: "Barras", orcamento: 35, status: "ok" },
          { item: "Joelho 90º 25mm", qtd: 50, unid: "Un", orcamento: 40, status: "ok" },
          { item: "Registro Gaveta 3/4", qtd: 12, unid: "Un", orcamento: 5, status: "alerta" }
      ]
  },
  {
      id: 102, codigo: "LM-ELE-03", disciplina: "Elétrica", titulo: "Infraestrutura Laje 1", data: "20/11/2025", status: "Enviado Suprimentos",
      itens: [ { item: "Eletroduto Corrugado 3/4", qtd: 200, unid: "m", orcamento: 200, status: "ok" } ]
  }
];

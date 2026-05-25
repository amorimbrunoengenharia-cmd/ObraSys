
export const MOCK_FVS = [
  { id: 1, servico: "Concretagem Laje L2", local: "Torre A - Pav 2", responsavel: "Mestre Carlos", status: "Aprovado", data: "20/11", itens: [{ item: "Verificação das formas", status: "ok" }, { item: "Conferência da armadura", status: "ok" }, { item: "Limpeza", status: "ok" }] },
  { id: 2, servico: "Alvenaria de Vedação", local: "Torre A - Pav 3", responsavel: "Empreiteira Silva", status: "Reprovado", data: "19/11", itens: [{ item: "Locação (Eixos)", status: "ok" }, { item: "Prumo e Nível", status: "nok" }] }
];

export const MOCK_RNCS = [
  { id: 1, titulo: "Parede fora de prumo", local: "Torre A - Pav 3", gravidade: "Alta", status: "Aberto", causa: "Falha de execução", acao: "Demolir e refazer", custo: 1500 },
  { id: 2, titulo: "Infiltração na janela", local: "Térreo - Sala", gravidade: "Média", status: "Em Correção", causa: "Falha na vedação", acao: "Aplicar PU", custo: 200 }
];

export const MOCK_SAFETY = [
  { id: 1, nome: "João da Silva", cargo: "Pedreiro", aso: "Vigente", nr35: "Vigente", epi_pendente: false },
  { id: 2, nome: "Pedro Santos", cargo: "Servente", aso: "Vencido", nr35: "N/A", epi_pendente: true },
  { id: 3, nome: "Carlos Souza", cargo: "Mestre", aso: "Vigente", nr35: "Vigente", epi_pendente: false }
];

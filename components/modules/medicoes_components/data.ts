
export const INITIAL_CONTRACTS = [
  { 
      id: 101, empresa: "Pinturas Silva Ltda", servico: "Pintura Torre A", valorTotal: 160000, medido: 45000, saldo: 115000, status: "Ativo",
      itens: [
          { id: 1, desc: "Pintura Latex Acrílica", unit: "m²", qtd: 5000, unitario: 25, total: 125000, medido: 1500, qtdAtual: 0 },
          { id: 2, desc: "Textura Projetada", unit: "m²", qtd: 500, unitario: 50, total: 25000, medido: 150, qtdAtual: 0 }
      ],
      docs: [{ id: 1, nome: "Contrato.pdf", date: "01/10", type: "PDF" }]
  },
  { id: 102, empresa: "Instaladora Rayo", servico: "Elétrica Geral", valorTotal: 80000, medido: 80000, saldo: 0, status: "Concluído", itens: [], docs: [] },
  { id: 103, empresa: "Gesso & Arte", servico: "Forros e Sancas", valorTotal: 65000, medido: 12000, saldo: 53000, status: "Ativo", itens: [], docs: [] },
  { id: 104, empresa: "HidroMax Soluções", servico: "Tubulação Água", valorTotal: 45000, medido: 0, saldo: 45000, status: "Pendente", itens: [], docs: [] },
  { id: 105, empresa: "Terraplanagem Forte", servico: "Escavação", valorTotal: 120000, medido: 100000, saldo: 20000, status: "Ativo", itens: [], docs: [] },
  { id: 106, empresa: "Serralheria do Zé", servico: "Gradil e Portões", valorTotal: 30000, medido: 0, saldo: 30000, status: "Pendente", itens: [], docs: [] }
];

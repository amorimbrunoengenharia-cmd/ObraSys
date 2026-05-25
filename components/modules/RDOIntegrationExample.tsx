// Exemplo de integração do RDOForm no módulo RDO

import RDOForm from './RDOForm';

export default function RDOIntegration() {
  return (
    <div className="space-y-6">
      {/* Header com título e botão para novo RDO */}
      <div className="bg-white dark:bg-[#162032] p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Relatórios Diários de Obra</h1>
          
          {/* Botão para abrir formulário */}
          <RDOForm />
        </div>
        
        <p className="text-slate-600 dark:text-slate-400">
          Crie relatórios diários estruturados e salve-os automaticamente no Obsidian.
        </p>
      </div>

      {/* Dicas de uso */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">💡 Como usar</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>✓ Clique em "Novo RDO" para abrir o formulário</li>
          <li>✓ Preencha data, efetivo, equipamentos, atividades e ocorrências</li>
          <li>✓ Clique em "Gerar RDO" para salvar no Obsidian</li>
          <li>✓ Arquivo será criado em: ObraSys/Projetos/RDOs/RDO-YYYY-MM-DD.md</li>
        </ul>
      </div>
    </div>
  );
}

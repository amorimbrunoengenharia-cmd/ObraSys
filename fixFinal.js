const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `   const handleLoadRevisions = async () => {
      setIsLoadingRevisions(true);
      const res = await getRevisions(selectedEstimate.id);
      if (res.success) {
         setRevisions(res.revisions || []);
      } else {
         alert('Erro ao carregar revisão: ' + (res.error || 'Erro Desconhecido'));
      }
      setIsLoadingRevisions(false);
   };

   const handleCreateRevision = async () => {
      if (!newRevisionName) return;
      setIsLoadingRevisions(true);
      const res = await createRevision(selectedEstimate.id, newRevisionName);
      if (res.success) {
         setNewRevisionName('');
         handleLoadRevisions();
      } else {
         alert('Erro ao criar revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   const handleRestoreRevision = async (revId: string) => {
      if (!confirm('ATENÇÃO: Restaurar esta revisão apagará todas as modificações não salvas do orçamento atual. Deseja continuar?')) return;
      
      setIsLoadingRevisions(true);
      const res = await restoreRevision(revId);
      if (res.success) {
         alert('Revisão restaurada com sucesso!');
         window.location.reload();
      } else {
         alert('Erro ao restaurar revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   const handleDeleteRevision = async (revId: string) => {
      if (!confirm('Deseja realmente excluir esta versão do histórico?')) return;
      
      setIsLoadingRevisions(true);
      const res = await deleteRevision(revId);
      if (res.success) {
         setRevisions(revisions.filter((r: any) => r.id !== revId));
         setIsLoadingRevisions(false);
      } else {
         alert('Erro ao excluir revisão: ' + res.error);
         setIsLoadingRevisions(false);
      }
   };

   if (view === 'editor' && selectedEstimate) {
    const consolidated = getConsolidatedResources();
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex flex-col">
        {/* Editor Header */}
        <style dangerouslySetInnerHTML={{ __html: \`
          @media print {
            .no-print { display: none !important; }
            aside { display: none !important; }
            header { display: none !important; }
            .print-only { display: block !important; }
            body { background: white !important; color: black !important; }
            .bg-slate-50 { background: white !important; }`;

const match = content.match(/const handleLoadRevisions = async \(\) => \{\r?\n\s*setIsLoadingRevisions\(true\);\r?\n\s*const res = await getRevisions\(selectedEstimate\.id\);\r?\n\s*\.bg-slate-50 \{ background: white !important; \}/);

if (match) {
    content = content.substring(0, match.index) + injection + content.substring(match.index + match[0].length);
    fs.writeFileSync(file, content);
    console.log('Fixed EVERYTHING');
} else {
    console.log('Regex missed');
}

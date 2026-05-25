const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const injection = `

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
          @media print {`;

const anchor = '      setIsLoadingRevisions(false);\r\n   };';
const idx = content.indexOf(anchor);
if (idx !== -1) {
    const endIdx = content.indexOf('            .no-print { display: none !important; }', idx);
    const textBefore = content.substring(0, idx + anchor.length);
    const textAfter = content.substring(endIdx);
    fs.writeFileSync(file, textBefore + injection + '\n' + textAfter);
    console.log('Recovery 4 successful');
} else {
    const anchorLF = '      setIsLoadingRevisions(false);\n   };';
    const idx2 = content.indexOf(anchorLF);
    if (idx2 !== -1) {
        const endIdx = content.indexOf('            .no-print { display: none !important; }', idx2);
        const textBefore = content.substring(0, idx2 + anchorLF.length);
        const textAfter = content.substring(endIdx);
        fs.writeFileSync(file, textBefore + injection + '\n' + textAfter);
        console.log('Recovery 4 successful (LF)');
    } else {
        console.log('Anchor not found');
    }
}

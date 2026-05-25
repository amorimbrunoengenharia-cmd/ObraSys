const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const brokenText = `      const res = await createRevision(selectedEstimate.id, newRevisionName);
    return (
      <div className="min-h-screen`;

const fixText = `      const res = await createRevision(selectedEstimate.id, newRevisionName);
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
      <div className="min-h-screen`;

content = content.replace(brokenText, fixText);
fs.writeFileSync(file, content);
console.log('Fixed handlers');

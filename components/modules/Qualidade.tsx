"use client";
import React, { useState } from 'react';
import QualityDashboard from './quality/QualityDashboard';
import InspectionForm from './quality/InspectionForm';
import RNCManager from './quality/RNCManager';
import SafetyControl from './quality/SafetyControl';
import { exportQualidadeToObsidian } from '../../app/actions/obsidian';
import { getQualityData } from '../../app/actions/quality';
import { BookOpen, RefreshCw } from 'lucide-react';

export default function Qualidade({ proj }: any) {
  const [view, setView] = useState('dashboard'); // dashboard | fvs | rnc | safety
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const fvsList = proj?.qualityFvs || [];
  const rncList = proj?.qualityRncs || [];
  const [safetyList, setSafetyList] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (proj?.id) {
      getQualityData(proj.id).then((res) => {
        if (res.success) {
          setSafetyList(res.safeties || []);
        }
      });
    }
  }, [proj?.id]);
  
  const stats = {
      fvs: fvsList.length,
      rnc: rncList.filter((r:any) => r.status !== 'Fechado').length,
      safety: safetyList.filter((s:any) => s.aso === 'Vencido').length > 0 ? 'Alerta' : 'OK'
  };

  const handleObsidianSync = async () => {
    setIsSyncing(true); setSyncDone(false);
    await exportQualidadeToObsidian();
    setIsSyncing(false); setSyncDone(true);
    setTimeout(() => setSyncDone(false), 3000);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B1121]">
        {/* Header com botão Obsidian (só mostra no dashboard pra ficar organizado) */}
        {view === 'dashboard' && (
            <div className="flex justify-end p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#162032]">
                <button onClick={handleObsidianSync} disabled={isSyncing} className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg transition-all">
                    {isSyncing ? <RefreshCw size={12} className="animate-spin" /> : <BookOpen size={12} />}
                    {isSyncing ? 'Exportando...' : syncDone ? '✅ Exportado!' : '📓 Exportar Obsidian'}
                </button>
            </div>
        )}

        <div className="flex-1 overflow-y-auto">
            {view === 'dashboard' && <QualityDashboard onNavigate={setView} stats={stats} />}
            {view === 'fvs' && <InspectionForm fvsList={fvsList} projectId={proj.id} onBack={() => setView('dashboard')} />}
            {view === 'rnc' && <RNCManager rncList={rncList} projectId={proj.id} onBack={() => setView('dashboard')} />}
            {view === 'safety' && <SafetyControl safetyList={safetyList} projectId={proj.id} onBack={() => setView('dashboard')} />}
        </div>
    </div>
  );
}

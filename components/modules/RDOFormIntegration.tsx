"use client";
import React, { useState } from 'react';
import { Save, AlertCircle, CheckCircle, Loader, X } from 'lucide-react';

interface RDOData {
  data: string;
  fase: string;
  clima: {
    manha: string;
    tarde: string;
    noite: string;
  };
  mo_direta: Array<{ cargo: string; qtd: number }>;
  mo_indireta: Array<{ cargo: string; qtd: number }>;
  equipamentos: Array<{ nome: string; qtd: number }>;
  veiculos: Array<{ nome: string; qtd: number }>;
}

interface Props {
  selectedRdo: RDOData;
  onClose: () => void;
}

export default function RDOFormIntegration({ selectedRdo, onClose }: Props) {
  const [atividades, setAtividades] = useState<string[]>(['']);
  const [ocorrencias, setOcorrencias] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddAtividade = () => {
    setAtividades([...atividades, '']);
  };

  const handleRemoveAtividade = (index: number) => {
    setAtividades(atividades.filter((_, i) => i !== index));
  };

  const handleAtividadeChange = (index: number, value: string) => {
    const newAtividades = [...atividades];
    newAtividades[index] = value;
    setAtividades(newAtividades);
  };

  const calcularEfetivo = () => {
    const modireta = (selectedRdo.mo_direta || []).reduce((sum, m) => sum + (m.qtd || 0), 0);
    const moindireta = (selectedRdo.mo_indireta || []).reduce((sum, m) => sum + (m.qtd || 0), 0);
    return { modireta, moindireta, total: modireta + moindireta };
  };

  const handleGenerateRDO = async () => {
    // Validações
    const atividadesFiltradas = atividades.filter(a => a.trim());
    if (atividadesFiltradas.length === 0) {
      setMessage({ type: 'error', text: 'Adicione pelo menos uma atividade' });
      return;
    }

    if (!ocorrencias.trim() && atividades.filter(a => a.trim()).length === 0) {
      setMessage({ type: 'error', text: 'Preencha atividades ou ocorrências' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const efetivo = calcularEfetivo();
      const equipamentosFiltrados = (selectedRdo.equipamentos || []).filter(e => e.qtd > 0);
      const veiculosFiltrados = (selectedRdo.veiculos || []).filter(e => e.qtd > 0);
      const todoEquipamento = [...equipamentosFiltrados, ...veiculosFiltrados];

      const payload = {
        data: selectedRdo.data,
        efetivo: {
          mo_direta: selectedRdo.mo_direta,
          mo_indireta: selectedRdo.mo_indireta,
          clima: selectedRdo.clima,
          fase: selectedRdo.fase,
        },
        equipamentos: todoEquipamento,
        atividades: atividadesFiltradas,
        ocorrencias: ocorrencias.trim() || 'Nenhuma ocorrência registrada',
        rdoId: Date.now(),
      };

      const response = await fetch('/api/rdo/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao gerar RDO');
      }

      const result = await response.json();
      setMessage({
        type: 'success',
        text: `✅ RDO salvo com sucesso! Arquivo: ${result.arquivo}`,
      });

      // Limpar formulário após sucesso
      setTimeout(() => {
        setAtividades(['']);
        setOcorrencias('');
        setMessage(null);
        onClose();
      }, 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const efetivo = calcularEfetivo();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#162032] rounded-xl shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-bold">Finalizar RDO</h2>
            <p className="text-blue-100 text-sm mt-1">Data: {selectedRdo.data}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Resumo de Efetivo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
              <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase">MO Direta</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-2">{efetivo.modireta}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">MO Indireta</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-2">{efetivo.moindireta}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Total</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">{efetivo.total}</p>
            </div>
          </div>

          {/* Atividades */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              📋 Atividades Realizadas *
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {atividades.map((atividade, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={atividade}
                    onChange={(e) => handleAtividadeChange(idx, e.target.value)}
                    placeholder={`Atividade ${idx + 1}...`}
                    className="flex-1 p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0B1121] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {atividades.length > 1 && (
                    <button
                      onClick={() => handleRemoveAtividade(idx)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={handleAddAtividade}
              className="text-sm px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              + Adicionar Atividade
            </button>
          </div>

          {/* Ocorrências */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              ⚠️ Ocorrências e Observações
            </label>
            <textarea
              value={ocorrencias}
              onChange={(e) => setOcorrencias(e.target.value)}
              placeholder="Descreva qualquer ocorrência, problema ou observação importante..."
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-[#0B1121] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            />
          </div>

          {/* Clima - Resumo */}
          <div className="bg-slate-50 dark:bg-[#0B1121] rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-3">
              🌤️ Condições Climáticas
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Manhã:</span>
                <span className="capitalize font-semibold text-amber-600">{selectedRdo.clima.manha}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tarde:</span>
                <span className="capitalize font-semibold text-amber-600">{selectedRdo.clima.tarde}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Noite:</span>
                <span className="capitalize font-semibold text-slate-600">{selectedRdo.clima.noite}</span>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          {message && (
            <div
              className={`flex gap-3 p-4 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
              ) : (
                <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
              )}
              <p
                className={
                  message.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerateRDO}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Gerar RDO em Markdown
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

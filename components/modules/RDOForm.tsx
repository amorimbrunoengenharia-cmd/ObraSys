"use client";
import React, { useState, useRef } from 'react';
import { Plus, Trash2, Save, X, AlertCircle, CheckCircle, Loader, Calendar, Users, Hammer, Sun, CloudRain, Cloud, Camera, Upload, Image as ImageIcon } from 'lucide-react';

interface Efetivo {
  cargo: string;
  quantidade: number;
}

interface Equipamento {
  tipo: string;
  quantidade: number;
}

interface Atividade {
  descricao: string;
  percentual?: number;
}

interface Ocorrencia {
  tipo: string;
  descricao: string;
}

interface Photo {
  id: string;
  file: File;
  preview: string;
}

export default function RDOForm() {
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    clima: { manha: 'sol', tarde: 'sol', noite: 'nublado' },
    efetivo: [] as Efetivo[],
    equipamentos: [] as Equipamento[],
    atividades: [] as Atividade[],
    ocorrencias: [] as Ocorrencia[]
  });

  const [photos, setPhotos] = useState<Photo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);

    const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      // Busca clima da nossa nova API
      const response = await fetch(`/api/weather?date=${formData.data}&city=Sao Paulo`);
      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        clima: { 
          manha: data.manha || 'sol', 
          tarde: data.tarde || 'sol', 
          noite: data.noite || 'nublado' 
        }
      }));
      
      if (data.info) {
        console.log("Aviso:", data.info);
      }
    } catch (error) {
      console.error("Erro ao buscar clima", error);
      alert("Não foi possível obter o clima automaticamente. Verifique a conexão ou a chave da API.");
    } finally {
      setWeatherLoading(false);
    }
  };


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newPhotos = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: URL.createObjectURL(file)
      }));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const filtered = prev.filter(p => p.id !== id);
      // Revoke preview URL to avoid memory leaks
      const removed = prev.find(p => p.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const handleAddEfetivo = () => {

    setFormData(prev => ({
      ...prev,
      efetivo: [...prev.efetivo, { cargo: '', quantidade: 0 }]
    }));
  };

  const handleRemoveEfetivo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      efetivo: prev.efetivo.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateEfetivo = (index: number, field: keyof Efetivo, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      efetivo: prev.efetivo.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAddEquipamento = () => {
    setFormData(prev => ({
      ...prev,
      equipamentos: [...prev.equipamentos, { tipo: '', quantidade: 0 }]
    }));
  };

  const handleRemoveEquipamento = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipamentos: prev.equipamentos.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateEquipamento = (index: number, field: keyof Equipamento, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      equipamentos: prev.equipamentos.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAddAtividade = () => {
    setFormData(prev => ({
      ...prev,
      atividades: [...prev.atividades, { descricao: '', percentual: 0 }]
    }));
  };

  const handleRemoveAtividade = (index: number) => {
    setFormData(prev => ({
      ...prev,
      atividades: prev.atividades.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateAtividade = (index: number, field: keyof Atividade, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      atividades: prev.atividades.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleAddOcorrencia = () => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: [...prev.ocorrencias, { tipo: '', descricao: '' }]
    }));
  };

  const handleRemoveOcorrencia = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateOcorrencia = (index: number, field: keyof Ocorrencia, value: string) => {
    setFormData(prev => ({
      ...prev,
      ocorrencias: prev.ocorrencias.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

    const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Usar FormData para enviar arquivos
      const submitData = new FormData();
      submitData.append('data', formData.data);
      submitData.append('clima', JSON.stringify(formData.clima));
      submitData.append('efetivo', JSON.stringify(formData.efetivo));
      submitData.append('equipamentos', JSON.stringify(formData.equipamentos));
      submitData.append('atividades', JSON.stringify(formData.atividades));
      submitData.append('ocorrencias', JSON.stringify(formData.ocorrencias));
      
      // Anexar fotos
      photos.forEach((photo, index) => {
        submitData.append(`photo_${index}`, photo.file);
      });

      const response = await fetch('/api/rdo/create', {
        method: 'POST',
        body: submitData // Não enviamos Content-Type header para o browser definir o boundary do FormData
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `✅ RDO criado com sucesso! Arquivo: ${result.arquivo}`
        });
        
        // Reset form
        setFormData({
          data: new Date().toISOString().split('T')[0],
          clima: { manha: 'sol', tarde: 'sol', noite: 'nublado' },
          efetivo: [],
          equipamentos: [],
          atividades: [],
          ocorrencias: []
        });
        setPhotos([]);
        
        setTimeout(() => setShowForm(false), 2000);
      } else {
        setMessage({
          type: 'error',
          text: `❌ Erro: ${result.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      });
    } finally {
      setLoading(false);
    }
  };


  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all"
      >
        <Plus size={20} /> Novo RDO
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white dark:bg-[#162032] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#162032] border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Novo Relatório Diário de Obra</h2>
          <button
            onClick={() => setShowForm(false)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Fechar formulário"
            aria-label="Fechar formulário"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
              <span>{message.text}</span>
            </div>
          )}

                    {/* Data e Clima */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="data-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Calendar size={16} /> Data
              </label>
              <input
                id="data-input"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sun size={16} /> Clima
                </label>
                <button 
                  type="button" 
                  onClick={fetchWeather}
                  disabled={weatherLoading}
                  title="Obter clima automaticamente via API"
                  className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex gap-1 items-center"
                >
                  {weatherLoading ? <Loader size={10} className="animate-spin" /> : <Sun size={10} />} Auto-fill
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['manha', 'tarde', 'noite'] as const).map((periodo) => (
                  <select
                    key={periodo}
                    value={formData.clima[periodo]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      clima: { ...prev.clima, [periodo]: e.target.value }
                    }))}
                    className="text-xs p-2 bg-slate-50 dark:bg-[#0B1121] border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                  >
                    <option value="sol">Sol</option>
                    <option value="nublado">Nublado</option>
                    <option value="chuva">Chuva</option>
                  </select>
                ))}
              </div>
            </div>
          </div>

          {/* Fotos Section */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0B1121] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Camera size={16} /> Registro Fotográfico
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Fazer upload de fotos da obra"
                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-2 text-xs font-bold"
              >
                <Upload size={16} /> Upload
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                multiple 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            
            {photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative aspect-square group">
                    <img src={photo.preview} alt="Preview" className="w-full h-full object-cover rounded-lg border dark:border-slate-700" />
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-6 text-center">
                <ImageIcon className="mx-auto text-slate-300 mb-2" size={32} />
                <p className="text-xs text-slate-500 font-medium">Nenhuma foto anexada. Clique em upload ou arraste aqui.</p>
              </div>
            )}
          </div>


          {/* Efetivo */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0B1121] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users size={16} /> Efetivo
              </label>
              <button
                type="button"
                onClick={handleAddEfetivo}
                title="Adicionar Novo Cargo ao Efetivo"
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                aria-label="Adicionar efetivo"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.efetivo.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Cargo (ex: Pedreiro)"
                    value={item.cargo}
                    onChange={(e) => handleUpdateEfetivo(index, 'cargo', e.target.value)}
                    aria-label={`Cargo do efetivo ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={item.quantidade}
                    onChange={(e) => handleUpdateEfetivo(index, 'quantidade', parseInt(e.target.value) || 0)}
                    aria-label={`Quantidade do efetivo ${index + 1}`}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEfetivo(index)}
                    title="Remover este item do efetivo"
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remover efetivo"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Equipamentos */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0B1121] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Hammer size={16} /> Equipamentos
              </label>
              <button
                type="button"
                onClick={handleAddEquipamento}
                title="Adicionar Novo Equipamento"
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                aria-label="Adicionar equipamento"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.equipamentos.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Tipo (ex: Betoneira)"
                    value={item.tipo}
                    onChange={(e) => handleUpdateEquipamento(index, 'tipo', e.target.value)}
                    aria-label={`Tipo de equipamento ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qtd"
                    value={item.quantidade}
                    onChange={(e) => handleUpdateEquipamento(index, 'quantidade', parseInt(e.target.value) || 0)}
                    aria-label={`Quantidade de equipamentos ${index + 1}`}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveEquipamento(index)}
                    title="Remover este equipamento"
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remover equipamento"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Atividades */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0B1121] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">Atividades Realizadas</label>
              <button
                type="button"
                onClick={handleAddAtividade}
                title="Adicionar Nova Atividade"
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                aria-label="Adicionar atividade"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.atividades.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <input
                    type="text"
                    placeholder="Descrição da atividade"
                    value={item.descricao}
                    onChange={(e) => handleUpdateAtividade(index, 'descricao', e.target.value)}
                    aria-label={`Descrição da atividade ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    placeholder="%"
                    value={item.percentual}
                    onChange={(e) => handleUpdateAtividade(index, 'percentual', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    aria-label={`Percentual concluído da atividade ${index + 1}`}
                    className="w-20 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                    min="0"
                    max="100"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAtividade(index)}
                    title="Remover esta atividade"
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remover atividade"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ocorrências */}
          <div className="space-y-3 bg-slate-50 dark:bg-[#0B1121] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 dark:text-slate-300">Ocorrências e Pontos de Atenção</label>
              <button
                type="button"
                onClick={handleAddOcorrencia}
                title="Registrar Nova Ocorrência"
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                aria-label="Adicionar ocorrência"
              >
                <Plus size={16} />
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.ocorrencias.map((item, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <select
                    value={item.tipo}
                    onChange={(e) => handleUpdateOcorrencia(index, 'tipo', e.target.value)}
                    className="w-32 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                    aria-label="Tipo de ocorrência"
                  >
                    <option value="">Tipo</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Atraso">Atraso</option>
                    <option value="Problema Material">Problema Material</option>
                    <option value="Clima">Clima</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Descrição"
                    value={item.descricao}
                    onChange={(e) => handleUpdateOcorrencia(index, 'descricao', e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:border-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveOcorrencia(index)}
                    title="Remover esta ocorrência"
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    aria-label="Remover ocorrência"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
              {loading ? 'Salvando...' : 'Gerar RDO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

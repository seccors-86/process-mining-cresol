import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Palette, Database, Variable, Edit2, Trash2, Check, X } from 'lucide-react';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; // Trigger to refresh app-level lists
}

export const DataModal: React.FC<DataModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'systems' | 'variables'>('areas');
  
  // Data states
  const [areas, setAreas] = useState<any[]>([]);
  const [systems, setSystems] = useState<any[]>([]);
  const [variables, setVariables] = useState<any[]>([]);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#f8fafc');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [resAreas, resSys, resVars] = await Promise.all([
        fetch('http://localhost:8000/api/areas'),
        fetch('http://localhost:8000/api/systems'),
        fetch('http://localhost:8000/api/variables')
      ]);
      if (resAreas.ok) setAreas(await resAreas.json());
      if (resSys.ok) setSystems(await resSys.json());
      if (resVars.ok) setVariables(await resVars.json());
    } catch (e) {
      console.error('Erro ao carregar cadastros:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      cancelEdit();
    }
  }, [isOpen, activeTab]);

  const cancelEdit = () => {
    setEditingId(null);
    setNewName('');
    setNewColor('#f8fafc');
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNewName(item.name);
    if (activeTab === 'areas' && item.color) {
      setNewColor(item.color);
    }
  };

  const handleDelete = async (item: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir '${item.name}'?`)) return;
    
    let endpoint = activeTab === 'areas' ? 'areas' : activeTab === 'systems' ? 'systems' : 'variables';
    try {
      const res = await fetch(`http://localhost:8000/api/${endpoint}/${item.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
        onUpdate();
        if (editingId === item.id) cancelEdit();
      } else {
        const err = await res.json();
        alert(err.detail || "Erro ao excluir.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSubmitting(true);
    
    let endpoint = '';
    let body: any = { name: newName };

    if (activeTab === 'areas') {
      endpoint = 'areas';
      body.color = newColor;
    } else if (activeTab === 'systems') {
      endpoint = 'systems';
    } else {
      endpoint = 'variables';
    }

    const method = editingId ? 'PUT' : 'POST';
    const url = `http://localhost:8000/api/${endpoint}${editingId ? `/${editingId}` : ''}`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        cancelEdit();
        fetchData();
        onUpdate();
      } else {
        const err = await res.json();
        alert(err.detail || "Erro ao salvar.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-slate-800">Gerenciar Cadastros</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-lg gap-1">
          <button
            onClick={() => setActiveTab('areas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'areas' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Palette size={14} /> Áreas/Piscinas
          </button>
          <button
            onClick={() => setActiveTab('systems')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'systems' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database size={14} /> Sistemas
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'variables' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Variable size={14} /> Variáveis
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Nome do {activeTab === 'areas' ? 'Departamento / Cargo' : activeTab === 'systems' ? 'Sistema / Ferramenta' : 'Documento / Variável'}
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`Ex: ${activeTab === 'areas' ? 'Backoffice' : activeTab === 'systems' ? 'SAP ERP' : 'CPF, Proposta'}`}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
              required
            />
          </div>

          {activeTab === 'areas' && (
            <div className="space-y-1">
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Cor de Fundo da Piscina</label>
              <div className="flex gap-2">
                {['#f8fafc', '#eff6ff', '#f0fdf4', '#fdf2f8', '#fefce8', '#f3e8ff', '#ffe4e6', '#e0f2fe'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${newColor === c ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-200 hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
              >
                <X size={14} /> Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-sm transition-all"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : editingId ? <Check size={14} /> : <Plus size={14} />}
              {editingId ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>

        {/* List of current items */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Cadastrados
          </span>
          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2">
            {(activeTab === 'areas' ? areas : activeTab === 'systems' ? systems : variables).map((a) => (
              <div key={a.id} className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${editingId === a.id ? 'bg-blue-50/50 border-blue-200 text-blue-800 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  {activeTab === 'areas' && (
                    <div className="w-3 h-3 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: a.color || '#f8fafc' }} />
                  )}
                  {a.name}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => handleEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                    <Edit2 size={12} />
                  </button>
                  <button type="button" onClick={() => handleDelete(a)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Excluir">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

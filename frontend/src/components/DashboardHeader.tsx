import React, { useState, useEffect } from 'react';
import { Save, FileDown, Plus, Sparkles, FolderOpen, ListPlus, Loader2 } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  savedDiagrams: any[];
  selectedDiagramId: number | null;
  onLoadDiagram: (id: number) => void;
  onNewDiagram: () => void;
  onSave: () => void;
  onExportWord: () => void;
  isSaving: boolean;
  isExporting: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  onTitleChange,
  savedDiagrams,
  selectedDiagramId,
  onLoadDiagram,
  onNewDiagram,
  onSave,
  onExportWord,
  isSaving,
  isExporting
}) => {
  const [newAreaName, setNewAreaName] = useState('');
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [isRegisteringArea, setIsRegisteringArea] = useState(false);
  const [registeredAreas, setRegisteredAreas] = useState<any[]>([]);

  // Fetch registered functional areas
  const fetchAreas = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/areas');
      if (res.ok) {
        const data = await res.json();
        setRegisteredAreas(data);
      }
    } catch (e) {
      console.error("Error fetching functional areas:", e);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  const handleRegisterArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    setIsRegisteringArea(true);
    try {
      const res = await fetch('http://localhost:8000/api/areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newAreaName })
      });
      if (res.ok) {
        setNewAreaName('');
        setShowAreaModal(false);
        fetchAreas();
      } else {
        const err = await res.json();
        alert(err.detail || "Erro ao cadastrar área.");
      }
    } catch (e) {
      alert("Erro de conexão ao cadastrar área.");
    } finally {
      setIsRegisteringArea(false);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md z-10">
      {/* Title & Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-blue-600/30">
            C
          </div>
          <span className="font-display font-extrabold text-base tracking-wide text-slate-50 uppercase">
            Cresol <span className="text-blue-500 font-normal">Mining</span>
          </span>
        </div>

        <div className="h-6 w-[1px] bg-slate-800"></div>

        {/* Diagram Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Nome do Diagrama"
          className="bg-transparent border-0 font-display font-bold text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-0 w-64 hover:bg-slate-900/40 px-2 py-1 rounded transition-colors"
        />
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3">
        {/* Load Diagram selector */}
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-2.5 py-1">
          <FolderOpen size={14} className="text-slate-400" />
          <select
            value={selectedDiagramId || ''}
            onChange={(e) => {
              if (e.target.value) {
                onLoadDiagram(Number(e.target.value));
              }
            }}
            className="bg-transparent text-xs text-slate-300 font-semibold focus:outline-none border-0 pr-6 py-1 cursor-pointer select-none"
          >
            <option value="" disabled className="bg-slate-900 text-slate-500">Abrir Salvo...</option>
            {savedDiagrams.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">
                {d.title}
              </option>
            ))}
          </select>
        </div>

        {/* New Diagram Button */}
        <button
          onClick={onNewDiagram}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
        >
          <Plus size={14} />
          Novo
        </button>

        {/* Register Swimlane Area Button */}
        <button
          onClick={() => setShowAreaModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
        >
          <ListPlus size={14} />
          Áreas
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 rounded-xl shadow-lg shadow-blue-600/10 transition-all cursor-pointer"
        >
          {isSaving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Save size={14} />
          )}
          Salvar
        </button>

        {/* Export Word Button */}
        <button
          onClick={onExportWord}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/40 rounded-xl border border-slate-750 transition-all cursor-pointer"
        >
          {isExporting ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <FileDown size={14} />
          )}
          Documentação (Word)
        </button>
      </div>

      {/* New Area functional register modal */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-base text-slate-100">Cadastrar Área Funcional</h3>
            
            <form onSubmit={handleRegisterArea} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Nome do Departamento / Cargo</label>
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Ex: Caixa, Gerente de Contas, Backoffice"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800/45 rounded-xl transition-all"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={isRegisteringArea}
                  className="flex items-center gap-1 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg transition-all"
                >
                  {isRegisteringArea && <Loader2 size={12} className="animate-spin" />}
                  Cadastrar
                </button>
              </div>
            </form>

            {/* List of current areas */}
            {registeredAreas.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/50">
                <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Áreas Cadastradas ({registeredAreas.length})</span>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {registeredAreas.map((a) => (
                    <div key={a.id} className="px-3 py-1.5 rounded-lg bg-slate-950/40 text-[11px] text-slate-300 font-semibold border border-slate-800/50">
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

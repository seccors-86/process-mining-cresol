import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Tag, Users, Layers } from 'lucide-react';

interface NodeEditorModalProps {
  isOpen: boolean;
  nodeType: string;
  initialLabel: string;
  initialPool: string;
  initialLane: string;
  initialAnnotations: string;
  availablePools: string[];
  availableLanes: string[];
  onClose: () => void;
  onSave: (data: { label: string; pool: string; lane: string; annotations: string }) => void;
}

const nodeTypeNames: Record<string, string> = {
  task: 'Atividade',
  start: 'Evento de Início',
  end: 'Evento de Fim',
  exclusiveGateway: 'Gateway Exclusivo (XOR)',
  parallelGateway: 'Gateway Paralelo (AND)',
};

export const NodeEditorModal: React.FC<NodeEditorModalProps> = ({
  isOpen,
  nodeType,
  initialLabel,
  initialPool,
  initialLane,
  initialAnnotations,
  availablePools,
  availableLanes,
  onClose,
  onSave
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [pool, setPool] = useState(initialPool);
  const [lane, setLane] = useState(initialLane);
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [newPool, setNewPool] = useState('');
  const [newLane, setNewLane] = useState('');
  const [showNewPool, setShowNewPool] = useState(false);
  const [showNewLane, setShowNewLane] = useState(false);

  // Sync state with prop updates
  useEffect(() => {
    setLabel(initialLabel);
    setPool(initialPool);
    setLane(initialLane);
    setAnnotations(initialAnnotations);
    setNewPool('');
    setNewLane('');
    setShowNewPool(false);
    setShowNewLane(false);
  }, [initialLabel, initialPool, initialLane, initialAnnotations, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalPool = showNewPool && newPool.trim() ? newPool.trim() : pool;
    const finalLane = showNewLane && newLane.trim() ? newLane.trim() : lane;
    onSave({
      label: label.trim() || initialLabel,
      pool: finalPool,
      lane: finalLane,
      annotations
    });
  };

  const typeName = nodeTypeNames[nodeType] || 'Elemento';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-slate-200">
            <FileText size={18} className="text-blue-500" />
            <div>
              <h3 className="font-display font-bold text-base">Editar {typeName}</h3>
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{nodeType}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {/* Nome / Label */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <Tag size={10} />
              Nome / Legenda
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Analisar Documentação"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Pool / Piscina */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <Users size={10} />
              Piscina (Pool) — Organização
            </label>
            {!showNewPool ? (
              <div className="flex gap-2">
                <select
                  value={pool}
                  onChange={(e) => setPool(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  {availablePools.map((p) => (
                    <option key={p} value={p} className="bg-slate-900">{p}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewPool(true)}
                  className="px-3 py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all"
                >
                  + Nova
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPool}
                  onChange={(e) => setNewPool(e.target.value)}
                  placeholder="Ex: Cliente, Fornecedor, Cresol..."
                  autoFocus
                  className="flex-1 rounded-xl border border-blue-500/30 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={() => { setShowNewPool(false); setNewPool(''); }}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Lane / Raia */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <Layers size={10} />
              Raia (Lane) — Departamento / Cargo
            </label>
            {!showNewLane ? (
              <div className="flex gap-2">
                <select
                  value={lane}
                  onChange={(e) => setLane(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                >
                  {availableLanes.map((l) => (
                    <option key={l} value={l} className="bg-slate-900">{l}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewLane(true)}
                  className="px-3 py-2 text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-600/10 border border-blue-500/20 hover:border-blue-500/40 rounded-xl transition-all"
                >
                  + Nova
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLane}
                  onChange={(e) => setNewLane(e.target.value)}
                  placeholder="Ex: Caixa, Gerente de Contas, Backoffice..."
                  autoFocus
                  className="flex-1 rounded-xl border border-blue-500/30 bg-slate-950/50 px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={() => { setShowNewLane(false); setNewLane(''); }}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-slate-800/50" />

          {/* Anotações */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <FileText size={10} />
              Observações / Regras de Negócio
            </label>
            <textarea
              value={annotations}
              onChange={(e) => setAnnotations(e.target.value)}
              placeholder="Digite regras de negócio, exceções, observações, tempo estimado, ou qualquer detalhe extra..."
              rows={4}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-200 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 rounded-xl transition-all"
          >
            <Check size={16} />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

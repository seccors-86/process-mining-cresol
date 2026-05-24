import { useState, useRef, useEffect } from 'react';
import { Save, FileDown, Plus, FolderOpen, Database, Loader2, Trash2, Copy, Image as ImageIcon, FileCode2, FileText, ChevronDown } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  savedDiagrams: any[];
  selectedDiagramId: number | null;
  onLoadDiagram: (id: number) => void;
  onNewDiagram: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onDelete: () => void;
  onExportWord: (simplified: boolean) => void;
  onExportImage: () => void;
  onExportBPMN: () => void;
  isSaving: boolean;
  isExporting: boolean;
  onOpenDataModal: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  onTitleChange,
  savedDiagrams,
  selectedDiagramId,
  onLoadDiagram,
  onNewDiagram,
  onSave,
  onSaveAs,
  onDelete,
  onExportWord,
  onExportImage,
  onExportBPMN,
  isSaving,
  isExporting,
  onOpenDataModal
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white/90 border-b border-slate-200 backdrop-blur-md z-10 shadow-sm">
      {/* Title & Brand */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-sm shadow-lg shadow-blue-600/30">
            C
          </div>
          <span className="font-display font-extrabold text-base tracking-wide text-slate-800 uppercase">
            Cresol <span className="text-blue-500 font-normal">Mining</span>
          </span>
        </div>

        <div className="h-6 w-[1px] bg-slate-200"></div>

        {/* Diagram Title input */}
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Nome do Diagrama"
          className="bg-transparent border-0 font-display font-bold text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-0 w-64 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
        />
      </div>

      {/* Control Actions */}
      <div className="flex items-center gap-3">
        {/* Load Diagram selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
          <FolderOpen size={14} className="text-slate-500" />
          <select
            value={selectedDiagramId || ''}
            onChange={(e) => {
              if (e.target.value) {
                onLoadDiagram(Number(e.target.value));
              }
            }}
            className="bg-transparent text-xs text-slate-700 font-semibold focus:outline-none border-0 pr-6 py-1 cursor-pointer select-none"
          >
            <option value="" disabled className="bg-white text-slate-400">Abrir Salvo...</option>
            {savedDiagrams.map((d) => (
              <option key={d.id} value={d.id} className="bg-white text-slate-800">
                {d.title}
              </option>
            ))}
          </select>
        </div>

        {/* New Diagram Button */}
        <button
          onClick={onNewDiagram}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl transition-all shadow-sm"
        >
          <Plus size={14} />
          Novo
        </button>

        {/* Register Data Button */}
        <button
          onClick={onOpenDataModal}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-sm"
        >
          <Database size={14} />
          Cadastros
        </button>

        {/* Save Group */}
        <div className="flex bg-blue-600 rounded-xl shadow-lg shadow-blue-600/10">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:bg-blue-600/40 rounded-l-xl transition-all cursor-pointer border-r border-blue-500/50"
            title="Salvar"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
          <button
            onClick={onSaveAs}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white hover:bg-blue-500 disabled:bg-blue-600/40 rounded-r-xl transition-all cursor-pointer"
            title="Salvar como novo processo (Cópia)"
          >
            <Copy size={14} />
          </button>
        </div>

        {/* Delete Diagram Button (Only if it's a saved diagram) */}
        {selectedDiagramId && (
          <button
            onClick={onDelete}
            className="flex items-center justify-center w-[34px] h-[34px] rounded-xl text-rose-500 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 transition-colors shadow-sm"
            title="Excluir este Processo"
          >
            <Trash2 size={15} />
          </button>
        )}

        {/* Export Dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-700 hover:bg-slate-600 disabled:bg-slate-400 rounded-xl border border-slate-600 transition-all cursor-pointer shadow-sm"
          >
            {isExporting ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            Exportar
            <ChevronDown size={14} className={`transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
              <div className="py-1">
                <button onClick={() => { onExportImage(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left">
                  <ImageIcon size={14} /> Imagem (PNG)
                </button>
                <button onClick={() => { onExportBPMN(); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left">
                  <FileCode2 size={14} /> Arquivo BPMN (.bpmn)
                </button>
                <div className="h-px bg-slate-100 my-1 mx-2"></div>
                <button onClick={() => { onExportWord(false); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left">
                  <FileText size={14} /> Documentação Completa (.docx)
                </button>
                <button onClick={() => { onExportWord(true); setShowExportMenu(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors text-left">
                  <FileText size={14} /> Documento Simplificado (.docx)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

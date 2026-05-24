import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import type { Node, Edge, Connection, OnConnect } from '@xyflow/react';
import { ReactFlowProvider } from '@xyflow/react';

import { getViewportForBounds, getNodesBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { DashboardHeader } from './components/DashboardHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { ProcessCanvas } from './components/ProcessCanvas';
import { NodeEditorModal } from './components/AnnotationModal';
import { PropertiesPanel } from './components/PropertiesPanel';
import { DataModal } from './components/DataModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

let nodeIdCounter = 100;

// ===== Swimlane Layout Engine =====
// Computes fixed horizontal swimlane bands and repositions nodes into them

const LANE_HEIGHT = 250;
const LANE_PADDING = 30;
const POOL_GAP = 40;

interface LaneBand {
  pool: string;
  lane: string;
  yMin: number;
  yMax: number;
  yCenter: number;
  height: number;
}

function computeFixedSwimlanes(nodes: Node[], laneHeights: Record<string, number> = {}): LaneBand[] {
  // Collect unique (pool, lane) pairs
  const laneSet = new Map<string, { pool: string; lane: string }>();
  for (const node of nodes) {
    const pool = (node.data?.pool as string) || 'Cresol';
    const lane = (node.data?.lane as string) || 'Geral';
    const key = `${pool}::${lane}`;
    if (!laneSet.has(key)) {
      laneSet.set(key, { pool, lane });
    }
  }

  if (laneSet.size === 0) return [];

  // Sort: group by pool, then by lane
  const sortedLanes = Array.from(laneSet.values()).sort((a, b) => {
    if (a.pool !== b.pool) return a.pool.localeCompare(b.pool);
    return a.lane.localeCompare(b.lane);
  });

  // Assign fixed Y bands
  const bands: LaneBand[] = [];
  let currentY = LANE_PADDING;
  let lastPool = '';

  for (const { pool, lane } of sortedLanes) {
    if (lastPool && lastPool !== pool) {
      currentY += POOL_GAP; // extra gap between pools
    }
    const height = laneHeights[`${pool}::${lane}`] || LANE_HEIGHT;
    bands.push({
      pool,
      lane,
      yMin: currentY,
      yMax: currentY + height,
      yCenter: currentY + height / 2,
      height: height,
    });
    currentY += height;
    lastPool = pool;
  }

  return bands;
}

function snapNodesToLanes(nodes: Node[], bands: LaneBand[]): Node[] {
  if (bands.length === 0) return nodes;

  // Build lookup: "pool::lane" -> LaneBand
  const bandMap = new Map<string, LaneBand>();
  for (const band of bands) {
    bandMap.set(`${band.pool}::${band.lane}`, band);
  }

  // Group nodes by lane to stagger them vertically within the lane
  const laneNodeCounts = new Map<string, number>();

  return nodes.map((node) => {
    const pool = (node.data?.pool as string) || 'Cresol';
    const lane = (node.data?.lane as string) || 'Geral';
    const key = `${pool}::${lane}`;
    const band = bandMap.get(key);

    if (!band) return node;

    // Count how many nodes we've placed in this lane so far
    const count = laneNodeCounts.get(key) || 0;
    laneNodeCounts.set(key, count + 1);

    // Small vertical stagger for nodes in the same lane to avoid perfect overlap
    const stagger = (count % 3 - 1) * 25; // -25, 0, +25

    return {
      ...node,
      position: {
        x: node.position.x,
        y: band.yCenter + stagger - 30, // center node in lane band
      },
    };
  });
}

export default function App() {
  // Database and Metadata State
  const [diagramId, setDiagramId] = useState<number | null>(null);
  const [title, setTitle] = useState('Mapeamento de Processo Cresol');
  const [description, setDescription] = useState('');
  const [savedDiagrams, setSavedDiagrams] = useState<any[]>([]);
  
  // AI Chat Agent State
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [powlCode, setPowlCode] = useState('');
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  // Layout spacing control
  const [spacingMultiplier, setSpacingMultiplier] = useState<number>(220);
  const [laneHeights, setLaneHeights] = useState<Record<string, number>>({});

  // Loading States
  const [agentStatus, setAgentStatus] = useState<'idle' | 'generating' | 'executing' | 'layouting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Node Editor Modal State
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<Node | null>(null);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);

  // Selection tracking
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const hasSelection = selectedNodeIds.size > 0 || selectedEdgeIds.size > 0;
  
  // The actively selected node for the properties panel
  const activeSelectedNode = useMemo(() => {
    return nodes.find(n => selectedNodeIds.has(n.id)) || null;
  }, [nodes, selectedNodeIds]);

  const handleUpdateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => {
      const updated = nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...newData } };
        }
        return n;
      });
      // Optionally re-snap if pool/lane changed, but it might jump while typing.
      // So we only re-snap on modal save or specific actions to avoid UI jumping.
      return updated;
    });
    
    // Also update annotations dictionary for docx export if changed
    if (newData.annotations && newData.label) {
      setNotes((prev) => ({ ...prev, [newData.label]: newData.annotations }));
    }
  }, [setNodes]);

  useEffect(() => {
    const sn = nodes.filter((n: any) => n.selected);
    const se = edges.filter((e: any) => e.selected);
    setSelectedNodeIds(new Set(sn.map((n: any) => n.id)));
    setSelectedEdgeIds(new Set(se.map((e: any) => e.id)));
  }, [nodes, edges]);

  // Handle spacing multiplier
  useEffect(() => {
    setNodes((nds) => nds.map((n) => {
      // For legacy/manual nodes, calculate a rank based on their initial X if missing
      const rank = typeof n.data?.rank === 'number' ? n.data.rank : (n.position.x - 80) / 220;
      return {
        ...n,
        data: { ...n.data, rank }, // Save the rank so it scales consistently
        position: { ...n.position, x: rank * spacingMultiplier + 80 }
      };
    }));
  }, [spacingMultiplier, setNodes]);

  // ===== Swimlane computation =====
  // Recompute fixed-height swimlane bands whenever nodes change
  const swimlaneBands = useMemo(() => computeFixedSwimlanes(nodes, laneHeights), [nodes, laneHeights]);

  // Convert bands to the format ProcessCanvas expects
  const activeSwimlanes = useMemo(() => {
    return swimlaneBands.map((b) => ({
      pool: b.pool,
      lane: b.lane,
      yMin: b.yMin,
      yMax: b.yMax,
      height: b.height,
      id: `${b.pool}::${b.lane}`,
    }));
  }, [swimlaneBands]);

  // Snap nodes whenever laneHeights change
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (Object.keys(laneHeights).length > 0 && nodes.length > 0) {
      const bands = computeFixedSwimlanes(nodes, laneHeights);
      setNodes((nds) => snapNodesToLanes(nds, bands));
    }
  }, [laneHeights]);

  // Collect available pools and lanes for the editor dropdown
  const availablePools = useMemo(() => {
    const pools = new Set<string>(['Cresol']);
    for (const node of nodes) {
      if (node.data?.pool) pools.add(node.data.pool as string);
    }
    return Array.from(pools).sort();
  }, [nodes]);

  const availableLanes = useMemo(() => {
    const lanes = new Set<string>(['Geral']);
    for (const node of nodes) {
      if (node.data?.lane) lanes.add(node.data.lane as string);
    }
    return Array.from(lanes).sort();
  }, [nodes]);

  // Load Saved Diagrams
  const fetchDiagramsList = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/diagrams');
      if (res.ok) setSavedDiagrams(await res.json());
    } catch (e) {
      console.error("Error fetching saved diagrams:", e);
    }
  }, []);

  useEffect(() => { fetchDiagramsList(); }, [fetchDiagramsList]);

  const handleLoadDiagram = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:8000/api/diagrams/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDiagramId(data.id);
        setTitle(data.title);
        setDescription(data.description || '');
        setPowlCode(data.powl_code || '');
        setNotes(data.notes || {});
        
        if (data.json_data) {
          const loadedNodes = data.json_data.nodes || [];
          const loadedEdges = data.json_data.edges || [];
          // Snap loaded nodes into their swimlanes
          const loadedLaneHeights: Record<string, number> = {};
          if (data.json_data?.swimlanes) {
            data.json_data.swimlanes.forEach((sl: any) => {
              loadedLaneHeights[`${sl.pool}::${sl.lane}`] = sl.height || 160;
            });
          }
          setLaneHeights(loadedLaneHeights);
          const bands = computeFixedSwimlanes(loadedNodes, loadedLaneHeights);
          setNodes(snapNodesToLanes(loadedNodes, bands));
          setEdges(loadedEdges);
        }
        
        setMessages([{ role: 'assistant', content: `Diagrama "${data.title}" carregado com sucesso!` }]);
        setConversationHistory([]);
      }
    } catch (e) {
      alert("Falha ao conectar para carregar diagrama.");
    }
  };

  const handleNewDiagram = () => {
    setDiagramId(null);
    setTitle('Mapeamento de Processo Cresol');
    setDescription('');
    setMessages([]);
    setConversationHistory([]);
    setPowlCode('');
    setNodes([]);
    setEdges([]);
    setNotes({});
    setErrorMessage(null);
    setAgentStatus('idle');
  };

  const handleSaveDiagram = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title, description, powl_code: powlCode, xml_data: '',
        json_data: { nodes, edges, swimlanes: activeSwimlanes },
        notes
      };
      const url = diagramId ? `http://localhost:8000/api/diagrams/${diagramId}` : 'http://localhost:8000/api/diagrams';
      const method = diagramId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        setDiagramId(saved.id);
        fetchDiagramsList();
        alert("Diagrama salvo com sucesso!");
      } else {
        alert("Falha ao salvar diagrama.");
      }
    } catch (e) {
      alert("Erro de conexão ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsDiagram = async () => {
    setIsSaving(true);
    try {
      const payload = {
        title: `${title} (Cópia)`, description, powl_code: powlCode, xml_data: '',
        json_data: { nodes, edges, swimlanes: activeSwimlanes },
        notes
      };
      const res = await fetch('http://localhost:8000/api/diagrams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        setDiagramId(saved.id);
        setTitle(saved.title);
        fetchDiagramsList();
        alert("Processo salvo como cópia com sucesso!");
      } else {
        alert("Falha ao salvar diagrama como cópia.");
      }
    } catch (e) {
      alert("Erro de conexão ao salvar como.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDiagram = async () => {
    if (!diagramId) return;
    if (!window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o processo "${title}"?\n\nEssa ação não pode ser desfeita!`)) return;
    
    try {
      const res = await fetch(`http://localhost:8000/api/diagrams/${diagramId}`, { method: 'DELETE' });
      if (res.ok) {
        handleNewDiagram();
        fetchDiagramsList();
        alert("Processo excluído com sucesso!");
      } else {
        alert("Falha ao excluir processo.");
      }
    } catch (e) {
      alert("Erro de conexão ao excluir.");
    }
  };

  // ===== Exports =====
  const handleExportWord = async (simplified: boolean = false) => {
    setIsExporting(true);
    try {
      const payload = {
        title, description, powl_code: powlCode,
        json_data: { nodes, edges, swimlanes: activeSwimlanes },
        notes
      };
      const endpoint = simplified ? 'export-word-simplified' : 'export-word';
      const res = await fetch(`http://localhost:8000/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}${simplified ? '_Simplificado' : ''}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Falha ao gerar documentação.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = useCallback(() => {
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewportForBounds(
      nodesBounds,
      nodesBounds.width,
      nodesBounds.height,
      0.5,
      2,
      0.1
    );
    
    // We target the .react-flow__viewport element to get the nodes without the UI controls
    const flowElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!flowElement) return;

    // Save current transform to restore later
    const transform = flowElement.style.transform;
    // Set to scale 1 so it's sharp
    flowElement.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;

    toPng(flowElement, {
      backgroundColor: '#f8fafc',
      width: nodesBounds.width + 200, // add padding
      height: nodesBounds.height + 200,
      style: {
        width: `${nodesBounds.width + 200}px`,
        height: `${nodesBounds.height + 200}px`,
        transform: `translate(${100 - nodesBounds.x}px, ${100 - nodesBounds.y}px) scale(1)`,
      },
    }).then((dataUrl) => {
      const a = document.createElement('a');
      a.setAttribute('download', `${title.replace(/\s+/g, '_')}.png`);
      a.setAttribute('href', dataUrl);
      a.click();
    }).catch((err) => {
      console.error("Export Error:", err);
      alert("Erro ao exportar imagem.");
    }).finally(() => {
      // Restore transform
      flowElement.style.transform = transform;
    });
  }, [nodes, title]);

  const handleExportBPMN = async () => {
    setIsExporting(true);
    try {
      const payload = {
        title,
        json_data: { nodes, edges, swimlanes: activeSwimlanes }
      };
      const res = await fetch('http://localhost:8000/api/export-bpmn', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.bpmn`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Falha ao exportar BPMN.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsExporting(false);
    }
  };

  // Send message to LangGraph chatbot
  const handleSendMessage = async (text: string, mode: 'text'|'interview' = 'text', isAsIs: boolean = true, file?: File) => {
    const updatedMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(updatedMessages);
    setAgentStatus('generating');
    setErrorMessage(null);

    let currentDesc = description;
    if (!description) { currentDesc = text; setDescription(text); }

    try {
      let finalPrompt = text;
      
      // Handle file upload if present
      if (file) {
        setAgentStatus('executing');
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('http://localhost:8000/api/upload-log', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalPrompt += `\n\nResumo extraído do arquivo:\n${uploadData.summary}`;
        } else {
          setAgentStatus('error');
          setErrorMessage("Falha ao ler o arquivo enviado.");
          return;
        }
      }

      setAgentStatus('generating');
      const timer1 = setTimeout(() => setAgentStatus('executing'), 2000);
      const timer2 = setTimeout(() => setAgentStatus('layouting'), 4500);

      const res = await fetch('http://localhost:8000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          process_description: currentDesc, 
          messages: updatedMessages, 
          conversation_history: conversationHistory,
          creation_mode: mode,
          is_as_is: isAsIs,
          current_nodes: nodes,
          current_edges: edges
        })
      });

      clearTimeout(timer1);
      clearTimeout(timer2);

      if (res.ok) {
        const data = await res.json();
        if (data.error) { setAgentStatus('error'); setErrorMessage(data.error); return; }

        setPowlCode(data.code || '');
        setConversationHistory(data.conversation_history || []);
        
        if (data.diagram_data) {
          const aiNodes = data.diagram_data.nodes || [];
          const aiEdges = data.diagram_data.edges || [];
          // SNAP AI-generated nodes into fixed swimlane bands
          const bands = computeFixedSwimlanes(aiNodes, laneHeights);
          setNodes(snapNodesToLanes(aiNodes, bands));
          setEdges(aiEdges);
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Processo modelado com sucesso! As atividades foram organizadas nas suas raias (piscinas BPMN). Duplo clique para editar qualquer elemento.' }]);
        setAgentStatus('idle');
      } else {
        const errDetails = await res.text();
        setAgentStatus('error');
        setErrorMessage(`Falha: ${errDetails}`);
      }
    } catch (e) {
      setAgentStatus('error');
      setErrorMessage(`Erro: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  // ===== Interactive Canvas Editing =====

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } }, eds));
    },
    [setEdges]
  );

  // ===== Toolbar Add Functions =====
  const addNode = useCallback((type: string, label: string) => {
    const yBands = computeFixedSwimlanes(nodes, laneHeights);
    let targetY = 150;
    let pool = 'Processo';
    let lane = 'Geral';
    if (yBands.length > 0) {
      targetY = yBands[0].yCenter - 30;
      pool = yBands[0].pool;
      lane = yBands[0].lane;
    }

    const newNode: Node = {
      id: `manual_${nodeIdCounter++}`,
      type,
      position: { x: nodes.length * 200 + 50, y: targetY },
      data: { 
        label, 
        pool, 
        lane, 
        rank: (nodes.length * 200 + 50 - 80) / 220, // Assign rank so slider works
        executionType: 'Manual',
        systems: [],
        variables: []
      },
      selected: true,
    };
    
    setNodes((nds) => [...nds, newNode]);

    // Open editor for the new node
    setTimeout(() => {
      setSelectedNodeForEdit(newNode);
      setIsEditorModalOpen(true);
    }, 100);
  }, [nodes, setNodes]);

  const handleAddTask = useCallback(() => addNode('task', 'Nova Atividade'), [addNode]);
  const handleAddGatewayXOR = useCallback(() => addNode('exclusiveGateway', 'XOR'), [addNode]);
  const handleAddGatewayAND = useCallback(() => addNode('parallelGateway', 'AND'), [addNode]);
  const handleAddStart = useCallback(() => addNode('start', 'Início'), [addNode]);
  const handleAddEnd = useCallback(() => addNode('end', 'Fim'), [addNode]);

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  const handleDuplicateSelected = useCallback(() => {
    setNodes((nds) => {
      const selectedNodes = nds.filter((n) => n.selected);
      if (selectedNodes.length === 0) return nds;

      const newNodes = selectedNodes.map((node) => {
        const id = `manual_${nodeIdCounter++}`;
        return {
          ...node,
          id,
          position: { x: node.position.x, y: node.position.y + 80 },
          selected: true,
        };
      });

      // Deselect old nodes and append new ones
      return [...nds.map(n => ({ ...n, selected: false })), ...newNodes];
    });
  }, [setNodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        handleDeleteSelected();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected]);

  // Node Double Click — open editor for ANY node type
  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeForEdit(node);
    setIsEditorModalOpen(true);
  }, []);

  // Save node edits — and reposition into correct lane if pool/lane changed
  const handleSaveNodeEdit = (data: { label: string; pool: string; lane: string; annotations: string }) => {
    if (!selectedNodeForEdit) return;
    const nodeId = selectedNodeForEdit.id;

    setNodes((nds) => {
      // Update the edited node's data
      const updatedNodes = nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...n.data, label: data.label, pool: data.pool, lane: data.lane, annotations: data.annotations } };
        }
        return n;
      });

      // Recompute lanes and snap ALL nodes into correct positions
      const bands = computeFixedSwimlanes(updatedNodes, laneHeights);
      return snapNodesToLanes(updatedNodes, bands);
    });

    if (data.annotations) {
      setNotes((prev) => ({ ...prev, [data.label]: data.annotations }));
    }

    setIsEditorModalOpen(false);
    setSelectedNodeForEdit(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      <DashboardHeader
        title={title}
        onTitleChange={setTitle}
        savedDiagrams={savedDiagrams}
        selectedDiagramId={diagramId}
        onLoadDiagram={handleLoadDiagram}
        onNewDiagram={handleNewDiagram}
        onSave={handleSaveDiagram}
        onSaveAs={handleSaveAsDiagram}
        onDelete={handleDeleteDiagram}
        onExportWord={handleExportWord}
        onExportImage={handleExportImage}
        onExportBPMN={handleExportBPMN}
        isSaving={isSaving}
        isExporting={isExporting}
        onOpenDataModal={() => setIsDataModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          messages={messages}
          status={agentStatus}
          errorMessage={errorMessage}
          onSendMessage={handleSendMessage}
          onRestart={handleNewDiagram}
        />

        <main className="flex-1 h-full relative bg-slate-50 flex">
          <div className="flex-1 relative">
            <ReactFlowProvider>
            <ProcessCanvas
              nodes={nodes}
              edges={edges}
              swimlanes={activeSwimlanes}
              setLaneHeights={setLaneHeights}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDoubleClick={onNodeDoubleClick}
              onAddTask={handleAddTask}
              onAddGatewayXOR={handleAddGatewayXOR}
              onAddGatewayAND={handleAddGatewayAND}
              onAddStart={handleAddStart}
              onAddEnd={handleAddEnd}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              hasSelection={hasSelection}
              spacingMultiplier={spacingMultiplier}
              onSpacingChange={setSpacingMultiplier}
            />
            </ReactFlowProvider>
          </div>
          
          <PropertiesPanel
            selectedNode={activeSelectedNode}
            onClose={() => setNodes(nds => nds.map(n => ({ ...n, selected: false })))}
            onUpdateData={handleUpdateNodeData}
          />
        </main>
      </div>

      <DataModal 
        isOpen={isDataModalOpen} 
        onClose={() => setIsDataModalOpen(false)} 
        onUpdate={() => {}} 
      />

      <NodeEditorModal
        isOpen={isEditorModalOpen}
        nodeType={selectedNodeForEdit?.type || 'task'}
        initialLabel={(selectedNodeForEdit?.data?.label as string) || ''}
        initialPool={(selectedNodeForEdit?.data?.pool as string) || 'Cresol'}
        initialLane={(selectedNodeForEdit?.data?.lane as string) || 'Geral'}
        initialAnnotations={(selectedNodeForEdit?.data?.annotations as string) || ''}
        availablePools={availablePools}
        availableLanes={availableLanes}
        onClose={() => { setIsEditorModalOpen(false); setSelectedNodeForEdit(null); }}
        onSave={handleSaveNodeEdit}
      />
    </div>
  );
}

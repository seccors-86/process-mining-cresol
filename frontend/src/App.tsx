import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import type { Node, Edge, Connection, OnConnect } from '@xyflow/react';
import { ReactFlowProvider } from '@xyflow/react';

import { DashboardHeader } from './components/DashboardHeader';
import { ChatSidebar } from './components/ChatSidebar';
import { ProcessCanvas } from './components/ProcessCanvas';
import { NodeEditorModal } from './components/AnnotationModal';

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

function computeFixedSwimlanes(nodes: Node[]): LaneBand[] {
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
    bands.push({
      pool,
      lane,
      yMin: currentY,
      yMax: currentY + LANE_HEIGHT,
      yCenter: currentY + LANE_HEIGHT / 2,
      height: LANE_HEIGHT,
    });
    currentY += LANE_HEIGHT;
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
  
  // React Flow Diagram State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Loading States
  const [agentStatus, setAgentStatus] = useState<'idle' | 'generating' | 'executing' | 'layouting' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Node Editor Modal State
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [selectedNodeForEdit, setSelectedNodeForEdit] = useState<Node | null>(null);

  // Selection tracking
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  const hasSelection = selectedNodeIds.size > 0 || selectedEdgeIds.size > 0;

  useEffect(() => {
    const sn = nodes.filter((n: any) => n.selected);
    const se = edges.filter((e: any) => e.selected);
    setSelectedNodeIds(new Set(sn.map((n: any) => n.id)));
    setSelectedEdgeIds(new Set(se.map((e: any) => e.id)));
  }, [nodes, edges]);

  // ===== Swimlane computation =====
  // Recompute fixed-height swimlane bands whenever nodes change
  const swimlaneBands = useMemo(() => computeFixedSwimlanes(nodes), [nodes]);

  // Convert bands to the format ProcessCanvas expects
  const activeSwimlanes = useMemo(() => {
    return swimlaneBands.map((b) => ({
      pool: b.pool,
      lane: b.lane,
      yMin: b.yMin,
      yMax: b.yMax,
      height: b.height,
    }));
  }, [swimlaneBands]);

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

  // ===== Snap nodes into lanes =====
  // This function repositions all nodes so they sit inside their swimlanes
  const reorganizeNodesIntoLanes = useCallback(() => {
    setNodes((currentNodes) => {
      const bands = computeFixedSwimlanes(currentNodes);
      if (bands.length === 0) return currentNodes;
      return snapNodesToLanes(currentNodes, bands);
    });
  }, [setNodes]);

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
          const bands = computeFixedSwimlanes(loadedNodes);
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
      alert("Erro ao conectar ao banco de dados.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      const payload = { title, description, json_data: { nodes, edges, swimlanes: activeSwimlanes }, notes, powl_code: powlCode };
      const res = await fetch('http://localhost:8000/api/document', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `documentacao_processo_${title.replace(/\s+/g, '_')}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else { alert("Falha ao gerar documentação Word."); }
    } catch (e) { alert("Erro de conexão ao exportar."); }
    finally { setIsExporting(false); }
  };

  // Send message to LangGraph chatbot
  const handleSendMessage = async (text: string) => {
    const updatedMessages = [...messages, { role: 'user' as const, content: text }];
    setMessages(updatedMessages);
    setAgentStatus('generating');
    setErrorMessage(null);

    let currentDesc = description;
    if (!description) { currentDesc = text; setDescription(text); }

    try {
      const timer1 = setTimeout(() => setAgentStatus('executing'), 2000);
      const timer2 = setTimeout(() => setAgentStatus('layouting'), 4500);

      const res = await fetch('http://localhost:8000/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ process_description: currentDesc, messages: updatedMessages, conversation_history: conversationHistory })
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
          const bands = computeFixedSwimlanes(aiNodes);
          setNodes(snapNodesToLanes(aiNodes, bands));
          setEdges(aiEdges);
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: 'Processo modelado com sucesso! As atividades foram organizadas nas suas raias (piscinas BPMN). Duplo clique para editar qualquer elemento.' }]);
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

  const addNode = useCallback(
    (type: string, label: string, pool = 'Cresol', lane = 'Geral') => {
      const id = `manual_${nodeIdCounter++}`;
      
      // Calculate X position: place after rightmost existing node
      const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
      const xPos = maxX + 280;

      // Calculate Y position: find the correct lane band
      const allNodesWithNew: Node[] = [
        ...nodes,
        { id, type, position: { x: xPos, y: 0 }, data: { label, pool, lane, annotations: '' } } as Node,
      ];
      const bands = computeFixedSwimlanes(allNodesWithNew);
      const band = bands.find(b => b.pool === pool && b.lane === lane);
      const yPos = band ? band.yCenter - 30 : 100;

      const newNode: Node = {
        id,
        type,
        position: { x: xPos, y: yPos },
        data: { label, pool, lane, annotations: '' },
      };

      setNodes((nds) => [...nds, newNode]);

      // Open editor for the new node
      setTimeout(() => {
        setSelectedNodeForEdit(newNode);
        setIsEditorModalOpen(true);
      }, 100);
    },
    [setNodes, nodes]
  );

  const handleAddTask = useCallback(() => addNode('task', 'Nova Atividade'), [addNode]);
  const handleAddGatewayXOR = useCallback(() => addNode('exclusiveGateway', 'XOR'), [addNode]);
  const handleAddGatewayAND = useCallback(() => addNode('parallelGateway', 'AND'), [addNode]);
  const handleAddStart = useCallback(() => addNode('start', 'Início'), [addNode]);
  const handleAddEnd = useCallback(() => addNode('end', 'Fim'), [addNode]);

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

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
      const bands = computeFixedSwimlanes(updatedNodes);
      return snapNodesToLanes(updatedNodes, bands);
    });

    if (data.annotations) {
      setNotes((prev) => ({ ...prev, [data.label]: data.annotations }));
    }

    setIsEditorModalOpen(false);
    setSelectedNodeForEdit(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0b0f19] text-slate-100 overflow-hidden font-sans">
      <DashboardHeader
        title={title}
        onTitleChange={setTitle}
        savedDiagrams={savedDiagrams}
        selectedDiagramId={diagramId}
        onLoadDiagram={handleLoadDiagram}
        onNewDiagram={handleNewDiagram}
        onSave={handleSaveDiagram}
        onExportWord={handleExportWord}
        isSaving={isSaving}
        isExporting={isExporting}
      />

      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          messages={messages}
          status={agentStatus}
          errorMessage={errorMessage}
          onSendMessage={handleSendMessage}
          onRestart={handleNewDiagram}
        />

        <main className="flex-1 h-full relative bg-[#0b0f19]">
          <ReactFlowProvider>
            <ProcessCanvas
              nodes={nodes}
              edges={edges}
              swimlanes={activeSwimlanes}
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
              hasSelection={hasSelection}
            />
          </ReactFlowProvider>
        </main>
      </div>

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

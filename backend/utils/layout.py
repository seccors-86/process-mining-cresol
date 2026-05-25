import os
import sys
from typing import Dict, List, Tuple, Any

# Ensure Graphviz path is included if on Windows
if os.name == 'nt':
    os.environ["PATH"] += os.pathsep + r"C:\Program Files\Graphviz\bin"

from powl import convert_to_bpmn
from pm4py.objects.bpmn.layout import layouter
from pm4py.objects.bpmn.obj import BPMN
from agents.code_extraction import extract_resources_from_code
from database import SessionLocal
from models import Area, SystemModel, VariableModel

def _save_metadata_to_db(resources: dict):
    db = SessionLocal()
    try:
        pools_to_add = set()
        systems_to_add = set()
        variables_to_add = set()

        for _, (pool, lane, annotations, systems, variables) in resources.items():
            if pool and pool != "Cresol":
                pools_to_add.add(pool)
            if systems:
                for sys in systems:
                    systems_to_add.add(sys)
            if variables:
                for var in variables:
                    variables_to_add.add(var)

        for p in pools_to_add:
            if not db.query(Area).filter(Area.name == p).first():
                db.add(Area(name=p, description="Gerado via IA"))
        for s in systems_to_add:
            if not db.query(SystemModel).filter(SystemModel.name == s).first():
                db.add(SystemModel(name=s, description="Gerado via IA"))
        for v in variables_to_add:
            if not db.query(VariableModel).filter(VariableModel.name == v).first():
                db.add(VariableModel(name=v, description="Gerado via IA"))

        db.commit()
    except Exception as e:
        print("Error saving metadata to DB:", e)
        db.rollback()
    finally:
        db.close()


def layout_powl_model(powl_model, python_code: str, current_nodes: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Converts a POWL model to BPMN, runs layouter, and converts to React Flow JSON.
    Aligns Y coordinates strictly to Swimlanes (pools and lanes) parsed from the code AST.
    """
    # 1. Convert to BPMN and apply layouter
    bpmn_model = convert_to_bpmn(powl_model)
    layouted = layouter.apply(bpmn_model)

    # 2. Extract pools/lanes from the code
    resources = {}
    try:
        resources = extract_resources_from_code(python_code)
    except Exception as e:
        print("Error extracting resources from code AST:", e)

    # 3. Build a graph of nodes and their connections for propagation
    bpmn_nodes = list(layouted.get_nodes())
    bpmn_flows = list(layouted.get_flows())

    node_by_id = {}
    node_to_id = {}
    for i, node in enumerate(bpmn_nodes):
        node_id = f"node_{i}"
        node_by_id[node_id] = node
        node_to_id[node] = node_id

    # 4. Map task nodes to pools, lanes, and extra metadata
    # Key: node_id, Value: (pool, lane, annotations, systems, variables)
    node_metadata = {}
    
    for node_id, node in node_by_id.items():
        if isinstance(node, BPMN.Task):
            task_name = node.get_name()
            # Clean name for matching
            matched = False
            for act_name, res in resources.items():
                if act_name == task_name or act_name.strip() == task_name.strip():
                    pool, lane, annotations, systems, variables = res
                    node_metadata[node_id] = (pool or "Cresol", lane or "Geral", annotations, systems, variables)
                    matched = True
                    break
            if not matched:
                # Default metadata
                node_metadata[node_id] = ("Cresol", "Geral", "", [], [])
    
    # Also save to Database in background
    _save_metadata_to_db(resources)

    # 5. Propagate pool/lane to gateways and start/end events using BFS
    # Build adjacency list
    adj = {nid: [] for nid in node_by_id}
    for flow in bpmn_flows:
        src = flow.get_source()
        tgt = flow.get_target()
        if src in node_to_id and tgt in node_to_id:
            src_id = node_to_id[src]
            tgt_id = node_to_id[tgt]
            adj[src_id].append(tgt_id)
            adj[tgt_id].append(src_id)

    # Queue of nodes that already have a swimlane assigned
    queue = list(node_metadata.keys())
    visited = set(queue)

    while queue:
        curr = queue.pop(0)
        curr_pool, curr_lane, _, _, _ = node_metadata[curr]
        for neighbor in adj[curr]:
            if neighbor not in visited:
                node_metadata[neighbor] = (curr_pool, curr_lane, "", [], [])
                visited.add(neighbor)
                queue.append(neighbor)

    # If any nodes are still unassigned, set to default
    for nid in node_by_id:
        if nid not in node_metadata:
            node_metadata[nid] = ("Cresol", "Geral", "", [], [])

    # 6. Organize pools and lanes to establish Y coordinates
    # Gather all unique (pool, lane) pairs
    swimlanes_set = set((p, l) for p, l, _, _, _ in node_metadata.values())
    
    # Preserve the order inferred from the process/code instead of sorting alphabetically.
    # This follows BPMN readability guidance: lane order should help the flow, not fight it.
    pools = []
    pool_lanes = {}
    for pool, lane, _, _, _ in node_metadata.values():
        if (pool, lane) not in swimlanes_set:
            continue
        if pool not in pool_lanes:
            pools.append(pool)
            pool_lanes[pool] = []
        if lane not in pool_lanes[pool]:
            pool_lanes[pool].append(lane)

    # Assign vertical positions
    # Horizontal lane rows: each lane has a Y center and height.
    lane_height = 220
    lane_positions = {} # Key: (pool, lane), Value: { 'y_center': float, 'y_min': float, 'y_max': float }
    
    current_y = 50
    swimlane_layout = [] # Info to send to frontend to draw lanes
    
    for pool in pools:
        pool_start_y = current_y
        for lane in pool_lanes[pool]:
            lane_positions[(pool, lane)] = {
                'y_center': current_y + (lane_height / 2),
                'y_min': current_y,
                'y_max': current_y + lane_height
            }
            swimlane_layout.append({
                'pool': pool,
                'lane': lane,
                'yMin': current_y,
                'yMax': current_y + lane_height,
                'height': lane_height
            })
            current_y += lane_height
        # We can add space between pools if needed
        current_y += 40

    # 7. Convert nodes to React Flow format using BPMN-style left-to-right ranking.
    # Back/loop edges are excluded from ranking, otherwise loops push nodes to rank 100+
    # and create spaghetti diagrams.
    outgoing_by_node = {node: [] for node in bpmn_nodes}
    for flow in bpmn_flows:
        src = flow.get_source()
        tgt = flow.get_target()
        if src in outgoing_by_node and tgt in outgoing_by_node:
            outgoing_by_node[src].append(flow)

    cyclic_flows = set()
    visit_state = {}

    def detect_cycles(node):
        visit_state[node] = 1
        for flow in outgoing_by_node.get(node, []):
            tgt = flow.get_target()
            if tgt == node or visit_state.get(tgt) == 1:
                cyclic_flows.add(flow)
                continue
            if visit_state.get(tgt, 0) == 0:
                detect_cycles(tgt)
        visit_state[node] = 2
    
    start_nodes = []
    for node in bpmn_nodes:
        if isinstance(node, BPMN.StartEvent):
            start_nodes.append(node)
            
    if not start_nodes:
        for node in bpmn_nodes:
            in_edges = [f for f in bpmn_flows if f.get_target() == node]
            if not in_edges:
                start_nodes.append(node)

    for node in start_nodes:
        if visit_state.get(node, 0) == 0:
            detect_cycles(node)
    for node in bpmn_nodes:
        if visit_state.get(node, 0) == 0:
            detect_cycles(node)

    ranks = {node: 0 for node in bpmn_nodes}
    queue = list(start_nodes)
    queued = set(queue)
    while queue:
        curr = queue.pop(0)
        queued.discard(curr)
        for flow in outgoing_by_node.get(curr, []):
            if flow in cyclic_flows:
                continue
            tgt = flow.get_target()
            next_rank = ranks[curr] + 1
            if ranks.get(tgt, 0) < next_rank:
                ranks[tgt] = next_rank
                if tgt not in queued:
                    queue.append(tgt)
                    queued.add(tgt)
            
    react_flow_nodes = []
    lane_nodes_by_x = {}
    
    for node_id, node in node_by_id.items():
        pool, lane, annotations, systems, variables = node_metadata[node_id]
        
        # Calculate React Flow type
        if isinstance(node, BPMN.StartEvent):
            rf_type = "start"
            label = "Início"
        elif isinstance(node, BPMN.EndEvent):
            rf_type = "end"
            label = "Fim"
        elif isinstance(node, BPMN.ExclusiveGateway):
            rf_type = "exclusiveGateway"
            label = "XOR"
        elif isinstance(node, BPMN.ParallelGateway):
            rf_type = "parallelGateway"
            label = "AND"
        elif isinstance(node, BPMN.Task):
            rf_type = "task"
            label = node.get_name()
        else:
            rf_type = "task"
            label = getattr(node, "get_name", lambda: "Activity")() or "Activity"

        # Check if we have an existing node to reuse data/id
        existing_node = None
        if current_nodes:
            for en in current_nodes:
                if en.get("type") == rf_type and en.get("data", {}).get("label") == label:
                    # Found a match!
                    existing_node = en
                    break
        
        if existing_node:
            node_id_final = existing_node["id"]
        else:
            node_id_final = node_id

        # Grid Coordinates
        x = ranks[node] * 300 + 80
        y = lane_positions[(pool, lane)]['y_center'] - 30

        key = (pool, lane)
        if key not in lane_nodes_by_x:
            lane_nodes_by_x[key] = []
        lane_nodes_by_x[key].append((x, node_id_final))

        # We prefer the newly generated annotations, systems, variables if they are provided,
        # otherwise we fallback to the existing ones.
        final_annotations = annotations if annotations else (existing_node.get("data", {}).get("annotations", "") if existing_node else "")
        final_systems = systems if systems and len(systems) > 0 else (existing_node.get("data", {}).get("systems", []) if existing_node else [])
        final_variables = variables if variables and len(variables) > 0 else (existing_node.get("data", {}).get("variables", []) if existing_node else [])
        
        if existing_node:
            react_flow_nodes.append({
                'id': node_id_final,
                'type': rf_type,
                'position': existing_node.get("position", {'x': x, 'y': y}), # Keep user modified position
                'data': {
                    'label': label,
                    'pool': pool,
                    'lane': lane,
                    'annotations': final_annotations,
                    'systems': final_systems,
                    'variables': final_variables,
                    'executionType': existing_node.get("data", {}).get("executionType", "Manual"),
                    'rank': ranks[node]
                }
            })
        else:
            react_flow_nodes.append({
                'id': node_id_final,
                'type': rf_type,
                'position': {'x': x, 'y': y},
                'data': {
                    'label': label,
                    'pool': pool,
                    'lane': lane,
                    'annotations': final_annotations,
                    'systems': final_systems,
                    'variables': final_variables,
                    'executionType': 'Manual' if rf_type == 'task' else '',
                    'rank': ranks[node]
                }
            })
        
        # Override the node_id in node_to_id so edges use the new ID
        node_to_id[node] = node_id_final

    # Collision resolution for nodes in the exact same spot
    for key, nodes_info in lane_nodes_by_x.items():
        x_groups = {}
        for x, nid in nodes_info:
            if x not in x_groups:
                x_groups[x] = []
            x_groups[x].append(nid)
            
        center_y = lane_positions[key]['y_center'] - 30
        for x, nids in x_groups.items():
            if len(nids) > 1:
                for idx, nid in enumerate(nids):
                    offset = (idx - (len(nids) - 1) / 2) * 95
                    for n in react_flow_nodes:
                        if n['id'] == nid:
                            n['position']['y'] = center_y + offset

    # 8. Convert edges/flows to React Flow format
    react_flow_edges = []
    metadata_by_final_id = {}
    for node_id, node in node_by_id.items():
        final_id = node_to_id.get(node, node_id)
        metadata_by_final_id[final_id] = node_metadata[node_id]

    for i, flow in enumerate(bpmn_flows):
        src = flow.get_source()
        tgt = flow.get_target()
        if src in node_to_id and tgt in node_to_id:
            src_id = node_to_id[src]
            tgt_id = node_to_id[tgt]
            
            # Simple unique ID for the edge
            edge_id = f"edge_{i}"
            
            # Apply BPMN 2.0 rule: Sequence flow cannot cross pools. Use messageFlow.
            src_pool = metadata_by_final_id[src_id][0]
            tgt_pool = metadata_by_final_id[tgt_id][0]
            
            is_message_flow = src_pool != tgt_pool
            is_backflow = (flow in cyclic_flows) or (ranks.get(src, 0) >= ranks.get(tgt, 0) and not is_message_flow)
            edge_type = 'smoothstep'
            stroke_color = '#94a3b8' if is_message_flow else ('#d97706' if is_backflow else '#64748b')
            stroke_dash = '5 5' if (is_message_flow or is_backflow) else 'none'
            label = getattr(flow, "get_name", lambda: "")() or None
            
            edge_data = {
                'id': edge_id,
                'source': src_id,
                'target': tgt_id,
                'type': edge_type,
                'animated': not is_message_flow and not is_backflow,
                'style': {'stroke': stroke_color, 'strokeWidth': 2, 'strokeDasharray': stroke_dash}
            }
            if is_backflow:
                edge_data.update({
                    'sourceHandle': 's-bottom',
                    'targetHandle': 't-left',
                    'label': label or 'retorno',
                    'labelStyle': {'fill': '#92400e', 'fontWeight': 700},
                    'labelBgStyle': {'fill': '#fffbeb', 'fillOpacity': 0.95},
                })
            elif is_message_flow:
                edge_data.update({
                    'sourceHandle': 's-bottom',
                    'targetHandle': 't-top',
                    'label': label or 'mensagem',
                    'labelStyle': {'fill': '#475569', 'fontWeight': 700},
                    'labelBgStyle': {'fill': '#f8fafc', 'fillOpacity': 0.95},
                })
            else:
                edge_data.update({
                    'sourceHandle': 's-right',
                    'targetHandle': 't-left',
                })
                if label:
                    edge_data['label'] = label

            react_flow_edges.append(edge_data)

    return {
        'nodes': react_flow_nodes,
        'edges': react_flow_edges,
        'swimlanes': swimlane_layout
    }

import xml.etree.ElementTree as ET
from typing import Dict, Any

def generate_bpmn_xml(title: str, react_flow_data: Dict[str, Any]) -> str:
    """
    Converts ReactFlow nodes and edges into a standard BPMN 2.0 XML.
    Includes BPMNDI for visualization in Bizagi or Camunda.
    """
    nodes = react_flow_data.get('nodes', [])
    edges = react_flow_data.get('edges', [])
    
    # BPMN namespaces
    ns = {
        'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
        'bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
        'dc': 'http://www.omg.org/spec/DD/20100524/DC',
        'di': 'http://www.omg.org/spec/DD/20100524/DI'
    }
    
    ET.register_namespace('', ns['bpmn'])
    ET.register_namespace('bpmndi', ns['bpmndi'])
    ET.register_namespace('dc', ns['dc'])
    ET.register_namespace('di', ns['di'])

    definitions = ET.Element(f"{{{ns['bpmn']}}}definitions", {
        'id': 'Definitions_1',
        'targetNamespace': 'http://bpmn.io/schema/bpmn',
        'exporter': 'Cresol Process Mining Platform',
        'exporterVersion': '1.0'
    })

    process_id = "Process_1"
    process = ET.SubElement(definitions, f"{{{ns['bpmn']}}}process", id=process_id, isExecutable="false")

    # BPMNDI
    bpmndi = ET.SubElement(definitions, f"{{{ns['bpmndi']}}}BPMNDiagram", id="BPMNDiagram_1")
    bpmnplane = ET.SubElement(bpmndi, f"{{{ns['bpmndi']}}}BPMNPlane", id="BPMNPlane_1", bpmnElement=process_id)

    # Dictionaries to map ReactFlow types to BPMN types
    type_map = {
        'startEvent': 'startEvent',
        'endEvent': 'endEvent',
        'task': 'task',
        'exclusiveGateway': 'exclusiveGateway',
        'parallelGateway': 'parallelGateway'
    }

    # Dimensions for BPMNDI
    dim_map = {
        'startEvent': (36, 36),
        'endEvent': (36, 36),
        'task': (100, 80),
        'exclusiveGateway': (50, 50),
        'parallelGateway': (50, 50)
    }

    # Add Nodes
    for node in nodes:
        node_id = node['id']
        node_type = type_map.get(node.get('type'), 'task')
        label = node.get('data', {}).get('label', '')
        
        # BPMN Element
        elem = ET.SubElement(process, f"{{{ns['bpmn']}}}{node_type}", id=node_id, name=label)
        
        # Incoming/Outgoing will be populated later
        
        # BPMNDI Shape
        pos = node.get('position', {'x': 0, 'y': 0})
        w, h = dim_map.get(node_type, (100, 80))
        
        shape = ET.SubElement(bpmnplane, f"{{{ns['bpmndi']}}}BPMNShape", id=f"{node_id}_di", bpmnElement=node_id)
        bounds = ET.SubElement(shape, f"{{{ns['dc']}}}Bounds", x=str(pos['x']), y=str(pos['y']), width=str(w), height=str(h))

    # Add Edges (SequenceFlows)
    for edge in edges:
        edge_id = edge['id']
        source = edge['source']
        target = edge['target']
        
        # BPMN Element
        seq_flow = ET.SubElement(process, f"{{{ns['bpmn']}}}sequenceFlow", id=edge_id, sourceRef=source, targetRef=target)
        
        # Add incoming/outgoing refs to nodes
        source_node = process.find(f"*[@id='{source}']")
        target_node = process.find(f"*[@id='{target}']")
        
        if source_node is not None:
            ET.SubElement(source_node, f"{{{ns['bpmn']}}}outgoing").text = edge_id
        if target_node is not None:
            ET.SubElement(target_node, f"{{{ns['bpmn']}}}incoming").text = edge_id
            
        # BPMNDI Edge
        # We need a simple path. We'll draw a straight line from source center to target center
        source_pos = next((n['position'] for n in nodes if n['id'] == source), {'x': 0, 'y': 0})
        target_pos = next((n['position'] for n in nodes if n['id'] == target), {'x': 100, 'y': 100})
        
        edge_di = ET.SubElement(bpmnplane, f"{{{ns['bpmndi']}}}BPMNEdge", id=f"{edge_id}_di", bpmnElement=edge_id)
        ET.SubElement(edge_di, f"{{{ns['di']}}}waypoint", x=str(source_pos['x']+50), y=str(source_pos['y']+40))
        ET.SubElement(edge_di, f"{{{ns['di']}}}waypoint", x=str(target_pos['x']+50), y=str(target_pos['y']+40))

    xml_str = ET.tostring(definitions, encoding='utf-8', xml_declaration=True).decode('utf-8')
    return xml_str

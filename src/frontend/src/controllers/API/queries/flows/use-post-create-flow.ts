import { writeFile } from 'fs';
import useFlowStore from "@/stores/flowStore";
import { useTypesStore } from "@/stores/typesStore";
import { Node, Edge } from "@xyflow/react";
import { AllNodeType, EdgeType, sourceHandleType, targetHandleType } from "@/types/flow";
import { updateEdgesHandleIds } from "@/utils/reactflowUtils";
import { scapedJSONStringfy } from "@/utils/reactflowUtils";

export async function createFlowFromJson(flowJson: {
  nodes: Array<Node>;
  edges: Array<Edge>;
}): Promise<void> {
  const { nodes, edges } = flowJson;
  console.log("[createFlowFromJson] Received nodes:", nodes);
  console.log("[createFlowFromJson] Received edges:", edges);
  const templates = useTypesStore.getState().templates;
  console.log(templates);
  const openAITemplates = Object.keys(templates).filter(key => key.toLowerCase().includes("openai"));
  console.log("Templates with 'OpenAI' in the name:", openAITemplates.map(key => ({ key, template: templates[key] })));
  
  // Convert simple node types to match template keys (more flexible lookup)
  const getTemplateKey = (nodeType: string): string => {
    if (!nodeType) return "ChatMessage"; // Default if no type provided
    
    // Try direct match first
    if (templates[nodeType]) return nodeType;
    
    // Try case-insensitive match
    const lowerType = nodeType.toLowerCase();
    for (const key in templates) {
      if (key.toLowerCase() === lowerType) return key;
    }
    
    // Try matching by display name
    for (const key in templates) {
      if (templates[key].display_name?.toLowerCase() === lowerType) return key;
    }
    
    console.warn(`Could not find template for type "${nodeType}", using default template`);
    return "ChatMessage"; // Use a sensible default if available
  };
  
  // Map nodes with better template matching
  const mappedNodes: AllNodeType[] = nodes.map((node) => {
    const templateKey = getTemplateKey(node.type || "");
    const nodeTemplate = templates[templateKey] || {};
    
    return {
      id: node.id,
      type: "genericNode",
      position: node.position || { x: 0, y: 0 },
      data: {
        ...(node.data || {}),
        type: templateKey,
        id: node.id,
        node: {
          ...nodeTemplate,
          ...(node.data?.node || {}),
        },
      },
    };
  });

  // Map edges with dynamic output/input detection
  const mappedEdges: EdgeType[] = edges.map((edge) => {
    const sourceNode = mappedNodes.find(n => n.id === edge.source);
    const targetNode = mappedNodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      console.warn(`Edge ${edge.id} has missing source or target node, skipping proper configuration`);
      return {
        id: edge.id || `edge-${Math.random().toString(36).substr(2, 9)}`,
        source: edge.source,
        target: edge.target,
        type: "default",
        data: {},
      } as EdgeType;
    }
    
    // Get first available output from source node or use default
    const outputInfo = sourceNode?.data?.node?.outputs?.[0] || {
      name: "message",
      types: ["Message"]
    };
    
    // Determine the correct input field by matching output types against field_order
    const rawFieldOrder = (targetNode.data.node as any).field_order;
    let fieldOrder = 'input_value';
    if (Array.isArray(rawFieldOrder) && rawFieldOrder.length > 0) {
      const templateFields = (targetNode.data.node as any).template || {};
      // Find a field whose input_types match the source output types
      const match = rawFieldOrder.find(
        (f: string) => Array.isArray(templateFields[f]?.input_types)
          && templateFields[f].input_types.some((t: string) => outputInfo.types.includes(t))
      );
      fieldOrder = match || rawFieldOrder[0];
    }
    
    // Create proper handle objects that match the app's expected format
    const sourceHandle: sourceHandleType = {
      dataType: sourceNode.data.type,
      id: sourceNode.id,
      name: outputInfo.name,
      output_types: outputInfo.types
    };
    
    const targetHandle: targetHandleType = {
      fieldName: fieldOrder,
      id: targetNode.id,
      inputTypes: (targetNode.data.node?.template?.[fieldOrder]?.input_types || outputInfo.types),
      type: (targetNode.data.node?.template?.[fieldOrder]?.type || "str")
    };
    
    // Create the edge with properly escaped handle identifiers
    try {
      // Use the scapedJSONStringfy utility for proper edge handle formatting
      return {
        id: `reactflow__edge-${edge.source}${scapedJSONStringfy(sourceHandle)}-${edge.target}${scapedJSONStringfy(targetHandle)}`,
        source: edge.source,
        target: edge.target,
        type: "default",
        sourceHandle: scapedJSONStringfy(sourceHandle),
        targetHandle: scapedJSONStringfy(targetHandle),
        data: { sourceHandle, targetHandle }
      } as EdgeType;
    } catch (error) {
      console.error("Error creating edge:", error);
      return {
        id: edge.id || `edge-${Math.random().toString(36).substr(2, 9)}`,
        source: edge.source,
        target: edge.target,
        type: "default",
        data: {},
      } as EdgeType;
    }
  });

  // Update flow store with nodes and edges
  console.log("[createFlowFromJson] Setting nodes and edges in store");
  const flowStore = useFlowStore.getState();
  flowStore.setNodes(mappedNodes);
  console.log("[createFlowFromJson] Nodes set");
  
  // Add edges directly - no need for updateEdgesHandleIds since we've properly formatted the handles
  flowStore.setEdges(mappedEdges);
  console.log("[createFlowFromJson] Edges set in store");
}
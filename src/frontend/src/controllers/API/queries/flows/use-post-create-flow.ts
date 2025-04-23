import useFlowStore from "@/stores/flowStore";
import { useTypesStore } from "@/stores/typesStore";
import { Node, Edge } from "@xyflow/react";
import { AllNodeType, EdgeType } from "@/types/flow";

export async function createFlowFromJson(flowJson: {
  nodes: Array<Node>;
  edges: Array<Edge>;
}): Promise<void> {
  const { nodes, edges } = flowJson;
  const templates = useTypesStore.getState().templates;
  const openAITemplates = Object.keys(templates).filter(key => key.toLowerCase().includes("openai"));
  console.log("Templates with 'OpenAI' in the name:", openAITemplates.map(key => ({ key, template: templates[key] })));
  
  // Convert simple node types to match template keys (more flexible lookup)
  const getTemplateKey = (nodeType: string): string => {
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
    const templateKey = getTemplateKey(node.type);
    const nodeTemplate = templates[templateKey];
    
    return {
      id: node.id,
      type: "genericNode",
      position: node.position,
      data: {
        ...node.data,
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
    
    // Get first available output from source node or use default
    const outputInfo = sourceNode?.data?.node?.outputs?.[0] || {
      name: "message",
      types: ["Message"]
    };
    
    // Get first input field from target node or use default
    const inputField = targetNode?.data?.node?.field_order?.[0] || "input_value";
    
    const sourceHandle = {
      dataType: sourceNode.data.type,
      id: sourceNode.id,
      name: outputInfo.name,
      output_types: outputInfo.types
    };
    
    const targetHandle = {
      fieldName: inputField,
      id: targetNode.id,
      inputTypes: outputInfo.types, // Match input with output types
      type: "str"
    };
    
    return {
      ...edge,
      type: edge.type || "default",
      sourceHandle: JSON.stringify(sourceHandle).replace(/"/g, "œ"),
      targetHandle: JSON.stringify(targetHandle).replace(/"/g, "œ"),
      data: { sourceHandle, targetHandle }
    };
  });

  // Update flow store
  useFlowStore.setState(() => ({
    nodes: mappedNodes,
    edges: mappedEdges,
  }));
}
import { writeFile } from 'fs';
import useFlowStore from "@/stores/flowStore";
import { useTypesStore } from "@/stores/typesStore";
import { Node, Edge } from "@xyflow/react";
import { AllNodeType, EdgeType, sourceHandleType, targetHandleType } from "@/types/flow";
import { updateEdgesHandleIds } from "@/utils/reactflowUtils";
import { scapedJSONStringfy } from "@/utils/reactflowUtils";
import useAlertStore from "@/stores/alertStore";
import { isValidConnection } from "@/utils/reactflowUtils"; // Add this import at the top

export async function createFlowFromJson(flowJson: {
  nodes: Array<Node>;
  edges: Array<Edge>;
}): Promise<void> {
  const { nodes, edges } = flowJson;
  console.log("[createFlowFromJson] Received nodes:", nodes);
  console.log("[createFlowFromJson] Received edges:", edges);
  
  const templates = useTypesStore.getState().templates;
  console.log("[createFlowFromJson] Available templates:", Object.keys(templates));
  
  // Check if we have templates loaded
  if (!templates || Object.keys(templates).length === 0) {
    console.error("[createFlowFromJson] No templates available. Templates must be loaded before creating flows.");
    useAlertStore.getState().setErrorData({
      title: "Error creating flow",
      list: ["No component templates are loaded. Please try refreshing the page."]
    });
    throw new Error("No templates available");
  }
  
  // Create a simplified representation of available templates for debugging
  const templateKeys = Object.keys(templates).map(key => key.toLowerCase());
  console.log("[createFlowFromJson] Available template keys (lowercase):", templateKeys);
  
  // Convert simple node types to match template keys (more flexible lookup)
  const getTemplateKey = (nodeType: string): string => {
    if (!nodeType) {
      console.warn("[createFlowFromJson] Node has no type, using default");
      return "ChatMessage"; // Default if no type provided
    }
    
    // Try direct match first
    if (templates[nodeType]) {
      console.log(`[createFlowFromJson] Found exact template match for "${nodeType}"`);
      return nodeType;
    }
    
    // Try case-insensitive match
    const lowerType = nodeType.toLowerCase();
    for (const key in templates) {
      if (key.toLowerCase() === lowerType) {
        console.log(`[createFlowFromJson] Found case-insensitive match for "${nodeType}" -> "${key}"`);
        return key;
      }
    }
    
    // Try matching by display name
    for (const key in templates) {
      if (templates[key].display_name?.toLowerCase() === lowerType) {
        console.log(`[createFlowFromJson] Found display_name match for "${nodeType}" -> "${key}"`);
        return key;
      }
    }
    
    // Try partial matching (as a last resort)
    for (const key in templates) {
      if (key.toLowerCase().includes(lowerType) || lowerType.includes(key.toLowerCase())) {
        console.log(`[createFlowFromJson] Found partial match for "${nodeType}" -> "${key}"`);
        return key;
      }
    }
    
    console.warn(`[createFlowFromJson] Could not find template for type "${nodeType}", using ChatOpenAI as fallback`);
    
    // Look for a reasonable fallback based on the type
    if (lowerType.includes("chat") || lowerType.includes("message")) {
      return "ChatMessage";
    } else if (lowerType.includes("openai") || lowerType.includes("llm") || lowerType.includes("model")) {
      return "ChatOpenAI";
    } else {
      // Return a template we know exists
      const fallbackKeys = ["ChatOpenAI", "ChatMessage", "PromptTemplate", "StringNode"];
      for (const key of fallbackKeys) {
        if (templates[key]) {
          return key;
        }
      }
      // Last resort - first available template
      return Object.keys(templates)[0];
    }
  };
  
  try {
    // Map nodes with better template matching
    const mappedNodes: AllNodeType[] = nodes.map((node) => {
      const nodeId = node.id || `node-${Math.random().toString(36).substring(2, 9)}`;
      const templateKey = getTemplateKey(node.type || "");
      const nodeTemplate = templates[templateKey] || {};
      
      console.log(`[createFlowFromJson] Mapping node "${nodeId}" (type: "${node.type}") to template "${templateKey}"`);
      
      return {
        id: nodeId,
        type: "genericNode",
        position: node.position || { x: 0, y: 0 },
        data: {
          ...(node.data || {}),
          type: templateKey,
          id: nodeId,
          node: {
            ...nodeTemplate,
            ...(node.data?.node || {}),
          },
        },
      };
    });

    console.log("[createFlowFromJson] Mapped nodes:", mappedNodes);

    // Map edges with dynamic output/input detection
    const mappedEdges: EdgeType[] = edges.map((edge, index) => {
      const edgeId = edge.id || `edge-${index}-${Math.random().toString(36).substring(2, 9)}`;
      console.log(`[createFlowFromJson] Processing edge "${edgeId}" from ${edge.source} to ${edge.target}`);
      
      const sourceNode = mappedNodes.find(n => n.id === edge.source);
      const targetNode = mappedNodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) {
        console.warn(`[createFlowFromJson] Edge ${edgeId} has missing source or target node, creating simplified edge`);
        return {
          id: edgeId,
          source: edge.source,
          target: edge.target,
          type: "default",
          data: {},
        } as EdgeType;
      }
      
      // Get first available output from source node or use default
      const sourceOutputs = sourceNode?.data?.node?.outputs || [];
      const outputInfo = sourceOutputs[0] || {
        name: "message",
        types: ["Message"]
      };
      
      console.log(`[createFlowFromJson] Source node "${edge.source}" outputs:`, sourceOutputs);
      
      // Determine the correct input field by matching output types against field_order
      const targetNodeTemplate = targetNode.data.node || {};
      const rawFieldOrder = targetNodeTemplate.field_order || [];
      const targetTemplateFields = targetNodeTemplate.template || {};
      
      console.log(`[createFlowFromJson] Target node "${edge.target}" field_order:`, rawFieldOrder);
      console.log(`[createFlowFromJson] Target node "${edge.target}" template fields:`, Object.keys(targetTemplateFields));
      
      let fieldOrder = 'input_value';
      
      if (Array.isArray(rawFieldOrder) && rawFieldOrder.length > 0) {
        // Find a field whose input_types match the source output types
        const match = rawFieldOrder.find(
          (f: string) => Array.isArray(targetTemplateFields[f]?.input_types)
            && targetTemplateFields[f].input_types.some((t: string) => outputInfo.types.includes(t))
        );
        fieldOrder = match || rawFieldOrder[0];
      }
      
      console.log(`[createFlowFromJson] Selected target field "${fieldOrder}" for edge ${edgeId}`);
      
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
        inputTypes: (targetTemplateFields[fieldOrder]?.input_types || outputInfo.types),
        type: (targetTemplateFields[fieldOrder]?.type || "str")
      };

          // Create stringified handles for validation
        const sourceHandleStr = scapedJSONStringfy(sourceHandle);
        const targetHandleStr = scapedJSONStringfy(targetHandle);
        
        // Validate the connection
        const connectionToValidate = {
          source: sourceNode.id,
          target: targetNode.id,
          sourceHandle: sourceHandleStr,
          targetHandle: targetHandleStr
        };
        
        const isValid = isValidConnection(connectionToValidate, mappedNodes, []);

        if (!isValid) {
          console.warn(`[createFlowFromJson] Invalid connection between ${sourceNode.id} and ${targetNode.id}`);
        }
      
      // Create the edge with properly escaped handle identifiers
      try {
        // Use the scapedJSONStringfy utility for proper edge handle formatting
        const formattedEdge = {
          id: `reactflow__edge-${edge.source}${scapedJSONStringfy(sourceHandle)}-${edge.target}${scapedJSONStringfy(targetHandle)}`,
          source: edge.source,
          target: edge.target,
          type: "default",
          sourceHandle: scapedJSONStringfy(sourceHandle),
          targetHandle: scapedJSONStringfy(targetHandle),
          data: { sourceHandle, targetHandle }
        } as EdgeType;
        
        console.log(`[createFlowFromJson] Created edge ${formattedEdge.id}`);
        return formattedEdge;
      } catch (error) {
        console.error(`[createFlowFromJson] Error creating edge ${edgeId}:`, error);
        return {
          id: edgeId,
          source: edge.source,
          target: edge.target,
          type: "default",
          data: {},
        } as EdgeType;
      }
    });

    console.log("[createFlowFromJson] Mapped edges:", mappedEdges);

    // Update flow store with nodes and edges
    console.log("[createFlowFromJson] Setting nodes and edges in store");
    const flowStore = useFlowStore.getState();
    flowStore.setNodes(mappedNodes);
    console.log("[createFlowFromJson] Nodes set");
    
    // Add edges directly - no need for updateEdgesHandleIds since we've properly formatted the handles
    flowStore.setEdges(mappedEdges);
    console.log("[createFlowFromJson] Edges set in store");
    
    // Success!
    return Promise.resolve();
  } catch (error) {
    console.error("[createFlowFromJson] Error creating flow:", error);
    useAlertStore.getState().setErrorData({
      title: "Error creating flow",
      list: [(error as Error).message || "An unknown error occurred while creating the flow"]
    });
    return Promise.reject(error);
  }
}
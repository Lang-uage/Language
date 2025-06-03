import useFlowStore from "@/stores/flowStore";
import { AllNodeType, EdgeType } from "@/types/flow";

/**
 * Programmatically creates an edge between two nodes, replicating the logic
 * used when a user manually connects nodes in the canvas.
 * @param sourceId - The ID of the source node
 * @param targetId - The ID of the target node
 */
export function addEdgeBetweenNodes(sourceId: string, targetId: string): void {
  const state = useFlowStore.getState();
  const mappedNodes = state.nodes as AllNodeType[];
  const existingEdges = state.edges as EdgeType[];

  // Find source and target nodes
  const sourceNode = mappedNodes.find((n) => n.id === sourceId);
  const targetNode = mappedNodes.find((n) => n.id === targetId);

  if (!sourceNode || !targetNode) {
    console.warn(
      `Cannot create edge: missing source or target node (source=${sourceId}, target=${targetId})`
    );
    // Fallback: create a default edge with no handle data
    const fallbackEdge: EdgeType = {
      id: `edge-${Math.random().toString(36).substr(2, 9)}`,
      source: sourceId,
      target: targetId,
      type: "default",
      data: {},
    };
    useFlowStore.setState({ edges: [...existingEdges, fallbackEdge] });
    return;
  }

  // Determine output info from source node or use default
  const outputInfo =
    sourceNode.data.node.outputs?.[0] || { name: "message", types: ["Message"] };

  // Determine the correct input field by matching output types against field_order
  const rawFieldOrder = (targetNode.data.node as any).field_order;
  let fieldOrder = "input_value";
  if (Array.isArray(rawFieldOrder) && rawFieldOrder.length > 0) {
    const templateFields = (targetNode.data.node as any).template || {};
    const match = rawFieldOrder.find(
      (f: string) => Array.isArray(templateFields[f]?.input_types)
        && templateFields[f].input_types.some((t: string) => outputInfo.types.includes(t))
    );
    fieldOrder = match || rawFieldOrder[0];
  }

  // Construct handle objects
  const sourceHandle = {
    dataType: sourceNode.data.type || "unknown",
    id: sourceNode.id,
    name: outputInfo.name,
    output_types: outputInfo.types,
  };

  const targetHandle = {
    fieldName: fieldOrder,
    id: targetNode.id,
    inputTypes: outputInfo.types,
    type: "str",
  };

  // Create a new EdgeType entry, serializing handle objects to strings
  const newEdge: EdgeType = {
    id: `edge-${Math.random().toString(36).substr(2, 9)}`,
    source: sourceId,
    target: targetId,
    type: "default",
    sourceHandle: JSON.stringify(sourceHandle).replace(/"/g, "œ"),
    targetHandle: JSON.stringify(targetHandle).replace(/"/g, "œ"),
    data: { sourceHandle, targetHandle },
  };

  // Update store to include the new edge
  useFlowStore.setState({ edges: [...existingEdges, newEdge] });
}

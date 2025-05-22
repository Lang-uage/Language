import { fetchFlowFromBackend } from "@/controllers/API/queries/flows/use-get-flow";
import { createFlowFromJson } from "@/controllers/API/queries/flows/use-post-create-flow";

export async function fetchAndCreateFlow(flowId: string, useCase?: string): Promise<void> {
  try {
    // Fetch the flow JSON from the backend
    const response = await fetchFlowFromBackend(flowId, useCase);
    console.log("Fetched response:", response);
    
    // Extract the flow_json property from the response
    if (!response || !response.flow_json) {
      throw new Error("Invalid response format: missing flow_json property");
    }
    
    // Extract the nodes and edges from the flow_json property
    const flowJson = response.flow_json;
    console.log("Extracted flow_json:", flowJson);

    // Pass the flow_json (which contains nodes and edges) to createFlowFromJson
    await createFlowFromJson(flowJson);

    console.log("Flow fetched and created successfully!");
  } catch (error) {
    console.error("Error fetching and creating flow:", error);
    throw error;
  }
}
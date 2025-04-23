import { fetchFlowFromBackend } from "@/controllers/API/queries/flows/use-get-flow";
import { createFlowFromJson } from "@/controllers/API/queries/flows/use-post-create-flow";

export async function fetchAndCreateFlow(flowId: string): Promise<void> {
  try {
    // Fetch the flow JSON from the backend
    const flowJson = await fetchFlowFromBackend(flowId);
    console.log("Fetched flow JSON:", flowJson);

    // Pass the fetched JSON to createFlowFromJson
    await createFlowFromJson(flowJson);

    console.log("Flow fetched and created successfully!");
  } catch (error) {
    console.error("Error fetching and creating flow:", error);
    throw error;
  }
}
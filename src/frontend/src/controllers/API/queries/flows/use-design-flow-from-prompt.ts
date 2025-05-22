import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { createFlowFromJson } from "./use-post-create-flow";
import useAlertStore from "@/stores/alertStore";

// Define the request and response interfaces
interface DesignFlowRequest {
  prompt: string;
  api_provider: string;
}

interface DesignFlowResponse {
  flow_json: {
    nodes: any[];
    edges: any[];
  };
  message?: string;
}

// External backend URL for the design endpoint
const DESIGN_API_URL = "http://localhost:8001/design";

/**
 * Hook to generate a flow from a natural language prompt
 * @returns A mutation function that takes a prompt and generates a flow
 */
export function useDesignFlowFromPrompt() {
  const setErrorData = useAlertStore((state) => state.setErrorData);

  const designFlowMutation = useMutation<DesignFlowResponse, Error, DesignFlowRequest>({
    mutationFn: async (request: DesignFlowRequest) => {
      try {
        console.log("Sending request to design endpoint:", JSON.stringify(request));
        
        // Make API call to the external design endpoint
        const response = await axios.post(
          DESIGN_API_URL,
          {
            prompt: request.prompt,
            api_provider: "openai"
          },
          {
            headers: {
              "Content-Type": "application/json"
            },
            timeout: 120000 // 2 minutes timeout
          }
        );
        
        console.log("Received response from design endpoint:", response.status);
        console.log("Response data:", JSON.stringify(response.data, null, 2));
        
        if (!response.data?.flow_json) {
          console.error("Invalid response format - missing flow_json:", response.data);
          throw new Error("Invalid response format from design endpoint - missing flow_json");
        }
        
        if (!Array.isArray(response.data.flow_json.nodes) || !Array.isArray(response.data.flow_json.edges)) {
          console.error("Invalid flow_json structure - nodes or edges not an array:", response.data.flow_json);
          throw new Error("Invalid flow_json structure - nodes or edges not an array");
        }
        
        return response.data;
      } catch (error: any) {
        console.error("Error designing flow from prompt:", error);
        
        // More detailed error logging
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("Error response data:", error.response.data);
          console.error("Error response status:", error.response.status);
          console.error("Error response headers:", error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          console.error("Error request:", error.request);
        }
        
        setErrorData({
          title: "Error generating flow from prompt",
          list: [
            error.response?.data?.detail || 
            error.message || 
            "Could not connect to design service. Please ensure the design service is running on " + DESIGN_API_URL
          ],
        });
        throw error;
      }
    },
  });

  return designFlowMutation;
}

/**
 * Utility function to design and create a flow from a prompt in one step
 * This can be used directly in components without managing the intermediate steps
 * @param prompt The natural language prompt describing the flow to create
 * @returns A promise that resolves when the flow is created
 */
export async function designAndCreateFlow(prompt: string): Promise<void> {
  const alertStore = useAlertStore.getState();
  
  try {
    console.log("Designing flow from prompt:", prompt);
    
    // Call the external design endpoint to get the flow structure
    const response = await axios.post<DesignFlowResponse>(
      DESIGN_API_URL,
      { 
        prompt: prompt,
        api_provider: "openai" 
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 120000 // 2 minutes timeout
      }
    );
    
    console.log("Design response status:", response.status);
    console.log("Design response data:", JSON.stringify(response.data, null, 2));
    
    // Validate response structure
    if (!response.data || !response.data.flow_json) {
      console.error("Invalid response data structure - missing flow_json:", response.data);
      throw new Error("Invalid response from design endpoint - missing flow_json");
    }
    
    if (!Array.isArray(response.data.flow_json.nodes) || !Array.isArray(response.data.flow_json.edges)) {
      console.error("Invalid flow_json structure - nodes or edges not an array:", response.data.flow_json);
      throw new Error("Invalid flow_json structure - nodes or edges not an array");
    }
    
    // Ensure nodes have the required properties for createFlowFromJson
    const validatedFlowJson = {
      nodes: response.data.flow_json.nodes.map(node => ({
        id: node.id || `node-${Math.random().toString(36).substring(2, 9)}`,
        type: node.type || "generic",
        position: node.position || { x: 0, y: 0 },
        data: node.data || {}
      })),
      edges: response.data.flow_json.edges.map(edge => ({
        id: edge.id || `edge-${Math.random().toString(36).substring(2, 9)}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    };
    
    console.log("Validated flow JSON:", JSON.stringify(validatedFlowJson, null, 2));
    
    // Then create the flow from the validated JSON
    await createFlowFromJson(validatedFlowJson);
    console.log("Flow created successfully from prompt");
    
  } catch (error: any) {
    console.error("Error in designAndCreateFlow:", error);
    
    // More detailed error logging
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Error request:", error.request);
    }
    
    alertStore.setErrorData({
      title: "Sorry, I encountered an error while creating your flow",
      list: [
        "There was an issue processing the flow data. Please try again or contact support.",
        error.response?.data?.detail || 
        error.message || 
        "Failed to connect to the design service at " + DESIGN_API_URL
      ],
    });
    throw error;
  }
} 
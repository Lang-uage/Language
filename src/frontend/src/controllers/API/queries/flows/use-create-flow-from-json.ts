import { useMutation } from "@tanstack/react-query";
import { createFlowFromJson } from "./use-post-create-flow";
import useFlowStore from "@/stores/flowStore";

// Define the JSON structure for component definitions and edge connections
interface FlowJsonDefinition {
  componentNames: string[];
  edges: Array<{
    source: string;
    sourceOutput?: string;
    target: string;
    targetInput?: string;
  }>;
  startPosition?: { x: number, y: number };
  horizontalSpacing?: number;
}

/**
 * Hook for creating a flow from a JSON definition
 * 
 * @returns A mutation function that creates a flow from a JSON definition
 */
export function useCreateFlowFromJson() {
  return useMutation({
    mutationKey: ["createFlowFromJson"],
    
    mutationFn: async (flowJson: FlowJsonDefinition) => {
      console.group("🌊 useCreateFlowFromJson - Creating flow from JSON");
      console.time("Hook flow creation time");
      
      try {
        console.log("📥 Initial JSON:", JSON.stringify(flowJson, null, 2));
        
        // Additional validation
        if (!flowJson.componentNames || !Array.isArray(flowJson.componentNames) || flowJson.componentNames.length === 0) {
          console.error("❌ Invalid componentNames: Must be a non-empty array");
          throw new Error("componentNames must be a non-empty array");
        }
        
        // Log current state of the flow store
        const initialState = useFlowStore.getState();
        console.log("📊 Initial flow store state:", {
          nodes: initialState.nodes.length,
          edges: initialState.edges.length
        });
        
        // Process the flow creation
        console.log("⏳ Starting flow creation process...");
        await createFlowFromJson(flowJson);
        
        // Check the flow store after creation
        const newState = useFlowStore.getState();
        console.log("📊 Updated flow store state:", {
          nodes: newState.nodes.length,
          edges: newState.edges.length
        });
        
        // Check for potential issues
        if (newState.nodes.length === 0) {
          console.warn("⚠️ No nodes were created!");
        }
        
        if (flowJson.edges && flowJson.edges.length > 0 && newState.edges.length === 0) {
          console.warn("⚠️ Edges were defined but none were created!");
        }
        
        // Add a delay to check if edges persist
        setTimeout(() => {
          const afterTimeoutState = useFlowStore.getState();
          console.log("⏱️ Flow store state after timeout:", {
            nodes: afterTimeoutState.nodes.length, 
            edges: afterTimeoutState.edges.length
          });
          
          // Compare to see if edges were lost
          if (newState.edges.length > 0 && afterTimeoutState.edges.length === 0) {
            console.error("❌ CRITICAL: Edges were created but then disappeared!");
          }
        }, 1000);
        
        console.log("✅ Flow creation completed successfully");
        console.timeEnd("Hook flow creation time");
        console.groupEnd();
        
        return { success: true };
      } catch (error) {
        console.error("❌ Error in flow creation:", error);
        console.timeEnd("Hook flow creation time");
        console.groupEnd();
        throw error;
      }
    },
    
    // Add callbacks for better debugging
    onMutate: (variables) => {
      console.log("🔄 Mutation started with variables:", variables);
    },
    
    onError: (error, variables, context) => {
      console.error("❌ Mutation failed:", error);
    },
    
    onSuccess: (data, variables, context) => {
      console.log("✅ Mutation succeeded:", data);
    },
    
    onSettled: (data, error, variables, context) => {
      console.log("🏁 Mutation settled. Success:", !!data, "Error:", !!error);
    }
  });
}

// Example usage - export ready-to-use flow definitions
export const predefinedFlows = {
  // Example flow with TextInput connected to Qdrant
  textToQdrant: {
    componentNames: ["TextInput", "Qdrant"],
    edges: [
      {
        source: "TextInput",
        sourceOutput: "text",
        target: "Qdrant",
        targetInput: "search_query" 
      }
    ],
    startPosition: { x: 100, y: 200 },
    horizontalSpacing: 250
  },
  
  // Example flow with a chat and embedding setup
  chatWithEmbedding: {
    componentNames: ["ChatInput", "OpenAIEmbedding", "Qdrant", "ChatOpenAI", "ChatOutput"],
    edges: [
      {
        source: "ChatInput", 
        sourceOutput: "message",
        target: "OpenAIEmbedding", 
        targetInput: "text"
      },
      {
        source: "OpenAIEmbedding", 
        sourceOutput: "embedding",
        target: "Qdrant", 
        targetInput: "embedding_data"
      },
      {
        source: "Qdrant", 
        sourceOutput: "documents",
        target: "ChatOpenAI", 
        targetInput: "context"
      },
      {
        source: "ChatInput", 
        sourceOutput: "message",
        target: "ChatOpenAI", 
        targetInput: "input"
      },
      {
        source: "ChatOpenAI", 
        sourceOutput: "response",
        target: "ChatOutput", 
        targetInput: "message"
      }
    ],
    startPosition: { x: 50, y: 100 },
    horizontalSpacing: 200
  },
  
  // The specific trial3 example provided by the user
  trial3: {
    componentNames: ["TextInput", "Qdrant"],
    edges: [
      {
        source: "TextInput",
        sourceOutput: "text",
        target: "Qdrant",
        targetInput: "search_query" 
      }
    ],
    startPosition: { x: 100, y: 200 },
    horizontalSpacing: 250
  }
}; 
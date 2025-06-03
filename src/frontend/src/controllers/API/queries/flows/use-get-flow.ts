import { useMutationFunctionType } from "@/types/api";
import axios from "axios";
import { FlowType } from "@/types/flow";
import { processFlows } from "@/utils/reactflowUtils";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { getURL } from "../../helpers/constants";
import { UseRequestProcessor } from "../../services/request-processor";
import { Node, Edge } from "@xyflow/react";

interface IGetFlow {
  id: string;
  public?: boolean;
}

export async function fetchFlowFromBackend(flowId: string, useCase?: string): Promise<any> {
  // Keep the hardcoded URL as requested
  const url = `http://127.0.0.1:8001/design`;
  
  try {
    console.log("Sending user input to backend:", useCase);
    alert("Fetching flow from backend with user input: " + (useCase || "None"));
    
    // If useCase is provided, make a POST request with the new format
    let response;
    if (useCase) {
      response = await axios.post(url, {
        prompt: useCase,
        api_provider: "openai"
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 120000 // 2 minutes timeout
      });
    } else {
      // If no useCase, make a simpler request with default prompt
      response = await axios.post(url, {
        prompt: "Create a simple flow",
        api_provider: "openai"
      }, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 120000 // 2 minutes timeout
      });
    }
      
    if (response.status !== 200) {
      alert("Error fetching flow from backend");
      throw new Error(`Failed to fetch flow: ${response.statusText}`);
    }
    alert("Flow fetched successfully");
    console.log("Fetched flow data:", response.data);
    console.log("User use case sent to backend:", useCase || "None provided");
    
    return response.data; // Return the entire response data
  } catch (error) {
    console.error("Error fetching flow from backend:", error);
    
    // Provide more detailed error information
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        alert(`Connection timed out. The design endpoint at ${url} is taking too long to respond. This might be due to high server load or a complex flow generation request.`);
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        alert(`Server error: ${error.response.status} - ${error.response.data?.detail || error.message}`);
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        alert(`No response from server. Please check if the design service is running at ${url}`);
        console.error("Error request:", error.request);
      }
    } else {
      alert(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    throw error;
  }
}

// add types for error handling and success
export const useGetFlow: useMutationFunctionType<undefined, IGetFlow> = (
  options,
) => {
  const { mutate } = UseRequestProcessor();
  const queryClient = useQueryClient();

  const getFlowFn = async (payload: IGetFlow): Promise<FlowType> => {
    const response = await api.get<FlowType>(
      `${getURL(payload.public ? "PUBLIC_FLOW" : "FLOWS")}/${payload.id}`,
    );

    const flowsArrayToProcess = [response.data];
    const { flows } = processFlows(flowsArrayToProcess);
    return flows[0];
  };

  const mutation = mutate(["useGetFlow"], getFlowFn, {
    ...options,
    onSettled: (response) => {
      if (response) {
        queryClient.refetchQueries({
          queryKey: [
            "useGetRefreshFlowsQuery",
            { get_all: true, header_flows: true },
          ],
        });
      }
    },
  });

  return mutation;
};

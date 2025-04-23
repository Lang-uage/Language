import { useMutationFunctionType } from "@/types/api";
import axios from "axios";
import { FlowType } from "@/types/flow";
import { processFlows } from "@/utils/reactflowUtils";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../api";
import { getURL } from "../../helpers/constants";
import { UseRequestProcessor } from "../../services/request-processor";

interface IGetFlow {
  id: string;
  public?: boolean;
}

export async function fetchFlowFromBackend(flowId: string): Promise<{ nodes: Array<Node>; edges: Array<Edge> }> {
  try {
    alert("Fetching flow from backend..Hitting the backend API");
    const response = await axios.get(`http://127.0.0.1:8000/api/flows`);
    if (response.status !== 200) {
      alert("Error fetching flow from backend");
      throw new Error(`Failed to fetch flow: ${response.statusText}`);
    }
    alert("Flow fetched successfully");
    console.log("Fetched flow data:", response.data);
    return response.data; // Assuming the backend returns { nodes, edges }
  } catch (error) {
    console.error("Error fetching flow from backend:", error);
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

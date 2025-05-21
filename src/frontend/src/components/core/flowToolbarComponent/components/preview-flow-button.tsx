import { useState, useEffect } from "react";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import ShadTooltip from "@/components/common/shadTooltipComponent";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useFlowStore from "@/stores/flowStore";
import { api } from "@/controllers/API/api";
import { getURL } from "@/controllers/API/helpers/constants";
import { ReactFlowJsonObject } from "@xyflow/react";

interface PreviewFlowButtonProps {
  hasFlow: boolean;
}

const TestIcon = () => (
  <ForwardedIconComponent
    name="FlaskConical"
    className="h-4 w-4 transition-all"
    strokeWidth={1.5}
  />
);

const ButtonLabel = () => (
  <span className="hidden md:block">Preview Flow</span>
);

const ActiveButton = () => (
  <div
    data-testid="preview-flow-btn"
    className="playground-btn-flow-toolbar hover:bg-accent"
  >
    <TestIcon />
    <ButtonLabel />
  </div>
);

const DisabledButton = () => (
  <div
    className="playground-btn-flow-toolbar cursor-not-allowed text-muted-foreground duration-150"
    data-testid="preview-flow-btn-disabled"
  >
    <TestIcon />
    <ButtonLabel />
  </div>
);

// This component runs the flow with automatically generated inputs
const PreviewContent = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  
  // Get data from the flow store
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const currentFlow = useFlowStore((state) => state.currentFlow);
  const flowId = currentFlow?.id;
  
  // Extract input values from the flow
  const extractInputValues = () => {
    const inputNodes = nodes.filter(node => {
      // Find nodes that have input fields (like text inputs, etc.)
      return node.data?.node?.template && Object.values(node.data.node.template).some(
        (field: any) => field.type === 'str' || field.type === 'text' || field.type === 'prompt'
      );
    });

    const inputValues: Record<string, any> = {};
    
    inputNodes.forEach(node => {
      if (node.data?.node?.template) {
        // Get all input fields from the node
        Object.entries(node.data.node.template).forEach(([key, field]: [string, any]) => {
          if (field.value !== undefined && (field.type === 'str' || field.type === 'text' || field.type === 'prompt')) {
            // Use the node name and field key to create a unique identifier
            const inputId = `${node.data.type}.${key}`;
            inputValues[inputId] = field.value;
          }
        });
      }
    });
    
    return inputValues;
  };
  
  const runFlowWithRealInputs = async () => {
    setIsGenerating(true);
    setPreviewResult("");
    setError("");
    setProgress(0);
    
    try {
      // Extract input values from the current flow
      const inputValues = extractInputValues();
      console.log("Extracted input values:", inputValues);
      
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress > 90 ? 90 : newProgress; // Cap at 90% until we get the real response
        });
      }, 200);
      
      // Prepare the flow data
      const flowData: ReactFlowJsonObject = {
        nodes: nodes.map(node => ({...node})),
        edges: edges.map(edge => ({...edge})),
        viewport: { x: 0, y: 0, zoom: 1 }
      };
      
      // Prepare the API request
      let payload: any = {
        input_value: inputValues.hasOwnProperty("OpenAI.input") 
          ? inputValues["OpenAI.input"] 
          : "Generated test input for preview",
        output_type: "text",
        input_type: "text",
        session_id: `preview_${Date.now()}`,
        tweaks: {}
      };
      
      console.log("Sending payload:", payload);
      
      // Call the API to run the flow
      let response;
      if (flowId) {
        // If we have a flowId, use it
        response = await api.post(`${getURL("RUN")}/${flowId}`, payload);
      } else {
        // If no flowId, we need to create a temporary flow
        const tempFlowPayload = {
          name: "Preview Flow",
          description: "Temporary flow for preview",
          data: flowData
        };
        
        // Create a temporary flow
        const tempFlowResponse = await api.post(`${getURL("FLOWS")}/`, tempFlowPayload);
        const tempFlowId = tempFlowResponse.data.id;
        
        // Run the temporary flow
        response = await api.post(`${getURL("RUN")}/${tempFlowId}`, payload);
        
        // Clean up the temporary flow
        await api.delete(`${getURL("FLOWS")}/${tempFlowId}`);
      }
      
      // Process the response
      clearInterval(progressInterval);
      setProgress(100);
      
      if (response && response.data && response.data.outputs) {
        const outputs = response.data.outputs;
        console.log("Flow execution result:", outputs);
        
        // Format the output
        let formattedOutput = "";
        if (Array.isArray(outputs) && outputs.length > 0) {
          // Check if it's a text/chat response
          if (typeof outputs[0][0] === 'string') {
            formattedOutput = outputs[0][0];
          } else if (outputs[0][0] && outputs[0][0].type === 'chat' && outputs[0][0].data) {
            formattedOutput = outputs[0][0].data.content;
          } else if (outputs[0][0] && outputs[0][0].message) {
            formattedOutput = outputs[0][0].message;
          } else {
            formattedOutput = JSON.stringify(outputs, null, 2);
          }
        } else {
          formattedOutput = JSON.stringify(outputs, null, 2);
        }
        
        setPreviewResult(formattedOutput);
      } else {
        setPreviewResult("The flow executed, but no output was returned.");
      }
    } catch (err: any) {
      console.error("Error running flow:", err);
      clearInterval(progressInterval);
      setProgress(100);
      setError(err.response?.data?.detail || err.message || "An error occurred while running the flow.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 p-2">
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-medium">Flow Preview</h3>
        <p className="text-xs text-muted-foreground mt-1">
          This preview will test your flow with the current input values and show the actual output.
        </p>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={runFlowWithRealInputs}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
        >
          {isGenerating ? "Running Flow..." : "Run Preview"}
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground">
            Processing flow with current inputs: {progress.toFixed(0)}%
          </div>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}
      
      {error && (
        <div className="rounded-md border border-destructive p-4 bg-destructive/10">
          <h3 className="text-sm font-medium text-destructive mb-2">Error</h3>
          <p className="text-sm text-destructive/90">{error}</p>
        </div>
      )}
      
      {previewResult && (
        <div className="rounded-md border p-4 bg-muted/50">
          <h3 className="text-sm font-medium mb-2">Preview Result</h3>
          <div className="text-sm whitespace-pre-wrap font-mono text-xs p-2 bg-muted rounded">
            {previewResult}
          </div>
        </div>
      )}
    </div>
  );
};

const PreviewFlowButton = ({ hasFlow }: PreviewFlowButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {hasFlow ? (
        <div onClick={() => setOpen(true)}>
          <ActiveButton />
        </div>
      ) : (
        <ShadTooltip content="Create a flow first to preview it">
          <div>
            <DisabledButton />
          </div>
        </ShadTooltip>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Preview Flow</DialogTitle>
          </DialogHeader>
          <PreviewContent />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PreviewFlowButton; 
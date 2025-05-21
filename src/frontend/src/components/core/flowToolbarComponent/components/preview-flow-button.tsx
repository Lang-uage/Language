import { useState, useEffect } from "react";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import ShadTooltip from "@/components/common/shadTooltipComponent";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import useFlowStore from "@/stores/flowStore";
import { api } from "@/controllers/API/api";
import { getURL } from "@/controllers/API/helpers/constants";
import { ReactFlowJsonObject } from "@xyflow/react";
import axios from "axios";
import useAlertStore from "@/stores/alertStore";

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
  const [apiLog, setApiLog] = useState("");
  const [showApiLog, setShowApiLog] = useState(false);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  
  // Get data from the flow store
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const currentFlow = useFlowStore((state) => state.currentFlow);
  const flowId = currentFlow?.id;
  
  // Extract input values from the flow
  const extractInputValues = () => {
    try {
      console.log("Extracting input values from nodes:", nodes);
      
      // Find all input nodes that contain text inputs
      const inputNodes = nodes.filter(node => {
        if (!node.data?.node?.template) return false;
        return Object.values(node.data.node.template).some(
          (field: any) => field.type === 'str' || field.type === 'text' || field.type === 'prompt'
        );
      });
      
      console.log("Found input nodes:", inputNodes.map(n => n.data.type));
      
      const inputValues: Record<string, any> = {};
      
      inputNodes.forEach(node => {
        if (node.data?.node?.template) {
          Object.entries(node.data.node.template).forEach(([key, field]: [string, any]) => {
            if (field.value !== undefined && (field.type === 'str' || field.type === 'text' || field.type === 'prompt')) {
              const inputId = `${node.data.type}.${key}`;
              inputValues[inputId] = field.value;
              console.log(`Found input ${inputId} with value:`, field.value);
            }
          });
        }
      });
      
      return inputValues;
    } catch (err) {
      console.error("Error extracting input values:", err);
      return {};
    }
  };
  
  // Get a sample input for the flow
  const getSampleInput = (inputs: Record<string, any>) => {
    // Check for common patterns first
    if (inputs["OpenAI.input"]) return inputs["OpenAI.input"];
    if (inputs["ChatInput.value"]) return inputs["ChatInput.value"];
    if (inputs["TextInput.text"]) return inputs["TextInput.text"];
    
    // Try to find any input value that seems like a suitable text input
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    
    // Default fallback
    return "Sample input for preview";
  };
  
  const runFlowWithRealInputs = async () => {
    setIsGenerating(true);
    setPreviewResult("");
    setError("");
    setApiLog("");
    setProgress(0);
    
    try {
      // Extract input values from the current flow
      const inputValues = extractInputValues();
      console.log("Extracted input values:", inputValues);
      setApiLog((log) => log + `Extracted input values: ${JSON.stringify(inputValues, null, 2)}\n\n`);
      
      if (Object.keys(inputValues).length === 0) {
        setApiLog((log) => log + "No input values found in the flow. Using default sample input.\n");
      }
      
      const sampleInput = getSampleInput(inputValues);
      
      // Start progress animation
      let progressInterval: number | null = window.setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      // Log the flow data for debugging
      if (!flowId) {
        setApiLog((log) => log + "No flow ID found. Creating a temporary flow.\n");
      } else {
        setApiLog((log) => log + `Using existing flow ID: ${flowId}\n`);
      }
      
      // Prepare the API request
      let payload = {
        input_value: sampleInput,
        output_type: "text",
        input_type: "text",
        session_id: `preview_${Date.now()}`,
        tweaks: {}
      };
      
      setApiLog((log) => log + `Sending payload: ${JSON.stringify(payload, null, 2)}\n\n`);
      console.log("Sending payload:", payload);
      
      // Call the API to run the flow
      let response;
      const headers = {
        "Content-Type": "application/json"
      };
      
      if (flowId) {
        const url = `${window.location.origin}/api/v1/run/${flowId}`;
        setApiLog((log) => log + `Sending request to: ${url}\n`);
        
        try {
          // Use axios directly for more control
          response = await axios.post(url, payload, { headers });
        } catch (axiosErr: any) {
          const errMsg = axiosErr.response?.data?.detail || axiosErr.message;
          setApiLog((log) => log + `API Error: ${errMsg}\n\n${JSON.stringify(axiosErr.response?.data || {}, null, 2)}\n`);
          throw axiosErr;
        }
      } else {
        // Create a temporary flow if no flowId exists
        setApiLog((log) => log + "Creating temporary flow...\n");
        
        const flowData: ReactFlowJsonObject = {
          nodes: nodes.map(node => ({...node})),
          edges: edges.map(edge => ({...edge})),
          viewport: { x: 0, y: 0, zoom: 1 }
        };
        
        const tempFlowPayload = {
          name: "Preview Flow",
          description: "Temporary flow for preview",
          data: flowData
        };
        
        try {
          // Create a temporary flow
          const tempFlowUrl = `${window.location.origin}/api/v1/flows/`;
          setApiLog((log) => log + `Creating temporary flow at: ${tempFlowUrl}\n`);
          
          const tempFlowResponse = await axios.post(tempFlowUrl, tempFlowPayload, { headers });
          const tempFlowId = tempFlowResponse.data.id;
          
          setApiLog((log) => log + `Temporary flow created with ID: ${tempFlowId}\n`);
          
          // Run the temporary flow
          const runUrl = `${window.location.origin}/api/v1/run/${tempFlowId}`;
          setApiLog((log) => log + `Running temporary flow at: ${runUrl}\n`);
          
          response = await axios.post(runUrl, payload, { headers });
          
          // Clean up the temporary flow
          setApiLog((log) => log + `Cleaning up temporary flow: ${tempFlowId}\n`);
          await axios.delete(`${window.location.origin}/api/v1/flows/${tempFlowId}`, { headers });
        } catch (axiosErr: any) {
          const errMsg = axiosErr.response?.data?.detail || axiosErr.message;
          setApiLog((log) => log + `API Error: ${errMsg}\n\n${JSON.stringify(axiosErr.response?.data || {}, null, 2)}\n`);
          throw axiosErr;
        }
      }
      
      // Process the response
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      setProgress(100);
      
      if (response && response.data) {
        setApiLog((log) => log + `Received response: ${JSON.stringify(response.data, null, 2)}\n`);
        console.log("API response:", response.data);
        
        if (response.data.outputs) {
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
          setPreviewResult("The flow executed, but no output was returned. Check the API log for details.");
        }
      } else {
        setPreviewResult("Received an empty response from the server. Check the API log for details.");
      }
    } catch (err: any) {
      console.error("Error running flow:", err);
      
      // Clean up interval if there was an error
      if (typeof window !== 'undefined') {
        window.clearInterval(progress);
      }
      
      setProgress(100);
      setError(err.response?.data?.detail || err.message || "An error occurred while running the flow.");
      
      // Show alert for better visibility
      setErrorData({
        title: "Error running flow preview",
        list: [err.response?.data?.detail || err.message || "See the error details in the preview panel"]
      });
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
      
      <div className="rounded-md border p-2">
        <div 
          className="flex items-center justify-between cursor-pointer p-2"
          onClick={() => setShowApiLog(!showApiLog)}
        >
          <h3 className="text-sm font-medium">API Logs {showApiLog ? '(Click to hide)' : '(Click to show)'}</h3>
          <ForwardedIconComponent
            name={showApiLog ? "ChevronUp" : "ChevronDown"}
            className="h-4 w-4"
          />
        </div>
        
        {showApiLog && apiLog && (
          <div className="p-2 mt-1 max-h-40 overflow-y-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-2 rounded">{apiLog}</pre>
          </div>
        )}
      </div>
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
import { useState, useEffect, useRef } from "react";
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
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll logs to bottom when new content is added
  useEffect(() => {
    if (logContainerRef.current && showApiLog) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [apiLog, showApiLog]);
  
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
  
  // Helper to add formatted logs with timestamps
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'request' | 'response' = 'info') => {
    // Use only hours and minutes for more compact timestamps
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    let formattedMessage = "";
    
    // Truncate long messages
    const maxLength = 300;
    if (message.length > maxLength) {
      message = message.substring(0, maxLength) + "...";
    }
    
    // Format JSON strings in a compact way
    if (type === 'request' || type === 'response') {
      try {
        // Check if message is JSON
        if (message.trim().startsWith('{') || message.trim().startsWith('[')) {
          const parsed = JSON.parse(message);
          message = JSON.stringify(parsed, null, 0); // Use no indentation for most compact view
        }
      } catch (e) {
        // Not valid JSON, use as is
      }
    }
    
    // Use shorter indicators to save space
    switch (type) {
      case 'info':
        formattedMessage = `[${timestamp}] i: ${message}\n`;
        break;
      case 'success':
        formattedMessage = `[${timestamp}] ✓: ${message}\n`;
        break;
      case 'error':
        formattedMessage = `[${timestamp}] !: ${message}\n`;
        break;
      case 'request':
        formattedMessage = `[${timestamp}] >: ${message}\n`;
        break;
      case 'response':
        formattedMessage = `[${timestamp}] <: ${message}\n`;
        break;
    }
    
    // Keep logs to a reasonable size by removing old entries if needed
    setApiLog((prev) => {
      const newLog = prev + formattedMessage;
      if (newLog.length > 5000) { // Limit total log size
        const lines = newLog.split('\n');
        return lines.slice(Math.max(0, lines.length - 50)).join('\n');
      }
      return newLog;
    });
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
      addLog(`Extracted input values: ${JSON.stringify(inputValues, null, 2)}`, 'info');
      
      if (Object.keys(inputValues).length === 0) {
        addLog("No input values found in the flow. Using default sample input.", 'info');
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
        addLog("No flow ID found. Creating a temporary flow.", 'info');
      } else {
        addLog(`Using existing flow ID: ${flowId}`, 'info');
      }
      
      // Prepare the API request
      let payload = {
        input_value: sampleInput,
        output_type: "text",
        input_type: "text",
        session_id: `preview_${Date.now()}`,
        tweaks: {}
      };
      
      addLog(`Preparing request payload:`, 'request');
      addLog(JSON.stringify(payload, null, 2), 'request');
      console.log("Sending payload:", payload);
      
      // Call the API to run the flow
      let response;
      const headers = {
        "Content-Type": "application/json"
      };
      
      if (flowId) {
        const url = `${window.location.origin}/api/v1/run/${flowId}`;
        addLog(`Sending request to: ${url}`, 'request');
        
        try {
          // Use axios directly for more control
          addLog('Executing API call...', 'info');
          response = await axios.post(url, payload, { headers });
          addLog('API call completed successfully', 'success');
        } catch (axiosErr: any) {
          const errMsg = axiosErr.response?.data?.detail || axiosErr.message;
          addLog(`API Error: ${errMsg}`, 'error');
          addLog(JSON.stringify(axiosErr.response?.data || {}, null, 2), 'error');
          throw axiosErr;
        }
      } else {
        // Create a temporary flow if no flowId exists
        addLog("Creating temporary flow...", 'info');
        
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
          addLog(`Creating temporary flow at: ${tempFlowUrl}`, 'request');
          
          const tempFlowResponse = await axios.post(tempFlowUrl, tempFlowPayload, { headers });
          const tempFlowId = tempFlowResponse.data.id;
          
          addLog(`Temporary flow created with ID: ${tempFlowId}`, 'success');
          
          // Run the temporary flow
          const runUrl = `${window.location.origin}/api/v1/run/${tempFlowId}`;
          addLog(`Running temporary flow at: ${runUrl}`, 'request');
          
          response = await axios.post(runUrl, payload, { headers });
          
          // Clean up the temporary flow
          addLog(`Cleaning up temporary flow: ${tempFlowId}`, 'info');
          await axios.delete(`${window.location.origin}/api/v1/flows/${tempFlowId}`, { headers });
        } catch (axiosErr: any) {
          const errMsg = axiosErr.response?.data?.detail || axiosErr.message;
          addLog(`API Error: ${errMsg}`, 'error');
          addLog(JSON.stringify(axiosErr.response?.data || {}, null, 2), 'error');
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
        addLog(`Received response:`, 'response');
        addLog(JSON.stringify(response.data, null, 2), 'response');
        console.log("API response:", response.data);
        
        if (response.data.outputs) {
          const outputs = response.data.outputs;
          console.log("Flow execution result:", outputs);
          addLog("Flow execution completed successfully", 'success');
          
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
          addLog("No outputs found in the response", 'error');
        }
      } else {
        setPreviewResult("Received an empty response from the server. Check the API log for details.");
        addLog("Received empty response from server", 'error');
      }
    } catch (err: any) {
      console.error("Error running flow:", err);
      
      // Clean up interval if there was an error
      if (typeof window !== 'undefined') {
        window.clearInterval(progress);
      }
      
      setProgress(100);
      setError(err.response?.data?.detail || err.message || "An error occurred while running the flow.");
      addLog(`Error running flow: ${err.message}`, 'error');
      
      // Show alert for better visibility
      setErrorData({
        title: "Error running flow preview",
        list: [err.response?.data?.detail || err.message || "See the error details in the preview panel"]
      });
    } finally {
      setIsGenerating(false);
      addLog("Flow preview operation completed", 'info');
    }
  };

  return (
    <div className="flex flex-col space-y-3 p-2 max-h-[80vh] overflow-hidden">
      <div className="rounded-md border p-3 min-h-0">
        <h3 className="text-sm font-medium">Flow Preview</h3>
        <p className="text-xs text-muted-foreground mt-1">
          This preview will test your flow with the current input values and show the actual output.
        </p>
      </div>
      
      <div className="flex justify-center min-h-0">
        <button
          onClick={runFlowWithRealInputs}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-md text-sm font-medium"
        >
          {isGenerating ? "Running Flow..." : "Run Preview"}
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-1 min-h-0">
          <div className="text-xs text-center text-muted-foreground">
            {progress.toFixed(0)}%
          </div>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
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
        <div className="rounded-md border border-destructive p-2 bg-destructive/10 max-h-[80px] overflow-y-auto">
          <h3 className="text-xs font-medium text-destructive mb-1">Error</h3>
          <p className="text-xs text-destructive/90">{error}</p>
        </div>
      )}
      
      {previewResult && (
        <div className="rounded-md border p-2 bg-muted/50 min-h-0 flex flex-col">
          <h3 className="text-xs font-medium mb-1">Preview Result</h3>
          <div className="text-xs whitespace-pre-wrap font-mono p-1.5 bg-muted rounded max-h-[150px] overflow-y-auto">
            {previewResult}
          </div>
        </div>
      )}
      
      <div className="rounded-md border bg-[#1e1e1e] shadow-sm max-h-[60px] overflow-hidden flex flex-col shrink-0 min-h-0">
        <div 
          className="flex items-center justify-between cursor-pointer p-1 bg-[#252526] hover:bg-[#2d2d2d] transition-colors rounded-t-md shrink-0"
          onClick={() => setShowApiLog(!showApiLog)}
        >
          <div className="flex items-center gap-1.5">
            <ForwardedIconComponent
              name="Terminal"
              className="h-3 w-3 text-[#cccccc]"
            />
            <h3 className="text-[11px] font-medium text-[#cccccc]">API Logs</h3>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[#8e8e8e]">
              {showApiLog ? 'Hide' : 'Show'}
            </span>
            <ForwardedIconComponent
              name={showApiLog ? "ChevronUp" : "ChevronDown"}
              className="h-3 w-3 text-[#8e8e8e] transition-transform"
            />
          </div>
        </div>
        
        {showApiLog && (
          <div 
            ref={logContainerRef}
            className="h-[30px] overflow-y-scroll overflow-x-hidden scrollbar-thin scrollbar-thumb-[#424242] scrollbar-track-transparent flex-grow"
            style={{ fontVariantLigatures: 'none' }}
          >
            {apiLog ? (
              <pre className="text-[9px] leading-tight font-mono whitespace-pre-wrap p-0.5 m-0 text-[#cccccc]">
                {apiLog}
              </pre>
            ) : (
              <div className="text-center py-0.5 text-[9px] text-[#8e8e8e]">
                No logs available
              </div>
            )}
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0 pb-2">
            <DialogTitle>Preview Flow</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto flex-grow">
            <PreviewContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PreviewFlowButton; 
import { useState } from "react";
import ForwardedIconComponent from "@/components/common/genericIconComponent";
import ShadTooltip from "@/components/common/shadTooltipComponent";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

// This component simulates flow execution with dummy inputs
const PreviewContent = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState("");
  const [progress, setProgress] = useState(0);

  const generateDummyResponse = () => {
    setIsGenerating(true);
    setPreviewResult("");
    setProgress(0);
    
    // Simulate API response generation with progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + Math.random() * 15;
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setPreviewResult("The automated test for this flow was successful. The flow processed the dummy inputs correctly and generated an appropriate response. This preview helps you ensure your flow is correctly configured before using it with real inputs.");
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  return (
    <div className="flex flex-col space-y-4 p-2">
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-medium">Flow Preview</h3>
        <p className="text-xs text-muted-foreground mt-1">
          This preview will test your flow with automatically generated inputs based on your flow's structure.
        </p>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={generateDummyResponse}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
        >
          {isGenerating ? "Generating Preview..." : "Run Preview Test"}
        </button>
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <div className="text-xs text-center text-muted-foreground">
            Processing flow with dummy inputs: {progress.toFixed(0)}%
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
      
      {previewResult && (
        <div className="rounded-md border p-4 bg-muted/50">
          <h3 className="text-sm font-medium mb-2">Preview Result</h3>
          <p className="text-sm">{previewResult}</p>
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
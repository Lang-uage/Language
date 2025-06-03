import { useState } from "react";
import { designAndCreateFlow } from "@/controllers/API/queries/flows/use-design-flow-from-prompt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCustomNavigate } from "@/customization/hooks/use-custom-navigate";
import { Sparkles, ArrowRight } from "lucide-react";
import useAlertStore from "@/stores/alertStore";

/**
 * Component that provides a UI for creating flows using AI
 * Users can enter a natural language prompt describing the flow they want to create
 */
export const CopilotFlowCreator = () => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const navigate = useCustomNavigate();
  const setSuccessData = useAlertStore((state) => state.setSuccessData);

  const handleGenerateFlow = async () => {
    if (!prompt.trim()) {
      return;
    }

    setGenerating(true);
    
    try {
      await designAndCreateFlow(prompt);
      setSuccessData({
        title: "Flow created successfully",
        list: ["Your flow has been created based on your description"]
      });
      navigate("/flows");
    } catch (error) {
      // Error is handled in the designAndCreateFlow function
      console.error("Error creating flow:", error);
    } finally {
      setGenerating(false);
    }
  };

  const examples = [
    "Create a chatbot that answers questions based on a PDF document",
    "Build a flow that generates summaries of YouTube videos",
    "Design a flow that can translate text between languages",
    "Create a flow that classifies customer feedback sentiment"
  ];

  const selectExample = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="w-full max-w-2xl bg-card rounded-lg border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-blue-500" />
        <h2 className="text-xl font-semibold">Flow Copilot</h2>
      </div>
      
      <p className="text-muted-foreground mb-4">
        Describe the flow you want to create in natural language, and AI will generate it for you.
      </p>
      
      <Textarea
        className="min-h-[150px] mb-4"
        placeholder="E.g., Create a chatbot that answers questions based on a PDF document"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      
      <Button 
        className="w-full mb-6" 
        disabled={!prompt.trim() || generating}
        onClick={handleGenerateFlow}
      >
        {generating ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            Generating Flow...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Flow
          </span>
        )}
      </Button>
      
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-muted-foreground mb-3">Examples:</p>
        <div className="grid gap-2">
          {examples.map((example, index) => (
            <button
              key={index}
              className="text-left text-sm p-2 rounded hover:bg-accent flex items-center justify-between group"
              onClick={() => selectExample(example)}
            >
              <span>{example}</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}; 
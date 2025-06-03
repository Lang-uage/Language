import { CopilotFlowCreator } from "@/components/copilotFlowCreator";

/**
 * Page component for the Flow Copilot feature
 */
const CopilotPage = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <CopilotFlowCreator />
    </div>
  );
};

export default CopilotPage; 
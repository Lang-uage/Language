import useFlowStore from "@/stores/flowStore";
import { useState } from "react";
import PublishDropdown from "./deploy-dropdown";
import PlaygroundButton from "./playground-button";
import PreviewFlowButton from "./preview-flow-button";

export default function FlowToolbarOptions() {
  const [open, setOpen] = useState<boolean>(false);
  const hasIO = useFlowStore((state) => state.hasIO);
  const reactFlowInstance = useFlowStore((state) => state.reactFlowInstance);
  const hasNodes = reactFlowInstance?.getNodes().length > 0;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-full w-full gap-1.5 rounded-sm transition-all">
        <PlaygroundButton
          hasIO={hasIO}
          open={open}
          setOpen={setOpen}
          canvasOpen
        />
        <PreviewFlowButton hasFlow={hasNodes} />
      </div>
      <PublishDropdown />
    </div>
  );
}

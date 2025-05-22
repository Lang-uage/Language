import FlowCreator from "@/components/FlowCreator";
import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import Page from "@/pages/FlowPage/components/PageComponent";
import { useGetTypes } from "@/controllers/API/queries/flows/use-get-types";
import { useTypesStore } from "@/stores/typesStore";

export default function FlowBuilderPage() {
  const [showFlowCreator, setShowFlowCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const types = useTypesStore((state) => state.types);

  // Load types if needed
  useGetTypes({
    enabled: Object.keys(types).length <= 0,
  });

  return (
    <div className="flex h-full">
      <div className="flex flex-col h-full w-full">
        <div className="flex-grow flex">
          <div className="flex flex-col h-full w-full">
            <div className="w-full h-10 flex items-center justify-between px-4 bg-gray-100 border-b">
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => setShowFlowCreator(!showFlowCreator)}
                >
                  {showFlowCreator ? 'Hide Flow Creator' : 'Show Flow Creator'}
                </button>
              </div>
              <span className="text-sm font-medium">Flow Builder</span>
            </div>
            
            {/* Show the Flow Creator component if enabled */}
            {showFlowCreator && (
              <div className="absolute top-12 left-4 z-50">
                <FlowCreator />
              </div>
            )}
            
            <div className="flex-grow">
              <SidebarProvider width="17.5rem" defaultOpen={false}>
                <main className="flex w-full overflow-hidden">
                  <div className="h-full w-full">
                    <Page setIsLoading={setIsLoading} view={false} />
                  </div>
                </main>
              </SidebarProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
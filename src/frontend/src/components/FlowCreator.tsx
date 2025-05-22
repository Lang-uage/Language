import { useState } from 'react';
import { useCreateFlowFromJson, predefinedFlows } from '../controllers/API/queries/flows/use-create-flow-from-json';

export default function FlowCreator() {
  const createFlowMutation = useCreateFlowFromJson();
  const [selectedFlow, setSelectedFlow] = useState<keyof typeof predefinedFlows>('trial3');
  const [customJson, setCustomJson] = useState<string>('');
  const [showCustomJson, setShowCustomJson] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [debugMode, setDebugMode] = useState(true);

  const handleCreateFlow = async () => {
    try {
      setMessage('Creating flow...');
      
      console.group("📝 FlowCreator - handleCreateFlow");
      
      if (showCustomJson) {
        // Use custom JSON input
        console.log("🔄 Using custom JSON input");
        try {
          const parsedJson = JSON.parse(customJson);
          console.log("✅ Successfully parsed custom JSON:", parsedJson);
          await createFlowMutation.mutateAsync(parsedJson);
        } catch (parseError) {
          console.error("❌ Failed to parse JSON:", parseError);
          setMessage(`Error parsing JSON: ${(parseError as Error).message}`);
          console.groupEnd();
          return;
        }
      } else {
        // Use predefined flow
        console.log(`🔄 Using predefined flow: "${selectedFlow}"`);
        console.log("📋 Flow definition:", predefinedFlows[selectedFlow]);
        await createFlowMutation.mutateAsync(predefinedFlows[selectedFlow]);
      }
      
      console.log("✅ Flow creation mutation completed");
      console.groupEnd();
      
      setMessage('Flow created successfully!');
    } catch (error) {
      console.error('❌ Error creating flow:', error);
      setMessage(`Error creating flow: ${(error as Error).message}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg shadow-md max-w-2xl mx-auto my-8 bg-white">
      <h2 className="text-2xl font-bold mb-4">Flow Creator</h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Create Flow from Template</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCustomJson(!showCustomJson)}
              className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
            >
              {showCustomJson ? 'Use Predefined' : 'Use Custom JSON'}
            </button>
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`text-sm px-3 py-1 rounded ${debugMode ? 'bg-green-200 hover:bg-green-300' : 'bg-gray-200 hover:bg-gray-300'}`}
              title="Toggle verbose console logging"
            >
              {debugMode ? '🐞 Debug ON' : '🔇 Debug OFF'}
            </button>
          </div>
        </div>
        
        {showCustomJson ? (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Custom Flow JSON:
            </label>
            <textarea 
              rows={10}
              className="w-full p-2 border rounded-md font-mono text-sm"
              value={customJson}
              onChange={(e) => setCustomJson(e.target.value)}
              placeholder='{"componentNames": ["TextInput", "Qdrant"], "edges": [{"source": "TextInput", "sourceOutput": "text", "target": "Qdrant", "targetInput": "search_query"}]}'
            />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Select Predefined Flow:
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedFlow}
              onChange={(e) => setSelectedFlow(e.target.value as keyof typeof predefinedFlows)}
            >
              {Object.keys(predefinedFlows).map((key) => (
                <option key={key} value={key}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                </option>
              ))}
            </select>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-semibold mb-2">Flow Preview:</h4>
              <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
                {JSON.stringify(predefinedFlows[selectedFlow], null, 2)}
              </pre>
            </div>
          </div>
        )}
        
        <button
          onClick={handleCreateFlow}
          disabled={createFlowMutation.isPending}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
        >
          {createFlowMutation.isPending ? 'Creating...' : 'Create Flow'}
        </button>
        
        {message && (
          <div className={`mt-4 p-2 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-500 border-t pt-4">
        <p className="mb-2">
          <strong>Debug Tips:</strong> Open your browser's console (F12) to see detailed logs about the flow creation process.
        </p>
        <p className="mb-2">
          <strong>Note:</strong> The flow will be created in the current flow editor.
        </p>
        <p>For reference, your trial3 JSON structure is:</p>
        <pre className="text-xs bg-gray-50 p-2 rounded-md mt-1 overflow-auto">
          {JSON.stringify(predefinedFlows.trial3, null, 2)}
        </pre>
      </div>
    </div>
  );
} 
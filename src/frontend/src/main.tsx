import { createFlowFromJson } from "./controllers/API/queries/flows/use-post-create-flow";

// Make the flow creation function available globally for easy testing
if (typeof window !== "undefined") {
  // Add a global function to create flows from JSON
  window.createFlowFromJson = (json: any) => {
    console.group("🌊 Global Flow Creator");
    console.time("Global flow creation time");
    
    console.log("📝 Input JSON:", JSON.stringify(json, null, 2));
    
    try {
      // Validate the JSON structure
      if (!json.componentNames && !json.nodes) {
        console.error("❌ Error: Missing 'componentNames' or 'nodes' in the JSON");
        console.timeEnd("Global flow creation time");
        console.groupEnd();
        return Promise.reject(new Error("Missing required 'componentNames' or 'nodes' in the JSON"));
      }
      
      if (json.edges && !Array.isArray(json.edges)) {
        console.error("❌ Error: 'edges' must be an array");
        console.timeEnd("Global flow creation time");
        console.groupEnd();
        return Promise.reject(new Error("'edges' must be an array"));
      }
      
      console.log("✅ JSON validation passed");
      
      // Call the actual function
      const result = createFlowFromJson(json);
      
      // Log after completion
      result.then(() => {
        console.log("🎉 Flow created successfully via global function");
        
        // Add a delay to check if edges are retained
        setTimeout(() => {
          // This will be helpful to check if edges are retained or lost
          const flowStore = (window as any).__flowStore?.getState?.();
          if (flowStore) {
            console.log(`⏱️ After 3s: Nodes: ${flowStore.nodes?.length || 0}, Edges: ${flowStore.edges?.length || 0}`);
          }
          console.timeEnd("Global flow creation time");
          console.groupEnd();
        }, 3000);
      }).catch(error => {
        console.error("❌ Error in flow creation:", error);
        console.timeEnd("Global flow creation time");
        console.groupEnd();
      });
      
      return result;
    } catch (error) {
      console.error("❌ Unexpected error:", error);
      console.timeEnd("Global flow creation time");
      console.groupEnd();
      return Promise.reject(error);
    }
  };
  
  // Add the example trial3 JSON for easy access
  window.trial3Json = {
    componentNames: ["TextInput", "Qdrant"],
    edges: [
      {
        source: "TextInput",
        sourceOutput: "Message",
        target: "Qdrant",
        targetInput: "Search Query" 
      }
    ],
  };
  
  // Also make flowStore accessible globally for debugging
  const originalUseFlowStore = require('./stores/flowStore').default;
  if (originalUseFlowStore) {
    (window as any).__flowStore = originalUseFlowStore;
    console.log("🔧 Debug: Flow store is available globally as __flowStore");
  }
  
  // Add a helper function to inspect component templates and field names
  window.inspectComponent = (componentName: string) => {
    try {
      console.group(`🔍 Inspecting Component: "${componentName}"`);
      
      // Get all templates
      const templates = require('@/stores/typesStore').useTypesStore.getState().templates;
      if (!templates || Object.keys(templates).length === 0) {
        console.error("❌ No templates available. Make sure the app is fully loaded.");
        console.groupEnd();
        return;
      }
      
      // Find template key for component
      let templateKey = null;
      const availableKeys = Object.keys(templates);
      
      // Try exact match
      if (templates[componentName]) {
        templateKey = componentName;
      } else {
        // Try case-insensitive match
        const lowerName = componentName.toLowerCase();
        templateKey = availableKeys.find(key => 
          key.toLowerCase() === lowerName ||
          key.toLowerCase().includes(lowerName) ||
          (templates[key]?.display_name || '').toLowerCase().includes(lowerName)
        );
      }
      
      if (!templateKey) {
        console.error(`❌ No template found for component "${componentName}"`);
        console.log("Available components:", availableKeys.slice(0, 20).join(", ") + "...");
        console.groupEnd();
        return;
      }
      
      const template = templates[templateKey];
      console.log(`✅ Found template: "${templateKey}"`);
      console.log(`📝 Display Name: "${template.display_name || 'N/A'}"`);
      
      // Show input fields
      console.group("📥 Input Fields:");
      const inputFields = template.template || {};
      if (Object.keys(inputFields).length > 0) {
        Object.entries(inputFields).forEach(([fieldName, fieldData]: [string, any]) => {
          console.log(`- "${fieldName}" (${fieldData.type || 'unknown type'})`);
        });
      } else {
        console.log("No input fields defined");
      }
      console.groupEnd();
      
      // Show output fields
      console.group("📤 Output Fields:");
      const outputFields = template.outputs || [];
      if (outputFields.length > 0) {
        outputFields.forEach((output: any) => {
          console.log(`- "${output.name}" (${output.type || 'unknown type'})`);
        });
      } else {
        console.log("No output fields defined");
      }
      console.groupEnd();
      
      console.log("✨ Suggested edge configuration:");
      const exampleOutput = outputFields.length > 0 ? outputFields[0].name : "output";
      const exampleInput = Object.keys(inputFields).length > 0 ? Object.keys(inputFields)[0] : "input";
      
      console.log(JSON.stringify({
        source: componentName,
        sourceOutput: exampleOutput,
        target: "AnotherComponent",
        targetInput: exampleInput
      }, null, 2));
      
      console.groupEnd();
      return { templateKey, template, inputFields: Object.keys(inputFields), outputFields: outputFields.map((o: any) => o.name) };
    } catch (error) {
      console.error("❌ Error inspecting component:", error);
      console.groupEnd();
    }
  };
} 
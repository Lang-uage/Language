interface Window {
  createFlowFromJson: (json: any) => Promise<void>;
  trial3Json: {
    componentNames: string[];
    edges: Array<{
      source: string;
      sourceOutput?: string;
      target: string;
      targetInput?: string;
    }>;
  };
  inspectComponent: (componentName: string) => {
    templateKey: string;
    template: any;
    inputFields: string[];
    outputFields: string[];
  } | undefined;
}

// Declare additional global types as needed 
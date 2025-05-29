import { DefaultEdge } from "@/CustomEdges";
import NoteNode from "@/CustomNodes/NoteNode";

import ForwardedIconComponent from "@/components/common/genericIconComponent";
import CanvasControls, {
  CustomControlButton,
} from "@/components/core/canvasControlsComponent";
import FlowToolbar from "@/components/core/flowToolbarComponent";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  COLOR_OPTIONS,
  NOTE_NODE_MIN_HEIGHT,
  NOTE_NODE_MIN_WIDTH,
} from "@/constants/constants";
import { useGetBuildsQuery } from "@/controllers/API/queries/_builds";
import { fetchAndCreateFlow } from "@/controllers/API/queries/flows/use-fetch-and-create-flow";
import CustomLoader from "@/customization/components/custom-loader";
import { track } from "@/customization/utils/analytics";
import useAutoSaveFlow from "@/hooks/flows/use-autosave-flow";
import useUploadFlow from "@/hooks/flows/use-upload-flow";
import { useAddComponent } from "@/hooks/useAddComponent";
import { nodeColorsName } from "@/utils/styleUtils";
import { cn, isSupportedNodeTypes } from "@/utils/utils";
import {
  Background,
  Connection,
  Edge,
  OnNodeDrag,
  OnSelectionChangeParams,
  Panel,
  ReactFlow,
  reconnectEdge,
  SelectionDragHandler,
} from "@xyflow/react";
import _, { cloneDeep } from "lodash";
import {
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useHotkeys } from "react-hotkeys-hook";
import GenericNode from "../../../../CustomNodes/GenericNode";
import {
  INVALID_SELECTION_ERROR_ALERT,
  UPLOAD_ALERT_LIST,
  UPLOAD_ERROR_ALERT,
  WRONG_FILE_ERROR_ALERT,
} from "../../../../constants/alerts_constants";
import useAlertStore from "../../../../stores/alertStore";
import useFlowStore from "../../../../stores/flowStore";
import useFlowsManagerStore from "../../../../stores/flowsManagerStore";
import { useShortcutsStore } from "../../../../stores/shortcuts";
import { useTypesStore } from "../../../../stores/typesStore";
import { APIClassType } from "../../../../types/api";
import { AllNodeType, EdgeType, NoteNodeType } from "../../../../types/flow";
import {
  generateFlow,
  generateNodeFromFlow,
  getNodeId,
  isValidConnection,
  scapeJSONParse,
  updateIds,
  validateSelection,
} from "../../../../utils/reactflowUtils";
import ConnectionLineComponent from "../ConnectionLineComponent";
import SelectionMenu from "../SelectionMenuComponent";
import UpdateAllComponents from "../UpdateAllComponents";
import getRandomName from "./utils/get-random-name";
import isWrappedWithClass from "./utils/is-wrapped-with-class";
import { motion, AnimatePresence } from "framer-motion";

// Particle component for animation
const FlowParticle = ({ delay, position }: {delay: number, position: {x: number, y: number}}) => {
  const getRandomColor = () => {
    const colors = ['#3ca885', '#63b3ed', '#fc8181', '#9f7aea', '#f6ad55'];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        duration: 1.5,
        ease: "easeInOut",
        delay 
      }
    }
  };
  
  return (
    <motion.div
      initial={{ 
        x: position.x, 
        y: position.y, 
        scale: 0, 
        opacity: 0
      }}
      animate={{ 
        x: position.x + (Math.random() * 100 - 50),
        y: position.y + (Math.random() * 100 - 50),
        scale: 1, 
        opacity: [0, 1, 0]
      }}
      transition={{ 
        duration: 2.5, 
        delay,
        ease: "easeInOut"
      }}
      style={{
        position: 'absolute',
        background: getRandomColor(),
        width: Math.random() * 10 + 5,
        height: Math.random() * 10 + 5,
        borderRadius: '50%',
        boxShadow: `0 0 ${Math.random() * 10 + 5}px ${getRandomColor()}`
      }}
    >
      {Math.random() > 0.5 && (
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ position: 'absolute', left: -50, top: -50 }}>
          <motion.path
            d={`M${Math.random() * 20} ${Math.random() * 20} Q ${Math.random() * 100} ${Math.random() * 100}, ${Math.random() * 80 + 20} ${Math.random() * 80 + 20}`}
            stroke={getRandomColor()}
            strokeWidth="2"
            fill="transparent"
            variants={pathVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>
      )}
    </motion.div>
  );
};

// Message types for chat interface
type MessageType = {
  id: string;
  content: string;
  sender: "user" | "system";
  timestamp: Date;
};

const nodeTypes = {
  genericNode: GenericNode,
  noteNode: NoteNode,
};

const edgeTypes = {
  default: DefaultEdge,
};

export default function Page({
  view,
  setIsLoading,
}: {
  view?: boolean;
  setIsLoading: (isLoading: boolean) => void;
}): JSX.Element {
  const uploadFlow = useUploadFlow();
  const autoSaveFlow = useAutoSaveFlow();
  const types = useTypesStore((state) => state.types);
  const templates = useTypesStore((state) => state.templates);
  const setFilterEdge = useFlowStore((state) => state.setFilterEdge);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const setPositionDictionary = useFlowStore(
    (state) => state.setPositionDictionary,
  );
  const reactFlowInstance = useFlowStore((state) => state.reactFlowInstance);
  const setReactFlowInstance = useFlowStore(
    (state) => state.setReactFlowInstance,
  );
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const isEmptyFlow = useRef(nodes.length === 0);
  const onNodesChange = useFlowStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
  const setNodes = useFlowStore((state) => state.setNodes);
  const setEdges = useFlowStore((state) => state.setEdges);
  const deleteNode = useFlowStore((state) => state.deleteNode);
  const deleteEdge = useFlowStore((state) => state.deleteEdge);
  const undo = useFlowsManagerStore((state) => state.undo);
  const redo = useFlowsManagerStore((state) => state.redo);
  const takeSnapshot = useFlowsManagerStore((state) => state.takeSnapshot);
  const paste = useFlowStore((state) => state.paste);
  const lastCopiedSelection = useFlowStore(
    (state) => state.lastCopiedSelection,
  );
  const setLastCopiedSelection = useFlowStore(
    (state) => state.setLastCopiedSelection,
  );
  const onConnect = useFlowStore((state) => state.onConnect);
  const setErrorData = useAlertStore((state) => state.setErrorData);
  const updateCurrentFlow = useFlowStore((state) => state.updateCurrentFlow);
  const [selectionMenuVisible, setSelectionMenuVisible] = useState(false);
  const edgeUpdateSuccessful = useRef(true);

  const position = useRef({ x: 0, y: 0 });
  const [lastSelection, setLastSelection] =
    useState<OnSelectionChangeParams | null>(null);
  const currentFlowId = useFlowsManagerStore((state) => state.currentFlowId);

  const [isAddingNote, setIsAddingNote] = useState(false);

  const addComponent = useAddComponent();

  const zoomLevel = reactFlowInstance?.getZoom();
  const shadowBoxWidth = NOTE_NODE_MIN_WIDTH * (zoomLevel || 1);
  const shadowBoxHeight = NOTE_NODE_MIN_HEIGHT * (zoomLevel || 1);
  const shadowBoxBackgroundColor = COLOR_OPTIONS[Object.keys(COLOR_OPTIONS)[0]];

  // New chat-related state
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([
    {
      id: "welcome",
      content: "Hello! Please describe your use case, and I'll create a flow for you.",
      sender: "system",
      timestamp: new Date(),
    },
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const componentsToUpdate = useFlowStore((state) => state.componentsToUpdate);

  // State for particles
  const [particles, setParticles] = useState<Array<{id: number, delay: number, position: {x: number, y: number}}>>([]);
  
  // Generate particles when animation starts
  useEffect(() => {
    if (isAnimating) {
      // Create random particles around the center of the screen
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      const newParticles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        position: {
          x: centerX + (Math.random() * 400 - 200),
          y: centerY + (Math.random() * 400 - 200)
        }
      }));
      
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [isAnimating]);

  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus();
    }
  }, [isChatOpen]);

  function handleGroupNode() {
    takeSnapshot();
    if (validateSelection(lastSelection!, edges).length === 0) {
      const clonedNodes = cloneDeep(nodes);
      const clonedEdges = cloneDeep(edges);
      const clonedSelection = cloneDeep(lastSelection);
      updateIds({ nodes: clonedNodes, edges: clonedEdges }, clonedSelection!);
      const { newFlow } = generateFlow(
        clonedSelection!,
        clonedNodes,
        clonedEdges,
        getRandomName(),
      );

      const newGroupNode = generateNodeFromFlow(newFlow, getNodeId);

      setNodes([
        ...clonedNodes.filter(
          (oldNodes) =>
            !clonedSelection?.nodes.some(
              (selectionNode) => selectionNode.id === oldNodes.id,
            ),
        ),
        newGroupNode,
      ]);
    } else {
      setErrorData({
        title: INVALID_SELECTION_ERROR_ALERT,
        list: validateSelection(lastSelection!, edges),
      });
    }
  }

  useEffect(() => {
    const handleMouseMove = (event) => {
      position.current = { x: event.clientX, y: event.clientY };
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [lastCopiedSelection, lastSelection, takeSnapshot, selectionMenuVisible]);

  const { isFetching } = useGetBuildsQuery({ flowId: currentFlowId });

  const showCanvas =
    Object.keys(templates).length > 0 &&
    Object.keys(types).length > 0 &&
    !isFetching;

  useEffect(() => {
    setIsLoading(!showCanvas);
  }, [showCanvas]);

  useEffect(() => {
    useFlowStore.setState({ autoSaveFlow });
  }, [autoSaveFlow]);

  function handleUndo(e: KeyboardEvent) {
    if (!isWrappedWithClass(e, "noflow")) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      undo();
    }
  }

  function handleRedo(e: KeyboardEvent) {
    if (!isWrappedWithClass(e, "noflow")) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      redo();
    }
  }

  function handleGroup(e: KeyboardEvent) {
    if (selectionMenuVisible) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      handleGroupNode();
    }
  }

  function handleDuplicate(e: KeyboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    (e as unknown as Event).stopImmediatePropagation();
    const selectedNode = nodes.filter((obj) => obj.selected);
    if (selectedNode.length > 0) {
      paste(
        { nodes: selectedNode, edges: [] },
        {
          x: position.current.x,
          y: position.current.y,
        },
      );
    }
  }

  function handleCopy(e: KeyboardEvent) {
    const multipleSelection = lastSelection?.nodes
      ? lastSelection?.nodes.length > 0
      : false;
    if (
      !isWrappedWithClass(e, "noflow") &&
      (isWrappedWithClass(e, "react-flow__node") || multipleSelection)
    ) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      if (window.getSelection()?.toString().length === 0 && lastSelection) {
        setLastCopiedSelection(_.cloneDeep(lastSelection));
      }
    }
  }

  function handleCut(e: KeyboardEvent) {
    if (!isWrappedWithClass(e, "noflow")) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      if (window.getSelection()?.toString().length === 0 && lastSelection) {
        setLastCopiedSelection(_.cloneDeep(lastSelection), true);
      }
    }
  }

  function handlePaste(e: KeyboardEvent) {
    if (!isWrappedWithClass(e, "noflow")) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      if (
        window.getSelection()?.toString().length === 0 &&
        lastCopiedSelection
      ) {
        takeSnapshot();
        paste(lastCopiedSelection, {
          x: position.current.x,
          y: position.current.y,
        });
      }
    }
  }

  function handleDelete(e: KeyboardEvent) {
    if (!isWrappedWithClass(e, "nodelete") && lastSelection) {
      e.preventDefault();
      (e as unknown as Event).stopImmediatePropagation();
      takeSnapshot();
      if (lastSelection.edges?.length) {
        track("Component Connection Deleted");
      }
      if (lastSelection.nodes?.length) {
        lastSelection.nodes.forEach((n) => {
          track("Component Deleted", { componentType: n.data.type });
        });
      }
      deleteNode(lastSelection.nodes.map((node) => node.id));
      deleteEdge(lastSelection.edges.map((edge) => edge.id));
    }
  }

  const undoAction = useShortcutsStore((state) => state.undo);
  const redoAction = useShortcutsStore((state) => state.redo);
  const redoAltAction = useShortcutsStore((state) => state.redoAlt);
  const copyAction = useShortcutsStore((state) => state.copy);
  const duplicate = useShortcutsStore((state) => state.duplicate);
  const deleteAction = useShortcutsStore((state) => state.delete);
  const groupAction = useShortcutsStore((state) => state.group);
  const cutAction = useShortcutsStore((state) => state.cut);
  const pasteAction = useShortcutsStore((state) => state.paste);
  //@ts-ignore
  useHotkeys(undoAction, handleUndo);
  //@ts-ignore
  useHotkeys(redoAction, handleRedo);
  //@ts-ignore
  useHotkeys(redoAltAction, handleRedo);
  //@ts-ignore
  useHotkeys(groupAction, handleGroup);
  //@ts-ignore
  useHotkeys(duplicate, handleDuplicate);
  //@ts-ignore
  useHotkeys(copyAction, handleCopy);
  //@ts-ignore
  useHotkeys(cutAction, handleCut);
  //@ts-ignore
  useHotkeys(pasteAction, handlePaste);
  //@ts-ignore
  useHotkeys(deleteAction, handleDelete);
  //@ts-ignore
  useHotkeys("delete", handleDelete);

  const onConnectMod = useCallback(
    (params: Connection) => {
      takeSnapshot();
      onConnect(params);
      track("New Component Connection Added");
    },
    [takeSnapshot, onConnect],
  );

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    // 👇 make dragging a node undoable

    takeSnapshot();
    // 👉 you can place your event handlers here
  }, [takeSnapshot]);

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    // 👇 make moving the canvas undoable
    autoSaveFlow();
    updateCurrentFlow({ nodes });
    setPositionDictionary({});
  }, [
    takeSnapshot,
    autoSaveFlow,
    nodes,
    edges,
    reactFlowInstance,
    setPositionDictionary,
  ]);

  const onSelectionDragStart: SelectionDragHandler = useCallback(() => {
    // 👇 make dragging a selection undoable

    takeSnapshot();
  }, [takeSnapshot]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer.types.some((types) => isSupportedNodeTypes(types))) {
      event.dataTransfer.dropEffect = "move";
    } else {
      event.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const grabbingElement =
        document.getElementsByClassName("cursor-grabbing");
      if (grabbingElement.length > 0) {
        document.body.removeChild(grabbingElement[0]);
      }
      if (event.dataTransfer.types.some((type) => isSupportedNodeTypes(type))) {
        takeSnapshot();

        const datakey = event.dataTransfer.types.find((type) =>
          isSupportedNodeTypes(type),
        );

        // Extract the data from the drag event and parse it as a JSON object
        const data: { type: string; node?: APIClassType } = JSON.parse(
          event.dataTransfer.getData(datakey!),
        );

        addComponent(data.node!, data.type, {
          x: event.clientX,
          y: event.clientY,
        });
      } else if (event.dataTransfer.types.some((types) => types === "Files")) {
        takeSnapshot();
        const position = {
          x: event.clientX,
          y: event.clientY,
        };
        uploadFlow({
          files: Array.from(event.dataTransfer.files!),
          position: position,
        }).catch((error) => {
          setErrorData({
            title: UPLOAD_ERROR_ALERT,
            list: [(error as Error).message],
          });
        });
      } else {
        setErrorData({
          title: WRONG_FILE_ERROR_ALERT,
          list: [UPLOAD_ALERT_LIST],
        });
      }
    },
    [takeSnapshot, addComponent],
  );

  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: EdgeType, newConnection: Connection) => {
      if (isValidConnection(newConnection, nodes, edges)) {
        edgeUpdateSuccessful.current = true;
        oldEdge.data = {
          targetHandle: scapeJSONParse(newConnection.targetHandle!),
          sourceHandle: scapeJSONParse(newConnection.sourceHandle!),
        };
        setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
      }
    },
    [setEdges],
  );

  const onEdgeUpdateEnd = useCallback((_, edge: Edge): void => {
    if (!edgeUpdateSuccessful.current) {
      setEdges((eds) => eds.filter((edg) => edg.id !== edge.id));
    }
    edgeUpdateSuccessful.current = true;
  }, []);

  const [selectionEnded, setSelectionEnded] = useState(true);

  const onSelectionEnd = useCallback(() => {
    setSelectionEnded(true);
  }, []);
  const onSelectionStart = useCallback((event: MouseEvent) => {
    event.preventDefault();
    setSelectionEnded(false);
  }, []);

  // Workaround to show the menu only after the selection has ended.
  useEffect(() => {
    if (selectionEnded && lastSelection && lastSelection.nodes.length > 1) {
      setSelectionMenuVisible(true);
    } else {
      setSelectionMenuVisible(false);
    }
  }, [selectionEnded, lastSelection]);

  const onSelectionChange = useCallback(
    (flow: OnSelectionChangeParams): void => {
      setLastSelection(flow);
    },
    [],
  );

  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      setFilterEdge([]);
      if (isAddingNote) {
        const shadowBox = document.getElementById("shadow-box");
        if (shadowBox) {
          shadowBox.style.display = "none";
        }
        const position = reactFlowInstance?.screenToFlowPosition({
          x: event.clientX - shadowBoxWidth / 2,
          y: event.clientY - shadowBoxHeight / 2,
        });
        const data = {
          node: {
            description: "",
            display_name: "",
            documentation: "",
            template: {},
          },
          type: "note",
        };
        const newId = getNodeId(data.type);

        const newNode: NoteNodeType = {
          id: newId,
          type: "noteNode",
          position: position || { x: 0, y: 0 },
          data: {
            ...data,
            id: newId,
          },
        };
        setNodes((nds) => nds.concat(newNode));
        setIsAddingNote(false);
      }
    },
    [isAddingNote, setNodes, reactFlowInstance, getNodeId, setFilterEdge],
  );

  const handleEdgeClick = (event, edge) => {
    const color =
      nodeColorsName[edge?.data?.sourceHandle?.output_types[0]] || "cyan";

    const accentColor = `hsl(var(--datatype-${color}))`;
    reactFlowWrapper.current?.style.setProperty("--selected", accentColor);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (event) => {
      if (isAddingNote) {
        const shadowBox = document.getElementById("shadow-box");
        if (shadowBox) {
          shadowBox.style.display = "block";
          shadowBox.style.left = `${event.clientX - shadowBoxWidth / 2}px`;
          shadowBox.style.top = `${event.clientY - shadowBoxHeight / 2}px`;
        }
      }
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
    };
  }, [isAddingNote, shadowBoxWidth, shadowBoxHeight]);

  // Updated function to handle fetching flows via chat
  const handleSendMessage = async () => {
    // Don't do anything if input is empty
    if (!userInput.trim()) return;
    
    // Create a new user message
    const userMessage: MessageType = {
      id: Date.now().toString(),
      content: userInput,
      sender: "user",
      timestamp: new Date(),
    };
    
    // Store the input before clearing it
    const currentInput = userInput;
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setUserInput("");
    
    // Start animation
    setIsAnimating(true);
    
    // Add typing indicator
    const typingIndicatorId = Date.now() + 999;
    setMessages(prev => [...prev, {
      id: typingIndicatorId.toString(),
      content: "typing-indicator",
      sender: "system",
      timestamp: new Date(),
    }]);
    
    try {
      console.log("Sending user input to backend:", currentInput);
      
      // Fetch flow with the user input
      const testFlowId = "test-flow-id";
      await fetchAndCreateFlow(testFlowId, currentInput);
      
      // Wait a moment for natural feeling
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId.toString()));
      
      // Create a success message
      const systemMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        content: "Flow created successfully based on your description!",
        sender: "system",
        timestamp: new Date(),
      };
      
      // Add system response to chat
      setMessages(prev => [...prev, systemMessage]);
      
    } catch (error) {
      console.error("Error fetching and rendering flow:", error);
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId.toString()));
      
      // Create an error message
      const errorMessage: MessageType = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error while creating your flow. Please try again.",
        sender: "system",
        timestamp: new Date(),
      };
      
      // Add error message to chat
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // Stop animation after 1 second to ensure it's visible
      setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
    }
  };

  // Handle key press (Enter to send)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full w-full bg-canvas" ref={reactFlowWrapper}>
      {showCanvas ? (
        <div id="react-flow-id" className="h-full w-full bg-canvas flow-canvas">
          <ReactFlow<AllNodeType, EdgeType>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnectMod}
            disableKeyboardA11y={true}
            onInit={setReactFlowInstance}
            nodeTypes={nodeTypes}
            onReconnect={onEdgeUpdate}
            onReconnectStart={onEdgeUpdateStart}
            onReconnectEnd={onEdgeUpdateEnd}
            onNodeDragStart={onNodeDragStart}
            onSelectionDragStart={onSelectionDragStart}
            elevateEdgesOnSelect={true}
            onSelectionEnd={onSelectionEnd}
            onSelectionStart={onSelectionStart}
            connectionRadius={30}
            edgeTypes={edgeTypes}
            connectionLineComponent={ConnectionLineComponent}
            onDragOver={onDragOver}
            onNodeDragStop={onNodeDragStop}
            onDrop={onDrop}
            onSelectionChange={onSelectionChange}
            deleteKeyCode={[]}
            fitView={isEmptyFlow.current ? false : true}
            fitViewOptions={{
              minZoom: 0.2,
              maxZoom: 8,
            }}
            className="theme-attribution flow-canvas"
            minZoom={0.2}
            maxZoom={3}
            zoomOnScroll={!view}
            zoomOnPinch={!view}
            panOnDrag={!view}
            panActivationKeyCode={""}
            proOptions={{ hideAttribution: true }}
            onPaneClick={onPaneClick}
            onEdgeClick={handleEdgeClick}
          >
            <Background size={2} gap={20} className="bg-grid-pattern" />
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 pointer-events-none z-0"></div>
            {!view && (
              <>
                <CanvasControls>
                  <CustomControlButton
                    iconName="sticky-note"
                    tooltipText="Add Note"
                    onClick={() => {
                      setIsAddingNote(true);
                      const shadowBox = document.getElementById("shadow-box");
                      if (shadowBox) {
                        shadowBox.style.display = "block";
                        shadowBox.style.left = `${position.current.x - shadowBoxWidth / 2}px`;
                        shadowBox.style.top = `${position.current.y - shadowBoxHeight / 2}px`;
                      }
                    }}
                    iconClasses="text-primary"
                    testId="add_note"
                  />
                </CanvasControls>
                <FlowToolbar />
              </>
            )}
            <Panel
              className={cn(
                "react-flow__controls !m-2 flex gap-1.5 rounded-md border border-secondary-hover bg-background fill-foreground stroke-foreground p-1.5 text-primary shadow transition-all duration-300 [&>button]:border-0 [&>button]:bg-background hover:[&>button]:bg-accent",
                "pointer-events-auto opacity-100 group-data-[open=true]/sidebar-wrapper:pointer-events-none group-data-[open=true]/sidebar-wrapper:-translate-x-full group-data-[open=true]/sidebar-wrapper:opacity-0",
              )}
              position="top-left"
            >
              <SidebarTrigger className="h-fit w-fit px-3 py-1.5">
                <ForwardedIconComponent
                  name="PanelRightClose"
                  className="h-4 w-4"
                />
                <span className="text-foreground">Components</span>
              </SidebarTrigger>
            </Panel>
            <div className={cn(componentsToUpdate.length === 0 && "hidden")}>
              <UpdateAllComponents />
            </div>
            <SelectionMenu
              lastSelection={lastSelection}
              isVisible={selectionMenuVisible}
              nodes={lastSelection?.nodes}
              onClick={() => {
                handleGroupNode();
              }}
            />
          </ReactFlow>
          <div
            id="shadow-box"
            style={{
              position: "absolute",
              width: `${shadowBoxWidth}px`,
              height: `${shadowBoxHeight}px`,
              backgroundColor: `${shadowBoxBackgroundColor}`,
              opacity: 0.7,
              pointerEvents: "none",
              display: "none",
            }}
          ></div>
          
          {/* Chatbot UI */}
          <AnimatePresence>
            <motion.div
              className="absolute bottom-6 right-6 z-50"
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Chat toggle button */}
              {!isChatOpen && (
                <motion.button
                  className="chatbot-toggle-btn shadow-xl rounded-full bg-[#3ca885] text-white p-4 flex items-center justify-center pulse-animation"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsChatOpen(true)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <ForwardedIconComponent name="message-circle" className="h-6 w-6" />
                </motion.button>
              )}
              
              {/* Chat interface */}
              {isChatOpen && (
                <motion.div
                  className="chatbot-container flex flex-col dark:bg-zinc-900 bg-white border dark:border-zinc-800 border-zinc-200 rounded-lg shadow-2xl overflow-hidden"
                  style={{ width: "380px", height: "500px", maxHeight: "80vh" }}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Chat header */}
                  <div className="chat-header flex items-center justify-between px-4 py-3 bg-[#3ca885]/95 text-white">
                    <div className="flex items-center gap-2">
                      <ForwardedIconComponent name="bot" className="h-5 w-5" />
                      <h3 className="font-medium">Flow Assistant</h3>
                    </div>
                    <button 
                      className="p-1 rounded-md hover:bg-white/20 transition-colors"
                      onClick={() => setIsChatOpen(false)}
                    >
                      <ForwardedIconComponent name="x" className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {/* Messages container */}
                  <div className="messages-container flex-1 p-4 overflow-y-auto bg-transparent">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        className={`message mb-3 ${
                          message.sender === "user" ? "user-message" : "system-message"
                        }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {message.content === "typing-indicator" ? (
                          <div className="p-3 rounded-lg bg-gray-100 dark:bg-zinc-800">
                            <div className="typing-indicator">
                              <span></span>
                              <span></span>
                              <span></span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div
                              className={`p-3 rounded-lg max-w-[85%] ${
                                message.sender === "user"
                                  ? "bg-[#3ca885] text-white ml-auto"
                                  : "bg-gray-100 dark:bg-zinc-800 dark:text-zinc-200"
                              }`}
                            >
                              {message.content}
                            </div>
                            <div 
                              className={`text-xs text-gray-500 mt-1 ${
                                message.sender === "user" ? "text-right" : "text-left"
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  
                  {/* Input area */}
                  <div className="input-container p-3 border-t dark:border-zinc-800 border-zinc-200 bg-transparent">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        className="w-full px-4 py-2 pr-12 rounded-full border dark:border-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3ca885]"
                        placeholder="Type your question..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                      />
                      <motion.button
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 bg-[#3ca885] text-white disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSendMessage}
                        disabled={isAnimating || !userInput.trim()}
                      >
                        {isAnimating ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                          >
                            <ForwardedIconComponent name="loader-2" className="h-4 w-4" />
                          </motion.div>
                        ) : (
                          <ForwardedIconComponent name="send" className="h-4 w-4" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Animated background when processing */}
          <AnimatePresence>
            {isAnimating && (
              <motion.div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 pointer-events-none flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Flow particles */}
                {particles.map((particle) => (
                  <FlowParticle 
                    key={particle.id} 
                    delay={particle.delay} 
                    position={particle.position} 
                  />
                ))}
                
                <motion.div 
                  className="relative"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="gradients-container absolute inset-0 rounded-full"
                    style={{ width: 120, height: 120 }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className={`g${i+1} absolute inset-0 rounded-full bg-[#3ca885]/70`}
                        initial={{ scale: 0.5, opacity: 0.4 }}
                        animate={{ 
                          scale: [0.5, 1.2, 0.5], 
                          opacity: [0.4, 0.8, 0.4]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                        }}
                      />
                    ))}
                  </motion.div>
                  <motion.div
                    className="bg-[#3ca885] text-white p-6 rounded-full shadow-xl flex items-center justify-center z-10 relative"
                    style={{ width: 120, height: 120 }}
                    animate={{ 
                      boxShadow: [
                        "0 0 0 0 rgba(60, 168, 133, 0.4)", 
                        "0 0 0 20px rgba(60, 168, 133, 0)", 
                        "0 0 0 0 rgba(60, 168, 133, 0)"
                      ],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: "loop"
                    }}
                  >
                    <motion.div
                      animate={{ 
                        rotate: 360,
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <ForwardedIconComponent name="bot" className="h-12 w-12" />
                    </motion.div>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <CustomLoader remSize={30} />
        </div>
      )}
    </div>
  );
}

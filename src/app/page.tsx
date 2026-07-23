"use client";

import { DragEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Connection,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";

type ModuleKey = "workspace" | "resources" | "agents";
type WorkspaceView = "home" | "templates" | "builder" | "processing";
type AgentCenterMode = "list" | "create" | "edit";
type ResourceSubView = "management" | "governance" | "sharing";
type UserRole = "province" | "city";
type ResourceCategory =
  | "understanding"
  | "data"
  | "model"
  | "knowledge"
  | "execution"
  | "judgement"
  | "tools";

type ResourceItem = {
  id: string;
  name: string;
  category: ResourceCategory;
  description: string;
  inputType: string;
  outputType: string;
  kind: "agent" | "tool";
};

type FlowNodeData = {
  label: string;
  category: string;
  inputType: string;
  outputType: string;
  kind: "agent" | "tool" | "resource";
  description?: string;
  sourceOrg?: string;
  resourceCategory?: string;
  dataPorts?: string[];
  standardSide?: "input" | "output";
  testStatus?: "idle" | "running" | "passed";
  config?: Record<string, string>;
};

type PendingToolChoice = {
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  sourceType: string;
  targetType: string;
};

type AgentNavigationState = {
  mode: AgentCenterMode;
  returnToWorkspace: boolean;
  editingAgent?: FlowNodeData;
};

const categories: Array<{ id: ResourceCategory; label: string }> = [
  { id: "understanding", label: "任务理解" },
  { id: "data", label: "数据调度" },
  { id: "model", label: "模型调度" },
  { id: "knowledge", label: "知识调度" },
  { id: "execution", label: "计算执行" },
  { id: "judgement", label: "数据研判" },
  { id: "tools", label: "处理工具" },
];

const resources: ResourceItem[] = [
  {
    id: "understand-1",
    name: "耕地任务解析智能体",
    category: "understanding",
    description: "将自然语言任务指令解析为分任务 JSON 和规则检索文本。",
    inputType: "文本",
    outputType: "JSON / 文本",
    kind: "agent",
  },
  {
    id: "data-1",
    name: "用地监测数据调度智能体",
    category: "data",
    description: "根据任务 JSON 组织遥感、图斑和永农数据资源调度方案。",
    inputType: "JSON",
    outputType: "JSON",
    kind: "agent",
  },
  {
    id: "model-1",
    name: "遥感变化监测调度智能体",
    category: "model",
    description: "根据任务 JSON 检索候选模型，输出模型选择、参数和数据适配关系。",
    inputType: "JSON",
    outputType: "JSON",
    kind: "agent",
  },
  {
    id: "execution-1",
    name: "用地监测计算执行智能体",
    category: "execution",
    description: "接收调度 JSON，完成数据检索、图斑上下文装配和模型执行，输出栅格成果。",
    inputType: "JSON",
    outputType: "栅格",
    kind: "agent",
  },
  {
    id: "knowledge-1",
    name: "耕地规则研判智能体",
    category: "knowledge",
    description: "根据任务文本检索规则库，为合规研判提供规则依据。",
    inputType: "文本",
    outputType: "文本 / JSON",
    kind: "agent",
  },
  {
    id: "judge-1",
    name: "图斑合规研判智能体",
    category: "judgement",
    description: "融合任务目标、矢量数据包和规则依据，实现合规研判。",
    inputType: "文本 / 矢量 / JSON",
    outputType: "矢量 / JSON / 文本",
    kind: "agent",
  },
  {
    id: "tool-raster-vector",
    name: "栅格转矢量工具",
    category: "tools",
    description: "将栅格变化掩膜转换为矢量变化图斑。",
    inputType: "栅格",
    outputType: "矢量",
    kind: "tool",
  },
  {
    id: "tool-coordinate",
    name: "坐标转换工具",
    category: "tools",
    description: "统一不同来源数据的坐标系统。",
    inputType: "矢量",
    outputType: "矢量",
    kind: "tool",
  },
  {
    id: "tool-field-map",
    name: "字段映射工具",
    category: "tools",
    description: "将上游输出字段映射到下游输入字段。",
    inputType: "JSON",
    outputType: "JSON",
    kind: "tool",
  },
];
const initialNodes: Node<FlowNodeData>[] = [
  {
    id: "n1",
    type: "agent",
    position: { x: 80, y: 80 },
    data: {
      label: "耕地任务解析智能体",
      category: "任务理解",
      description: "接收自然语言任务指令，输出分任务 JSON 与规则检索文本。",
      inputType: "文本",
      outputType: "JSON / 文本",
      kind: "agent",
    },
  },
  {
    id: "n2",
    type: "agent",
    position: { x: 420, y: 70 },
    data: {
      label: "用地监测数据调度智能体",
      category: "数据调度",
      description: "根据任务 JSON 组织遥感、图斑和永农数据资源调度方案。",
      inputType: "JSON",
      outputType: "JSON",
      kind: "agent",
    },
  },
  {
    id: "n3",
    type: "agent",
    position: { x: 420, y: 250 },
    data: {
      label: "遥感变化监测调度智能体",
      category: "模型调度",
      description: "依据任务 JSON 检索候选模型，输出模型选择、参数和数据适配关系。",
      inputType: "JSON",
      outputType: "JSON",
      kind: "agent",
    },
  },
  {
    id: "n4",
    type: "agent",
    position: { x: 1140, y: 145 },
    data: {
      label: "图斑合规研判智能体",
      category: "数据研判",
      description: "融合任务目标、矢量数据包和规则依据，输出空间研判结果。",
      inputType: "文本 / 矢量 / JSON",
      outputType: "矢量 / JSON / 文本",
      kind: "agent",
    },
  },
  {
    id: "n7",
    type: "agent",
    position: { x: 760, y: 165 },
    data: {
      label: "用地监测计算执行智能体",
      category: "计算执行",
      description: "接收调度 JSON，完成数据检索、图斑上下文装配和模型执行，输出栅格成果。",
      inputType: "JSON",
      outputType: "栅格",
      kind: "agent",
    },
  },
  {
    id: "n5",
    type: "tool",
    position: { x: 980, y: 235 },
    data: {
      label: "栅格转矢量工具",
      category: "处理工具",
      description: "将计算执行输出的栅格成果转换为合规研判所需的矢量图斑。",
      inputType: "栅格",
      outputType: "矢量",
      kind: "tool",
    },
  },
  {
    id: "n6",
    type: "agent",
    position: { x: 760, y: 20 },
    data: {
      label: "耕地规则研判智能体",
      category: "知识调度",
      description: "根据任务文本检索规则库，形成可被合规研判调用的规则依据。",
      inputType: "文本",
      outputType: "文本 / JSON",
      kind: "agent",
    },
  },
];
const initialEdges: Edge[] = [
  {
    id: "e1-2",
    source: "n1",
    sourceHandle: "out-0",
    target: "n2",
    targetHandle: "in-0",
    label: "JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e1-3",
    source: "n1",
    sourceHandle: "out-0",
    target: "n3",
    targetHandle: "in-0",
    label: "JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e1-6",
    source: "n1",
    sourceHandle: "out-1",
    target: "n6",
    targetHandle: "in-0",
    label: "文本",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e1-4",
    source: "n1",
    sourceHandle: "out-1",
    target: "n4",
    targetHandle: "in-0",
    label: "文本",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e2-7",
    source: "n2",
    sourceHandle: "out-0",
    target: "n7",
    targetHandle: "in-0",
    label: "JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e3-7",
    source: "n3",
    sourceHandle: "out-0",
    target: "n7",
    targetHandle: "in-0",
    label: "JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e7-5",
    source: "n7",
    sourceHandle: "out-0",
    target: "n5",
    targetHandle: "in-0",
    label: "栅格",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e5-4",
    source: "n5",
    sourceHandle: "out-0",
    target: "n4",
    targetHandle: "in-1",
    label: "矢量",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e6-4",
    source: "n6",
    sourceHandle: "out-0",
    target: "n4",
    targetHandle: "in-0",
    label: "文本",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "e6-4-json",
    source: "n6",
    sourceHandle: "out-1",
    target: "n4",
    targetHandle: "in-2",
    label: "JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

const dataTypeKeywords = [
  ["raster", ["栅格", "影像", "遥感", "掩膜", "GeoTIFF"]],
  ["vector", ["矢量", "图斑", "空间", "GeoJSON", "Shapefile", "图层"]],
  ["json", ["JSON", "结构化", "任务"]],
  ["text", ["自然语言", "文本", "政策", "规则", "条款", "结论", "依据"]],
  ["table", ["表格", "CSV", "Excel", "面积"]],
  ["report", ["报告", "材料", "PDF", "DOCX"]],
] as const;

const dataTypeLegendItems = [
  { type: "json", label: "JSON" },
  { type: "raster", label: "栅格" },
  { type: "vector", label: "矢量" },
  { type: "text", label: "文本" },
  { type: "table", label: "表格" },
  { type: "report", label: "PDF" },
  { type: "default", label: "其他类型" },
];

function splitDataPorts(value: string) {
  return value
    .split(/[\/、,，;；|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDataTypeClass(value: string) {
  if (value === "文本") return "text";
  if (value === "JSON") return "json";
  if (value === "矢量") return "vector";
  if (value === "栅格") return "raster";
  if (value === "表格") return "table";
  if (value === "PDF") return "report";
  const matched = dataTypeKeywords.find(([, keywords]) =>
    keywords.some((keyword) => value.includes(keyword)),
  );
  return matched?.[0] || "default";
}

function normalizeDataStandardLabel(label: string) {
  if (label.includes("JSON")) return "JSON";
  if (label.includes("矢量") || label.includes("图斑") || label.includes("图层")) return "矢量";
  if (label.includes("遥感") || label.includes("影像") || label.includes("栅格")) return "栅格";
  if (label.includes("文本") || label.includes("自然语言")) return "文本";
  if (label.includes("表格") || label.includes("CSV") || label.includes("Excel")) return "表格";
  if (label.includes("文档") || label.includes("报告") || label.includes("PDF")) return "PDF";
  return "其他类型";
}

function getPortValueByHandle(
  value: string,
  handleId: string | null | undefined,
) {
  const ports = splitDataPorts(value);
  const matchedIndex = handleId?.match(/(?:in|out)-(\d+)/)?.[1];
  if (matchedIndex === undefined) return ports;
  const port = ports[Number(matchedIndex)];
  return port ? [port] : ports;
}

function getCompatiblePortPair(sourcePorts: string[], targetPorts: string[]) {
  for (const sourcePort of sourcePorts) {
    const sourceType = getDataTypeClass(sourcePort);
    for (const targetPort of targetPorts) {
      const targetType = getDataTypeClass(targetPort);
      if (
        sourcePort === targetPort ||
        (sourceType !== "default" && sourceType === targetType)
      ) {
        return { sourcePort, targetPort, dataType: sourceType };
      }
    }
  }
  return null;
}

function getPortTop(index: number, total: number) {
  return `${((index + 1) * 100) / (total + 1)}%`;
}

function getTestStatusLabel(status?: "idle" | "running" | "passed") {
  if (status === "passed") return "已通过";
  if (status === "running") return "测试中";
  return "待测";
}
function AgentNode({ data }: NodeProps<FlowNodeData>) {
  const inputPorts = splitDataPorts(data.inputType);
  const outputPorts = splitDataPorts(data.outputType);
  return (
    <div className="flow-node-card agent-node-card">
      {data.testStatus ? <span className={`node-status status-${data.testStatus}`}>{getTestStatusLabel(data.testStatus)}</span> : null}
      {inputPorts.map((port, index) => (
        <Handle
          className={`big-handle data-port port-${getDataTypeClass(port)}`}
          id={`in-${index}`}
          key={`in-${port}-${index}`}
          position={Position.Left}
          style={{ top: getPortTop(index, inputPorts.length) }}
          type="target"
        />
      ))}
      <Handle className="big-handle legacy-single-handle" type="target" position={Position.Left} />
      <span>{data.category}</span>
      <strong>{data.label}</strong>
      {data.description ? <p className="node-description">{data.description}</p> : null}
      <div className="node-port-summary">
        <small>输入：{inputPorts.join(" / ")}</small>
        <small>输出：{outputPorts.join(" / ")}</small>
      </div>
      {outputPorts.map((port, index) => (
        <Handle
          className={`big-handle data-port port-${getDataTypeClass(port)}`}
          id={`out-${index}`}
          key={`out-${port}-${index}`}
          position={Position.Right}
          style={{ top: getPortTop(index, outputPorts.length) }}
          type="source"
        />
      ))}
      <Handle className="big-handle legacy-single-handle" type="source" position={Position.Right} />
    </div>
  );
}

function ToolNode({ data }: NodeProps<FlowNodeData>) {
  const inputColor = getDataTypeClass(data.inputType);
  const outputColor = getDataTypeClass(data.outputType);
  return (
    <div className="tool-node-card" title={`${data.inputType} → ${data.outputType}`}>
      {data.testStatus ? <span className={`node-status status-${data.testStatus}`}>{getTestStatusLabel(data.testStatus)}</span> : null}
      <span className={`tool-type-marker tool-from-${inputColor} tool-to-${outputColor}`} />
      <Handle className={`big-handle tool-handle data-port port-${inputColor}`} type="target" position={Position.Left} />
      <div className="tool-icon">T</div>
      <strong>{data.label}</strong>
      <Handle className={`big-handle tool-handle data-port port-${outputColor}`} type="source" position={Position.Right} />
    </div>
  );
}

function ResourceNode({ data }: NodeProps<FlowNodeData>) {
  const dataPorts = data.dataPorts?.length ? data.dataPorts : [data.outputType];
  if (data.standardSide) {
    const isInputStandard = data.standardSide === "input";
    return (
      <div className={`resource-token-node standard-node category-${data.resourceCategory || "default"}`}>
        <span className="resource-node-org">{data.sourceOrg}</span>
        <strong>{data.label}</strong>
        <small>{data.category}</small>
        <div className="standard-port-list">
          {dataPorts.map((port, index) => {
            const top = `${((index + 1) * 100) / (dataPorts.length + 1)}%`;
            return (
              <div className={`standard-port-row row-${getDataTypeClass(port)}`} key={port}>
                {!isInputStandard ? (
                  <Handle
                    className={`big-handle resource-handle standard-port-handle data-port port-${getDataTypeClass(port)}`}
                    id={`in-${index}`}
                    type="target"
                    position={Position.Left}
                    style={{ top }}
                  />
                ) : null}
                <span>{port}</span>
                {isInputStandard ? (
                  <Handle
                    className={`big-handle resource-handle standard-port-handle data-port port-${getDataTypeClass(port)}`}
                    id={`out-${index}`}
                    type="source"
                    position={Position.Right}
                    style={{ top }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`resource-token-node category-${data.resourceCategory || "default"}`}>
      {data.testStatus ? <span className={`node-status status-${data.testStatus}`}>{getTestStatusLabel(data.testStatus)}</span> : null}
      <Handle className="big-handle resource-handle" type="target" position={Position.Left} />
      <span className="resource-node-org">{data.sourceOrg}</span>
      <strong>{data.label}</strong>
      <small>{data.category}</small>
      <Handle className="big-handle resource-handle" type="source" position={Position.Right} />
    </div>
  );
}

function FlowBuilder({
  onCreateAgent,
  onEditAgent,
}: {
  onCreateAgent: () => void;
  onEditAgent: (agent: FlowNodeData) => void;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeCategory, setActiveCategory] =
    useState<ResourceCategory>("understanding");
  const [notice, setNotice] = useState("智能体节点支持多输入/多输出端口；处理工具用于连接不同数据源类型。");
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<FlowNodeData | null>(null);
  const [pendingToolChoice, setPendingToolChoice] =
    useState<PendingToolChoice | null>(null);
  const reactFlow = useReactFlow();
  const nodeTypes = useMemo(
    () => ({ agent: AgentNode, tool: ToolNode }),
    [],
  );

  const filteredResources = resources.filter(
    (item) => item.category === activeCategory,
  );

  const compatibleTools = useMemo(() => {
    if (!pendingToolChoice) return [];
    return resources.filter(
      (item) =>
        item.kind === "tool" &&
        getCompatiblePortPair([pendingToolChoice.sourceType], [item.inputType]) &&
        getCompatiblePortPair([item.outputType], [pendingToolChoice.targetType]),
    );
  }, [pendingToolChoice]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source);
      const target = nodes.find((node) => node.id === connection.target);
      if (!source || !target || !connection.source || !connection.target) return;

      const sourcePorts = getPortValueByHandle(
        source.data.outputType,
        connection.sourceHandle,
      );
      const targetPorts = getPortValueByHandle(
        target.data.inputType,
        connection.targetHandle,
      );
      const compatiblePair = getCompatiblePortPair(sourcePorts, targetPorts);

      if (!compatiblePair) {
        setPendingToolChoice({
          sourceId: connection.source,
          targetId: connection.target,
          sourceName: source.data.label,
          targetName: target.data.label,
          sourceType: sourcePorts[0] || source.data.outputType,
          targetType: targetPorts[0] || target.data.inputType,
        });
        setNotice(
          `连接暂未建立：${sourcePorts.join(" / ")} 无法直接传入 ${targetPorts.join(" / ")}，需要选择处理工具。`,
        );
        return;
      }

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            label:
              compatiblePair.sourcePort === compatiblePair.targetPort
                ? compatiblePair.sourcePort
                : `${compatiblePair.sourcePort} → ${compatiblePair.targetPort}`,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges,
        ),
      );
      setNotice(
        `连接已建立：${compatiblePair.sourcePort} 与 ${compatiblePair.targetPort} 类型匹配。`,
      );
    },
    [nodes, setEdges],
  );

  const onDragStart = (
    event: DragEvent<HTMLButtonElement>,
    resource: ResourceItem,
  ) => {
    event.dataTransfer.setData("application/agent-resource", JSON.stringify(resource));
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/agent-resource");
      if (!raw) return;
      const resource = JSON.parse(raw) as ResourceItem;
      const position = reactFlow.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setNodes((currentNodes) => [
        ...currentNodes,
        {
          id: resource.id + "-" + Date.now(),
          type: resource.kind,
          position,
          data: {
            label: resource.name,
            category:
              categories.find((category) => category.id === resource.category)
                ?.label || "资源",
            description: resource.description,
            inputType: resource.inputType,
            outputType: resource.outputType,
            kind: resource.kind,
          },
        },
      ]);
    },
    [reactFlow, setNodes],
  );

  const insertToolForPendingConnection = (tool: ResourceItem) => {
    if (!pendingToolChoice) return;
    const source = nodes.find((node) => node.id === pendingToolChoice.sourceId);
    const target = nodes.find((node) => node.id === pendingToolChoice.targetId);
    if (!source || !target) return;

    const toolId = tool.id + "-" + Date.now();
    const position = {
      x: (source.position.x + target.position.x) / 2,
      y: (source.position.y + target.position.y) / 2 + 18,
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      {
        id: toolId,
        type: "tool",
        position,
        data: {
          label: tool.name,
          category: "处理工具",
          inputType: tool.inputType,
          outputType: tool.outputType,
          kind: "tool",
        },
      },
    ]);

    setEdges((currentEdges) => [
      ...currentEdges,
      {
        id: "e-" + pendingToolChoice.sourceId + "-" + toolId,
        source: pendingToolChoice.sourceId,
        target: toolId,
        label: pendingToolChoice.sourceType,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
      {
        id: "e-" + toolId + "-" + pendingToolChoice.targetId,
        source: toolId,
        target: pendingToolChoice.targetId,
        label: pendingToolChoice.targetType,
        markerEnd: { type: MarkerType.ArrowClosed },
      },
    ]);

    setNotice("已插入处理工具：" + tool.name + "，并完成上下游连接。");
    setPendingToolChoice(null);
  };

  return (
    <div className="builder-shell">
      <section className="canvas-panel">
        <div className="section-toolbar">
          <div>
            <strong>耕地保护用地监测协同流程</strong>
            <p>拖拽智能体到画布。连接时如果数据类型不匹配，系统会要求选择处理工具。</p>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button">保存模板</button>
            <button className="primary-button">进入任务处理</button>
          </div>
        </div>
        <div
          className="flow-canvas"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div
            className={`data-type-legend ${isLegendCollapsed ? "collapsed" : ""}`}
            aria-label="数据类型图例"
          >
            <div className="legend-header">
              <strong>数据类型图例</strong>
              <button
                aria-label={isLegendCollapsed ? "展开数据类型图例" : "收起数据类型图例"}
                onClick={() => setIsLegendCollapsed((current) => !current)}
                type="button"
              >
                {isLegendCollapsed ? "展开" : "收起"}
              </button>
            </div>
            {!isLegendCollapsed ? (
              <div className="legend-list">
                {dataTypeLegendItems.map((item) => (
                  <div className="legend-item" key={item.type}>
                    <i className={`legend-dot port-${item.type}`} />
                    <span>
                      <b>{item.label}</b>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDoubleClick={(_, node) => {
              if (node.data.kind === "agent") {
                setSelectedAgent(node.data);
              }
            }}
            onPaneClick={() => setSelectedAgent(null)}
            connectionRadius={36}
            connectOnClick
            fitView
          >
            <Background gap={22} size={1} />
            <MiniMap pannable zoomable />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <aside className="inspector-panel">
        {selectedAgent ? (
          <div className="agent-detail-panel">
            <div className="agent-detail-head">
              <span>{selectedAgent.category}</span>
              <h3>{selectedAgent.label}</h3>
              <p>{selectedAgent.description || "暂无简介。"}</p>
            </div>
            <div className="agent-detail-section">
              <strong>输入输出标准</strong>
              <div className="agent-detail-io">
                <span>输入</span>
                <p>{splitDataPorts(selectedAgent.inputType).join(" / ")}</p>
                <span>输出</span>
                <p>{splitDataPorts(selectedAgent.outputType).join(" / ")}</p>
              </div>
            </div>
            <div className="agent-detail-section">
              <strong>内部组织结构</strong>
              <div className="agent-structure-list">
                <span>大语言模型</span>
                <em>千问 Qwen3-72B</em>
                <span>模型库</span>
                <em>按任务调用遥感、叠加分析、面积核算模型</em>
                <span>知识库</span>
                <em>耕地保护政策法规库 / 用地审批规则库 / 历史案例库</em>
                <span>数据库</span>
                <em>遥感影像库 / 耕地图斑库 / 永久基本农田库</em>
                <span>上下文</span>
                <em>任务参数 / 图斑对象 / 中间结果 / 执行记录</em>
              </div>
            </div>
            <button className="primary-button detail-action-button" onClick={() => onEditAgent(selectedAgent)} type="button">
              查看详情并编辑
            </button>
          </div>
        ) : (
          <>
            <h3>连接校验</h3>
            <p>{notice}</p>
            <div className="logic-card">
              <strong>工具插入规则</strong>
              <span>工具不是智能体，只作为连接线之后的数据处理组件出现。</span>
              <span>如果系统没有合适工具，用户可以新建工具或取消连接。</span>
            </div>
          </>
        )}
      </aside>

      <section className="resource-dock">
        <div className="category-tabs">
          {categories.map((category) => (
            <button
              className={category.id === activeCategory ? "active" : ""}
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>
        <div className="resource-list">
          <div className="resource-list-header">
            <h3>
              {categories.find((category) => category.id === activeCategory)?.label}
            </h3>
            <button className="text-button" onClick={activeCategory === "tools" ? undefined : onCreateAgent} type="button">
              {activeCategory === "tools" ? "新建工具" : "创建智能体"}
            </button>
          </div>
          <div className="resource-cards">
            {filteredResources.map((resource) => {
              const inputPorts = splitDataPorts(resource.inputType);
              const outputPorts = splitDataPorts(resource.outputType);
              return (
                <button
                  className={resource.kind === "tool" ? "resource-card tool-resource-card" : "resource-card"}
                  draggable
                  key={resource.id}
                  onDragStart={(event) => onDragStart(event, resource)}
                  type="button"
                >
                  <div className="resource-node-preview">
                    <div className="preview-port-column">
                      {inputPorts.map((port, index) => (
                        <span
                          className={"preview-port port-" + getDataTypeClass(port)}
                          key={resource.id + "-input-" + port + "-" + index}
                          title={"输入：" + port}
                        />
                      ))}
                    </div>
                    <div className="preview-node-body">
                      <strong>{resource.name}</strong>
                      <p>{resource.description}</p>
                    </div>
                    <div className="preview-port-column">
                      {outputPorts.map((port, index) => (
                        <span
                          className={"preview-port port-" + getDataTypeClass(port)}
                          key={resource.id + "-output-" + port + "-" + index}
                          title={"输出：" + port}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="resource-io-row">
                    <span>输入：{inputPorts.join(" / ")}</span>
                    <span>输出：{outputPorts.join(" / ")}</span>
                  </div>
                </button>
              );
            })}
          </div>        </div>
      </section>

      {pendingToolChoice ? (
        <div className="tool-choice-backdrop">
          <div className="tool-choice-dialog">
            <span className="dialog-kicker">连接需要处理工具</span>
            <h3>选择已有工具，或新建工具</h3>
            <p>
              {pendingToolChoice.sourceName} 输出为「{pendingToolChoice.sourceType}」，
              {pendingToolChoice.targetName} 需要「{pendingToolChoice.targetType}」。
            </p>
            <div className="tool-options">
              {compatibleTools.length > 0 ? (
                compatibleTools.map((tool) => (
                  <button key={tool.id} onClick={() => insertToolForPendingConnection(tool)}>
                    <strong>{tool.name}</strong>
                    <span>{tool.inputType} → {tool.outputType}</span>
                  </button>
                ))
              ) : (
                <div className="empty-tool">系统内暂无匹配工具。</div>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setNotice("已取消连接。");
                  setPendingToolChoice(null);
                }}
              >
                取消连接
              </button>
              <button
                className="primary-button"
                onClick={() => {
                  setNotice("进入新建工具流程：请定义输入类型、输出类型和服务地址。");
                  setPendingToolChoice(null);
                }}
              >
                新建工具
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskExecutionCanvas({
  onAgentDoubleClick,
  standardNodes,
  runSignal,
  onRunComplete,
}: {
  onAgentDoubleClick: (agent: FlowNodeData) => void;
  standardNodes: Array<{ id: string; side: "input" | "output"; dataTypes: string[] }>;
  runSignal: number;
  onRunComplete: () => void;
}) {
  const buildStandardNode = useCallback(
    (standard: { id: string; side: "input" | "output"; dataTypes: string[] }): Node<FlowNodeData> => ({
      id: standard.id,
      type: "resource",
      position: standard.side === "input" ? { x: -260, y: 80 } : { x: 1240, y: 80 },
      data: {
        label: standard.side === "input" ? "标准输入" : "标准输出",
        category: standard.side === "input" ? "任务数据包" : "结果数据包",
        inputType: standard.dataTypes.join(" / "),
        outputType: standard.dataTypes.join(" / "),
        kind: "resource",
        sourceOrg: standard.side === "input" ? "输入" : "输出",
        resourceCategory: standard.side === "input" ? "standardInput" : "standardOutput",
        dataPorts: standard.dataTypes,
        standardSide: standard.side,
      },
    }),
    [],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([
    ...initialNodes,
    ...standardNodes.map(buildStandardNode),
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(
    () => ({ agent: AgentNode, tool: ToolNode, resource: ResourceNode }),
    [],
  );

  useEffect(() => {
    setNodes((currentNodes) => {
      const regularNodes = currentNodes.filter((node) => !node.id.startsWith("task-standard-"));
      return [...regularNodes, ...standardNodes.map(buildStandardNode)];
    });
  }, [buildStandardNode, setNodes, standardNodes]);

  useEffect(() => {
    if (runSignal === 0) return;
    const executionOrder = [
      "task-standard-input",
      "n1",
      "n2",
      "n3",
      "n6",
      "n7",
      "n5",
      "n4",
      "task-standard-output",
    ];
    const timers = executionOrder.map((nodeId, index) =>
      window.setTimeout(() => {
        setNodes((currentNodes) =>
          currentNodes.map((node) => {
            const orderIndex = executionOrder.indexOf(node.id);
            if (orderIndex < 0) return node;
            if (orderIndex < index) {
              return { ...node, data: { ...node.data, testStatus: "passed" } };
            }
            if (orderIndex === index) {
              return { ...node, data: { ...node.data, testStatus: "running" } };
            }
            return { ...node, data: { ...node.data, testStatus: "idle" } };
          }),
        );
        setEdges((currentEdges) =>
          currentEdges.map((edge, edgeIndex) => ({
            ...edge,
            animated: edgeIndex <= index,
            className: edgeIndex < index ? "edge-passed" : edgeIndex === index ? "edge-running" : "",
          })),
        );
      }, index * 650),
    );
    const completeTimer = window.setTimeout(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          executionOrder.includes(node.id)
            ? { ...node, data: { ...node.data, testStatus: "passed" } }
            : node,
        ),
      );
      setEdges((currentEdges) =>
        currentEdges.map((edge) => ({
          ...edge,
          animated: false,
          className: "edge-passed",
        })),
      );
      onRunComplete();
    }, executionOrder.length * 650 + 250);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(completeTimer);
    };
  }, [onRunComplete, runSignal, setEdges, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source);
      const target = nodes.find((node) => node.id === connection.target);
      if (!source || !target || !connection.source || !connection.target) return;

      const sourcePorts = getPortValueByHandle(
        source.data.outputType,
        connection.sourceHandle,
      );
      const targetPorts = getPortValueByHandle(
        target.data.inputType,
        connection.targetHandle,
      );
      const compatiblePair = getCompatiblePortPair(sourcePorts, targetPorts);

      if (!compatiblePair) return;

      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            label: compatiblePair.sourcePort,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          currentEdges,
        ),
      );
    },
    [nodes, setEdges],
  );

  return (
    <div className="task-execution-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => {
          if (node.data.kind === "agent") {
            onAgentDoubleClick(node.data);
          }
        }}
        fitView
        connectionRadius={36}
      >
        <Background gap={22} size={1} />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <div className="task-canvas-legend">
        <strong>数据类型</strong>
        <div>
          {dataTypeLegendItems.map((item) => (
            <span key={item.type}>
              <i className={`port-${item.type}`} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Workspace({
  onCreateAgent,
  onEditAgent,
}: {
  onCreateAgent: () => void;
  onEditAgent: (agent: FlowNodeData) => void;
}) {
  const [view, setView] = useState<WorkspaceView>("home");
  const [selectedTaskId, setSelectedTaskId] = useState("YDJC-2026-0418");
  const [activeTaskTab, setActiveTaskTab] = useState("space");
  const [selectedExecutionAgent, setSelectedExecutionAgent] =
    useState<FlowNodeData | null>(null);
  const [selectedRunId, setSelectedRunId] = useState("RUN-20260703-03");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [expandedComponentId, setExpandedComponentId] = useState<string | null>(null);
  const [taskInputCollapsed, setTaskInputCollapsed] = useState(true);
  const [standardModalSide, setStandardModalSide] = useState<"input" | "output" | null>(null);
  const [selectedRuntimeStandards, setSelectedRuntimeStandards] = useState<string[]>([]);
  const [taskStandardNodes, setTaskStandardNodes] = useState<
    Array<{ id: string; side: "input" | "output"; dataTypes: string[] }>
  >([]);
  const [runSignal, setRunSignal] = useState(0);
  const [openedResultTabs, setOpenedResultTabs] = useState<
    Array<{ id: string; label: string; type: string; layer?: boolean }>
  >([]);
  const recentTasks = [
    {
      id: "YDJC-2026-0418",
      title: "耕地保护 / 用地监测",
      status: "待确认",
      progress: "已生成疑似变化图斑和人工审核依据",
      agents: ["耕地任务解析", "数据调度", "模型调度", "计算执行", "图斑合规研判"],
      resources: ["近期遥感影像库", "耕地图斑库", "永久基本农田库"],
      updatedAt: "2026-07-03 09:42",
    },
    {
      id: "YDJC-2026-0417",
      title: "永久基本农田变化图斑复核",
      status: "已完成",
      progress: "已完成人工确认，结果回写为历史案例",
      agents: ["数据调度", "模型调度", "规则研判", "合规研判"],
      resources: ["永久基本农田库", "建设用地审批库", "耕地保护政策法规库"],
      updatedAt: "2026-07-02 16:18",
    },
    {
      id: "YDJC-2026-0416",
      title: "新增建设用地审批匹配分析",
      status: "执行中",
      progress: "正在调用审批数据和规划边界进行叠加分析",
      agents: ["任务理解", "模型调度", "数据研判"],
      resources: ["建设用地审批库", "规划边界库", "空间叠加分析模型"],
      updatedAt: "2026-07-02 10:05",
    },
  ];
  const selectedTask = recentTasks.find((task) => task.id === selectedTaskId) || recentTasks[0];
  const taskResources = [
    { type: "数据", name: "近期遥感影像库", status: "已调用" },
    { type: "数据", name: "耕地图斑库", status: "已调用" },
    { type: "数据", name: "永久基本农田库", status: "已调用" },
    { type: "模型", name: "遥感变化检测模型", status: "已调用" },
    { type: "模型", name: "空间叠加分析模型", status: "执行中" },
    { type: "知识", name: "耕地保护政策法规库", status: "已引用" },
  ];
  const [runHistory, setRunHistory] = useState([
    {
      id: "RUN-20260703-03",
      title: "第 3 次运行",
      time: "2026-07-03 09:42",
      status: "已完成",
      summary: "已生成矢量研判结果、JSON 依据链和文本结论。",
    },
    {
      id: "RUN-20260703-02",
      title: "第 2 次运行",
      time: "2026-07-03 09:18",
      status: "已暂停",
      summary: "合规研判前暂停，等待人工调整面积阈值。",
    },
    {
      id: "RUN-20260703-01",
      title: "第 1 次运行",
      time: "2026-07-03 08:56",
      status: "已终止",
      summary: "遥感影像时相不完整，终止后重新选择数据源。",
    },
  ]);
  const selectedRun = runHistory.find((run) => run.id === selectedRunId) || runHistory[0];
  const agentIoRecords = [
    {
      agent: "耕地任务解析智能体",
      inputs: [{ name: "自然语言任务指令", type: "文本" }],
      outputs: [
        { name: "分任务列表与资源需求", type: "JSON" },
        { name: "规则检索指令", type: "文本" },
      ],
    },
    {
      agent: "用地监测数据调度智能体",
      inputs: [{ name: "任务 JSON", type: "JSON" }],
      outputs: [{ name: "数据资源调度方案", type: "JSON" }],
    },
    {
      agent: "遥感变化监测调度智能体",
      inputs: [{ name: "任务 JSON", type: "JSON" }],
      outputs: [{ name: "模型选择与参数方案", type: "JSON" }],
    },
    {
      agent: "用地监测计算执行智能体",
      inputs: [
        { name: "数据资源调度方案", type: "JSON" },
        { name: "模型选择与参数方案", type: "JSON" },
      ],
      outputs: [{ name: "疑似变化检测栅格", type: "栅格", layer: true }],
    },
    {
      agent: "耕地规则研判智能体",
      inputs: [{ name: "规则检索指令", type: "文本" }],
      outputs: [
        { name: "规则依据文本", type: "文本" },
        { name: "结构化规则依据", type: "JSON" },
      ],
    },
    {
      agent: "图斑合规研判智能体",
      inputs: [
        { name: "规则依据文本", type: "文本" },
        { name: "候选变化图斑矢量", type: "矢量", layer: true },
        { name: "结构化规则依据", type: "JSON" },
      ],
      outputs: [
        { name: "合规研判矢量结果", type: "矢量", layer: true },
        { name: "风险等级与依据链", type: "JSON" },
        { name: "人工审核建议", type: "文本" },
      ],
    },
  ];
  const selectedAgentRecord = selectedExecutionAgent
    ? agentRecords.find((agent) => agent.name === selectedExecutionAgent.label)
    : undefined;
  const selectedAgentTemplate = selectedAgentRecord ? agentInternalTemplates[selectedAgentRecord.id] : undefined;
  const selectedResultTab = openedResultTabs.find((tab) => tab.id === activeTaskTab);
  const getTaskComponentParams = (component: AgentInternalComponent) => {
    if (component.resourceCategory === "llm") {
      return [
        ["systemPrompt", "围绕当前任务执行组件职责，输出格式必须匹配下游输入。"],
        ["temperature", "0.2"],
        ["maxTokens", "4096"],
      ];
    }
    if (component.resourceCategory === "modelLibrary") {
      return [
        ["serviceUrl", "https://model-service.example/api"],
        ["confidenceThreshold", "0.78"],
        ["batchSize", "8"],
      ];
    }
    if (component.resourceCategory === "database") {
      return [
        ["queryScope", "示范县重点监测区"],
        ["timeRange", "近30天"],
        ["fields", "任务所需字段"],
      ];
    }
    if (component.resourceCategory === "knowledgeBase") {
      return [
        ["retrievalTopK", "5"],
        ["retrievalScope", "耕地保护 / 用地审批 / 历史案例"],
        ["usagePolicy", "仅返回带来源的规则依据"],
      ];
    }
    if (component.resourceCategory === "memoryPool") {
      return [
        ["retrievalTopK", "3"],
        ["usagePolicy", "仅使用历史经验作为参数建议"],
      ];
    }
    return [
      ["输入格式", component.inputType],
      ["输出格式", component.outputType],
      ["组件说明", component.description],
    ];
  };
  const handleSelectExecutionAgent = (agent: FlowNodeData) => {
    setSelectedExecutionAgent(agent);
    setExpandedComponentId(null);
    setTaskInputCollapsed(false);
  };
  const openResultData = (item: { name: string; type: string; layer?: boolean }) => {
    const id = `result-${item.name}`;
    setOpenedResultTabs((current) =>
      current.some((tab) => tab.id === id)
        ? current
        : [...current, { id, label: item.name, type: item.type, layer: item.layer }],
    );
    setActiveTaskTab(id);
  };
  const closeResultTab = (tabId: string) => {
    setOpenedResultTabs((current) => current.filter((tab) => tab.id !== tabId));
    if (activeTaskTab === tabId) {
      setActiveTaskTab("space");
    }
  };
  const openStandardModal = (side: "input" | "output") => {
    setStandardModalSide(side);
    setSelectedRuntimeStandards([]);
  };
  const toggleRuntimeStandard = (label: string) => {
    setSelectedRuntimeStandards((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };
  const confirmRuntimeStandard = () => {
    if (!standardModalSide || selectedRuntimeStandards.length === 0) return;
    const dataTypes = Array.from(new Set(selectedRuntimeStandards.map(normalizeDataStandardLabel)));
    setTaskStandardNodes((current) => [
      ...current.filter((node) => node.side !== standardModalSide),
      {
        id: `task-standard-${standardModalSide}`,
        side: standardModalSide,
        dataTypes,
      },
    ]);
    if (standardModalSide === "input") {
      setSelectedExecutionAgent(null);
      setTaskInputCollapsed(false);
    }
    setStandardModalSide(null);
    setSelectedRuntimeStandards([]);
  };
  const selectedInputStandardNode = taskStandardNodes.find((node) => node.side === "input");
  const handleRunTask = () => {
    setRunSignal((current) => current + 1);
  };
  const handleRunComplete = useCallback(() => {
    const now = new Date();
    const timeText = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setRunHistory((current) => {
      const nextIndex = current.length + 1;
      const newRun = {
        id: `RUN-${Date.now()}`,
        title: `第 ${nextIndex} 次运行`,
        time: timeText,
        status: "已完成",
        summary: "标准输出已接收全部数据，已生成新的运行成果。",
      };
      setSelectedRunId(newRun.id);
      return [newRun, ...current];
    });
  }, []);

  if (view === "builder") {
    return (
      <ReactFlowProvider>
        <div className="subpage-heading">
          <div>
            <h2>多智能体系统编辑</h2>
            <p>搭建智能体协同流程，定义数据传递、类型转换和处理工具。</p>
          </div>
          <button className="secondary-button" onClick={() => setView("templates")}>
            返回模板选择
          </button>
        </div>
        <FlowBuilder onCreateAgent={onCreateAgent} onEditAgent={onEditAgent} />
      </ReactFlowProvider>
    );
  }

  if (view === "templates") {
    return (
      <>
        <div className="subpage-heading">
          <div>
            <h2>选择任务模板</h2>
            <p>选择系统内置模板、用户自建模板，或从空白模板开始。</p>
          </div>
          <button className="secondary-button" onClick={() => setView("home")}>
            返回工作台
          </button>
        </div>
        <div className="template-grid">
          {["耕地保护用地监测标准流程", "规划符合性快速审查流程", "县级巡查反馈复核流程", "空白流程"].map(
            (name, index) => (
              <button
                className={index === 0 ? "template-card featured" : "template-card"}
                key={name}
                onClick={() => setView("builder")}
              >
                <span>{index === 2 ? "用户自建模板" : index === 3 ? "空白模板" : "系统内置模板"}</span>
                <strong>{name}</strong>
                <p>选择后进入多智能体系统编辑界面，配置智能体、资源、工具和连接关系。</p>
              </button>
            ),
          )}
        </div>
      </>
    );
  }

  if (view === "processing") {
    return (
      <section className="task-processing-page">
        <div className="task-processing-heading">
          <div className="task-title-line">
            <span>{selectedTask.id}</span>
            <h2>{selectedTask.title}</h2>
            <em>{selectedTask.status}</em>
            <p>{selectedTask.progress}</p>
          </div>
          <div className="task-processing-actions">
            <button className="secondary-button" onClick={() => setView("home")} type="button">
              返回近期任务
            </button>
            <button className="primary-button" type="button">人工确认</button>
          </div>
        </div>

        <div className={"task-processing-body " + (taskInputCollapsed ? "input-collapsed" : "")}>
          <aside className={taskInputCollapsed ? "task-side-panel task-input-panel collapsed" : "task-side-panel task-input-panel"}>
            {taskInputCollapsed ? (
              <button
                className="collapsed-panel-button"
                onClick={() => setTaskInputCollapsed(false)}
                type="button"
              >
                <span>展开</span>
                <b>任务输入与资源</b>
              </button>
            ) : null}
            {!taskInputCollapsed && selectedExecutionAgent ? (
              <>
                <div className="task-panel-title with-action">
                  <div>
                    <strong>智能体参数</strong>
                    <span>本次任务内调整组件关联与运行参数。</span>
                  </div>
                  <button className="text-button" onClick={() => setTaskInputCollapsed(true)} type="button">
                    收起
                  </button>
                </div>
                <button className="secondary-button" onClick={() => setSelectedExecutionAgent(null)} type="button">
                  返回任务输入
                </button>
                <div className="task-input-card selected-agent-card">
                  <b>{selectedExecutionAgent.label}</b>
                  <p>{selectedExecutionAgent.description}</p>
                  <span>输入：{selectedExecutionAgent.inputType}</span>
                  <span>输出：{selectedExecutionAgent.outputType}</span>
                </div>
                <div className="agent-component-link-list">
                  <strong>组件关联</strong>
                  {(selectedAgentTemplate?.components || []).map((component) => (
                    <article className="agent-component-accordion" key={component.id}>
                      <button
                        className={expandedComponentId === component.id ? "active" : ""}
                        onClick={() =>
                          setExpandedComponentId((current) =>
                            current === component.id ? null : component.id,
                          )
                        }
                        type="button"
                      >
                        <span>{component.category}</span>
                        <b>{component.name}</b>
                        <em>{component.inputType} → {component.outputType}</em>
                      </button>
                      {expandedComponentId === component.id ? (
                        <div className="component-inline-param-panel">
                          <p>{component.description}</p>
                          <div className="task-param-group task-agent-param-group">
                            {getTaskComponentParams(component).map(([key, value]) => (
                              <label key={key}>
                                {key}
                                {value.length > 30 ? (
                                  <textarea defaultValue={value} />
                                ) : (
                                  <input defaultValue={value} />
                                )}
                              </label>
                            ))}
                          </div>
                          <button className="primary-button" type="button">保存组件参数</button>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </>
            ) : null}
            {!taskInputCollapsed && !selectedExecutionAgent ? (
              <>
                <div className="task-panel-title with-action">
                  <div>
                    <strong>任务输入与资源</strong>
                    <span>任务来源、输入数据包和已接入资源。</span>
                  </div>
                  <button className="text-button" onClick={() => setTaskInputCollapsed(true)} type="button">
                    收起
                  </button>
                </div>
                <div className="task-standard-input-editor">
                  {selectedInputStandardNode ? (
                    selectedInputStandardNode.dataTypes.map((dataType) => (
                      <article className={"task-standard-input-card type-" + getDataTypeClass(dataType)} key={dataType}>
                        <div>
                          <strong>{dataType} 输入</strong>
                          <span>已绑定到执行画布的标准输入节点。</span>
                        </div>
                        {dataType === "文本" || dataType === "JSON" ? (
                          <textarea
                            defaultValue={
                              dataType === "JSON"
                                ? '{\n  "region": "示范县重点监测区",\n  "period": "近30天",\n  "task": "疑似占用耕地图斑识别"\n}'
                                : "请识别近期疑似占用耕地图斑并判断风险。"
                            }
                          />
                        ) : (
                          <label className="file-upload-control">
                            <input type="file" />
                            <span>上传{dataType}数据</span>
                          </label>
                        )}
                      </article>
                    ))
                  ) : (
                    <div className="task-input-card empty-standard-input">
                      <b>尚未配置标准输入</b>
                      <p>请在下方智能体执行区域点击“标准输入”，选择数据类型后，在这里上传或填写对应数据。</p>
                      <button className="secondary-button" onClick={() => openStandardModal("input")} type="button">
                        配置标准输入
                      </button>
                    </div>
                  )}
                </div>
                <div className="task-resource-list">
                  {taskResources.map((resource) => (
                    <div key={resource.type + resource.name}>
                      <span>{resource.type}</span>
                      <b>{resource.name}</b>
                      <em>{resource.status}</em>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </aside>

          <section className="task-result-workbench">
            {openedResultTabs.length > 0 ? (
              <div className="task-result-tabs">
                {openedResultTabs.map((tab) => (
                  <div className={activeTaskTab === tab.id ? "active result-tab-item" : "result-tab-item"} key={tab.id}>
                    <button onClick={() => setActiveTaskTab(tab.id)} type="button">
                      {tab.label}
                    </button>
                    <button
                      aria-label={`关闭${tab.label}`}
                      className="result-tab-close"
                      onClick={() => closeResultTab(tab.id)}
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="task-result-content">
              {activeTaskTab === "space" || !selectedResultTab ? (
                <div className="task-map-view">
                  <div className="analysis-map">
                    <span className="map-patch patch-risk-high">高风险</span>
                    <span className="map-patch patch-risk-mid">中风险</span>
                    <span className="map-patch patch-approval">审批范围</span>
                  </div>
                </div>
              ) : null}
              {selectedResultTab ? (
                <div className="task-result-data-preview">
                  {selectedResultTab.layer ? (
                    <div className="task-map-view result-layer-preview">
                      <div className="result-layer-toolbar">
                        <div>
                          <strong>{selectedResultTab.label}</strong>
                          <span>{selectedResultTab.type} 数据 · 来自 {selectedRun.title}</span>
                        </div>
                        <div className="map-toolbar">
                          <span>{selectedResultTab.type}图层</span>
                          <span>已加载到地图</span>
                          <span>可叠加研判结果</span>
                        </div>
                        <button className="secondary-button" type="button">下载数据</button>
                      </div>
                      <div className="analysis-map">
                        <span className="map-patch patch-risk-high">当前图层</span>
                        <span className="map-patch patch-risk-mid">疑似变化</span>
                        <span className="map-patch patch-approval">审批范围</span>
                      </div>
                    </div>
                  ) : (
                    <pre className="result-text-preview">
{selectedResultTab.type === "JSON"
  ? '{\n  "riskLevel": "高",\n  "basis": ["遥感变化检测", "永久基本农田叠加", "审批范围匹配"],\n  "needHumanConfirm": true\n}'
  : "该结果用于指导后续智能体执行与人工审核，包含规则依据、判断理由和处置建议。"}
                    </pre>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="task-side-panel task-run-panel">
            <div className="task-panel-title">
              <div>
                <strong>{expandedRunId ? "本次运行输入输出" : "运行结果"}</strong>
                <span>
                  {expandedRunId
                    ? `${selectedRun.title} · ${selectedRun.time}`
                    : "查看历史运行与各智能体输入输出。"}
                </span>
              </div>
              {expandedRunId ? (
                <button
                  className="text-button"
                  onClick={() => setExpandedRunId(null)}
                  type="button"
                >
                  返回历史
                </button>
              ) : null}
            </div>
            {expandedRunId ? (
              <div className="agent-io-result-list standalone">
                {agentIoRecords.map((record) => (
                  <section key={record.agent}>
                    <strong>{record.agent}</strong>
                    <div>
                      <span>输入</span>
                      {record.inputs.map((item) => (
                        <button
                          className={`io-data-pill type-${getDataTypeClass(item.type)}`}
                          key={record.agent + item.name}
                          onDoubleClick={() => openResultData(item)}
                          type="button"
                        >
                          {item.name}<em>{item.type}</em>
                        </button>
                      ))}
                    </div>
                    <div>
                      <span>输出</span>
                      {record.outputs.map((item) => (
                        <button
                          className={`io-data-pill type-${getDataTypeClass(item.type)}`}
                          key={record.agent + item.name}
                          onDoubleClick={() => openResultData(item)}
                          type="button"
                        >
                          {item.name}<em>{item.type}</em><small>下载</small>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="run-history-list">
                {runHistory.map((run) => (
                  <article className={selectedRunId === run.id ? "active run-history-item" : "run-history-item"} key={run.id}>
                    <div className="run-history-main">
                      <button
                        onClick={() => {
                          setSelectedRunId(run.id);
                        }}
                        type="button"
                      >
                        <b>{run.title}</b>
                        <span>{run.time}</span>
                        <em>{run.status}</em>
                        <small>{run.summary}</small>
                      </button>
                      <button
                        className="run-expand-button"
                        onClick={() => {
                          setSelectedRunId(run.id);
                          setExpandedRunId(run.id);
                        }}
                        type="button"
                      >
                        查看输入输出
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>

        <section className="agent-execution-panel task-agent-canvas-panel">
          <div className="agent-execution-head">
            <div>
              <strong>智能体执行区域</strong>
              <span>双击智能体可在左侧调整本次任务参数；可拖动右下角调整高度。</span>
            </div>
            <div className="execution-control-buttons">
              <button className="secondary-button" onClick={() => openStandardModal("input")} type="button">
                标准输入
              </button>
              <button className="secondary-button" onClick={() => openStandardModal("output")} type="button">
                标准输出
              </button>
              <button className="primary-button" onClick={handleRunTask} type="button">运行</button>
              <button className="secondary-button" type="button">按步调试</button>
              <button className="secondary-button" type="button">暂停</button>
              <button className="secondary-button danger-button" type="button">终止</button>
              <button className="text-button" onClick={() => setView("builder")} type="button">进入流程编辑</button>
            </div>
          </div>
          <ReactFlowProvider>
            <TaskExecutionCanvas
              onAgentDoubleClick={handleSelectExecutionAgent}
              standardNodes={taskStandardNodes}
              runSignal={runSignal}
              onRunComplete={handleRunComplete}
            />
          </ReactFlowProvider>
        </section>
        {standardModalSide ? (
          <div className="modal-backdrop">
            <div className="meta-modal runtime-standard-modal">
              <div className="modal-header">
                <strong>{standardModalSide === "input" ? "选择标准输入数据类型" : "选择标准输出数据类型"}</strong>
                <button onClick={() => setStandardModalSide(null)} type="button">关闭</button>
              </div>
              <div className="standard-option-list">
                {(standardModalSide === "input" ? inputDataStandardOptions : outputDataStandardOptions).map((item) => (
                  <button
                    className={selectedRuntimeStandards.includes(item.label) ? "selected" : ""}
                    key={item.id}
                    onClick={() => toggleRuntimeStandard(item.label)}
                    type="button"
                  >
                    <strong>{normalizeDataStandardLabel(item.label)}</strong>
                    <span>{item.description}</span>
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setStandardModalSide(null)} type="button">取消</button>
                <button
                  className="primary-button"
                  disabled={selectedRuntimeStandards.length === 0}
                  onClick={confirmRuntimeStandard}
                  type="button"
                >
                  添加到画布
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="workspace-task-panel">
        <div className="panel-header">
          <div>
            <h3>近期任务</h3>
            <p>查看最近发起的业务处理任务，进入后可继续查看智能体流程、资源调用和处理结果。</p>
          </div>
          <button className="primary-button" onClick={() => setView("templates")}>
            新建任务
          </button>
        </div>
        <div className="task-card-grid">
          {recentTasks.map((task) => (
            <button
              className="task-card"
              key={task.id}
              onClick={() => {
                setSelectedTaskId(task.id);
                setView("processing");
              }}
              type="button"
            >
              <div className="task-card-head">
                <span>
                  <strong>{task.id}</strong>
                  <small>{task.updatedAt}</small>
                </span>
                <em className={"task-status status-" + task.status}>{task.status}</em>
              </div>
              <h4>{task.title}</h4>
              <p>{task.progress}</p>
              <div className="task-card-section">
                <b>智能体</b>
                <div className="task-chip-list agent-chips">
                  {task.agents.map((agent) => (
                    <span key={agent}>{agent}</span>
                  ))}
                </div>
              </div>
              <div className="task-card-section">
                <b>资源</b>
                <div className="task-chip-list resource-chips">
                  {task.resources.map((resource) => (
                    <span key={resource}>{resource}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
  );
}

type AgentCenterView = "list" | "create-options" | "blank-builder" | "detail";
type AgentStatus = "启用" | "调试中" | "停用";

type AgentRecord = {
  id: string;
  name: string;
  category: string;
  role: string;
  scenario: string;
  inputType: string;
  outputType: string;
  resourceScope: string;
  status: AgentStatus;
  updatedAt: string;
};

const agentRecords: AgentRecord[] = [
  {
    id: "AGT-UNDERSTAND-001",
    name: "耕地任务解析智能体",
    category: "任务理解智能体",
    role: "场景入口",
    scenario: "耕地保护 / 用地监测",
    inputType: "文本",
    outputType: "JSON / 文本",
    resourceScope: "任务上下文 / 业务参数 / 场景模板",
    status: "启用",
    updatedAt: "2026-06-22",
  },
  {
    id: "AGT-DATA-002",
    name: "用地监测数据调度智能体",
    category: "数据调度智能体",
    role: "子智能体",
    scenario: "耕地保护 / 用地监测",
    inputType: "JSON",
    outputType: "JSON",
    resourceScope: "遥感影像库 / 耕地图斑库 / 永久基本农田库",
    status: "启用",
    updatedAt: "2026-06-24",
  },
  {
    id: "AGT-MODEL-003",
    name: "遥感变化监测调度智能体",
    category: "模型调度智能体",
    role: "子智能体",
    scenario: "耕地保护 / 用地监测",
    inputType: "JSON",
    outputType: "JSON",
    resourceScope: "遥感变化检测模型 / 地类识别模型 / 模型检索工具",
    status: "调试中",
    updatedAt: "2026-06-25",
  },
  {
    id: "AGT-EXEC-006",
    name: "用地监测计算执行智能体",
    category: "计算执行智能体",
    role: "执行智能体",
    scenario: "耕地保护 / 用地监测",
    inputType: "JSON",
    outputType: "栅格",
    resourceScope: "千问 Qwen3-72B / 数据检索工具 / 当前图斑对象 / 模型执行工具",
    status: "调试中",
    updatedAt: "2026-06-26",
  },
  {
    id: "AGT-KNOW-004",
    name: "耕地规则研判智能体",
    category: "知识调度智能体",
    role: "子智能体",
    scenario: "耕地保护",
    inputType: "文本",
    outputType: "文本 / JSON",
    resourceScope: "耕地保护政策法规库 / 用地审批规则库 / 历史案例库",
    status: "启用",
    updatedAt: "2026-06-20",
  },
  {
    id: "AGT-JUDGE-005",
    name: "图斑合规研判智能体",
    category: "数据研判智能体",
    role: "子智能体",
    scenario: "耕地保护 / 用地监测",
    inputType: "矢量 / 文本 / JSON",
    outputType: "矢量 / JSON / 文本",
    resourceScope: "图斑对象 / 审批数据 / 规划边界 / 规则条款",
    status: "调试中",
    updatedAt: "2026-06-21",
  },
];

type AgentInternalComponent = {
  id: string;
  name: string;
  category: string;
  sourceOrg: string;
  inputType: string;
  outputType: string;
  description: string;
  resourceCategory: BuildResourceCategory | "standardInput" | "standardOutput";
  position: { x: number; y: number };
};

type AgentInternalTemplate = {
  summary: string;
  inputs: string[];
  outputs: string[];
  components: AgentInternalComponent[];
  edges: Array<{ source: string; target: string; label: string }>;
  logic: string[];
};

const agentInternalTemplates: Record<string, AgentInternalTemplate> = {
  "AGT-UNDERSTAND-001": {
    summary: "接收文本任务指令，结合历史案例库和耕地保护政策法规库，分别生成任务 JSON 和规则检索文本。",
    inputs: ["文本"],
    outputs: ["JSON", "文本"],
    components: [
      { id: "case", name: "历史案例库", category: "知识库", sourceOrg: "市县", inputType: "文本", outputType: "文本", description: "提供历史任务拆解经验和相似任务表达。", resourceCategory: "knowledgeBase", position: { x: 360, y: 40 } },
      { id: "policy", name: "耕地保护政策法规库", category: "知识库", sourceOrg: "省级", inputType: "文本", outputType: "文本", description: "提供耕地保护场景下的问题解释和规则检索背景。", resourceCategory: "knowledgeBase", position: { x: 360, y: 360 } },
      { id: "llm-json", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "文本", outputType: "JSON", description: "将任务指令拆解为分任务列表、数据需求和模型选择线索。", resourceCategory: "llm", position: { x: 840, y: 145 } },
      { id: "llm-text", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "文本", outputType: "文本", description: "生成面向规则研判智能体的自然语言检索指令。", resourceCategory: "llm", position: { x: 840, y: 360 } },
    ],
    edges: [
      { source: "standard-input", target: "llm-json", label: "文本" },
      { source: "standard-input", target: "llm-text", label: "文本" },
      { source: "case", target: "llm-json", label: "文本" },
      { source: "policy", target: "llm-text", label: "文本" },
      { source: "llm-json", target: "standard-output", label: "JSON" },
      { source: "llm-text", target: "standard-output", label: "文本" },
    ],
    logic: ["接收用户自然语言任务指令", "结合历史案例生成分任务 JSON", "结合政策法规生成规则检索文本"],
  },
  "AGT-DATA-002": {
    summary: "根据任务 JSON 调度遥感影像、耕地图斑和永久基本农田数据，由大语言模型直接输出数据资源调度 JSON。",
    inputs: ["JSON"],
    outputs: ["JSON"],
    components: [
      { id: "db-rs", name: "遥感影像库", category: "数据库", sourceOrg: "省级", inputType: "JSON", outputType: "栅格", description: "根据任务范围和时相返回遥感影像栅格数据。", resourceCategory: "database", position: { x: 360, y: 30 } },
      { id: "db-crop", name: "耕地图斑库", category: "数据库", sourceOrg: "市县", inputType: "JSON", outputType: "矢量", description: "返回耕地图斑边界、地类和面积等矢量数据。", resourceCategory: "database", position: { x: 360, y: 260 } },
      { id: "db-basic", name: "永久基本农田库", category: "数据库", sourceOrg: "省级", inputType: "JSON", outputType: "矢量", description: "返回永久基本农田保护边界和保护等级数据。", resourceCategory: "database", position: { x: 360, y: 490 } },
      { id: "llm-json", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "JSON / 栅格 / 矢量", outputType: "JSON", description: "综合任务 JSON 和数据库返回结果，直接输出数据资源调度 JSON。", resourceCategory: "llm", position: { x: 840, y: 260 } },
    ],
    edges: [
      { source: "standard-input", target: "llm-json", label: "JSON" },
      { source: "db-rs", target: "llm-json", label: "栅格" },
      { source: "db-crop", target: "llm-json", label: "矢量" },
      { source: "db-basic", target: "llm-json", label: "矢量" },
      { source: "llm-json", target: "standard-output", label: "JSON" },
    ],
    logic: ["根据任务 JSON 查询三类数据库", "由大语言模型汇总资源地址、时相、范围和字段映射", "直接输出可供下游智能体调用的数据资源调度 JSON"],
  },
  "AGT-MODEL-003": {
    summary: "根据任务 JSON、用户调参记忆和模型能力库，检索候选模型并输出模型选择、参数和数据适配关系 JSON。",
    inputs: ["JSON"],
    outputs: ["JSON"],
    components: [
      { id: "memory", name: "用户调参记忆", category: "记忆池", sourceOrg: "个人", inputType: "JSON", outputType: "文本", description: "提供用户历史阈值、模型偏好和参数经验。", resourceCategory: "memoryPool", position: { x: 260, y: 80 } },
      { id: "tool-model-search", name: "模型检索工具", category: "工具", sourceOrg: "平台", inputType: "JSON", outputType: "JSON", description: "根据任务目标、区域和数据类型检索可用模型服务。", resourceCategory: "tool", position: { x: 560, y: 80 } },
      { id: "model-change", name: "遥感变化检测模型", category: "模型库", sourceOrg: "省级", inputType: "JSON", outputType: "JSON", description: "提供变化检测模型能力、输入要求和参数范围。", resourceCategory: "modelLibrary", position: { x: 560, y: 300 } },
      { id: "model-landtype", name: "地类识别模型", category: "模型库", sourceOrg: "省级", inputType: "JSON", outputType: "JSON", description: "提供地类识别模型能力、适用影像和输出格式。", resourceCategory: "modelLibrary", position: { x: 560, y: 510 } },
      { id: "llm", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "JSON / 文本", outputType: "JSON", description: "综合候选模型、调参记忆和任务约束，生成模型选择与参数方案。", resourceCategory: "llm", position: { x: 930, y: 250 } },
    ],
    edges: [
      { source: "standard-input", target: "tool-model-search", label: "JSON" },
      { source: "standard-input", target: "llm", label: "JSON" },
      { source: "memory", target: "llm", label: "文本" },
      { source: "tool-model-search", target: "llm", label: "JSON" },
      { source: "model-change", target: "llm", label: "JSON" },
      { source: "model-landtype", target: "llm", label: "JSON" },
      { source: "llm", target: "standard-output", label: "JSON" },
    ],
    logic: ["接收任务 JSON", "检索候选模型、能力约束和历史参数", "输出模型选择、参数和数据适配关系 JSON"],
  },
  "AGT-EXEC-006": {
    summary: "接收调度 JSON，由大语言模型组织执行指令，调用数据检索工具获取当前图斑上下文，再交给模型执行工具输出栅格成果。",
    inputs: ["JSON"],
    outputs: ["栅格"],
    components: [
      { id: "llm", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "JSON", outputType: "JSON", description: "理解数据调度与模型调度方案，生成面向检索和执行工具的结构化执行指令。", resourceCategory: "llm", position: { x: 360, y: 250 } },
      { id: "tool-data-search", name: "数据检索工具", category: "工具", sourceOrg: "平台", inputType: "JSON", outputType: "JSON", description: "根据执行指令检索任务范围内的影像、图斑和业务数据服务。", resourceCategory: "tool", position: { x: 620, y: 40 } },
      { id: "ctx-patch", name: "当前图斑对象", category: "上下文", sourceOrg: "任务", inputType: "JSON", outputType: "JSON", description: "承载当前任务中的图斑对象、空间范围、属性字段和上下文参数。", resourceCategory: "context", position: { x: 900, y: 40 } },
      { id: "tool-model-run", name: "模型执行工具", category: "工具", sourceOrg: "平台", inputType: "JSON", outputType: "栅格", description: "根据执行指令和当前图斑上下文调用模型服务，输出疑似变化检测栅格。", resourceCategory: "tool", position: { x: 1060, y: 250 } },
    ],
    edges: [
      { source: "standard-input", target: "llm", label: "JSON" },
      { source: "llm", target: "tool-data-search", label: "JSON" },
      { source: "tool-data-search", target: "ctx-patch", label: "JSON" },
      { source: "ctx-patch", target: "tool-model-run", label: "JSON" },
      { source: "llm", target: "tool-model-run", label: "JSON" },
      { source: "tool-model-run", target: "standard-output", label: "栅格" },
    ],
    logic: ["接收数据调度和模型调度 JSON", "由大语言模型生成结构化执行指令", "通过数据检索工具装配当前图斑上下文", "调用模型执行工具输出疑似变化检测栅格"],
  },
  "AGT-KNOW-004": {
    summary: "接收文本检索指令，结合历史案例库、历史研判经验和用地审批规则库，输出文本和 JSON 规则依据。",
    inputs: ["文本"],
    outputs: ["文本", "JSON"],
    components: [
      { id: "case", name: "历史案例库", category: "知识库", sourceOrg: "市县", inputType: "文本", outputType: "文本", description: "提供相似案例和处置经验。", resourceCategory: "knowledgeBase", position: { x: 420, y: 25 } },
      { id: "memory", name: "历史研判经验", category: "记忆池", sourceOrg: "平台", inputType: "文本", outputType: "文本", description: "提供历史研判判断口径和经验模式。", resourceCategory: "memoryPool", position: { x: 250, y: 210 } },
      { id: "approval", name: "用地审批规则库", category: "知识库", sourceOrg: "省级", inputType: "文本", outputType: "文本", description: "提供审批匹配和合规判断规则。", resourceCategory: "knowledgeBase", position: { x: 380, y: 500 } },
      { id: "llm-text", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "文本", outputType: "文本", description: "生成面向合规研判的文本规则依据。", resourceCategory: "llm", position: { x: 820, y: 245 } },
      { id: "llm-json", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "文本", outputType: "JSON", description: "生成结构化规则 JSON，供下游自动判断使用。", resourceCategory: "llm", position: { x: 820, y: 465 } },
    ],
    edges: [
      { source: "standard-input", target: "llm-text", label: "文本" },
      { source: "standard-input", target: "llm-json", label: "文本" },
      { source: "case", target: "llm-text", label: "文本" },
      { source: "memory", target: "llm-text", label: "文本" },
      { source: "approval", target: "llm-json", label: "文本" },
      { source: "llm-text", target: "standard-output", label: "文本" },
      { source: "llm-json", target: "standard-output", label: "JSON" },
    ],
    logic: ["接收任务解析智能体输出的文本数据", "结合历史案例和历史研判经验生成文本依据", "结合审批规则库生成结构化规则 JSON"],
  },
  "AGT-JUDGE-005": {
    summary: "接收矢量、文本和 JSON，调用空间叠加、面积核算和大语言模型，输出矢量、JSON 和文本结论。",
    inputs: ["矢量", "文本", "JSON"],
    outputs: ["矢量", "JSON", "文本"],
    components: [
      { id: "overlay", name: "空间叠加分析模型", category: "模型库", sourceOrg: "平台", inputType: "矢量", outputType: "矢量", description: "叠加图斑、耕地、永久基本农田和审批范围。", resourceCategory: "modelLibrary", position: { x: 420, y: 70 } },
      { id: "llm-read", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "文本", outputType: "JSON", description: "理解研判目标和规则依据，形成结构化判断要求。", resourceCategory: "llm", position: { x: 420, y: 320 } },
      { id: "area", name: "面积核算模型", category: "模型库", sourceOrg: "平台", inputType: "矢量 / JSON", outputType: "表格", description: "核算涉及面积、地类、保护边界和审批匹配情况。", resourceCategory: "modelLibrary", position: { x: 780, y: 250 } },
      { id: "llm-result", name: "千问 Qwen3-72B", category: "大语言模型", sourceOrg: "平台", inputType: "表格 / JSON", outputType: "JSON / 文本", description: "生成最终研判结论、风险等级和处置建议。", resourceCategory: "llm", position: { x: 1080, y: 460 } },
    ],
    edges: [
      { source: "standard-input", target: "overlay", label: "矢量" },
      { source: "standard-input", target: "llm-read", label: "文本" },
      { source: "standard-input", target: "llm-result", label: "JSON" },
      { source: "overlay", target: "area", label: "矢量" },
      { source: "llm-read", target: "area", label: "JSON" },
      { source: "area", target: "llm-result", label: "表格" },
      { source: "overlay", target: "standard-output", label: "矢量" },
      { source: "llm-result", target: "standard-output", label: "JSON" },
      { source: "llm-result", target: "standard-output", label: "文本" },
    ],
    logic: ["接收矢量、文本和 JSON 三类输入", "通过空间叠加和面积核算生成结构化研判数据", "输出矢量结果、JSON 结论和文本说明"],
  },
};

const blankAgentNodes: Node<FlowNodeData>[] = [
  {
    id: "agent-input",
    type: "tool",
    position: { x: 90, y: 110 },
    data: {
      label: "输入数据包",
      category: "输入",
      inputType: "外部输入",
      outputType: "任务JSON",
      kind: "tool",
    },
  },
  {
    id: "agent-core",
    type: "agent",
    position: { x: 360, y: 80 },
    data: {
      label: "新建智能体",
      category: "智能体",
      inputType: "任务JSON",
      outputType: "研判结论",
      kind: "agent",
    },
  },
  {
    id: "agent-output",
    type: "tool",
    position: { x: 700, y: 110 },
    data: {
      label: "输出数据包",
      category: "输出",
      inputType: "研判结论",
      outputType: "标准输出",
      kind: "tool",
    },
  },
];

const blankAgentEdges: Edge[] = [
  {
    id: "input-core",
    source: "agent-input",
    target: "agent-core",
    label: "任务JSON",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: "core-output",
    source: "agent-core",
    target: "agent-output",
    label: "研判结论",
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];
type BuildResourceCategory =
  | "llm"
  | "modelLibrary"
  | "knowledgeBase"
  | "database"
  | "memoryPool"
  | "context"
  | "tool";

type BuildResource = {
  id: string;
  name: string;
  category: BuildResourceCategory;
  categoryLabel: string;
  sourceOrg: string;
  inputType: string;
  outputType: string;
};

type DataStandardOption = {
  id: string;
  label: string;
  description: string;
};

const inputDataStandardOptions: DataStandardOption[] = [
  { id: "text", label: "文本数据", description: "自然语言问题、任务目标、人工参数" },
  { id: "json", label: "JSON 数据", description: "结构化任务参数、字段映射、对象属性" },
  { id: "vector", label: "空间矢量数据", description: "GeoJSON / Shapefile；图斑、边界、审批范围" },
  { id: "raster", label: "遥感影像数据", description: "GeoTIFF / 影像服务；时相、分辨率、云量阈值" },
  { id: "table", label: "表格数据", description: "CSV / Excel；面积、行政区、审批编号" },
  { id: "document", label: "文档数据", description: "政策条款、审查规则、历史案例" },
];

const outputDataStandardOptions: DataStandardOption[] = [
  { id: "json", label: "JSON 数据", description: "风险等级、判断结论、处置建议、置信度" },
  { id: "raster", label: "栅格数据", description: "变化检测栅格、地类识别栅格、栅格掩膜" },
  { id: "vector", label: "矢量数据", description: "疑似图斑、叠加结果、核查标注" },
  { id: "text", label: "文本数据", description: "研判结论、规则解释、人工审核建议" },
  { id: "table", label: "表格数据", description: "面积核算、字段清单、统计结果" },
  { id: "pdf", label: "PDF 数据", description: "研判报告、审查意见、归档材料" },
  { id: "other", label: "其他类型", description: "外部服务返回的自定义数据包" },
];

const buildResourceCategories: Array<{ id: BuildResourceCategory; label: string }> = [
  { id: "llm", label: "大语言模型" },
  { id: "modelLibrary", label: "模型库" },
  { id: "knowledgeBase", label: "知识库" },
  { id: "database", label: "数据库" },
  { id: "memoryPool", label: "记忆池" },
  { id: "context", label: "上下文" },
  { id: "tool", label: "工具" },
];

const agentBuildResources: BuildResource[] = [
  {
    id: "llm-qwen",
    name: "千问 Qwen3-72B",
    category: "llm",
    categoryLabel: "大语言模型",
    sourceOrg: "平台",
    inputType: "提示词",
    outputType: "推理结果",
  },
  {
    id: "model-change",
    name: "遥感变化检测模型",
    category: "modelLibrary",
    categoryLabel: "模型库",
    sourceOrg: "省级",
    inputType: "遥感影像",
    outputType: "栅格掩膜",
  },
  {
    id: "model-landtype",
    name: "地类识别模型",
    category: "modelLibrary",
    categoryLabel: "模型库",
    sourceOrg: "省级",
    inputType: "影像图斑",
    outputType: "地类标签",
  },
  {
    id: "model-overlay",
    name: "空间叠加分析模型",
    category: "modelLibrary",
    categoryLabel: "模型库",
    sourceOrg: "平台",
    inputType: "空间图层",
    outputType: "叠加结果",
  },
  {
    id: "model-area",
    name: "面积核算模型",
    category: "modelLibrary",
    categoryLabel: "模型库",
    sourceOrg: "平台",
    inputType: "矢量图斑",
    outputType: "面积结果",
  },
  {
    id: "kb-cropland",
    name: "耕地保护政策法规库",
    category: "knowledgeBase",
    categoryLabel: "知识库",
    sourceOrg: "省级",
    inputType: "业务问题",
    outputType: "政策依据",
  },
  {
    id: "kb-approval",
    name: "用地审批规则库",
    category: "knowledgeBase",
    categoryLabel: "知识库",
    sourceOrg: "省级",
    inputType: "审批场景",
    outputType: "规则条款",
  },
  {
    id: "kb-case",
    name: "历史案例库",
    category: "knowledgeBase",
    categoryLabel: "知识库",
    sourceOrg: "市县",
    inputType: "相似问题",
    outputType: "案例经验",
  },
  {
    id: "db-all",
    name: "全部数据库",
    category: "database",
    categoryLabel: "数据库",
    sourceOrg: "平台",
    inputType: "查询条件",
    outputType: "多源数据",
  },
  {
    id: "db-rs",
    name: "遥感影像库",
    category: "database",
    categoryLabel: "数据库",
    sourceOrg: "省级",
    inputType: "时空范围",
    outputType: "遥感影像",
  },
  {
    id: "db-patch",
    name: "耕地图斑库",
    category: "database",
    categoryLabel: "数据库",
    sourceOrg: "市县",
    inputType: "行政区范围",
    outputType: "矢量图斑",
  },
  {
    id: "db-basic",
    name: "永久基本农田库",
    category: "database",
    categoryLabel: "数据库",
    sourceOrg: "省级",
    inputType: "空间范围",
    outputType: "保护边界",
  },
  {
    id: "db-approval",
    name: "建设用地审批库",
    category: "database",
    categoryLabel: "数据库",
    sourceOrg: "省级",
    inputType: "项目范围",
    outputType: "审批记录",
  },
  {
    id: "memory-user",
    name: "用户调参记忆",
    category: "memoryPool",
    categoryLabel: "记忆池",
    sourceOrg: "个人",
    inputType: "用户行为",
    outputType: "偏好参数",
  },
  {
    id: "memory-case",
    name: "历史研判经验",
    category: "memoryPool",
    categoryLabel: "记忆池",
    sourceOrg: "平台",
    inputType: "历史任务",
    outputType: "经验模式",
  },
  {
    id: "memory-task",
    name: "任务执行记忆",
    category: "memoryPool",
    categoryLabel: "记忆池",
    sourceOrg: "任务",
    inputType: "执行过程",
    outputType: "过程记忆",
  },
  {
    id: "ctx-params",
    name: "当前任务参数",
    category: "context",
    categoryLabel: "上下文",
    sourceOrg: "任务",
    inputType: "用户配置",
    outputType: "参数上下文",
  },
  {
    id: "ctx-patch",
    name: "当前图斑对象",
    category: "context",
    categoryLabel: "上下文",
    sourceOrg: "任务",
    inputType: "选中对象",
    outputType: "图斑上下文",
  },
  {
    id: "ctx-result",
    name: "中间结果",
    category: "context",
    categoryLabel: "上下文",
    sourceOrg: "任务",
    inputType: "智能体输出",
    outputType: "过程结果",
  },
  {
    id: "ctx-log",
    name: "智能体执行记录",
    category: "context",
    categoryLabel: "上下文",
    sourceOrg: "任务",
    inputType: "执行事件",
    outputType: "过程日志",
  },
  {
    id: "tool-model-search",
    name: "模型检索工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "任务JSON / 能力标签",
    outputType: "候选模型清单",
  },
  {
    id: "tool-data-search",
    name: "数据检索工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "时空范围 / 数据需求",
    outputType: "候选数据清单",
  },
  {
    id: "tool-model-run",
    name: "模型执行工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "模型ID / 输入数据",
    outputType: "模型执行结果",
  },
  {
    id: "tool-format-convert",
    name: "数据格式转换工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "异构数据包",
    outputType: "标准数据包",
  },
  {
    id: "tool-result-validate",
    name: "结果校验工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "输出结果 / 约束规则",
    outputType: "校验报告",
  },
  {
    id: "tool-service-test",
    name: "服务连通测试工具",
    category: "tool",
    categoryLabel: "工具",
    sourceOrg: "平台",
    inputType: "服务地址 / 鉴权信息",
    outputType: "连通测试结果",
  },
];

function BlankAgentBuilder({
  inputStandards,
  outputStandards,
  onSave,
}: {
  inputStandards: string[];
  outputStandards: string[];
  onSave?: () => void;
}) {
  const standardAgentNodes = useMemo<Node<FlowNodeData>[]>(
    () => [
      {
        id: "standard-input",
        type: "resource",
        position: { x: 40, y: 170 },
        draggable: false,
        data: {
          label: "输入数据标准",
          category: "多模态输入",
          inputType: inputStandards.join(" / ") || "待选择",
          outputType: "标准化任务上下文",
          kind: "resource",
          sourceOrg: "输入",
          resourceCategory: "standardInput",
          dataPorts: inputStandards,
          standardSide: "input",
        },
      },
      {
        id: "standard-output",
        type: "resource",
        position: { x: 780, y: 170 },
        draggable: false,
        data: {
          label: "输出数据标准",
          category: "多模态输出",
          inputType: "智能体过程结果",
          outputType: outputStandards.join(" / ") || "待选择",
          kind: "resource",
          sourceOrg: "输出",
          resourceCategory: "standardOutput",
          dataPorts: outputStandards,
          standardSide: "output",
        },
      },
    ],
    [inputStandards, outputStandards],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(standardAgentNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [activeBuildCategory, setActiveBuildCategory] = useState<BuildResourceCategory>("llm");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [sidePanelTab, setSidePanelTab] = useState<"config" | "test">("config");
  const [testInput, setTestInput] = useState("测试输入：近期遥感影像 + 疑似变化图斑 + JSON任务参数");
  const [testFileName, setTestFileName] = useState("未上传测试文件");
  const [testResult, setTestResult] = useState("");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const reactFlow = useReactFlow();
  const nodeTypes = useMemo(
    () => ({ agent: AgentNode, tool: ToolNode, resource: ResourceNode }),
    [],
  );

  const filteredBuildResources = agentBuildResources.filter(
    (item) => item.category === activeBuildCategory,
  );
  const hasUserComponents = nodes.some((node) => !node.id.startsWith("standard-"));
  const testableNodes = nodes.filter((node) => !node.id.startsWith("standard-"));
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);
  const allComponentsPassed =
    testableNodes.length > 0 &&
    testableNodes.every((node) => node.data.testStatus === "passed");

  const resultPackage = {
    conclusion: "疑似占用耕地风险：中",
    outputs: ["JSON研判结论", "空间矢量结果", "规则研判摘要", "报告摘要"],
    note: "原型模拟结果包，后续可替换为后端生成的空间数据或压缩包。",
  };
  const resultDownloadHref =
    "data:application/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(resultPackage, null, 2));

  const getDefaultConfig = (resource: BuildResource): Record<string, string> => {
    if (resource.category === "llm") {
      return {
        systemPrompt: "你是自然资源业务研判智能体，请基于输入数据、规则依据和空间结果输出可解释结论。",
        temperature: "0.2",
        maxTokens: "4096",
      };
    }
    if (resource.category === "modelLibrary") {
      return {
        serviceUrl: "https://model-service.example/api",
        confidenceThreshold: "0.75",
        batchSize: "8",
      };
    }
    if (resource.category === "database") {
      return {
        queryScope: "当前任务行政区",
        timeRange: "近30天",
        fields: "全部必要字段",
      };
    }
    if (resource.category === "tool") {
      return {
        serviceUrl: "https://tool-service.example/api",
        timeout: "30s",
        retryPolicy: "失败重试 2 次",
        outputSchema: resource.outputType,
      };
    }
    return {
      retrievalTopK: "5",
      usagePolicy: "仅用于当前任务上下文",
    };
  };

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            label: connection.sourceHandle || connection.targetHandle ? "数据包传递" : "信息流",
          },
          currentEdges,
        ),
      ),
    [setEdges],
  );

  const onResourceDragStart = (event: DragEvent<HTMLButtonElement>, resource: BuildResource) => {
    event.dataTransfer.setData("application/build-resource", JSON.stringify(resource));
    event.dataTransfer.effectAllowed = "move";
  };

  const onResourceDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/build-resource");
      if (!raw) return;
      const resource = JSON.parse(raw) as BuildResource;
      const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setNodes((currentNodes) => [
        ...currentNodes,
        {
          id: resource.id + "-" + Date.now(),
          type: "resource",
          position,
          data: {
            label: resource.name,
            category: resource.categoryLabel,
            inputType: resource.inputType,
            outputType: resource.outputType,
            kind: "resource",
            sourceOrg: resource.sourceOrg,
            resourceCategory: resource.category,
            testStatus: "idle",
            config: getDefaultConfig(resource),
          },
        },
      ]);
    },
    [reactFlow, setNodes],
  );

  const updateSelectedNodeConfig = (key: string, value: string) => {
    if (!selectedNodeId) return;
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? { ...node, data: { ...node.data, config: { ...(node.data.config || {}), [key]: value } } }
          : node,
      ),
    );
  };

  const anchorStandardNodes = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const nodeWidth = 214;
    const nodeHeight = 170;
    const margin = 24;
    const centerY = rect.top + rect.height / 2 - nodeHeight / 2;
    const inputPosition = reactFlow.screenToFlowPosition({
      x: rect.left + margin,
      y: centerY,
    });
    const outputPosition = reactFlow.screenToFlowPosition({
      x: rect.right - nodeWidth - margin,
      y: centerY,
    });

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id === "standard-input") {
          return { ...node, position: inputPosition };
        }
        if (node.id === "standard-output") {
          return { ...node, position: outputPosition };
        }
        return node;
      }),
    );
  }, [reactFlow, setNodes]);

  const runPipelineTest = () => {
    if (testableNodes.length === 0) {
      setTestResult("请先从组件库拖入组件，再进行联调测试。");
      return;
    }
    setTestResult("正在按当前连接关系调配组件...");
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id.startsWith("standard-")
          ? node
          : { ...node, data: { ...node.data, testStatus: "running" } },
      ),
    );
    window.setTimeout(() => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id.startsWith("standard-")
            ? node
            : { ...node, data: { ...node.data, testStatus: "passed" } },
        ),
      );
      setTestResult("联调通过：已完成测试输入解析、组件调用、数据包传递和输出标准校验。模拟输出包含 JSON 研判结论、矢量结果包和报告摘要。");
    }, 700);
  };

  return (
    <div className="blank-builder-layout">
      <section className="blank-flow-panel">
        <div className="section-toolbar">
          <div>
            <strong>拖拽式快速配置</strong>
            <p>中间区域用于搭建智能体内部工作流，定义输入、处理逻辑、输出和资源调用关系。</p>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button">保存草稿</button>
            <button className="primary-button" onClick={onSave} type="button">发布智能体</button>
          </div>
        </div>
        <div
          className="blank-flow-canvas"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onResourceDrop}
          ref={canvasRef}
        >
          {!hasUserComponents ? (
            <div className="blank-canvas-empty">
              <strong>从输入标准开始连接内部流程</strong>
              <span>从下方组件库拖入组件，连接输入数据标准、处理组件和输出数据标准，形成智能体内部信息流。</span>
            </div>
          ) : null}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              if (!node.id.startsWith("standard-")) {
                setSelectedNodeId(node.id);
                setSidePanelTab("config");
              }
            }}
            onPaneClick={() => setSelectedNodeId(null)}
            onInit={() => window.requestAnimationFrame(anchorStandardNodes)}
            onMove={anchorStandardNodes}
            onMoveEnd={anchorStandardNodes}
            connectionRadius={36}
            connectOnClick
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background gap={22} size={1} />
            <Controls />
          </ReactFlow>
        </div>
      </section>

      <aside className="debug-panel">
        <h3>配置联调</h3>
        <div className="side-panel-tabs">
          <button className={sidePanelTab === "config" ? "active" : ""} onClick={() => setSidePanelTab("config")} type="button">
            组件配置
          </button>
          <button className={sidePanelTab === "test" ? "active" : ""} onClick={() => setSidePanelTab("test")} type="button">
            联调测试
          </button>
        </div>
        <div className="debug-chat test-panel">
          {sidePanelTab === "config" ? (
            <div className="test-section component-config-section">
              <strong>组件配置</strong>
              {selectedNode && !selectedNode.id.startsWith("standard-") ? (
                <>
                  <div className="selected-component-title">
                    <span>{selectedNode.data.category}</span>
                    <b>{selectedNode.data.label}</b>
                  </div>
                  <div className="component-config-form">
                    {Object.entries(selectedNode.data.config || {}).map(([key, value]) => (
                      <label key={key}>
                        {key}
                        {key.toLowerCase().includes("prompt") ? (
                          <textarea value={value} onChange={(event) => updateSelectedNodeConfig(key, event.target.value)} />
                        ) : (
                          <input value={value} onChange={(event) => updateSelectedNodeConfig(key, event.target.value)} />
                        )}
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p>点击画布中的组件后，可配置提示词、模型参数、检索范围或数据查询条件。</p>
              )}
            </div>
          ) : null}

          {sidePanelTab === "test" ? (
            <>
              <div className="test-section">
                <strong>测试输入</strong>
                <label className="file-upload-control">
                  <input onChange={(event) => setTestFileName(event.target.files?.[0]?.name || "未上传测试文件")} type="file" />
                  <span>上传测试数据包</span>
                </label>
                <small>{testFileName}</small>
                <textarea value={testInput} onChange={(event) => setTestInput(event.target.value)} />
              </div>
              <div className="test-section">
                <strong>组件测试</strong>
                <div className="component-test-list">
                  {testableNodes.length > 0 ? (
                    testableNodes.map((node) => (
                      <div className="component-test-item" key={node.id}>
                        <span>{node.data.label}</span>
                        <em className={"status-" + (node.data.testStatus || "idle")}>{getTestStatusLabel(node.data.testStatus)}</em>
                      </div>
                    ))
                  ) : (
                    <p>请先从下方组件库拖入组件。</p>
                  )}
                </div>
                <button className="primary-button" onClick={runPipelineTest} type="button">逐个调配测试</button>
              </div>
              <div className="test-section result-section">
                <div className="result-section-header">
                  <strong>输出结果</strong>
                  <a
                    aria-disabled={!allComponentsPassed}
                    className={allComponentsPassed ? "download-result-link" : "download-result-link disabled"}
                    download="agent-test-result-package.json"
                    href={allComponentsPassed ? resultDownloadHref : undefined}
                  >
                    下载结果包
                  </a>
                </div>
                <p>{allComponentsPassed ? testResult : testResult || "所有组件测试跑通后，将在这里查看输出结果。"}</p>
              </div>
            </>
          ) : null}
        </div>
      </aside>

      <section className="build-resource-dock">
        <div className="resource-list-header">
          <h3>组件库</h3>
          <button className="text-button">添加资源</button>
        </div>
        <div className="build-resource-tabs">
          {buildResourceCategories.map((item) => (
            <button className={item.id === activeBuildCategory ? "active" : ""} key={item.id} onClick={() => setActiveBuildCategory(item.id)} type="button">
              {item.label}
            </button>
          ))}
        </div>
        <div className="build-resource-list">
          {filteredBuildResources.map((item) => (
            <button
              className={"build-resource-token category-" + item.category + " org-" + item.sourceOrg}
              draggable
              key={item.id}
              onDragStart={(event) => onResourceDragStart(event, item)}
              type="button"
            >
              <span>{item.sourceOrg}</span>
              <strong>{item.name}</strong>
              <small>{item.inputType} → {item.outputType}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function AgentInternalStructure({
  agent,
  onBack,
  onEdit,
}: {
  agent: AgentRecord;
  onBack: () => void;
  onEdit: () => void;
}) {
  const template = agentInternalTemplates[agent.id] || agentInternalTemplates["AGT-UNDERSTAND-001"];
  const nodeTypes = useMemo(
    () => ({ agent: AgentNode, tool: ToolNode, resource: ResourceNode }),
    [],
  );
  const getInternalComponentConfig = (component: AgentInternalComponent): Record<string, string> => {
    if (component.resourceCategory === "llm") {
      return {
        systemPrompt: "你是自然资源业务智能体组件，请根据输入数据类型完成当前组件职责，并保持输出格式可被下游组件接收。",
        temperature: "0.2",
        maxTokens: "4096",
      };
    }
    if (component.resourceCategory === "modelLibrary") {
      return {
        serviceUrl: "https://model-service.example/api",
        confidenceThreshold: "0.75",
        batchSize: "8",
      };
    }
    if (component.resourceCategory === "database") {
      return {
        queryScope: "当前任务行政区",
        timeRange: "近30天",
        fields: "任务所需字段",
      };
    }
    if (component.resourceCategory === "knowledgeBase") {
      return {
        retrievalTopK: "5",
        retrievalScope: "耕地保护 / 用地审批 / 历史案例",
        usagePolicy: "仅返回带来源的规则依据",
      };
    }
    if (component.resourceCategory === "context") {
      return {
        contextKey: component.id,
        retentionScope: "当前任务",
        writePolicy: "记录中间结果、组件输出和执行过程",
      };
    }
    if (component.resourceCategory === "memoryPool") {
      return {
        retrievalTopK: "3",
        usagePolicy: "仅使用历史经验作为参数建议",
      };
    }
    return {
      输入格式: component.inputType,
      输出格式: component.outputType,
      组件说明: component.description,
    };
  };
  const initialInternalNodes = useMemo<Node<FlowNodeData>[]>(
    () => [
      {
        id: "standard-input",
        type: "resource",
        position: { x: 32, y: 180 },
        data: {
          label: "输入数据标准",
          category: "标准输入",
          inputType: template.inputs.join(" / "),
          outputType: template.inputs.join(" / "),
          kind: "resource",
          sourceOrg: "输入",
          resourceCategory: "standardInput",
          dataPorts: template.inputs,
          standardSide: "input",
        },
      },
      ...template.components.map((component) => ({
        id: component.id,
        type: "resource",
        position: component.position,
        data: {
          label: component.name,
          category: component.category,
          description: component.description,
          inputType: component.inputType,
          outputType: component.outputType,
          kind: "resource" as const,
          sourceOrg: component.sourceOrg,
          resourceCategory: component.resourceCategory,
          testStatus: "passed" as const,
          config: getInternalComponentConfig(component),
        },
      })),
      {
        id: "standard-output",
        type: "resource",
        position: { x: 1540, y: 220 },
        data: {
          label: "输出数据标准",
          category: "标准输出",
          inputType: template.outputs.join(" / "),
          outputType: template.outputs.join(" / "),
          kind: "resource",
          sourceOrg: "输出",
          resourceCategory: "standardOutput",
          dataPorts: template.outputs,
          standardSide: "output",
        },
      },
    ],
    [template],
  );
  const initialInternalEdges = useMemo<Edge[]>(
    () =>
      template.edges.map((edge, index) => {
        const sourceHandle =
          edge.source === "standard-input"
            ? `out-${Math.max(
                0,
                template.inputs.findIndex((item) => getDataTypeClass(item) === getDataTypeClass(edge.label)),
              )}`
            : undefined;
        const targetHandle =
          edge.target === "standard-output"
            ? `in-${Math.max(
                0,
                template.outputs.findIndex((item) => getDataTypeClass(item) === getDataTypeClass(edge.label)),
              )}`
            : undefined;

        return {
          id: `internal-edge-${index}`,
          source: edge.source,
          sourceHandle,
          target: edge.target,
          targetHandle,
          label: edge.label,
          markerEnd: { type: MarkerType.ArrowClosed },
        };
      }),
    [template],
  );
  const [nodes, , onNodesChange] = useNodesState(initialInternalNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialInternalEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  return (
    <div className="agent-internal-layout">
      <section className="agent-internal-flow">
        <div className="section-toolbar">
          <div>
            <strong>内部组件编排</strong>
            <p>{template.summary}</p>
          </div>
          <div className="toolbar-actions">
            <button className="secondary-button" onClick={onBack} type="button">返回智能体中心</button>
            <button className="primary-button" onClick={onEdit} type="button">编辑智能体</button>
          </div>
        </div>
        <div className="agent-internal-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDoubleClick={(_, node) => {
              if (!node.id.startsWith("standard-")) {
                setSelectedNodeId(node.id);
              }
            }}
            fitView
            connectionRadius={36}
          >
            <Background gap={22} size={1} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>
      </section>

      <aside className="agent-internal-side">
        {selectedNode && !selectedNode.id.startsWith("standard-") ? (
          <div className="agent-internal-component-only">
            <div className="agent-internal-side-head">
              <button className="secondary-button" onClick={() => setSelectedNodeId(null)} type="button">
                返回智能体详情
              </button>
            </div>
            <div className="agent-internal-section selected-internal-component">
              <strong>组件详情</strong>
              <>
                <div className="selected-component-title">
                  <span>{selectedNode.data.category}</span>
                  <b>{selectedNode.data.label}</b>
                  <p>{selectedNode.data.description || selectedNode.data.config?.组件说明}</p>
                </div>
                <div className="component-config-form">
                  <label>
                    输入格式
                    <input readOnly value={selectedNode.data.inputType} />
                  </label>
                  <label>
                    输出格式
                    <input readOnly value={selectedNode.data.outputType} />
                  </label>
                  {Object.entries(selectedNode.data.config || {}).map(([key, value]) => (
                    <label key={key}>
                      {key}
                      {key.toLowerCase().includes("prompt") || value.length > 36 ? (
                        <textarea readOnly value={value} />
                      ) : (
                        <input readOnly value={value} />
                      )}
                    </label>
                  ))}
                </div>
              </>
            </div>
          </div>
        ) : (
          <>
            <div className="agent-internal-summary">
              <span>{agent.category}</span>
              <h3>{agent.name}</h3>
              <p>{template.summary}</p>
            </div>
            <div className="agent-internal-section">
              <strong>输入输出标准</strong>
              <div className="agent-io-standard">
                <span>输入</span>
                <b>{template.inputs.join(" / ")}</b>
                <span>输出</span>
                <b>{template.outputs.join(" / ")}</b>
              </div>
            </div>
            <div className="agent-internal-section">
              <strong>执行逻辑</strong>
              <div className="agent-logic-list">
                {template.logic.map((item, index) => (
                  <div key={item}>
                    <span>{index + 1}</span>
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="agent-internal-section">
              <strong>内部组件</strong>
              <div className="agent-component-list">
                {template.components.map((component) => (
                  <article key={component.id}>
                    <span>{component.category}</span>
                    <b>{component.name}</b>
                    <p>{component.description}</p>
                    <em>{component.inputType} → {component.outputType}</em>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function AgentCenter({
  navigation,
  onBackToWorkspace,
}: {
  navigation: AgentNavigationState;
  onBackToWorkspace: () => void;
}) {
  const [view, setView] = useState<AgentCenterView>(
    navigation.mode === "list" ? "list" : navigation.mode === "create" ? "create-options" : "blank-builder",
  );
  const [showBlankMeta, setShowBlankMeta] = useState(false);
  const [metaStep, setMetaStep] = useState(0);
  const [selectedInputStandards, setSelectedInputStandards] = useState<string[]>(
    navigation.editingAgent ? splitDataPorts(navigation.editingAgent.inputType) : ["文本", "JSON"],
  );
  const [selectedOutputStandards, setSelectedOutputStandards] = useState<string[]>(
    navigation.editingAgent ? splitDataPorts(navigation.editingAgent.outputType) : ["JSON"],
  );
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("全部类型");
  const [status, setStatus] = useState("全部状态");
  const [selectedAgentId, setSelectedAgentId] = useState(agentRecords[0].id);

  const categoryOptions = ["全部类型", ...Array.from(new Set(agentRecords.map((agent) => agent.category)))];
  const statusOptions = ["全部状态", "启用", "调试中", "停用"];

  const toggleStandard = (value: string, selected: string[], setSelected: (next: string[]) => void) => {
    setSelected(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  const filteredAgents = agentRecords.filter((agent) => {
    const keywordMatched = agent.name.includes(keyword) || agent.id.includes(keyword) || agent.scenario.includes(keyword);
    const categoryMatched = category === "全部类型" || agent.category === category;
    const statusMatched = status === "全部状态" || agent.status === status;
    return keywordMatched && categoryMatched && statusMatched;
  });
  const selectedAgent = agentRecords.find((agent) => agent.id === selectedAgentId) || agentRecords[0];

  if (view === "blank-builder") {
    const isEditing = navigation.mode === "edit";
    return (
      <ReactFlowProvider>
        <div className="subpage-heading">
          <div>
            <h2>{isEditing ? `编辑：${navigation.editingAgent?.label}` : "智能体敏捷开发"}</h2>
            <p>{isEditing ? "基于当前智能体的输入输出与内部组织结构进行修改，保存后返回多智能体编辑界面。" : "通过工作流、资源装配、对话调试和校准提示快速完成智能体配置。"}</p>
          </div>
          <button className="secondary-button" onClick={navigation.returnToWorkspace ? onBackToWorkspace : () => setView("list")}>
            {navigation.returnToWorkspace ? "返回多智能体编辑" : "返回智能体中心"}
          </button>
        </div>
        <BlankAgentBuilder
          inputStandards={selectedInputStandards}
          outputStandards={selectedOutputStandards}
          onSave={navigation.returnToWorkspace ? onBackToWorkspace : undefined}
        />
      </ReactFlowProvider>
    );
  }

  if (view === "detail") {
    return (
      <ReactFlowProvider>
        <div className="subpage-heading">
          <div>
            <h2>{selectedAgent.name}</h2>
            <p>以智能体敏捷开发界面的方式展示该智能体的内部组件、连接关系、输入输出标准和执行逻辑。</p>
          </div>
          <button className="secondary-button" onClick={() => setView("list")} type="button">
            返回智能体中心
          </button>
        </div>
        <AgentInternalStructure
          key={selectedAgent.id}
          agent={selectedAgent}
          onBack={() => setView("list")}
          onEdit={() => {
            setSelectedInputStandards(splitDataPorts(selectedAgent.inputType));
            setSelectedOutputStandards(splitDataPorts(selectedAgent.outputType));
            setView("blank-builder");
          }}
        />
      </ReactFlowProvider>
    );
  }

  if (view === "create-options") {
    return (
      <>
        <div className="subpage-heading">
          <div>
            <h2>创建智能体</h2>
            <p>可以从模板、已有智能体或空白配置开始。</p>
          </div>
          <button className="secondary-button" onClick={navigation.returnToWorkspace ? onBackToWorkspace : () => setView("list")}>
            {navigation.returnToWorkspace ? "返回多智能体编辑" : "返回智能体中心"}
          </button>
        </div>
        <section className="create-option-grid">
          <button className="create-option-card" type="button">
            <span>方式一</span>
            <strong>从模板创建</strong>
            <p>选择任务理解、数据调度、模型调度、知识调度、研判或解释类模板。</p>
          </button>
          <button className="create-option-card" type="button">
            <span>方式二</span>
            <strong>从已有智能体创建</strong>
            <p>复制已有智能体配置，再调整资源、提示词和输入输出标准。</p>
          </button>
          <button className="create-option-card active" onClick={() => setShowBlankMeta(true)} type="button">
            <span>方式三</span>
            <strong>空白创建</strong>
            <p>先定义元信息和多模态输入输出标准，再进入拖拽式快速配置。</p>
          </button>
        </section>

        {showBlankMeta ? (
          <div className="modal-backdrop">
            <div className="agent-meta-modal">
              <div className="modal-header">
                <strong>智能体元信息</strong>
                <button onClick={() => setShowBlankMeta(false)} type="button">关闭</button>
              </div>
              <div className="meta-stepper">
                {["基础信息", "输入标准", "输出标准"].map((item, index) => (
                  <button className={metaStep === index ? "active" : ""} key={item} onClick={() => setMetaStep(index)} type="button">
                    {item}
                  </button>
                ))}
              </div>
              {metaStep === 0 ? (
                <div className="meta-form-grid">
                  <label>智能体名称<input defaultValue="新建耕地保护智能体" /></label>
                  <label>角色分类<input defaultValue="数据研判智能体" /></label>
                  <label>适用场景<input defaultValue="耕地保护 / 用地监测" /></label>
                  <label>简介<textarea defaultValue="面向用地监测任务，组合数据、模型、知识和上下文资源完成可解释研判。" /></label>
                </div>
              ) : null}
              {metaStep === 1 ? (
                <div className="standard-option-list">
                  {inputDataStandardOptions.map((item) => {
                    const dataType = normalizeDataStandardLabel(item.label);
                    return (
                      <button
                        className={selectedInputStandards.includes(dataType) ? "selected" : ""}
                        key={item.id}
                        onClick={() => toggleStandard(dataType, selectedInputStandards, setSelectedInputStandards)}
                        type="button"
                      >
                        <strong>{dataType}</strong>
                        <span>{item.description}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {metaStep === 2 ? (
                <div className="standard-option-list">
                  {outputDataStandardOptions.map((item) => {
                    const dataType = normalizeDataStandardLabel(item.label);
                    return (
                      <button
                        className={selectedOutputStandards.includes(dataType) ? "selected" : ""}
                        key={item.id}
                        onClick={() => toggleStandard(dataType, selectedOutputStandards, setSelectedOutputStandards)}
                        type="button"
                      >
                        <strong>{dataType}</strong>
                        <span>{item.description}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div className="modal-actions">
                <button className="secondary-button" onClick={() => setShowBlankMeta(false)} type="button">取消</button>
                <button className="primary-button" onClick={() => setView("blank-builder")} type="button">进入快速配置</button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <section className="agent-directory-toolbar">
        <div className="agent-directory-title">
          <div>
            <p>管理已经创建的业务智能体，查看输入输出标准、资源范围和运行状态。</p>
          </div>
          <button className="primary-button" onClick={() => setView("create-options")}>新建智能体</button>
        </div>
        <div className="agent-directory-filters">
          <input placeholder="搜索名称、编号或业务场景" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>
      <section className="agent-card-grid">
        {filteredAgents.map((agent) => {
          const inputPorts = splitDataPorts(agent.inputType);
          const outputPorts = splitDataPorts(agent.outputType);
          return (
            <article className="agent-list-card" key={agent.id}>
              <div className="agent-card-actions">
                <button type="button">查看文档</button>
                <button
                  onClick={() => {
                    setSelectedAgentId(agent.id);
                    setView("detail");
                  }}
                  type="button"
                >
                  查看详情
                </button>
              </div>
              <div className="resource-node-preview agent-card-preview">
                <div className="preview-port-column">
                  {inputPorts.map((port, index) => (
                    <span className={"preview-port port-" + getDataTypeClass(port)} key={agent.id + "-in-" + index} title={"输入：" + port} />
                  ))}
                </div>
                <div className="preview-node-body">
                  <span>{agent.category}</span>
                  <strong>{agent.name}</strong>
                  <p>{agent.scenario}</p>
                </div>
                <div className="preview-port-column">
                  {outputPorts.map((port, index) => (
                    <span className={"preview-port port-" + getDataTypeClass(port)} key={agent.id + "-out-" + index} title={"输出：" + port} />
                  ))}
                </div>
              </div>
              <div className="agent-card-meta">
                <span>输入：{inputPorts.join(" / ")}</span>
                <span>输出：{outputPorts.join(" / ")}</span>
                <span>资源：{agent.resourceScope}</span>
              </div>
              <div className="agent-card-footer">
                <em>{agent.status}</em>
                <small>{agent.updatedAt}</small>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
function ResourceCenter({
  resourceSubView,
  userRole,
}: {
  resourceSubView: ResourceSubView;
  userRole: UserRole;
}) {
  const resourceSummary = [
    ["资源总量", "4,462", "数据 4,286 / 模型 126 / 知识 38 / 大模型 12"],
    ["综合可用度", "94%", "18 个资源需复核"],
    ["今日调用", "1,284", "智能体调用成功率 97.6%"],
    ["异常资源", "12", "解析失败 5 / 服务超时 7"],
  ];
  const resourceDomains = [
    {
      id: "data",
      name: "数据资源",
      count: "4,286",
      folders: ["遥感影像", "耕地图斑", "永久基本农田", "建设用地审批", "规划边界"],
    },
    {
      id: "model",
      name: "模型资源",
      count: "126",
      folders: ["遥感识别", "GIS分析", "面积核算", "空间叠加", "质量检查"],
    },
    {
      id: "llm",
      name: "大模型资源",
      count: "12",
      folders: ["通用大语言模型", "多模态模型", "推理模型", "私有化模型", "API密钥池"],
    },
    {
      id: "knowledge",
      name: "知识资源",
      count: "38",
      folders: ["政策法规", "审批规则", "历史案例", "专家经验", "审查模板"],
    },
  ];
  const managedResources = [
    {
      id: "res-rs-001",
      name: "近期遥感影像库",
      domain: "data",
      type: "栅格",
      source: "省级",
      status: "可用",
      access: "平台共享",
      updated: "2026-07-02",
      quality: "96",
      format: "GeoTIFF / COG",
      service: "影像切片服务",
      callCount: "428",
      usedBy: ["用地监测数据调度智能体", "用地监测计算执行智能体"],
      metadata: ["空间范围：全省", "时相：近30天", "分辨率：0.8m-2m", "坐标系：CGCS2000"],
      fields: ["scene_id", "capture_time", "cloud_cover", "resolution"],
    },
    {
      id: "res-patch-002",
      name: "耕地图斑库",
      domain: "data",
      type: "矢量",
      source: "市县",
      status: "可用",
      access: "授权共享",
      updated: "2026-07-01",
      quality: "93",
      format: "GeoJSON / PostGIS",
      service: "空间查询服务",
      callCount: "312",
      usedBy: ["用地监测数据调度智能体", "图斑合规研判智能体"],
      metadata: ["要素数：128,420", "几何类型：Polygon", "坐标系：CGCS2000", "更新频率：每日"],
      fields: ["patch_id", "land_type", "area", "county_code"],
    },
    {
      id: "res-basic-003",
      name: "永久基本农田库",
      domain: "data",
      type: "矢量",
      source: "省级",
      status: "可用",
      access: "平台共享",
      updated: "2026-06-28",
      quality: "98",
      format: "PostGIS",
      service: "边界叠加服务",
      callCount: "256",
      usedBy: ["图斑合规研判智能体"],
      metadata: ["空间范围：全省", "几何类型：Polygon", "版本：2026Q2", "安全等级：内部"],
      fields: ["basic_id", "protect_grade", "area", "approval_batch"],
    },
    {
      id: "res-model-004",
      name: "遥感变化检测模型",
      domain: "model",
      type: "模型服务",
      source: "平台",
      status: "调试中",
      access: "智能体调用",
      updated: "2026-06-30",
      quality: "89",
      format: "REST API",
      service: "变化检测推理服务",
      callCount: "184",
      usedBy: ["遥感变化监测调度智能体", "用地监测计算执行智能体"],
      metadata: ["输入：遥感影像", "输出：栅格掩膜", "阈值：0.75", "平均耗时：42s"],
      fields: ["image_url", "bbox", "confidence", "mask_url"],
    },
    {
      id: "res-overlay-005",
      name: "空间叠加分析模型",
      domain: "model",
      type: "GIS模型",
      source: "平台",
      status: "可用",
      access: "智能体调用",
      updated: "2026-06-26",
      quality: "95",
      format: "WPS / REST",
      service: "叠加分析服务",
      callCount: "396",
      usedBy: ["图斑合规研判智能体"],
      metadata: ["输入：矢量图层", "输出：叠加结果", "支持：相交/包含/缓冲", "平均耗时：8s"],
      fields: ["layer_a", "layer_b", "overlay_type", "result_layer"],
    },
    {
      id: "res-policy-006",
      name: "耕地保护政策法规库",
      domain: "knowledge",
      type: "文本",
      source: "省级",
      status: "待复核",
      access: "平台共享",
      updated: "2026-06-24",
      quality: "91",
      format: "知识库索引",
      service: "规则检索服务",
      callCount: "205",
      usedBy: ["耕地规则研判智能体", "图斑合规研判智能体"],
      metadata: ["文档数：412", "规则条款：2,186", "版本：v2026.06", "人工复核：进行中"],
      fields: ["policy_id", "title", "clause", "effective_date"],
    },
    {
      id: "res-llm-007",
      name: "千问 Qwen3-72B API",
      domain: "llm",
      type: "大模型API",
      source: "平台",
      status: "可用",
      access: "智能体调用",
      updated: "2026-07-03",
      quality: "97",
      format: "OpenAI Compatible API",
      service: "对话生成 / 工具调用 / 结构化输出",
      callCount: "682",
      usedBy: ["耕地任务解析智能体", "耕地规则研判智能体", "图斑合规研判智能体"],
      metadata: ["上下文：128K", "能力：文本推理/工具调用", "鉴权：API Key", "限流：120 RPM"],
      fields: ["base_url", "api_key", "model_name", "temperature", "max_tokens"],
    },
  ];
  const [activeDomain, setActiveDomain] = useState("data");
  const [selectedResourceId, setSelectedResourceId] = useState(managedResources[0].id);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [serviceResourceId, setServiceResourceId] = useState<string | null>(null);
  const [resourceView, setResourceView] = useState<"manager" | "upload">("manager");
  const [sharingKeyword, setSharingKeyword] = useState("");
  const [sharingStatusFilter, setSharingStatusFilter] = useState("全部状态");
  const [selectedProvinceResourceName, setSelectedProvinceResourceName] = useState("南京市变化识别模型");
  const [provinceResourceModalOpen, setProvinceResourceModalOpen] = useState(false);
  const [provinceResourceTestState, setProvinceResourceTestState] = useState<"idle" | "testing" | "passed">("idle");
  const [provinceReviewStatusOverrides, setProvinceReviewStatusOverrides] = useState<Record<string, string>>({});
  const [provinceReviewFeedback, setProvinceReviewFeedback] = useState("请补充资源适用范围、样例请求数据和失败场景说明。");
  const [connectivityState, setConnectivityState] = useState<"idle" | "testing" | "passed">("idle");
  const [uploadFields, setUploadFields] = useState([
    { id: "scene_id", name: "scene_id", type: "文本", desc: "影像场景编号", required: "必填", system: true },
    { id: "capture_time", name: "capture_time", type: "时间", desc: "影像采集时间", required: "必填", system: true },
    { id: "bbox", name: "bbox", type: "空间范围", desc: "服务覆盖范围", required: "选填", system: false },
    { id: "cloud_cover", name: "cloud_cover", type: "数值", desc: "云量比例", required: "选填", system: false },
  ]);
  const filteredResources = managedResources.filter((item) => item.domain === activeDomain);
  const selectedResource =
    managedResources.find((item) => item.id === selectedResourceId && item.domain === activeDomain) ||
    filteredResources[0] ||
    managedResources[0];
  const serviceResource = serviceResourceId ? managedResources.find((item) => item.id === serviceResourceId) : null;
  const defaultDataProfile = {
    visualTitle: "空间数据预览",
    visualHint: "服务返回模拟图层、范围网格和样本对象，用于快速判断资源可用性。",
    quality: [
      { label: "属性", score: 94 },
      { label: "空间", score: 96 },
      { label: "时间", score: 91 },
      { label: "业务规则", score: 89 },
    ],
    logs: [
      ["2026-07-03 09:42", "用地监测数据调度智能体", "空间查询", "成功"],
      ["2026-07-02 16:18", "图斑合规研判智能体", "叠加分析", "成功"],
      ["2026-07-02 10:05", "人工审核工作台", "样本抽取", "成功"],
    ],
    semanticDescription:
      "该数据资源用于支撑耕地保护场景下的用地监测、图斑核查和智能体研判。系统已将资源名称、字段含义、空间范围、时间口径和业务用途进行语义归并，便于智能体在任务执行时理解该资源适用于哪类问题、能够提供什么证据、以及应与哪些模型或知识规则共同使用。",
    tags: ["业务主题：耕地保护", "任务场景：用地监测", "数据形态：空间数据", "调用对象：智能体", "来源层级：省市县协同", "治理状态：已语义标注"],
  };
  const dataProfiles: Record<string, typeof defaultDataProfile> = {
    "res-rs-001": {
      ...defaultDataProfile,
      visualTitle: "遥感影像服务预览",
      visualHint: "展示近30天影像覆盖、云量分布和疑似变化样本。",
      semanticDescription:
        "该资源表达近期遥感影像的覆盖范围、采集时间、分辨率和云量等信息，主要作为疑似变化发现、遥感变化检测和图斑线索生成的输入数据。智能体可依据时相、空间范围和影像质量自动选择可用影像，并将影像识别结果传递给后续的空间叠加分析与人工确认环节。",
      quality: [
        { label: "属性", score: 92 },
        { label: "空间", score: 98 },
        { label: "时间", score: 95 },
        { label: "业务规则", score: 90 },
      ],
      tags: ["数据类型：栅格", "业务主题：耕地保护", "任务场景：变化检测", "时态特征：近期时相", "空间范围：全省覆盖", "调用对象：遥感识别模型"],
    },
    "res-patch-002": {
      ...defaultDataProfile,
      visualTitle: "耕地图斑服务预览",
      visualHint: "展示图斑边界、地类字段和市县来源标注。",
      semanticDescription:
        "该资源表达耕地图斑的空间边界、地类属性、面积和行政区归属，是用地监测中判断疑似变化是否涉及耕地的重要底图。智能体可通过图斑编号、地类字段和县级来源标签，将遥感识别结果与耕地现状数据进行匹配，形成后续合规研判的基础证据。",
      quality: [
        { label: "属性", score: 93 },
        { label: "空间", score: 94 },
        { label: "时间", score: 88 },
        { label: "业务规则", score: 96 },
      ],
      tags: ["数据类型：矢量面", "业务主题：耕地保护", "任务场景：图斑核查", "来源层级：市县上报", "核心字段：地类与面积", "调用对象：合规研判智能体"],
    },
    "res-basic-003": {
      ...defaultDataProfile,
      visualTitle: "永久基本农田服务预览",
      visualHint: "展示永久基本农田保护边界、保护等级和审批批次字段。",
      semanticDescription:
        "该资源表达永久基本农田保护边界、保护等级和审批批次，是耕地保护研判中的强约束数据。智能体在识别疑似占用行为后，可调用该资源判断是否触及永久基本农田保护红线，并将空间叠加结果作为风险等级和人工审核依据的重要组成部分。",
      quality: [
        { label: "属性", score: 97 },
        { label: "空间", score: 98 },
        { label: "时间", score: 94 },
        { label: "业务规则", score: 99 },
      ],
      tags: ["数据类型：矢量面", "业务主题：永久基本农田", "任务场景：红线校验", "约束属性：强约束", "来源层级：省级权威", "调用对象：空间叠加模型"],
    },
  };
  const serviceProfile = serviceResource?.domain === "data" ? dataProfiles[serviceResource.id] || defaultDataProfile : defaultDataProfile;
  const radarPoints = serviceProfile.quality
    .map((item, index) => {
      const angle = -Math.PI / 2 + index * (Math.PI / 2);
      const radius = (item.score / 100) * 68;
      return `${80 + Math.cos(angle) * radius},${80 + Math.sin(angle) * radius}`;
    })
    .join(" ");
  const governanceCards = [
    ["质量待复核", "18", "属性缺失 7 / 时相异常 5 / 服务超时 6"],
    ["语义已标注", "3,928", "覆盖数据、模型、知识和大模型 API"],
    ["标准符合率", "92%", "输入输出标准、字段字典、空间基准"],
    ["治理任务", "24", "12 个自动处理中，8 个待人工确认"],
  ];
  const governanceTasks = [
    ["近期遥感影像库", "时相完整性校验", "自动治理中", "时间维度"],
    ["耕地图斑库", "字段语义归并", "待人工确认", "属性维度"],
    ["永久基本农田库", "空间拓扑检查", "已完成", "空间维度"],
    ["耕地保护政策法规库", "规则条款结构化", "待复核", "知识维度"],
  ];
  const sharingCards = userRole === "province"
    ? [
        ["业务群组", "6", "按耕地保护、规划审查、用地审批等业务建立"],
        ["待审批资源", "11", "模型 4 / 智能体 3 / 多智能体系统 2 / 数据知识 2"],
        ["省级资源包", "28", "多来源数据、知识、模型和智能体已标准化"],
        ["可下发资源", "42", "面向群组内市级单位按权限下拉使用"],
      ]
    : [
        ["参与群组", "3", "耕地保护协同组、用地审批试点组、规划审查组"],
        ["本市上传", "9", "模型 2 / 智能体 3 / 数据 2 / 知识库 2"],
        ["审核中", "4", "2 个待省级审批，2 个正在标准化治理"],
        ["可下拉资源", "18", "省级治理后授权给本市使用的资源"],
      ];
  const collaborationGroups = [
    {
      name: "耕地保护协同组",
      scene: "耕地保护 / 用地监测",
      provinceMembers: ["省耕保处", "省信息中心", "省调查监测院"],
      cityMembers: ["南京市自然资源局", "苏州市自然资源局", "盐城市自然资源局"],
      status: "运行中",
    },
    {
      name: "用地审批试点组",
      scene: "要素保障 / 用地审批",
      provinceMembers: ["省用途管制处", "省信息中心"],
      cityMembers: ["无锡市自然资源局", "常州市自然资源局"],
      status: "试点中",
    },
    {
      name: "规划审查协同组",
      scene: "国土空间规划审查",
      provinceMembers: ["省规划处", "省规划院"],
      cityMembers: ["南京市自然资源局", "南通市自然资源局"],
      status: "配置中",
    },
  ];
  const provinceReviewQueue = [
    ["南京市变化识别模型", "南京市自然资源局", "耕地保护协同组", "待审批", "待核验模型接口、输入输出标准和适用场景"],
    ["建设占用耕地研判智能体", "苏州市自然资源局", "耕地保护协同组", "编辑中", "正在补充提示词、资源依赖和版本说明"],
    ["违法用地协同研判系统", "盐城市自然资源局", "耕地保护协同组", "待审批", "待确认多智能体编排模板和调用范围"],
    ["地方设施农业判别规则库", "南京市自然资源局", "耕地保护协同组", "已完成", "已完成语义治理并纳入省级知识资源包"],
    ["规划审查辅助智能体", "南通市自然资源局", "规划审查协同组", "编辑中", "正在统一输入输出字段和审查规则引用方式"],
    ["审批材料识别模型", "无锡市自然资源局", "用地审批试点组", "已完成", "已封装为标准模型服务并授权试点群组下拉"],
    ["城郊耕地图斑样本库", "南京市自然资源局", "耕地保护协同组", "待审批", "待抽查数据服务、字段完整性和空间范围"],
  ];
  const cityUploadQueue = [
    ["南京市变化识别模型", "模型资源", "耕地保护协同组", "已提交省级审批", "补充模型说明"],
    ["设施农业判别规则库", "知识库", "耕地保护协同组", "省级编辑中", "查看治理进度"],
    ["城郊耕地图斑样本库", "数据库", "耕地保护协同组", "已并入省级资源包", "查看资源包"],
  ];
  const sharedPackages = [
    ["省级耕地保护数据资源包", "数据库", "省级统建 / 市县按标准上传", "已发布", "南京、苏州、盐城"],
    ["耕地保护政策与地方规则包", "知识库", "省级审核编辑 / 多来源融合", "已发布", "协同组成员"],
    ["变化识别模型标准服务", "模型资源", "南京上传 / 省级治理", "可下拉", "全省试点市"],
    ["用地监测多智能体模板", "多智能体系统", "市县经验回流 / 省级封装", "可复用", "耕地保护协同组"],
  ];

  if (resourceView === "upload") {
    const testSteps = [
      ["接口可访问", "服务地址响应正常，平均延迟 126ms"],
      ["鉴权通过", "Token 校验通过，具备资源读取权限"],
      ["返回结构识别", "已识别 JSON 响应、空间字段和状态码"],
      ["样例调用完成", "样例参数返回 24 条记录，可进入资源目录"],
    ];

    return (
      <div className="resource-upload-page">
        <section className="resource-upload-hero">
          <div>
            <span>资源接入</span>
            <h2>登记外部资源服务</h2>
            <p>平台不直接保存原始数据或模型文件，只登记可调用服务、字段说明、元数据和测试结果，供智能体按权限调用。</p>
          </div>
          <button className="secondary-button" onClick={() => setResourceView("manager")} type="button">
            返回资源中心
          </button>
        </section>

        <section className="resource-upload-layout">
          <div className="resource-upload-main">
            <article className="resource-upload-card">
              <div className="resource-upload-title">
                <strong>基础信息</strong>
                <span>定义资源如何进入资源目录。</span>
              </div>
              <div className="resource-form-grid">
                <label>
                  资源名称
                  <input defaultValue="近期遥感影像服务" />
                </label>
                <label>
                  资源类型
                  <select defaultValue="数据资源">
                    <option>数据资源</option>
                    <option>模型资源</option>
                    <option>大模型资源</option>
                    <option>知识资源</option>
                  </select>
                </label>
                <label>
                  数据形态
                  <select defaultValue="栅格">
                    <option>栅格</option>
                    <option>矢量</option>
                    <option>表格</option>
                    <option>文本</option>
                    <option>PDF</option>
                    <option>其他类型</option>
                  </select>
                </label>
                <label>
                  来源标签
                  <select defaultValue="省级">
                    <option>省级</option>
                    <option>市级</option>
                    <option>县级</option>
                    <option>外部接入</option>
                    <option>模拟数据</option>
                  </select>
                </label>
              </div>
            </article>

            <article className="resource-upload-card">
              <div className="resource-upload-title">
                <strong>服务接口</strong>
                <span>填写系统访问该资源所需的服务地址、调用方式和鉴权信息。</span>
              </div>
              <div className="resource-form-grid service-form-grid">
                <label>
                  服务地址
                  <input defaultValue="https://service.example.gov.cn/ngis/image/recent" />
                </label>
                <label>
                  调用方式
                  <select defaultValue="REST API">
                    <option>REST API</option>
                    <option>OGC WMS</option>
                    <option>OGC WFS</option>
                    <option>OGC WCS</option>
                    <option>WPS</option>
                  </select>
                </label>
                <label>
                  请求方法
                  <select defaultValue="POST">
                    <option>GET</option>
                    <option>POST</option>
                  </select>
                </label>
                <label>
                  鉴权方式
                  <select defaultValue="Bearer Token">
                    <option>Bearer Token</option>
                    <option>API Key</option>
                    <option>政务网关认证</option>
                    <option>无需鉴权</option>
                  </select>
                </label>
                <label className="full-row">
                  请求头 / 鉴权信息
                  <textarea defaultValue={"Authorization: Bearer ********\nX-Org-Code: 省级资源中心"} />
                </label>
                <label className="full-row">
                  样例请求参数
                  <textarea defaultValue={'{"bbox":"116.20,39.72,116.58,40.06","timeRange":"last_30_days","cloudCoverMax":20}'} />
                </label>
              </div>
            </article>

            <article className="resource-upload-card">
              <div className="resource-upload-title">
                <div>
                  <strong>字段与元数据</strong>
                  <span>系统推荐字段会默认保留，用户可以继续添加资源服务返回的扩展字段。</span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() =>
                    setUploadFields((current) => [
                      ...current,
                      {
                        id: "custom_" + (current.length + 1),
                        name: "custom_field_" + (current.length + 1),
                        type: "文本",
                        desc: "自定义字段说明",
                        required: "选填",
                        system: false,
                      },
                    ])
                  }
                  type="button"
                >
                  添加字段
                </button>
              </div>
              <div className="resource-field-editor">
                <div className="resource-field-header">
                  <span>字段名</span>
                  <span>类型</span>
                  <span>字段说明</span>
                  <span>规则</span>
                  <span>来源</span>
                </div>
                {uploadFields.map((field) => (
                  <div key={field.id}>
                    <input defaultValue={field.name} />
                    <select defaultValue={field.type}>
                      <option>文本</option>
                      <option>数值</option>
                      <option>时间</option>
                      <option>空间范围</option>
                      <option>JSON</option>
                    </select>
                    <input defaultValue={field.desc} />
                    <select defaultValue={field.required}>
                      <option>必填</option>
                      <option>选填</option>
                    </select>
                    <span className={field.system ? "system-field-tag" : "custom-field-tag"}>
                      {field.system ? "系统定义" : "用户添加"}
                    </span>
                  </div>
                ))}
              </div>
              <div className="resource-metadata-editor">
                <label>
                  空间范围
                  <input defaultValue="全省" />
                </label>
                <label>
                  坐标系
                  <input defaultValue="CGCS2000" />
                </label>
                <label>
                  更新频率
                  <input defaultValue="每日" />
                </label>
                <label>
                  业务场景
                  <input defaultValue="耕地保护 / 用地监测" />
                </label>
                <label className="full-row">
                  语义描述
                  <textarea defaultValue="该资源用于近期遥感影像调用，支持疑似变化发现、图斑核查和智能体研判。" />
                </label>
              </div>
            </article>
          </div>

          <aside className="resource-test-panel">
            <div className="resource-upload-title">
              <strong>联通测试</strong>
              <span>提交资源前，验证平台能否稳定调用该服务。</span>
            </div>
            <div className={"connectivity-status status-" + connectivityState}>
              <b>{connectivityState === "passed" ? "测试通过" : connectivityState === "testing" ? "测试中" : "未测试"}</b>
              <span>
                {connectivityState === "passed"
                  ? "接口、鉴权、返回结构和样例调用均已通过。"
                  : connectivityState === "testing"
                    ? "正在检查服务地址、鉴权和样例响应。"
                    : "填写接口信息后可进行联通测试。"}
              </span>
            </div>
            <div className="connectivity-step-list">
              {testSteps.map(([title, desc]) => (
                <div className={connectivityState === "passed" ? "passed" : ""} key={title}>
                  <span>{connectivityState === "passed" ? "通过" : "待测"}</span>
                  <b>{title}</b>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
            <div className="resource-upload-actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setConnectivityState("testing");
                  window.setTimeout(() => setConnectivityState("passed"), 600);
                }}
                type="button"
              >
                开始联通测试
              </button>
              <button className="primary-button" onClick={() => setResourceView("manager")} type="button">
                登记资源
              </button>
            </div>
          </aside>
        </section>
      </div>
    );
  }

  if (resourceSubView === "governance") {
    return (
      <div className="resource-workbench-page">
        <section className="resource-workbench-hero compact">
          <div>
            <span>资源治理</span>
            <h2>质量、语义、标准和异常统一治理</h2>
            <p>围绕智能体可调用要求，对资源进行质量评价、语义标注、字段标准化、空间一致性检查和治理任务闭环。</p>
          </div>
          <div className="resource-workbench-actions">
            <button className="secondary-button">新建治理规则</button>
            <button className="primary-button">启动批量治理</button>
          </div>
        </section>
        <section className="resource-summary-grid">
          {governanceCards.map(([label, value, hint]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </article>
          ))}
        </section>
        <section className="resource-governance-layout">
          <article className="resource-governance-card wide">
            <div className="resource-panel-title">
              <strong>治理任务队列</strong>
              <span>按质量、语义、标准、空间维度闭环处理</span>
            </div>
            <div className="governance-task-list">
              {governanceTasks.map(([name, task, status, dimension]) => (
                <div key={name + task}>
                  <b>{name}</b>
                  <span>{task}</span>
                  <em>{dimension}</em>
                  <strong>{status}</strong>
                </div>
              ))}
            </div>
          </article>
          <article className="resource-governance-card">
            <div className="resource-panel-title">
              <strong>质量分维度评分</strong>
              <span>属性、空间、时间、业务规则</span>
            </div>
            <div className="governance-score-stack">
              {["属性 94", "空间 96", "时间 91", "业务规则 89"].map((item) => {
                const [label, score] = item.split(" ");
                return (
                  <div key={label}>
                    <span>{label}</span>
                    <b style={{ width: score + "%" }} />
                    <em>{score}</em>
                  </div>
                );
              })}
            </div>
          </article>
          <article className="resource-governance-card">
            <div className="resource-panel-title">
              <strong>语义治理标签</strong>
              <span>用于智能体资源理解和自动检索</span>
            </div>
            <div className="semantic-tag-list">
              {["业务主题：耕地保护", "数据形态：空间数据", "来源层级：省市县协同", "调用对象：智能体", "治理状态：已标注", "标准状态：待复核"].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        </section>
      </div>
    );
  }

  if (resourceSubView === "sharing") {
    const isProvinceUser = userRole === "province";
    const displayedProvinceReviewQueue = provinceReviewQueue.map((item) => {
      const [name, source, group, status, note] = item;
      return [name, source, group, provinceReviewStatusOverrides[name] || status, note];
    });
    const filteredProvinceReviewQueue = displayedProvinceReviewQueue.filter(([name, source, group, status]) => {
      const keywordMatched = [name, source, group, status].some((item) => item.includes(sharingKeyword));
      const statusMatched = sharingStatusFilter === "全部状态" || status === sharingStatusFilter;
      return keywordMatched && statusMatched;
    });
    const selectedProvinceResource =
      displayedProvinceReviewQueue.find(([name]) => name === selectedProvinceResourceName) || displayedProvinceReviewQueue[0];
    const [selectedName, selectedSource, selectedGroup, selectedStatus, selectedNote] = selectedProvinceResource;
    const selectedResourceKind = selectedName.includes("图斑样本")
      ? "data"
      : selectedName.includes("规则库")
        ? "knowledge"
        : selectedName.includes("智能体")
          ? "agent"
          : selectedName.includes("系统")
            ? "multiAgent"
            : "model";
    const statusClassMap: Record<string, string> = {
      待审批: "pending",
      编辑中: "editing",
      已完成: "done",
    };
    return (
      <div className="resource-workbench-page">
        <section className="resource-workbench-hero compact">
          <div>
            <span>{isProvinceUser ? "省级资源共享" : "市级资源共享"}</span>
            <h2>{isProvinceUser ? "业务群组、资源审批与省级资源包治理" : "群组内资源上传、审核进度与授权资源下拉"}</h2>
            <p>
              {isProvinceUser
                ? "按业务建立省市协同群组，限定资源上传和下发范围，对市级上传的模型、智能体、系统、知识库和数据库进行审批与标准化治理。"
                : "市级单位只能在所属业务群组内上传资源、查看审批治理进度，并下拉省级治理后授权给本群组的资源。"}
            </p>
          </div>
          <div className="resource-workbench-actions">
            <button className="secondary-button">{isProvinceUser ? "新建业务群组" : "查看所属群组"}</button>
            <button className="primary-button">{isProvinceUser ? "处理审批请求" : "上传群组资源"}</button>
          </div>
        </section>
        {isProvinceUser ? (
          <>
          <section className="province-sharing-layout">
            <article className="resource-governance-card province-review-card">
              <div className="resource-panel-title">
                <strong>审批与治理队列</strong>
                <button className="secondary-button" type="button">新建收集任务</button>
              </div>
              <div className="sharing-queue-toolbar">
                <input
                  placeholder="搜索资源名称、上传单位或群组"
                  value={sharingKeyword}
                  onChange={(event) => setSharingKeyword(event.target.value)}
                />
                <select value={sharingStatusFilter} onChange={(event) => setSharingStatusFilter(event.target.value)}>
                  <option>全部状态</option>
                  <option>待审批</option>
                  <option>编辑中</option>
                  <option>已完成</option>
                </select>
              </div>
              <div className="province-review-table">
                <div className="header">
                  <span>资源名称</span>
                  <span>上传单位</span>
                  <span>所属群组</span>
                  <span>治理说明</span>
                  <span>状态</span>
                </div>
                {filteredProvinceReviewQueue.map(([name, source, group, status, note]) => (
                  <button
                    className={selectedProvinceResourceName === name ? "province-review-row active" : "province-review-row"}
                    key={name + source}
                    onClick={() => {
                      setSelectedProvinceResourceName(name);
                      setProvinceResourceTestState("idle");
                      setProvinceResourceModalOpen(true);
                    }}
                    type="button"
                  >
                    <b>{name}</b>
                    <span>{source}</span>
                    <span>{group}</span>
                    <em>{note}</em>
                    <strong className={"status-" + statusClassMap[status]}>{status}</strong>
                  </button>
                ))}
              </div>
            </article>
            <aside className="resource-governance-card province-group-panel">
              <div className="resource-panel-title">
                <strong>业务协同群组</strong>
                <span>群组限制资源上传和下发范围</span>
              </div>
              <div className="province-group-list">
                {collaborationGroups.map((group) => (
                  <button key={group.name} type="button">
                    <header>
                      <b>{group.name}</b>
                      <strong>{group.status}</strong>
                    </header>
                    <p>{group.scene}</p>
                    <span>省级：{group.provinceMembers.length} 个单位</span>
                    <span>市级：{group.cityMembers.join("、")}</span>
                  </button>
                ))}
              </div>
            </aside>
          </section>
          {provinceResourceModalOpen ? (
            <div className="resource-service-overlay province-modal-overlay">
              <section className="resource-service-drawer province-resource-modal" role="dialog" aria-label="省级资源审核详情">
                <header className="resource-service-header">
                  <div>
                    <span>资源审核详情</span>
                    <h2>{selectedName}</h2>
                    <p>{selectedSource} · {selectedGroup} · {selectedStatus}</p>
                  </div>
                  <button className="secondary-button" onClick={() => setProvinceResourceModalOpen(false)} type="button">
                    关闭
                  </button>
                </header>

                <div className="province-resource-modal-grid" key={selectedName}>
                  <article className="resource-upload-card">
                    <div className="resource-upload-title">
                      <strong>基础信息</strong>
                      <span>定义资源如何进入群组共享目录。</span>
                    </div>
                    <div className="resource-form-grid service-form-grid">
                      <label>资源名称<input value={selectedName} readOnly /></label>
                      <label>资源类型<select defaultValue={selectedResourceKind === "data" ? "数据资源" : selectedResourceKind === "knowledge" ? "知识资源" : selectedResourceKind === "model" ? "模型资源" : "智能体资源"}><option>数据资源</option><option>模型资源</option><option>智能体资源</option><option>多智能体系统</option><option>知识资源</option></select></label>
                      <label>数据形态<select defaultValue={selectedResourceKind === "data" ? "矢量" : selectedResourceKind === "knowledge" ? "文本" : "JSON"}><option>栅格</option><option>矢量</option><option>表格</option><option>文本</option><option>JSON</option><option>PDF</option><option>其他类型</option></select></label>
                      <label>来源标签<input value={selectedSource} readOnly /></label>
                      <label>所属群组<input value={selectedGroup} readOnly /></label>
                      <label>当前状态<input value={selectedStatus} readOnly /></label>
                      <label>版本号<input defaultValue="v1.0.0" /></label>
                      <label>适用场景<input defaultValue="耕地保护 / 用地监测" /></label>
                      <label className="full-row">语义描述<textarea defaultValue={selectedNote} /></label>
                    </div>
                  </article>

                  <article className="resource-upload-card">
                    <div className="resource-upload-title">
                      <strong>服务接口</strong>
                      <span>填写系统访问该资源所需的服务地址、调用方式和鉴权信息。</span>
                    </div>
                    <div className="resource-form-grid service-form-grid">
                      <label>服务地址<input defaultValue={selectedResourceKind === "model" ? "https://nanjing.example.gov.cn/model/change-detect" : "https://nanjing.example.gov.cn/resource/service"} /></label>
                      <label>调用方式<select defaultValue={selectedResourceKind === "model" ? "模型服务" : "REST API"}><option>REST API</option><option>模型服务</option><option>OGC WMS</option><option>OGC WFS</option><option>知识库索引</option></select></label>
                      <label>请求方法<select defaultValue="POST"><option>GET</option><option>POST</option></select></label>
                      <label>鉴权方式<select defaultValue="Bearer Token"><option>Bearer Token</option><option>API Key</option><option>政务网关认证</option><option>无需鉴权</option></select></label>
                      <label className="full-row">请求头 / 鉴权信息<textarea defaultValue={"Authorization: Bearer ********\nX-Org-Code: " + selectedSource} /></label>
                      <label className="full-row">样例请求参数<textarea defaultValue={selectedResourceKind === "data" ? '{"bbox":"118.62,31.82,119.04,32.13","fields":["patch_id","land_type","area"],"limit":20}' : '{"task_id":"TEST-2026-0718","image_url":"https://sample.example/rs.tif","bbox":"118.62,31.82,119.04,32.13"}'} /></label>
                    </div>
                  </article>

                  <article className="resource-upload-card">
                    <div className="resource-upload-title">
                      <strong>字段与元数据</strong>
                      <span>系统定义字段和市级补充字段均可在省级审核阶段编辑。</span>
                    </div>
                    <div className="resource-field-editor compact-field-editor">
                      <div className="resource-field-header">
                        <span>字段名</span>
                        <span>类型</span>
                        <span>字段说明</span>
                        <span>规则</span>
                        <span>来源</span>
                      </div>
                      {[
                        ["resource_id", "文本", "资源唯一编号", "必填", "系统定义"],
                        ["service_url", "文本", "服务访问地址", "必填", "系统定义"],
                        ["input_schema", "JSON", "输入数据标准", "必填", "系统定义"],
                        ["output_schema", "JSON", "输出数据标准", "必填", "系统定义"],
                        ["bbox", "空间范围", "服务覆盖范围", "选填", "用户添加"],
                      ].map(([name, type, desc, required, source]) => (
                        <div key={name}>
                          <input defaultValue={name} />
                          <select defaultValue={type}><option>文本</option><option>数值</option><option>时间</option><option>空间范围</option><option>JSON</option></select>
                          <input defaultValue={desc} />
                          <select defaultValue={required}><option>必填</option><option>选填</option></select>
                          <span className={source === "系统定义" ? "system-field-tag" : "custom-field-tag"}>{source}</span>
                        </div>
                      ))}
                    </div>
                    <div className="resource-metadata-editor">
                      <label>空间范围<input defaultValue="南京市重点监测区" /></label>
                      <label>坐标系<input defaultValue="CGCS2000" /></label>
                      <label>更新频率<input defaultValue={selectedResourceKind === "data" ? "每日" : "版本更新"} /></label>
                      <label>业务场景<input defaultValue="耕地保护 / 用地监测" /></label>
                    </div>
                  </article>

                  <aside className="resource-test-panel province-modal-test">
                    <div className="resource-upload-title">
                      <strong>联通测试与审批</strong>
                      <span>{selectedResourceKind === "data" ? "调取数据服务并查看返回数据详情。" : "使用市级用户上传的测试请求数据返回结果。"}</span>
                    </div>
                    <div className={"connectivity-status status-" + provinceResourceTestState}>
                      <b>{provinceResourceTestState === "passed" ? "测试通过" : provinceResourceTestState === "testing" ? "测试中" : "未测试"}</b>
                      <span>{provinceResourceTestState === "passed" ? "接口、鉴权、返回结构和样例调用均已通过。" : "审批前建议完成一次资源调用验证。"}</span>
                    </div>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setProvinceResourceTestState("testing");
                        window.setTimeout(() => setProvinceResourceTestState("passed"), 600);
                      }}
                      type="button"
                    >
                      开始测试
                    </button>
                    <div className="province-test-result">
                      {selectedResourceKind === "data" ? (
                        <>
                          <b>数据详情</b>
                          <span>返回记录：20 条 · 空间范围匹配 · 字段完整率 96%</span>
                          <em>patch_id / land_type / area / county_code / geometry</em>
                        </>
                      ) : (
                        <>
                          <b>测试返回结果</b>
                          <span>状态码 200 · 平均耗时 3.8s · 输出格式匹配</span>
                          <em>{selectedResourceKind === "model" ? "mask_url / confidence / model_version" : "result_json / evidence_text / trace_id"}</em>
                        </>
                      )}
                    </div>
                    <label className="province-modal-feedback">
                      审批反馈
                      <textarea value={provinceReviewFeedback} onChange={(event) => setProvinceReviewFeedback(event.target.value)} />
                    </label>
                    <div className="province-modal-actions">
                      <button
                        className="secondary-button reject-button"
                        onClick={() => {
                          if (!window.confirm("确认审批不通过并将反馈意见退回给市级用户吗？")) return;
                          setProvinceReviewStatusOverrides((current) => ({ ...current, [selectedName]: "编辑中" }));
                          setProvinceResourceModalOpen(false);
                        }}
                        type="button"
                      >
                        审批不通过
                      </button>
                      <button
                        className="primary-button"
                        onClick={() => {
                          if (!window.confirm("确认审批通过并在本平台公开该资源吗？")) return;
                          setProvinceReviewStatusOverrides((current) => ({ ...current, [selectedName]: "已完成" }));
                          setProvinceResourceModalOpen(false);
                        }}
                        type="button"
                      >
                        审批通过并公开
                      </button>
                    </div>
                  </aside>
                </div>
              </section>
            </div>
          ) : null}
          </>
        ) : (
          <>
            <section className="resource-summary-grid">
              {sharingCards.map(([label, value, hint]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>{hint}</small>
                </article>
              ))}
            </section>
            <section className="resource-sharing-layout role-aware">
              <article className="resource-governance-card wide">
                <div className="resource-panel-title">
                  <strong>业务协同群组</strong>
                  <span>资源上传、审批、下发均限定在群组成员范围内</span>
                </div>
                <div className="sharing-group-list">
                  {collaborationGroups.map((group) => (
                    <div key={group.name}>
                      <header>
                        <b>{group.name}</b>
                        <strong>{group.status}</strong>
                      </header>
                      <p>{group.scene}</p>
                      <section>
                        <span>省级成员</span>
                        <em>{group.provinceMembers.join("、")}</em>
                      </section>
                      <section>
                        <span>市级成员</span>
                        <em>{group.cityMembers.join("、")}</em>
                      </section>
                    </div>
                  ))}
                </div>
              </article>
              <article className="resource-governance-card">
                <div className="resource-panel-title">
                  <strong>市级工作台</strong>
                  <span>上传、补充信息和查看进度</span>
                </div>
                <div className="sharing-action-stack">
                  {[
                    ["群组内上传", "选择所属业务群组，提交模型、智能体、系统或数据知识资源"],
                    ["按约定补充信息", "填写输入输出、服务接口、版本、元数据和适用场景"],
                    ["查看省级治理进度", "跟踪审批、标准化治理和退回补正意见"],
                    ["下拉授权资源", "获取省级治理后的模型、智能体、资源包和多智能体模板"],
                  ].map(([title, desc]) => (
                    <div key={title}>
                      <b>{title}</b>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
              </article>
              <article className="resource-governance-card wide">
                <div className="resource-panel-title">
                  <strong>本市上传与审核进度</strong>
                  <span>仅展示本单位在所属群组内提交的资源</span>
                </div>
                <div className="sharing-flow-list">
                  {cityUploadQueue.map(([name, type, sourceOrGroup, groupOrStatus, statusOrAction]) => (
                    <div key={name + type}>
                      <span>{type}</span>
                      <b>{name}</b>
                      <em>{sourceOrGroup} → {groupOrStatus}</em>
                      <strong>{statusOrAction}</strong>
                    </div>
                  ))}
                </div>
              </article>
              <article className="resource-governance-card">
                <div className="resource-panel-title">
                  <strong>可下拉资源</strong>
                  <span>标准化治理后可在授权范围内复用</span>
                </div>
                <div className="sharing-package-list">
                  {sharedPackages.map(([name, type, source, status, scope]) => (
                    <div key={name}>
                      <b>{name}</b>
                      <span>{type}</span>
                      <p>{source}</p>
                      <em>{scope}</em>
                      <strong>{status}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="resource-workbench-page">
      <section className="resource-workbench-hero">
        <div>
          <span>资源管理工作台</span>
          <h2>数据、模型、大模型、知识资源统一管理</h2>
          <p>面向智能体调用过程，管理资源目录、元数据、服务状态、API 接入、来源标签和可解释调用关系。</p>
        </div>
        <div className="resource-workbench-actions">
          <button className="secondary-button">新建目录</button>
          <button className="primary-button" onClick={() => setResourceView("upload")} type="button">
            上传资源
          </button>
        </div>
      </section>

      <section className="resource-summary-grid">
        {resourceSummary.map(([label, value, hint]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{hint}</small>
          </article>
        ))}
      </section>

      <section className="resource-manager-layout">
        <aside className="resource-domain-panel">
          <div className="resource-panel-title">
            <strong>资源域</strong>
            <span>目录与来源</span>
          </div>
          {resourceDomains.map((domain) => (
            <button
              className={activeDomain === domain.id ? "active" : ""}
              key={domain.id}
              onClick={() => {
                setActiveDomain(domain.id);
                const first = managedResources.find((item) => item.domain === domain.id);
                if (first) setSelectedResourceId(first.id);
              }}
              type="button"
            >
              <span>
                <b>{domain.name}</b>
                <small>{domain.count} 项资源</small>
              </span>
            </button>
          ))}
          <div className="resource-folder-tree">
            {resourceDomains
              .find((domain) => domain.id === activeDomain)
              ?.folders.map((folder) => (
                <span key={folder}>{folder}</span>
              ))}
          </div>
        </aside>

        <section className="resource-library-panel">
          <div className="resource-library-toolbar">
            <input placeholder="搜索资源名称、编号、来源或服务" />
            <select defaultValue="全部类型">
              <option>全部类型</option>
              <option>矢量</option>
              <option>栅格</option>
              <option>模型服务</option>
              <option>大模型API</option>
              <option>文本</option>
            </select>
            <select defaultValue="全部状态">
              <option>全部状态</option>
              <option>可用</option>
              <option>调试中</option>
              <option>待复核</option>
            </select>
            <div className="resource-view-toggle">
              <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} type="button">
                列表
              </button>
              <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} type="button">
                卡片
              </button>
            </div>
          </div>

          <div className={viewMode === "list" ? "resource-table-view" : "resource-grid-view"}>
            {viewMode === "list" ? (
              <>
                <div className="resource-table-row header">
                  <span>资源名称</span>
                  <span>类型</span>
                  <span>来源</span>
                  <span>状态</span>
                  <span>质量</span>
                  <span>更新时间</span>
                </div>
                {filteredResources.map((resource) => (
                  <button
                    className={selectedResource.id === resource.id ? "resource-table-row active" : "resource-table-row"}
                    key={resource.id}
                    onClick={() => setSelectedResourceId(resource.id)}
                    type="button"
                  >
                    <strong>{resource.name}</strong>
                    <span>{resource.type}</span>
                    <span>{resource.source}</span>
                    <em>{resource.status}</em>
                    <span>{resource.quality}%</span>
                    <span>{resource.updated}</span>
                  </button>
                ))}
              </>
            ) : (
              filteredResources.map((resource) => (
                <button
                  className={selectedResource.id === resource.id ? "resource-manage-card active" : "resource-manage-card"}
                  key={resource.id}
                  onClick={() => setSelectedResourceId(resource.id)}
                  type="button"
                >
                  <div className={"resource-preview-pattern type-" + resource.domain}>
                    <span>{resource.type}</span>
                  </div>
                  <strong>{resource.name}</strong>
                  <p>{resource.format}</p>
                  <div>
                    <em>{resource.status}</em>
                    <small>{resource.quality}%</small>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <aside className="resource-detail-panel">
          <div className="resource-detail-head">
            <div>
              <span>{selectedResource.type}</span>
              <h3>{selectedResource.name}</h3>
              <p>{selectedResource.service}</p>
            </div>
            <button className="secondary-button" onClick={() => setServiceResourceId(selectedResource.id)} type="button">
              查看服务
            </button>
          </div>
          <div className="resource-detail-section">
            <strong>基础信息</strong>
            <div className="resource-info-list">
              <span>来源</span><b>{selectedResource.source}</b>
              <span>权限</span><b>{selectedResource.access}</b>
              <span>格式</span><b>{selectedResource.format}</b>
              <span>调用次数</span><b>{selectedResource.callCount}</b>
            </div>
          </div>
          <div className="resource-detail-section">
            <strong>元数据</strong>
            <div className="resource-chip-list">
              {selectedResource.metadata.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div className="resource-detail-section">
            <strong>字段 / 输入输出</strong>
            <div className="resource-chip-list compact">
              {selectedResource.fields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          </div>
          <div className="resource-detail-section">
            <strong>可调用智能体</strong>
            <div className="resource-agent-links">
              {selectedResource.usedBy.map((agent) => (
                <span key={agent}>{agent}</span>
              ))}
            </div>
          </div>
        </aside>
      </section>
      {serviceResource ? (
        <div className="resource-service-overlay">
          <section className="resource-service-drawer" role="dialog" aria-label="资源服务详情">
            <header className="resource-service-header">
              <div>
                <span>{serviceResource.domain === "data" ? "数据资源服务" : "资源服务"}</span>
                <h2>{serviceResource.name}</h2>
                <p>{serviceResource.service} · {serviceResource.format}</p>
              </div>
              <button className="secondary-button" onClick={() => setServiceResourceId(null)} type="button">
                关闭
              </button>
            </header>

            {serviceResource.domain === "data" ? (
              <div className="data-service-grid">
                <article className="data-service-card service-visual-card">
                  <div className="service-section-title">
                    <strong>{serviceProfile.visualTitle}</strong>
                    <span>{serviceProfile.visualHint}</span>
                  </div>
                  <div className={"data-visual-preview visual-" + serviceResource.type}>
                    <span className="map-layer layer-a" />
                    <span className="map-layer layer-b" />
                    <span className="map-layer layer-c" />
                    <b>{serviceResource.type}</b>
                  </div>
                </article>

                <article className="data-service-card history-service-card">
                  <div className="service-section-title">
                    <strong>数据质量评价</strong>
                    <span>按属性、空间、时间和业务规则进行分维度评分。</span>
                  </div>
                  <div className="quality-radar-wrap">
                    <svg className="quality-radar" viewBox="0 0 160 160" aria-label="数据质量蛛网图">
                      <polygon points="80,12 148,80 80,148 12,80" className="radar-grid" />
                      <polygon points="80,35 125,80 80,125 35,80" className="radar-grid inner" />
                      <line x1="80" y1="12" x2="80" y2="148" />
                      <line x1="12" y1="80" x2="148" y2="80" />
                      <polygon points={radarPoints} className="radar-score" />
                    </svg>
                    <div className="quality-score-list">
                      {serviceProfile.quality.map((item) => (
                        <span key={item.label}>
                          <b>{item.label}</b>
                          <em>{item.score}</em>
                        </span>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="data-service-card">
                  <div className="service-section-title">
                    <strong>历史调用日志</strong>
                    <span>记录智能体、人工工作台和服务接口的访问情况。</span>
                  </div>
                  <div className="service-log-list">
                    {serviceProfile.logs.map(([time, caller, action, status]) => (
                      <div key={time + caller}>
                        <span>{time}</span>
                        <b>{caller}</b>
                        <em>{action}</em>
                        <strong>{status}</strong>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="data-service-card semantic-service-card">
                  <div className="service-section-title">
                    <strong>语义治理结果</strong>
                    <span>用于说明该数据在业务场景中的含义，并提供可被智能体识别的分类标签。</span>
                  </div>
                  <p className="semantic-description">{serviceProfile.semanticDescription}</p>
                  <div className="semantic-tag-list">
                    {serviceProfile.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </article>

                <article className="data-service-card metadata-service-card">
                  <div className="service-section-title">
                    <strong>元数据信息</strong>
                    <span>服务注册、空间范围、字段和更新信息。</span>
                  </div>
                  <div className="service-metadata-grid">
                    <span>来源</span><b>{serviceResource.source}</b>
                    <span>权限</span><b>{serviceResource.access}</b>
                    <span>服务</span><b>{serviceResource.service}</b>
                    <span>质量</span><b>{serviceResource.quality}%</b>
                    <span>更新时间</span><b>{serviceResource.updated}</b>
                    <span>调用次数</span><b>{serviceResource.callCount}</b>
                  </div>
                  <div className="resource-chip-list compact">
                    {serviceResource.metadata.concat(serviceResource.fields).map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </article>
              </div>
            ) : serviceResource.domain === "llm" ? (
              <div className="llm-service-grid">
                <article className="data-service-card llm-service-card">
                  <div className="service-section-title">
                    <strong>大模型 API 接入</strong>
                    <span>用于注册用户智能体可调用的大语言模型或多模态模型服务。</span>
                  </div>
                  <div className="service-metadata-grid">
                    <span>服务类型</span><b>{serviceResource.type}</b>
                    <span>调用协议</span><b>{serviceResource.format}</b>
                    <span>鉴权方式</span><b>{serviceResource.metadata.find((item) => item.includes("鉴权")) || "API Key"}</b>
                    <span>调用次数</span><b>{serviceResource.callCount}</b>
                    <span>更新时间</span><b>{serviceResource.updated}</b>
                    <span>状态</span><b>{serviceResource.status}</b>
                  </div>
                </article>
                <article className="data-service-card">
                  <div className="service-section-title">
                    <strong>能力与参数</strong>
                    <span>智能体创建时可选择该资源，并配置提示词、温度、最大输出和结构化返回。</span>
                  </div>
                  <div className="resource-chip-list compact">
                    {serviceResource.metadata.concat(serviceResource.fields).map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </article>
                <article className="data-service-card">
                  <div className="service-section-title">
                    <strong>可调用智能体</strong>
                    <span>这些智能体已绑定或可选择该大模型 API。</span>
                  </div>
                  <div className="resource-agent-links">
                    {serviceResource.usedBy.map((agent) => (
                      <span key={agent}>{agent}</span>
                    ))}
                  </div>
                </article>
              </div>
            ) : (
              <div className="resource-service-placeholder">
                <strong>该类型资源的服务详情将在后续补充</strong>
                <span>当前已优先完成数据资源服务查看，包括可视化、质量、日志、语义治理和元数据。</span>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
export default function Home() {
  const [module, setModule] = useState<ModuleKey>("workspace");
  const [resourceSubView, setResourceSubView] = useState<ResourceSubView>("management");
  const [userRole, setUserRole] = useState<UserRole>("province");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [agentNavigation, setAgentNavigation] = useState<AgentNavigationState>({
    mode: "list",
    returnToWorkspace: false,
  });
  const moduleTitle =
    module === "workspace" ? "业务工作台" : module === "resources" ? "资源中心" : "智能体中心";
  const currentUser = userRole === "province"
    ? { name: "张三", jobNo: "30892", label: "省级用户", org: "省级自然资源主管部门", scope: "统筹能力建设、下沉共享与回流审核", avatar: "张" }
    : { name: "李四", jobNo: "21706", label: "市级用户", org: "市级自然资源主管部门", scope: "接入地方资源、调用省级能力与反馈成效", avatar: "李" };
  const localAccounts = [
    { role: "province" as UserRole, name: "张三", jobNo: "30892", label: "省级用户", org: "省级自然资源主管部门", avatar: "张" },
    { role: "city" as UserRole, name: "李四", jobNo: "21706", label: "市级用户", org: "市级自然资源主管部门", avatar: "李" },
  ];
  const resourceSubViews: Array<{ id: ResourceSubView; label: string; shortLabel: string }> = [
    { id: "management", label: "资源管理", shortLabel: "管" },
    { id: "governance", label: "资源治理", shortLabel: "治" },
    { id: "sharing", label: "资源共享", shortLabel: "享" },
  ];
  const openAgentCreate = () => {
    setAgentNavigation({ mode: "create", returnToWorkspace: true });
    setModule("agents");
  };
  const openAgentEdit = (agent: FlowNodeData) => {
    setAgentNavigation({ mode: "edit", returnToWorkspace: true, editingAgent: agent });
    setModule("agents");
  };
  const backToWorkspace = () => {
    setAgentNavigation({ mode: "list", returnToWorkspace: false });
    setModule("workspace");
  };

  return (
    <main className={"app-shell " + (sidebarCollapsed ? "sidebar-collapsed" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <button
            aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            type="button"
          >
            {sidebarCollapsed ? ">" : "<"}
          </button>
          <div className="brand-mark">AI</div>
          <div>
            <strong>省域资源“一张图”</strong>
            <span>人工智能平台原型</span>
          </div>
        </div>
        <nav className="primary-nav">
          {[
            ["workspace", "业务工作台", "业"],
            ["resources", "资源中心", "资"],
            ["agents", "智能体中心", "智"],
          ].map(([key, label, shortLabel]) => (
            <div className="nav-group" key={key}>
              <button
                className={module === key ? "active" : ""}
                onClick={() => {
                  if (key === "agents") {
                    setAgentNavigation({ mode: "list", returnToWorkspace: false });
                  }
                  setModule(key as ModuleKey);
                }}
                title={label}
              >
                <span className="nav-short">{shortLabel}</span>
                <span className="nav-label">{label}</span>
              </button>
              {key === "resources" ? (
                <div className="sidebar-subnav">
                  {resourceSubViews.map((item) => (
                    <button
                      className={module === "resources" && resourceSubView === item.id ? "active" : ""}
                      key={item.id}
                      onClick={() => {
                        setResourceSubView(item.id);
                        setModule("resources");
                      }}
                      title={item.label}
                      type="button"
                    >
                      <span className="nav-short sub">{item.shortLabel}</span>
                      <span className="nav-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
      </aside>

      <section className="main-surface">
        <header className="topbar">
          <div>
            <span>多智能体协同 · 资源统一管理 · 结果可解释</span>
            <h1>{moduleTitle}</h1>
          </div>
          <div className="user-avatar-menu" aria-label="登录用户">
            <button
              className="user-avatar-trigger"
              onClick={() => setUserMenuOpen((current) => !current)}
              type="button"
            >
              <span className="user-avatar">{currentUser.avatar}</span>
              <span className="user-name-stack">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.jobNo}</small>
              </span>
            </button>
            {userMenuOpen ? (
              <div className="user-menu-popover">
                <div className="user-menu-head">
                  <span className="user-avatar large">{currentUser.avatar}</span>
                  <div>
                    <strong>{currentUser.name}</strong>
                    <small>工号 {currentUser.jobNo}</small>
                    <span>{currentUser.org}</span>
                    <em>{currentUser.scope}</em>
                  </div>
                </div>
                <div className="user-menu-section">
                  <button type="button">账号设置</button>
                  <button type="button">消息通知</button>
                  <button type="button">操作日志</button>
                </div>
                <div className="user-menu-section account-switch-section">
                  <span>切换账号</span>
                  {localAccounts.map((account) => (
                    <button
                      className={account.role === userRole ? "active" : ""}
                      key={account.role}
                      onClick={() => {
                        setUserRole(account.role);
                        setUserMenuOpen(false);
                      }}
                      type="button"
                    >
                      <i>{account.avatar}</i>
                      <strong>{account.name}<small>{account.jobNo}</small></strong>
                      <em>{account.label}</em>
                    </button>
                  ))}
                </div>
                <div className="user-menu-section">
                  <button className="danger" type="button">退出登录</button>
                </div>
              </div>
            ) : null}
          </div>
        </header>
        {module === "workspace" ? <Workspace onCreateAgent={openAgentCreate} onEditAgent={openAgentEdit} /> : null}
        {module === "resources" ? <ResourceCenter resourceSubView={resourceSubView} userRole={userRole} /> : null}
        {module === "agents" ? <AgentCenter navigation={agentNavigation} onBackToWorkspace={backToWorkspace} /> : null}
      </section>
    </main>
  );
}

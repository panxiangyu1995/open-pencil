# 右侧面板通路化改造方案

> 日期：2026-07-15
> 状态：待执行
> 模式：PLAN → EXECUTE

---

## 1. 目的与预期效果

### 目的

将 SignalForge 编辑器右侧面板从通用设计编辑器模式改造为 AI-First 信号通路图编辑模式，使 AI 对话成为主交互界面，属性检查作为辅助功能。

### 预期效果

| 场景 | 改造前 | 改造后 |
|------|--------|--------|
| 通路文档右侧面板 | 三 Tab（设计/代码/AI），AI 仅占 1/3 | ChatPanel 占满面板，AI 空间最大化 |
| 选中通路节点 | 显示通用设计属性（位置/填充/描边等） | 底部滑出可折叠通路属性检查器（glyphType/stateVariable 等） |
| 代码 Tab | 存在但通路场景无需求 | 删除 |
| 设计文档右侧面板 | 三 Tab（设计/代码/AI） | 双 Tab（设计/AI），代码 Tab 移除 |
| GlyphPalette | 孤儿组件，未接入任何面板 | 待后续集成（本次不处理，移到左侧面板或工具栏） |

---

## 2. 问题点

### 2.1 核心矛盾

现有 DesignPanel 是面向"通用设计编辑"的（Figma 式属性面板），但 BioPath 的核心交互模式是 **AI 对话生成 + 语义化属性检查**，而非手动设计调整：

- 通用设计：用户手动调整位置、颜色、描边 → 属性面板是主操作界面
- 通路图：用户通过 AI 对话生成 → 属性面板是**辅助检查/微调界面**，主操作在 AI Chat

### 2.2 通路节点属性缺失

当前 DesignPanel 对通路节点（PATHWAY_GLYPH/PROCESS/ARC/COMPARTMENT）只显示通用属性（位置/填充/描边等），缺少 SBGN 语义属性：

- GlyphType（实体类型）
- StateVariable（状态变量，如磷酸化位点 p-Y705）
- UnitOfInformation（信息单元）
- CompartmentRef（所属区室）
- CloneMarker（克隆标记）
- ArcType（弧线类型）
- ProcessType（过程类型）

### 2.3 代码 Tab 无通路价值

CodePanel 提供 JSX 代码生成和 HTML/CSS 导入功能，在信号通路图场景下完全无用。

### 2.4 GlyphPalette 未接入

`src/components/pathway/GlyphPalette.vue` 及其子组件（GlyphButton、ArcButton）已存在但未被任何面板引用，是孤儿组件。

---

## 3. 研究结果

### 3.1 右侧面板组件结构

```
EditorView.vue
└── SplitterPanel#properties
    ├── CollabPanel (协作头像/分享)
    └── PropertiesPanel.vue (右侧面板主容器)
        └── TabsRoot v-model="activeTab"
            ├── TabsList
            │   ├── TabsTrigger(value="design") → "设计"
            │   ├── TabsTrigger(value="code")   → "代码" + icon-lucide-code
            │   ├── TabsTrigger(value="ai")     → "AI" + icon-lucide-sparkles
            │   └── ZoomDropdown (v-if design tab)
            ├── TabsContent(value="design", force-mount) → DesignPanel
            ├── TabsContent(value="code", force-mount)   → CodePanel
            └── TabsContent(value="ai", force-mount)     → ChatPanel
```

### 3.2 Tab 状态管理

- **activeTab** 定义在 `src/app/ai/chat/use.ts:25`
- 类型：`ref<'design' | 'code' | 'ai'>`，默认值 `'design'`
- 通过 `useAIChat()` composable 导出
- 三个 TabsContent 均使用 `:force-mount="true"` + `:hidden` 控制显隐

### 3.3 DesignPanel 属性面板结构

| 选中状态 | 显示的 Section |
|----------|---------------|
| 多选 | PanelHeader + Position + Appearance + Fill + Stroke + Effects + Export |
| 单选 | PanelHeader + Position + Layout + Appearance + Mask + Typography(仅TEXT) + Fill + Stroke + Effects + Export |
| 无选中 | Page + Variables + Export |

**无任何通路专用 Section。**

### 3.4 通路节点类型系统

SceneGraph 中通路节点使用 **pluginData 方式**存储通路数据，而非专用 SceneNode 子类型：

```typescript
// NodeType 联合类型中注册了 4 种通路类型
type NodeType = ... | 'PATHWAY_GLYPH' | 'PATHWAY_PROCESS' | 'PATHWAY_ARC' | 'COMPARTMENT'

// 通路数据存储在 pluginData 中
interface PathwayNodeData {
  glyphType?: PathwayGlyphType
  processType?: PathwayProcessType
  arcType?: PathwayArcType
  stateVariables?: { variable: string; value?: string }[]
  unitOfInformation?: { text: string }[]
  compartmentRef?: string
  cloneMarker?: boolean
  sourceId?: string
  targetId?: string
  sourcePort?: { side: string; x: number; y: number }
  targetPort?: { side: string; x: number; y: number }
  bendPoints?: { x: number; y: number }[]
  portInfo?: { ports: { side: string; x: number; y: number }[] }
}
```

辅助函数：`getPathwayData(node)`、`setPathwayData(node, data)`、`updatePathwayData(node, partial)`

### 3.5 已有通路 UI 组件

| 组件 | 文件 | 状态 |
|------|------|------|
| GlyphPalette.vue | `src/components/pathway/GlyphPalette.vue` | 存在，未接入 |
| GlyphButton.vue | `src/components/pathway/GlyphButton.vue` | 存在，未接入 |
| ArcButton.vue | `src/components/pathway/ArcButton.vue` | 存在，未接入 |
| GlyphInspector.vue | — | 不存在 |
| ProcessInspector.vue | — | 不存在 |
| ArcInspector.vue | — | 不存在 |
| CompartmentInspector.vue | — | 不存在 |
| PathwayInspector.vue | — | 不存在 |

### 3.6 关键文件路径汇总

| 角色 | 文件路径 |
|------|----------|
| 右侧面板主容器 | `src/components/PropertiesPanel.vue` |
| 设计 Tab 内容 | `src/components/DesignPanel.vue` |
| 代码 Tab 内容 | `src/components/CodePanel.vue` |
| AI Tab 内容 | `src/components/ChatPanel.vue` |
| Tab 状态 (activeTab) | `src/app/ai/chat/use.ts` |
| 布局持久化 | `src/app/shell/layout-storage.ts` |
| 编辑器视图 | `src/views/EditorView.vue` |
| 通路数据类型/辅助 | `packages/scene-graph/src/pathway-data.ts` |
| SceneGraph 类型 | `packages/scene-graph/src/types.ts` |
| i18n 面板标签 (EN) | `packages/vue/src/i18n/messages/panels.ts` |
| i18n 面板标签 (zh-CN) | `packages/vue/src/i18n/locales/zh-cn/panels.json` |
| ZoomDropdown | `src/components/editor/ZoomDropdown.vue` |
| 选择状态 composable | `packages/vue/src/editor/selection-state/use.ts` |

---

## 4. 设计方案

### 4.1 方案选型

经过三个方案对比，最终选择 **方案 C（AI-First 单面板）+ 方案 B（双模式检测）** 的结合：

| 方案 | 描述 | 优点 | 缺点 | 选择 |
|------|------|------|------|------|
| A | 替换 Tab 语义："设计"→"通路"，删除"代码" | 改动最小 | 两种模式混在同一面板，条件渲染复杂 | 否 |
| B | 双模式面板：通路模式 ChatPanel+GlyphInspector 上下布局，设计模式保留 | 渐进式改造，互不干扰 | Chat 空间未最大化 | 部分采用（双模式检测） |
| C | AI-First 单面板：ChatPanel 占满，属性底部可折叠 | Chat 空间最大化，交互简洁 | 放弃手动属性编辑便利性 | 采用（核心思路） |

### 4.2 最终方案：AI-First 双模式面板

#### 设计模式（.fig 文档 / 无通路节点）

保留"设计"+"AI"双 Tab，删除"代码"Tab。行为与现有基本一致。

#### 通路模式（.bio-path 文档 / 存在通路节点）

右侧面板**无 Tab**，直接渲染：

```
┌──────────────────────────┐
│                          │
│   AI Chat (ChatPanel)    │  ← 占满整个面板，flex-1
│                          │
│   ┌────────────────────┐ │
│   │ ChatInput          │ │
│   └────────────────────┘ │
└──────────────────────────┘
```

选中通路节点时，**底部滑出可折叠属性面板**：

```
┌──────────────────────────┐
│                          │
│   AI Chat (ChatPanel)    │  ← flex-1，自动收缩
│                          │
│   ┌────────────────────┐ │
│   │ ChatInput          │ │
│   └────────────────────┘ │
├──────────────────────────┤  ← 分割线
│ ▼ Glyph: STAT3          │  ← 可折叠，默认展开
│   类型: macromolecule    │
│   State: p-Y705          │
│   Compartment: cytoplasm │
│   [位置] [尺寸]          │  ← 简化版通用属性
└──────────────────────────┘
```

#### 关键设计决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| Chat 空间 | 最大化，无 Tab | AI 对话是主交互，空间优先 |
| 属性面板 | 底部可折叠 | 选中时自动展开，不选中时完全隐藏，Chat 零干扰 |
| GlyphPalette | 移到左侧面板或工具栏 | 不占用右侧 Chat 空间（本次不处理） |
| 代码 Tab | 删除 | 通路场景无需求，设计模式也移除 |
| 设计 Tab | 设计模式保留，通路模式隐藏 | 渐进式，不破坏现有功能 |
| 文档模式检测 | 节点类型检测 | 比扩展名更灵活（.fig 文档也可包含通路内容） |
| 折叠面板默认状态 | 选中通路节点时自动展开，取消选中自动收起 | 零操作成本 |
| 折叠面板最大高度 | 约 40% | ChatPanel 最小 60%，保证 Chat 可用性 |

### 4.3 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/app/pathway/mode.ts` | 通路模式检测 composable |
| 新建 | `src/components/pathway/PathwayInspector.vue` | 通路属性检查器路由 |
| 新建 | `src/components/pathway/GlyphInspector.vue` | EPN 实体属性检查器 |
| 新建 | `src/components/pathway/ProcessInspector.vue` | Process 属性检查器 |
| 新建 | `src/components/pathway/ArcInspector.vue` | Arc 属性检查器 |
| 新建 | `src/components/pathway/CompartmentInspector.vue` | Compartment 属性检查器 |
| 修改 | `src/components/PropertiesPanel.vue` | 双模式面板实现 |
| 修改 | `src/app/ai/chat/use.ts` | activeTab 类型收窄 |
| 修改 | `packages/vue/src/i18n/messages/panels.ts` | 添加通路 i18n 键 |
| 修改 | `packages/vue/src/i18n/locales/zh-cn/panels.json` | 添加中文翻译 |
| 保留 | `src/components/CodePanel.vue` | 不删除文件，仅移除引用 |

### 4.4 各组件详细规范

#### `src/app/pathway/mode.ts`

```typescript
// 导出 usePathwayMode() composable
// 返回 { isPathwayMode: ComputedRef<boolean> }
//
// 检测逻辑：
//   - 遍历当前 editor graph 的所有节点
//   - 如果任一节点 type 为 PATHWAY_GLYPH | PATHWAY_PROCESS | PATHWAY_ARC | COMPARTMENT
//   - 则 isPathwayMode = true
//
// 使用 useSceneComputed 包裹，依赖 sceneVersion 触发重算
// 使用 useEditor() 获取当前 editor
//
// PATHWAY_NODE_TYPES 常量集合：new Set(['PATHWAY_GLYPH', 'PATHWAY_PROCESS', 'PATHWAY_ARC', 'COMPARTMENT'])
```

#### `src/components/PropertiesPanel.vue`

**设计模式**（isPathwayMode = false）：
- 渲染 TabsRoot，仅含 "design" 和 "ai" 两个 TabsTrigger
- 删除 "code" TabsTrigger 和 TabsContent
- ZoomDropdown 保留在 design tab 激活时显示
- activeTab 类型收窄为 `'design' | 'ai'`

**通路模式**（isPathwayMode = true）：
- 不渲染 TabsRoot，直接渲染 ChatPanel（flex-1 占满）
- 选中通路节点时，ChatPanel 下方渲染可折叠 PathwayInspector
- 折叠逻辑：选中 PATHWAY_GLYPH/PROCESS/ARC/COMPARTMENT 时自动展开，取消选中或选中非通路节点时自动收起
- 折叠面板使用 Collapsible 组件（reka-ui），带标题栏显示节点类型+名称
- 折叠面板最大高度约 40%，ChatPanel 最小高度 60%

**模板结构**：
```
<aside>
  <!-- 通路模式 -->
  <template v-if="isPathwayMode">
    <ChatPanel class="flex-1" />
    <Collapsible v-if="hasPathwaySelection" v-model:open="inspectorOpen">
      <CollapsibleTrigger> 节点类型 + 名称 </CollapsibleTrigger>
      <CollapsibleContent>
        <PathwayInspector />
      </CollapsibleContent>
    </Collapsible>
  </template>

  <!-- 设计模式 -->
  <template v-else>
    <TabsRoot v-model="activeTab">
      <TabsList>
        <TabsTrigger value="design">设计</TabsTrigger>
        <TabsTrigger value="ai">AI</TabsTrigger>
        <ZoomDropdown v-if="activeTab === 'design'" />
      </TabsList>
      <TabsContent value="design" force-mount :hidden="activeTab !== 'design'">
        <DesignPanel />
      </TabsContent>
      <TabsContent value="ai" force-mount :hidden="activeTab !== 'ai'">
        <ChatPanel />
      </TabsContent>
    </TabsRoot>
  </template>
</aside>
```

#### `src/components/pathway/PathwayInspector.vue`

- 使用 `useSelectionState()` 获取 `selectedNode`
- 使用 `getPathwayData(selectedNode)` 获取通路数据
- 根据 `selectedNode.type` 条件渲染：
  - `PATHWAY_GLYPH` → GlyphInspector
  - `PATHWAY_PROCESS` → ProcessInspector
  - `PATHWAY_ARC` → ArcInspector
  - `COMPARTMENT` → CompartmentInspector
- 传入 `node` 和 `pathwayData` 作为 props
- 监听子组件 emit 的变更，调用 `updatePathwayData` 写回

#### `src/components/pathway/GlyphInspector.vue`

**显示字段**：
- glyphType：只读展示（SBGN 类型不可更改，需删除重建）
- label：可编辑文本输入，绑定 `node.name`
- stateVariables：列表，每项 variable + value，支持添加/删除
- unitOfInformation：列表，每项 text，支持添加/删除
- compartmentRef：只读展示所属 compartment 名称
- cloneMarker：开关
- 位置/尺寸：简化版 — 仅 X、Y、Width、Height 四个数字输入

**交互**：
- 修改 label → `editor.renameNode(node.id, value)`
- 修改 stateVariables/unitOfInformation/cloneMarker → `updatePathwayData(node, partial)`
- 位置/尺寸修改 → `editor.setNodeProperty(node.id, key, value)`

#### `src/components/pathway/ProcessInspector.vue`

**显示字段**：
- processType：只读展示
- label：可编辑文本输入
- 位置：X、Y（process 尺寸固定 24x24，不可编辑）

#### `src/components/pathway/ArcInspector.vue`

**显示字段**：
- arcType：只读展示
- source：只读展示源节点名称
- target：只读展示目标节点名称
- bendPoints：暂不编辑（Phase 2）

#### `src/components/pathway/CompartmentInspector.vue`

**显示字段**：
- label：可编辑文本输入
- 位置/尺寸：X、Y、Width、Height

#### `src/app/ai/chat/use.ts`

- `activeTab` 类型从 `ref<'design' | 'code' | 'ai'>` 改为 `ref<'design' | 'ai'>`
- 默认值保持 `'design'`
- 通路模式下由 PropertiesPanel 逻辑控制，不依赖 activeTab

#### i18n 键新增

**panels.ts 新增键**：
```
pathway: 'Pathway'
glyphType: 'Glyph type'
processType: 'Process type'
arcType: 'Arc type'
stateVariable: 'State variable'
unitOfInformation: 'Unit of information'
compartment: 'Compartment'
cloneMarker: 'Clone marker'
variable: 'Variable'
value: 'Value'
addStateVariable: 'Add state variable'
addUnitOfInformation: 'Add unit of information'
removeStateVariable: 'Remove state variable'
removeUnitOfInformation: 'Remove unit of information'
source: 'Source'
target: 'Target'
inspector: 'Inspector'
```

**zh-cn/panels.json 对应中文**：
```
pathway: "通路"
glyphType: "实体类型"
processType: "过程类型"
arcType: "弧线类型"
stateVariable: "状态变量"
unitOfInformation: "信息单元"
compartment: "区室"
cloneMarker: "克隆标记"
variable: "变量"
value: "值"
addStateVariable: "添加状态变量"
addUnitOfInformation: "添加信息单元"
removeStateVariable: "移除状态变量"
removeUnitOfInformation: "移除信息单元"
source: "源"
target: "目标"
inspector: "检查器"
```

---

## 5. 备选方案

### 5.1 方案 A：替换 Tab 语义

将"设计"tab 重命名为"通路"，内部根据选中节点类型条件渲染通路专用检查器或通用设计属性。删除"代码"tab。

**优点**：改动最小，复用现有 Tab 基础设施
**缺点**：Tab 语义从"设计"变"通路"会让非通路场景困惑；两种模式混在同一面板增加条件渲染复杂度；Chat 空间仅占 1/3

### 5.2 方案 B：双模式面板（上下布局）

通路模式下右侧面板上下布局：ChatPanel 上半 + GlyphInspector 下半，无 Tab 切换。设计模式保留三 Tab。

**优点**：渐进式改造，互不干扰
**缺点**：Chat 空间未最大化，上下分割固定比例不够灵活

### 5.3 方案 C（采用）：AI-First 单面板 + 可折叠检查器

ChatPanel 占满面板，选中通路节点时底部滑出可折叠属性检查器。

**优点**：Chat 空间最大化；交互简洁；属性面板按需出现不干扰
**缺点**：手动属性编辑需额外一步展开操作

---

## 6. 实施清单

```java
实施清单：
1. 新建 src/app/pathway/mode.ts — 实现 usePathwayMode() composable，检测文档中是否存在通路节点
2. 修改 src/app/ai/chat/use.ts — activeTab 类型从 'design' | 'code' | 收窄，删除 'code' 选项
3. 新建 src/components/pathway/GlyphInspector.vue — EPN 实体属性检查器
4. 新建 src/components/pathway/ProcessInspector.vue — Process 属性检查器
5. 新建 src/components/pathway/ArcInspector.vue — Arc 属性检查器
6. 新建 src/components/pathway/CompartmentInspector.vue — Compartment 属性检查器
7. 新建 src/components/pathway/PathwayInspector.vue — 通路属性检查器路由组件
8. 修改 packages/vue/src/i18n/messages/panels.ts — 添加通路面板 i18n 键
9. 修改 packages/vue/src/i18n/locales/zh-cn/panels.json — 添加中文翻译
10. 修改 src/components/PropertiesPanel.vue — 实现双模式面板（通路模式 AI-First + 可折叠检查器，设计模式双 Tab）
11. 运行 bun run check 验证类型和 lint
```

---

## 7. 风险与注意事项

| 风险 | 影响 | 缓解 |
|------|------|------|
| 通路模式检测性能 | 每次场景变更遍历所有节点 | useSceneComputed 缓存，仅 sceneVersion 变化时重算；节点数通常 < 500 |
| CodePanel 引用残留 | 其他文件可能引用 CodePanel | 全局搜索确认无其他引用后再移除 |
| reka-ui Collapsible 组件可用性 | 需确认 reka-ui 版本支持 | 检查项目 reka-ui 版本，不支持则用原生 details/summary |
| i18n 键与现有键冲突 | 新增键可能与未来上游更新冲突 | 使用 pathway 前缀命名空间 |
| 通路模式下 ZoomDropdown 丢失 | 缩放控制无处访问 | 移到工具栏或画布右下角（本次暂不处理，通路模式暂不需要） |

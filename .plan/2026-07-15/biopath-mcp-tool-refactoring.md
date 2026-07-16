# BioPath MCP 工具改造方案

> 日期: 2026-07-15
> 状态: 已完成 ✅
> 前置文档: biopath-checklist.md, biopath-implementation.md, biopath-prd.md, biopath-refinement.md, biopath-visual-fidelity.md

---

## 一、目标与预期效果

### 目的

将 SignalForge 设计编辑器的 MCP/AI 工具体系从"通用 UI 设计编辑器"改造为"AI 原生 SBGN 信号通路编辑器"，使 AI agent（Chat、MCP、CLI）只能看到和使用与通路图相关的工具，消除设计专用工具对 AI 的干扰。

### 预期效果

1. **AI 工具精简**：从 91 个工具精简至 ~52 个，去除 57 个 design-specific 工具
2. **工具专业化**：新增 11 个 pathway 专用工具（validate、import/export SBGN-ML、arc 修改、clone marker、multimer、annotate、merge/split、active state、expression overlay）
3. **System Prompt 转型**：从 UI 设计指导（JSX、flex、skeleton→content 工作流）完全转为 SBGN 通路构建指导
4. **MCP 适配**：MCP server 只暴露 BioPath 工具，支持 .sbgn 文件打开和 pathway 文档模板
5. **零侵入**：现有 design 工具代码文件保留不动，`CORE_TOOLS` / `EXTENDED_TOOLS` / `ALL_TOOLS` 注册表保持不变，仅通过新建 BioPath 注册表实现分离

---

## 二、问题点

### 2.1 工具噪声

当前 MCP 暴露 91 个工具，其中 57 个（62%）是 UI 设计专用工具（stock_photo、search_icons、create_component、变量系统、布尔运算、typography 分析等）。这些工具对 AI agent 是噪声：

- AI 可能在通路图场景误用 `render` 创建 JSX 组件，而非用 `create_pathway`
- `stock_photo`、`search_icons` 等工具占据 tool list 空间，增加 AI 选择错误概率
- `analyze_colors`、`analyze_typography` 等分析工具对通路图无意义

### 2.2 关键工具缺失

- 无 SBGN 合规性验证工具 → AI 生成的不合规图无法自动检测
- SBGN-ML import/export 只在 IO adapter 层，无 ToolDef → AI agent 无法通过 chat/MCP 调用
- 无 arc 删除/修改工具 → 只能创建不能修改 arc
- 无 clone marker / multimer 设置工具 → 只能通过 `create_pathway` 的 spec 设置
- 无文献引用标注工具 → 无法为通路图添加 DOI/PMID 引用
- `sketch_to_pathway` 是 placeholder（返回 error），浪费 tool slot

### 2.3 System Prompt 错位

当前 `system-prompt.md` 共 676 行，其中 575 行是 UI 设计指导。AI 在通路场景下会：

- 优先使用 `render` JSX 而非 pathway 工具
- 尝试 skeleton→content 工作流而非 query→create→layout→validate
- 使用 `stock_photo` 而非 pathway semantic colors

### 2.4 MCP-only 工具不适配

- `get_codegen_prompt` 返回前端代码生成指南，BioPath 不需要
- `open_file` 不识别 .sbgn/.sbgnml 扩展名
- `new_document` 无 pathway 模板选项

---

## 三、研究结果

### 3.1 现有工具全量审计

共 91 个工具 + 4 个 MCP-only 工具 + 1 个 MCP-only 工具（get_codegen_prompt），分类如下：

| 分类 | 数量 | 说明 |
|------|------|------|
| pathway-essential | 31 | 必须保留：节点 CRUD、页面管理、视口、导出、全部 pathway 工具 |
| pathway-relevant | 28 | 保留但可能需要改造：render、set_fill、describe、batch_update 等 |
| design-specific | 57 | 应删除：组件、图标、字体、变量、布尔运算、设计分析、stock photo、codegen |
| MCP-only | 5 | list_documents、save_file、open_file、new_document、get_codegen_prompt |

### 3.2 现有 pathway 工具审计

11 个现有 pathway 工具，代码已实现且功能正常：

| 工具 | 文件 | 状态 |
|------|------|------|
| `create_pathway` | `pathway/create.ts` (219行) | 完整实现 |
| `add_entity` | `pathway/modify.ts` | 完整实现 |
| `add_process` | `pathway/modify.ts` | 完整实现 |
| `add_arc` | `pathway/modify.ts` | 完整实现 |
| `add_compartment` | `pathway/modify.ts` | 完整实现 |
| `set_state_variable` | `pathway/modify.ts` | 完整实现 |
| `set_unit_of_information` | `pathway/modify.ts` | 完整实现 |
| `set_pathway_style` | `pathway/modify.ts` | 完整实现 |
| `auto_layout_pathway` | `pathway/layout.ts` (30行) | 完整实现，但缺少 algorithm 参数 |
| `query_pathway_db` | `pathway/query.ts` (141行) | 完整实现，支持 Reactome + Pathway Commons |
| `sketch_to_pathway` | `pathway/sketch.ts` (31行) | **Placeholder**，返回 error 提示 |

### 3.3 工具注册架构

```
packages/scene-graph (类型: PathwayGlyphType, PathwayProcessType, PathwayArcType, getPathwayData, updatePathwayData)
    ↓
packages/core/src/tools/pathway/ (11 ToolDef via PATHWAY_TOOLS)
    ↓
packages/core/src/tools/registry-core.ts (PATHWAY_TOOLS spread into CORE_TOOLS)
    ↓
packages/core/src/tools/registry.ts (ALL_TOOLS = CORE_TOOLS + EXTENDED_TOOLS)
    ↓ (两个消费者)
    ├── packages/mcp/src/tool/registration.ts → 遍历 ALL_TOOLS，paramToZod() 转换
    └── packages/core/src/tools/ai-adapter.ts → toolsToAI() 转为 Vercel AI ToolSet
```

### 3.4 SBGN-ML I/O 现状

SBGN-ML import/export 已作为 IO adapter 实现（`packages/core/src/io/formats/sbgn-ml/`），包含：
- `adapter.ts` (47行)：IOFormatAdapter 注册，支持 read/write/export
- `read.ts`：SBGN-ML XML → SceneGraph 解析
- `write.ts`：SceneGraph → SBGN-ML XML 序列化

但这些都是 IO 层面的适配器，没有暴露为 `ToolDef`，AI agent 无法通过 chat 或 MCP 调用。

### 3.5 Pathway 基础设施

以下文件提供 pathway 工具的底层能力，已实现：

| 文件 | 用途 | 被哪些工具使用 |
|------|------|----------------|
| `pathway/lint.ts` | SBGN PD 合规验证 | → validate_pathway (新增) |
| `pathway/merge.ts` | 通路合并 | → merge_pathway (新增) |
| `pathway/overlay.ts` | 数据叠加 | → overlay_expression_data (新增) |
| `pathway/layout/hierarchical.ts` | 层次布局 | → auto_layout_pathway |
| `pathway/layout/orthogonal.ts` | 正交路由 | → auto_layout_pathway |
| `pathway/knowledge/reactome.ts` | Reactome API | → query_pathway_db |
| `pathway/knowledge/pathway-commons.ts` | Pathway Commons API | → query_pathway_db |

---

## 四、设计方案

### 方案一：工具注册分层（选定方案）

创建 `BIOPATH_CORE_TOOLS` 和 `BIOPATH_EXTENDED_TOOLS` 两个独立注册表，MCP 和 AI chat 从 BioPath 注册表获取工具。

**核心结构**：

```
packages/core/src/tools/
  registry-core.ts          — 保留给设计编辑器
  registry-extended.ts      — 保留给设计编辑器
  registry-biopath.ts       — 新增：BioPath 工具注册表
```

**工具组合**：

```
BIOPATH_CORE_TOOLS (27 工具):
  通用基础 (20): get_selection, get_node, find_nodes, get_page_tree,
    get_current_page, list_pages, select_nodes, switch_page,
    create_page, update_node, delete_node, reparent_node,
    node_resize, node_move, rename_node, node_bounds,
    node_children, node_tree, viewport_zoom_to_fit, calc
  导出 (3): export_svg, export_pdf, export_image
  Pathway 核心 (8): create_pathway, add_entity, add_process, add_arc,
    add_compartment, set_state_variable, set_unit_of_information,
    set_pathway_style

  旧: 26 core tools + 11 pathway = 37（含 design 工具）
  新: 27 tools（纯 pathway + 通用基础）

BIOPATH_EXTENDED_TOOLS (25 工具):
  通用操作 (13): get_jsx, render, set_fill, set_stroke, set_text,
    set_text_properties, set_opacity, set_visible, set_locked,
    batch_update, clone_node, node_ancestors, describe
  布局/结构 (4): set_layout, set_layout_child, group_nodes, ungroup_node
  Pathway 高级 (8): auto_layout_pathway, query_pathway_db,
    validate_pathway, import_sbgn_ml, export_sbgn_ml,
    remove_arc, modify_arc, annotate_pathway

  旧: 65 extended tools
  新: 25 tools（纯 pathway-relevant + pathway 高级）

P1 追加 (5): set_clone_marker, add_multimer, merge_pathway, split_pathway, modify_arc(如未在P0)
P2 追加 (2): set_active_state, overlay_expression_data

BIOPATH_TOOLS = BIOPATH_CORE_TOOLS + BIOPATH_EXTENDED_TOOLS (52 工具)
最终完整版: 52 + 5 (P1) + 2 (P2) = 59 工具
```

**优势**：
- 零侵入现有架构：`CORE_TOOLS` / `EXTENDED_TOOLS` / `ALL_TOOLS` 保持不变
- `ToolDef` / `defineTool` / `paramToZod` / `toolsToAI` 全链路无需修改
- MCP 只需把 `ALL_TOOLS` 换成 `BIOPATH_TOOLS`
- 新增 pathway 工具自然归入 BioPath 注册表

**`sketch_to_pathway` 处理**：
- 删除该工具（从 PATHWAY_TOOLS 移除）
- 在 system prompt 中指导 AI：当用户附带图片时，用 vision 能力解读草图，然后调用 `create_pathway`
- `sketch.ts` 文件保留不删，但不导出

**`auto_layout_pathway` 改造**：
- 增加 `algorithm` 参数：`enum: ['hierarchical', 'elk']`，默认 `'hierarchical'`
- ELK 未集成时，`algorithm: "elk"` 返回 error 提示

**`describe` 改造**：
- 对 pathway 节点类型自动追加 SBGN 合规性提示（`sbgn_issues` 字段）
- 不改工具本身逻辑，只在返回结果中追加

**`PathwayNodeData` 扩展**：
- 增加 `multimer?: boolean` 字段
- 增加 `activeState?: boolean` 字段

---

### 方案二：工具过滤层（备选，未选用）

在 MCP/AI chat 层加过滤函数，从 `ALL_TOOLS` 中排除 design-specific 工具。

**未选用原因**：
- 过滤列表硬编码，易遗漏
- 无法为 BioPath 定制工具描述
- 新增工具仍需手动加入 `CORE_TOOLS`
- workaround 而非 solution

### 方案三：配置驱动模式切换（备选，未选用）

每个 `ToolDef` 增加 `modes: ['design', 'pathway']` 字段，运行时按模式过滤。

**未选用原因**：
- 侵入 `ToolDef` schema，影响 91 个现有定义
- `defineTool()` 类型签名需改
- 全链路需适配（paramToZod、toolsToAI、MCP registration）
- BioPath 是产品转型，不是运行时模式切换
- 过度工程

---

## 五、实施清单

```
1.  创建 packages/core/src/tools/registry-biopath.ts
    — BioPath 工具注册表，组合 BIOPATH_CORE_TOOLS + BIOPATH_EXTENDED_TOOLS
    — 从各工具模块导入，不包含 design-specific 工具
    — 验收: BIOPATH_TOOLS 包含 52 个工具，编译无错

2.  修改 packages/core/src/tools/index.ts
    — 增加 BIOPATH_CORE_TOOLS, BIOPATH_EXTENDED_TOOLS, BIOPATH_TOOLS 导出
    — 验收: import { BIOPATH_TOOLS } from '@signal-forge/core/tools' 可用

3.  修改 packages/mcp/src/tool/registration.ts
    — 替换 ALL_TOOLS → BIOPATH_TOOLS
    — 删除 get_codegen_prompt 注册（第208-216行）
    — open_file 描述增加 .sbgn/.sbgnml 扩展名支持
    — new_document 增加 template 参数（enum: blank | pathway）
    — 验收: MCP 注册 52+4=56 个工具，无 codegen prompt

4.  修改 src/app/ai/tools/index.ts
    — 替换 CORE_TOOLS → BIOPATH_CORE_TOOLS
    — 验收: AI chat 可用 27 个工具

5.  重写 src/app/ai/chat/system-prompt.md
    — 删除第1-575行 UI 设计内容
    — 保留第576-676行 Pathway Diagram Mode 作为基础并增强
    — 增加: sketch-to-pathway 指导、annotate/merge/split/overlay 使用说明、step budget
    — 验收: 无 JSX/flex/stock photo 内容，所有 BioPath 工具有使用说明

6.  创建 packages/core/src/tools/pathway/validate.ts
    — validate_pathway 工具，调用 pathway/lint.ts 验证逻辑
    — 参数: page_id, fix(boolean)
    — 规则: arc-between-entities, missing-compartment, orphan-process, invalid-arc-type, disconnected-arc
    — 验收: 不合规图返回 errors/warnings，合规图返回 valid:true

7.  创建 packages/core/src/tools/pathway/io.ts
    — importSbgnMl: 参数 xml_content / file_path，调用 readSbgnMl()
    — exportSbgnMl: 参数 page_id / file_path，调用 writeSbgnMl()
    — 验收: round-trip import→export→import 产生等价图

8.  创建 packages/core/src/tools/pathway/modify-arc.ts
    — removeArc: 按 node_id 删除 PATHWAY_ARC
    — modifyArc: 修改 arc_type / source_id / target_id
    — 验收: 删除和修改 arc 功能正常

9.  修改 packages/core/src/tools/pathway/layout.ts
    — 增加 algorithm 参数 (enum: hierarchical | elk, 默认 hierarchical)
    — elk 未集成时返回 error 提示
    — 返回结果增加 algorithm 字段
    — 验收: 默认行为不变，algorithm="elk" 返回 error

10. 修改 packages/core/src/tools/pathway/index.ts
    — 移除 sketchToPathway 导出
    — 增加 11 个新工具导出: validatePathway, importSbgnMl, exportSbgnMl,
      removeArc, modifyArc, setCloneMarker, addMultimer, annotatePathway,
      mergePathway, splitPathway, setActiveState, overlayExpressionData
    — 验收: PATHWAY_TOOLS 包含 22 个工具

11. 创建 packages/core/src/tools/pathway/annotate.ts
    — annotatePathway 工具
    — 参数: node_id(可选, 省略则标注 page), type(doi|pmid|url|comment), value
    — 数据存储: pluginData key='pathway-annotations', value=JSON.stringify(Annotation[])
    — 验收: 可添加多个 annotation，不提供 node_id 时标注 page

12. 修改 packages/scene-graph/src/pathway-data.ts
    — PathwayNodeData 接口增加: multimer?: boolean, activeState?: boolean
    — 验收: 类型编译无错，现有代码不受影响

13. 创建 packages/core/src/tools/pathway/clone.ts
    — setCloneMarker: 参数 node_id, enabled(boolean)
    — addMultimer: 参数 node_id, enabled(boolean)
    — 验收: 设置/取消 clone marker 和 multimer 功能正常

14. 创建 packages/core/src/tools/pathway/merge.ts
    — mergePathway: 参数 source_page_id, match_by(name|name_and_type), offset_x/y
    — splitPathway: 参数 strategy(by_compartment|by_region), region_*
    — 调用 pathway/merge.ts 底层逻辑
    — 验收: 合并同名实体，按 compartment 拆分为多页

15. 创建 packages/core/src/tools/pathway/overlay.ts
    — overlayExpressionData: 参数 data(JSON), color_scale, min/max_value, page_id
    — 调用 pathway/overlay.ts 的 applyExpressionOverlay()
    — 验收: 正 fold-change 红色，负蓝色，零白色

16. 创建 packages/core/src/tools/pathway/active-state.ts
    — setActiveState: 参数 node_id, enabled(boolean)
    — 验收: 设置/取消 active state 虚线边框

17. 修改 describe 工具
    — 对 PATHWAY_ARC: 检查 source/target 是否都是 PATHWAY_GLYPH → error
    — 对 PATHWAY_GLYPH: 检查是否在 COMPARTMENT 内 → info
    — 对 PATHWAY_PROCESS: 检查是否有 consumption/production arc → warning
    — 提示放在返回结果的 sbgn_issues 字段
    — 验收: pathway 节点返回 sbgn_issues，非 pathway 节点不返回

18. 运行 bun run check — 零错误

19. 运行 bun run test:unit — 全部通过
```

---

## 六、实施优先级与阶段

```
Phase 1 (基础设施 — 1-2 天):
  步骤 1-5: 注册表、导出、MCP、AI chat、system prompt

Phase 2 (P0 新工具 — 3-5 天):
  步骤 6-10: validate, import/export sbgn-ml, remove_arc, layout algorithm, index 更新

Phase 3 (P1 新工具 — 5-7 天):
  步骤 11-14: annotate, PathwayNodeData 扩展, clone marker/multimer, merge/split

Phase 4 (P2 + describe 增强 — 3-5 天):
  步骤 15-17: overlay, active-state, describe SBGN 提示

验证:
  步骤 18-19: check + test:unit
```

---

## 七、风险与缓解

| 风险 | 缓解 |
|------|------|
| 删除 design 工具后无法创建自定义图形 | `render` 工具保留，仍可用 JSX 创建辅助元素 |
| `import_sbgn_ml` 在 MCP (Node.js) 下需文件系统 | MCP 已有 mcpRoot 机制，文件操作限定在 root 内 |
| ELK 未集成前 algorithm="elk" 不可用 | 返回 error 提示使用 hierarchical |
| `annotate_pathway` 数据存储 | 复用 pluginData 机制，key='pathway-annotations' |
| `PathwayNodeData` 增加字段影响 .fig round-trip | 新字段可选(?)，旧文件打开时为 undefined，不影响 |
| `describe` 改动影响设计编辑器模式 | SBGN 提示仅在检测到 pathway 节点时追加，非 pathway 节点无影响 |

---

## 八、工具对照表

### 保留的工具（52 个）

| # | 工具名 | 注册表 | 分类 |
|---|--------|--------|------|
| 1 | get_selection | core | 通用基础 |
| 2 | get_node | core | 通用基础 |
| 3 | find_nodes | core | 通用基础 |
| 4 | get_page_tree | core | 通用基础 |
| 5 | get_current_page | core | 通用基础 |
| 6 | list_pages | core | 通用基础 |
| 7 | select_nodes | core | 通用基础 |
| 8 | switch_page | core | 通用基础 |
| 9 | create_page | core | 通用基础 |
| 10 | update_node | core | 通用基础 |
| 11 | delete_node | core | 通用基础 |
| 12 | reparent_node | core | 通用基础 |
| 13 | node_resize | core | 通用基础 |
| 14 | node_move | core | 通用基础 |
| 15 | rename_node | core | 通用基础 |
| 16 | node_bounds | core | 通用基础 |
| 17 | node_children | core | 通用基础 |
| 18 | node_tree | core | 通用基础 |
| 19 | viewport_zoom_to_fit | core | 通用基础 |
| 20 | calc | core | 通用基础 |
| 21 | export_svg | core | 导出 |
| 22 | export_pdf | core | 导出 |
| 23 | export_image | core | 导出 |
| 24 | create_pathway | core | Pathway 核心 |
| 25 | add_entity | core | Pathway 核心 |
| 26 | add_process | core | Pathway 核心 |
| 27 | add_arc | core | Pathway 核心 |
| 28 | add_compartment | core | Pathway 核心 |
| 29 | set_state_variable | core | Pathway 核心 |
| 30 | set_unit_of_information | core | Pathway 核心 |
| 31 | set_pathway_style | core | Pathway 核心 |
| 32 | get_jsx | extended | 通用操作 |
| 33 | render | extended | 通用操作 |
| 34 | set_fill | extended | 通用操作 |
| 35 | set_stroke | extended | 通用操作 |
| 36 | set_text | extended | 通用操作 |
| 37 | set_text_properties | extended | 通用操作 |
| 38 | set_opacity | extended | 通用操作 |
| 39 | set_visible | extended | 通用操作 |
| 40 | set_locked | extended | 通用操作 |
| 41 | batch_update | extended | 通用操作 |
| 42 | clone_node | extended | 通用操作 |
| 43 | node_ancestors | extended | 通用操作 |
| 44 | describe | extended | 通用操作 |
| 45 | eval | extended | 通用操作 |
| 46 | set_layout | extended | 布局/结构 |
| 47 | set_layout_child | extended | 布局/结构 |
| 48 | group_nodes | extended | 布局/结构 |
| 49 | ungroup_node | extended | 布局/结构 |
| 50 | auto_layout_pathway | extended | Pathway 高级 |
| 51 | query_pathway_db | extended | Pathway 高级 |
| 52 | validate_pathway | extended | Pathway 高级 |

### P1 新增工具（5 个）

| # | 工具名 | 注册表 | 文件 |
|---|--------|--------|------|
| 53 | import_sbgn_ml | extended | pathway/io.ts |
| 54 | export_sbgn_ml | extended | pathway/io.ts |
| 55 | remove_arc | extended | pathway/modify-arc.ts |
| 56 | modify_arc | extended | pathway/modify-arc.ts |
| 57 | annotate_pathway | extended | pathway/annotate.ts |

### P2 新增工具（6 个）

| # | 工具名 | 注册表 | 文件 |
|---|--------|--------|------|
| 58 | set_clone_marker | extended | pathway/clone.ts |
| 59 | add_multimer | extended | pathway/clone.ts |
| 60 | merge_pathway | extended | pathway/merge.ts |
| 61 | split_pathway | extended | pathway/merge.ts |
| 62 | set_active_state | extended | pathway/active-state.ts |
| 63 | overlay_expression_data | extended | pathway/overlay.ts |

### 删除的工具（59 个）

| 分类 | 工具 |
|------|------|
| 组件系统 (5) | get_components, create_component, create_instance, node_to_component, node_bindings |
| 图标系统 (3) | search_icons, insert_icon, fetch_icons |
| 字体管理 (4) | list_fonts, list_available_fonts, set_font, set_font_range |
| 变量系统 (12) | list_variables, list_collections, get_variable, find_variables, create_variable, set_variable, delete_variable, bind_variable, unbind_variable, get_collection, create_collection, delete_collection |
| 布尔运算 (4) | boolean_union, boolean_subtract, boolean_intersect, boolean_exclude |
| 设计分析 (4) | analyze_colors, analyze_typography, analyze_spacing, analyze_clusters |
| 代码生成 (2) | design_to_tokens, design_to_component_map |
| Stock Photo (1) | stock_photo |
| UI 专属 (9) | create_shape, create_slice, set_radius, set_effects, set_constraints, set_minmax, set_blend, set_stroke_align, set_image_fill |
| 其他 (4) | flatten_nodes, query_nodes, page_bounds, diff_jsx |
| Pathway placeholder (1) | sketch_to_pathway |
| MCP-only (1) | get_codegen_prompt |
| 低优先级保留 (9) | create_vector, import_svg, set_rotation, set_text_resize, node_replace_with, arrange, path_get, path_set, path_scale/path_flip/path_move, analyze_overlaps, diff_create, diff_show |

注: "删除"指不纳入 BIOPATH_TOOLS 注册表，代码文件保留不动。最后 9 个工具实际为 pathway-relevant 但优先级较低，Phase 1 暂不纳入，后续可按需加入。

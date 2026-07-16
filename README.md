# SignalForge

Open-source design editor. Opens `.fig` and `.pen` design files, includes built-in AI, and ships as a programmable toolkit with a headless Vue SDK for building custom editors.

> **Status:** Active development. Usable today, with some rough edges as features evolve.

**[Try it online →](https://app.signalforge.dev/demo)** · [Download](https://github.com/open-pencil/open-pencil/releases/latest) · [Documentation](https://signalforge.dev) · [llms.txt](https://signalforge.dev/llms.txt)

![SignalForge](packages/docs/public/screenshot.png)

## Installation

**macOS (Homebrew):**

```sh
brew install signalforge
```

Or download from the [releases page](https://github.com/open-pencil/open-pencil/releases/latest), or [use the web app](https://app.signalforge.dev) — no install needed.

## What it does

- **Opens `.fig` and `.pen` files** — read and write native Figma files, open supported Pencil documents from the app or OS file browser, copy & paste nodes between apps
- **AI builds designs** — describe what you want in chat, 90+ tools create and modify nodes. Connect OpenRouter, Anthropic, OpenAI, Google AI, Z.ai, MiniMax, or compatible endpoints
- **Fully programmable** — headless CLI, XPath queries, Figma Plugin API via `eval`, MCP server for AI agents, and desktop agent integrations for Claude Code, Codex, and Gemini CLI
- **Lint, convert, and extract tokens** — inspect documents, lint naming/layout/accessibility, convert between supported formats, analyze colors/typography/spacing/clusters, and extract design tokens
- **Components and variants** — create reusable components, group variants into component sets, insert local assets as instances, and switch variants from the inspector
- **Design-to-code export** — export selections as JSX/Tailwind, generate token outputs, and map designs into component-oriented code workflows
- **Vue SDK for custom editors** — headless components and composables for embedding SignalForge into other apps or building workflow-specific editing surfaces. [Read the SDK docs →](https://signalforge.dev/programmable/sdk/)
- **Real-time collaboration** — P2P via WebRTC, no server, no account. Cursors, presence, follow mode
- **Auto layout & CSS Grid** — flex and grid layout via Yoga WASM, with gap, padding, alignment, track sizing
- **~7 MB desktop app** — Tauri v2 for macOS, Windows, Linux. Also runs in the browser as a PWA

## CLI

```sh
npm install -g @signal-forge/cli
# or: bun add -g @signal-forge/cli
```

### Inspect design files

Browse node trees, search by name or type, dig into properties — all without opening the editor:

```sh
signalforge tree design.fig
signalforge find design.pen --type TEXT
signalforge node design.fig --id 1:23
signalforge info design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

### Query with XPath

Use XPath selectors to find nodes by type, attributes, and structure:

```sh
signalforge query design.fig "//FRAME"                              # All frames
signalforge query design.fig "//FRAME[@width < 300]"                # Frames under 300px
signalforge query design.fig "//TEXT[contains(@name, 'Button')]"     # Text with 'Button' in name
signalforge query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
signalforge query design.fig "//SECTION//TEXT"                       # Text inside sections
```

### Export

Render to PNG, JPG, WEBP, SVG, `.fig`, or JSX — or export selections/pages as `.fig` and convert whole documents between supported formats:

```sh
signalforge export design.fig                           # PNG
signalforge export design.fig -f jpg -s 2 -q 90        # JPG at 2x, quality 90
signalforge export design.fig -f fig --page "Page 1"   # Export a page as .fig
signalforge export design.fig -f jsx --style tailwind   # Tailwind JSX
signalforge export design.fig -f html --css tailwind    # Tailwind HTML fragment
signalforge export design.fig -f html --html standalone --assets external # HTML + assets
signalforge convert design.pen output.fig               # Convert between document formats
signalforge import page.html --css styles.css -o page.fig # HTML/CSS → editable .fig
```

DOM/CSS input flows through `@signal-forge/dom-css`, so HTML, authored CSS, and Tailwind utility CSS can become editable SignalForge layers:

```sh
signalforge import card.html --css card.css -o card.fig
signalforge import card.html --tailwind "flex flex-col gap-3 w-80 p-6 rounded-xl bg-white" -o card.fig
```

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

### Lint design files

Catch naming, layout, structure, and accessibility issues from the terminal:

```sh
signalforge lint design.fig
signalforge lint design.pen --preset strict
signalforge lint design.fig --rule color-contrast
signalforge lint design.fig --list-rules
```

### Analyze and extract design tokens

Audit an entire design system from the terminal — find inconsistencies, extract the real palette, and spot components waiting to be extracted:

```sh
signalforge analyze colors design.fig
signalforge analyze typography design.fig
signalforge analyze spacing design.fig
signalforge analyze clusters design.fig
signalforge analyze overlaps design.fig
signalforge variables design.fig
```

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×

3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

### Script with Figma Plugin API

`eval` gives you the full Figma Plugin API. Modify the file, write it back:

```sh
signalforge eval design.fig -c "figma.currentPage.children.length"
signalforge eval design.fig -c "figma.currentPage.selection.forEach(n => n.opacity = 0.5)" -w
```

### Control the running app

When the desktop app is running, omit the file argument — the CLI connects via RPC and operates on the live canvas. Useful for automation scripts, CI pipelines, or AI agents that need to interact with the editor:

```sh
signalforge tree                               # Inspect the live document
signalforge export -f png                      # Screenshot the current canvas
signalforge eval -c "figma.currentPage.name"   # Query the editor
```

All commands support `--json` for machine-readable output.

## AI & MCP

### Built-in chat

Press <kbd>⌘</kbd><kbd>J</kbd> to open the AI assistant. It has 100+ tools that can create shapes, set fills and strokes, manage auto-layout, work with components and variables, run boolean operations, analyze design tokens, and export assets. Bring your own API key for OpenRouter, Anthropic, OpenAI, Google AI, Z.ai, MiniMax, or compatible endpoints. No backend, no account.

### Coding agents (desktop)

Use Claude Code, Codex, or Gemini CLI directly in the chat panel. The agent connects to the editor's MCP server and uses all 100+ design tools. Requires the desktop app and the agent CLI installed locally.

**Setup (Claude Code):**

1. Install the ACP adapter: `npm install -g @agentclientprotocol/claude-agent-acp`
2. Add MCP permission to `~/.claude/settings.json`:
   ```json
   {
     "permissions": {
       "allow": ["mcp__signal-forge__*"]
     }
   }
   ```
3. Open the desktop app → <kbd>Ctrl</kbd><kbd>J</kbd> → select **Claude Code** from the provider dropdown

### MCP server

Connect Claude Code, Cursor, Windsurf, or any MCP client to inspect, modify, and export design documents headlessly. 100+ tools. [Full docs →](https://signalforge.dev/reference/mcp-tools)

**Stdio** (Claude Code, Cursor, Windsurf):

```sh
npm install -g @signal-forge/mcp
claude mcp add --scope user signal-forge -- signalforge-mcp
```

For other MCP clients:

```json
{
  "mcpServers": {
    "signal-forge": {
      "command": "signalforge-mcp"
    }
  }
}
```

**HTTP** (scripts, CI):

```sh
signalforge-mcp-http   # http://localhost:3100/mcp
```

**File access:** Set `OPENPENCIL_MCP_ROOT` to scope file operations (`open_file`, `new_document`, export `path` param) to a directory. Defaults to the current working directory.

### AI agent skill

Teach your AI coding agent to use SignalForge — inspect designs, export assets, analyze tokens, modify .fig files:

```sh
npx skills add signal-forge/skills@signal-forge
```

Works with Claude Code, Cursor, Windsurf, Codex, and any agent that supports [skills](https://skills.sh).

For documentation-aware agents, the docs site publishes [llms.txt](https://signalforge.dev/llms.txt), [llms-full.txt](https://signalforge.dev/llms-full.txt), and per-page Markdown files generated from the VitePress docs.

## Collaboration

Share a link to co-edit in real time. No server, no account — peers connect directly via WebRTC.

1. Click the share button in the top-right panel
2. Share the generated link (`app.signalforge.dev/share/<room-id>`)
3. Collaborators see your cursor, selection, and edits in real time
4. Click a peer's avatar to follow their viewport

## Why

Figma is a closed platform that actively fights programmatic access. Their MCP server is read-only. [figma-use](https://github.com/dannote/figma-use) added full read/write automation via CDP — then [Figma 126 killed CDP](https://forum.figma.com/report-a-problem-6/remote-debugging-port-not-working-in-figma-desktop-126-1-2-50858). Your design files are in a proprietary binary format that only their software can fully read. Your workflows break when they decide to ship a point release.

SignalForge is the alternative: open source (MIT), reads .fig files natively, every operation is scriptable, and your data never leaves your machine.

See the [roadmap](https://signalforge.dev/development/roadmap) for product direction and current Figma compatibility gaps.

## Contributing

### Setup

```sh
bun install
bun run dev        # Dev server at localhost:1420
bun run tauri dev  # Desktop app (requires Rust)
```

### Quality gates

| Command | Description |
|---------|-------------|
| `bun run check` | Lint + typecheck |
| `bun run test` | E2E visual regression |
| `bun run test:unit` | Unit tests |
| `bun run format` | Code formatting |

### Project structure

```
packages/
  scene-graph/    @signal-forge/scene-graph — nodes, primitives, hit testing, copy/snap/undo
  pen/            @signal-forge/pen — Pencil document format helpers
  kiwi/           @signal-forge/kiwi — Kiwi runtime and low-level .fig container parsing
  fig/            @signal-forge/fig — focused .fig package entrypoint
  core/           @signal-forge/core — editor engine, renderer, layout, tools, RPC, document I/O
  dom-css/        @signal-forge/dom-css — HTML/CSS/Tailwind to editable design documents
  vue/            @signal-forge/vue — headless Vue SDK
  cli/            @signal-forge/cli — headless CLI
  mcp/            @signal-forge/mcp — MCP server (stdio + HTTP)
  docs/           Documentation site (signalforge.dev)
src/              Vue app (editor shell, AI, collaboration, document I/O)
desktop/          Tauri v2 desktop app (Rust + config)
tests/            E2E, visual, engine, and integration tests
```

### Tech stack

| Layer | Tech |
|-------|------|
| Rendering | Skia (CanvasKit WASM) |
| Layout | Yoga WASM (flex + grid via [fork](https://github.com/open-pencil/yoga/tree/grid)) |
| UI | Vue 3, Reka UI, Tailwind CSS 4 |
| File format | Kiwi binary + Zstd + ZIP |
| Collaboration | Trystero (WebRTC P2P) + Yjs (CRDT) |
| Desktop | Tauri v2 |
| AI/MCP | Multi-provider (Anthropic, OpenAI, Google AI, OpenRouter), MCP SDK, Hono |

### Desktop builds

Requires [Rust](https://rustup.rs/) and platform-specific prerequisites ([Tauri v2 guide](https://v2.tauri.app/start/prerequisites/)).

```sh
bun run tauri build
```

## Acknowledgments

Thanks to [@sld0Ant](https://github.com/sld0Ant) (Anton Soldatov) for creating and maintaining the [documentation site](https://signalforge.dev).

## License

MIT

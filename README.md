# OpenClaw Dashboard — AI Agent Command Center as an MCP App

A **conversational command center** for [OpenClaw](https://openclaw.io) AI agent clusters, built as an MCP App. Monitor sessions, track token usage, and **send commands to running agents** — all through natural conversation in ChatGPT or Claude.

**Live Demo:** [`https://late-river-13b96.run.mcp-use.com/mcp`](https://inspector.manufact.com/inspector?autoConnect=https%3A%2F%2Flate-river-13b96.run.mcp-use.com%2Fmcp)

## What It Does

OpenClaw is an open-source framework that runs persistent AI agent clusters — agents that handle Discord conversations, execute scheduled cron jobs, respond to webhooks, and maintain heartbeat health checks, 24/7.

**The problem:** Managing these agents requires SSH-ing into a server, reading log files, and manually sending commands. There's no remote control panel.

**Our solution:** An MCP App that turns ChatGPT/Claude into a full command center. Connect to any OpenClaw gateway, and the LLM becomes your ops interface:

- "Show me the dashboard" → Visual widget with all sessions, metrics, and channel breakdown
- "Send a message to the main agent" → Direct command to a running agent, with reply
- "What has the Discord bot been doing?" → Browse conversation history
- "How much have we spent on tokens?" → Real-time cost analysis

## Why MCP App?

This project **couldn't exist without the MCP Apps paradigm**. Traditional dashboards are read-only. Here, the LLM actively collaborates:

1. **The LLM interprets your intent** — "Check if the cron jobs ran today" → it knows to call `list-sessions`, filter for cron, and check timestamps
2. **The widget shows rich visual data** — token usage bars, context utilization, channel breakdown charts
3. **The LLM can act on what it sees** — "That agent looks stuck, send it a restart message" → it calls `send-message` with the right session key
4. **Two-way widget interactions** — Click "Try Demo" in the widget → triggers `connect-openclaw` tool → LLM sees the result → responds conversationally

## Architecture

```
User (ChatGPT/Claude)
    ↕ MCP Protocol
OpenClaw Dashboard (MCP Server on Manufact Cloud)
    ↕ HTTP REST API
OpenClaw Gateway (user's agent cluster)
    ↕ manages
AI Agents (Discord bots, Cron jobs, Webhooks, Heartbeats)
```

### Tools (LLM-facing)

| Tool | Description |
|------|-------------|
| `connect-openclaw` | Connect to a gateway with URL + auth token (must be called first) |
| `get-dashboard` | Visual monitoring widget with sessions, metrics, charts |
| `send-message` | Send a command to any agent session and get the reply |
| `list-sessions` | Discover all active sessions with keys, channels, models |
| `get-session-history` | Browse recent conversation history of any session |
| `get-metrics` | Token usage, estimated cost, success rate, context utilization |
| `create-task` / `update-task` | Dispatch tasks to agents via the gateway |

### Widget (User-facing)

A React dashboard rendered inside the chat, featuring:
- **Session list** grouped by status (Active / Heartbeat / Scheduled / Chat / Idle)
- **Per-session metrics** — token count, context window utilization bar, last message preview
- **Aggregate metrics** — total tokens, estimated cost, success rate, context %
- **Channel breakdown** — visual bar showing token distribution across Discord, Webchat, Cron
- **Setup screen** with "Try Demo" button for instant onboarding

### Widget ↔ Model Interactions

- `useCallTool("connect-openclaw")` — Widget's setup form calls the connect tool, LLM sees the connection result
- `useCallTool("refresh-dashboard")` — Widget's refresh button fetches fresh data through MCP
- `sendFollowUpMessage()` — "Ask AI" button in task detail modal triggers LLM analysis
- Widget state persists across tool invocations via `useWidget` state management

## Data Sources

All data is fetched remotely from the OpenClaw gateway via HTTP:

| Gateway Tool | Data Retrieved |
|---|---|
| `sessions_list` | All sessions with tokens, model, channel, context size, activity timestamps |
| `sessions_history` | Per-session conversation transcripts (role, content, timestamp) |
| `sessions_send` | Send messages to agents and receive replies |
| `agents_list` | Available agent configurations |

**No database required** — the gateway is the single source of truth.

## Quick Start

### Try it now (Inspector)

Open the [Inspector](https://inspector.manufact.com/inspector?autoConnect=https%3A%2F%2Flate-river-13b96.run.mcp-use.com%2Fmcp), call `get-dashboard`, and click **Try Demo**.

### Connect to ChatGPT

1. Go to [ChatGPT Apps Settings](https://chatgpt.com/apps#settings/Connectors) → Create App
2. Name: `OpenClaw Dashboard`
3. URL: `https://late-river-13b96.run.mcp-use.com/mcp`
4. Auth: No Authentication
5. Type `@OpenClaw Dashboard` in any chat

### Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000/inspector
```

### Deploy your own

```bash
npm run deploy
```

## Tech Stack

- **Server:** TypeScript + [mcp-use](https://mcp-use.com) framework
- **Widget:** React 19 + Tailwind CSS 4 + [@openai/apps-sdk-ui](https://www.npmjs.com/package/@openai/apps-sdk-ui)
- **Deployment:** [Manufact Cloud](https://manufact.com) (Fly.io)
- **Protocol:** [Model Context Protocol](https://modelcontextprotocol.io/) (MCP)

## License

MIT

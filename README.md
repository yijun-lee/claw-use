# 🦞 OpenClaw Orchestrator — MCP App

> **"Dashboards show you. MCP Apps think and act."**

An MCP App that turns ChatGPT, Claude, or any MCP-compatible client into a **live control tower** for your OpenClaw instance — monitor, diagnose, and orchestrate all background tasks without ever leaving the conversation.

![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)
![MCP App](https://img.shields.io/badge/MCP-App-FF6B35?style=for-the-badge)
![OpenClaw](https://img.shields.io/badge/OpenClaw-Compatible-E34234?style=for-the-badge)

---

## The Problem

OpenClaw runs 24/7 — classifying emails, collecting news, generating morning briefings, handling Discord DMs, running GitHub PR reports, monitoring prices, and more. All at the same time.

But when something goes wrong at 3 AM?

- **Dashboards** need a human staring at them. No eyes, no action.
- **Alert notifications** tell you there's a problem, but don't solve it.
- **Automation scripts** handle `if X then Y`, but can't reason about novel failures.
- **Text chat** (Telegram/WhatsApp) can trigger commands, but you can't *see* what's happening.

The fundamental issue: **monitoring and acting are in separate contexts.** You see the problem in one place, then context-switch to fix it in another.

---

## The Solution

OpenClaw Orchestrator bridges monitoring and action in a single interface — inside your AI conversation.

```
┌─────────────────────────────────────────────┐
│              AI Client (Claude/ChatGPT)      │
│                                              │
│  ┌─────────────────────────────────────┐     │
│  │     OpenClaw Orchestrator UI        │     │
│  │                                     │     │
│  │  ┌──────┐ ┌──────┐ ┌──────┐       │     │
│  │  │ Done │ │ Run  │ │ Fail │       │     │
│  │  │      │ │      │ │      │       │     │
│  │  │ ✅📧 │ │ 🔄🤖 │ │ ❌📰 │       │     │
│  │  │ ✅💬 │ │ 🔄📊 │ │ ⚠️☀️ │       │     │
│  │  └──────┘ └──────┘ └──────┘       │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  💬 "The two yellow cards are related.       │
│      News cron failed because X API token    │
│      expired. Morning briefing is incomplete │
│      as a result. Root cause is one thing."  │
│                                              │
│  You: "Fix the token, re-collect, and        │
│        regenerate the briefing."             │
│                                              │
│  💬 "Done. All three tasks succeeded." ✅    │
└─────────────────────────────────────────────┘
```

---

## Why MCP App — Not a Dashboard?

|                              | Automation Script | Dashboard | API Direct | **MCP App** ✅ |
|------------------------------|:-:|:-:|:-:|:-:|
| **AI Judgment** (novel failures) | ❌ Rules only | ❌ Human judges | ✅ | ✅ |
| **Visible to Human**            | ❌ Black box  | ✅             | ❌ Black box | ✅ |

MCP App is the **only interface** where AI makes decisions *and* humans can see and override them.

- **Script** → executes rules, invisible to you
- **Dashboard** → visible, but only pre-defined buttons
- **API wiring** → AI can act, but you don't know what it's doing
- **MCP App** → AI reasons + acts + you see everything + you override anytime

---

## Features

### 📋 Kanban Status Board
All OpenClaw tasks — cron jobs, sessions, webhooks, browser tasks, skills — visualized as cards in Done / Running / Failed / Scheduled columns. One glance, full picture.

### 🔗 Causal Failure Analysis
Don't just see *what* failed — understand *why* and *what else* was affected. The AI traces cascading failures back to their root cause automatically.

### 💬 Natural Language Actions
No buttons needed. Speak complex, multi-step actions that no dashboard could pre-define:

- *"Renew the X API token, re-run news collection, then regenerate the briefing."*
- *"Skip the docs PRs and send me just the code changes to Slack."*
- *"If this cron fails from rate limiting again, auto-backoff and retry 3 times before alerting me."*

### 📡 Real-Time Progress Tracking
Watch tasks progress live inside the UI. Not just "running" → "done", but granular steps. Intervene mid-execution if the direction is wrong.

### 🛡️ Proactive Strategy Registration
Teach the AI orchestrator how to handle future failures — in natural language, not code. Change strategies anytime by just talking.

---

## Widget ↔ Model Interaction

The two-way communication loop is the core of this MCP App:

```
  ┌──────────┐                    ┌──────────┐
  │  Widget   │───── User sees ──▶│  Human   │
  │ (Kanban)  │     failed card   │          │
  └──────────┘                    └────┬─────┘
       ▲                               │
       │                    "Why did this fail?"
  AI updates                           │
  card status                          ▼
       │                         ┌──────────┐
       └──── AI analyzes ◀──────│  Model   │
              logs & acts        │ (Claude)  │
                                 └──────────┘
```

- **Widget → Human → Model**: See a red card → ask about it → AI analyzes and suggests
- **Model → Widget**: AI executes fix → card moves from Failed to Running to Done in real-time
- **Human override**: At any point, change the AI's plan mid-execution

---

## Quick Start

### Prerequisites
- [OpenClaw](https://github.com/openclaw/openclaw) gateway running (`openclaw gateway --port 18789`)
- An MCP-compatible client (Claude, ChatGPT, VS Code, etc.)

### Install


### Configure


### Use
Open Claude or ChatGPT and say:
```
"Show me my OpenClaw status."
```

That's it. The kanban board appears, and you're in control.

---

## MCP Tools Exposed

| Tool | Description |
|------|-------------|
| `get_status` | Full gateway status — sessions, crons, channels, queues |
| `get_task_detail` | Detailed info + logs for a specific task |
| `execute_action` | Run any action: restart, reschedule, model change, etc. |
| `analyze_failure` | AI-powered root cause analysis with causal chain |
| `register_strategy` | Set natural-language rules for future auto-response |
| `get_timeline` | Real-time execution flow for running tasks |

---


## Built With

- [OpenClaw](https://github.com/openclaw/openclaw) — Personal AI assistant platform (196k ⭐)
- [Manufact MCP SDK](https://github.com/mcp-use/mcp-use) — MCP App development framework
- [MCP Protocol](https://modelcontextprotocol.io/) — Universal AI tool standard

---

## Philosophy

> Dashboards are monitors. MCP Apps are co-pilots.
>
> In the age of always-on agents, the control interface shouldn't require a human to be always-on too. Let AI manage agents. Let humans steer.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

# MCP Apps Hackathon @ YC by Manufact

![MCP Apps Hackathon](https://d2xtzufx9mvgbo.cloudfront.net/events/Screenshot%202026-02-05%20at%205.39.36%E2%80%AFPM-4352f7d27bd84e6f.png)


A hackathon starter built with [mcp-use](https://mcp-use.com) and deployed on [Manufact Cloud](https://manufact.com). Part of the [MCP Apps Hackathon by Manufact](https://events.ycombinator.com/manufact-hackathon26) at Y Combinator.

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000/inspector](http://localhost:3000/inspector) to test your server interactively — no external tunneling needed.

You can start building by editing `index.ts`. Add tools, resources, and prompts — the server auto-reloads as you edit thanks to Hot Module Reloading (HMR).

## Connecting to Claude or ChatGPT

### Local testing with tunnel

Start the dev server with a built-in tunnel to get a public HTTPS URL instantly — no deployment needed:

```bash
npm run dev -- --tunnel
```

The CLI prints a stable public URL like `https://<subdomain>.tunnel.mcp-use.com/mcp`. Add it as a remote MCP server:

- **Claude**: Settings → **Integrations** → **Add integration** → paste the tunnel URL
- **ChatGPT**: Settings → **Connectors** → **Add MCP server** → paste the tunnel URL

The tunnel keeps the same subdomain across restarts, so your link stays stable while you iterate.

### After deployment

Once deployed to Manufact Cloud, add your production URL as a remote MCP server:

```
https://<your-slug>.run.mcp-use.com/mcp
```

## Alternative: Goose (no Claude Pro or ChatGPT Plus required)

If you don't have a Claude Pro or ChatGPT Plus account, you can use [Goose](https://block.github.io/goose/docs/quickstart/) 

Follow the [Goose quickstart](https://block.github.io/goose/docs/quickstart/) to install it, then add your tunnel or deployed URL as an MCP extension.

## Deploy

### Manufact Cloud Dashboard

1. Sign in at [manufact.com](https://manufact.com)
2. Go to **Servers** → **New Server**
3. Connect your GitHub repository
4. Click **Deploy** 

Your server will be live at `https://<your-slug>.run.mcp-use.com/mcp` and manageable from the [dashboard](https://manufact.com/cloud/servers).

### CLI

```bash
# Login to Manufact Cloud
npx @mcp-use/cli login

# Deploy from your repo root
npm run deploy
```

The CLI detects your GitHub repository, builds the project, and streams logs until deployment completes:

```
✓ Deployment successful!

🌐 MCP Server URL:
   https://<your-slug>.run.mcp-use.com/mcp

📊 Dashboard:
   https://manufact.com/cloud/servers/<your-slug>
```

Subsequent `npm run deploy` calls redeploy to the same URL 

## Resources

- [mcp-use Documentation](https://mcp-use.com/docs/typescript/getting-started/quickstart) — guides, API reference, and tutorials
- [CLI Reference](https://mcp-use.com/docs/typescript/server/cli-reference) — full `mcp-use` CLI docs
- [Manufact Cloud Deployment](https://mcp-use.com/docs/typescript/server/deployment/mcp-use) — deployment guide
- [MCP Apps / UI Widgets](https://mcp-use.com/docs/typescript/server/mcp-apps) — build interactive widgets in Claude and ChatGPT
- [Model Context Protocol](https://modelcontextprotocol.io/) — the open standard powering MCP servers
- [Goose](https://block.github.io/goose/docs/quickstart/) — free open-source MCP client
- [MCP Apps Hackathon](https://events.ycombinator.com/manufact-hackathon26) — event page


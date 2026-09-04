# Local model chat

A Next.js front end for a self-hosted LLM. The browser never talks to the
model directly — requests go through an API route on the server, which is
what keeps the API key and the model's real address off the client.

## Run it locally

```bash
npm install
cp .env.example .env.local     # then edit it
npm run dev
```

Open http://localhost:3000

## Environment

| Variable | What it does |
|---|---|
| `LLM_URL` | Where the model listens. No trailing slash. |
| `LLM_API_KEY` | Only if the server was started with `--api-key`. |
| `LLM_SYSTEM_PROMPT` | Prepended to every conversation. |

None of these have the `NEXT_PUBLIC_` prefix, which is deliberate — Next.js
only ships env vars to the browser when they carry that prefix. These stay
on the server.

## Deploy on container 104

```bash
# on 104, with the project copied to /srv/chat
npm ci
npm run build
```

Run it under systemd so it survives a reboot —
`/etc/systemd/system/llm-chat.service`:

```ini
[Unit]
Description=llm-chat
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/chat
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now llm-chat
```

Caddy now proxies to Next.js instead of serving files. Replace the whole
site block with:

```
chat.yourdomain.com {
    reverse_proxy localhost:3000
}
```

No `handle /v1/*` — Next.js owns that path now.

## Worth adding next

- Auth. Nothing here checks who you are.
- Conversation history. Everything is lost on reload; 103 is running
  PostgreSQL and is the obvious home for it.
- Context trimming. The full transcript is resent every turn, so long
  chats eventually exceed the model's context window.

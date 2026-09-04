export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LLM_URL = process.env.LLM_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;
const SYSTEM_PROMPT =
  process.env.LLM_SYSTEM_PROMPT ||
  "You are a helpful assistant running on a home server.";

export async function POST(req) {
  if (!LLM_URL) {
    return Response.json(
      { error: "LLM_URL is not set. Add it to .env.local and restart." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const { messages, model } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "No messages to send." }, { status: 400 });
  }

  // The system prompt lives on the server, so the client can't rewrite it.
  const withSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.filter((m) => m.role !== "system"),
  ];

  const headers = { "Content-Type": "application/json" };
  if (LLM_API_KEY) headers.Authorization = `Bearer ${LLM_API_KEY}`;

  let upstream;
  try {
    upstream = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: withSystem, stream: true }),
      signal: req.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return new Response(null, { status: 499 });
    return Response.json(
      { error: `Can't reach the model at ${LLM_URL}. Is it running?` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    const raw = await upstream.text().catch(() => "");
    let message = raw.slice(0, 300);
    try {
      const parsed = JSON.parse(raw);
      message = parsed?.error?.message || parsed?.message || message;
    } catch {}
    return Response.json(
      { error: `Model returned ${upstream.status}: ${message}` },
      { status: upstream.status }
    );
  }

  // Hand the event stream straight through, untouched.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

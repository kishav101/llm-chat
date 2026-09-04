import dns from "node:dns/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_TEXT_CHARS = 6000;
const TIMEOUT_MS = 10_000;

function isPrivateIp(ip) {
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice(7));
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 0) return true;
  return false;
}

function stripHtml(html) {
  let text = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Malformed request body." }, { status: 400 });
  }

  const raw = (body?.url || "").trim();
  if (!raw) return Response.json({ error: "No URL given." }, { status: 400 });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ error: "That's not a valid URL." }, { status: 400 });
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return Response.json({ error: "Only http and https URLs are supported." }, { status: 400 });
  }

  const hostname = target.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    return Response.json({ error: "That host isn't reachable from here." }, { status: 400 });
  }

  try {
    const records = await dns.lookup(hostname, { all: true });
    if (records.length === 0 || records.some((r) => isPrivateIp(r.address))) {
      return Response.json({ error: "That host isn't reachable from here." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Couldn't resolve that host." }, { status: 400 });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; local-chat-research/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      return Response.json({ error: "That page took too long to load." }, { status: 504 });
    }
    return Response.json({ error: `Couldn't reach that page. ${err.message}` }, { status: 502 });
  }
  clearTimeout(timer);

  if (!res.ok) {
    return Response.json({ error: `That page returned ${res.status}.` }, { status: 502 });
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("xhtml")) {
    return Response.json(
      { error: `That page isn't HTML (${contentType.split(";")[0] || "unknown type"}).` },
      { status: 415 }
    );
  }

  const reader = res.body?.getReader();
  if (!reader) return Response.json({ error: "Couldn't read that page." }, { status: 502 });

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > MAX_BYTES) {
      reader.cancel().catch(() => {});
      break;
    }
    chunks.push(value);
  }

  const html = Buffer.concat(chunks).toString("utf-8");
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().slice(0, 200) : target.hostname;

  const text = stripHtml(html).slice(0, MAX_TEXT_CHARS);
  if (!text) {
    return Response.json({ error: "Couldn't find any readable text on that page." }, { status: 422 });
  }

  return Response.json({ url: target.toString(), title, text });
}

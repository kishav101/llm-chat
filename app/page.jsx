"use client";

import { useEffect, useRef, useState } from "react";

const TEXT_EXT =
  /\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|mjs|cjs|py|java|c|cpp|h|hpp|go|rs|rb|php|html|htm|css|scss|yml|yaml|xml|sh|bash|sql|log|ini|conf|toml)$/i;

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_BYTES = 300 * 1024;

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    r.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    r.readAsText(file);
  });
}

async function fileToAttachment(file) {
  const isImage = file.type.startsWith("image/");
  const looksTexty =
    !isImage &&
    (file.type.startsWith("text/") ||
      file.type === "application/json" ||
      file.type === "" ||
      TEXT_EXT.test(file.name));

  if (isImage) {
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error(`${file.name} is over 8MB.`);
    }
    const dataUrl = await readAsDataURL(file);
    return { id: uid(), kind: "image", name: file.name, size: file.size, dataUrl };
  }

  if (looksTexty) {
    if (file.size > MAX_TEXT_BYTES) {
      throw new Error(`${file.name} is over 300KB — trim it first.`);
    }
    const content = await readAsText(file);
    return { id: uid(), kind: "text", name: file.name, size: file.size, content };
  }

  throw new Error(`${file.name}: unsupported file type.`);
}

function buildOutgoingContent(text, attachments) {
  const images = attachments.filter((a) => a.kind === "image");
  const textish = attachments.filter((a) => a.kind !== "image");

  let combined = text;
  if (textish.length) {
    const blocks = textish.map((a) =>
      a.kind === "web"
        ? `Source: ${a.sourceUrl}\nTitle: ${a.name}\n\n${a.content}`
        : `File: ${a.name}\n\n${a.content}`
    );
    combined = [text, ...blocks].filter(Boolean).join("\n\n---\n\n");
  }

  if (!images.length) return combined;

  const parts = [];
  if (combined) parts.push({ type: "text", text: combined });
  for (const img of images) {
    parts.push({ type: "image_url", image_url: { url: img.dataUrl } });
  }
  return parts;
}

function Content({ text }) {
  const parts = text.split(/```/);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <span key={i}>{part}</span>;
    const body = part.replace(/^[a-zA-Z0-9+-]*\n/, "");
    return <pre key={i}>{body}</pre>;
  });
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a5 5 0 01-7.07-7.07l9.19-9.19a3.5 3.5 0 015 5l-9.2 9.19a1.5 1.5 0 01-2.12-2.12l8.49-8.48" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12.6A9 9 0 1111.4 3a7 7 0 009.6 9.6z" />
    </svg>
  );
}

function AttachmentChips({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="attach-preview">
      {items.map((a) => (
        <span className="chip" key={a.id}>
          {a.kind === "image" ? (
            <img className="chip-thumb" src={a.dataUrl} alt="" />
          ) : (
            <span className="chip-icon">{a.kind === "web" ? <GlobeIcon /> : <FileIcon />}</span>
          )}
          <span className="chip-name">{a.name}</span>
          {onRemove && (
            <button type="button" className="chip-remove" onClick={() => onRemove(a.id)} aria-label={`Remove ${a.name}`}>
              <XIcon />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

export default function Page() {
  const [turns, setTurns] = useState([]);
  const [draft, setDraft] = useState("");
  const [models, setModels] = useState([]);
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [meter, setMeter] = useState({
    state: "idle",
    tokens: 0,
    speed: "—",
    ttft: "—",
  });
  const [theme, setTheme] = useState("dark");
  const [attachments, setAttachments] = useState([]);
  const [attachError, setAttachError] = useState(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [urlBusy, setUrlBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const history = useRef([]);
  const abort = useRef(null);
  const scroller = useRef(null);
  const pinned = useRef(true);
  const box = useRef(null);
  const fileInput = useRef(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then(({ models }) => {
        setModels(models || []);
        if (models?.length) setModel(models[0]);
      })
      .catch(() => setModels([]));
  }, []);

  useEffect(() => {
    if (pinned.current && scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [turns]);

  function onScroll() {
    const el = scroller.current;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  function reset() {
    if (abort.current) abort.current.abort();
    history.current = [];
    setTurns([]);
    setMeter({ state: "idle", tokens: 0, speed: "—", ttft: "—" });
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setAttachError(null);
    const ok = [];
    const errors = [];
    for (const file of files) {
      try {
        ok.push(await fileToAttachment(file));
      } catch (err) {
        errors.push(err.message);
      }
    }
    if (ok.length) setAttachments((prev) => [...prev, ...ok]);
    if (errors.length) setAttachError(errors.join(" "));
  }

  function onPickFiles(e) {
    addFiles(e.target.files);
    e.target.value = "";
  }

  function removeAttachment(id) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function onDragOver(e) {
    e.preventDefault();
  }
  function onDragEnter(e) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }
  function onDragLeave(e) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function submitUrl() {
    const url = urlValue.trim();
    if (!url || urlBusy) return;
    setUrlBusy(true);
    setAttachError(null);
    try {
      const res = await fetch("/api/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't fetch that page.");
      setAttachments((prev) => [
        ...prev,
        { id: uid(), kind: "web", name: data.title || url, content: data.text, sourceUrl: data.url || url },
      ]);
      setUrlValue("");
      setUrlOpen(false);
    } catch (err) {
      setAttachError(err.message);
    } finally {
      setUrlBusy(false);
    }
  }

  function onUrlKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      submitUrl();
    } else if (e.key === "Escape") {
      setUrlOpen(false);
    }
  }

  async function send(e) {
    e?.preventDefault();

    if (busy) {
      abort.current?.abort();
      return;
    }

    const text = draft.trim();
    if (!text && attachments.length === 0) return;

    const outgoingAttachments = attachments;
    const content = buildOutgoingContent(text, outgoingAttachments);

    setDraft("");
    setAttachments([]);
    setAttachError(null);
    if (box.current) box.current.style.height = "auto";

    history.current.push({ role: "user", content });
    setTurns((t) => [
      ...t,
      { who: "You", role: "you", text, attachments: outgoingAttachments },
      { who: model || "model", role: "model", text: "", live: true },
    ]);
    pinned.current = true;
    setBusy(true);

    const started = performance.now();
    let ttft = null;
    let tokens = 0;
    let reply = "";

    abort.current = new AbortController();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: history.current }),
        signal: abort.current.signal,
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error || `Request failed with ${res.status}`);
      }

      setMeter((m) => ({ ...m, state: "streaming" }));

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;

          let chunk;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          const piece = chunk.choices?.[0]?.delta?.content;
          if (!piece) continue;

          if (ttft === null) ttft = Math.round(performance.now() - started);
          tokens += 1;
          reply += piece;

          const secs = (performance.now() - started) / 1000;
          setMeter({
            state: "streaming",
            tokens,
            speed: (tokens / secs).toFixed(1),
            ttft,
          });

          setTurns((t) => {
            const next = [...t];
            next[next.length - 1] = {
              ...next[next.length - 1],
              text: reply,
              live: true,
            };
            return next;
          });
        }
      }

      history.current.push({ role: "assistant", content: reply });
      setMeter((m) => ({ ...m, state: "idle" }));
    } catch (err) {
      const stopped = err.name === "AbortError";

      if (stopped) {
        history.current.push({ role: "assistant", content: reply });
      } else {
        history.current.pop();
      }

      setTurns((t) => {
        const next = [...t];
        next[next.length - 1] = {
          ...next[next.length - 1],
          live: false,
          role: stopped ? "model" : "failed",
          text: stopped ? reply : err.message,
        };
        return next;
      });

      setMeter((m) => ({ ...m, state: stopped ? "stopped" : "error" }));
    } finally {
      setTurns((t) => {
        const next = [...t];
        const last = next[next.length - 1];
        if (last) next[next.length - 1] = { ...last, live: false };
        return next;
      });
      abort.current = null;
      setBusy(false);
      box.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function grow(e) {
    setDraft(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 220) + "px";
  }

  const connected = models.length > 0;

  return (
    <div className="shell">
      <header className="bar">
        <div className="brand">
          <span className="logo-dot" />
          <div className="brand-text">
            <h1>DDevelopment Data (Pty) Ltd</h1>
            <span className="subtitle">AI Model</span>
          </div>
        </div>
        <span className={`status-pill ${connected ? "on" : ""}`}>
          <span className="status-dot" />
          {connected ? "connected" : "no model"}
        </span>
        <span className="grow" />
        <div className="toolbar">
          <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="Model">
            {models.length ? (
              models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))
            ) : (
              <option>model list unavailable</option>
            )}
          </select>
          <button
            className="icon-btn"
            type="button"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button className="btn-ghost" type="button" onClick={reset}>
            Clear chat
          </button>
        </div>
      </header>

      <main className="scroll" ref={scroller} onScroll={onScroll}>
        <div className="transcript">
          {turns.map((t, i) => (
            <div key={i} className={`msg ${t.role}`}>
              <div className="avatar">{t.role === "you" ? "Y" : "M"}</div>
              <div className="bubble-col">
                <div className="who">{t.who}</div>
                <div className="bubble">
                  {t.attachments?.length ? <AttachmentChips items={t.attachments} /> : null}
                  <Content text={t.text} />
                  {t.live && <span className="caret" />}
                </div>
              </div>
            </div>
          ))}
        </div>
        {turns.length === 0 && (
          <div className="empty">
            <span className="empty-icon" />
            <p>Nothing here yet. Ask the model something, attach a file, or drop in a link to research.</p>
          </div>
        )}
      </main>

      <div className={`telemetry ${meter.state === "streaming" ? "live" : ""}`}>
        <span>
          state <b>{meter.state}</b>
        </span>
        <span>
          tokens <b>{meter.tokens}</b>
        </span>
        <span>
          speed <b>{meter.speed}</b> tok/s
        </span>
        <span>
          first token <b>{meter.ttft}</b> ms
        </span>
      </div>

      <div className="composer-shell">
        <div
          className={`composer-card ${dragging ? "drag" : ""}`}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {urlOpen && (
            <div className="url-row">
              <input
                autoFocus
                type="url"
                inputMode="url"
                placeholder="Paste a link to research…"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={onUrlKeyDown}
                disabled={urlBusy}
              />
              <button type="button" className="btn-ghost" onClick={submitUrl} disabled={urlBusy || !urlValue.trim()}>
                {urlBusy ? "Fetching…" : "Add"}
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => {
                  setUrlOpen(false);
                  setUrlValue("");
                }}
                aria-label="Cancel"
              >
                <XIcon />
              </button>
            </div>
          )}

          <AttachmentChips items={attachments} onRemove={removeAttachment} />
          {attachError && <div className="attach-error">{attachError}</div>}

          <form className="composer" onSubmit={send}>
            <div className="composer-tools">
              <input
                ref={fileInput}
                type="file"
                multiple
                hidden
                onChange={onPickFiles}
                accept="image/*,text/*,.md,.json,.csv,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.go,.rs,.rb,.php,.html,.css,.yml,.yaml,.xml,.sh,.sql,.log"
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => fileInput.current?.click()}
                aria-label="Attach files"
                title="Attach files"
              >
                <PaperclipIcon />
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setUrlOpen((v) => !v)}
                aria-label="Research a link"
                title="Research a link"
              >
                <GlobeIcon />
              </button>
            </div>
            <textarea
              ref={box}
              rows={1}
              value={draft}
              onChange={grow}
              onKeyDown={onKeyDown}
              placeholder="Message the model…"
              autoFocus
            />
            <button className={`send ${busy ? "stop" : ""}`} type="submit" aria-label={busy ? "Stop" : "Send"}>
              {busy ? <StopIcon /> : <SendIcon />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

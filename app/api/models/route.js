export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LLM_URL = process.env.LLM_URL;
const LLM_API_KEY = process.env.LLM_API_KEY;

export async function GET() {
  if (!LLM_URL) {
    return Response.json({ models: [], error: "LLM_URL is not set." });
  }

  const headers = {};
  if (LLM_API_KEY) headers.Authorization = `Bearer ${LLM_API_KEY}`;

  try {
    const res = await fetch(`${LLM_URL}/v1/models`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`status ${res.status}`);

    const json = await res.json();
    const models = (json.data || []).map((m) => m.id);
    return Response.json({ models });
  } catch (err) {
    return Response.json({
      models: [],
      error: `Couldn't read the model list. ${err.message}`,
    });
  }
}

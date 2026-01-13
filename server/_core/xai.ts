import { ENV } from "./env";

export async function grokSuggestUrls(params: {
  query: string;
  maxUrls: number;
}): Promise<string[]> {
  if (!ENV.xaiApiKey) {
    throw new Error("XAI_API_KEY is not set (needed for Grok discovery)");
  }

  const maxUrls = Math.min(Math.max(params.maxUrls, 1), 200);

  const system = [
    "You are a web research assistant.",
    "Return ONLY strict JSON (no markdown, no prose).",
    `Output schema: {"urls": string[]}.`,
    `Rules:`,
    `- Include at most ${maxUrls} URLs`,
    `- Prefer direct report/document URLs (PDF) or stable publication pages`,
    `- Focus on Europe (NL/DE/FR/Nordics/EU) when relevant`,
    `- Exclude social media, login pages, and irrelevant marketing`,
  ].join("\n");

  const user = [
    "Find URLs for reports/publications that describe actual SDG-related projects/programs.",
    "Query:",
    params.query,
  ].join("\n\n");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.xaiApiKey}`,
    },
    body: JSON.stringify({
      model: ENV.xaiModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`xAI request failed: ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }

  const json = (await res.json()) as any;
  const content: string | undefined = json?.choices?.[0]?.message?.content;
  if (!content) return [];

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Last-resort: try to extract JSON substring
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) parsed = JSON.parse(content.slice(start, end + 1));
  }

  const urls = Array.isArray(parsed?.urls) ? parsed.urls : [];
  return urls.filter((u: any) => typeof u === "string" && u.startsWith("http")).slice(0, maxUrls);
}


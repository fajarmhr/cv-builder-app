import { NextRequest, NextResponse } from "next/server";

const XAI_API_URL = "https://api.x.ai/v1/chat/completions";
const XAI_API_KEY = process.env.XAI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "grok-3-mini-fast";

interface EnhanceRequest {
  type: "summary" | "bullets";
  text: string;
  context?: {
    jobTitle?: string;
    company?: string;
    industry?: string;
  };
}

const SUMMARY_SYSTEM_PROMPT = `You are an expert CV/resume writer. Your task is to enhance a professional summary to be more impactful, concise, and ATS-friendly.

Rules:
- Keep it to 2-4 sentences max
- Use strong action-oriented language
- Include quantifiable achievements where possible
- Make it ATS-friendly (use industry keywords)
- Maintain a professional, confident tone
- Do NOT add fictional information — only enhance what is given
- Return ONLY the enhanced text, no explanations or quotes`;

const BULLETS_SYSTEM_PROMPT = `You are an expert CV/resume writer. Your task is to enhance work experience bullet points to be more impactful and ATS-friendly.

Rules:
- Start each bullet with a strong action verb (Led, Developed, Implemented, etc.)
- Include quantifiable results where possible (%, $, numbers)
- Keep each bullet to 1-2 lines max
- Make them ATS-friendly with relevant keywords
- Do NOT add fictional metrics — only enhance the writing quality
- Do NOT add new bullets — only improve the existing ones
- Return ONLY the enhanced bullets, one per line, without bullet markers (•, -, *)
- Preserve the same number of bullets as input`;

export async function POST(request: NextRequest) {
  try {
    if (!XAI_API_KEY) {
      return NextResponse.json(
        { error: "AI not configured. Set XAI_API_KEY in .env" },
        { status: 503 }
      );
    }

    const body: EnhanceRequest = await request.json();
    const { type, text, context } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "No text provided to enhance" },
        { status: 400 }
      );
    }

    let systemPrompt: string;
    let userPrompt: string;

    if (type === "summary") {
      systemPrompt = SUMMARY_SYSTEM_PROMPT;
      userPrompt = `Enhance this professional summary:\n\n${text}`;
      if (context?.jobTitle) {
        userPrompt += `\n\nContext: The person works as a ${context.jobTitle}`;
        if (context.company) userPrompt += ` at ${context.company}`;
        if (context.industry) userPrompt += ` in the ${context.industry} industry`;
        userPrompt += ".";
      }
    } else if (type === "bullets") {
      systemPrompt = BULLETS_SYSTEM_PROMPT;
      userPrompt = `Enhance these work experience bullet points:\n\n${text}`;
      if (context?.jobTitle) {
        userPrompt += `\n\nContext: Role is ${context.jobTitle}`;
        if (context.company) userPrompt += ` at ${context.company}`;
        userPrompt += ".";
      }
    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'summary' or 'bullets'" },
        { status: 400 }
      );
    }

    const response = await fetch(XAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("AI API error:", response.status, errorBody);
      return NextResponse.json(
        { error: `AI API error: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const enhanced = data.choices?.[0]?.message?.content?.trim();

    if (!enhanced) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    return NextResponse.json({ enhanced });
  } catch (error) {
    console.error("AI enhance error:", error);
    return NextResponse.json(
      { error: "Failed to enhance text" },
      { status: 500 }
    );
  }
}

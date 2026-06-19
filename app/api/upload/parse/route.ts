import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { extractTextFromPdf } from "@/lib/parser/pdf-parser";
import { extractTextFromDocx } from "@/lib/parser/docx-parser";
import { parseResumeText } from "@/lib/parser/structure-mapper";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx"].includes(ext)) {
      return NextResponse.json({ error: "Only PDF and DOCX files are allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let rawText = "";
    if (ext === "pdf") {
      rawText = await extractTextFromPdf(buffer);
    } else {
      rawText = await extractTextFromDocx(buffer);
    }

    const parsed = parseResumeText(rawText);

    return NextResponse.json({ parsed, rawText });
  } catch (error) {
    console.error("Upload parse error:", error);
    return NextResponse.json({ error: "Failed to parse uploaded file" }, { status: 500 });
  }
}

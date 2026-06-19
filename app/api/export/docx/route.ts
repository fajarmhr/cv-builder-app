import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeFromDb } from "@/lib/utils/api-helpers";
import { docxFilename, generateDocx } from "@/lib/export/docx-generator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/components/templates/TemplateRegistry";
import { getUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeId } = await req.json();

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }

    const dbResume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });

    if (!dbResume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resume = parseResumeFromDb(dbResume);
    const config = resume.templateConfig || DEFAULT_TEMPLATE_CONFIG;

    const buffer = await generateDocx(resume, resume.templateId, config);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${docxFilename(resume)}"`,
      },
    });
  } catch (error) {
    console.error("DOCX export error:", error);
    return NextResponse.json({ error: "Failed to generate DOCX" }, { status: 500 });
  }
}

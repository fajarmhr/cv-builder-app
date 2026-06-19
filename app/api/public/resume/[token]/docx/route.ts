import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeFromDb } from "@/lib/utils/api-helpers";
import { docxFilename, generateDocx } from "@/lib/export/docx-generator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/components/templates/TemplateRegistry";

// GET /api/public/resume/[token]/docx
// Downloads the latest DOCX for a published resume.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const dbResume = await prisma.resume.findFirst({
      where: { shareToken: token, isPublished: true },
    });
    if (!dbResume) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const resume = parseResumeFromDb(dbResume);
    const config = resume.templateConfig || DEFAULT_TEMPLATE_CONFIG;
    const buffer = await generateDocx(resume, resume.templateId, config);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${docxFilename(resume)}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Type",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Public DOCX error:", error);
    return NextResponse.json({ error: "Failed to generate DOCX" }, { status: 500 });
  }
}

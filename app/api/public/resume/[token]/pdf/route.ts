import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeFromDb } from "@/lib/utils/api-helpers";
import { generatePdf, pdfFilename } from "@/lib/export/pdf-generator";
import { DEFAULT_TEMPLATE_CONFIG } from "@/components/templates/TemplateRegistry";

// GET /api/public/resume/[token]/pdf
// Always renders the latest version of the shared resume.
// Add ?download=1 to force a download instead of inline display.
export async function GET(
  req: NextRequest,
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
    const buffer = await generatePdf(resume, config, resume.templateId);

    const download = req.nextUrl.searchParams.get("download") === "1";
    const disposition = download ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${pdfFilename(resume)}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition, Content-Type",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Public PDF error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

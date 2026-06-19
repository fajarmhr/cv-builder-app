import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseResumeFromDb } from "@/lib/utils/api-helpers";

// GET /api/public/resume/[token]
// Read-only resume data for an external portfolio. The token is the access key
// for one specific resume; content stays in sync as the owner updates it.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const baseUrl = `${req.nextUrl.origin}/api/public/resume/${token}`;

  const dbResume = await prisma.resume.findFirst({
    where: { shareToken: token, isPublished: true },
  });
  if (!dbResume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const resume = parseResumeFromDb(dbResume);

  // Expose presentation data only — never the owning user.
  const res = NextResponse.json({
    resume: {
      title: resume.title,
      templateId: resume.templateId,
      templateConfig: resume.templateConfig,
      personalInfo: resume.personalInfo,
      summary: resume.summary,
      workExperience: resume.workExperience,
      education: resume.education,
      skills: resume.skills,
      certifications: resume.certifications,
      languages: resume.languages,
      projects: resume.projects,
      awards: resume.awards,
      references: resume.references,
      customSections: resume.customSections,
      sectionOrder: resume.sectionOrder,
      hiddenSections: resume.hiddenSections,
      updatedAt: resume.updatedAt,
    },
    links: {
      data: baseUrl,
      previewPdf: `${baseUrl}/pdf`,
      downloadPdf: `${baseUrl}/pdf?download=1`,
      downloadDocx: `${baseUrl}/docx`,
    },
  });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Cache-Control", "public, max-age=60");
  return res;
}

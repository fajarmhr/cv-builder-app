import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, parseResumeFromDb } from "@/lib/utils/api-helpers";
import { getUserId } from "@/lib/auth";
import { DEFAULT_SECTION_ORDER, stringifyJsonField } from "@/types/resume";

// GET /api/resumes — list current user's resumes
export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const resumes = await prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    const parsed = resumes.map((r) => {
      let personName: string | null = null;
      if (r.personalInfo) {
        try {
          const info = JSON.parse(r.personalInfo);
          personName = info.name || null;
        } catch {
          // ignore
        }
      }
      return {
        id: r.id,
        title: r.title,
        templateId: r.templateId,
        personName,
        updatedAt: r.updatedAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ resumes: parsed });
  } catch (err) {
    console.error("GET /api/resumes error:", err);
    return apiError("Failed to fetch resumes", 500);
  }
}

// POST /api/resumes — create new resume for current user
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const title = body.title || "Untitled Resume";

    const resume = await prisma.resume.create({
      data: {
        userId,
        title,
        templateId: "ats-001",
        sectionOrder: stringifyJsonField(DEFAULT_SECTION_ORDER),
        hiddenSections: stringifyJsonField([]),
      },
    });

    return NextResponse.json({ resume: parseResumeFromDb(resume) }, { status: 201 });
  } catch {
    return apiError("Failed to create resume", 500);
  }
}

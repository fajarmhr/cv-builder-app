import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, parseResumeFromDb } from "@/lib/utils/api-helpers";
import { getUserId } from "@/lib/auth";

// POST /api/resumes/[id]/duplicate
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const original = await prisma.resume.findFirst({ where: { id, userId } });

    if (!original) {
      return apiError("Resume not found", 404);
    }

    const duplicate = await prisma.resume.create({
      data: {
        userId,
        title: `Copy of ${original.title}`,
        templateId: original.templateId,
        templateConfig: original.templateConfig,
        personalInfo: original.personalInfo,
        summary: original.summary,
        workExperience: original.workExperience,
        education: original.education,
        skills: original.skills,
        certifications: original.certifications,
        languages: original.languages,
        projects: original.projects,
        awards: original.awards,
        references: original.references,
        customSections: original.customSections,
        sectionOrder: original.sectionOrder,
        hiddenSections: original.hiddenSections,
        // Don't copy uploadedFile reference
      },
    });

    return NextResponse.json(
      { resume: parseResumeFromDb(duplicate) },
      { status: 201 }
    );
  } catch {
    return apiError("Failed to duplicate resume", 500);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, parseResumeFromDb, prepareResumeForDb } from "@/lib/utils/api-helpers";
import { getUserId } from "@/lib/auth";

// GET /api/resumes/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });

    if (!resume) {
      return apiError("Resume not found", 404);
    }

    return NextResponse.json({ resume: parseResumeFromDb(resume) });
  } catch {
    return apiError("Failed to fetch resume", 500);
  }
}

// PUT /api/resumes/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const existing = await prisma.resume.findFirst({ where: { id, userId } });

    if (!existing) {
      return apiError("Resume not found", 404);
    }

    const body = await req.json();
    const dbData = prepareResumeForDb(body);

    const updated = await prisma.resume.update({
      where: { id },
      data: dbData,
    });

    return NextResponse.json({ resume: parseResumeFromDb(updated) });
  } catch {
    return apiError("Failed to update resume", 500);
  }
}

// DELETE /api/resumes/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) return apiError("Unauthorized", 401);

    const { id } = await params;
    const resume = await prisma.resume.findFirst({ where: { id, userId } });

    if (!resume) {
      return apiError("Resume not found", 404);
    }

    await prisma.resume.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return apiError("Failed to delete resume", 500);
  }
}
